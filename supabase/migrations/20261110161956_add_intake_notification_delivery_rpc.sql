
begin;

create or replace function public.intake_set_notification_delivery(
  p_application_id uuid,
  p_delivery_status text,
  p_error_code text default null
)
returns jsonb
language plpgsql
security invoker
set search_path = ''
as $function$
declare
  v_outbox intake_private.intake_notification_outbox%rowtype;
begin
  if p_application_id is null
    or p_delivery_status not in ('sent', 'failed')
    or p_error_code is not null and char_length(p_error_code) > 80
  then
    raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
  end if;

  update intake_private.intake_notification_outbox
  set
    status = case when p_delivery_status = 'sent' then 'sent' else 'failed' end,
    attempt_count = attempt_count + 1,
    next_attempt_at = case
      when p_delivery_status = 'sent' then next_attempt_at
      else now() + make_interval(mins => least(1440, (5 * power(2, least(attempt_count, 8)))::integer))
    end,
    locked_until = null,
    last_error_code = case when p_delivery_status = 'sent' then null else p_error_code end,
    sent_at = case when p_delivery_status = 'sent' then now() else null end,
    updated_at = now()
  where application_id = p_application_id
  returning * into v_outbox;

  if not found then
    raise exception 'INTAKE_OUTBOX_NOT_FOUND' using errcode = 'P0002';
  end if;

  update public.intake_applications
  set notification_status = p_delivery_status,
      notified_at = case when p_delivery_status = 'sent' then now() else notified_at end,
      notify_error = case when p_delivery_status = 'sent' then null else p_error_code end
  where id = p_application_id;

  return jsonb_build_object(
    'application_id', p_application_id,
    'notification_status', p_delivery_status,
    'attempt_count', v_outbox.attempt_count,
    'next_attempt_at', v_outbox.next_attempt_at
  );
end;
$function$;

revoke all on function public.intake_set_notification_delivery(uuid, text, text)
  from public, anon, authenticated;
grant execute on function public.intake_set_notification_delivery(uuid, text, text)
  to service_role;

commit;