/* Local prototype model. This is not a production authentication service. */
(function(root){
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
    const leader=m=>m&&['主任','副主任'].includes(m.role);
    const current=c=>!c.fields.end||c.fields.end>=new Date(clock()).toISOString().slice(0,10);
    const log=(c,action,actor,details={})=>(c.audit||(c.audit=[])).push({action,actor,at:clock(),...structuredClone(details)});
    function canManage(phone,c){return !!c&&current(c)&&c.members.some(m=>m.phone===phone&&m.accountPhone===phone&&leader(m))}
    function save(){storage.setItem(KEY,JSON.stringify(data))}
    function profile(phone){return data.accounts[phone]||null}
    function updateProfile(phone,values){if(!phoneValid(phone))throw Error('请输入正确的 11 位手机号');if(!clean(values.name))throw Error('请填写姓名');data.accounts[phone]={...data.accounts[phone],name:clean(values.name),residence:clean(values.residence),phone};save();return profile(phone)}
    function draft(phone){if(!data.drafts[phone])data.drafts[phone]={id:uid(),step:'upload',fields:{},members:[],selfId:'',asClerk:false,file:null};return data.drafts[phone]}
    function patchDraft(phone,patch){Object.assign(draft(phone),patch);save();return draft(phone)}
    function sendCode(phone){phone=clean(phone);if(!phoneValid(phone))throw Error('请输入正确的 11 位手机号');const old=challenges.get(phone);if(old&&clock()-old.sentAt<60000)throw Error('请稍后重新获取验证码');const code=String(100000+Math.floor(Math.random()*900000));challenges.set(phone,{code,sentAt:clock(),attempts:0,used:false});return code}
    function verifyCode(phone,code){phone=clean(phone);const c=challenges.get(phone);if(!c||c.used)throw Error('请先获取验证码');if(clock()-c.sentAt>300000)throw Error('验证码已过期，请重新获取');if(c.attempts>=5)throw Error('尝试次数过多，请重新获取验证码');c.attempts++;if(c.code!==clean(code))throw Error('验证码不正确');c.used=true;return phone}
    function matches(phone){const found=[];for(const committee of data.committees){const member=committee.members.find(m=>m.phone===phone);if(member)found.push({committee,member,role:member.role});}return found}
    function committee(id){return data.committees.find(c=>c.id===id)||null}
    function validateFields(f){for(const [k,label] of Object.entries(required))if(!clean(f[k]))throw Error('请填写'+label);if(!/^\d{1,2}$/.test(clean(f.term))||+f.term<1)throw Error('届次请填写 1–99 的数字');if(!/^\d{4}-\d{2}-\d{2}$/.test(f.start)||!/^\d{4}-\d{2}-\d{2}$/.test(f.end)||f.end<=f.start)throw Error('任期结束日期须晚于开始日期');return true}
    function validateMembers(members){if(members.filter(m=>m.role==='主任').length!==1)throw Error('名册须有且仅有一位主任');const chief=members.find(m=>m.role==='主任');if(members.some(m=>m.role==='副主任'&&clean(m.name)===clean(chief.name)))throw Error('主任与副主任不能是同一人');const numbers=new Set();for(const m of members){if(!clean(m.name))throw Error('请填写成员姓名');if(!['主任','副主任','委员','候补委员'].includes(m.role))throw Error('请选择成员职务');if(m.phone){if(!phoneValid(m.phone))throw Error(m.name+'的手机号格式不正确');if(numbers.has(m.phone))throw Error('同一届成员的手机号不能重复');numbers.add(m.phone)}}return true}
    function createCommittee(phone){const d=draft(phone),p=profile(phone);if(d.committedId)return committee(d.committedId);if(!p)throw Error('请先完善个人信息');if(!d.file)throw Error('请上传备案表或使用示例备案表');validateFields(d.fields);validateMembers(d.members);const f=d.fields;const same=data.committees.find(c=>(clean(f.filingNo)&&clean(c.fields.filingNo)===clean(f.filingNo))||(c.fields.name===f.name&&c.fields.district===f.district&&c.fields.street===f.street));if(same)throw Error(String(same.fields.term)!==String(f.term)?'该小区已有档案，新一届请走换届流程（后续模块）':'该业委会已建档或正在确认，请联系主任补录手机号后登录加入');if(!d.asClerk){const self=d.members.find(m=>m.id===d.selfId);if(!self)throw Error('请确认你在名册中的身份');if(clean(self.name)!==p.name)throw Error('本人姓名与名册不一致，请核对个人信息或成员姓名');if(self.phone!==phone)throw Error('本人手机号须与当前登录账号一致')}
      if(!d.members.some(m=>leader(m)&&phoneValid(m.phone)))throw Error('请至少填写一位主任或副主任的手机号，以便确认建档');
      const c={status:'pending',materialKind:d.materialKind||'备案表',audit:[],id:uid(),fields:structuredClone(d.fields),members:structuredClone(d.members),file:structuredClone(d.file),createdBy:phone,createdAt:clock()};
      if(!d.asClerk){const self=c.members.find(m=>m.id===d.selfId);self.accountPhone=phone;self.boundAt=clock()}
      log(c,'提交建档',phone,{snapshot:{fields:c.fields,members:c.members,file:c.file}});data.committees.push(c);d.committedId=c.id;d.step='done';save();return c;
    }
    function enter(phone,id){const match=matches(phone).find(m=>m.committee.id===id);if(!match)throw Error('当前手机号未关联该业委会');if(!current(match.committee))throw Error('本届任期已结束，请联系负责人办理换届');const p=profile(phone);if(match.member){if(p&&p.name!==match.member.name)throw Error('个人姓名与备案成员姓名不一致，请联系建档人员核对');if(!p)data.accounts[phone]={phone,name:match.member.name,residence:''};match.member.accountPhone=phone;match.member.boundAt=clock();log(match.committee,'认领身份',phone);save()}return match}
    function updatePhones(actor,id,values){const c=committee(id);if(!canManage(actor,c)||c.status==='pending')throw Error('仅已认领的主任或副主任可以补充成员手机号');const next=c.members.map(m=>{const phone=clean(values[m.id]??m.phone);if(m.accountPhone&&phone!==m.phone)throw Error('已绑定成员的手机号暂不支持修改');return {...m,phone}});validateMembers(next);log(c,'更新手机号',actor,{before:c.members,after:next});c.members=next;save();return c}
    function confirmationText(c){return clean(c.fields.filingNo)?clean(c.fields.filingNo).slice(-6):c.fields.committeeName+' '+c.members.find(m=>m.role==='主任').name}
    function confirmCommittee(actor,id,token){const c=committee(id);if(!canManage(actor,c))throw Error('请由本届主任或副主任认领身份后确认');if(c.status==='active')return c;if(clean(token)!==confirmationText(c))throw Error('确认文字不一致，请核对后输入');validateFields(c.fields);validateMembers(c.members);c.status='active';c.confirmedBy=actor;c.confirmedAt=clock();c.ledgers={funds:[],archives:[],seals:[]};log(c,'确认锁定',actor,{snapshot:{fields:c.fields,members:c.members,file:c.file}});save();return c}
    function requestJoin(actor,name,note){if(!profile(actor))throw Error('请先填写个人姓名');if(!clean(name)||!clean(note))throw Error('请填写业委会名称和申请说明');data.requests=data.requests||[];data.requests.push({id:uid(),actor,name:clean(name),note:clean(note),at:clock(),status:'待核对'});save()}
    return {current,canManage,confirmationText,confirmCommittee,requestJoin,profile,updateProfile,draft,patchDraft,sendCode,verifyCode,matches,committee,validateFields,validateMembers,createCommittee,enter,updatePhones,save,phoneValid,uid};
  }
  const api={create,phoneValid,uid,required};if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.A0Model=api;
})(typeof globalThis!=='undefined'?globalThis:this);
