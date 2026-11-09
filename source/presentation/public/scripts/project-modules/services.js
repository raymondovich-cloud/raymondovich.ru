import { getProjectServices, createProjectService } from "/source/application/services/project-services.js";
import { getProjectResources, createProjectResource } from "/source/application/resources/project-resources.js";

const esc=value=>String(value??"").replace(/[&<>"']/g,char=>({"&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#39;"}[char]));
const resourceTypes={repository:"Репозиторий",domain:"Домен",database:"База данных",server:"Сервер",api:"API",deployment:"Развёртывание",dns_zone:"DNS",supabase_project:"Проект Supabase",other:"Ресурс"};
const statusLabels={active:"Активен",testing:"Тестирование",paused:"Приостановлен",retired:"Выведен",unknown:"Неизвестен",needs_verification:"Требует проверки",planned:"Запланирован"};
const categoryLabels={ai:"AI / ИИ",development:"Разработка",domains_dns:"Домены и DNS",database:"База данных",hosting:"Хостинг",analytics:"Аналитика",payments:"Платежи",communication:"Коммуникации",other:"Другое"};
let activeController=null;

const money=value=>new Intl.NumberFormat("ru-RU",{style:"currency",currency:"RUB",maximumFractionDigits:0}).format(Number(value)||0);
const paymentDate=value=>{
  if(!value)return "Без даты оплаты";
  const due=new Date(value+"T12:00:00");
  const today=new Date();today.setHours(12,0,0,0);
  const days=Math.round((due-today)/86400000);
  if(days===0)return "сегодня";
  if(days===1)return "завтра";
  if(days>1)return "через "+days+" дн.";
  if(days===-1)return "просрочен на 1 дн.";
  return "просрочен на "+Math.abs(days)+" дн.";
};
const priceLabel=row=>Number(row.monthly_cost)>0?money(row.monthly_cost):"Бесплатно";
const paymentMeta=row=>Number(row.monthly_cost)>0?paymentDate(row.next_payment_date):"Без оплаты";

function serviceCard(row){
  const tool=row.ecosystem_tools||{};
  return `<article class="projects-service-item">
    <span class="projects-service-item-icon" aria-hidden="true">${esc((tool.name||"S").slice(0,1).toUpperCase())}</span>
    <div class="projects-service-item-main"><strong>${esc(tool.name||"Сервис без названия")}</strong><span>${esc(row.purpose||categoryLabels[tool.category]||"Назначение не указано")}</span></div>
    <div class="projects-service-item-finance"><strong>${priceLabel(row)}</strong><span>${paymentMeta(row)}</span></div>
  </article>`;
}
function resourceCard(row){
  const resource=row.tool_resources||{},provider=resource.ecosystem_tools||{};
  const meta=[resourceTypes[resource.resource_type]||resource.resource_type,provider.name,resource.environment].filter(Boolean).join(" · ");
  return `<article class="projects-service-item">
    <span class="projects-service-item-icon" aria-hidden="true">${esc((resource.resource_type==="domain"?"◎":resource.resource_type==="database"?"▤":resource.resource_type==="dns_zone"?"⌘":"↗"))}</span>
    <div class="projects-service-item-main"><strong>${esc(resource.name||"Ресурс")}</strong><span>${esc(meta)}${resource.resource_url?' · <a href="'+esc(resource.resource_url)+'" target="_blank" rel="noopener noreferrer">Открыть ↗</a>':""}</span>${row.role?'<span>'+esc(row.role)+'</span>':""}</div>
    <div class="projects-service-item-finance"><strong>${priceLabel(row)}</strong><span>${paymentMeta(row)}</span></div>
  </article>`;
}
function summaryCard(title,total,count,accent){
  return `<article class="projects-service-summary ${accent?"is-accent":""}"><span>${title}</span><strong>${money(total)}</strong><small>в месяц · ${count} ${count===1?"ресурс":count>1&&count<5?"ресурса":"ресурсов"}</small></article>`;
}
function showForm(host,kind,visible){
  const form=host.querySelector(`[data-${kind}-form]`);
  const trigger=host.querySelector(`[data-${kind}-add]`);
  if(form)form.hidden=!visible;
  if(trigger)trigger.hidden=visible;
}

export async function renderProjectServicesScreen(host,project,user){
  activeController?.abort();
  const controller=new AbortController();activeController=controller;
  const opts={signal:controller.signal};
  host.innerHTML='<div class="projects-loading">Загрузка связей проекта…</div>';
  const [data,resourcesResult]=await Promise.all([
    getProjectServices(project.id),
    getProjectResources(project.id).then(resources=>({resources})).catch(error=>({error,resources:[]}))
  ]);
  if(controller.signal.aborted)return;
  const services=data.services||[],resources=resourcesResult.resources||[];
  const criticalServices=services.filter(x=>x.dependency_level==="critical");
  const optionalServices=services.filter(x=>x.dependency_level!=="critical");
  const criticalResources=resources.filter(x=>x.dependency_level==="critical");
  const optionalResources=resources.filter(x=>x.dependency_level!=="critical");
  const infraCost=[...criticalServices,...criticalResources].reduce((sum,x)=>sum+Number(x.monthly_cost||0),0);
  const servicesCost=[...optionalServices,...optionalResources].reduce((sum,x)=>sum+Number(x.monthly_cost||0),0);
  const infraCount=criticalServices.length+criticalResources.length;
  const optionalCount=optionalServices.length+optionalResources.length;
  const providers=[...new Map(services.map(x=>[x.tool_id,{id:x.tool_id,name:x.ecosystem_tools?.name||"Сервис"}])).values()];

  host.innerHTML=`
    <header class="projects-services-heading"><p class="projects-eyebrow">PROJECT / SERVICES</p><h1>Связи проекта</h1><p>Внешняя инфраструктура и инструменты, от которых зависит работа проекта.</p></header>
    <div class="projects-service-summary-grid">${summaryCard("Инфраструктура",infraCost,infraCount,true)}${summaryCard("Сервисы",servicesCost,optionalCount,false)}</div>

    <section class="projects-service-group">
      <header class="projects-service-group-heading"><div class="projects-service-group-symbol is-critical" aria-hidden="true">⚓</div><div><h2>Инфраструктура</h2><p>Без этого проект не работает</p></div><button class="projects-primary projects-service-add" type="button" data-resource-add>＋</button></header>
      <form class="projects-form projects-service-form" data-resource-form hidden>
        <label>Название ресурса<input name="name" required maxlength="160" placeholder="Например, raymondovich.ru"></label>
        <div class="projects-form-grid"><label>Тип ресурса<select name="resource_type"><option value="domain">Домен</option><option value="database">База данных</option><option value="dns_zone">DNS и защита</option><option value="server">Сервер</option><option value="repository">Репозиторий</option><option value="deployment">Развёртывание</option><option value="api">API</option><option value="supabase_project">Проект Supabase</option><option value="other">Другое</option></select></label>
        <label>Провайдер<select name="tool_id" required><option value="">Выберите сервис</option>${providers.map(x=>`<option value="${esc(x.id)}">${esc(x.name)}</option>`).join("")}</select></label></div>
        <label>Адрес ресурса<input name="resource_url" type="url" placeholder="https://example.com"></label>
        <div class="projects-form-grid"><label>Окружение<select name="environment"><option value="">Не указано</option><option value="production">Production</option><option value="staging">Staging</option><option value="development">Development</option></select></label><label>Ежемесячные расходы, ₽<input name="monthly_cost" type="number" min="0" step="0.01" value="0" inputmode="decimal"></label></div>
        <label>Следующая дата оплаты<input name="next_payment_date" type="date"></label>
        <label>Назначение в проекте<input name="role" maxlength="500" placeholder="Основной публичный сайт"></label>
        <label>Описание<textarea name="description" rows="2" maxlength="2000"></textarea></label>
        <p class="projects-form-error" data-resource-error hidden></p><div class="projects-form-actions"><button type="button" class="projects-secondary" data-resource-cancel>Отмена</button><button type="submit" class="projects-primary">Сохранить ресурс</button></div>
      </form>
      <div class="projects-service-list">${[...criticalResources.map(resourceCard),...criticalServices.map(serviceCard)].join("")||'<div class="projects-state"><strong>Инфраструктура пока не добавлена</strong><p>Добавьте домен, базу данных, DNS, сервер или другую критическую зависимость.</p></div>'}</div>
    </section>

    <section class="projects-service-group">
      <header class="projects-service-group-heading"><div class="projects-service-group-symbol" aria-hidden="true">⌁</div><div><h2>Подключённые сервисы</h2><p>Можно отключить, проект продолжит работать</p></div><button class="projects-primary projects-service-add" type="button" data-service-add>＋</button></header>
      <form class="projects-form projects-service-form" data-service-form hidden>
        <label>Название сервиса<input name="name" required maxlength="120" placeholder="Например, ChatGPT"></label>
        <div class="projects-form-grid"><label>Категория<select name="category">${Object.entries(categoryLabels).map(([key,label])=>`<option value="${key}">${label}</option>`).join("")}</select></label><label>Зависимость<select name="dependency_level"><option value="optional">Дополнительный сервис</option><option value="critical">Критически важен для проекта</option></select></label></div>
        <label>Официальный сайт<input name="official_url" type="url" placeholder="https://example.com"></label>
        <label>Назначение<textarea name="purpose" rows="2" maxlength="1000" placeholder="Разработка и код"></textarea></label>
        <div class="projects-form-grid"><label>Ежемесячные расходы, ₽<input name="monthly_cost" type="number" min="0" step="0.01" value="0" inputmode="decimal"></label><label>Следующая дата оплаты<input name="next_payment_date" type="date"></label></div>
        <p class="projects-form-error" data-service-error hidden></p><div class="projects-form-actions"><button type="button" class="projects-secondary" data-service-cancel>Отмена</button><button type="submit" class="projects-primary">Подключить</button></div>
        <p class="projects-service-security-note">Не вводите сюда пароли, API-ключи или другие секреты.</p>
      </form>
      <div class="projects-service-list">${[...optionalServices.map(serviceCard),...optionalResources.map(resourceCard)].join("")||'<div class="projects-state"><strong>Дополнительные сервисы не подключены</strong><p>Добавьте инструменты разработки, аналитики, маркетинга и автоматизации.</p></div>'}</div>
    </section>
    ${resourcesResult.error?'<div class="projects-state projects-error"><strong>Не удалось загрузить часть ресурсов</strong><p>Проверьте подключение и права доступа.</p></div>':""}
  `;

  host.addEventListener("click",event=>{
    if(event.target.closest("[data-service-add]"))showForm(host,"service",true);
    if(event.target.closest("[data-service-cancel]"))showForm(host,"service",false);
    if(event.target.closest("[data-resource-add]"))showForm(host,"resource",true);
    if(event.target.closest("[data-resource-cancel]"))showForm(host,"resource",false);
  },opts);
  host.addEventListener("submit",async event=>{
    const serviceForm=event.target.closest("[data-service-form]");
    const resourceForm=event.target.closest("[data-resource-form]");
    const form=serviceForm||resourceForm;if(!form)return;
    event.preventDefault();
    const values=Object.fromEntries(new FormData(form).entries());
    const button=form.querySelector('[type="submit"]');
    const error=form.querySelector(serviceForm?"[data-service-error]":"[data-resource-error]");
    button.disabled=true;error.hidden=true;
    try{
      if(serviceForm)await createProjectService(user.id,project.id,values);
      else await createProjectResource(user.id,project.id,values);
      await renderProjectServicesScreen(host,project,user);
    }catch(reason){
      error.textContent=reason?.message||"Не удалось сохранить запись.";
      error.hidden=false;button.disabled=false;
    }
  },opts);
}
