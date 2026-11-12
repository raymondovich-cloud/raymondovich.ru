import { loadProjectsWorkspace } from "/source/application/projects/project-overview-coordinator.js";
import { createProjectRecord, moveProjectToTrashRecord } from "/source/application/projects/project-registry.js";
import { renderProjectServicesScreen } from "./project-modules/services.js";
import { renderProjectAccountingScreen } from "./project-modules/accounting.js";
import { renderProjectAnalyticsScreen } from "./project-modules/analytics.js";
import { renderProjectMarketingScreen } from "./project-modules/marketing.js";
import { escapeHtml as escape, workspaceToolbar, workspaceFilters, workspaceStatGrid, workspaceScreenHead, workspacePageTitle } from "./shared/workspace-ui.js";
import { formatMoney } from "./shared/format.js";

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
const projectsWorkspaceCache = new Map();

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
  let loadSequence = 0;
  let projectFilters = { status: "", priority: "", origin: "" };
  const cachedWorkspace = projectsWorkspaceCache.get(user.id);
  if (cachedWorkspace) {
    projects = cachedWorkspace.projects;
    moduleSummaries = cachedWorkspace.moduleSummaries;
  }

  const statusLabel = status => PROJECT_STATUS[status] || status || "Не указан";
  const priorityLabel = priority => PROJECT_PRIORITY[priority] || priority || "Обычный";

  async function loadProjects() {
    const sequence=++loadSequence;
    if (!projectsWorkspaceCache.has(user.id)) host.innerHTML = '<div class="projects-loading">Загрузка проектов…</div>';
    const result = await loadProjectsWorkspace();
    if(sequence!==loadSequence||controller.signal.aborted)return false;
    if (result.error) {
      host.innerHTML = '<div class="projects-state projects-error"><strong>Не удалось загрузить проекты</strong><p>Проверьте подключение и права доступа.</p></div>';
      return false;
    }
    projects = result.projects;
    moduleSummaries = result.moduleSummaries || {};
    projectsWorkspaceCache.set(user.id, { projects, moduleSummaries, updatedAt: Date.now() });
    return true;
  }

  function renderRegistry() {
    currentProjectId = null;
    const query = host.querySelector("[data-project-search]")?.value.trim().toLowerCase() || "";
    const allVisibleProjects = projects.filter(project => project.status !== "archived");
    const visible = allVisibleProjects.filter(project =>
      (!query || [project.name,project.description,project.goal].some(value => String(value||"").toLowerCase().includes(query))) &&
      (!projectFilters.status || project.status === projectFilters.status) &&
      (!projectFilters.priority || (project.priority || "normal") === projectFilters.priority) &&
      (!projectFilters.origin || (projectFilters.origin === "idea" ? Boolean(project.source_idea_id) : !project.source_idea_id)));
    const focused = visible.filter(project => project.status === "active" && ["high","critical"].includes(project.priority)).slice(0,2);
    const focusedIds = new Set(focused.map(project => project.id));
    const remaining = visible.filter(project => !focusedIds.has(project.id));
    const groups = new Map();
    remaining.forEach(project => { const status = project.status || "unknown"; if (!groups.has(status)) groups.set(status,[]); groups.get(status).push(project); });
    const highPriorityCount = allVisibleProjects.filter(project => ["high","critical"].includes(project.priority)).length;
    const completedCount = allVisibleProjects.filter(project => project.status === "completed").length;
    const progressStep = allVisibleProjects.length ? Math.min(100,Math.round(completedCount / allVisibleProjects.length * 20) * 5) : 0;
    const statusSummary = Object.entries(PROJECT_STATUS).filter(([key])=>key!=="archived").map(([key,label])=>`${label}: ${allVisibleProjects.filter(project=>project.status===key).length}`).join(" · ");
    host.innerHTML = `
      <section class="ws-page projects-registry" data-project-registry>
        ${workspacePageTitle("Проекты")}
        ${workspaceToolbar({searchAttr:"data-project-search",searchLabel:"Поиск проектов",searchPlaceholder:"Поиск проектов",searchValue:query,filterToggleAttr:"data-project-filter-toggle",filterPanelId:"projects-filter-panel",createAttr:"data-project-create",createLabel:"Добавить новый проект"})}
        ${workspaceFilters({id:"projects-filter-panel",attributes:"data-project-filters",fields:[
          {label:"Статус",control:`<select aria-label="Фильтр по статусу" data-project-filter-status><option value="">Все статусы</option>${Object.entries(PROJECT_STATUS).filter(([key])=>key!=="archived").map(([key,label])=>`<option value="${key}" ${projectFilters.status===key?"selected":""}>${escape(label)}</option>`).join("")}</select>`},
          {label:"Приоритет",control:`<select aria-label="Фильтр по приоритету" data-project-filter-priority><option value="">Все приоритеты</option>${Object.entries(PROJECT_PRIORITY).map(([key,label])=>`<option value="${key}" ${projectFilters.priority===key?"selected":""}>${escape(label)}</option>`).join("")}</select>`},
          {label:"Источник",control:`<select aria-label="Фильтр по источнику" data-project-filter-origin><option value="">Все проекты</option><option value="idea" ${projectFilters.origin==="idea"?"selected":""}>Из идеи</option><option value="direct" ${projectFilters.origin==="direct"?"selected":""}>Создан напрямую</option></select>`}
        ]})}
        <section class="ws-overview" aria-label="Сводка проектов">
          ${workspaceStatGrid([{label:"Всего проектов",value:allVisibleProjects.length},{label:"Высокий приоритет",value:highPriorityCount,accent:true}])}
          <article class="ws-summary"><div class="ws-summary-head"><span>По статусам</span><span>${completedCount} завершено</span></div><div class="ws-progress"><span class="ws-progress-${progressStep}"></span></div><div class="ws-summary-foot">${escape(statusSummary || "Проектов пока нет")}</div></article>
        </section>
        <div class="projects-registry-list" data-project-list>
          ${focused.length ? `<section class="ws-focus"><h2 class="ws-section-title">В ФОКУСЕ</h2><div class="ws-card-list">${focused.map(project=>`<button class="ws-card is-focused projects-registry-card" type="button" data-project-open="${escape(project.id)}"><span class="projects-registry-main"><span class="projects-registry-name">${escape(project.name)}</span><span class="projects-registry-description">${escape(project.description || "Описание пока не добавлено.")}</span></span><span class="projects-registry-meta"><span class="projects-status status-${escape(project.status)}">${escape(statusLabel(project.status))}</span><span>${escape(priorityLabel(project.priority))}</span><span class="projects-card-arrow" aria-hidden="true">↗</span></span></button>`).join("")}</div></section>` : ""}
          ${remaining.length ? `<section class="ws-others"><h2 class="ws-section-title is-muted">ОСТАЛЬНЫЕ</h2><div class="ws-groups">${[...groups.entries()].map(([status,items])=>`<details class="ws-group" ${groups.size===1?"open":""}><summary><span>${escape(statusLabel(status))} · ${items.length}</span><span aria-hidden="true">⌄</span></summary><div class="ws-group-content">${items.map(project=>`<button class="ws-card is-compact projects-registry-card" type="button" data-project-open="${escape(project.id)}"><span class="projects-registry-main"><span class="projects-registry-name">${escape(project.name)}</span><span class="projects-registry-description">${escape(project.description || "Описание пока не добавлено.")}</span></span><span class="projects-registry-meta"><span class="projects-status status-${escape(project.status)}">${escape(statusLabel(project.status))}</span><span class="projects-card-arrow" aria-hidden="true">↗</span></span></button>`).join("")}</div></details>`).join("")}</div></section>` : ""}
          ${!visible.length ? `<div class="ws-empty"><strong>${allVisibleProjects.length?"Ничего не найдено":"Проектов пока нет"}</strong><p>${allVisibleProjects.length?"Измените поисковый запрос или фильтры.":"Создайте первый проект или преобразуйте существующую идею в проект."}</p></div>` : ""}
        </div>
      </section>`;
  }
  function renderCreateForm() {
    host.innerHTML = `
      <section class="projects-form-screen">
        ${workspaceScreenHead({title:"Новый проект",subtitle:"Создайте рабочее пространство. Проект будет добавлен напрямую, без создания идеи."})}
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
    const projectSummary=moduleSummaries[project.id]||{};
    const servicesCount=projectSummary.services?.count||0;
    const servicesFootnote=projectSummary.services?.label==="Нет данных"?"Сводка недоступна":servicesCount?"Управление подключениями":"Добавьте сервисы проекта";
    const headline=projectSummary.headline||{};
    const renderMetric=metric=>{
      if(metric?.state!=="value")return "—";
      if(Array.isArray(metric.value))return metric.value.map(item=>formatMoney(item.amount,item.currency)+"/мес").join(" · ")||"—";
      const value=formatMoney(metric.value,metric.currency);
      return metric.period==="month"?value+"/мес":value;
    };
    const expenseSource=headline.expense?.source==="services_recurring"
      ? '<small class="projects-metric-source">в мес · по сервисам</small>'
      : "";
    const serviceDots = Array.from({length:6},(_,index)=>`<i class="${index<servicesCount?"is-active":""}"></i>`).join("");
    host.innerHTML = `
      <div class="projects-overview-screen">
        <header class="projects-overview-header">
          <div class="projects-project-hero">
            <div class="projects-project-topline"><span class="projects-eyebrow">ПРОЕКТ · ${project.source_idea_id?"ИЗ ИДЕИ":"СОЗДАН НАПРЯМУЮ"}</span><span class="projects-status status-${escape(project.status)}">${escape(statusLabel(project.status))}</span></div>
            <h1>${escape(project.name)}</h1>
            <div class="projects-project-metrics">
              <div><span>Польз.</span><strong>${renderMetric(headline.users)}</strong></div>
              <div><span>Доход</span><strong class="metric-positive">${renderMetric(headline.income)}</strong></div>
              <div><span>Расход</span><strong class="metric-expense">${renderMetric(headline.expense)}</strong>${expenseSource}</div>
            </div>
            <p class="projects-data-note">Расход показывает ежемесячные платежи по сервисам проекта (ручной ввод); фактический учёт появится в «Бухгалтерии».</p>
          </div>
        </header>
        <div class="projects-module-grid">
          ${Object.entries(MODULES).map(([key,module])=>`
            <button type="button" class="projects-module-card" data-project-module="${key}" data-project-id="${escape(project.id)}">
              <span class="projects-module-top"><span class="projects-module-icon" aria-hidden="true">${key==="services"?"⌁":key==="accounting"?"▣":key==="analytics"?"⌁":"◉"}</span><span class="projects-module-summary">${escape(moduleSummary(project.id,key))}</span></span>
              <span class="projects-module-title">${escape(module.title)}</span>
              ${key==="services"?`<span class="projects-service-dots" aria-hidden="true">${serviceDots}</span>`:key==="accounting"?'<span class="projects-empty-bar" aria-hidden="true"></span>':key==="analytics"?'<span class="projects-placeholder-chart">График появится после сбора данных</span>':'<span class="projects-placeholder-platforms">Площадки не добавлены</span>'}
              <span class="projects-module-foot">${key==="services"?servicesFootnote:key==="accounting"?"Ручной учёт доходов и расходов":key==="analytics"?"Динамика и источники трафика":"Каналы и площадки продвижения"}</span>
              <span class="projects-module-arrow" aria-hidden="true">↗</span>
            </button>`).join("")}
        </div>
        <div class="projects-overview-actions"><button type="button" class="projects-secondary" data-project-move-to-trash="${escape(project.id)}">Переместить в корзину</button></div>
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
        ${key==="services"?"":`${workspaceScreenHead({title:module.title,subtitle:module.description})}`}
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
    if (screen === "project-overview") {
      loadProjects().then(loaded=>{
        const current=window.RaymondovichNavigation?.getState();
        if(loaded && !controller.signal.aborted && current?.route==="#authorization/projects" && current?.screen==="project-overview" && current?.data?.projectId===projectId) {
          renderOverview(projects.find(item=>item.id===projectId));
        }
      });
      return;
    }
    loadSequence+=1;
    if (screen === "project-create") renderCreateForm();
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
    const filterToggle = event.target.closest("[data-project-filter-toggle]");
    if (filterToggle) {
      const panel = host.querySelector("[data-project-filters]");
      panel.hidden = !panel.hidden;
      filterToggle.setAttribute("aria-expanded",String(!panel.hidden));
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
  root.addEventListener("change",event=>{
    if(event.target.matches("[data-project-filter-status]")) projectFilters.status=event.target.value;
    else if(event.target.matches("[data-project-filter-priority]")) projectFilters.priority=event.target.value;
    else if(event.target.matches("[data-project-filter-origin]")) projectFilters.origin=event.target.value;
    else return;
    renderRegistry();
    const panel=host.querySelector("[data-project-filters]");
    const toggle=host.querySelector("[data-project-filter-toggle]");
    if(panel)panel.hidden=false;
    toggle?.setAttribute("aria-expanded","true");
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
      loadSequence+=1;
      controller.abort();
      if(activeController===controller)activeController=null;
    }
  },listenerOptions);

  const navigation = window.RaymondovichNavigation;
  const initialState = navigation?.getState();
  if (cachedWorkspace && initialState?.route === "#authorization/projects") {
    renderNavigation(initialState);
  }

  const loaded=await loadProjects();
  if(!loaded || controller.signal.aborted)return;
  const state=navigation?.getState();
  if(state?.route==="#authorization/projects") renderNavigation(state);
}
