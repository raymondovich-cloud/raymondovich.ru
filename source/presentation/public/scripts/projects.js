import { loadProjectsWorkspace } from "/source/application/projects/project-overview-coordinator.js";
import { createProjectRecord } from "/source/application/projects/project-registry.js";
import { renderProjectServicesScreen } from "./project-modules/services.js";
import { renderProjectAccountingScreen } from "./project-modules/accounting.js";
import { renderProjectAnalyticsScreen } from "./project-modules/analytics.js";
import { renderProjectMarketingScreen } from "./project-modules/marketing.js";

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
  let moduleSummaries = {};
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
    moduleSummaries = result.moduleSummaries || {};
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
        <header class="projects-screen-heading"><p class="projects-eyebrow">PROJECTS / NEW</p><h1>Новый проект</h1><p>Создайте рабочее пространство. Проект будет добавлен напрямую, без создания идеи.</p></header>
        <form class="projects-form" data-project-form>
          <label>Название проекта<input name="name" required maxlength="120" autocomplete="off" placeholder="Например, raymondovich.ru"></label>
          <label>Описание<textarea name="description" rows="3" maxlength="4000" placeholder="Кратко опишите проект"></textarea></label>
          <label>Цель<textarea name="goal" rows="2" maxlength="4000" placeholder="Какого результата нужно достичь"></textarea></label>
          <div class="projects-form-grid">
            <label>Приоритет<select name="priority">${Object.entries(PROJECT_PRIORITY).map(([key,value])=>`<option value="${key}" ${key==="normal"?"selected":""}>${value}</option>`).join("")}</select></label>
            <label>Статус<select name="status"><option value="active">В работе</option><option value="paused">На паузе</option></select></label>
          </div>
          <p class="projects-form-error" data-project-form-error hidden></p>
          <div class="projects-form-actions"><button type="submit" class="projects-primary">Создать проект</button></div>
        </form>
      </section>`;
  }

  function moduleSummary(projectId, key) {
    return moduleSummaries[projectId]?.[key]?.label || "Нет данных";
  }

  function renderOverview(project) {
    if (!project) return renderRegistry();
    currentProjectId = project.id;
    const servicesCount = moduleSummaries[project.id]?.services?.count || 0;
    const serviceDots = Array.from({length:6},(_,index)=>`<i class="${index<servicesCount?"is-active":""}"></i>`).join("");
    host.innerHTML = `
      <div class="projects-overview-screen">
        <header class="projects-overview-header">
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
              ${key==="services"?`<span class="projects-service-dots" aria-hidden="true">${serviceDots}</span>`:key==="accounting"?'<span class="projects-empty-bar" aria-hidden="true"></span>':key==="analytics"?'<span class="projects-placeholder-chart">График появится после сбора данных</span>':'<span class="projects-placeholder-platforms">Площадки не добавлены</span>'}
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
    const renderers = {
      services: renderProjectServicesScreen,
      accounting: renderProjectAccountingScreen,
      analytics: renderProjectAnalyticsScreen,
      marketing: renderProjectMarketingScreen
    };
    host.innerHTML = `
      <section class="projects-module-screen">
        ${key==="services"?"":`<header class="projects-screen-heading"><p class="projects-eyebrow">${module.eyebrow}</p><h1>${module.title}</h1><p>${module.description}</p></header>`}
        <div class="projects-module-body" data-project-module-body></div>
      </section>`;
    await renderers[key](host.querySelector("[data-project-module-body]"),project,user);
    const current = window.RaymondovichNavigation?.getState();
    if (current?.route !== "#authorization/projects" || current?.screen !== "project-"+key || current?.data?.projectId !== project.id) {
      if (current?.route === "#authorization/projects") renderNavigation(current);
    }
  }

  function renderServicesCategory(project,category,openCreate){
    if(!project||!["infrastructure","services"].includes(category))return renderRegistry();
    const module=MODULES.services;
    host.innerHTML=`<section class="projects-module-screen"><div class="projects-module-body" data-project-module-body></div></section>`;
    renderProjectServicesScreen(host.querySelector("[data-project-module-body]"),project,user,category,openCreate);
  }

  function renderNavigation(state) {
    if (state?.route !== "#authorization/projects") return;
    const screen = state.screen || "projects-registry";
    const projectId = state.data?.projectId;
    const project = projects.find(item=>item.id===projectId);
    if (screen === "project-create") renderCreateForm();
    else if (screen === "project-overview") {
      loadProjects().then(loaded=>{
        const current=window.RaymondovichNavigation?.getState();
        if(loaded && !controller.signal.aborted && current?.route==="#authorization/projects" && current?.screen==="project-overview" && current?.data?.projectId===projectId) {
          renderOverview(projects.find(item=>item.id===projectId));
        }
      });
    }
    else if (screen === "project-services-category") renderServicesCategory(project,state.data?.category,state.data?.openCreate);
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
    if(event.detail?.route==="#authorization/projects") {
      renderNavigation(event.detail);
    } else {
      controller.abort();
      if(activeController===controller)activeController=null;
    }
  },listenerOptions);

  const loaded=await loadProjects();
  if(!loaded || controller.signal.aborted)return;
  const state=window.RaymondovichNavigation?.getState();
  if(state?.route==="#authorization/projects") renderNavigation(state);
}
