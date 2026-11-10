import {
  searchProjects,
  searchIdeas,
  searchEcosystemTools,
  searchToolResources,
  searchProjectServices,
  searchProjectResources
} from "../../infrastructure/supabase/global-search-repository.js";

const SECTION_ROUTES = [
  { title: "Проекты", description: "Реестр цифровых проектов", keywords: "разработка рабочее пространство", route: "#authorization/projects", admin: true },
  { title: "Идеи", description: "Реестр идей и концепций", keywords: "замысел концепция", route: "#authorization/ideas", admin: true },
  { title: "Инструменты", description: "Инструменты и подключённые сервисы", keywords: "сервисы интеграции ресурсы", route: "#authorization/tools" },
  { title: "Профиль", description: "Личные данные и параметры аккаунта", keywords: "аккаунт пользователь", route: "#authorization/profile" },
  { title: "Редактирование профиля", description: "Настройки профиля", keywords: "имя аватар данные", route: "#authorization/profile-settings" },
  { title: "Избранное", description: "Избранные проекты и инструменты", keywords: "закладки", route: "#authorization/favorites" },
  { title: "Отчёты", description: "Отчёты и сводные данные", keywords: "аналитика", route: "#authorization/reports" },
  { title: "Управление модулями", description: "Модули и доступ к функциям", keywords: "подписка", route: "#authorization/modules" },
  { title: "Центр управления", description: "Администрирование экосистемы", keywords: "владелец администрирование", route: "#authorization/control-center", admin: true }
];

function text(value) {
  return String(value || "").trim();
}

function normalize(value) {
  return text(value).toLocaleLowerCase("ru-RU");
}

function makeResult(section, title, description, route, screen = null, data = null, id = "") {
  return { id: String(id || title), section, title: text(title), description: text(description), route, screen, data };
}

function mapRows(rows, mapper) {
  return (Array.isArray(rows) ? rows : []).map(mapper).filter(item => item.title);
}

/** Combines user-visible sources without bypassing their repository or RLS boundaries. */
export async function searchGlobalContent(query, user) {
  const term = text(query);
  if (term.length < 2) return { groups: [], partial: false };
  if (!user?.id) throw new Error("Для поиска требуется авторизация.");

  const settled = await Promise.allSettled([
    searchProjects(term),
    searchIdeas(term),
    searchEcosystemTools(term),
    searchToolResources(term),
    searchProjectServices(term),
    searchProjectResources(term)
  ]);
  const errors = settled.filter(result => result.status === "rejected" || result.value?.error);
  const rows = settled.map(result => result.status === "fulfilled" && !result.value?.error ? result.value.data || [] : []);
  const isAdmin = user.app_metadata?.role === "admin";
  const normalizedTerm = normalize(term);

  const sectionItems = SECTION_ROUTES
    .filter(section => (!section.admin || isAdmin)
      && normalize([section.title, section.description, section.keywords].join(" ")).includes(normalizedTerm))
    .map(section => makeResult("Разделы приложения", section.title, section.description, section.route, null, null, section.route));

  const groups = [
    { title: "Разделы приложения", items: sectionItems },
    {
      title: "Проекты",
      items: mapRows(rows[0], project => makeResult("Проекты", project.name,
        project.description || project.goal || "Открыть проект", "#authorization/projects",
        "project-overview", { projectId: project.id }, project.id))
    },
    {
      title: "Идеи",
      items: mapRows(rows[1], idea => makeResult("Идеи", idea.name,
        idea.description || idea.concept || idea.goal || idea.additional_info || "Открыть идею",
        "#authorization/ideas", "idea-detail", { ideaId: idea.id }, idea.id))
    },
    {
      title: "Инструменты и сервисы",
      items: mapRows(rows[2], tool => makeResult("Инструменты и сервисы", tool.name,
        [tool.category, tool.description].filter(Boolean).join(" · "), "#authorization/tools", null, null, tool.id))
        .concat(mapRows(rows[3], resource => makeResult("Инструменты и сервисы", resource.name,
          [resource.resource_type, resource.environment, resource.description].filter(Boolean).join(" · "),
          "#authorization/tools", null, null, resource.id)))
    },
    {
      title: "Сервисы проектов",
      items: mapRows(rows[4], relation => makeResult("Сервисы проектов",
        relation.ecosystem_tools?.name || "Сервис проекта",
        [relation.projects?.name, relation.purpose || relation.evidence_note].filter(Boolean).join(" · "),
        "#authorization/projects", "project-overview", { projectId: relation.project_id }, relation.id))
    },
    {
      title: "Ресурсы проектов",
      items: mapRows(rows[5], relation => makeResult("Ресурсы проектов",
        relation.tool_resources?.name || "Ресурс проекта",
        [relation.projects?.name, relation.role || relation.evidence_note].filter(Boolean).join(" · "),
        "#authorization/projects", "project-overview", { projectId: relation.project_id }, relation.id))
    }
  ].filter(group => group.items.length);

  return { groups, partial: errors.length > 0, unavailableSources: errors.length };
}
