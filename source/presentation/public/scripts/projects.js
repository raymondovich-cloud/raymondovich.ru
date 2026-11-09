import { loadProjectsWorkspace } from "/source/application/projects/project-overview-coordinator.js";
import { createProjectRecord } from "/source/application/projects/project-registry.js";
import { getProjectServices } from "/source/application/services/project-services.js";

const PROJECT_STATUS = {
  active: "В работе",
  paused: "На паузе",
  completed: "Завершён",
  archived: "Архив"
};
const PROJECT_PRIORITY = {
  low: "Низкий",
  normal: "Обычный",
  high: "Высокий",
  critical: "Критический"
};
const MODULES = {
  services: { title: "Сервисы", eyebrow: "PROJECT / SERVICES", description: "Подключённые сервисы, аккаунты и инфраструктурные ресурсы." },
  accounting: { title: "Бухгалтерия", eyebrow: "PROJECT / ACCOUNTING", description: "Доходы, расходы и финансовый результат проекта." },
  analytics: { title: "Аналитика", eyebrow: "PROJECT / ANALYTICS", description: "Пользователи, активность, источники трафика и партнёрская атрибуция." },
  marketing: { title: "Маркетинг", eyebrow: "PROJECT / MARKETING", description: "Площадки продвижения, аккаунты, кампании и статистика." }
};
let activeController = null;

export async function renderProjectsWorkspace(root, user) {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const listenerOptions = { signal: controller.signal };
  root.dataset.ownerWorkspace = "projects";
  root.innerHTML = `
    <div class="owner-console-shell projects-shell">
      <section class="owner-console owner-console-workspace projects-workspace" aria-label="Управление проектами">
        <div class="projects-content" data-projects-content>
          <div class="projects-loading">Загрузка проектов…</div>
        </div>
      </section>
    </div>`;

  const host = root.querySelector("[data-projects-content]");
  let projects = [];
  let serviceCounts = {};
  let currentProjectId = null;

  const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[char]);
  const date = value => value ? new Intl.DateTimeFormat("ru-RU",{day:"numeric",month:"short",year:"numeric"}).format(new Date(value)) : "—";
  const statusLabel = status => PROJECT_STATUS[status] || status || "Не указан";
  const priorityLabel = priority => PROJECT_PRIORITY[priority] || priority || "Обычный";

  async function loadProjects() {
    host.innerHTML = '<div class="projects-loading">Загрузка проектов…</div>';
    const result = await loadProjectsWorkspace();
    if (result.error) {
      host.innerHTML = '<div class="projects-state projects-error"><strong>Не удалось загрузить проекты</strong><p>Проверьте подключение и права доступа.</p></div>';
      return false;
    }
    projects = result.projects;
    serviceCounts = result.serviceCounts;
    return true;
  }

  function renderRegistry() {
    currentProjectId = null;
    const query = host.querySelector("[data-project-search]")?.value.trim().toLowerCase() || "";
    const visible = projects.filter(project => project.status !== "archived" &&
      (!query || [project.name,project.description,project.goal].some(value => String(value||"").toLowerCase().includes(query))));
    host.innerHTML = `
      <header class="projects-toolbar">
        <div><p class="projects-eyebrow">OWNER CONTROL CENTER / BUSINESS</p><h1>Проекты</h1><p class="projects-intro">Рабочие пространства собственных и совместных проектов.</p></div>
        <button class="projects-primary" type="button" data-project-create><span aria-hidden="true">＋</span> Новый проект</button>
      </header>
      <div class="projects-registry-tools">
        <label class="projects-search-wrap"><span class="sr-only">Поиск проектов</span><input class="projects-search" type="search" placeholder="Поиск проектов" value="${escape(query)}" data-project-search></label>
        <span class="projects-count">${visible.length} ${visible.length===1?"проект":visible.length>1&&visible.length<5?"проекта":"проектов"}</span>
      </div>
      <div class="projects-registry-list" data-project-list>
        ${visible.length ? visible.map(project=>`
          <button class="projects-registry-card" type="button" data-project-open="${escape(project.id)}">
            <span class="projects-registry-main"><span class="projects-registry-name">${escape(project.name)}</span><span class="projects-registry-description">${escape(project.description || "Описание пока не добавлено.")}</span></span>
            <span class="projects-registry-meta"><span class="projects-status status-${escape(project.status)}">${escape(statusLabel(project.status))}</span><span>${project.source_idea_id?"Из идеи":"Создан напрямую"}</span><span class="projects-card-arrow" aria-hidden="true">↗</span></span>
          </button>`).join("") : `
          <div class="projects-state"><strong>${projects.length?"Ничего не найдено":"Проектов пока нет"}</strong><p>${projects.length?"Измените поисковый запрос.":"Создайте первый проект или преобразуйте существующую идею в проект."}</p></div>`}
      </div>`;
  }

  function renderCreateForm() {
    host.innerHTML = `
      <section class="projects-form-screen">
        <header class="projects-screen-heading"><button type="button" class="projects-back" data-projects-back>← Проекты</button><p class="projects-eyebrow">PROJECTS / NEW</p><h1>Новый проект</h1><p>Создайте рабочее пространство. Проект будет добавлен напрямую, без создания идеи.</p></header>
        <form class="projects-form" data-project-form>
          <label>Название проекта<input name="name" required maxlength="120" autocomplete="off" placeholder="Например, raymondovich.ru"></label>
          <label>Описание<textarea name="description" rows="3" maxlength="4000" placeholder="Кратко опишите проект"></textarea></label>
          <label>Цель<textarea name="goal" rows="2" maxlength="4000" placeholder="Какого результата нужно достичь"></textarea></label>
          <div class="projects-form-grid">
            <label>Приоритет<select name="priority">${Object.entries(PROJECT_PRIORITY).map(([key,value])=>`<option value="${key}" ${key==="normal"?"selected":""}>${value}</option>`).join("")}</select></label>
            <label>Статус<select name="status"><option value="active">В работе</option><option value="paused">На паузе</option></select></label>
          </div>
          <p class="projects-form-error" data-project-form-error hidden></p>
          <div class="projects-form-actions"><button type="button" class="projects-secondary" data-projects-back>Отмена</button><button type="submit" class="projects-primary">Создать проект</button></div>
        </form>
      </section>`;
  }

  function moduleSummary(projectId, key) {
    if (key === "services") {
      const count = serviceCounts[projectId] || 0;
      return count ? `${count} подключено` : "Нет подключённых сервисов";
    }
    if (key === "accounting") return "Нет финансовых операций";
    if (key === "analytics") return "Ожидает источников данных";
    return "Нет добавленных площадок";
  }

  function renderOverview(project) {
    if (!project) return renderRegistry();
    currentProjectId = project.id;
    const servicesCount = serviceCounts[project.id] || 0;
    host.innerHTML = `
      <div class="projects-overview-screen">
        <header class="projects-overview-header">
          <button type="button" class="projects-back" data-projects-back>← Все проекты</button>
          <div class="projects-project-hero">
            <div class="projects-project-topline"><span class="projects-eyebrow">ПРОЕКТ · ${project.source_idea_id?"ИЗ ИДЕИ":"СОЗДАН НАПРЯМУЮ"}</span><span class="projects-status status-${escape(project.status)}">${escape(statusLabel(project.status))}</span></div>
            <h1>${escape(project.name)}</h1>
            <div class="projects-project-metrics">
              <div><span>Польз.</span><strong>—</strong></div>
              <div><span>Доход</span><strong class="metric-positive">—</strong></div>
              <div><span>Расход</span><strong class="metric-expense">—</strong></div>
            </div>
            <p class="projects-data-note">Финансовые и пользовательские показатели появятся после подключения соответствующих модулей.</p>
          </div>
        </header>
        <div class="projects-module-grid">
          ${Object.entries(MODULES).map(([key,module])=>`
            <button type="button" class="projects-module-card" data-project-module="${key}" data-project-id="${escape(project.id)}">
              <span class="projects-module-top"><span class="projects-module-icon" aria-hidden="true">${key==="services"?"⌁":key==="accounting"?"▣":key==="analytics"?"⌁":"◉"}</span><span class="projects-module-summary">${escape(moduleSummary(project.id,key))}</span></span>
              <span class="projects-module-title">${escape(module.title)}</span>
              ${key==="services"?`<span class="projects-service-dots" aria-hidden="true"><i></i><i></i><i></i><i></i><i></i></span>`:key==="accounting"?'<span class="projects-empty-bar" aria-hidden="true"></span>':key==="analytics"?'<span class="projects-analytics-line" aria-hidden="true"></span>':'<span class="projects-platform-marks" aria-hidden="true">◎　▷　➤　＠</span>'}
              <span class="projects-module-foot">${key==="services"?servicesCount?"Управление подключениями":"Добавьте сервисы проекта":key==="accounting"?"Ручной учёт доходов и расходов":key==="analytics"?"Динамика и источники трафика":"Каналы и площадки продвижения"}</span>
              <span class="projects-module-arrow" aria-hidden="true">↗</span>
            </button>`).join("")}
        </div>
      </div>`;
  }

  async function renderModule(project, key) {
    if (!project || !MODULES[key]) return renderRegistry();
    currentProjectId = project.id;
    const module = MODULES[key];
    let body = "";
    if (key === "services") {
      const serviceData = await getProjectServices(project.id);
      const services = serviceData.services;
      const resources = serviceData.resources;
      body = `
        ${serviceData.error?'<div class="projects-state projects-error"><strong>Не удалось загрузить связи сервисов</strong><p>Проверьте права доступа к реестру сервисов.</p></div>':""}
        <section class="projects-module-section"><h2>Подключённые сервисы</h2>
          ${services.length?services.map(item=>`<article class="projects-data-row"><div><strong>${escape(item.ecosystem_tools?.name||"Сервис без названия")}</strong><span>${escape(item.purpose||item.relationship_type||"Назначение не указано")}</span></div><span class="projects-status status-${escape(item.status)}">${escape(item.status==="active"?"Активен":item.status==="paused"?"Приостановлен":item.status==="planned"?"Запланирован":"Требует проверки")}</span></article>`).join(""):'<div class="projects-state"><strong>Сервисы пока не подключены</strong><p>Список будет пополняться по мере регистрации сервисов в общем каталоге.</p></div>'}
        </section>
        <section class="projects-module-section"><h2>Ресурсы и инфраструктура</h2>
          ${resources.length?resources.map(item=>`<article class="projects-data-row"><div><strong>${escape(item.tool_resources?.name||"Ресурс")}</strong><span>${escape(item.role||item.tool_resources?.resource_type||"Тип не указан")}${item.tool_resources?.environment?" · "+escape(item.tool_resources.environment):""}</span></div><span class="projects-status">${escape(item.status)}</span></article>`).join(""):'<div class="projects-state"><strong>Ресурсы не привязаны</strong><p>Домены, базы данных, репозитории и другие ресурсы будут отображаться здесь.</p></div>'}
        </section>`;
    } else {
      const copy = key==="accounting"
        ? {title:"Финансовый учёт",text:"Здесь будут храниться доходы, расходы, платежи за сервисы, продвижение и другие операции. Сводные показатели будут рассчитываться только по сохранённым операциям."}
        : key==="analytics"
        ? {title:"Источники аналитики пока не подключены",text:"Здесь появятся показатели пользователей, онлайн по часам и периодам, динамика прироста и статистика партнёрских ссылок с указанием источника и периода измерения."}
        : {title:"Маркетинговые площадки пока не добавлены",text:"Здесь будут храниться каналы продвижения, аккаунты, публикации и кампании. Автоматическая статистика будет подключаться по официальным API там, где платформы это разрешают."};
      body = `<section class="projects-module-empty"><div class="projects-empty-mark" aria-hidden="true">${key==="accounting"?"₽":key==="analytics"?"⌁":"◉"}</div><h2>${copy.title}</h2><p>${copy.text}</p><span class="projects-coming-label">МОДУЛЬ ПОДГОТАВЛИВАЕТСЯ К ВВОДУ ДАННЫХ</span></section>`;
    }
    host.innerHTML = `
      <section class="projects-module-screen">
        <header class="projects-screen-heading">
          <button type="button" class="projects-back" data-project-overview="${escape(project.id)}">← ${escape(project.name)}</button>
          <p class="projects-eyebrow">${module.eyebrow}</p><h1>${module.title}</h1><p>${module.description}</p>
        </header>
        <div class="projects-module-body">${body}</div>
      </section>`;
  }

  function renderNavigation(state) {
    if (state?.route !== "#authorization/projects") return;
    const screen = state.screen || "projects-registry";
    const projectId = state.data?.projectId;
    const project = projects.find(item=>item.id===projectId);
    if (screen === "project-create") renderCreateForm();
    else if (screen === "project-overview") renderOverview(project);
    else if (screen.startsWith("project-") && MODULES[screen.replace("project-","")]) renderModule(project,screen.replace("project-",""));
    else renderRegistry();
  }

  root.addEventListener("click", async event => {
    const navigation = window.RaymondovichNavigation;
    if (event.target.closest("[data-project-create]")) {
      navigation?.navigateScreen("project-create",{});
      return;
    }
    const open = event.target.closest("[data-project-open]");
    if (open) {
      navigation?.navigateScreen("project-overview",{projectId:open.dataset.projectOpen});
      return;
    }
    const moduleButton = event.target.closest("[data-project-module]");
    if (moduleButton) {
      navigation?.navigateScreen("project-"+moduleButton.dataset.projectModule,{projectId:moduleButton.dataset.projectId});
      return;
    }
    const overview = event.target.closest("[data-project-overview]");
    if (overview) {
      navigation?.navigateScreen("project-overview",{projectId:overview.dataset.projectOverview},{replace:true});
      return;
    }
    if (event.target.closest("[data-projects-back]")) {
      navigation?.navigateScreen("projects-registry",{}, {replace:true});
      return;
    }
  },listenerOptions);

  root.addEventListener("input",event=>{
    if(event.target.matches("[data-project-search]")) {
      const position=event.target.selectionStart;
      renderRegistry();
      const input=host.querySelector("[data-project-search]");
      input?.focus();
      input?.setSelectionRange(position,position);
    }
  },listenerOptions);

  root.addEventListener("submit",async event=>{
    const form=event.target.closest("[data-project-form]");
    if(!form)return;
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form).entries());
    const button=form.querySelector('[type="submit"]');
    const errorNode=form.querySelector("[data-project-form-error]");
    button.disabled=true;
    try{
      const result=await createProjectRecord(user.id,values);
      if(result.error)throw result.error;
      await loadProjects();
      navigationFallback(result.data.id);
    }catch(error){
      errorNode.textContent=error?.message||"Не удалось создать проект.";
      errorNode.hidden=false;
      button.disabled=false;
    }
    function navigationFallback(projectId){
      window.RaymondovichNavigation?.navigateScreen("project-overview",{projectId},{replace:true});
    }
  },listenerOptions);

  document.addEventListener("raymondovich:navigation",event=>{
    if(event.detail?.route==="#authorization/projects")renderNavigation(event.detail);
  },listenerOptions);

  const loaded=await loadProjects();
  if(!loaded)return;
  const state=window.RaymondovichNavigation?.getState();
  renderNavigation(state?.route==="#authorization/projects"?state:{route:"#authorization/projects",screen:"projects-registry"});
}
