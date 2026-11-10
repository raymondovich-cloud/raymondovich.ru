begin;

alter table public.ideas
  add column if not exists expected_revenue numeric(14,2),
  add column if not exists business_model text not null default '',
  add column if not exists concept text not null default '';

alter table public.ideas
  drop constraint if exists ideas_expected_revenue_nonnegative;
alter table public.ideas
  add constraint ideas_expected_revenue_nonnegative
  check (expected_revenue is null or expected_revenue >= 0);

alter table public.projects
  add column if not exists expected_revenue numeric(14,2),
  add column if not exists business_model text not null default '',
  add column if not exists concept text not null default '';

alter table public.projects
  drop constraint if exists projects_expected_revenue_nonnegative;
alter table public.projects
  add constraint projects_expected_revenue_nonnegative
  check (expected_revenue is null or expected_revenue >= 0);

comment on column public.ideas.expected_revenue is 'Target revenue or income expected from the idea.';
comment on column public.ideas.business_model is 'Expected monetization and revenue model for the idea.';
comment on column public.ideas.concept is 'Detailed description of the concept and implementation vision.';
comment on column public.projects.expected_revenue is 'Target revenue carried over from the source idea.';
comment on column public.projects.business_model is 'Revenue model carried over from the source idea.';
comment on column public.projects.concept is 'Detailed concept carried over from the source idea.';

commit;
