/* Local prototype model. This is not a production authentication service. */
(function(root){
  const setup=typeof module!=='undefined'?require('./desktop-setup-model.js'):root.DesktopSetupModel;
  const KEY='zhilin-a0-v1';
  const clean=v=>String(v??'').trim();
  const phoneValid=v=>/^1[3-9]\d{9}$/.test(clean(v));
  const required={name:'小区名称',committeeName:'业委会名称',province:'省份',city:'城市',district:'区 / 县',street:'街道 / 乡镇',neighborhood:'社区 / 村',address:'小区地址',term:'届次',start:'任期开始日期',end:'任期结束日期'};
  const uid=()=>typeof crypto!=='undefined'&&crypto.randomUUID?crypto.randomUUID():Date.now().toString(36)+Math.random().toString(36).slice(2);
  function create(storage,clock=()=>Date.now()){
    let data;try{data=JSON.parse(storage.getItem(KEY)||'null')}catch{}
    if(!data||data.version!==1)data={version:1,accounts:{},drafts:{},committees:[]};
    for(const c of data.committees){if(!c.status)c.status='pending'}
    const challenges=new Map();
    const verified=new Set();
    const leader=m=>m&&['主任','副主任'].includes(m.role);
    const current=c=>!c.fields.end||c.fields.end>=new Date(clock()).toISOString().slice(0,10);
    const log=(c,action,actor,details={})=>(c.audit||(c.audit=[])).push({action,actor,at:clock(),...structuredClone(details)});
    function canManage(phone,c){return !!c&&current(c)&&c.members.some(m=>m.phone===phone&&m.accountPhone===phone&&!m.inactiveAt&&leader(m))}
    function save(){storage.setItem(KEY,JSON.stringify(data))}
    function profile(phone){return data.accounts[phone]||null}
    function updateProfile(phone,values){if(!phoneValid(phone))throw Error('请输入正确的 11 位手机号');if(!clean(values.name))throw Error('请填写姓名');data.accounts[phone]={...data.accounts[phone],name:clean(values.name),residence:clean(values.residence),phone};save();return profile(phone)}
    function draft(phone){if(!data.drafts[phone])data.drafts[phone]={id:uid(),step:'upload',fields:{},members:[],selfId:'',asClerk:false,file:null};return data.drafts[phone]}
    function patchDraft(phone,patch){Object.assign(draft(phone),patch);save();return draft(phone)}
    function sendCode(phone){phone=clean(phone);if(!phoneValid(phone))throw Error('请输入正确的 11 位手机号');const old=challenges.get(phone);if(old&&clock()-old.sentAt<60000)throw Error('请稍后重新获取验证码');const code=String(100000+Math.floor(Math.random()*900000));challenges.set(phone,{code,sentAt:clock(),attempts:0,used:false});return code}
    function verifyCode(phone,code){phone=clean(phone);const c=challenges.get(phone);if(!c||c.used)throw Error('请先获取验证码');if(clock()-c.sentAt>300000)throw Error('验证码已过期，请重新获取');if(c.attempts>=5)throw Error('尝试次数过多，请重新获取验证码');c.attempts++;if(c.code!==clean(code))throw Error('验证码不正确');c.used=true;verified.add(phone);return phone}
    function matches(phone){const found=[];for(const committee of data.committees){const eligible=committee.members.filter(m=>m.phone===phone&&!m.inactiveAt);
      const member=eligible.find(m=>m.role!=='候补委员')||eligible[0];if(member)found.push({committee,member,role:member.role});}return found}
    function committee(id){return data.committees.find(c=>c.id===id)||null}
    function validateFields(f){for(const [k,label] of Object.entries(required))if(!clean(f[k]))throw Error('请填写'+label);if(!/^\d{1,2}$/.test(clean(f.term))||+f.term<1)throw Error('届次请填写 1–99 的数字');if(!/^\d{4}-\d{2}-\d{2}$/.test(f.start)||!/^\d{4}-\d{2}-\d{2}$/.test(f.end)||f.end<=f.start)throw Error('任期结束日期须晚于开始日期');return true}
    function validateMembers(members){if(members.filter(m=>m.role==='主任').length!==1)throw Error('名册须有且仅有一位主任');const chief=members.find(m=>m.role==='主任');if(members.some(m=>m.role==='副主任'&&clean(m.name)===clean(chief.name)))throw Error('主任与副主任不能是同一人');const numbers=new Set();for(const m of members){if(!clean(m.name))throw Error('请填写成员姓名');if(!['主任','副主任','委员','候补委员'].includes(m.role))throw Error('请选择成员职务');if(m.phone){if(!phoneValid(m.phone))throw Error(m.name+'的手机号格式不正确');if(numbers.has(m.phone))throw Error('同一届成员的手机号不能重复');numbers.add(m.phone)}}return true}
    function createCommittee(phone,{desktop=false}={}){const d=draft(phone),p=profile(phone);if(d.committedId)return committee(d.committedId);if(!desktop&&!p)throw Error('请先完善个人信息');if(!d.file)throw Error('请上传备案表或使用示例备案表');validateFields(d.fields);validateMembers(d.members);
      if(desktop){
        if(!verified.has(phone))throw Error('请重新验证登录手机号');
        setup.validateFiling(d.fields,d.checks||{},d.file,d.materialKind,d.stamped);
        checkLeaders(d.fields,d.members);
      }const f=d.fields;const same=data.committees.find(c=>(clean(f.filingNo)&&clean(c.fields.filingNo)===clean(f.filingNo))||(c.fields.name===f.name&&c.fields.district===f.district&&c.fields.street===f.street));if(same)throw Error(String(same.fields.term)!==String(f.term)?'该小区已有档案，新一届请走换届流程（后续模块）':'该业委会已建档或正在确认，请联系主任补录手机号后登录加入');if(!desktop&&!d.asClerk){const self=d.members.find(m=>m.id===d.selfId);if(!self)throw Error('请确认你在名册中的身份');if(clean(self.name)!==p.name)throw Error('本人姓名与名册不一致，请核对个人信息或成员姓名');if(self.phone!==phone)throw Error('本人手机号须与当前登录账号一致')}
      if(!d.members.some(m=>leader(m)&&phoneValid(m.phone)))throw Error('请至少填写一位主任或副主任的手机号，以便确认建档');
      const c={status:'pending',materialKind:d.materialKind||'备案表',audit:[],id:uid(),fields:structuredClone(d.fields),members:structuredClone(d.members),file:structuredClone(d.file),createdBy:phone,createdAt:clock()};
      if(desktop)c.filingReview={checks:structuredClone(d.checks),stamped:!!d.stamped,changes:structuredClone(d.changes||[])};
      if(!desktop&&!d.asClerk){const self=c.members.find(m=>m.id===d.selfId);self.accountPhone=phone;self.boundAt=clock()}
      log(c,'提交建档',phone,{snapshot:{fields:c.fields,members:c.members,file:c.file}});data.committees.push(c);d.committedId=c.id;d.step='done';save();return c;
    }
    function enter(phone,id){const match=matches(phone).find(m=>m.committee.id===id);if(!match)throw Error('当前手机号未关联该业委会');if(!current(match.committee))throw Error('本届任期已结束，请联系负责人办理换届');const p=profile(phone);if(match.member){if(p&&p.name!==match.member.name)throw Error('个人姓名与备案成员姓名不一致，请联系建档人员核对');if(!p)data.accounts[phone]={phone,name:match.member.name,residence:''};match.member.accountPhone=phone;match.member.boundAt=clock();log(match.committee,'认领身份',phone);save()}return match}
    function checkLeaders(fields,members){
      for(const [role,key] of [['主任','chairName'],['副主任','viceName']]){
        const list=members.filter(m=>m.role===role);
        const expected=fields[key]==='无'?[]:[fields[key]];
        if(list.length!==expected.length||list.some((m,i)=>clean(m.name)!==clean(expected[i])))throw Error('请按备案核对'+role+'姓名');
      }
    }
    function claim(phone,id){
      refresh();
      const c=committee(id);
      const seats=c?.members.filter(m=>m.phone===phone&&!m.inactiveAt&&m.role!=='候补委员')||[];
      const seat=seats.length===1?seats[0]:null;
      if(!seat||!current(c))throw Error('这个手机号还不在本届名册里。请主任先在第 2 件补上你的手机号');
      if(seat.accountPhone===phone)return {committee:c,member:seat,role:seat.role};
      if(!verified.has(phone))throw Error('请重新验证登录手机号后认领');
      if(seat.accountPhone)throw Error('这个席位已认领，请联系主任核对');
      data.accounts[phone]={phone,name:seat.name,residence:data.accounts[phone]?.residence||''};
      seat.accountPhone=phone;seat.boundAt=clock();log(c,'认领身份',phone);save();
      return {committee:c,member:seat,role:seat.role};
    }
    function reviewFiling(actor,id,input){
      refresh();
      const c=committee(id);
      if(!canManage(actor,c))throw Error('请由本届主任或副主任认领后核对');
      const {fields,checks,stamped,file=c.file,materialKind=c.materialKind,reason,changes=[]}=input;
      const next={...c.fields,...fields,committeeName:c.fields.committeeName||fields.name+'业主委员会'};
      validateFields(next);
      setup.validateFiling(next,checks,file,materialKind,stamped);
      checkLeaders(next,c.members);
      const before={fields:c.fields,file:c.file,materialKind:c.materialKind};
      const changed=JSON.stringify(before)!==JSON.stringify({fields:next,file,materialKind});
      if(c.filingReview?.confirmedAt&&changed&&!clean(reason))throw Error('请填写信息更正原因');
      if(c.filingReview?.confirmedAt&&changed&&['term','start','end'].some(key=>next[key]!==c.fields[key]))throw Error('届次或任期更正须走重新备案流程');
      c.fields=next;c.file=file;c.materialKind=materialKind;
      c.filingReview={checks:structuredClone(checks),stamped:!!stamped,changes:structuredClone(changes),confirmedAt:clock(),confirmedBy:actor};
      if(c.status!=='active'){c.status='active';c.confirmedAt=clock();c.confirmedBy=actor;c.ledgers||={funds:[],archives:[],seals:[]}}
      log(c,changed&&reason?'备案信息更正':'十二项核对确认',actor,{before,after:{fields:next,file,materialKind},reason:clean(reason),classification:clean(input.classification)});
      save();return c;
    }
    function assistantMatches(phone){
      return data.committees.filter(c=>c.status==='active'&&current(c)).flatMap(c=>
        (c.setupRoster?.assistants||[]).filter(a=>a.phone===phone).map(assistant=>({committee:c,assistant})));
    }
    function claimAssistant(phone,id){
      refresh();
      const entry=assistantMatches(phone).find(x=>x.committee.id===id);
      if(!entry||!verified.has(phone))throw Error('请重新验证委托手机号');
      const {committee:c,assistant}=entry;
      if(!assistant.claimedAt){
        assistant.claimedAt=clock();
        log(c,'认领助理委托',phone);
        save();
      }
    }
    function assistantScopes(assistant){
      const today=new Date(clock()).toISOString().slice(0,10);
      return [...setup.scopes,...(assistant.contract&&assistant.start<=today&&today<=assistant.end?['合同管理']:[])];
    }
    function submitAssistant(phone,id,input){
      refresh();
      const entry=assistantMatches(phone).find(x=>x.committee.id===id&&x.assistant.claimedAt);
      if(!entry||!assistantScopes(entry.assistant).includes(input.scope))throw Error('当前委托不包含该工作');
      const title=clean(input.title),note=clean(input.note);
      if(!title||!note)throw Error('请填写标题和办理说明');
      const c=entry.committee;
      const work={id:uid(),assistantId:entry.assistant.id,scope:input.scope,title,note,file:input.file||null,origin:'物业报送 · 助理录入',at:clock()};
      (c.assistantWork||=[]).push(work);
      log(c,'助理提交办理资料',phone,{workId:work.id,scope:work.scope});
      save();return work;
    }
    function saveRosterPhone(actor,id,memberId,number){
      refresh();
      const c=committee(id);
      if(!canManage(actor,c))throw Error('仅主任或副主任可以编辑名单与分工');
      if(!c.filingReview?.confirmedAt)throw Error('请先完成第 1 件备案记录表');
      const member=c.members.find(m=>m.id===memberId&&m.role!=='候补委员'&&!m.inactiveAt);
      if(!member||member.accountPhone)throw Error('此席位的手机号不可在此修改');
      const phone=setup.normalizePhone(number);
      setup.validatePhones(c.members.map(m=>m===member?{...m,phone}:m),c.setupRoster?.assistants);
      if(phone===member.phone)return c;
      log(c,'保存成员手机号',actor,{memberId,before:setup.mask(member.phone),after:setup.mask(phone)});
      member.phone=phone;
      if(c.setupRoster&&!phone)c.setupRoster.completedAt=null;
      save();return c;
    }
    function saveRoster(actor,id,input,finish=false){
      refresh();
      const c=committee(id);
      if(!canManage(actor,c))throw Error('仅主任或副主任可以编辑名单与分工');
      if(!c.filingReview?.confirmedAt)throw Error('请先完成第 1 件备案记录表');
      const members=c.members.map(m=>{
        const patch=input.members?.find(row=>row.id===m.id);
        if(!patch)return m;
        const phone=setup.normalizePhone(patch.phone);
        if(m.accountPhone&&phone!==m.phone)throw Error(m.name+'已认领，手机号须走身份更正');
        return {...m,phone,post:clean(patch.post)};
      });
      for(const row of input.members||[]){
        if(members.some(m=>m.id===row.id))continue;
        if(c.setupRoster?.firstCompletedAt||c.setupRoster?.completedAt)throw Error('名单已确认，请通过委员变动单录入新委员');
        if(!clean(row.name))throw Error('请填写新增委员姓名');
        members.push({id:row.id||uid(),name:clean(row.name),role:'委员',phone:setup.normalizePhone(row.phone),post:clean(row.post)});
      }
      const assistants=(input.assistants||[]).map(row=>{
        const phone=setup.normalizePhone(row.phone);
        const previous=c.setupRoster?.assistants?.find(a=>a.id===row.id&&a.phone===phone);
        return {id:row.id||uid(),name:clean(row.name),phone,scopes:[...setup.scopes],contract:!!row.contract,
          start:clean(row.start),end:clean(row.end),...(previous?.claimedAt?{claimedAt:previous.claimedAt}:{})};
      });
      if(assistants.length>3)throw Error('最多可设置 3 名助理');
      for(const row of assistants){
        if(!row.name||!row.phone)throw Error('请填写助理姓名和手机号');
        if(row.contract&&(!setup.isDate(row.start)||!setup.isDate(row.end)||row.end<row.start))throw Error('合同委托须填写有效的起止日期');
      }
      setup.validatePhones(members,assistants);
      const assignments=(input.assignments||[]).map(row=>({duty:clean(row.duty),owner:clean(row.owner),helpers:[...new Set(row.helpers||[])]}));
      const valid=id=>members.some(m=>m.id===id&&m.role!=='候补委员'&&!m.inactiveAt);
      const names=new Set();
      for(const row of assignments){
        if(!row.duty||names.has(row.duty))throw Error('分工名称不能为空或重复');
        if((row.owner&&!valid(row.owner))||row.helpers.some(id=>id===row.owner||!valid(id)))throw Error('主办与协办须为不同的本届正式委员');
        names.add(row.duty);
      }
      if(finish&&members.some(m=>m.role!=='候补委员'&&!m.inactiveAt&&!m.phone))throw Error('请补齐手机号：'+members.filter(m=>m.role!=='候补委员'&&!m.inactiveAt&&!m.phone).map(m=>m.name).join('、'));
      const before=c.setupRoster||{};
      const changed=JSON.stringify({members:c.members,assignments:before.assignments||[],assistants:before.assistants||[]})!==JSON.stringify({members,assignments,assistants});
      const firstCompletedAt=before.firstCompletedAt||before.completedAt||(finish?clock():null);
      c.members=members;
      c.setupRoster={assignments,assistants,firstCompletedAt,completedAt:finish?clock():changed?null:before.completedAt||null,completedBy:finish?actor:changed?null:before.completedBy||null};
      if(members.some(m=>m.role!=='候补委员'&&!m.inactiveAt&&!m.phone))c.setupRoster.completedAt=null;
      log(c,finish?'确认名单与分工':'保存名单与分工',actor,{before,after:c.setupRoster});
      save();return c;
    }
    function submitRosterChange(actor,id,input){
      refresh();
      const c=committee(id);
      if(!canManage(actor,c)||!c.filingReview?.confirmedAt)throw Error('请由主任或副主任在备案确认后登记委员变动');
      const {kind,effective,basis,conclusion,file}=input;
      if(!['补选','辞职','资格终止'].includes(kind)||!setup.isDate(effective)||!clean(basis)||!clean(conclusion)||!file?.key)throw Error('请填写变动类型、拟生效日、依据和会议结论，并上传依据附件');
      const member=c.members.find(m=>m.id===input.memberId&&m.role==='委员'&&!m.inactiveAt);
      const name=kind==='补选'?clean(input.name):member?.name;
      if(!name)throw Error('请选择对应委员，或填写补选委员姓名');
      if(member&&c.rosterChanges?.some(row=>row.memberId===member.id&&row.status==='待核对'))throw Error('这位委员已有待核对的变动单');
      const change={id:uid(),kind,effective,basis:clean(basis),conclusion:clean(conclusion),file:structuredClone(file),name,memberId:member?.id||'',status:'待核对',createdAt:clock()};
      (c.rosterChanges||=[]).push(change);log(c,'提交委员变动单',actor,{changeId:change.id});save();return change;
    }
    function applyRosterChange(actor,id,changeId){
      refresh();
      const c=committee(id);
      if(!canManage(actor,c))throw Error('仅主任或副主任可以确认委员变动');
      const change=c.rosterChanges?.find(row=>row.id===changeId&&row.status==='待核对');
      if(!change)throw Error('没有待核对的变动单');
      if(change.effective>new Date(clock()).toISOString().slice(0,10))throw Error('尚未到拟生效日');
      if(change.kind==='补选'){
        const member={id:uid(),name:change.name,role:'委员',post:'委员',phone:''};
        c.members.push(member);change.memberId=member.id;
        if(c.setupRoster)c.setupRoster.completedAt=null;
      }else{
        const member=c.members.find(m=>m.id===change.memberId&&m.role==='委员'&&!m.inactiveAt);
        if(!member)throw Error('委员已离任，无法重复生效');
        member.inactiveAt=clock();
        for(const row of c.setupRoster?.assignments||[]){
          if(row.owner===member.id)row.owner='';
          row.helpers=row.helpers.filter(helper=>helper!==member.id);
        }
      }
      change.status='已生效';change.appliedAt=clock();log(c,'委员变动生效',actor,{changeId,memberId:change.memberId});save();return change;
    }
    function updatePhones(actor,id,values){const c=committee(id);if(!canManage(actor,c)||c.status==='pending')throw Error('仅已认领的主任或副主任可以补充成员手机号');if(c.filingReview?.confirmedAt)throw Error('请在桌面端名单与分工中维护手机号');const next=c.members.map(m=>{const phone=clean(values[m.id]??m.phone);if(m.accountPhone&&phone!==m.phone)throw Error('已绑定成员的手机号暂不支持修改');return {...m,phone}});validateMembers(next);log(c,'更新手机号',actor,{before:c.members,after:next});c.members=next;save();return c}
    function confirmationText(c){return clean(c.fields.filingNo)?clean(c.fields.filingNo).slice(-6):c.fields.committeeName+' '+c.members.find(m=>m.role==='主任').name}
    function confirmCommittee(actor,id,token){const c=committee(id);if(c?.filingReview&&c.status!=='active')throw Error('请先在桌面端完成十二项核对');if(!canManage(actor,c))throw Error('请由本届主任或副主任认领身份后确认');if(c.status==='active')return c;if(clean(token)!==confirmationText(c))throw Error('确认文字不一致，请核对后输入');validateFields(c.fields);validateMembers(c.members);c.status='active';c.confirmedBy=actor;c.confirmedAt=clock();c.ledgers={funds:[],archives:[],seals:[]};log(c,'确认锁定',actor,{snapshot:{fields:c.fields,members:c.members,file:c.file}});save();return c}
    function requestJoin(actor,name,note){if(!profile(actor))throw Error('请先填写个人姓名');if(!clean(name)||!clean(note))throw Error('请填写业委会名称和申请说明');data.requests=data.requests||[];data.requests.push({id:uid(),actor,name:clean(name),note:clean(note),at:clock(),status:'待核对'});save()}
    function refresh(){try{const next=JSON.parse(storage.getItem(KEY)||'null');if(next?.version===1)data=next}catch{}}
    return {refresh,current,canManage,claim,assistantMatches,claimAssistant,assistantScopes,submitAssistant,reviewFiling,saveRoster,saveRosterPhone,submitRosterChange,applyRosterChange,hasCommittees:()=>data.committees.some(current),confirmationText,confirmCommittee,requestJoin,profile,updateProfile,draft,patchDraft,sendCode,verifyCode,matches,committee,validateFields,validateMembers,createCommittee,enter,updatePhones,save,phoneValid,uid};
  }
  const api={create,phoneValid,uid,required};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.A0Model=api;
})(typeof globalThis!=='undefined'?globalThis:this);
