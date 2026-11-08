import { supabase } from "/source/infrastructure/supabase/client.js";

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

export async function renderIdeasWorkspace(root, user, onBack) {
  root._ideasController?.abort();
  const controller = new AbortController();
  root._ideasController = controller;
  const listenerOptions = { signal: controller.signal };
  root.innerHTML = `
    <section class="ideas-workspace" aria-labelledby="ideas-title">
      <header class="ideas-header">
        <button class="ideas-back" type="button" data-ideas-back>← Центр управления</button>
        <p class="overline">RAYMONDOVICH / OWNER CONTROL CENTER</p>
        <h1 id="ideas-title">Идеи</h1>
        <p class="ideas-subtitle">Реестр идей экосистемы</p>
      </header>

      <section class="ideas-registry" data-ideas-registry>
        <div class="ideas-toolbar">
          <input class="ideas-search" type="search" placeholder="Поиск идей" aria-label="Поиск идей" data-ideas-search>
          <button class="ideas-filter-toggle" type="button" data-ideas-filter-toggle aria-label="Настройки фильтрации" aria-expanded="false" aria-controls="ideas-filter-panel">
            <svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 6h16M4 12h16M4 18h16"/></svg>
          </button>
        </div>
        <div class="ideas-filters" id="ideas-filter-panel" data-ideas-filters hidden>
          <label>Статус
            <select aria-label="Фильтр по статусу" data-filter-status><option value="">Все статусы</option>
              ${Object.entries(STATUS).map(([key,label])=>`<option value="${key}">${label}</option>`).join("")}
            </select>
          </label>
          <label>Приоритет
            <select aria-label="Фильтр по приоритету" data-filter-priority><option value="">Все приоритеты</option>
              ${Object.entries(PRIORITY).map(([key,label])=>`<option value="${key}">${label}</option>`).join("")}
            </select>
          </label>
          <label>Категория
            <select aria-label="Фильтр по категории" data-filter-category><option value="">Все категории</option></select>
          </label>
        </div>
        <button class="ideas-create-row" type="button" data-idea-create>
          <span>Записать новую идею</span><span class="ideas-create-icon" aria-hidden="true">＋</span>
        </button>
        <div class="ideas-list" data-ideas-list aria-live="polite"><p class="ideas-loading">Загрузка идей…</p></div>
        <footer class="ideas-footer"><span data-ideas-count>—</span><span>ДОСТУП ВЛАДЕЛЬЦА</span></footer>
      </section>

      <section class="ideas-detail-host" data-ideas-detail hidden aria-live="polite"></section>
      <div class="ideas-form-host" data-ideas-form hidden></div>
    </section>`;

  const registry = root.querySelector("[data-ideas-registry]");
  const list = root.querySelector("[data-ideas-list]");
  const detailHost = root.querySelector("[data-ideas-detail]");
  const formHost = root.querySelector("[data-ideas-form]");
  let ideas = [];
  let categories = [];
  let currentIdeaId = null;

  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);
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
    list.innerHTML = '<p class="ideas-loading">Загрузка идей…</p>';
    const [ideaResult, categoryResult] = await Promise.all([
      supabase.from("ideas").select("*").order("updated_at", { ascending: false }),
      supabase.from("idea_categories").select("id,name").eq("is_archived", false).order("sort_order").order("name")
    ]);
    if (ideaResult.error) {
      list.innerHTML = '<p class="ideas-error">Не удалось загрузить идеи. Проверьте подключение и права доступа.</p>';
      return;
    }
    ideas = ideaResult.data || [];
    categories = categoryResult.error ? [] : (categoryResult.data || []);
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
    const filtered = ideas.filter(idea =>
      (!query || [idea.name,idea.description,idea.goal,idea.concept,idea.additional_info].some(v=>String(v||"").toLowerCase().includes(query))) &&
      (!status || idea.status === status) &&
      (!priority || idea.priority === priority) &&
      (!category || idea.category_id === category)
    );
    root.querySelector("[data-ideas-count]").textContent = `НАЙДЕНО ИДЕЙ: ${filtered.length}`;
    if (!filtered.length) {
      list.innerHTML = `<div class="ideas-empty"><strong>${ideas.length ? "Идей по этим условиям нет" : "Идей пока нет"}</strong><span>${ideas.length ? "Измените параметры поиска или фильтрации." : "Запишите первую идею."}</span></div>`;
      return;
    }
    list.innerHTML = filtered.map(idea => {
      const categoryName = categories.find(c=>c.id===idea.category_id)?.name || "Без категории";
      return `<button class="idea-card" type="button" data-idea-open="${escape(idea.id)}">
        <span class="idea-card-top"><span class="idea-category">${escape(categoryName)}</span><span class="idea-priority priority-${escape(idea.priority)}">${escape(PRIORITY[idea.priority] || idea.priority)}</span></span>
        <span class="idea-card-title">${escape(idea.name)}</span>
        <span class="idea-card-description">${escape(idea.description || idea.goal || "Описание пока не добавлено.")}</span>
        <span class="idea-card-bottom"><span>${escape(STATUS[idea.status] || idea.status)}</span><span class="idea-card-arrow" aria-hidden="true">↗</span></span>
      </button>`;
    }).join("");
  }

  function showRegistry() {
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
    registry.hidden = true;
    formHost.hidden = true;
    detailHost.hidden = false;
    const categoryName = categories.find(c=>c.id===idea.category_id)?.name || "Без категории";
    const archived = isArchived(idea);
    const converted = idea.status === "converted";
    detailHost.innerHTML = `
      <div class="ideas-detail-top"><button class="ideas-back" type="button" data-idea-close>← К реестру идей</button><span class="ideas-detail-code">IDEA / ${escape(idea.id.slice(0,8).toUpperCase())}</span></div>
      <article class="ideas-detail">
        <div class="ideas-detail-meta"><span>${escape(categoryName)}</span><span class="idea-priority priority-${escape(idea.priority)}">${escape(PRIORITY[idea.priority] || idea.priority)}</span><span>${escape(STATUS[idea.status] || idea.status)}</span></div>
        <h2>${escape(idea.name)}</h2>
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
        <div class="ideas-detail-actions" data-idea-actions>
          <button type="button" class="ideas-primary" data-idea-edit="${escape(idea.id)}">Редактировать идею</button>
          ${converted ? '<button type="button" class="ideas-secondary" disabled>Уже в проекте</button>' : archived ? '<button type="button" class="ideas-secondary" data-idea-restore>Восстановить</button>' : '<button type="button" class="ideas-secondary" data-idea-convert>Запустить как проект</button>'}
          ${!converted && !archived ? '<button type="button" class="ideas-danger" data-idea-archive>Архивировать</button>' : ""}
          <button type="button" class="ideas-secondary" data-idea-close>Закрыть</button>
        </div>
      </article>`;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  function showForm(idea = null) {
    const current = idea || {};
    registry.hidden = true;
    detailHost.hidden = true;
    formHost.hidden = false;
    formHost.innerHTML = `
      <form class="ideas-form" data-idea-form data-idea-id="${escape(current.id || "")}">
        <div class="ideas-form-heading"><h2>${idea ? "Редактирование идеи" : "Новая идея"}</h2><button type="button" class="ideas-secondary" data-idea-return>← Назад</button></div>
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
        <div class="ideas-form-actions"><button type="button" class="ideas-secondary" data-idea-return>Отмена</button><button type="submit" class="ideas-primary">Сохранить</button></div>
      </form>`;
    window.scrollTo({top:0,behavior:"smooth"});
  }

  root.addEventListener("click", async event => {
    if (event.target.closest("[data-ideas-back]")) { onBack(); return; }
    if (event.target.closest("[data-idea-create]")) { showForm(); return; }
    const filterToggle = event.target.closest("[data-ideas-filter-toggle]");
    if (filterToggle) {
      const panel = root.querySelector("[data-ideas-filters]");
      panel.hidden = !panel.hidden;
      filterToggle.setAttribute("aria-expanded", String(!panel.hidden));
      return;
    }
    const open = event.target.closest("[data-idea-open]");
    if (open) { showDetail(ideas.find(i=>i.id===open.dataset.ideaOpen)); return; }
    if (event.target.closest("[data-idea-close]")) { showRegistry(); return; }
    if (event.target.closest("[data-idea-return]")) {
      const origin = currentIdeaId ? ideas.find(item => item.id === currentIdeaId) : null;
      if (origin) showDetail(origin); else showRegistry();
      return;
    }

    const edit = event.target.closest("[data-idea-edit]");
    if (edit) { const idea=ideas.find(i=>i.id===edit.dataset.ideaEdit); if (idea) showForm(idea); return; }

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
        const updated=ideas.find(i=>i.id===currentIdeaId);
        showDetail(updated);
      } catch(error) {
        errorNode.textContent=error?.message || "Не удалось создать проект.";
        errorNode.hidden=false;
        button.disabled=false;
      }
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
      }).eq("id",idea.id).select("*").single();
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
        ? await supabase.from("ideas").update(payload).eq("id",id).select("*").single()
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
        showDetail(ideas.find(item=>item.id===saved.id));
      } else showRegistry();
    } catch(error) {
      errorNode.textContent=error?.message || "Не удалось сохранить идею.";
      errorNode.hidden=false;
      button.disabled=false;
    }
  }, listenerOptions);

  await load();
}
