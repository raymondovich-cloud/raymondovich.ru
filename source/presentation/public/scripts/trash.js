import { loadTrash, restoreTrashItem, permanentlyDeleteTrashItem } from "/source/application/trash/trash-registry.js";
import { escapeHtml as escape, workspaceScreenHead } from "./shared/workspace-ui.js";

let activeTrashController=null;

export async function renderTrashWorkspace(root,user) {
  activeTrashController?.abort();
  const controller=new AbortController();
  activeTrashController=controller;
  root.dataset.appScreen="trash";
  root.innerHTML=`
    <section class="ws-page unified-trash" aria-label="Общая корзина">
      ${workspaceScreenHead({title:"Корзина",subtitle:"Удалённые проекты и идеи. Архивирование идей не перемещает их сюда."})}
      <div class="unified-trash-filters" role="group" aria-label="Фильтр корзины">
        <button type="button" data-trash-filter="all" aria-pressed="true">Все</button>
        <button type="button" data-trash-filter="project" aria-pressed="false">Проекты</button>
        <button type="button" data-trash-filter="idea" aria-pressed="false">Идеи</button>
      </div>
      <div class="unified-trash-list" data-trash-list aria-live="polite"><p class="projects-loading">Загрузка корзины…</p></div>
    </section>`;
  const list=root.querySelector("[data-trash-list]");
  let items=[];
  let filter="all";

  function render() {
    const visible=items.filter(item=>filter==="all"||item.type===filter);
    if(!visible.length) {
      list.innerHTML=`<div class="ws-empty"><strong>${items.length?"В этой категории пусто":"Корзина пуста"}</strong><p>${items.length?"Выберите другую категорию.":"Удалённые проекты и идеи появятся здесь."}</p></div>`;
      return;
    }
    list.innerHTML=visible.map(item=>`
      <article class="projects-trash-item unified-trash-item">
        <div class="projects-trash-copy">
          <strong>${escape(item.name)}</strong>
          <span>${item.type==="project"?"Проект":"Идея"} · Удалено: ${escape(item.deletedAt?new Date(item.deletedAt).toLocaleString("ru-RU"):"дата неизвестна")}</span>
        </div>
        <div class="projects-trash-item-actions">
          <button type="button" class="projects-secondary" data-trash-restore="${escape(item.id)}" data-trash-type="${item.type}">Восстановить</button>
          <button type="button" class="projects-danger" data-trash-delete="${escape(item.id)}" data-trash-type="${item.type}">Удалить навсегда</button>
        </div>
      </article>`).join("");
  }

  async function refresh() {
    list.innerHTML='<p class="projects-loading">Загрузка корзины…</p>';
    const result=await loadTrash();
    if(controller.signal.aborted)return;
    if(result.error) {
      list.innerHTML='<div class="projects-state projects-error"><strong>Не удалось загрузить корзину</strong><p>Проверьте подключение и права доступа.</p></div>';
      return;
    }
    items=result.items;
    render();
  }

  root.addEventListener("click",async event=>{
    const filterButton=event.target.closest("[data-trash-filter]");
    if(filterButton) {
      filter=filterButton.dataset.trashFilter;
      root.querySelectorAll("[data-trash-filter]").forEach(button=>button.setAttribute("aria-pressed",String(button===filterButton)));
      render();
      return;
    }
    const restore=event.target.closest("[data-trash-restore]");
    if(restore) {
      const item=items.find(entry=>entry.id===restore.dataset.trashRestore&&entry.type===restore.dataset.trashType);
      if(!item)return;
      restore.disabled=true;
      const result=await restoreTrashItem(item,user.id);
      if(result.error && !result.data) {
        window.alert(result.error.message||"Не удалось восстановить объект.");
        restore.disabled=false;
        return;
      }
      if(result.error && result.data) window.alert("Объект восстановлен, но запись в истории не сохранилась: "+result.error.message);
      await refresh();
      return;
    }
    const remove=event.target.closest("[data-trash-delete]");
    if(remove) {
      const item=items.find(entry=>entry.id===remove.dataset.trashDelete&&entry.type===remove.dataset.trashType);
      if(!item)return;
      const typeLabel=item.type==="project"?"проект":"идею";
      if(!window.confirm(`Удалить ${typeLabel} «${item.name}» навсегда? Для идеи также будет удалена история активности. Это действие нельзя отменить.`))return;
      remove.disabled=true;
      const result=await permanentlyDeleteTrashItem(item);
      if(result.error) {
        window.alert(result.error.message||"Не удалось удалить объект.");
        remove.disabled=false;
        return;
      }
      await refresh();
    }
  },{signal:controller.signal});

  document.addEventListener("raymondovich:navigation",event=>{
    if(event.detail?.route!=="#authorization/trash") {
      controller.abort();
      if(activeTrashController===controller)activeTrashController=null;
    }
  },{signal:controller.signal});

  await refresh();
}
