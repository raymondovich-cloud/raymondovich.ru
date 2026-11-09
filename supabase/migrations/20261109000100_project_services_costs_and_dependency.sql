-- Project Services: project-specific dependency classification and recurring cost metadata.
-- Costs are monthly equivalents in the project's accounting currency; next_payment_date
-- records the next actual renewal/payment date shown to the owner.
alter table public.project_tool_relations
  add column if not exists dependency_level text not null default 'optional',
  add column if not exists monthly_cost numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'RUB',
  add column if not exists next_payment_date date;

alter table public.project_resource_relations
  add column if not exists dependency_level text not null default 'critical',
  add column if not exists monthly_cost numeric(14,2) not null default 0,
  add column if not exists currency text not null default 'RUB',
  add column if not exists next_payment_date date;

update public.project_tool_relations
set dependency_level = case
  when relationship_type = 'infrastructure_dependency' then 'critical'
  else 'optional'
end;

alter table public.project_tool_relations
  add constraint project_tool_relations_dependency_level_check
    check (dependency_level in ('critical','optional')),
  add constraint project_tool_relations_monthly_cost_check
    check (monthly_cost >= 0),
  add constraint project_tool_relations_currency_check
    check (currency ~ '^[A-Z]{3}$');

alter table public.project_resource_relations
  add constraint project_resource_relations_dependency_level_check
    check (dependency_level in ('critical','optional')),
  add constraint project_resource_relations_monthly_cost_check
    check (monthly_cost >= 0),
  add constraint project_resource_relations_currency_check
    check (currency ~ '^[A-Z]{3}$');

comment on column public.project_tool_relations.dependency_level is
  'Whether this project-specific service connection is critical or optional.';
comment on column public.project_tool_relations.monthly_cost is
  'Monthly-equivalent recurring cost for this project connection.';
comment on column public.project_tool_relations.next_payment_date is
  'Next actual payment or renewal date for this project connection.';
comment on column public.project_resource_relations.dependency_level is
  'Whether this project-specific resource is critical or optional.';
comment on column public.project_resource_relations.monthly_cost is
  'Monthly-equivalent recurring cost for this project resource.';
comment on column public.project_resource_relations.next_payment_date is
  'Next actual payment or renewal date for this project resource.';
