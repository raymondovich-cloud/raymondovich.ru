create extension if not exists pg_net;

create or replace function public.intake_claim_notification_batch(
  p_batch_size integer default 5,
  p_lock_seconds integer default 180
)
returns table(application_id uuid)
language plpgsql
security invoker
set search_path to ''
as $function$
begin
  if p_batch_size is null or p_batch_size not between 1 and 10
    or p_lock_seconds is null or p_lock_seconds not between 30 and 600
  then
    raise exception 'INTAKE_INVALID_ARGUMENT' using errcode = '22023';
  end if;

  return query
  with candidates as (
    select o.id
    from intake_private.intake_notification_outbox as o
    where
      (
        (
          o.status = 'failed'
          and o.next_attempt_at <= pg_catalog.now()
        )
        or
        (
          o.status = 'pending'
          and o.attempt_count = 0
          and o.created_at < pg_catalog.now() - interval '2 minutes'
          and o.next_attempt_at <= pg_catalog.now()
        )
      )
      and (o.locked_until is null or o.locked_until <= pg_catalog.now())
    order by o.next_attempt_at asc, o.created_at asc
    for update skip locked
    limit p_batch_size
  )
  update intake_private.intake_notification_outbox as o
  set
    locked_until = pg_catalog.now() + pg_catalog.make_interval(secs => p_lock_seconds),
    updated_at = pg_catalog.now()
  from candidates as c
  where o.id = c.id
  returning o.application_id;
end;
$function$;

revoke all on function public.intake_claim_notification_batch(integer, integer) from public, anon, authenticated;
grant execute on function public.intake_claim_notification_batch(integer, integer) to service_role;
