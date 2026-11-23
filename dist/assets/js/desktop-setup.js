const DesktopSetup=(()=>{
  const M=DesktopSetupModel;
  const enabled=()=>matchMedia('(min-width: 1080px)').matches;
  const $=s=>document.querySelector(s);
  const h=value=>String(value??'').replace(/[&<>"']/g,char=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const fields={province:'省份',city:'城市',district:'区县',term:'第几届',start:'任期开始',end:'任期结束'};
  const error=id=>`<p class="a0-error" id="${id}" role="alert" hidden></p>`;
  const option=(value,label,selected)=>`<option value="${h(value)}" ${value===selected?'selected':''}>${h(label)}</option>`;
  const input=(name,label,value='',attrs='')=>`<label class="a0-field">${h(label)}<input name="${h(name)}" value="${h(value)}" ${attrs}></label>`;
  const kindOptions=value=>M.materials.map((kind,i)=>option(kind,i===0?'备案记录表（PDF）':'业委会入驻登记表（盖章）',value)).join('');
  const filePicker=kind=>`<label class="a0-field">材料类型<select name="materialKind" id="desktop-material-kind">${kindOptions(kind)}</select></label>
    <label class="a0-upload" id="desktop-filing-drop"><strong>选择备案材料</strong><span>备案记录表请传 PDF，盖章登记表可传 PDF 或图片，每份最多 10 MB</span>
    <input type="file" id="desktop-filing-file" accept=".pdf,.jpg,.jpeg,.png,.webp" aria-label="选择备案材料"></label>`;
  function uploadHTML(draft){
    return `<div class="a0-content desktop-intake"><h1>第 1 件 · 备案记录表</h1>
      <p class="a0-muted">可上传《备案记录表》或加盖公章的《业委会入驻登记表》。</p>
      ${filePicker(draft.materialKind)}
      <div class="a0-actions"><button class="secondary" id="desktop-filing-template">下载入驻登记表模板</button><button class="secondary" id="desktop-filing-sample">使用示例备案表</button></div>
      ${draft.file?`<p>${h(draft.file.name)}</p>`:''}
      ${error('a0-error')}
      <div class="a0-actions">${draft.file?`<button class="primary" id="desktop-filing-next">核对十二项</button>`:''}<button class="secondary" data-signout>返回登录</button></div></div>`;
  }
  function filingForm({values={},file,materialKind='备案表',stamped=false,recheck=false,replace=false,changes=[]}){
    return `<form id="desktop-filing-form" class="desktop-setup-form" novalidate>
      <div class="desktop-filing-source">
        <strong data-material-name>${h(file?.name||'尚未上传材料')}</strong>
        <button type="button" class="secondary" id="desktop-preview-filing" ${file?'':'disabled'}>查看原件</button>
        ${replace?`<details class="desktop-filing-replace"><summary>替换材料</summary>${filePicker(materialKind)}</details>`:''}
      </div>
      <div class="desktop-filing-toolbar">
        <div>
          <strong data-filing-progress role="status"></strong>
          <progress max="${M.filing.length}" value="0" aria-label="备案核对进度"></progress>
        </div>
        <button class="secondary" type="button" data-filing-check-all aria-describedby="desktop-filing-guidance">一键核对</button>
      </div>
      <p id="desktop-filing-guidance" class="a0-note">请先对照原件，一键核对仅确认已填写完整的项目。</p>
      <p class="a0-note desktop-filing-missing" data-filing-missing hidden></p>
      <div class="desktop-filing-review">
        <div class="desktop-filing-row desktop-filing-columns" aria-hidden="true"><span>备案项目</span><span>记录内容</span><span>状态</span><span>操作</span></div>
        ${M.filing.map(([label,...keys],i)=>`<div class="desktop-filing-row" role="group" aria-labelledby="filing-label-${keys[0]}" data-review="${keys[0]}">
          <strong id="filing-label-${keys[0]}"><span>${String(i+1).padStart(2,'0')}</span>${label}</strong>
          <div class="desktop-filing-values" data-group="${keys[0]}">${keys.map(key=>`<label class="a0-field"><span class="${keys.length===1?'sr-only':''}">${fields[key]||label}</span>
            <input name="${key}" value="${h(values[key])}" ${['start','end','filingDate'].includes(key)?'type="date"':'maxlength="120"'} ${key==='viceName'?'placeholder="如无，请填写「无」"':''}></label>`).join('')}</div>
          <span class="desktop-review-state"></span>
          <button class="link desktop-filing-check" type="button" data-filing-check aria-label="核对${label}">核对</button>
        </div>`).join('')}
      </div>
      <label class="desktop-check" id="desktop-stamp" ${materialKind!==M.materials[1]?'hidden':''}><input type="checkbox" name="stamped" ${stamped?'checked':''}>请确认入驻登记表已加盖业主委员会公章</label>
      ${recheck?`<div class="desktop-field-row"><label class="a0-field">信息更正类型<select name="classification">${['非实质','实质','需重新备案'].map(x=>option(x,x,'非实质')).join('')}</select></label>${input('reason','更正原因（修改已确认内容时填写）')}</div>`:''}
      <div data-filing-log>${filingLog(changes)}</div>
      <div class="work-buttons desktop-filing-footer">${error('desktop-filing-error')}${!replace&&!recheck?`<button type="button" class="secondary" data-step="upload">返回材料</button>`:''}<button class="primary" type="submit">${replace||recheck?'确认并锁定':'提交备案核对'}</button></div>
    </form>`;
  }
  function filingLog(entries,expanded=false,page=0){
    if(!entries.length)return '';
    const rows=entries.slice().reverse(),pages=Math.ceil(rows.length/3);
    const visible=expanded?rows.slice(page*3,page*3+3):rows.slice(0,1);
    return `<section class="work-deferred desktop-filing-log"><h3>修改日志</h3>
      ${visible.map(row=>`<p class="a0-note"><strong>${h(row.label)}</strong> · ${h(row.before||'空白')} → ${h(row.after||'空白')}</p>`).join('')}
      <div class="work-buttons">${expanded?`<span class="a0-note">共 ${rows.length} 条 · 第 ${page+1} / ${pages} 页</span>
        <button type="button" class="link" data-log="prev" ${page?'':'disabled'}>上一页</button><button type="button" class="link" data-log="next" ${page+1<pages?'':'disabled'}>下一页</button>
        <button type="button" class="link" data-log="collapse">收起</button>`:`<button type="button" class="link" data-log="expand">展开全部 ${rows.length} 条 ›</button>`}</div></section>`;
  }
  function bootstrapHTML(draft){
    return `<div class="a0-content desktop-intake"><h1>逐项核对备案记录表</h1><p class="a0-note">按原件核对。示例以外的文件请手动填写，首次演示手机号用于主任席位认领。</p>
      ${filingForm({values:draft.fields,...draft})}${error('a0-error')}</div>`;
  }
  function oldFields(c){
    return {chairName:c.members.find(m=>m.role==='主任')?.name,viceName:c.members.find(m=>m.role==='副主任')?.name||'无',...c.fields};
  }
  function pendingHTML(c){
    const can=A0.store.canManage(A0.phone(),c);
    return `<div class="a0-content desktop-intake"><h1>${can?'确认第 1 件备案记录表':'等待负责人核对备案'}</h1>
      ${can?filingForm({values:oldFields(c),...c.filingReview,file:c.file,materialKind:c.materialKind,recheck:true,replace:true}):'<p>主任或副主任锁定备案记录后，即可进入工作台。</p>'}
      ${error('a0-error')}<button class="secondary" data-signout>切换账号</button></div>`;
  }
  async function storeFilingFile(file,kind,putFile){
    if(file.size<1||file.size>10*1024*1024)throw Error('请选择非空文件，文件不能超过 10 MB');
    const key='file-'+A0Model.uid();
    const meta={key,name:file.name,type:file.type,source:'upload'};
    const allowed=kind===M.materials[0]?['application/pdf']:['application/pdf','image/jpeg','image/png','image/webp'];
    if(!allowed.includes(meta.type))throw Error('请上传备案记录表 PDF，或盖章的入驻登记表扫描件');
    if(meta.type==='application/pdf' && await file.slice(0,5).text()!=='%PDF-')throw Error('请上传有效的 PDF 文件');
    await putFile(key,file);
    return meta;
  }
  function downloadFilingTemplate(){
    const content='业委会入驻登记表\n\n'+M.filing.map(([label])=>label+'：________________________________').join('\n\n')+'\n\n业主委员会（盖章）：____________________\n\n日期：____________________';
    const url=URL.createObjectURL(new Blob(['\ufeff'+content],{type:'text/plain;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='业委会入驻登记表.txt';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);
  }
  function showError(id,message){
    const target=document.getElementById(id);
    if(target){target.textContent=message;target.hidden=!message;}
  }
  function bindFiling(initial,onSave,{previewFile,putFile,persist}){
    const form=$('#desktop-filing-form');
    const checks={...initial.checks};
    const changes=[...(initial.changes||[])];
    const edited=new Set(changes.map(row=>row.key));
    const baseline={};
    let logExpanded=false, logPage=0;
    let file=initial.file,materialKind=initial.materialKind||M.materials[0],busy=false;
    const getFields=()=>Object.fromEntries(M.filing.flatMap(([, ...keys])=>keys.map(key=>[key,form.elements[key].value.trim()])));
    const complete=(keys,values)=>keys.every(key=>values[key]);
    Object.assign(baseline,getFields());
    function drawLog(){form.querySelector('[data-filing-log]').innerHTML=filingLog(changes,logExpanded,logPage);}
    function update(){
      const values=getFields();
      const waiting=M.unchecked(values,checks);
      const missing=waiting.filter(([, ...keys])=>!complete(keys,values));
      for(const [label,...keys] of M.filing){
        const key=keys[0],row=form.querySelector(`[data-review="${key}"]`);
        const filled=complete(keys,values),checked=filled&&checks[key]===M.checkValue(keys,values);
        row.dataset.state=checked?'checked':!filled?'missing':edited.has(key)?'edited':'pending';
        row.querySelector('.desktop-review-state').textContent={checked:'已核对',missing:'待填写',edited:'已改 · 待核',pending:'待核对'}[row.dataset.state];
        const button=row.querySelector('[data-filing-check]');
        button.textContent=checked?'撤销':'核对';
        button.setAttribute('aria-label',checked?'撤销核对'+label:'核对'+label);
        button.disabled=busy||!filled||!file;
      }
      const count=M.filing.length-waiting.length;
      form.querySelector('[data-filing-progress]').textContent=`已核对 ${count} / ${M.filing.length} 项`;
      form.querySelector('progress').value=count;
      form.querySelector('[data-filing-check-all]').disabled=busy||!file||waiting.length===missing.length;
      form.querySelector('#desktop-preview-filing').disabled=busy||!file;
      const missingNotice=form.querySelector('[data-filing-missing]');
      missingNotice.hidden=!missing.length;
      missingNotice.textContent=missing.length?'待填写：'+missing.map(([label])=>label).join('、'):'';
      form.querySelector('button[type=submit]').disabled=busy||waiting.length>0||!file;
      persist?.({fields:values,checks:{...checks},stamped:form.elements.stamped.checked,changes:[...changes]});
    }
    form.oninput=event=>{
      const row=event.target.closest('[data-review]');
      if(row){
        const id=row.dataset.review,name=event.target.name;
        if(event.target.value.trim()!==baseline[name])edited.add(id);
        delete checks[id];
      }
      update();
    };
    form.onchange=event=>{
      const row=event.target.closest('[data-review]'),name=event.target.name;
      if(!row)return;
      const after=getFields()[name],before=baseline[name];
      if(before===after)return;
      const key=row.dataset.review,label=M.filing.find(([,first])=>first===key)[0];
      changes.push({key,label:fields[name]||label,before,after,at:Date.now()});
      baseline[name]=after;
      drawLog();
      update();
    };
    form.addEventListener('click',event=>{
      const reviewButton=event.target.closest('[data-filing-check-all],[data-filing-check]');
      if(reviewButton&&!reviewButton.disabled){
        const values=getFields();
        if(reviewButton.hasAttribute('data-filing-check-all')){
          for(const [, ...keys] of M.filing){
            if(complete(keys,values))checks[keys[0]]=M.checkValue(keys,values);
          }
        }else{
          const key=reviewButton.closest('[data-review]').dataset.review;
          const [, ...keys]=M.filing.find(([,first])=>first===key);
          const snapshot=M.checkValue(keys,values);
          if(checks[key]===snapshot)delete checks[key];
          else if(complete(keys,values))checks[key]=snapshot;
        }
        showError('desktop-filing-error','');
        update();
        return;
      }
      const action=event.target.closest('[data-log]')?.dataset.log;
      if(!action)return;
      if(action==='expand')logExpanded=true;
      if(action==='collapse'){logExpanded=false;logPage=0;}
      if(action==='prev')logPage--;
      if(action==='next')logPage++;
      drawLog();
    });
    const fileInput=form.querySelector('#desktop-filing-file');
    if(fileInput)fileInput.onchange=async()=>{
      const upload=fileInput.files[0];
      if(!upload||busy)return;
      const choice=form.elements.materialKind.value;
      busy=true;update();
      try{
        file=await storeFilingFile(upload,choice,putFile);
        materialKind=choice;
        form.querySelector('[data-material-name]').textContent=file.name;
        form.querySelector('#desktop-stamp').hidden=materialKind!==M.materials[1];
        form.elements.stamped.checked=false;
        for(const key of Object.keys(checks))delete checks[key];
        showError('desktop-filing-error','');
      }catch(e){showError('desktop-filing-error',e.message);}
      finally{busy=false;update();}
    };
    const preview=form.querySelector('#desktop-preview-filing');
    if(preview)preview.onclick=()=>previewFile(file,form.closest('.drawer')?form:null);
    form.onsubmit=event=>{
      event.preventDefault();
      if(busy)return;
      const values=getFields(),stamped=form.elements.stamped.checked;
      try{
        M.validateFiling(values,checks,file,materialKind,stamped);
        onSave({fields:values,checks:{...checks},stamped,file,materialKind,changes,reason:form.elements.reason?.value,classification:form.elements.classification?.value});
      }catch(e){showError('desktop-filing-error',e.message);}
    };
    update();
  }
  function bindOnboarding(screen,api){
    if(screen==='upload'){
      $('#desktop-filing-template').onclick=downloadFilingTemplate;
      $('#desktop-filing-sample').onclick=api.useSample;
      const next=$('#desktop-filing-next');
      if(next)next.onclick=()=>api.change('review');
      let busy=false;
      async function upload(file){
        if(!file||busy)return;
        const materialKind=$('#desktop-material-kind').value;
        busy=true;
        try{
          const meta=await storeFilingFile(file,materialKind,api.putFile);
          api.saveDraft({materialKind,file:meta,fields:{},checks:{},members:[],stamped:false});
          api.change('review');
        }catch(e){api.writeError(e.message);}
        finally{busy=false;}
      }
      $('#desktop-filing-file').onchange=e=>upload(e.target.files[0]);
      $('#desktop-filing-drop').ondragover=e=>e.preventDefault();
      $('#desktop-filing-drop').ondrop=e=>{e.preventDefault();upload(e.dataTransfer.files[0]);};
    }
    if(screen==='review')bindFiling(api.draft(),api.submitted,{...api,persist:api.saveDraft});
    if(screen==='pending'&&api.canManage()){
      const c=A0.activeCommittee();
      bindFiling({...c.filingReview,file:c.file,materialKind:c.materialKind},api.confirmed,api);
    }
  }
  function openFiling(){
    const c=A0.activeCommittee(),allowed=A0.store.canManage(A0.phone(),c);
    if(!allowed){
      drawer('第 1 件 · 备案记录表',`<dl class="a0-summary">${M.filing.map(([label,...keys])=>`<dt>${label}</dt><dd>${h(keys.map(k=>oldFields(c)[k]).filter(Boolean).join(' / ')||'待核对')}</dd>`).join('')}</dl>`);
      return;
    }
    drawer('第 1 件 · 备案记录表',filingForm({values:oldFields(c),...c.filingReview,file:c.file,materialKind:c.materialKind,recheck:!!c.filingReview?.confirmedAt,replace:true}));
    bindFiling({...c.filingReview,file:c.file,materialKind:c.materialKind},v=>{
      A0.store.reviewFiling(A0.phone(),c.id,v);closeDrawer();render();toast('备案十二项已确认');
    },{previewFile:A0.previewFile,putFile:A0.putFile});
  }
  const heading=(title)=>`<div class="page-head"><div><span class="work-eyebrow">建档完善</span><h1>${title}</h1></div></div>`;
  const back=`<a class="secondary" href="${PageRoutes.url('archive')}">返回建档进度</a>`;
  function blocked(title,items){
    return `<div class="workspace work-page">${heading(title)}
      <section class="setup-panel desktop-setup-form" aria-label="建档前置"><h2>请先完成前置事项</h2>
      ${items.map(([id,label])=>`<div class="desktop-section-head"><span>${label}</span><button class="secondary" data-desktop-go="${id}">去完成第 ${id==='filing'?1:2} 件</button></div>`).join('')}
      </section></div>`;
  }
  const rosterDrafts=new Map();
  function rosterData(c){
    const key=c.id+':'+A0.phone();
    if(!rosterDrafts.has(key)){
      const saved=c.setupRoster||{};
      const assignments=(saved.assignments||[]).filter(row=>!M.duties.includes(row.duty));
      rosterDrafts.set(key,{
        members:c.members.map(m=>({...m,post:m.post||m.role})),
        assignments:[...M.duties.map(duty=>saved.assignments?.find(row=>row.duty===duty)||{duty,owner:'',helpers:[]}),...assignments],
        assistants:structuredClone(saved.assistants||[])
      });
    }
    return rosterDrafts.get(key);
  }
  function rosterHTML(){
    const c=A0.activeCommittee();
    if(!c.filingReview?.confirmedAt)return blocked('第 2 件 · 名单与分工',[['filing','第 1 件《备案记录表》']]);
    const edit=A0.store.canManage(A0.phone(),c),data=rosterData(c),key=c.setupRoster?.completedAt?'已完成':'待完善';
    const disabled=edit?'':'disabled';
    const choices=data.members.filter(m=>m.role!=='候补委员'&&!m.inactiveAt&&m.name);
    return `<div class="workspace work-page">${heading('第 2 件 · 名单与分工')}
      <form class="desktop-setup-form" id="desktop-roster-form" novalidate>
        <section class="setup-panel">
          <div class="desktop-section-head"><div><h2>本届名单</h2><p class="a0-note">主任、副主任以备案表为准。岗位可改名，席位须由本人登录认领。</p></div><span class="tag ${c.setupRoster?.completedAt?'setup-done':''}">${key}</span></div>
          <div class="desktop-roster-list">${data.members.map((m,i)=>`<div class="desktop-roster-row" data-roster-index="${i}">
            ${input('member-name','姓名',m.name,edit&&m.new?'maxlength="30"':'readonly')}
            <div class="desktop-cell"><span>法定职务</span><strong>${h(m.role)}</strong></div>
            ${input('member-post','岗位',m.post,`list="desktop-posts" maxlength="30" ${disabled}`)}
            ${input('member-phone','手机号',edit&&!m.accountPhone&&!m.inactiveAt?m.phone:M.mask(m.phone),`type="tel" autocomplete="off" ${edit&&!m.accountPhone&&!m.inactiveAt&&m.role!=='候补委员'?'':'readonly'}`)}
            <div class="desktop-cell desktop-row-action">${m.new?`<button type="button" class="link" data-drop-member="${i}">移除</button>`:
              edit&&!m.accountPhone&&!m.inactiveAt&&m.role!=='候补委员'?`<button type="button" class="secondary" data-save-phone="${i}">保存号码</button>`:`<span>${m.inactiveAt?'已离任':m.accountPhone?'已认领':'待认领'}</span>`}</div>
            </div>`).join('')}</div>
          <datalist id="desktop-posts">${M.posts.map(post=>option(post,post)).join('')}</datalist>
          <div class="work-buttons">${edit&&!c.setupRoster?.firstCompletedAt&&!c.setupRoster?.completedAt?`<button class="secondary" data-add-member type="button">录入委员</button>`:''}<a class="secondary" href="${PageRoutes.url('work',{moduleId:'A17',tab:'委员变动'})}">委员变动单</a></div>
        </section>
        <section class="setup-panel">
          <h2>职责分工</h2><p class="a0-note">每项最多一位主办，可指定多位协办。未定主办时暂不派发该职责待办。</p>
          ${data.assignments.map((row,i)=>`<div class="desktop-duty" data-duty-index="${i}">
            <strong>${h(row.duty)}</strong><label class="a0-field">主办<select name="owner" ${disabled}>${option('','暂不指定',row.owner)}${choices.map(m=>option(m.id,m.name,row.owner)).join('')}</select></label>
            <fieldset><legend>协办</legend><div class="desktop-helper-list">${choices.length?choices.map(m=>`<label class="desktop-check"><input type="checkbox" name="helper" value="${h(m.id)}" ${row.helpers.includes(m.id)?'checked':''} ${disabled} ${m.id===row.owner?'disabled':''}>${h(m.name)}</label>`).join(''):'尚无正式委员'}</div></fieldset>
          </div>`).join('')}
          ${edit?`<div class="desktop-field-row">${input('custom-duty','自定义分工','','maxlength="30"')}<button class="secondary" type="button" data-add-duty>添加分工</button></div>`:''}
        </section>
        <section class="setup-panel" id="desktop-assistant-section">
          <h2>助理委托</h2><p class="a0-note">最多三名助理。默认范围为${M.scopes.join('、')}。合同管理须另行委托并指定有效期。</p>
          ${data.assistants.map((assistant,i)=>`<fieldset class="desktop-assistant" data-assistant-index="${i}"><legend>助理 ${i+1}</legend>
            <div class="desktop-field-row">
              ${input('assistant-name','姓名',assistant.name,disabled)}${input('assistant-phone','手机号',edit?assistant.phone:M.mask(assistant.phone),`type="tel" ${disabled}`)}
            </div><label class="desktop-check"><input type="checkbox" name="contract" ${assistant.contract?'checked':''} ${disabled}>单独委托合同管理</label>
            <div class="desktop-field-row">${input('assistant-start','合同委托开始',assistant.start,`type="date" ${disabled}`)}${input('assistant-end','合同委托结束',assistant.end,`type="date" ${disabled}`)}</div>
            ${edit?`<button type="button" class="link" data-remove-assistant="${i}">移除委托</button>`:''}
          </fieldset>`).join('')||'<p class="a0-note">暂无助理委托</p>'}
          ${edit?`<button class="secondary" type="button" data-add-assistant>添加助理</button>`:''}
          ${edit&&c.assistantWork?.length?`<h3>助理提交的资料</h3>${c.assistantWork.map(work=>`<div class="desktop-assistant"><strong>${h(work.title)}</strong><p class="a0-note">${h(work.scope)} · ${h(work.origin)}</p><p>${h(work.note)}</p>${work.file?`<button type="button" class="link" data-assistant-file="${h(work.id)}">查看附件</button>`:''}</div>`).join('')}`:''}
        </section>
        <section class="setup-panel desktop-setup-actions">${error('desktop-roster-error')}<div class="work-buttons">
          ${edit?`<button class="primary" name="finish" value="yes">完成本项</button><button class="secondary" name="finish" value="no">保存草稿</button>`:''}${back}</div></section>
      </form></div>`;
  }
  function bindRoster(){
    const form=$('#desktop-roster-form'),c=A0.activeCommittee();
    if(!form||!A0.store.canManage(A0.phone(),c))return;
    const data=rosterData(c);
    const fail=e=>showError('desktop-roster-error',e.message);
    function update(){
      for(const row of form.querySelectorAll('[data-roster-index]')){
        const m=data.members[row.dataset.rosterIndex];
        if(m.inactiveAt)continue;
        m.name=row.querySelector('[name=member-name]').value.trim();
        m.post=row.querySelector('[name=member-post]').value.trim();
        if(!m.accountPhone&&!m.inactiveAt&&m.role!=='候补委员')m.phone=row.querySelector('[name=member-phone]').value.trim();
      }
      for(const row of form.querySelectorAll('[data-duty-index]')){
        const duty=data.assignments[row.dataset.dutyIndex];
        duty.owner=row.querySelector('[name=owner]').value;
        duty.helpers=[...row.querySelectorAll('[name=helper]:checked')].map(x=>x.value).filter(id=>id!==duty.owner);
        row.querySelectorAll('[name=helper]').forEach(box=>{box.disabled=box.value===duty.owner;if(box.disabled)box.checked=false;});
      }
      for(const row of form.querySelectorAll('[data-assistant-index]')){
        Object.assign(data.assistants[row.dataset.assistantIndex],{
          name:row.querySelector('[name=assistant-name]').value,phone:row.querySelector('[name=assistant-phone]').value,
          contract:row.querySelector('[name=contract]').checked,start:row.querySelector('[name=assistant-start]').value,end:row.querySelector('[name=assistant-end]').value
        });
      }
    }
    function persist(finish){
      update();
      A0.store.saveRoster(A0.phone(),c.id,data,finish);
      rosterDrafts.delete(c.id+':'+A0.phone());
      render();
      toast(finish?'名单与分工已确认':'名单与分工已保存');
    }
    form.oninput=update;
    form.onclick=e=>{
      const button=e.target.closest('button[type=button]');
      if(!button)return;
      update();
      try{
        if('assistantFile' in button.dataset){
          A0.previewFile(c.assistantWork.find(work=>work.id===button.dataset.assistantFile)?.file);
          return;
        }
        if('addMember' in button.dataset)data.members.push({id:A0Model.uid(),role:'委员',name:'',phone:'',post:'委员',new:true});
        else if('dropMember' in button.dataset){
          const [removed]=data.members.splice(+button.dataset.dropMember,1);
          for(const row of data.assignments){if(row.owner===removed.id)row.owner='';row.helpers=row.helpers.filter(id=>id!==removed.id);}
        }else if('savePhone' in button.dataset){
          const m=data.members[+button.dataset.savePhone];
          A0.store.saveRosterPhone(A0.phone(),c.id,m.id,m.phone);
          toast('手机号已保存');return;
        }else if('addDuty' in button.dataset){
          const duty=form.elements['custom-duty'].value.trim();
          if(!duty||data.assignments.some(row=>row.duty===duty))throw Error('请填写未使用的分工名称');
          data.assignments.push({duty,owner:'',helpers:[]});
        }else if('addAssistant' in button.dataset){
          if(data.assistants.length===3)throw Error('最多可设置 3 名助理');
          data.assistants.push({id:A0Model.uid(),name:'',phone:'',contract:false,start:'',end:''});
        }else if('removeAssistant' in button.dataset)data.assistants.splice(+button.dataset.removeAssistant,1);
        else return;
        render();
      }catch(error){fail(error);}
    };
    form.onsubmit=e=>{e.preventDefault();try{persist(e.submitter?.value==='yes');}catch(error){fail(error);}};
  }
  const accountDrafts=new Map();
  const blankAccount=()=>({step:0,values:{checks:{},online:'待核实',income:[],expenses:[]}});
  function accountDraft(c){
    const key=c.id+':'+A0.phone();
    if(!accountDrafts.has(key))accountDrafts.set(key,blankAccount());
    return accountDrafts.get(key);
  }
  const receiptLabel=kind=>kind===M.credentials[2]?'核准号':kind===M.credentials[1]?'专用存款账户编号':kind===M.credentials[0]?'基本存款账户编号':'账户编号（备查）';
  const steps=['账户凭证','账户信息','账期与期初','科目与预算'];
  const memberOptions=(c,selected)=>option('','请选择经办人',selected)+c.members.filter(m=>m.role!=='候补委员'&&!m.inactiveAt).map(m=>option(m.id,m.name,selected)).join('');
  function accountReview(key,label,value){
    return `<div class="desktop-account-review">${input(key,label,value[key],`${key==='number'?'inputmode="numeric"':''} ${value.readOnly?.[key]?'readonly':''}`)}
      ${value.credential?`<div class="desktop-review-actions">
        <button class="secondary" type="button" data-account-check="${key}" aria-pressed="false">核对</button>
        ${value.readOnly?.[key]?`<button class="link" type="button" data-account-edit="${key}">修改</button>`:''}
        </div>`:''}</div>`;
  }
  function accountHTML(model){
    const c=A0.activeCommittee(),missing=M.missingPrereqs(c);
    if(missing.length)return blocked('第 7 件 · 建账',missing);
    const data=model.read(),account=data.account;
    const accountEvents=data.events.filter(event=>event.action==='建账字段修改'||event.action==='完成建账');
    const can=M.canAccount(c,A0.membership()?.member,A0.phone());
    if(account)return `<div class="workspace work-page">${heading('第 7 件 · 建账')}
      <section class="setup-panel desktop-setup-form">
      <div class="desktop-section-head"><h2>共有资金账户</h2><span class="tag setup-done">已建账</span></div>
      <dl class="a0-summary"><dt>开户银行</dt><dd>${h(account.bank)}</dd><dt>账户名称</dt><dd>${h(account.name)}</dd>
      <dt>账号</dt><dd>${h(M.mask(account.number))}</dd><dt>账期起始</dt><dd>${h(account.start)}</dd>
      <dt>期初余额</dt><dd>¥ ${(account.openingCents/100).toFixed(2)}</dd>
      <dt>账户凭证</dt><dd>${account.archiveId?`<a class="link" href="${PageRoutes.url('work',{moduleId:'A2',tab:'档案',selected:account.archiveId})}">查看证照与资质（ZZ）档案</a>`:'待补账户备案凭证'}</dd></dl>
      ${can&&accountEvents.length?`<details class="work-deferred"><summary>建账操作日志</summary>${accountEvents.slice().reverse().map(event=>`<p class="a0-note">${h(event.action)} · ${h(M.mask(event.actor))} · ${h(new Date(event.at).toLocaleString('zh-CN'))}${event.details?.label?` · ${h(event.details.label)}：${h(event.details.before||'空白')} → ${h(event.details.after||'空白')}`:''}</p>`).join('')}</details>`:''}
      <div class="work-buttons"><a class="primary" href="${PageRoutes.url('work',{moduleId:'A7',tab:'流水账'})}">查看流水账</a>${back}</div>
      </section></div>`;
    if(!can)return `<div class="workspace work-page">${heading('第 7 件 · 建账')}<section class="setup-panel">由主任、副主任或「财务与账目」主办完成建账。</section></div>`;
    const {step,values:v}=accountDraft(c);
    return `<div class="workspace work-page">${heading('第 7 件 · 建账')}
      <section class="setup-panel desktop-setup-form"><ol class="desktop-wizard-steps">${steps.map((label,i)=>`<li ${i===step?'aria-current="step"':''} class="${i<step?'complete':''}"><span>${i<step?'✓':i+1}</span>${label}</li>`).join('')}</ol>
      <form id="desktop-account-form" novalidate>
        <h2>${steps[step]}</h2>
        ${step===0?`<p>传上来自动识别，也可以自己输入账户信息</p><p class="a0-note">支持基本存款账户信息、专用存款账户信息和开户许可证。本地上传请对照原件填写，示例可体验识别结果。</p>
          <label class="a0-upload"><strong>${h(v.credential?.name||'选择账户备案凭证')}</strong><span>PDF，最多 20 MB</span><input id="desktop-account-file" type="file" accept=".pdf,application/pdf" aria-label="账户备案凭证"></label>
          ${v.credential?`<label class="a0-field">${v.kind?'凭证类型':'未识别到凭证类型，请选择'}<select name="kind">${option('','选择类型',v.kind)}${M.credentials.map(kind=>option(kind,kind,v.kind)).join('')}</select></label>`:`<label class="a0-field">演示凭证<select id="desktop-account-example">${option('','选择要载入的示例','')}${M.credentials.map(kind=>option(kind,kind,'')).join('')}</select></label>`}`
        :step===1?`<p class="a0-note">账户名称按「业主大会名称 ＋ 业主共有资金」核对。开户日只作档案信息。</p>
          ${v.credential?`<p class="a0-note" data-account-progress></p>${!v.credential.demo?'<p class="a0-note">未从原件读到可靠数据，待核项请对照原件填写。</p>':''}`:''}
          <div class="desktop-field-row">${M.accountFields.map(([key,label])=>accountReview(key,label,v)).join('')}
          ${accountReview('receipt',receiptLabel(v.kind),v)}
          <label class="a0-field">网银开通<select name="online">${['已开通','未开通','待核实'].map(x=>option(x,x,v.online)).join('')}</select></label>
          ${input('opened','开户日期（仅作档案信息）',v.opened,'type="date"')}</div>`
        :step===2?`<p class="a0-note">期初余额与起始日期证上没有。账期按手动录入的起始日期计算。</p>
          <div class="desktop-field-row">${input('start','起始日期',v.start,'type="date"')}${input('opening','期初余额（元，可填 0）',v.opening,'inputmode="decimal"')}
          <label class="a0-field">经办人<select name="handler">${memberOptions(c,v.handler)}</select></label></div>`
        :`<p class="a0-note">每行填写一个科目。当地法规无预算要求时可选择不需要。</p><div class="desktop-field-row">
          ${[['income','收入科目'],['expenses','支出科目']].map(([key,label])=>`<label class="a0-field">${label}<textarea name="${key}" rows="5">${h(v[key].join('\n'))}</textarea></label>`).join('')}
          <label class="a0-field">是否编制预算<select name="budget">${option('','请选择',v.budget)}${option('required','需要编制',v.budget)}${option('optional','不需要编制',v.budget)}</select></label></div>`}
        ${error('desktop-account-error')}<div class="work-buttons">
        <button class="primary" type="submit">${step===0&&!v.credential?'跳过上传 · 手动填写六项':step===3?'完成本项':'下一步'}</button>
        ${step===0&&v.credential?'<button class="secondary" type="button" data-clear-account-file>移除凭证</button>':''}
        ${step>0?'<button class="secondary" type="button" data-account-back>上一步</button>':back}
        </div>
      </form></section></div>`;
  }
  function bindAccount(model,saveFile){
    const form=$('#desktop-account-form');
    if(!form)return;
    const c=A0.activeCommittee(),draft=accountDraft(c),v=draft.values;
    const fail=message=>{showError('desktop-account-error',message);$('#desktop-account-error').classList.remove('desktop-review-note');};
    const reviewKeys=[...M.accountFields.map(([key])=>key),'receipt'];
    function updateReview(){
      const status=form.querySelector('[data-account-progress]');
      if(!status)return;
      status.textContent=`已核 ${reviewKeys.filter(key=>confirmed(key)).length} / 4`;
      for(const button of form.querySelectorAll('[data-account-check]')){
        const key=button.dataset.accountCheck,done=confirmed(key);
        button.setAttribute('aria-pressed',String(done));
        button.textContent=done?'✓ 已核':v.edited?.[key]?'已改 · 待核':'待核';
        button.classList.toggle('desktop-low-confidence',!done&&!v.credential?.demo);
      }
    }
    const confirmed=key=>v.checks[key]===M.checkValue([key],v);
    const previous=Object.fromEntries(reviewKeys.map(key=>[key,v[key]||'']));
    function resetFile(){
      for(const key of ['credential','bank','name','number','kind','receipt','opened','readOnly','edited'])delete v[key];
      v.checks={};
    }
    form.oninput=e=>{
      const field=e.target,key=field.name;
      if(!key)return;
      const value=field.value.trim();
      v[key]=['income','expenses'].includes(key)?value.split(/[\n、；;]+/).map(M.clean).filter(Boolean):value;
      if(reviewKeys.includes(key)&&v.checks[key]&&!confirmed(key)){delete v.checks[key];(v.edited||={})[key]=true;}
      if(key==='kind')delete v.checks.receipt;
      if(value)field.removeAttribute('aria-invalid');
      updateReview();
    };
    form.onchange=e=>{
      const key=e.target.name;
      if(!reviewKeys.includes(key)||!v.credential||v[key]===previous[key])return;
      try{
        model.logDesktopAccountChange(key,previous[key],v[key],receiptLabel(v.kind));
        previous[key]=v[key];
      }catch(error){fail(error.message);}
    };
    function focusNext(except){
      const next=form.querySelector(`[data-account-check]:not([data-account-check="${except}"])[aria-pressed="false"]`);
      if(next){
        const label=[...M.accountFields,['receipt',receiptLabel(v.kind)]].find(([key])=>key===next.dataset.accountCheck)[1];
        next.focus();
        showError('desktop-account-error','改过了 · 回到待核 —— 下一处：「'+label+'」');
        $('#desktop-account-error').classList.add('desktop-review-note');
      }else{
        showError('desktop-account-error','已改 · 待核，其它项都核过了');
        $('#desktop-account-error').classList.add('desktop-review-note');
      }
    }
    form.onclick=e=>{
      const button=e.target.closest('button');
      if(!button)return;
      if('accountBack' in button.dataset){draft.step--;render();}
      if('clearAccountFile' in button.dataset){resetFile();render();}
      if('accountCheck' in button.dataset){
        const key=button.dataset.accountCheck;
        if(confirmed(key))delete v.checks[key];
        else if(!v[key]&&key!=='receipt'){fail('请先填写'+M.accountFields.find(([id])=>id===key)[1]);form.elements[key].focus();return;}
        else v.checks[key]=M.checkValue([key],v);
        fail('');updateReview();
      }
      if('accountEdit' in button.dataset){
        const key=button.dataset.accountEdit,field=form.elements[key];
        if(field.readOnly){
          field.readOnly=false;button.textContent='保存修改';field.focus();
        }else{
          field.readOnly=true;button.textContent='修改';
          if(v.edited?.[key])focusNext(key);
        }
      }
    };
    const example=$('#desktop-account-example');
    if(example)example.onchange=()=>{
      if(!example.value)return;
      resetFile();
      Object.assign(v,{kind:example.value,credential:{key:'demo-account-'+A0Model.uid(),name:example.value+'（示例）.pdf',type:'application/pdf',demo:true},
        bank:'青禾银行示例支行',name:c.fields.name+'业主大会业主共有资金',number:'6210000000011120',receipt:'DEMO-1120',opened:'2024-06-12',
        readOnly:{bank:true,name:true,number:true}});
      render();
    };
    const file=$('#desktop-account-file');
    let busy=false;
    if(file)file.onchange=async()=>{
      const upload=file.files[0];
      if(!upload||busy)return;
      busy=true;
      try{
        if(upload.type!=='application/pdf'||await upload.slice(0,5).text()!=='%PDF-')throw Error('请上传有效的 PDF 凭证');
        const credential=await saveFile(upload);
        resetFile();
        v.credential=credential;v.kind=M.credentials.find(kind=>upload.name.includes(kind))||'';
        render();
      }catch(e){fail(e.message);}
      finally{busy=false;}
    };
    form.onsubmit=e=>{
      e.preventDefault();
      if(busy)return;
      try{
        if(draft.step===2){
          const missing=[['start','起始日期'],['opening','期初余额'],['handler','经办人']].filter(([key])=>!v[key]);
          if(missing.length)throw Error('缺少'+missing.map(([,label])=>'「'+label+'」').join('、')+'。先填「'+missing[0][1]+'」。');
        }
        M.validateAccountStep(draft.step,v,c);
        if(draft.step<3){draft.step++;render();document.querySelector('#desktop-account-form h2')?.scrollIntoView({block:'nearest'});return;}
        model.saveDesktopAccount(v);accountDrafts.delete(c.id+':'+A0.phone());render();toast('共有资金账套已建立');
      }catch(e){
        fail(e.message);
        const relevant=draft.step===1?['bank','name','number']:draft.step===2?['start','opening','handler']:[];
        const first=relevant.find(key=>!v[key]);
        if(first){form.elements[first].setAttribute('aria-invalid','true');form.elements[first].focus();}
      }
    };
    updateReview();
  }
  function bind(model,saveFile){
    document.querySelectorAll('[data-desktop-go]').forEach(button=>button.onclick=()=>go(button.dataset.desktopGo));
    if($('#desktop-roster-form')){
      bindRoster();
      if(sessionStorage.getItem('zhilin-open-assistants')===A0.activeCommittee().id){
        sessionStorage.removeItem('zhilin-open-assistants');
        $('#desktop-assistant-section')?.scrollIntoView({block:'start'});
      }
    }
    if($('#desktop-account-form'))bindAccount(model,saveFile);
    if($('#desktop-member-changes'))bindMemberChanges();
  }
  function changesHTML(){
    const c=A0.activeCommittee(),edit=A0.store.canManage(A0.phone(),c);
    if(!c.filingReview?.confirmedAt)return blocked('委员变动单',[['filing','第 1 件《备案记录表》']]);
    const choices=c.members.filter(m=>m.role==='委员'&&!m.inactiveAt);
    return `<div class="workspace work-page">${heading('委员变动单')}
      <div class="work-buttons"><a class="secondary" href="${PageRoutes.url('work',{moduleId:'A17',tab:'名单与分工'})}">返回名单与分工</a></div>
      <section class="setup-panel desktop-setup-form" id="desktop-member-changes">
        <h2>变动记录</h2>
        ${(c.rosterChanges||[]).slice().reverse().map(change=>`<div class="setup-row"><div><strong>${h(change.kind)} · ${h(change.name)}</strong>
          <p>拟生效日 ${h(change.effective)} · ${h(change.basis)}</p><small>会议结论：${h(change.conclusion)}</small></div>
          <span class="tag ${change.status==='已生效'?'setup-done':''}">${change.status}</span><div class="work-buttons">
            <button class="link" data-change-file="${h(change.id)}">依据附件</button>
            ${edit&&change.status==='待核对'?`<button class="secondary" data-apply-change="${h(change.id)}">核对并生效</button>`:''}
          </div></div>`).join('')||'<p class="a0-note">暂无委员变动。</p>'}
        ${error('desktop-change-error')}
        ${edit?`<details class="work-deferred"><summary>登记委员变动</summary>
        <form id="desktop-change-form">
          <div class="desktop-field-row">
          <label class="a0-field">变动类型<select name="kind">${['补选','辞职','资格终止'].map(x=>option(x,x)).join('')}</select></label>
          <label class="a0-field" id="desktop-change-member" hidden>委员<select name="memberId">
            ${option('','请选择委员')}${choices.map(m=>option(m.id,m.name)).join('')}</select></label>
          ${input('name','补选委员姓名','','maxlength="30"')}${input('effective','拟生效日','','type="date" required')}
          </div>
          <label class="a0-field">变动依据<textarea name="basis" required rows="2"></textarea></label>
          <label class="a0-field">会议结论<textarea name="conclusion" required rows="2"></textarea></label>
          <label class="a0-field">依据附件<input type="file" name="evidence" accept=".pdf,application/pdf" required></label>
          <button class="primary">提交核对</button>
        </form></details>`:''}
      </section></div>`;
  }
  function bindMemberChanges(){
    const c=A0.activeCommittee();
    const panel=$('#desktop-member-changes'),form=$('#desktop-change-form');
    panel.onclick=e=>{
      const b=e.target.closest('button');
      if(!b)return;
      if(b.dataset.changeFile)A0.previewFile(c.rosterChanges.find(row=>row.id===b.dataset.changeFile)?.file);
      if(b.dataset.applyChange){
        try{
          A0.store.applyRosterChange(A0.phone(),c.id,b.dataset.applyChange);
          rosterDrafts.delete(c.id+':'+A0.phone());render();toast('委员变动已生效');
        }catch(error){showError('desktop-change-error',error.message);}
      }
    };
    if(!form)return;
    form.elements.kind.onchange=()=>{
      const adding=form.elements.kind.value==='补选';
      $('#desktop-change-member').hidden=adding;
      form.elements.name.closest('label').hidden=!adding;
    };
    form.onsubmit=async e=>{
      e.preventDefault();
      const button=form.querySelector('button');
      if(button.disabled)return;
      button.disabled=true;
      try{
        const data=new FormData(form);
        const file=await storeFilingFile(data.get('evidence'),M.materials[0],A0.putFile);
        A0.store.submitRosterChange(A0.phone(),c.id,{...Object.fromEntries(data),file});
        render();toast('变动单已提交核对');
      }catch(error){showError('desktop-change-error',error.message);}
      finally{button.disabled=false;}
    };
  }
  function assistantHTML(entry){
    if(!entry)return `<main class="a0-content narrow"><h1>助理委托已结束</h1><button class="secondary" data-signout>返回登录</button></main>`;
    const {committee:c,assistant:a}=entry,scopes=A0.store.assistantScopes(a);
    const submitted=(c.assistantWork||[]).filter(work=>work.assistantId===a.id);
    return `<main class="a0-content desktop-intake">
      <div class="desktop-section-head"><div><h1>助理工作台</h1><p>${h(a.name)} · 助理 · 第 ${h(c.fields.term)} 届</p></div><button class="secondary" data-signout>切换账号</button></div>
      <section class="setup-panel desktop-setup-form">
        <h2>提交受托工作资料</h2>
        <form id="desktop-assistant-work">
          <div class="desktop-field-row"><label class="a0-field">委托工作<select name="scope">${scopes.map(scope=>option(scope,scope)).join('')}</select></label>
          ${input('title','标题','','required maxlength="120"')}</div>
          <label class="a0-field">办理说明<textarea name="note" rows="4" required></textarea></label>
          <label class="a0-field">附件（可选）<input name="file" type="file" accept=".pdf,application/pdf"></label>
          ${error('desktop-assistant-error')}
          <button class="primary">提交给业委会</button>
        </form>
      </section>
      <section class="setup-panel desktop-setup-form"><h2>已提交资料</h2>
        ${submitted.map(work=>`<div class="desktop-assistant"><strong>${h(work.title)}</strong><p class="a0-note">${h(work.scope)} · ${h(work.origin)}</p><p>${h(work.note)}</p></div>`).join('')||'<p class="a0-note">暂无提交记录。</p>'}
      </section>
    </main>`;
  }
  function bindAssistant(entry,rerender){
    const form=$('#desktop-assistant-work');
    if(!form||!entry)return;
    form.onsubmit=async event=>{
      event.preventDefault();
      const button=form.querySelector('button');
      if(button.disabled)return;
      button.disabled=true;
      try{
        const data=new FormData(form),file=data.get('file');
        const attachment=file?.size?await storeFilingFile(file,M.materials[0],A0.putFile):null;
        A0.store.submitAssistant(A0.phone(),entry.committee.id,{scope:data.get('scope'),title:data.get('title'),note:data.get('note'),file:attachment});
        rerender();toast('资料已提交给业委会');
      }catch(e){showError('desktop-assistant-error',e.message);}
      finally{button.disabled=false;}
    };
  }
  function propertyHint(){
    const c=A0.activeCommittee();
    if(!A0.store.canManage(A0.phone(),c)||c.setupRoster?.assistants?.length)return;
    const key='zhilin-assistant-hint-'+c.id+'-'+A0.phone();
    if(localStorage.getItem(key))return;
    localStorage.setItem(key,'seen');
    drawer('物业合同可委托助理协办',`<div class="desktop-setup-form">
      <ul><li>助理可代为整理和提交办理资料。</li><li>每届最多设置 3 名助理。</li><li>添加后须单独委托「合同管理」，并填写有效期。</li></ul>
      <p class="a0-note">也可以由业委会自行办理。</p>
      <div class="work-buttons"><button class="primary" id="desktop-add-helper">去添加助理</button><button class="secondary" id="desktop-skip-helper">我自己来</button></div></div>`);
    $('#desktop-add-helper').onclick=()=>{
      closeDrawer();
      sessionStorage.setItem('zhilin-open-assistants',c.id);
      Work.navigate('A17','名单与分工');
    };
    $('#desktop-skip-helper').onclick=()=>closeDrawer();
  }
  function go(id){
    if(id==='filing')openFiling();
    if(id==='members')Work.navigate('A17','名单与分工');
    if(id==='accounts')Work.navigate('A7','建账');
  }
  return {enabled,propertyHint,changesHTML,assistantHTML,bindAssistant,uploadHTML,bootstrapHTML,pendingHTML,bindOnboarding,rosterHTML,accountHTML,bind,go};
})();
