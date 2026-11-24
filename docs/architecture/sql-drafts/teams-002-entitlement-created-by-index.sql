-- APPLIED MIGRATION SOURCE
-- Raymondovich Teams core backend, phase 1.1
-- Applied to Supabase project yajybgdorhxebbigwjgi as migration 20261124075324.
-- Adds the index required to cover the create_entitlements.created_by foreign key.
-- Historical source. Do not reapply manually.

create index teams_create_entitlements_created_by_idx
  on teams.create_entitlements(created_by)
  where created_by is not null;
