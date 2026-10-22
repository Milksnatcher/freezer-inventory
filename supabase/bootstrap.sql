-- Run AFTER schema.sql. Lets the first user create a household and the second join it.
alter table households enable row level security;
alter table household_members enable row level security;
create policy "see own household" on households for select using (id in (select my_households()));
create policy "see members" on household_members for select using (household_id in (select my_households()));
create policy "update own member row" on household_members for update using (user_id = auth.uid());

create or replace function create_household(p_name text default 'Home') returns uuid
language plpgsql security definer as $$
declare h uuid;
begin
  insert into households(name) values (p_name) returning id into h;
  insert into household_members(household_id, user_id) values (h, auth.uid());
  insert into locations(household_id, name, sort) values
    (h,'Kitchen Freezer',1),(h,'Garage Freezer',2),(h,'Pantry',3);
  return h;
end $$;

create or replace function join_household(p_code text) returns uuid
language plpgsql security definer as $$
declare h uuid;
begin
  select id into h from households where invite_code = p_code;
  if h is null then raise exception 'Invalid invite code'; end if;
  insert into household_members(household_id, user_id) values (h, auth.uid()) on conflict do nothing;
  return h;
end $$;
