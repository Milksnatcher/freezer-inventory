-- ONLY needed if you already ran an older schema.sql. Fresh installs already include this.
alter table products add column if not exists subcategory text;
alter table products add column if not exists client_op_id uuid unique;
alter table locations add column if not exists client_op_id uuid unique;
drop view if exists inventory_view;
create view inventory_view with (security_invoker = true) as
select i.*, p.name, p.brand, p.category, p.subcategory,
  coalesce(i.age_override_at, i.added_at) as age_date,
  case
    when coalesce(i.age_override_at, i.added_at) > now() - interval '2 months' then 'green'
    when coalesce(i.age_override_at, i.added_at) > now() - interval '6 months' then 'amber'
    else 'red' end as freshness
from inventory_items i join products p on p.id = i.product_id
where i.consumed_at is null;
