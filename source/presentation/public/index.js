(() => {
 const sidebar=document.querySelector('.sidebar');
 const body=document.body;
 const desktopButton=document.querySelector('.sidebar-toggle');
 const mobileButton=document.querySelector('.mobile-toggle');
 const scrim=document.querySelector('.scrim');
 if(!sidebar||!desktopButton||!mobileButton||!scrim)return;
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
 desktopButton.addEventListener('click',toggle);
 mobileButton.addEventListener('click',toggle);
 scrim.addEventListener('click',()=>setOpen(false));
 sidebar.querySelectorAll('a[href^="#"]').forEach(link=>link.addEventListener('click',()=>{
  sidebar.querySelectorAll('.nav-item').forEach(item=>item.classList.remove('active'));
  link.classList.add('active');
  if(mobile())setOpen(false);
 }));
 document.addEventListener('keydown',event=>{if(event.key==='Escape')setOpen(false)});
 window.addEventListener('resize',()=>{if(!mobile()){scrim.classList.remove('visible');body.classList.remove('expanded')}});
 document.querySelectorAll('.faq-list details').forEach(item=>item.addEventListener('toggle',()=>{
  if(item.open)document.querySelectorAll('.faq-list details').forEach(other=>{if(other!==item)other.open=false});
 }));
})();