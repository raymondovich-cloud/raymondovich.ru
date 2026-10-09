-- version 1.0
-- Актуализация реестра сервисов, ресурсов и связей экосистемы.
do $$
declare
  v_owner uuid;
  v_chatgpt uuid;
  v_supabase uuid;
  v_regru uuid;
  v_lifegame uuid;
  v_lifegame_db uuid;
  v_domain uuid;
begin
  select owner_id into v_owner from public.ecosystem_tools where slug = 'chatgpt' limit 1;
  if v_owner is null then
    raise exception 'Не найден владелец реестра ChatGPT';
  end if;

  select id into v_chatgpt from public.ecosystem_tools where owner_id = v_owner and slug = 'chatgpt';
  select id into v_supabase from public.ecosystem_tools where owner_id = v_owner and slug = 'supabase';
  select id into v_regru from public.ecosystem_tools where owner_id = v_owner and slug = 'reg-ru';
  select id into v_lifegame from public.projects where owner_id = v_owner and lower(name) = 'lifegame' limit 1;

  if v_lifegame is null then
    raise exception 'Не найден проект LifeGame в реестре проектов';
  end if;

  update public.ecosystem_tools
  set description = 'AI-ассистент для анализа, проектирования и разработки. В административном блоке есть ручной сценарий подготовки запроса и импорта плана проекта; это не прямое подключение ChatGPT API.',
      updated_at = now()
  where id = v_chatgpt;

  update public.ecosystem_tools
  set description = 'Backend-платформа. Используется отдельными проектами Supabase для Raymondovich.ru и LifeGame; каждый проект базы данных учитывается как самостоятельный ресурс.',
      updated_at = now(),
      last_verified_at = now()
  where id = v_supabase;

  update public.ecosystem_tools
  set description = 'Регистратор доменов и DNS. В реестре учитываются raymondovich.ru, raymondovich.online и lifegame.site; DNS-направление доменов проверяется отдельно.',
      updated_at = now()
  where id = v_regru;

  select id into v_lifegame_db
  from public.tool_resources
  where owner_id = v_owner and tool_id = v_supabase and external_id = 'ewwpnahjhqcbtfszthhc'
  limit 1;

  if v_lifegame_db is null then
    insert into public.tool_resources
      (owner_id, tool_id, name, resource_type, resource_url, external_id, environment, status, description, last_verified_at)
    values
      (v_owner, v_supabase, 'LifeGame Supabase project', 'supabase_project',
       'https://supabase.com/dashboard/project/ewwpnahjhqcbtfszthhc',
       'ewwpnahjhqcbtfszthhc', 'production', 'active',
       'Отдельный проект Supabase для LifeGame. В проекте обнаружены таблицы профиля, финансов, здоровья и развития; регистрация и авторизация подключены по подтверждению владельца.',
       now())
    returning id into v_lifegame_db;
  else
    update public.tool_resources
    set name = 'LifeGame Supabase project',
        resource_type = 'supabase_project',
        resource_url = 'https://supabase.com/dashboard/project/ewwpnahjhqcbtfszthhc',
        environment = 'production',
        status = 'active',
        description = 'Отдельный проект Supabase для LifeGame. В проекте обнаружены таблицы профиля, финансов, здоровья и развития; регистрация и авторизация подключены по подтверждению владельца.',
        last_verified_at = now(),
        updated_at = now()
    where id = v_lifegame_db;
  end if;

  select id into v_domain
  from public.tool_resources
  where owner_id = v_owner and tool_id = v_regru and external_id = 'lifegame.site'
  limit 1;

  if v_domain is null then
    insert into public.tool_resources
      (owner_id, tool_id, name, resource_type, resource_url, external_id, environment, status, description, last_verified_at)
    values
      (v_owner, v_regru, 'lifegame.site', 'domain', 'https://lifegame.site',
       'lifegame.site', 'production', 'active',
       'Домен LifeGame зарегистрирован в REG.RU; HTTPS-сертификат подтверждён владельцем. DNS-направление и фактический deployment отдельно не проверялись.',
       now())
    returning id into v_domain;
  else
    update public.tool_resources
    set name = 'lifegame.site',
        resource_type = 'domain',
        resource_url = 'https://lifegame.site',
        environment = 'production',
        status = 'active',
        description = 'Домен LifeGame зарегистрирован в REG.RU; HTTPS-сертификат подтверждён владельцем. DNS-направление и фактический deployment отдельно не проверялись.',
        last_verified_at = now(),
        updated_at = now()
    where id = v_domain;
  end if;

  insert into public.project_resource_relations
    (owner_id, project_id, resource_id, role, status, evidence_note, last_verified_at)
  values
    (v_owner, v_lifegame, v_lifegame_db, 'Основная база данных и авторизация LifeGame', 'active',
     'Проект Supabase содержит таблицы LifeGame; регистрация и авторизация подключены по подтверждению владельца.', now())
  on conflict (owner_id, project_id, resource_id) do update
    set role = excluded.role, status = excluded.status, evidence_note = excluded.evidence_note,
        last_verified_at = excluded.last_verified_at, updated_at = now();

  insert into public.project_resource_relations
    (owner_id, project_id, resource_id, role, status, evidence_note, last_verified_at)
  values
    (v_owner, v_lifegame, v_domain, 'Публичный домен LifeGame', 'active',
     'Регистрация домена и HTTPS-сертификат подтверждены владельцем; DNS и deployment не перепроверены.', now())
  on conflict (owner_id, project_id, resource_id) do update
    set role = excluded.role, status = excluded.status, evidence_note = excluded.evidence_note,
        last_verified_at = excluded.last_verified_at, updated_at = now();

  insert into public.project_tool_relations
    (owner_id, project_id, tool_id, relationship_type, purpose, status, evidence_note, last_verified_at)
  values
    (v_owner, v_lifegame, v_supabase, 'infrastructure_dependency',
     'База данных, пользовательские профили, регистрация и авторизация LifeGame', 'active',
     'Отдельный проект Supabase содержит таблицы приложения; пользователь подтвердил использование регистрации и авторизации.', now())
  on conflict (owner_id, project_id, tool_id, relationship_type) do update
    set purpose = excluded.purpose, status = excluded.status, evidence_note = excluded.evidence_note,
        last_verified_at = excluded.last_verified_at, updated_at = now();

  update public.project_tool_relations
  set purpose = 'Ручная помощь в разработке и частичный workflow подготовки проекта: формирование промпта для ChatGPT и последующий импорт JSON-плана.',
      evidence_note = 'Подтверждено кодом create-project.js: запрос генерируется локально, пользователь копирует его в ChatGPT и вручную вставляет JSON-ответ. Прямой вызов ChatGPT API из сайта не подтверждён.',
      status = 'active',
      last_verified_at = now(),
      updated_at = now()
  where owner_id = v_owner and tool_id = v_chatgpt
    and project_id = (select id from public.projects where owner_id = v_owner and lower(name) = 'raymondovich.ru' limit 1)
    and relationship_type = 'manual_use';

  insert into public.project_resource_relations
    (owner_id, project_id, resource_id, role, status, evidence_note, last_verified_at)
  select v_owner, p.id, r.id, 'Публичный домен экосистемы', 'needs_verification',
         'Домен зарегистрирован по информации владельца; текущие DNS-записи и фактическое направление требуют отдельной проверки.', null
  from public.projects p
  cross join public.tool_resources r
  where p.owner_id = v_owner and lower(p.name) = 'raymondovich.ru'
    and r.owner_id = v_owner and r.tool_id = v_regru and r.external_id = 'raymondovich.ru'
  on conflict (owner_id, project_id, resource_id) do nothing;

  insert into public.project_resource_relations
    (owner_id, project_id, resource_id, role, status, evidence_note, last_verified_at)
  select v_owner, p.id, r.id, 'Публичный домен коммерческого сайта', 'needs_verification',
         'Домен зарегистрирован по информации владельца; текущие DNS-записи и фактическое направление требуют отдельной проверки.', null
  from public.projects p
  cross join public.tool_resources r
  where p.owner_id = v_owner and lower(p.name) = 'raymondovich.online'
    and r.owner_id = v_owner and r.tool_id = v_regru and r.external_id = 'raymondovich.online'
  on conflict (owner_id, project_id, resource_id) do nothing;
end $$;
