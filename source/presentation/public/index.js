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
   if(dialog&&!dialog.open){startPresentation(dialog);dialog.showModal();}
   return;
  }
  const dialog=target.closest('[data-system-intro]');
  if(dialog){
   if(target.closest('[data-intro-close]')){stopPresentation(dialog);dialog.close();return;}
   if(target.closest('[data-intro-skip]')){finishPresentation(dialog);return;}
   if(target.closest('[data-intro-pause]')){togglePresentation(dialog);return;}
   if(target.closest('[data-intro-replay]')){startPresentation(dialog);return;}
   if(target===dialog){stopPresentation(dialog);dialog.close();return;}
  }
 });
 const presentationPhases=[
  {at:0,phase:0,caption:'СИСТЕМА ЗАПУСКАЕТСЯ',description:'Единая экосистема, объединённая системой управления проектами.'},
  {at:3,phase:1,caption:'RAYMONDOVICH / ЦИФРОВАЯ ЭКОСИСТЕМА',description:'В центре — RAYMONDOVICH. Экосистема связывает проекты и участников.'},
  {at:6,phase:2,caption:'ЧЕТЫРЕ НАПРАВЛЕНИЯ · ОДНА ЭКОСИСТЕМА',description:'Собственные, партнёрские и сторонние проекты связаны с системой управления.'},
  {at:12,phase:3,caption:'СОБСТВЕННЫЕ ПРОДУКТЫ',description:'LIFE GAME готовится к запуску. AI-SISTEM временно на паузе.'},
  {at:20,phase:4,caption:'СИСТЕМА УПРАВЛЕНИЯ ПРОЕКТОМ',description:'Внутри — финансы, подключённые сервисы, маркетинг и статистика.'},
  {at:30,phase:5,caption:'ПАРТНЁРСКИЕ ПРОЕКТЫ',description:'Участие в программах, заранее описанные условия и выбор направлений.'},
  {at:36,phase:6,caption:'RAYMONDOVICH | PRIVATE',description:'Участникам доступны инструменты системы через личный кабинет.'},
  {at:41,phase:7,caption:'ЕДИНАЯ СИСТЕМА. ЧЕТЫРЕ НАПРАВЛЕНИЯ.',description:'Проекты, продукты и инструменты управления связаны в одну экосистему.'},
  {at:45,phase:8,caption:'ОБСУДИМ ПАРТНЁРСТВО',description:'Свяжитесь с RAYMONDOVICH, чтобы обсудить возможный формат участия.'}
 ];
 function stopPresentation(dialog){
  if(dialog._presentationTimer){clearInterval(dialog._presentationTimer);dialog._presentationTimer=null;}
  dialog._presentationRunning=false;
 }
 function renderPresentation(dialog,seconds){
  const item=[...presentationPhases].reverse().find(entry=>seconds>=entry.at)||presentationPhases[0];
  const stage=dialog.querySelector('[data-intro-stage]');
  stage.dataset.phase=String(item.phase);
  dialog.querySelector('[data-intro-caption]').textContent=item.caption;
  dialog.querySelector('[data-intro-description]').textContent=item.description;
  dialog.querySelector('[data-intro-time]').textContent='00:'+String(Math.min(45,Math.floor(seconds))).padStart(2,'0');
  dialog.querySelector('[data-intro-progress]').style.width=(Math.min(45,seconds)/45*100)+'%';
  const skip=dialog.querySelector('[data-intro-skip]');
  const contact=dialog.querySelector('[data-intro-contact]');
  skip.hidden=seconds>=45;
  contact.hidden=seconds<45;
  if(seconds>=45)stopPresentation(dialog);
 }
 function startPresentation(dialog){
  stopPresentation(dialog);
  dialog.querySelector('[data-intro-pause]').textContent='Пауза';
  dialog.querySelector('[data-intro-contact]').hidden=true;
  dialog.querySelector('[data-intro-skip]').hidden=false;
  dialog._presentationElapsed=0;
  dialog._presentationStarted=Date.now();
  dialog._presentationRunning=true;
  renderPresentation(dialog,0);
  if(!dialog.open)dialog.showModal();
  dialog._presentationTimer=setInterval(()=>{
   if(!dialog._presentationRunning)return;
   const elapsed=dialog._presentationElapsed+(Date.now()-dialog._presentationStarted)/1000;
   renderPresentation(dialog,elapsed);
  },100);
 }
 function togglePresentation(dialog){
  if(dialog._presentationRunning){
   dialog._presentationElapsed+=(Date.now()-dialog._presentationStarted)/1000;
   dialog._presentationRunning=false;
   dialog.querySelector('[data-intro-pause]').textContent='Продолжить';
  }else if(dialog._presentationElapsed<45){
   dialog._presentationStarted=Date.now();
   dialog._presentationRunning=true;
   dialog.querySelector('[data-intro-pause]').textContent='Пауза';
  }
 }
 function finishPresentation(dialog){
  stopPresentation(dialog);
  renderPresentation(dialog,45);
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