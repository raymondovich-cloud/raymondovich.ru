<script setup>
import { computed, onMounted, ref } from "vue";
import { useRouter } from "vue-router";
import { getRole, getSession, logout } from "../../../runtime/auth.js";
import {
  createIdea, deleteIdea, listIdeas, updateIdea,
  createProjectFromIdea, deleteProject, listProjects, updateProject,
} from "../../../runtime/services.js";

const router = useRouter();
const user = ref(null);
const ideas = ref([]);
const projects = ref([]);
const view = ref("overview");
const ideaFilter = ref("open");
const projectFilter = ref("active");
const busy = ref(false);
const statusMessage = ref("");
const statusError = ref(false);
const accountOpen = ref(false);
const ideaDialog = ref(null);
const detailDialog = ref(null);
const newIdea = ref({ title: "", description: "", goal: "", expectedRevenue: "", estimatedCost: "", businessModel: "", concept: "", additionalInfo: "" });
const editingIdea = ref(null);
const contextMenu = ref(null);
const longPressTimer = ref(null);
const longPressTriggered = ref(false);
const sidebarOpen = ref(false);

const displayName = computed(() => user.value?.user_metadata?.display_name?.trim()
  || user.value?.user_metadata?.full_name?.trim()
  || user.value?.email?.split("@")[0]
  || "Пользователь");
const openIdeas = computed(() => ideas.value.filter((item) => ["new", "review"].includes(item.status)));
const launchedIdeas = computed(() => ideas.value.filter((item) => item.status === "launched"));
const archivedIdeas = computed(() => ideas.value.filter((item) => item.status === "archived"));
const activeProjects = computed(() => projects.value.filter((item) => ["active", "paused", "completed"].includes(item.status)));
const archivedProjects = computed(() => projects.value.filter((item) => item.status === "archived"));
const runningProjects = computed(() => activeProjects.value.filter((item) => item.status === "active"));
const pausedProjects = computed(() => activeProjects.value.filter((item) => item.status === "paused"));
const priorityIdeas = computed(() => openIdeas.value.filter((item) => ["high", "critical"].includes(item.priority)));
const visibleIdeas = computed(() => ideaFilter.value === "archived" ? archivedIdeas.value : openIdeas.value);
const visibleProjects = computed(() => projectFilter.value === "archived" ? archivedProjects.value : activeProjects.value);
const priorityCount = computed(() => priorityIdeas.value.length + projects.value.filter((item) => ["high", "critical"].includes(item.priority)).length);
const recentIdeas = computed(() => [...ideas.value].filter((item) => !["archived", "launched"].includes(item.status)).sort(recentSort).slice(0, 4));
const recentProjects = computed(() => [...runningProjects.value, ...pausedProjects.value].sort(recentSort).slice(0, 5));
const focusIdeas = computed(() => [...priorityIdeas.value].sort(prioritySort).slice(0, 3));

function recentSort(a, b) {
  return new Date(b.updated_at || b.created_at) - new Date(a.updated_at || a.created_at);
}
function prioritySort(a, b) {
  const rank = (value) => ({ critical: 3, high: 2, normal: 1, low: 0 })[value] ?? 1;
  return rank(b.priority) - rank(a.priority) || recentSort(a, b);
}
function dateLabel(value) {
  if (!value) return "";
  const date = new Date(value);
  return Number.isNaN(date.getTime()) ? "" : new Intl.DateTimeFormat("ru-RU", { day: "numeric", month: "short", year: "numeric" }).format(date);
}
function priorityLabel(value) {
  return ({ critical: "Критический", high: "Высокий приоритет", normal: "Обычный приоритет", low: "Низкий приоритет" })[value] || "Обычный приоритет";
}
function ideaStatusLabel(value) {
  return ({ new: "Новая идея", review: "На рассмотрении", launched: "Передана в проект", archived: "Архив" })[value] || value;
}
function projectStatusLabel(value) {
  return ({ active: "В работе", paused: "На паузе", completed: "Завершён", archived: "Архив" })[value] || value;
}
function formatMoney(value) {
  if (value === null || value === undefined || value === "") return "";
  const amount = Number(value);
  return Number.isFinite(amount) ? new Intl.NumberFormat("ru-RU", { style: "currency", currency: "RUB", maximumFractionDigits: 2 }).format(amount) : "";
}
function hasPlanning(item) {
  return ["goal", "expected_revenue", "estimated_cost", "business_model", "concept", "additional_info"]
    .some((key) => item[key] !== null && item[key] !== undefined && String(item[key]).trim() !== "");
}
function showStatus(message, isError = false) {
  statusMessage.value = message;
  statusError.value = isError;
}
async function refresh() {
  if (!user.value) return;
  const [nextIdeas, nextProjects] = await Promise.all([listIdeas(user.value.id), listProjects(user.value.id)]);
  ideas.value = nextIdeas;
  projects.value = nextProjects;
}
async function withBusy(task) {
  if (busy.value) return;
  busy.value = true;
  statusMessage.value = "";
  try {
    await task();
  } catch (error) {
    showStatus(error.message || "Не удалось выполнить операцию.", true);
  } finally {
    busy.value = false;
  }
}
async function performAction(entity, action, id) {
  const isIdea = entity === "idea";
  const item = (isIdea ? ideas.value : projects.value).find((entry) => entry.id === id);
  if (!item) return;
  if (action === "delete" && !window.confirm(`Удалить «${item.name}» без возможности восстановления?`)) return;
  await withBusy(async () => {
    if (action === "delete") {
      if (isIdea) await deleteIdea(id, user.value.id);
      else await deleteProject(id, user.value.id);
      showStatus(isIdea ? "Идея удалена." : "Проект удалён.");
    } else if (isIdea && action === "launch") {
      await createProjectFromIdea(item, user.value.id);
      view.value = "projects";
      showStatus("Проект создан. Исходная идея сохранена в истории.");
    } else if (isIdea) {
      const changes = {};
      if (action === "review") changes.status = item.status === "review" ? "new" : "review";
      if (action === "archive") changes.status = "archived";
      if (action === "restore") changes.status = "new";
      if (action === "priority") changes.priority = ["high", "critical"].includes(item.priority) ? "normal" : "high";
      if (Object.keys(changes).length) {
        await updateIdea(id, user.value.id, changes);
        showStatus("Статус идеи обновлён.");
      }
    } else {
      const changes = {};
      if (action === "restore") changes.status = "active";
      if (action === "pin") changes.is_pinned = !item.is_pinned;
      if (action === "archive") changes.status = "archived";
      if (action === "complete") changes.status = "completed";
      if (action === "pause") changes.status = item.status === "paused" ? "active" : "paused";
      if (action === "priority") changes.priority = ["high", "critical"].includes(item.priority) ? "normal" : "high";
      if (Object.keys(changes).length) {
        await updateProject(id, user.value.id, changes);
        showStatus("Изменения проекта сохранены.");
      }
    }
    await refresh();
  });
  contextMenu.value = null;
}
function openNewIdea() {
  newIdea.value = { title: "", description: "", goal: "", expectedRevenue: "", estimatedCost: "", businessModel: "", concept: "", additionalInfo: "" };
  ideaDialog.value?.showModal();
}
async function saveNewIdea() {
  await withBusy(async () => {
    await createIdea({
      ownerId: user.value.id,
      title: newIdea.value.title,
      description: newIdea.value.description,
      goal: newIdea.value.goal,
      expectedRevenue: newIdea.value.expectedRevenue === "" ? null : Number(newIdea.value.expectedRevenue),
      estimatedCost: newIdea.value.estimatedCost === "" ? null : Number(newIdea.value.estimatedCost),
      businessModel: newIdea.value.businessModel,
      concept: newIdea.value.concept,
      additionalInfo: newIdea.value.additionalInfo,
    });
    ideaDialog.value?.close();
    view.value = "ideas";
    ideaFilter.value = "open";
    await refresh();
    showStatus("Идея сохранена отдельно от проектов.");
  });
}
function openIdeaDetails(idea) {
  editingIdea.value = {
    id: idea.id,
    name: idea.name || "",
    description: idea.description || "",
    goal: idea.goal || "",
    expected_revenue: idea.expected_revenue ?? "",
    estimated_cost: idea.estimated_cost ?? "",
    business_model: idea.business_model || "",
    concept: idea.concept || "",
    additional_info: idea.additional_info || "",
  };
  detailDialog.value?.showModal();
}
async function saveIdeaDetails() {
  if (!editingIdea.value) return;
  await withBusy(async () => {
    const item = editingIdea.value;
    await updateIdea(item.id, user.value.id, {
      name: item.name.trim(),
      description: item.description.trim(),
      goal: item.goal.trim(),
      expected_revenue: item.expected_revenue === "" ? null : Number(item.expected_revenue),
      estimated_cost: item.estimated_cost === "" ? null : Number(item.estimated_cost),
      business_model: item.business_model.trim(),
      concept: item.concept.trim(),
      additional_info: item.additional_info.trim(),
    });
    detailDialog.value?.close();
    await refresh();
    showStatus("Изменения идеи сохранены.");
  });
}
function startLongPress(event, entity, id) {
  longPressTriggered.value = false;
  clearTimeout(longPressTimer.value);
  longPressTimer.value = window.setTimeout(() => {
    longPressTriggered.value = true;
    const item = (entity === "idea" ? ideas.value : projects.value).find((entry) => entry.id === id);
    contextMenu.value = { entity, id, status: item?.status, x: Math.min(event.clientX, window.innerWidth - 250), y: Math.min(event.clientY, window.innerHeight - 220) };
  }, 550);
}
function cancelLongPress() {
  clearTimeout(longPressTimer.value);
}
function openContext(item, entity, event) {
  event.preventDefault();
  contextMenu.value = { entity, id: item.id, status: item.status, x: Math.min(event.clientX, window.innerWidth - 250), y: Math.min(event.clientY, window.innerHeight - 220) };
}
function openContextAction(action) {
  if (!contextMenu.value) return;
  performAction(contextMenu.value.entity, action, contextMenu.value.id);
}
async function signOut() {
  await withBusy(async () => {
    await logout();
    await router.replace("/");
  });
}
function toggleSidebar() {
  sidebarOpen.value = !sidebarOpen.value;
}

onMounted(async () => {
  try {
    const session = await getSession();
    if (!session || getRole(session) !== "admin") {
      await router.replace("/");
      return;
    }
    user.value = session.user;
    await refresh();
  } catch (error) {
    showStatus(error.message || "Не удалось открыть рабочее пространство.", true);
  }
});
</script>

<template>
  <div class="owner-workspace" :class="{ 'sidebar-open': sidebarOpen }">
    <div class="app-shell">
      <button class="sidebar-backdrop" type="button" aria-label="Закрыть меню" @click="sidebarOpen = false"></button>
      <aside class="sidebar" aria-label="Боковая навигация">
        <p class="sidebar-label">РАБОЧЕЕ ПРОСТРАНСТВО</p>
        <nav class="main-nav" aria-label="Основная навигация">
          <button class="nav-item" :class="{ 'is-active': view === 'overview' }" type="button" @click="view = 'overview'; sidebarOpen = false"><span class="nav-icon">⌂</span><span>Обзор</span></button>
          <button class="nav-item" :class="{ 'is-active': view === 'ideas' }" type="button" @click="view = 'ideas'; sidebarOpen = false"><span class="nav-icon">✳</span><span>Идеи</span><span class="nav-count">{{ openIdeas.length }}</span></button>
          <button class="nav-item" :class="{ 'is-active': view === 'projects' }" type="button" @click="view = 'projects'; sidebarOpen = false"><span class="nav-icon">▦</span><span>Проекты</span><span class="nav-count">{{ activeProjects.length }}</span></button>
        </nav>
        <div class="sidebar-bottom"><span class="status-dot"></span><span>Личное пространство</span></div>
      </aside>

      <main class="main-area">
        <header class="topbar">
          <button class="menu-toggle" type="button" aria-label="Открыть навигацию" :aria-expanded="sidebarOpen" @click="toggleSidebar"><span></span><span></span><span></span></button>
          <div class="topbar-context"><span class="status-dot"></span>ECOSYSTEM ONLINE</div>
          <div class="topbar-actions">
            <div class="account-wrap">
              <button class="account-trigger" type="button" :aria-expanded="accountOpen" @click="accountOpen = !accountOpen"><span class="account-trigger-name">RAYMONDOVICH</span><span class="account-avatar">{{ displayName.charAt(0).toUpperCase() }}</span></button>
              <section v-if="accountOpen" class="account-panel" aria-label="Личный кабинет">
                <div class="account-panel-heading"><span class="account-avatar account-avatar-large">{{ displayName.charAt(0).toUpperCase() }}</span><div><strong>{{ displayName }}</strong><small>Администратор</small></div></div>
                <div class="account-panel-item"><span>Электронная почта</span><small>{{ user?.email || "Не указан" }}</small></div>
                <button class="account-logout" type="button" :disabled="busy" @click="signOut">↗ <span>Выйти из аккаунта</span></button>
              </section>
            </div>
          </div>
        </header>

        <section class="page-content" aria-live="polite">
          <template v-if="view === 'overview'">
            <header class="overview-intro">
              <div><p class="eyebrow">RAYMONDOVICH / CONTROL CENTER</p><h1>Центр управления</h1><p>Общая картина твоих направлений и текущих задач.</p></div>
              <div class="overview-live"><span class="status-dot"></span>РАБОЧЕЕ ПРОСТРАНСТВО</div>
            </header>
            <section class="overview-summary" aria-label="Сводка рабочего пространства">
              <div class="summary-item"><span>Идеи</span><strong>{{ openIdeas.length }}</strong><small>ожидают решения</small></div>
              <div class="summary-item"><span>Проекты</span><strong>{{ runningProjects.length }}</strong><small>активно в работе</small></div>
              <div class="summary-item"><span>На паузе</span><strong>{{ pausedProjects.length }}</strong><small>приостановлено</small></div>
              <div class="summary-item"><span>Приоритет</span><strong>{{ priorityCount }}</strong><small>направлений</small></div>
            </section>
            <section class="overview-focus">
              <div class="overview-section-heading"><div><p class="eyebrow">ATTENTION REQUIRED</p><h2>Требуют внимания</h2></div><button class="text-action" type="button" @click="view = 'ideas'">Все идеи ↗</button></div>
              <div class="overview-list">
                <div v-if="!focusIdeas.length" class="overview-quiet-state">Нет приоритетных идей. Новые направления появятся здесь, когда ты отметишь их как приоритетные.</div>
                <article v-for="idea in focusIdeas" :key="idea.id" class="overview-row overview-idea-row">
                  <div class="overview-row-main"><span class="overview-row-marker idea-marker"></span><div class="overview-row-copy"><strong>{{ idea.name }}</strong><span>{{ ideaStatusLabel(idea.status) }} · {{ priorityLabel(idea.priority) }}</span></div></div>
                  <div class="overview-row-actions"><button class="overview-inline-action" type="button" :disabled="busy" @click="performAction('idea','launch',idea.id)">Запустить проект</button><button class="overview-chevron" type="button" aria-label="Открыть идеи" @click="view='ideas'">↗</button></div>
                </article>
              </div>
            </section>
            <section class="overview-work">
              <div class="overview-section-heading"><div><p class="eyebrow">EXECUTION / IN PROGRESS</p><h2>Проекты в работе</h2></div><button class="text-action" type="button" @click="view='projects'">Все проекты ↗</button></div>
              <div class="overview-list">
                <div v-if="!recentProjects.length" class="overview-quiet-state">Пока нет запущенных проектов. Когда идея будет готова к реализации, запусти её в разделе «Идеи».</div>
                <article v-for="project in recentProjects" :key="project.id" class="overview-row">
                  <div class="overview-row-main"><span class="overview-row-marker project-marker"></span><div class="overview-row-copy"><strong>{{ project.name }}</strong><span>{{ projectStatusLabel(project.status) }} · {{ priorityLabel(project.priority) }}</span></div></div>
                  <div class="overview-row-actions"><button class="overview-inline-action" type="button" :disabled="busy" @click="performAction('project','pause',project.id)">{{ project.status === 'paused' ? 'Возобновить' : 'Пауза' }}</button><button class="overview-chevron" type="button" aria-label="Открыть проекты" @click="view='projects'">↗</button></div>
                </article>
              </div>
            </section>
            <section class="overview-recent">
              <div class="overview-section-heading"><div><p class="eyebrow">CAPTURE / LATEST UPDATES</p><h2>Недавние идеи</h2></div><button class="text-action" type="button" @click="view='ideas'">Открыть идеи ↗</button></div>
              <div class="overview-recent-list">
                <div v-if="!recentIdeas.length" class="overview-quiet-state">Здесь будут отображаться последние зафиксированные идеи.</div>
                <article v-for="idea in recentIdeas" :key="idea.id" class="overview-recent-row"><div><strong>{{ idea.name }}</strong><span>{{ ideaStatusLabel(idea.status) }}</span></div><time>{{ dateLabel(idea.updated_at || idea.created_at) }}</time></article>
              </div>
            </section>
          </template>

          <template v-else-if="view === 'ideas'">
            <header class="overview-intro ideas-intro"><div><p class="eyebrow">RAYMONDOVICH / IDEA SPACE</p><h1>Идеи</h1><p>Пространство для фиксации мыслей и направлений до их превращения в проекты.</p></div></header>
            <section class="overview-summary ideas-summary" aria-label="Сводка идей">
              <div class="summary-item"><span>Входящие</span><strong>{{ openIdeas.length }}</strong><small>ожидают решения</small></div>
              <div class="summary-item"><span>На рассмотрении</span><strong>{{ openIdeas.filter(item => item.status === 'review').length }}</strong><small>требуют оценки</small></div>
              <div class="summary-item"><span>Приоритет</span><strong>{{ priorityIdeas.length }}</strong><small>важные направления</small></div>
              <div class="summary-item"><span>Запущено</span><strong>{{ launchedIdeas.length }}</strong><small>перешли в проекты</small></div>
            </section>
            <section class="overview-focus ideas-section">
              <div class="overview-section-heading"><div><p class="eyebrow">CAPTURE / ORGANIZE</p><h2>{{ ideaFilter === 'archived' ? 'Архив идей' : 'Рабочий список' }}</h2></div>
                <div class="ideas-heading-tools"><span class="ideas-total">{{ visibleIdeas.length }} записей</span><button class="text-action ideas-archive-link" type="button" @click="ideaFilter = ideaFilter === 'archived' ? 'open' : 'archived'">{{ ideaFilter === 'archived' ? 'К входящим' : 'Архив · ' + archivedIdeas.length }} ↗</button><button class="ideas-add-icon" type="button" aria-label="Добавить новую идею" title="Новая идея" @click="openNewIdea">＋</button></div>
              </div>
              <div class="overview-list ideas-list">
                <div v-if="!visibleIdeas.length" class="overview-quiet-state">{{ ideaFilter === 'archived' ? 'Архив пока пуст. Сюда попадают идеи, которые ты отправляешь в архив.' : 'Пока нет зафиксированных идей. Добавь первую мысль — она появится в этом списке.' }}</div>
                <article v-for="idea in [...visibleIdeas].sort(prioritySort)" :key="idea.id" class="overview-row idea-workspace-row idea-card-interactive" tabindex="0" role="button" :aria-label="'Открыть идею: ' + idea.name" @click="!longPressTriggered && openIdeaDetails(idea)" @contextmenu="openContext(idea,'idea',$event)" @pointerdown="startLongPress($event,'idea',idea.id)" @pointerup="cancelLongPress" @pointerleave="cancelLongPress" @pointercancel="cancelLongPress">
                  <div class="overview-row-main"><span class="overview-row-marker idea-marker"></span><div class="overview-row-copy"><strong>{{ idea.name }}</strong><span>{{ ideaStatusLabel(idea.status) }} · {{ priorityLabel(idea.priority) }} · {{ dateLabel(idea.updated_at || idea.created_at) }}</span><p v-if="idea.description" class="idea-row-description">{{ idea.description }}</p></div></div><span class="idea-card-open-indicator">↗</span>
                </article>
              </div>
            </section>
            <section v-if="ideaFilter !== 'archived' && launchedIdeas.length" class="overview-recent ideas-section"><div class="overview-section-heading"><div><p class="eyebrow">EXECUTION / CONVERTED</p><h2>Переданы в проекты</h2></div><span class="ideas-total">{{ launchedIdeas.length }} идей</span></div><div class="overview-list ideas-list"><article v-for="idea in [...launchedIdeas].sort(prioritySort)" :key="idea.id" class="overview-row idea-workspace-row"><div class="overview-row-main"><span class="overview-row-marker idea-marker"></span><div class="overview-row-copy"><strong>{{ idea.name }}</strong><span>{{ ideaStatusLabel(idea.status) }} · {{ priorityLabel(idea.priority) }}</span></div></div></article></div></section>
            <p class="ideas-latest-note">{{ recentIdeas[0] ? 'Последнее обновление: ' + dateLabel(recentIdeas[0].updated_at || recentIdeas[0].created_at) : 'Новые идеи будут собираться здесь.' }}</p>
          </template>

          <template v-else>
            <div class="page-heading"><div><p class="eyebrow">EXECUTION / PROJECTS</p><h1>Проекты</h1><p>Здесь находятся только идеи, которые ты явно запустил в реализацию.</p></div></div>
            <section class="section-card"><div class="section-heading"><h2>{{ projectFilter === 'archived' ? 'Архив проектов' : 'Рабочие проекты' }}</h2><span class="badge">{{ visibleProjects.length }} записей</span></div>
              <div class="segmented-control" role="group" aria-label="Фильтр проектов"><button class="segment-button" :class="{ 'is-active': projectFilter === 'active' }" type="button" @click="projectFilter='active'">Проекты</button><button class="segment-button" :class="{ 'is-active': projectFilter === 'archived' }" type="button" @click="projectFilter='archived'">Архив <span>{{ archivedProjects.length }}</span></button></div>
              <div class="list-stack">
                <div v-if="!visibleProjects.length" class="empty-state"><div><strong>{{ projectFilter === 'archived' ? 'Архив проектов пуст' : 'Проектов пока нет' }}</strong><p>{{ projectFilter === 'archived' ? 'Архивированные проекты появятся здесь.' : 'Перейди в раздел «Идеи» и запусти направление, которое готов реализовывать.' }}</p></div></div>
                <article v-for="project in [...visibleProjects].sort(prioritySort)" :key="project.id" class="project-card" @contextmenu="openContext(project,'project',$event)" @pointerdown="startLongPress($event,'project',project.id)" @pointerup="cancelLongPress" @pointerleave="cancelLongPress" @pointercancel="cancelLongPress">
                  <div class="card-topline"><div><h3 class="card-title">{{ project.name }}</h3><p v-if="project.description" class="card-description">{{ project.description }}</p></div></div>
                  <details v-if="hasPlanning(project)" class="planning-details"><summary>План проекта<span>Дополнительные параметры</span></summary><div class="planning-details-grid"><div v-if="project.goal" class="planning-detail"><span>Цель проекта</span><p>{{ project.goal }}</p></div><div v-if="project.expected_revenue !== null && project.expected_revenue !== undefined" class="planning-detail"><span>Желаемый доход</span><p>{{ formatMoney(project.expected_revenue) }}</p></div><div v-if="project.estimated_cost !== null && project.estimated_cost !== undefined" class="planning-detail"><span>Примерные расходы</span><p>{{ formatMoney(project.estimated_cost) }}</p></div><div v-if="project.business_model" class="planning-detail"><span>Модель заработка</span><p>{{ project.business_model }}</p></div><div v-if="project.concept" class="planning-detail"><span>Концепция</span><p>{{ project.concept }}</p></div><div v-if="project.additional_info" class="planning-detail"><span>Дополнительная информация</span><p>{{ project.additional_info }}</p></div></div></details>
                  <div class="card-meta"><span class="badge badge-status">{{ projectStatusLabel(project.status) }}</span><span class="badge" :class="{ 'badge-priority': ['high','critical'].includes(project.priority) }">{{ priorityLabel(project.priority) }}</span><span v-if="project.source_idea_id" class="badge">Создан из идеи</span><span v-if="project.target_due_date" class="card-date">Срок: {{ dateLabel(project.target_due_date) }}</span></div>
                  <div class="card-actions"><button v-if="project.status === 'archived'" class="action-button is-primary" type="button" :disabled="busy" @click="performAction('project','restore',project.id)">Восстановить проект</button><template v-else><button class="action-button" type="button" :disabled="busy" @click="performAction('project','pin',project.id)">{{ project.is_pinned ? 'Открепить' : 'Закрепить' }}</button><button class="action-button" type="button" :disabled="busy" @click="performAction('project','pause',project.id)">{{ project.status === 'paused' ? 'Возобновить' : 'Пауза' }}</button><button class="action-button" type="button" :disabled="busy" @click="performAction('project','priority',project.id)">{{ ['high','critical'].includes(project.priority) ? 'Снять приоритет' : 'В приоритет' }}</button><button class="action-button" type="button" :disabled="busy" @click="performAction('project','complete',project.id)">Завершить</button><button class="action-button" type="button" :disabled="busy" @click="performAction('project','archive',project.id)">В архив</button></template><button class="action-button is-danger" type="button" :disabled="busy" @click="performAction('project','delete',project.id)">Удалить</button></div>
                </article>
              </div>
            </section>
          </template>
          <p v-if="statusMessage" class="app-status" :data-state="statusError ? 'error' : 'success'" role="status">{{ statusMessage }}</p>
        </section>
        <footer class="app-footer">RAYMONDOVICH DIGITAL ECOSYSTEM <span>·</span> PRIVATE WORKSPACE</footer>
      </main>
    </div>

    <dialog ref="ideaDialog" class="idea-dialog">
      <form class="idea-form" @submit.prevent="saveNewIdea">
        <div class="dialog-heading"><div><p class="eyebrow">БЫСТРАЯ ФИКСАЦИЯ</p><h2>Новая идея</h2></div><button class="icon-button" type="button" aria-label="Закрыть" @click="ideaDialog?.close()">×</button></div>
        <label class="field-label">О чём идея?</label><input v-model="newIdea.title" type="text" maxlength="120" placeholder="Коротко запиши мысль…" autocomplete="off" required>
        <label class="field-label">Краткое описание <span>необязательно</span></label><textarea v-model="newIdea.description" rows="3" maxlength="3000" placeholder="Контекст, детали или просто голосом позже…"></textarea>
        <details class="idea-extra-parameters"><summary><span class="idea-extra-icon">＋</span><span><strong>Дополнительные параметры</strong><small>Цель, доход, расходы и модель заработка</small></span><span class="idea-extra-chevron">⌄</span></summary>
          <div class="idea-extra-fields">
            <label class="field-label">Цель проекта</label><textarea v-model="newIdea.goal" rows="2" maxlength="2000"></textarea>
            <label class="field-label">Желаемый доход, ₽</label><input v-model="newIdea.expectedRevenue" type="number" min="0" step="0.01" inputmode="decimal">
            <label class="field-label">Примерные расходы, ₽</label><input v-model="newIdea.estimatedCost" type="number" min="0" step="0.01" inputmode="decimal">
            <label class="field-label">Модель заработка</label><textarea v-model="newIdea.businessModel" rows="2"></textarea>
            <label class="field-label">Концепция</label><textarea v-model="newIdea.concept" rows="3"></textarea>
            <label class="field-label">Дополнительная информация</label><textarea v-model="newIdea.additionalInfo" rows="2"></textarea>
          </div>
        </details>
        <div class="dialog-actions"><button class="button button-quiet" type="button" @click="ideaDialog?.close()">Отмена</button><button class="button button-primary" type="submit" :disabled="busy">Сохранить идею</button></div>
      </form>
    </dialog>

    <dialog ref="detailDialog" class="idea-detail-dialog">
      <form v-if="editingIdea" class="idea-detail-form" @submit.prevent="saveIdeaDetails">
        <header class="idea-detail-heading"><div><p class="eyebrow">IDEA / DETAILS</p><h2>Карточка идеи</h2></div><button class="project-action-close" type="button" aria-label="Закрыть" @click="detailDialog?.close()">×</button></header>
        <label class="idea-detail-field"><span>Название идеи</span><input v-model="editingIdea.name" maxlength="120" required></label>
        <label class="idea-detail-field"><span>Краткое описание</span><textarea v-model="editingIdea.description" rows="3" maxlength="3000"></textarea></label>
        <div class="idea-detail-divider"><span>ПЛАНИРОВАНИЕ И ЭКОНОМИКА</span></div>
        <label class="idea-detail-field"><span>Цель проекта</span><textarea v-model="editingIdea.goal" rows="3"></textarea></label>
        <label class="idea-detail-field"><span>Желаемый доход, ₽</span><input v-model="editingIdea.expected_revenue" type="number" min="0" step="0.01"></label>
        <label class="idea-detail-field"><span>Примерные расходы, ₽</span><input v-model="editingIdea.estimated_cost" type="number" min="0" step="0.01"></label>
        <label class="idea-detail-field"><span>Модель заработка</span><textarea v-model="editingIdea.business_model" rows="3"></textarea></label>
        <label class="idea-detail-field"><span>Подробная концепция</span><textarea v-model="editingIdea.concept" rows="5"></textarea></label>
        <label class="idea-detail-field"><span>Дополнительная информация</span><textarea v-model="editingIdea.additional_info" rows="3"></textarea></label>
        <footer class="idea-detail-actions"><button class="button button-quiet" type="button" @click="detailDialog?.close()">Отмена</button><button class="button button-primary" type="submit" :disabled="busy">Сохранить изменения</button></footer>
      </form>
    </dialog>

    <div v-if="contextMenu" class="owner-context-backdrop" @click="contextMenu = null">
      <div class="owner-context-menu" :style="{ left: contextMenu.x + 'px', top: contextMenu.y + 'px' }" @click.stop>
        <template v-if="contextMenu.entity === 'idea' && contextMenu.status === 'archived'">
          <button type="button" @click="openContextAction('restore')">Вернуть к идеям</button><button type="button" class="is-danger" @click="openContextAction('delete')">Удалить</button>
        </template>
        <template v-else-if="contextMenu.entity === 'idea'">
          <button type="button" @click="openContextAction('review')">На рассмотрение</button><button type="button" @click="openContextAction('priority')">Изменить приоритет</button><button type="button" @click="openContextAction('launch')">Запустить проект</button><button type="button" @click="openContextAction('archive')">В архив</button><button type="button" class="is-danger" @click="openContextAction('delete')">Удалить</button>
        </template>
        <template v-else-if="contextMenu.status === 'archived'">
          <button type="button" @click="openContextAction('restore')">Восстановить проект</button><button type="button" class="is-danger" @click="openContextAction('delete')">Удалить</button>
        </template>
        <template v-else>
          <button type="button" @click="openContextAction('pin')">Закрепить / открепить</button><button type="button" @click="openContextAction('pause')">Пауза / возобновить</button><button type="button" @click="openContextAction('complete')">Завершить</button><button type="button" @click="openContextAction('archive')">В архив</button><button type="button" class="is-danger" @click="openContextAction('delete')">Удалить</button>
        </template>
      </div>
    </div>
  </div>
</template>

<style scoped src="../../../../design/owner.css"></style>
