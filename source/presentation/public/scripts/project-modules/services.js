import { getProjectServices, createProjectService } from "/source/application/services/project-services.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
let activeController = null;

export async function renderProjectServicesScreen(host, project, user) {
  activeController?.abort();
  const controller = new AbortController();
  activeController = controller;
  const options = { signal: controller.signal };
  const result = await getProjectServices(project.id);
  if (controller.signal.aborted) return;
  const services = result.services;
  const resources = result.resources;
  host.innerHTML = `
    <div class="projects-service-toolbar"><div><h2>Подключённые сервисы</h2><p>Реестр сервисов, используемых в проекте.</p></div><button type="button" class="projects-primary" data-service-add>＋ Добавить сервис</button></div>
    <form class="projects-form projects-service-form" data-project-service-form hidden>
      <label>Название сервиса<input name="name" required maxlength="120" placeholder="Например, Supabase"></label>
      <div class="projects-form-grid">
        <label>Категория<select name="category">
          <option value="ai">AI / ИИ</option><option value="development">Разработка</option><option value="domains_dns">Домены и DNS</option><option value="database">База данных</option><option value="hosting">Хостинг</option><option value="analytics">Аналитика</option><option value="payments">Платежи</option><option value="communication">Коммуникации</option><option value="other">Другое</option>
        </select></label>
        <label>Тип подключения<select name="relationship_type">
          <option value="manual_use">Ручное использование</option><option value="technical_integration">Техническая интеграция</option><option value="infrastructure_dependency">Инфраструктурная зависимость</option><option value="other">Другое</option>
        </select></label>
      </div>
      <label>Официальный сайт<input name="official_url" type="url" inputmode="url" placeholder="https://example.com"></label>
      <label>Для чего используется в проекте<textarea name="purpose" rows="2" maxlength="1000" placeholder="Назначение сервиса"></textarea></label>
      <p class="projects-form-error" data-service-error hidden></p>
      <div class="projects-form-actions"><button type="button" class="projects-secondary" data-service-cancel>Отмена</button><button type="submit" class="projects-primary">Подключить</button></div>
      <p class="projects-service-security-note">Не вводите сюда пароли, API-ключи или другие секреты. Здесь хранятся только сведения о сервисе и его назначении.</p>
    </form>
    ${result.error?'<div class="projects-state projects-error"><strong>Не удалось загрузить связи сервисов</strong><p>Проверьте права доступа к реестру сервисов.</p></div>':""}
    <section class="projects-module-section">
      ${services.length?services.map(item=>`<article class="projects-data-row"><div><strong>${escape(item.ecosystem_tools?.name||"Сервис без названия")}</strong><span>${escape(item.purpose||item.relationship_type||"Назначение не указано")}${item.ecosystem_tools?.official_url?' · <a href="'+escape(item.ecosystem_tools.official_url)+'" target="_blank" rel="noopener noreferrer">Официальный сайт ↗</a>':""}</span></div><span class="projects-status status-${escape(item.status)}">${escape(item.status==="active"?"Активен":item.status==="paused"?"Приостановлен":item.status==="planned"?"Запланирован":"Требует проверки")}</span></article>`).join(""):'<div class="projects-state"><strong>Сервисы пока не подключены</strong><p>Добавьте Supabase, Cloudflare, OpenAI, Claude, Reg.ru и другие инструменты, которые используются в проекте.</p></div>'}
    </section>
    <section class="projects-module-section"><h2>Ресурсы и инфраструктура</h2>
      ${resources.length?resources.map(item=>`<article class="projects-data-row"><div><strong>${escape(item.tool_resources?.name||"Ресурс")}</strong><span>${escape(item.role||item.tool_resources?.resource_type||"Тип не указан")}${item.tool_resources?.environment?" · "+escape(item.tool_resources.environment):""}</span></div><span class="projects-status">${escape(item.status)}</span></article>`).join(""):'<div class="projects-state"><strong>Ресурсы не привязаны</strong><p>Домены, базы данных, репозитории и другие ресурсы будут отображаться здесь.</p></div>'}
    </section>`;

  host.addEventListener("click",event=>{
    if(event.target.closest("[data-service-add]")){
      host.querySelector("[data-project-service-form]").hidden=false;
      host.querySelector("[data-service-add]").hidden=true;
      host.querySelector('[name="name"]')?.focus();
    }
    if(event.target.closest("[data-service-cancel]")){
      host.querySelector("[data-project-service-form]").hidden=true;
      host.querySelector("[data-service-add]").hidden=false;
    }
  },options);

  host.addEventListener("submit",async event=>{
    const form=event.target.closest("[data-project-service-form]");
    if(!form)return;
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form).entries());
    const button=form.querySelector('[type="submit"]');
    const errorNode=form.querySelector("[data-service-error]");
    button.disabled=true;
    try{
      await createProjectService(user.id,project.id,values);
      await renderProjectServicesScreen(host,project,user);
    }catch(error){
      errorNode.textContent=error?.message||"Не удалось подключить сервис.";
      errorNode.hidden=false;
      button.disabled=false;
    }
  },options);
}
