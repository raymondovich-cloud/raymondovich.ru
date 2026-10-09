-- version 1.0
-- Связать LifeGame с поставщиком домена, сохранив DNS в статусе проверки.
do $$
declare
  v_owner uuid;
  v_regru uuid;
  v_lifegame uuid;
begin
  select owner_id into v_owner from public.ecosystem_tools where slug = 'reg-ru' limit 1;
  select id into v_regru from public.ecosystem_tools where owner_id = v_owner and slug = 'reg-ru';
  select id into v_lifegame from public.projects where owner_id = v_owner and lower(name) = 'lifegame' limit 1;
  if v_regru is null or v_lifegame is null then
    raise exception 'Не найдены сервис REG.RU или проект LifeGame';
  end if;
  insert into public.project_tool_relations
    (owner_id, project_id, tool_id, relationship_type, purpose, status, evidence_note, last_verified_at)
  values
    (v_owner, v_lifegame, v_regru, 'infrastructure_dependency',
     'Регистрация домена lifegame.site и управление доменной инфраструктурой', 'needs_verification',
     'Владелец подтвердил регистрацию домена и HTTPS. DNS-направление и фактический deployment не проверены.', null)
  on conflict (owner_id, project_id, tool_id, relationship_type) do update
    set purpose = excluded.purpose, status = excluded.status, evidence_note = excluded.evidence_note,
        last_verified_at = null, updated_at = now();
end $$;
