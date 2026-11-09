import { getProjectServices } from "/source/application/services/project-services.js";

const escape = value => String(value ?? "").replace(/[&<>"']/g, char => ({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));

export async function renderProjectServicesScreen(host, project) {
  const result = await getProjectServices(project.id);
  const services = result.services;
  const resources = result.resources;
  host.innerHTML = `
    ${result.error?'<div class="projects-state projects-error"><strong>Не удалось загрузить связи сервисов</strong><p>Проверьте права доступа к реестру сервисов.</p></div>':""}
    <section class="projects-module-section"><h2>Подключённые сервисы</h2>
      ${services.length?services.map(item=>`<article class="projects-data-row"><div><strong>${escape(item.ecosystem_tools?.name||"Сервис без названия")}</strong><span>${escape(item.purpose||item.relationship_type||"Назначение не указано")}</span></div><span class="projects-status status-${escape(item.status)}">${escape(item.status==="active"?"Активен":item.status==="paused"?"Приостановлен":item.status==="planned"?"Запланирован":"Требует проверки")}</span></article>`).join(""):'<div class="projects-state"><strong>Сервисы пока не подключены</strong><p>Список будет пополняться по мере регистрации сервисов в общем каталоге.</p></div>'}
    </section>
    <section class="projects-module-section"><h2>Ресурсы и инфраструктура</h2>
      ${resources.length?resources.map(item=>`<article class="projects-data-row"><div><strong>${escape(item.tool_resources?.name||"Ресурс")}</strong><span>${escape(item.role||item.tool_resources?.resource_type||"Тип не указан")}${item.tool_resources?.environment?" · "+escape(item.tool_resources.environment):""}</span></div><span class="projects-status">${escape(item.status)}</span></article>`).join(""):'<div class="projects-state"><strong>Ресурсы не привязаны</strong><p>Домены, базы данных, репозитории и другие ресурсы будут отображаться здесь.</p></div>'}
    </section>`;
}
