-- Shared freezer/pantry inventory. Run in Supabase SQL editor.
create extension if not exists "pgcrypto";

create table households (
  id uuid primary key default gen_random_uuid(),
  name text not null default 'Home',
  invite_code text unique default substr(md5(random()::text),1,8)
);
create table household_members (
  household_id uuid references households on delete cascade,
  user_id uuid references auth.users on delete cascade,
  push_token text,
  push_enabled boolean not null default true,
  primary key (household_id, user_id)
);

create table locations (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  name text not null,
  sort int not null default 0,
  client_op_id uuid unique
);

-- Known products (barcode cache + AI-learned items + manual autofill source)
create table products (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  barcode text,
  name text not null,
  brand text,
  category text,                      -- AI-assigned: Meat, Pasta, Dairy...
  subcategory text,                   -- e.g. Chicken, Mince
  client_op_id uuid unique,
  source text not null default 'manual' check (source in ('openfoodfacts','ai','manual','label')),
  low_stock_threshold int not null default 1,
  is_staple boolean not null default false,   -- excluded from shopping list
  unique (household_id, barcode)
);
create index on products (household_id, lower(name));

-- One row per physical unit (so each has its own age + quarters left)
create table inventory_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  product_id uuid not null references products on delete cascade,
  location_id uuid references locations on delete set null,  -- NULL = "No Location"
  quarters_left smallint not null default 4 check (quarters_left between 0 and 4),
  added_at timestamptz not null default now(),
  age_override_at timestamptz,        -- manual override of age date
  label_code text unique,             -- QR/barcode value for homemade labels
  consumed_at timestamptz,            -- set when quarters_left hits 0 (soft delete)
  client_op_id uuid unique            -- idempotency for offline queue
);
create index on inventory_items (household_id, consumed_at);

create view inventory_view with (security_invoker = true) as
select i.*, p.name, p.brand, p.category, p.subcategory,
  coalesce(i.age_override_at, i.added_at) as age_date,
  case
    when coalesce(i.age_override_at, i.added_at) > now() - interval '2 months' then 'green'
    when coalesce(i.age_override_at, i.added_at) > now() - interval '6 months' then 'amber'
    else 'red' end as freshness
from inventory_items i join products p on p.id = i.product_id
where i.consumed_at is null;

create table shopping_list_items (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  product_id uuid references products on delete set null,
  name text not null,
  source_log_id uuid,                 -- lets log-undo remove auto-added entries
  created_at timestamptz not null default now(),
  client_op_id uuid unique
);

-- Every action is logged with enough data to invert it
create table logs (
  id uuid primary key default gen_random_uuid(),
  household_id uuid not null references households on delete cascade,
  user_id uuid references auth.users,
  action text not null check (action in ('add','use','move','edit_age','label')),
  product_id uuid references products on delete set null,
  payload jsonb not null,   -- add: {item_ids}; use: {item_id, from_q}; move: {item_ids, from, to}
  created_at timestamptz not null default now(),
  client_op_id uuid unique
);

-- Undo: reverse the log's effect, then delete it
create or replace function undo_log(p_log uuid) returns void language plpgsql security definer as $$
declare l logs%rowtype;
begin
  select * into l from logs where id = p_log;
  if not found or l.household_id not in (select my_households()) then return; end if;
  if l.action = 'add' then
    delete from inventory_items where id in (select jsonb_array_elements_text(l.payload->'item_ids')::uuid);
  elsif l.action = 'use' then
    update inventory_items set quarters_left = (l.payload->>'from_q')::int, consumed_at = null
      where id = (l.payload->>'item_id')::uuid;
  elsif l.action = 'move' then
    update inventory_items set location_id = nullif(l.payload->>'from','')::uuid
      where id in (select jsonb_array_elements_text(l.payload->'item_ids')::uuid);
  end if;
  delete from shopping_list_items where source_log_id = p_log;
  delete from logs where id = p_log;
end $$;

-- Auto-add to shopping list when stock of a product drops below threshold
create or replace function check_low_stock() returns trigger language plpgsql as $$
declare p products%rowtype; cnt int; lg uuid;
begin
  select * into p from products where id = new.product_id;
  if p.is_staple then return new; end if;
  select count(*) into cnt from inventory_items where product_id = p.id and consumed_at is null;
  if cnt < p.low_stock_threshold and not exists
    (select 1 from shopping_list_items where product_id = p.id) then
    select id into lg from logs where action = 'use' and payload->>'item_id' = new.id::text order by created_at desc limit 1;
    insert into shopping_list_items (household_id, product_id, name, source_log_id) values (p.household_id, p.id, p.name, lg);
  end if;
  return new;
end $$;
create trigger trg_low_stock after update of consumed_at on inventory_items
  for each row when (new.consumed_at is not null) execute function check_low_stock();

-- RLS: members of a household see only its rows
create or replace function my_households() returns setof uuid language sql stable security definer as
$$ select household_id from household_members where user_id = auth.uid() $$;

do $$ declare t text; begin
  foreach t in array array['locations','products','inventory_items','shopping_list_items','logs'] loop
    execute format('alter table %I enable row level security', t);
    execute format('create policy "household access" on %I for all using (household_id in (select my_households())) with check (household_id in (select my_households()))', t);
  end loop; end $$;

alter publication supabase_realtime add table inventory_items, shopping_list_items, locations, products, logs;
