
begin;
create index if not exists intake_application_status_history_application_idx
  on intake_private.intake_application_status_history (application_id, changed_at desc);

drop policy if exists intake_outbox_service_role_access
  on intake_private.intake_notification_outbox;
create policy intake_outbox_service_role_access
  on intake_private.intake_notification_outbox
  for all to service_role
  using (true)
  with check (true);

drop policy if exists intake_status_history_service_role_access
  on intake_private.intake_application_status_history;
create policy intake_status_history_service_role_access
  on intake_private.intake_application_status_history
  for all to service_role
  using (true)
  with check (true);
commit;