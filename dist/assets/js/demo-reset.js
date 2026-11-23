(function(root){
  const signal='zhilin-demo-reset';
  const sessionKeys=['a0-phone','a0-committee','zhilin-open-assistants'];
  const localPrefixes=['zhilin-business-v1-','zhilin-work-','zhilin-assistant-hint-'];
  const databases=['zhilin-a0-files','zhilin-business-files'];

  function clearSession(storage){
    for(const key of sessionKeys)storage.removeItem(key);
  }

  function deleteDatabase(indexedDB,name){
    return new Promise((resolve,reject)=>{
      const request=indexedDB.deleteDatabase(name);
      request.onsuccess=()=>resolve();
      request.onerror=()=>reject(request.error);
      request.onblocked=()=>reject(Error('有页面仍在使用演示附件。请关闭本站的其他标签页后重试。'));
    });
  }

  async function clearData(local,session,indexedDB){
    if(indexedDB)await Promise.all(databases.map(name=>deleteDatabase(indexedDB,name)));
    const keys=Array.from({length:local.length},(_,i)=>local.key(i));
    for(const key of keys){
      if(key==='zhilin-a0-v1'||localPrefixes.some(prefix=>key?.startsWith(prefix)))local.removeItem(key);
    }
    clearSession(session);
  }

  const button='<button type="button" class="demo-reset-link" data-demo-reset>清除测试数据</button>';
  function tools(label,style){
    return `<div class="demo-tools"><span class="${style}">${label}</span>${button}</div>`;
  }

  function setup(){
    function restart(){
      clearSession(sessionStorage);
      location.replace(PageRoutes.onboarding);
    }
    addEventListener('storage',event=>{
      if(event.storageArea===localStorage&&event.key===signal&&event.newValue)restart();
    });
    document.addEventListener('click',event=>{
      if(!event.target.closest('[data-demo-reset]'))return;
      if(document.querySelector('#demo-reset-dialog'))return;
      const dialog=document.createElement('dialog');
      dialog.id='demo-reset-dialog';
      dialog.setAttribute('aria-labelledby','demo-reset-title');
      dialog.setAttribute('aria-describedby','demo-reset-description');
      dialog.innerHTML=`<h2 id="demo-reset-title">清除测试数据？</h2>
        <p id="demo-reset-description">将删除当前浏览器里此站点的智邻演示档案、事项、对话和上传附件。清除后无法恢复，并会返回登录页。</p>
        <p class="a0-error" role="alert" hidden></p>
        <form method="dialog"><button class="secondary" autofocus>取消</button><button class="demo-reset-confirm" type="button">清除并重新开始</button></form>`;
      document.body.append(dialog);
      const [cancel,confirm]=dialog.querySelectorAll('button');
      let busy=false;
      dialog.addEventListener('cancel',event=>{if(busy)event.preventDefault();});
      dialog.addEventListener('close',()=>dialog.remove());
      confirm.onclick=async()=>{
        if(busy)return;
        busy=true;
        confirm.disabled=cancel.disabled=true;
        confirm.textContent='正在清除…';
        const error=dialog.querySelector('[role=alert]');
        error.hidden=true;
        try{
          await clearData(localStorage,sessionStorage,root.indexedDB);
          localStorage.setItem(signal,String(Date.now()));
          localStorage.removeItem(signal);
          restart();
        }catch(err){
          error.textContent=err.message||'暂时无法清除测试数据，请重试。';
          error.hidden=false;
          busy=false;
          confirm.disabled=cancel.disabled=false;
          confirm.textContent='清除并重新开始';
        }
      };
      dialog.showModal();
    });
  }

  const api={clearData,button,tools};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else {root.DemoReset=api;setup();}
})(typeof globalThis!=='undefined'?globalThis:this);
