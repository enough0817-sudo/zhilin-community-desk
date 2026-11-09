const PageRoutes=(()=>{
 const base=typeof document==='undefined'?'':new URL(document.currentScript.src).pathname.replace(/\/assets\/js\/routes\.js$/, '');
 const onboarding=base+'/onboarding/index.html';
 const pages={home:'/index.html',tasks:'/tasks/index.html',business:'/business/index.html',docs:'/library/index.html',archive:'/community/index.html',chat:'/chat/index.html'};
 function url(page,state={},session){let path=pages[page]||pages.home;const q=new URLSearchParams();if(page==='work'){path='/business/'+state.moduleId+'/index.html';if(state.tab)q.set('type',state.tab);if(state.selected)q.set('record',state.selected);if(state.action)q.set('action',state.action);}if(page==='chat'&&session)q.set('session',session);return base+path+(q.size?'?'+q:'');}
 function sync(page,state,session){const target=url(page,state,session),next=new URL(target,location.origin);if(location.pathname!==next.pathname&&!(location.pathname===base+'/'&&page==='home')){location.assign(target);return true;}const current=new URL(location.href);current.searchParams.delete('action');if(current.search!==next.search){history.pushState(null,'',target);}return false;}
 addEventListener('popstate',()=>location.reload());
 return {url,sync,onboarding};
})();
if(typeof module!=='undefined')module.exports=PageRoutes;
