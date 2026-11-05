alter table public.ideas
  add column if not exists goal text not null default '',
  add column if not exists estimated_cost numeric(14,2),
  add column if not exists additional_info text not null default '';

alter table public.ideas
  drop constraint if exists ideas_estimated_cost_nonnegative;
alter table public.ideas
  add constraint ideas_estimated_cost_nonnegative
  check (estimated_cost is null or estimated_cost >= 0);

alter table public.projects
  add column if not exists estimated_cost numeric(14,2),
  add column if not exists additional_info text not null default '';

alter table public.projects
  drop constraint if exists projects_estimated_cost_nonnegative;
alter table public.projects
  add constraint projects_estimated_cost_nonnegative
  check (estimated_cost is null or estimated_cost >= 0);

comment on column public.ideas.goal is 'Intended outcome or objective of the idea.';
comment on column public.ideas.estimated_cost is 'Optional estimated project cost in the owner preferred currency.';
comment on column public.ideas.additional_info is 'Additional planning context for the idea.';
comment on column public.projects.estimated_cost is 'Estimated project cost carried over from the source idea.';
comment on column public.projects.additional_info is 'Additional planning context carried over from the source idea.';
