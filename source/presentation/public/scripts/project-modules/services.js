import { getProjectServices, createProjectService, updateProjectService, removeProjectService } from "/source/application/services/project-services.js";
import { createProjectResource, updateProjectResource, removeProjectResource } from "/source/application/resources/project-resources.js";

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
  return `<article class="projects-service-item" data-service-row="service" data-row-id="${esc(row.id)}">
    <span class="projects-service-item-icon" aria-hidden="true">${esc((tool.name||"S").slice(0,1).toUpperCase())}</span>
    <div class="projects-service-item-main"><strong>${esc(tool.name||"Сервис без названия")}</strong><span>${esc(row.purpose||categoryLabels[tool.category]||"Назначение не указано")}</span></div>
    <div class="projects-service-item-finance"><strong>${priceLabel(row)}</strong><span>${paymentMeta(row)}</span></div>
  </article>`;
}
function resourceCard(row){
  const resource=row.tool_resources||{},provider=resource.ecosystem_tools||{};
  const meta=[resourceTypes[resource.resource_type]||resource.resource_type,provider.name,resource.environment].filter(Boolean).join(" · ");
  return `<article class="projects-service-item" data-service-row="resource" data-row-id="${esc(row.id)}">
    <span class="projects-service-item-icon" aria-hidden="true">${esc((resource.resource_type==="domain"?"◎":resource.resource_type==="database"?"▤":resource.resource_type==="dns_zone"?"⌘":"↗"))}</span>
    <div class="projects-service-item-main"><strong>${esc(resource.name||"Ресурс")}</strong><span>${esc(meta)}${resource.resource_url?' · <a href="'+esc(resource.resource_url)+'" target="_blank" rel="noopener noreferrer">Открыть ↗</a>':""}</span>${row.role?'<span>'+esc(row.role)+'</span>':""}</div>
    <div class="projects-service-item-finance"><strong>${priceLabel(row)}</strong><span>${paymentMeta(row)}</span></div>
  </article>`;
}
function summaryCard(title,total,count,accent){
  return `<article class="projects-service-summary ${accent?"is-accent":""}"><span>${title}</span><strong>${money(total)}</strong><small>в месяц · ${count} ${count===1?"ресурс":count>1&&count<5?"ресурса":"ресурсов"}</small></article>`;
}
function fillForm(form,values){for(const [name,value] of Object.entries(values)){const field=form.elements.namedItem(name);if(field&&value!==null&&value!==undefined)field.value=String(value);}}
function showForm(host,kind,visible){
  const form=host.querySelector(`[data-${kind}-form]`);
  const trigger=host.querySelector(`[data-${kind}-add]`);
  if(form)form.hidden=!visible;
  if(trigger)trigger.hidden=visible;
}

export async function renderProjectServicesScreen(host,project,user,category=null,openCreate=false){
  activeController?.abort();
  const controller=new AbortController();activeController=controller;
  const opts={signal:controller.signal};
  let editing=null;
  host.innerHTML='<div class="projects-loading">Загрузка связей проекта…</div>';
  let data;
  try {
    data=await getProjectServices(project.id);
    if(controller.signal.aborted)return;
    if(data.error)throw data.error;
  } catch(error) {
    if(controller.signal.aborted)return;
    const message=String(error?.message||"Не удалось получить данные проекта.");
    host.innerHTML=`<div class="projects-state projects-error"><strong>Не удалось загрузить связи проекта</strong><p>${esc(message)}</p><button type="button" class="projects-secondary" data-services-retry>Повторить загрузку</button></div>`;
    host.querySelector("[data-services-retry]")?.addEventListener("click",()=>renderProjectServicesScreen(host,project,user),{once:true});
    return;
  }
  if(controller.signal.aborted)return;
  const services=data.services||[],resources=data.resources||[];
  const criticalServices=services.filter(x=>x.dependency_level==="critical");
  const optionalServices=services.filter(x=>x.dependency_level!=="critical");
  const criticalResources=resources.filter(x=>x.dependency_level==="critical");
  const optionalResources=resources.filter(x=>x.dependency_level!=="critical");
  const infraCost=[...criticalServices,...criticalResources].reduce((sum,x)=>sum+Number(x.monthly_cost||0),0);
  const servicesCost=[...optionalServices,...optionalResources].reduce((sum,x)=>sum+Number(x.monthly_cost||0),0);
  const infraCount=criticalServices.length+criticalResources.length;
  const optionalCount=optionalServices.length+optionalResources.length;
  const providers=[...new Map([...services.map(x=>[x.tool_id,{id:x.tool_id,name:x.ecosystem_tools?.name||"Сервис"}]),...resources.map(x=>[x.tool_resources?.ecosystem_tools?.id,{id:x.tool_resources?.ecosystem_tools?.id,name:x.tool_resources?.ecosystem_tools?.name||"Провайдер"}])].filter(([id])=>id)).values()];

`
    <header class="projects-services-heading"><h1>Связи проекта</h1><p>Инфраструктура и сервисы, от которых зависит работа проекта.</p></header>
    <div class="projects-service-summary-grid">${summaryCard("Инфраструктура",infraCost,infraCount,true)}${summaryCard("Сервисы",servicesCost,optionalCount,false)}</div>

    <div class="projects-service-group-grid">\n    <section class="projects-service-group" data-service-accordion="infrastructure">
      <header class="projects-service-group-heading"><button type="button" class="projects-service-accordion-trigger" data-accordion-trigger aria-expanded="false"><span class="projects-service-group-title"><strong>Инфраструктура</strong><small>Без этого проект не может работать</small></span><span class="projects-service-chevron" aria-hidden="true">↗</span></button><button class="projects-service-add" type="button" data-resource-add aria-label="Добавить ресурс">＋</button></header>
      <div class="projects-service-accordion-panel" data-accordion-panel hidden>
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
      </div>
    </section>

    <section class="projects-service-group" data-service-accordion="services">
      <header class="projects-service-group-heading"><button type="button" class="projects-service-accordion-trigger" data-accordion-trigger aria-expanded="false"><span class="projects-service-group-title"><strong>Подключённые сервисы</strong><small>Инструменты для работы и развития проекта</small></span><span class="projects-service-chevron" aria-hidden="true">↗</span></button><button class="projects-service-add" type="button" data-service-add aria-label="Добавить сервис">＋</button></header>
      <div class="projects-service-accordion-panel" data-accordion-panel hidden>
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
      </div>
    </section>
    </div>\n    
  `;

  let menuTarget=null,longPressTimer=null;
  const closeActionMenu=()=>{host.querySelector("[data-service-action-menu]")?.remove();menuTarget=null;};
  const openActionMenu=(rowEl,x,y)=>{
    const type=rowEl.dataset.serviceRow,id=rowEl.dataset.rowId;
    if(!type||!id)return;
    closeActionMenu();menuTarget={type,id};
    const menu=document.createElement("div");menu.className="projects-service-action-menu";menu.dataset.serviceActionMenu="";
    menu.setAttribute("role","menu");
    menu.innerHTML='<button type="button" role="menuitem" data-menu-action="edit">Изменить</button><button type="button" role="menuitem" data-menu-action="delete">Удалить</button>';
    host.append(menu);
    const width=menu.offsetWidth,height=menu.offsetHeight;
    menu.style.left=Math.max(8,Math.min(x,window.innerWidth-width-8))+"px";
    menu.style.top=Math.max(8,Math.min(y,window.innerHeight-height-8))+"px";
  };
  host.addEventListener("pointerdown",event=>{
    const row=event.target.closest("[data-service-row]");
    if(!row||event.target.closest("a"))return;
    longPressTimer=setTimeout(()=>openActionMenu(row,event.clientX,event.clientY),520);
  },opts);
  ["pointerup","pointercancel","pointerleave","scroll"].forEach(type=>host.addEventListener(type,()=>clearTimeout(longPressTimer),opts));
  host.addEventListener("contextmenu",event=>{
    const row=event.target.closest("[data-service-row]");
    if(!row)return;
    event.preventDefault();openActionMenu(row,event.clientX,event.clientY);
  },opts);
  host.addEventListener("click",async event=>{
    const menuAction=event.target.closest("[data-menu-action]");
    if(menuAction&&menuTarget){
      const target=menuTarget;closeActionMenu();
      if(target.type==="service"){
        const row=services.find(x=>x.id===target.id);if(!row)return;
        if(menuAction.dataset.menuAction==="edit"){
          editing={kind:"service",row};const form=host.querySelector("[data-service-form]");
          host.querySelector('[data-service-accordion="services"] [data-accordion-panel]').hidden=false;
          host.querySelector('[data-service-accordion="services"] [data-accordion-trigger]').setAttribute("aria-expanded","true");
          form.hidden=false;host.querySelector("[data-service-add]").hidden=true;
          fillForm(form,{name:row.ecosystem_tools?.name,category:row.ecosystem_tools?.category,dependency_level:row.dependency_level,official_url:row.ecosystem_tools?.official_url,purpose:row.purpose,monthly_cost:row.monthly_cost,next_payment_date:row.next_payment_date});
        }else if(confirm(`Удалить подключение «${row.ecosystem_tools?.name||"сервис"}» из этого проекта? Сам сервис в справочнике останется.`)){
          try{await removeProjectService(row.id);await renderProjectServicesScreen(host,project,user);}catch(e){alert(e.message||"Не удалось удалить подключение.");}
        }
      }else{
        const row=resources.find(x=>x.id===target.id);if(!row)return;
        if(menuAction.dataset.menuAction==="edit"){
          editing={kind:"resource",row};const form=host.querySelector("[data-resource-form]");
          host.querySelector('[data-service-accordion="infrastructure"] [data-accordion-panel]').hidden=false;
          host.querySelector('[data-service-accordion="infrastructure"] [data-accordion-trigger]').setAttribute("aria-expanded","true");
          form.hidden=false;host.querySelector("[data-resource-add]").hidden=true;
          fillForm(form,{name:row.tool_resources?.name,resource_type:row.tool_resources?.resource_type,tool_id:row.tool_resources?.ecosystem_tools?.id,resource_url:row.tool_resources?.resource_url,environment:row.tool_resources?.environment,monthly_cost:row.monthly_cost,next_payment_date:row.next_payment_date,role:row.role,description:row.tool_resources?.description});
        }else if(confirm(`Удалить ресурс «${row.tool_resources?.name||"ресурс"}» из этого проекта?`)){
          try{await removeProjectResource(row.id);await renderProjectServicesScreen(host,project,user);}catch(e){alert(e.message||"Не удалось удалить ресурс.");}
        }
      }
      return;
    }
    if(!event.target.closest("[data-service-action-menu]"))closeActionMenu();
    const trigger=event.target.closest("[data-accordion-trigger]");
    if(trigger){
      const group=trigger.closest("[data-service-accordion]"),panel=group.querySelector("[data-accordion-panel]"),opening=panel.hidden;
      panel.hidden=!opening;trigger.setAttribute("aria-expanded",String(opening));
    }
    if(event.target.closest("[data-service-add]")){
      const panel=host.querySelector('[data-service-accordion="services"] [data-accordion-panel]');
      panel.hidden=false;host.querySelector('[data-service-accordion="services"] [data-accordion-trigger]').setAttribute("aria-expanded","true");
      showForm(host,"service",true);
    }
    if(event.target.closest("[data-resource-add]")){
      const panel=host.querySelector('[data-service-accordion="infrastructure"] [data-accordion-panel]');
      panel.hidden=false;host.querySelector('[data-service-accordion="infrastructure"] [data-accordion-trigger]').setAttribute("aria-expanded","true");
      showForm(host,"resource",true);
    }
    if(event.target.closest("[data-service-cancel]")){editing=null;showForm(host,"service",false);host.querySelector("[data-service-add]").hidden=false;}
    if(event.target.closest("[data-resource-cancel]")){editing=null;showForm(host,"resource",false);host.querySelector("[data-resource-add]").hidden=false;}
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
      if(serviceForm){if(editing?.kind==="service")await updateProjectService(editing.row.id,editing.row.tool_id,values);else await createProjectService(user.id,project.id,values);}
      else{if(editing?.kind==="resource")await updateProjectResource(editing.row.id,editing.row.tool_resources.id,values);else await createProjectResource(user.id,project.id,values);}
      await renderProjectServicesScreen(host,project,user);
    }catch(reason){
      error.textContent=reason?.message||"Не удалось сохранить запись.";
      error.hidden=false;button.disabled=false;
    }
  },opts);
}
