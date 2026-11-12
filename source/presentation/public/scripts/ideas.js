import { supabase } from "/source/infrastructure/supabase/client.js";
import { moveIdeaToTrashRecord } from "/source/application/trash/trash-registry.js";
import { getFavorites } from "/source/application/favorites/favorites.js";
import { favoriteButtonMarkup, bindFavoriteToggle } from "./favorites-ui.js";
import { escapeHtml as escape, workspaceToolbar, workspaceFilters, workspaceStatGrid, workspaceSectionTitle, workspaceScreenHead, workspacePageTitle } from "./shared/workspace-ui.js";

const STATUS = {
  new: "Новая",
  review: "На рассмотрении",
  selected: "Отобрана",
  in_development: "В разработке",
  converted: "Преобразована в проект",
  archived: "Архив",
  launched: "Запущена"
};
const PRIORITY = { low: "Низкий", normal: "Обычный", high: "Высокий", critical: "Критический" };
let activeIdeasController = null;
const ideasWorkspaceCache = new Map();

export async function renderIdeasWorkspace(root, user) {
  activeIdeasController?.abort();
  const controller = new AbortController();
  activeIdeasController = controller;
  const listenerOptions = { signal: controller.signal };
  root.innerHTML = `
    <div class="owner-console-shell">
      <section class="owner-console-workspace" aria-label="Рабочее пространство владельца: идеи">
        <div class="ideas-workspace">
      <section class="ideas-registry" data-ideas-registry>
        ${workspacePageTitle("Идеи")}
        ${workspaceToolbar({ searchAttr: "data-ideas-search", searchLabel: "Поиск идей", searchPlaceholder: "Поиск идей", filterToggleAttr: "data-ideas-filter-toggle", filterPanelId: "ideas-filter-panel", createAttr: "data-idea-create", createLabel: "Добавить новую идею" })}
        ${workspaceFilters({ id: "ideas-filter-panel", attributes: "data-ideas-filters", fields: [
          { label: "Статус", control: `<select aria-label="Фильтр по статусу" data-filter-status><option value="">Все статусы</option>${Object.entries(STATUS).map(([key,label])=>`<option value="${escape(key)}">${escape(label)}</option>`).join("")}</select>` },
          { label: "Приоритет", control: `<select aria-label="Фильтр по приоритету" data-filter-priority><option value="">Все приоритеты</option>${Object.entries(PRIORITY).map(([key,label])=>`<option value="${escape(key)}">${escape(label)}</option>`).join("")}</select>` },
          { label: "Категория", control: `<select aria-label="Фильтр по категории" data-filter-category><option value="">Все категории</option></select>` }
        ] })}
        <section class="ws-overview ideas-overview" data-ideas-overview aria-label="Сводка идей">
          ${workspaceStatGrid([{label:"Всего идей",value:"—",valueAttr:"data-total-count"},{label:"Высокий приоритет",value:"—",accent:true,valueAttr:"data-high-count"}])}
          <article class="ws-summary ideas-category-summary">
            <div class="ws-summary-head ideas-category-summary-head"><span>По категориям</span><span data-new-count>Новые: —</span></div>
            <div class="ws-progress ideas-category-track"><span data-category-progress></span></div>
            <div class="ws-summary-foot ideas-category-summary-foot" data-category-summary>Загрузка…</div>
          </article>
        </section>
        <div class="ideas-list" data-ideas-list aria-live="polite"><p class="ideas-loading">Загрузка идей…</p></div>
      </section>

      <section class="ideas-detail-host" data-ideas-detail hidden aria-live="polite"></section>
      <div class="ideas-form-host" data-ideas-form hidden></div>
        </div>
      </section>
    </div>`;

  const registry = root.querySelector("[data-ideas-registry]");
  const list = root.querySelector("[data-ideas-list]");
  const detailHost = root.querySelector("[data-ideas-detail]");
  const workspace = root.querySelector(".owner-console-workspace");
  const formHost = root.querySelector("[data-ideas-form]");
  let ideas = [];
  let favoriteIdeaIds = new Set();
  let categories = [];
  let currentIdeaId = null;
  const cachedWorkspace = ideasWorkspaceCache.get(user.id);
  if (cachedWorkspace) {
    ideas = cachedWorkspace.ideas;
    categories = cachedWorkspace.categories;
  }

  const money = value => value === null || value === undefined || value === ""
    ? "Не указано"
    : new Intl.NumberFormat("ru-RU", { maximumFractionDigits: 2 }).format(Number(value));
  const isArchived = idea => idea.status === "archived" || Boolean(idea.archived_at);

  async function recordActivity(idea, eventType, details = {}) {
    const result = await supabase.from("idea_activity").insert({
      idea_id: idea.id, owner_id: user.id, actor_id: user.id, event_type: eventType, details
    });
    if (result.error) throw result.error;
  }

  async function load() {
    if (!ideasWorkspaceCache.has(user.id)) {
      list.innerHTML = '<p class="ideas-loading">Загрузка идей…</p>';
    }
    const [ideaResult, categoryResult, favoritesResult] = await Promise.all([
      supabase.from("ideas").select("*").is("deleted_at",null).order("updated_at", { ascending: false }),
      supabase.from("idea_categories").select("id,name").eq("is_archived", false).order("sort_order").order("name"),
      getFavorites()
    ]);
    if (ideaResult.error || favoritesResult.error) {
      list.innerHTML = '<p class="ideas-error">Не удалось загрузить идеи. Проверьте подключение и права доступа.</p>';
      return;
    }
    ideas = ideaResult.data || [];
    favoriteIdeaIds = new Set((favoritesResult.data || []).filter(item => item.type === "idea").map(item => item.id));
    categories = categoryResult.error ? (cachedWorkspace?.categories || []) : (categoryResult.data || []);
    ideasWorkspaceCache.set(user.id, { ideas, categories, updatedAt: Date.now() });
    const categoryFilter = root.querySelector("[data-filter-category]");
    const selected = categoryFilter.value;
    categoryFilter.innerHTML = '<option value="">Все категории</option>' + categories.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join("");
    categoryFilter.value = selected;
    renderList();
  }

  function renderList() {
    const query = root.querySelector("[data-ideas-search]").value.trim().toLowerCase();
    const status = root.querySelector("[data-filter-status]").value;
    const priority = root.querySelector("[data-filter-priority]").value;
    const category = root.querySelector("[data-filter-category]").value;
    const activeIdeas = ideas.filter(idea => !idea.deleted_at && !isArchived(idea));
    const filtered = activeIdeas.filter(idea =>
      (!query || [idea.name,idea.description,idea.goal,idea.concept,idea.additional_info].some(v=>String(v||"").toLowerCase().includes(query))) &&
      (!status || idea.status === status) &&
      (!priority || idea.priority === priority) &&
      (!category || idea.category_id === category)
    );
    const highPriority = filtered.filter(idea => favoriteIdeaIds.has(idea.id));
    const newCount = activeIdeas.filter(idea => idea.status === "new").length;
    root.querySelector("[data-total-count]").textContent = activeIdeas.length;
    root.querySelector("[data-high-count]").textContent = activeIdeas.filter(idea => ["high","critical"].includes(idea.priority)).length;
    root.querySelector("[data-new-count]").textContent = `Новые: ${newCount}`;

    const categoryCounts = new Map();
    activeIdeas.forEach(idea => {
      const label = categories.find(item => item.id === idea.category_id)?.name || "Без категории";
      categoryCounts.set(label, (categoryCounts.get(label) || 0) + 1);
    });
    const categorySummary = [...categoryCounts.entries()]
      .sort((a,b) => b[1]-a[1])
      .map(([name,count]) => `${escape(name)} · ${count}`)
      .join("  /  ");
    root.querySelector("[data-category-summary]").textContent = categorySummary || "Категории пока не добавлены";
    root.querySelector("[data-category-progress]").toggleAttribute("data-active", activeIdeas.length > 0);

    if (!filtered.length) {
      list.innerHTML = `<div class="ws-empty ideas-empty"><strong>${activeIdeas.length ? "Идей по этим условиям нет" : "Идей пока нет"}</strong><span>${activeIdeas.length ? "Измените параметры поиска или фильтрации." : "Добавьте первую идею."}</span></div>`;
      return;
    }

    const card = (idea, focused = false) => {
      const categoryName = categories.find(c=>c.id===idea.category_id)?.name || "Без категории";
      const statusName = STATUS[idea.status] || idea.status || "Новая";
      if (!focused) {
        const description = idea.description || idea.goal || statusName;
        return `<button class="idea-registry-row" type="button" data-idea-open="${escape(idea.id)}">
          <span class="idea-registry-tile" aria-hidden="true"><svg viewBox="0 0 24 24"><rect x="4" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="4" width="6.5" height="6.5" rx="1.6"/><rect x="4" y="13.5" width="6.5" height="6.5" rx="1.6"/><rect x="13.5" y="13.5" width="6.5" height="6.5" rx="1.6"/></svg></span>
          <span class="idea-registry-copy"><span class="idea-registry-name">${escape(idea.name)}</span><small class="idea-registry-description">${escape(description)}</small></span>
          <span class="idea-registry-priority">${escape(PRIORITY[idea.priority] || idea.priority || "Обычный")}</span>
        </button>`;
      }
      return `<button class="ws-card idea-card is-focused idea-card-focused" type="button" data-idea-open="${escape(idea.id)}">
        <span class="idea-card-top"><span class="idea-category">${escape(categoryName)} · ${escape(statusName)}</span><span class="idea-card-arrow" aria-hidden="true">↗</span></span>
        <span class="idea-card-title">${escape(idea.name)}</span>
        <span class="idea-card-description">${escape(idea.description || idea.goal || "Описание пока не добавлено.")}</span>
      </button>`;
    };

    const focused = highPriority.slice(0, 2);
    const focusedIds = new Set(focused.map(idea => idea.id));
    const remaining = filtered.filter(idea => !focusedIds.has(idea.id));
    const groups = new Map();
    remaining.forEach(idea => {
      const label = categories.find(item => item.id === idea.category_id)?.name || "Без категории";
      if (!groups.has(label)) groups.set(label, []);
      groups.get(label).push(idea);
    });

    list.innerHTML = `
      ${focused.length ? `<section class="ideas-focus">${workspaceSectionTitle("В ФОКУСЕ")}<div class="ideas-focus-list ws-card-list">${focused.map(idea => card(idea,true)).join("")}</div></section>` : ""}
      ${remaining.length ? `<section class="ideas-others">${workspaceSectionTitle("ОСТАЛЬНЫЕ",{muted:true})}<div class="ws-groups ideas-groups">${[...groups.entries()].map(([label,items],index) => `
        <details class="ws-group ideas-group" ${groups.size===1 ? "open" : ""}>
          <summary><span class="ideas-group-name">${escape(label)}</span><span class="ideas-group-meta"><span class="ideas-group-count">${items.length}</span><span class="ws-group-chevron" aria-hidden="true">⌄</span></span></summary>
          <div class="ws-group-content ideas-group-items">${items.map(idea => card(idea,false)).join("")}</div>
        </details>`).join("")}</div></section>` : ""}
      `;
  }

  function showRegistry() {
    workspace.classList.remove("is-detail-view");
    detailHost.hidden = true;
    formHost.hidden = true;
    registry.hidden = false;
    currentIdeaId = null;
    root.querySelector("[data-ideas-filters]").hidden = true;
    root.querySelector("[data-ideas-filter-toggle]").setAttribute("aria-expanded","false");
    renderList();
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function showDetail(idea) {
    if (!idea) return showRegistry();
    currentIdeaId = idea.id;
    workspace.classList.add("is-detail-view");
    registry.hidden = true;
    formHost.hidden = true;
    detailHost.hidden = false;
    const archived = isArchived(idea);
    const converted = idea.status === "converted";
    detailHost.innerHTML = `
      ${workspaceScreenHead({title:idea.name})}
      <article class="ideas-detail-content">
        <header class="ideas-detail-top">
          <div class="ideas-detail-meta"><span class="idea-priority priority-${escape(idea.priority)}">${escape(PRIORITY[idea.priority] || idea.priority)}</span><span>${escape(STATUS[idea.status] || idea.status)}</span></div>
          <div class="ideas-detail-toolbar" data-idea-actions aria-label="Действия с идеей">
            ${favoriteButtonMarkup("idea",idea.id,favoriteIdeaIds.has(idea.id))}
            <button type="button" class="ideas-icon-action is-danger" data-idea-delete aria-label="Переместить идею в корзину" title="Переместить в корзину"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 7h16M10 11v6M14 11v6M5 7l1 14h12l1-14M9 7V4h6v3"/></svg></button>
            <button type="button" class="ideas-icon-action" data-idea-edit="${escape(idea.id)}" aria-label="Редактировать идею" title="Редактировать идею">
              <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 20h9"/><path d="M16.5 3.5a2.1 2.1 0 0 1 3 3L8 18l-4 1 1-4Z"/></svg>
            </button>
            ${converted ? '<button type="button" class="ideas-icon-action" disabled aria-label="Идея уже преобразована в проект" title="Уже в проекте"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 12h14M13 6l6 6-6 6"/></svg></button>' : archived ? '<button type="button" class="ideas-icon-action" data-idea-restore aria-label="Восстановить идею" title="Восстановить"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 12a9 9 0 1 0 3-6.7L3 8"/><path d="M3 3v5h5"/></svg></button>' : '<button type="button" class="ideas-icon-action" data-idea-convert aria-label="Запустить как проект" title="Запустить как проект"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M5 19c4-1 8-5 10-10 1-2 1-5 1-5s-3 0-5 1C6 7 2 11 1 15l4 4Z"/><path d="m9 15 4-4"/><path d="M5 19v-5l-3-3"/><path d="M5 19h5l3 3"/></svg></button>'}
            ${!converted && !archived ? '<button type="button" class="ideas-icon-action is-danger" data-idea-archive aria-label="Архивировать идею" title="Архивировать"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 4h18v4H3z"/><path d="M5 8v12h14V8"/><path d="M10 12h4"/></svg></button>' : ""}
          </div>
        </header>
        <p class="ideas-detail-description">${escape(idea.description || "Описание пока не добавлено.")}</p>
        <div class="ideas-detail-fields">
          <section><h3>Цель</h3><p>${escape(idea.goal || "Не указана")}</p></section>
          <section><h3>Концепция</h3><p>${escape(idea.concept || "Не указана")}</p></section>
          <section><h3>Модель бизнеса</h3><p>${escape(idea.business_model || "Не указана")}</p></section>
          <section><h3>Дополнительная информация</h3><p>${escape(idea.additional_info || "Нет")}</p></section>
          <section><h3>Предполагаемые затраты</h3><p>${escape(money(idea.estimated_cost))}</p></section>
          <section><h3>Ожидаемая выручка</h3><p>${escape(money(idea.expected_revenue))}</p></section>
        </div>
        ${converted ? '<p class="ideas-converted-note">Эта идея уже преобразована в проект. Повторное создание проекта заблокировано.</p>' : ""}
        <div class="ideas-convert-confirm" data-convert-confirm hidden>
          <p class="ideas-confirm-title">Подтвердите запуск проекта</p>
          <p>Будет создан проект с такими параметрами:</p>
          <dl>
            <div><dt>Название</dt><dd>${escape(idea.name)}</dd></div>
            <div><dt>Приоритет</dt><dd>${escape(PRIORITY[idea.priority] || idea.priority)}</dd></div>
            <div><dt>Оценка затрат</dt><dd>${escape(money(idea.estimated_cost))}</dd></div>
            <div><dt>Ожидаемая выручка</dt><dd>${escape(money(idea.expected_revenue))}</dd></div>
          </dl>
          <p class="ideas-confirm-warning">Идея сохранится в реестре со статусом «Преобразована в проект».</p>
          <p class="ideas-form-error" data-convert-error hidden></p>
          <div class="ideas-detail-actions"><button type="button" class="ideas-secondary" data-convert-cancel>Отмена</button><button type="button" class="ideas-primary" data-convert-confirmed>Подтвердить запуск</button></div>
        </div>
      </article>`;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function showForm(idea = null) {
    workspace.classList.remove("is-detail-view");
    const current = idea || {};
    registry.hidden = true;
    detailHost.hidden = true;
    formHost.hidden = false;
    formHost.innerHTML = `
      ${workspaceScreenHead({title:idea ? "Редактирование идеи" : "Новая идея"})}
      <form class="ideas-form" data-idea-form data-idea-id="${escape(current.id || "")}">
        <label>Название<input name="name" required maxlength="120" value="${escape(current.name)}"></label>
        <label>Описание<textarea name="description" rows="3">${escape(current.description)}</textarea></label>
        <div class="ideas-form-grid">
          <label>Цель<textarea name="goal" rows="2">${escape(current.goal)}</textarea></label>
          <label>Концепция<textarea name="concept" rows="2">${escape(current.concept)}</textarea></label>
        </div>
        <label>Дополнительная информация<textarea name="additional_info" rows="2">${escape(current.additional_info)}</textarea></label>
        <div class="ideas-form-grid">
          <label>Категория<select name="category_id"><option value="">Без категории</option>${categories.map(c=>`<option value="${escape(c.id)}" ${current.category_id===c.id?"selected":""}>${escape(c.name)}</option>`).join("")}</select></label>
          <label>Приоритет<select name="priority">${Object.entries(PRIORITY).map(([k,v])=>`<option value="${k}" ${(current.priority||"normal")===k?"selected":""}>${v}</option>`).join("")}</select></label>
        </div>
        <div class="ideas-form-grid">
          <label>Статус<select name="status">${Object.entries(STATUS).filter(([k])=>(k!=="launched" || current.status==="launched") && (k!=="converted" || current.status==="converted")).map(([k,v])=>`<option value="${k}" ${(current.status||"new")===k?"selected":""}>${v}</option>`).join("")}</select></label>
          <label>Модель бизнеса<input name="business_model" maxlength="500" value="${escape(current.business_model)}"></label>
        </div>
        <div class="ideas-form-grid">
          <label>Оценка затрат<input name="estimated_cost" type="number" min="0" step="0.01" value="${current.estimated_cost ?? ""}"></label>
          <label>Ожидаемая выручка<input name="expected_revenue" type="number" min="0" step="0.01" value="${current.expected_revenue ?? ""}"></label>
        </div>
        <p class="ideas-form-error" data-idea-error hidden></p>
        <div class="ideas-form-actions"><button type="submit" class="ideas-primary">Сохранить</button></div>
      </form>`;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  bindFavoriteToggle(root, ({ type, id, isFavorite }) => {
    if (type !== "idea") return;
    if (isFavorite) favoriteIdeaIds.add(id); else favoriteIdeaIds.delete(id);
    ideasWorkspaceCache.delete(user.id);
    if (currentIdeaId === id) showDetail(ideas.find(item => item.id === id));
    else renderList();
  });

  root.addEventListener("click", async event => {
    const navigation = window.RaymondovichNavigation;
    if (event.target.closest("[data-idea-create]")) {
      navigation?.navigateScreen("idea-form", { ideaId: null });
      return;
    }
    const filterToggle = event.target.closest("[data-ideas-filter-toggle]");
    if (filterToggle) {
      const panel = root.querySelector("[data-ideas-filters]");
      panel.hidden = !panel.hidden;
      filterToggle.setAttribute("aria-expanded", String(!panel.hidden));
      return;
    }
    const open = event.target.closest("[data-idea-open]");
    if (open) {
      navigation?.navigateScreen("idea-detail", { ideaId: open.dataset.ideaOpen });
      return;
    }

    const edit = event.target.closest("[data-idea-edit]");
    if (edit) {
      navigation?.navigateScreen("idea-form", { ideaId: edit.dataset.ideaEdit });
      return;
    }

    if (event.target.closest("[data-idea-convert]")) {
      const panel=detailHost.querySelector("[data-convert-confirm]");
      panel.hidden=false;
      detailHost.querySelector("[data-idea-actions]").hidden=true;
      return;
    }
    if (event.target.closest("[data-convert-cancel]")) {
      detailHost.querySelector("[data-convert-confirm]").hidden=true;
      detailHost.querySelector("[data-idea-actions]").hidden=false;
      return;
    }
    if (event.target.closest("[data-convert-confirmed]")) {
      const button=event.target.closest("[data-convert-confirmed]");
      const errorNode=detailHost.querySelector("[data-convert-error]");
      button.disabled=true;
      try {
        const result=await supabase.rpc("convert_idea_to_project",{p_idea_id:currentIdeaId});
        if (result.error) throw result.error;
        const response=Array.isArray(result.data) ? result.data[0] : result.data;
        if (!response?.project_id) throw new Error("Сервер не вернул созданный проект.");
        await load();
        window.RaymondovichNavigation?.navigateRoute("#authorization/projects");
        window.RaymondovichNavigation?.navigateScreen("project-overview",{projectId:response.project_id});
      } catch(error) {
        errorNode.textContent=error?.message || "Не удалось создать проект.";
        errorNode.hidden=false;
        button.disabled=false;
      }
      return;
    }
    const deleteButton=event.target.closest("[data-idea-delete]");
    if(deleteButton) {
      const idea=ideas.find(item=>item.id===currentIdeaId);
      if(!idea || !window.confirm(`Переместить идею «${idea.name}» в корзину? Архивный статус и история идеи сохранятся.`))return;
      deleteButton.disabled=true;
      const result=await moveIdeaToTrashRecord(idea,user.id);
      if(result.error) {
        window.alert(result.error.message||"Не удалось переместить идею в корзину.");
        deleteButton.disabled=false;
        return;
      }
      ideasWorkspaceCache.delete(user.id);
      await load();
      window.RaymondovichNavigation?.navigateScreen("ideas-registry",{}, {replace:true});
      return;
    }
    const archive=event.target.closest("[data-idea-archive]");
    const restore=event.target.closest("[data-idea-restore]");
    if (archive || restore) {
      const idea=ideas.find(i=>i.id===currentIdeaId);
      if (!idea) return;
      const nextStatus=archive ? "archived" : "new";
      const result=await supabase.from("ideas").update({
        status:nextStatus, archived_at:archive ? new Date().toISOString() : null, updated_at:new Date().toISOString()
      }).eq("id",idea.id).is("deleted_at",null).select("*").single();
      if (result.error) {
        window.alert("Не удалось изменить статус идеи: "+result.error.message);
        return;
      }
      try { await recordActivity(result.data, archive ? "archived" : "restored", {previous_status:idea.status}); }
      catch(error) { window.alert("Статус изменён, но запись истории не сохранилась: "+error.message); }
      await load();
      showDetail(result.data);
    }
  }, listenerOptions);

  root.addEventListener("input", event => {
    if (event.target.matches("[data-ideas-search]")) renderList();
  }, listenerOptions);
  root.addEventListener("change", event => {
    if (event.target.matches("[data-filter-status],[data-filter-priority],[data-filter-category]")) renderList();
  }, listenerOptions);
  root.addEventListener("submit", async event => {
    const form=event.target.closest("[data-idea-form]");
    if (!form) return;
    event.preventDefault();
    const value=Object.fromEntries(new FormData(form).entries());
    const id=form.dataset.ideaId || null;
    const previous=id ? ideas.find(i=>i.id===id) : null;
    const payload={
      name:String(value.name).trim(), description:String(value.description||""), goal:String(value.goal||""),
      concept:String(value.concept||""), additional_info:String(value.additional_info||""),
      category_id:value.category_id||null, priority:value.priority, status:value.status,
      business_model:String(value.business_model||""),
      estimated_cost:value.estimated_cost===""?null:Number(value.estimated_cost),
      expected_revenue:value.expected_revenue===""?null:Number(value.expected_revenue),
      archived_at:value.status==="archived"?(previous?.archived_at||new Date().toISOString()):null,
      updated_at:new Date().toISOString()
    };
    const button=form.querySelector('[type="submit"]');
    const errorNode=form.querySelector("[data-idea-error]");
    button.disabled=true;
    try {
      const result=id
        ? await supabase.from("ideas").update(payload).eq("id",id).is("deleted_at",null).select("*").single()
        : await supabase.from("ideas").insert({...payload,owner_id:user.id}).select("*").single();
      if (result.error) throw result.error;
      const saved=result.data;
      try {
        if (!id) await recordActivity(saved,"created",{name:saved.name});
        else {
          const eventType=previous.status!==saved.status ? (saved.status==="archived"?"archived":previous.status==="archived"?"restored":"status_changed")
            : previous.priority!==saved.priority ? "priority_changed"
            : previous.category_id!==saved.category_id ? "category_changed" : "updated";
          await recordActivity(saved,eventType,{status:saved.status,priority:saved.priority});
        }
      } catch(activityError) {
        window.alert("Идея сохранена, но история изменений не записалась: "+activityError.message);
      }
      await load();
      if (id) {
        window.RaymondovichNavigation?.navigateScreen("idea-detail", { ideaId: saved.id }, { replace: true });
      } else {
        window.RaymondovichNavigation?.back();
      }
    } catch(error) {
      errorNode.textContent=error?.message || "Не удалось сохранить идею.";
      errorNode.hidden=false;
      button.disabled=false;
    }
  }, listenerOptions);

  document.addEventListener("raymondovich:ideas-registry-request", showRegistry, listenerOptions);

  document.addEventListener("raymondovich:navigation", (event) => {
    const state = event.detail;
    if (state?.route !== "#authorization/ideas") {
      controller.abort();
      if (activeIdeasController === controller) activeIdeasController = null;
      return;
    }
    renderNavigationScreen(state);
  }, listenerOptions);

  function renderNavigationScreen(state) {
    const screen = state?.screen || "ideas-registry";
    if (screen === "idea-detail") {
      showDetail(ideas.find(item => item.id === state.data?.ideaId));
    } else if (screen === "idea-form") {
      showForm(state.data?.ideaId ? ideas.find(item => item.id === state.data.ideaId) : null);
    } else {
      showRegistry();
    }
  }

  if (cachedWorkspace) {
    const categoryFilter = root.querySelector("[data-filter-category]");
    categoryFilter.innerHTML = '<option value="">Все категории</option>' + categories.map(c=>`<option value="${escape(c.id)}">${escape(c.name)}</option>`).join("");
    renderList();
  }

  const navigation = window.RaymondovichNavigation;
  const state = navigation?.getState();
  if (!state || state.route !== "#authorization/ideas" || state.screen === "route") {
    navigation?.navigateScreen("ideas-registry", {}, { replace: true });
  } else {
    renderNavigationScreen(state);
  }
  await load();
  const latestState = navigation?.getState();
  if (latestState?.route === "#authorization/ideas") renderNavigationScreen(latestState);
}
