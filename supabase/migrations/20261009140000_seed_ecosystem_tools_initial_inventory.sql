-- version 1.0
-- Idempotent initial inventory. Unverified DNS and API relationships remain explicitly unverified.

insert into public.projects (owner_id,name,description,goal,completion_criteria,status)
select u.id,'Raymondovich.ru','Вход в экосистему и закрытая административная панель.','Управлять экосистемой, проектами и внутренней документацией в едином защищённом контуре.','Публичная презентация продуктов работает; административная панель доступна только владельцу; RLS и доступы проверены.','active'
from auth.users u where u.raw_app_meta_data->>'role'='admin'
and not exists(select 1 from public.projects p where p.owner_id=u.id and lower(p.name)='raymondovich.ru');

insert into public.projects (owner_id,name,description,goal,completion_criteria,status)
select u.id,'Raymondovich.online','Коммерческая презентация и продажа действующих продуктов.','Показывать и продавать только готовые к использованию продукты экосистемы.','Коммерческая страница содержит подтверждённые сведения о действующих продуктах и способы покупки.','active'
from auth.users u where u.raw_app_meta_data->>'role'='admin'
and not exists(select 1 from public.projects p where p.owner_id=u.id and lower(p.name)='raymondovich.online');

insert into public.ecosystem_tools(owner_id,name,slug,category,description,official_url,status,last_verified_at)
select u.id,v.name,v.slug,v.category,v.description,v.url,v.status,v.verified
from auth.users u cross join (values
 ('ChatGPT','chatgpt','ai','AI-ассистент, используемый вручную для анализа, проектирования и разработки. Запись не означает подключение API в продуктах.','https://chatgpt.com','active'::text,now()),
 ('GitHub','github','development','Хранение исходного кода, история изменений и репозитории проектов.','https://github.com','active'::text,now()),
 ('Supabase','supabase','database','Backend-платформа; проверен проект Raymondovich, используемый административным приложением.','https://supabase.com','active'::text,now()),
 ('REG.RU','reg-ru','domains_dns','Регистратор и панель управления доменами/DNS. Текущие записи доменов требуют повторной проверки.','https://www.reg.ru','active'::text,null::timestamptz)
) v(name,slug,category,description,url,status,verified)
where u.raw_app_meta_data->>'role'='admin'
on conflict(owner_id,slug) do nothing;

insert into public.tool_resources(owner_id,tool_id,name,resource_type,resource_url,external_id,environment,status,description,last_verified_at)
select u.id,t.id,v.name,v.kind,v.url,v.external_id,v.environment,v.status,v.description,v.verified
from auth.users u join public.ecosystem_tools t on t.owner_id=u.id
cross join (values
 ('github','raymondovich-cloud/LifeGame','repository','https://github.com/raymondovich-cloud/LifeGame','raymondovich-cloud/LifeGame','production','active'::text,'Основной репозиторий LifeGame. Репозиторий доступен; deployment проверяется отдельно.',now()),
 ('github','raymondovich-cloud/Ai-Sistem','repository','https://github.com/raymondovich-cloud/Ai-Sistem','raymondovich-cloud/Ai-Sistem','development','active'::text,'Основной репозиторий AI Sistem. Репозиторий доступен; внешние AI API-интеграции требуют проверки.',now()),
 ('github','raymondovich-cloud/raymondovich.ru','repository','https://github.com/raymondovich-cloud/raymondovich.ru','raymondovich-cloud/raymondovich.ru','production','active'::text,'Репозиторий публичного сайта и административной панели.',now()),
 ('github','raymondovich-cloud/raymondovich.online','repository','https://github.com/raymondovich-cloud/raymondovich.online','raymondovich-cloud/raymondovich.online','production','active'::text,'Репозиторий коммерческого сайта.',now()),
 ('supabase','raymondovich Supabase project','supabase_project','https://supabase.com/dashboard/project/yajybgdorhxebbigwjgi','yajybgdorhxebbigwjgi','production','active'::text,'Supabase-проект административного приложения. Секретные ключи не сохранены.',now()),
 ('reg-ru','raymondovich.ru','domain','https://raymondovich.ru','raymondovich.ru','production','needs_verification'::text,'Домен сайта экосистемы. DNS-проверка ранее была в процессе; проверить актуальное состояние.',null::timestamptz),
 ('reg-ru','raymondovich.online','domain','https://raymondovich.online','raymondovich.online','production','needs_verification'::text,'Домен коммерческого сайта; требуется независимая проверка DNS и направления.',null::timestamptz)
) v(tool_slug,name,kind,url,external_id,environment,status,description,verified)
where u.raw_app_meta_data->>'role'='admin' and t.slug=v.tool_slug
and not exists(select 1 from public.tool_resources r where r.owner_id=u.id and r.tool_id=t.id and r.name=v.name);

insert into public.project_tool_relations(owner_id,project_id,tool_id,relationship_type,purpose,status,evidence_note,last_verified_at)
select u.id,p.id,t.id,v.kind,v.purpose,v.status,v.evidence,v.verified
from auth.users u join public.projects p on p.owner_id=u.id join public.ecosystem_tools t on t.owner_id=u.id
cross join (values
 ('lifegame','github','infrastructure_dependency','Исходный код и история разработки.','active'::text,'Репозиторий raymondovich-cloud/LifeGame существует; текущий production deployment проверяется отдельно.',now()),
 ('ai-sistem','github','infrastructure_dependency','Исходный код и история разработки.','active'::text,'Репозиторий raymondovich-cloud/Ai-Sistem существует; runtime-интеграции не подтверждены.',now()),
 ('raymondovich.ru','github','infrastructure_dependency','Исходный код сайта и административного приложения.','active'::text,'Подтверждено репозиторием и текущей работой над ним.',now()),
 ('raymondovich.online','github','infrastructure_dependency','Исходный код коммерческого сайта.','active'::text,'Подтверждено существованием отдельного репозитория.',now()),
 ('raymondovich.ru','supabase','infrastructure_dependency','Аутентификация и хранение данных административного блока.','active'::text,'Подтверждено конфигурацией клиентского приложения, указывающей на проект Raymondovich.',now()),
 ('lifegame','chatgpt','manual_use','Помощь в проектировании и разработке.','active'::text,'Ручное использование AI-ассистента; техническая интеграция LifeGame с ChatGPT API не подтверждена.',now()),
 ('ai-sistem','chatgpt','manual_use','Помощь в проектировании и разработке.','active'::text,'Ручное использование AI-ассистента; API-подключение требует отдельного подтверждения.',now()),
 ('raymondovich.ru','chatgpt','manual_use','Помощь в проектировании и разработке административного блока.','active'::text,'Ручное использование AI-ассистента, не интеграция сайта с API.',now()),
 ('raymondovich.online','chatgpt','manual_use','Помощь в разработке и подготовке коммерческого контента.','active'::text,'Ручное использование AI-ассистента, не интеграция сайта с API.',now()),
 ('raymondovich.ru','reg-ru','infrastructure_dependency','Домен и DNS.','needs_verification'::text,'Домен/DNS настраивались через REG.RU; текущее состояние требует перепроверки.',null::timestamptz),
 ('raymondovich.online','reg-ru','infrastructure_dependency','Домен и DNS.','needs_verification'::text,'Домен/DNS настраивались через REG.RU; текущее состояние требует перепроверки.',null::timestamptz)
) v(project_slug,tool_slug,kind,purpose,status,evidence,verified)
where u.raw_app_meta_data->>'role'='admin' and lower(replace(p.name,' ',''))=v.project_slug and t.slug=v.tool_slug
and not exists(select 1 from public.project_tool_relations x where x.owner_id=u.id and x.project_id=p.id and x.tool_id=t.id and x.relationship_type=v.kind);

insert into public.project_resource_relations(owner_id,project_id,resource_id,role,status,evidence_note,last_verified_at)
select u.id,p.id,r.id,v.role,v.status,v.evidence,v.verified
from auth.users u join public.projects p on p.owner_id=u.id join public.tool_resources r on r.owner_id=u.id
cross join (values
 ('lifegame','github','raymondovich-cloud/LifeGame','Исходный код','active'::text,'Репозиторий подтверждён.',now()),
 ('ai-sistem','github','raymondovich-cloud/Ai-Sistem','Исходный код','active'::text,'Репозиторий подтверждён.',now()),
 ('raymondovich.ru','github','raymondovich-cloud/raymondovich.ru','Исходный код сайта и административной панели','active'::text,'Репозиторий подтверждён.',now()),
 ('raymondovich.online','github','raymondovich-cloud/raymondovich.online','Исходный код коммерческого сайта','active'::text,'Репозиторий подтверждён.',now()),
 ('raymondovich.ru','supabase','raymondovich Supabase project','Аутентификация и база данных','active'::text,'Подтверждено конфигурацией клиентского приложения.',now()),
 ('raymondovich.ru','reg-ru','raymondovich.ru','Домен и DNS','needs_verification'::text,'Связь известна, актуальное DNS-состояние требует проверки.',null::timestamptz),
 ('raymondovich.online','reg-ru','raymondovich.online','Домен и DNS','needs_verification'::text,'Связь известна, актуальное DNS-состояние требует проверки.',null::timestamptz)
) v(project_slug,tool_slug,resource_name,role,status,evidence,verified)
where u.raw_app_meta_data->>'role'='admin' and lower(replace(p.name,' ',''))=v.project_slug and r.name=v.resource_name
and exists(select 1 from public.ecosystem_tools t where t.id=r.tool_id and t.slug=v.tool_slug)
and not exists(select 1 from public.project_resource_relations x where x.owner_id=u.id and x.project_id=p.id and x.resource_id=r.id);
