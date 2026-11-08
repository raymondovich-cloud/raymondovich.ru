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
  root.innerHTML = `
    <section class="ideas-workspace" aria-labelledby="ideas-title">
      <header class="ideas-header">
        <button class="ideas-back" type="button" data-ideas-back>← Центр управления</button>
        <p class="overline">RAYMONDOVICH / OWNER CONTROL CENTER</p>
        <h1 id="ideas-title">Идеи</h1>
        <p class="ideas-subtitle">Реестр идей экосистемы</p>
      </header>
      <div class="ideas-toolbar">
        <input class="ideas-search" type="search" placeholder="Поиск идей" aria-label="Поиск идей" data-ideas-search>
        <button class="ideas-primary" type="button" data-idea-create>＋ Новая идея</button>
      </div>
      <div class="ideas-filters">
        <select aria-label="Фильтр по статусу" data-filter-status><option value="">Все статусы</option>
          ${Object.entries(STATUS).map(([key,label])=>`<option value="${key}">${label}</option>`).join("")}
        </select>
        <select aria-label="Фильтр по приоритету" data-filter-priority><option value="">Все приоритеты</option>
          ${Object.entries(PRIORITY).map(([key,label])=>`<option value="${key}">${label}</option>`).join("")}
        </select>
        <select aria-label="Фильтр по категории" data-filter-category><option value="">Все категории</option></select>
      </div>
      <div class="ideas-form-host" data-ideas-form hidden></div>
      <div class="ideas-list" data-ideas-list aria-live="polite"><p class="ideas-loading">Загрузка идей…</p></div>
      <footer class="ideas-footer"><span data-ideas-count>—</span><span>ДОСТУП ВЛАДЕЛЬЦА</span></footer>
    </section>`;

  const list = root.querySelector("[data-ideas-list]");
  const formHost = root.querySelector("[data-ideas-form]");
  let ideas = [];
  let categories = [];

  const escape = (value) => String(value ?? "").replace(/[&<>"']/g, c => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"
  })[c]);

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
    root.querySelector("[data-ideas-count]").textContent = `ПОКАЗАНО ${filtered.length} ИЗ ${ideas.length}`;
    if (!filtered.length) {
      list.innerHTML = '<div class="ideas-empty"><strong>Идей не найдено</strong><span>Создайте новую идею или измените фильтры.</span></div>';
      return;
    }
    list.innerHTML = filtered.map(idea => {
      const categoryName = categories.find(c=>c.id===idea.category_id)?.name || "Без категории";
      return `<article class="idea-item">
        <div class="idea-item-top"><span class="idea-category">${escape(categoryName)}</span><span class="idea-priority priority-${escape(idea.priority)}">${escape(PRIORITY[idea.priority] || idea.priority)}</span></div>
        <h2>${escape(idea.name)}</h2>
        <p>${escape(idea.description || idea.goal || "Описание пока не добавлено.")}</p>
        <div class="idea-item-bottom"><span>${escape(STATUS[idea.status] || idea.status)}</span><button type="button" data-idea-edit="${escape(idea.id)}">Открыть ↗</button></div>
      </article>`;
    }).join("");
  }

  function showForm(idea = null) {
    const current = idea || {};
    formHost.hidden = false;
    formHost.innerHTML = `
      <form class="ideas-form" data-idea-form>
        <div class="ideas-form-heading"><h2>${idea ? "Редактирование идеи" : "Новая идея"}</h2><button type="button" data-idea-cancel aria-label="Закрыть">×</button></div>
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
          <label>Статус<select name="status">${Object.entries(STATUS).filter(([k])=>k!=="launched" && (k!=="converted" || current.status==="converted")).map(([k,v])=>`<option value="${k}" ${(current.status||"new")===k?"selected":""}>${v}</option>`).join("")}</select></label>
          <label>Модель бизнеса<input name="business_model" maxlength="500" value="${escape(current.business_model)}"></label>
        </div>
        <div class="ideas-form-grid">
          <label>Оценка затрат<input name="estimated_cost" type="number" min="0" step="0.01" value="${current.estimated_cost ?? ""}"></label>
          <label>Ожидаемая выручка<input name="expected_revenue" type="number" min="0" step="0.01" value="${current.expected_revenue ?? ""}"></label>
        </div>
        <p class="ideas-form-error" data-idea-error hidden></p>
        <div class="ideas-form-actions"><button type="button" class="ideas-secondary" data-idea-cancel>Отмена</button><button type="submit" class="ideas-primary">Сохранить</button></div>
      </form>`;
  }

  root.addEventListener("click", async event => {
    if (event.target.closest("[data-ideas-back]")) { onBack(); return; }
    if (event.target.closest("[data-idea-create]")) { showForm(); formHost.scrollIntoView({behavior:"smooth",block:"start"}); return; }
    if (event.target.closest("[data-idea-cancel]")) { formHost.hidden = true; return; }
    const edit = event.target.closest("[data-idea-edit]");
    if (edit) { showForm(ideas.find(i=>i.id===edit.dataset.ideaEdit)); formHost.scrollIntoView({behavior:"smooth",block:"start"}); }
  });

  root.addEventListener("input", event => {
    if (event.target.matches("[data-ideas-search]")) renderList();
  });
  root.addEventListener("change", event => {
    if (event.target.matches("[data-filter-status],[data-filter-priority],[data-filter-category]")) renderList();
  });
  root.addEventListener("submit", async event => {
    const form = event.target.closest("[data-idea-form]");
    if (!form) return;
    event.preventDefault();
    const data = new FormData(form);
    const value = Object.fromEntries(data.entries());
    const id = form.dataset.ideaId || null;
    const payload = {
      name: String(value.name).trim(),
      description: String(value.description || ""),
      goal: String(value.goal || ""),
      concept: String(value.concept || ""),
      additional_info: String(value.additional_info || ""),
      category_id: value.category_id || null,
      priority: value.priority,
      status: value.status,
      business_model: String(value.business_model || ""),
      estimated_cost: value.estimated_cost === "" ? null : Number(value.estimated_cost),
      expected_revenue: value.expected_revenue === "" ? null : Number(value.expected_revenue),
      updated_at: new Date().toISOString()
    };
    const button = form.querySelector('[type="submit"]');
    button.disabled = true;
    const errorNode = form.querySelector("[data-idea-error]");
    try {
      let saved;
      if (id) {
        const previous = ideas.find(i=>i.id===id);
        const result = await supabase.from("ideas").update(payload).eq("id",id).select("*").single();
        if (result.error) throw result.error;
        saved = result.data;
        const eventType = previous.status !== saved.status ? "status_changed" : previous.priority !== saved.priority ? "priority_changed" : previous.category_id !== saved.category_id ? "category_changed" : "updated";
        await supabase.from("idea_activity").insert({idea_id:id,owner_id:user.id,actor_id:user.id,event_type:eventType,details:{status:saved.status,priority:saved.priority}});
      } else {
        const result = await supabase.from("ideas").insert({...payload,owner_id:user.id}).select("*").single();
        if (result.error) throw result.error;
        saved = result.data;
        await supabase.from("idea_activity").insert({idea_id:saved.id,owner_id:user.id,actor_id:user.id,event_type:"created",details:{name:saved.name}});
      }
      formHost.hidden = true;
      await load();
    } catch (error) {
      errorNode.textContent = error?.message || "Не удалось сохранить идею.";
      errorNode.hidden = false;
      button.disabled = false;
    }
  });

  await load();
}
