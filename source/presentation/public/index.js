(() => {
 const sidebar=document.querySelector('.sidebar');
 const body=document.body;
 const desktopButton=document.querySelector('.sidebar-toggle');
 const mobileButton=document.querySelector('.mobile-toggle');
 const scrim=document.querySelector('.scrim');
 const main=document.querySelector('#main');
 const routeDescription=document.querySelector('#route-description');
 const routeMeta={
  home:{title:'RAYMONDOVICH — платформа развития проектов',description:'Платформа для создания, развития и коммерциализации цифровых проектов.'},
  products:{title:'Продукты экосистемы — RAYMONDOVICH',description:'Каталог действующих и разрабатываемых продуктов экосистемы RAYMONDOVICH.'},
  cooperation:{title:'Форматы сотрудничества — RAYMONDOVICH',description:'Три формата развития проектов: собственные, партнёрские и сторонние.'},
  steps:{title:'Как стать партнёром — RAYMONDOVICH',description:'Четыре шага для начала сотрудничества с платформой RAYMONDOVICH.'},
  faq:{title:'Частые вопросы — RAYMONDOVICH',description:'Ответы на частые вопросы о платформе и партнёрстве.'},
  contact:{title:'Контакты — RAYMONDOVICH',description:'Связь с командой RAYMONDOVICH по вопросам проектов и сотрудничества.'}
 };
 if(!sidebar||!desktopButton||!mobileButton||!scrim||!main)return;
 const mobile=()=>window.matchMedia('(max-width:820px)').matches;
 function setOpen(open){
  sidebar.classList.toggle('open',open);
  body.classList.toggle('expanded',open&&!mobile());
  scrim.classList.toggle('visible',open&&mobile());
  desktopButton.setAttribute('aria-expanded',String(open));
  mobileButton.setAttribute('aria-expanded',String(open));
  desktopButton.setAttribute('aria-label',open?'Закрыть меню':'Открыть меню');
  mobileButton.setAttribute('aria-label',open?'Закрыть навигацию':'Открыть навигацию');
 }
 function toggle(){setOpen(!sidebar.classList.contains('open'))}
 function currentRoute(){
  const raw=window.location.hash.replace(/^#\/?/,'').split(/[?&]/)[0];
  return routeMeta[raw] ? raw : 'home';
 }
 function renderRoute(){
  const route=currentRoute();
  const template=document.querySelector('#page-'+route);
  if(!template){main.innerHTML='<section class="section bordered"><h1>Страница не найдена</h1><a class="button primary" href="#/">На главную</a></section>';return;}
  const previousIntro=main.querySelector('[data-system-intro]');
  if(previousIntro&&previousIntro.open)previousIntro.close();
  main.replaceChildren(template.content.cloneNode(true));
  document.title=routeMeta[route].title;
  if(routeDescription)routeDescription.setAttribute('content',routeMeta[route].description);
  sidebar.querySelectorAll('.nav-item[href^="#/"]').forEach(item=>{
   const target=item.getAttribute('href').replace(/^#\/?/,'')||'home';
   const active=target===route;
   item.classList.toggle('active',active);
   if(active)item.setAttribute('aria-current','page');else item.removeAttribute('aria-current');
  });
  setOpen(false);
  window.scrollTo({top:0,behavior:window.matchMedia('(prefers-reduced-motion: reduce)').matches?'auto':'smooth'});
 }
 desktopButton.addEventListener('click',toggle);
 mobileButton.addEventListener('click',toggle);
 scrim.addEventListener('click',()=>setOpen(false));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
 window.addEventListener('hashchange',renderRoute);
 window.addEventListener('resize',()=>{if(!mobile()){scrim.classList.remove('visible');body.classList.remove('expanded')}});
 document.addEventListener('click',event=>{
  const target=event.target instanceof Element?event.target:null;
  if(!target)return;
  const openTrigger=target.closest('[data-intro-open]');
  if(openTrigger){
   const dialog=main.querySelector('[data-system-intro]');
   if(dialog&&!dialog.open){setIntroStep(dialog,1);dialog.showModal();}
   return;
  }
  const dialog=target.closest('[data-system-intro]');
  if(dialog){
   if(target.closest('[data-intro-close],[data-intro-skip]')){dialog.close();return;}
   if(target.closest('[data-intro-prev]')){setIntroStep(dialog,Math.max(1,Number(dialog.dataset.step||1)-1));return;}
   if(target.closest('[data-intro-next]')){setIntroStep(dialog,Math.min(3,Number(dialog.dataset.step||1)+1));return;}
   if(target.closest('[data-intro-finish]')){dialog.close();return;}
   if(target===dialog){dialog.close();return;}
  }
 });
 function setIntroStep(dialog,step){
  const visual=dialog.querySelector('.system-intro__visual');
  dialog.dataset.step=String(step);
  visual.dataset.step=String(step);
  visual.querySelectorAll('.intro-node').forEach((node,index)=>node.classList.toggle('is-active',index<step));
  visual.querySelectorAll('.intro-link').forEach((link,index)=>link.classList.toggle('is-active',index<step));
  dialog.querySelectorAll('[data-intro-slide]').forEach(slide=>{slide.hidden=Number(slide.dataset.introSlide)!==step});
  dialog.querySelector('[data-intro-count]').textContent=String(step).padStart(2,'0')+' / 03';
  dialog.querySelector('[data-intro-progress]').setAttribute('aria-valuenow',String(step));
  dialog.querySelectorAll('.system-intro__progress-track i').forEach((item,index)=>item.classList.toggle('is-active',index<step));
  dialog.querySelector('[data-intro-prev]').hidden=step===1;
  dialog.querySelector('[data-intro-next]').hidden=step===3;
  dialog.querySelector('[data-intro-finish]').hidden=step!==3;
  dialog.querySelector('[data-intro-skip]').hidden=step===3;
 }
 document.addEventListener('click',event=>{
  const link=event.target.closest('a[href^="#/"]');
  if(link&&mobile())setOpen(false);
 });
 document.addEventListener('toggle',event=>{
  if(event.target.matches('.faq-list details')&&event.target.open){
   document.querySelectorAll('.faq-list details').forEach(other=>{if(other!==event.target)other.open=false});
  }
 },true);
 renderRoute();
})();