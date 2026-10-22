-- ONLY needed if you already ran an older schema.sql. Makes "undo use" also remove the shopping entry it caused.
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
