const test=require('node:test');
const assert=require('node:assert/strict');
const A0=require('../dist/assets/js/a0-model.js');
const Work=require('../dist/assets/js/work-model.js');
const Setup=require('../dist/assets/js/desktop-setup-model.js');
const Readiness=require('../dist/assets/js/readiness-model.js');

const chair='13800000001', vice='13800000002', member='13800000003';
const clock=()=>Date.parse('2026-11-20T08:00:00Z');
const fields={name:'青禾花园',committeeName:'青禾花园业主委员会',address:'青禾街 8 号',
  province:'四川省',city:'成都市',district:'武侯区',buildingZone:'青禾花园建筑区划',
  street:'青禾街道',neighborhood:'青禾社区',filingNo:'CG-2026-001',authority:'登记机关',
  filingDate:'2026-06-10',term:'2',start:'2026-06-01',end:'2029-05-31',chairName:'王明',viceName:'李敏'};
const checked=()=>Object.fromEntries(Setup.filing.map(([, ...keys])=>[keys[0],Setup.checkValue(keys,fields)]));
const file={key:'sample',source:'sample',name:'示例备案记录表'};
function fixture({verify=true}={}){
  const items=new Map();
  const storage={getItem:key=>items.get(key),setItem:(key,value)=>items.set(key,value)};
  const store=A0.create(storage,clock);
  const prove=phone=>store.verifyCode(phone,store.sendCode(phone));
  if(verify)prove(chair);
  const members=[{id:'c',name:'王明',role:'主任',phone:chair},{id:'v',name:'李敏',role:'副主任',phone:vice},{id:'m',name:'赵雪',role:'委员',phone:member}];
  store.patchDraft(chair,{file,materialKind:'备案表',fields,checks:checked(),members});
  return {store,storage,prove,create:()=>store.createCommittee(chair,{desktop:true})};
}
function lock(f){
  const c=f.create();
  f.store.claim(chair,c.id);
  return f.store.reviewFiling(chair,c.id,{fields,checks:checked(),file,materialKind:'备案表'});
}
const account={bank:'青禾银行',name:'青禾花园业主大会业主共有资金',number:'62100000000848',
  online:'未开通',start:'2026-11-20',opening:'0',handler:'c',income:['停车'],expenses:['维护'],budget:'optional'};

test('desktop verification and explicit claim do not create an account at login',()=>{
  const f=fixture();
  const c=f.create();
  assert.equal(f.store.profile(chair),null);
  assert.equal(c.members[0].accountPhone,undefined);
  assert.throws(()=>f.store.claim(vice,c.id),/重新验证/);
  assert.throws(()=>f.store.reviewFiling(chair,c.id,{fields,checks:checked()}),/认领/);
  f.store.claim(chair,c.id);
  assert.equal(f.store.profile(chair).name,'王明');
  assert.throws(()=>f.store.claim('13900000000',c.id),/不在本届名册/);
});

test('editing a checked filing group invalidates its confirmation and stamped substitute requires acknowledgement',()=>{
  const f=fixture();
  f.store.patchDraft(chair,{fields:{...fields,buildingZone:'新名称'}});
  assert.throws(f.create,/建筑区划名称/);
  f.store.patchDraft(chair,{fields,materialKind:'业委会入驻登记表'});
  assert.throws(f.create,/加盖/);
  f.store.patchDraft(chair,{stamped:true});
  assert.equal(f.create().status,'pending');
});

test('only leaders save roster, with identical duplicate protection at row and whole-roster entry points',()=>{
  const f=fixture(),c=lock(f);
  f.prove(member);
  f.store.claim(member,c.id);
  assert.throws(()=>f.store.saveRoster(member,c.id,{}),/主任或副主任/);
  assert.throws(()=>f.store.saveRosterPhone(chair,c.id,'v','+86 138 0000 0001'),/已经给王明/);
  assert.throws(()=>f.store.saveRoster(chair,c.id,{members:[{id:'v',phone:'138-0000-0001'}]}),/已经给王明/);
  assert.throws(()=>f.store.saveRoster(chair,c.id,{assistants:Array.from({length:4},(_,i)=>({name:'助理'+i,phone:'1390000000'+i}))}),/最多可设置 3 名/);
  assert.throws(()=>f.store.saveRoster(chair,c.id,{assignments:[{duty:'财务与账目',owner:'m',helpers:['m']}]}),/须为不同/);
  f.store.saveRoster(chair,c.id,{assignments:[{duty:'档案与资料',owner:'',helpers:['m']}]},true);
  const ready=Readiness.derive(f.store.committee(c.id),{records:[]},{desktop:true});
  assert.equal(ready.completed,2);
  assert.deepEqual(ready.items.find(row=>row.id==='rules').assignees,[]);
});

test('desktop account cannot bypass either prerequisite or finance permission',()=>{
  const f=fixture(),c=lock(f);
  f.prove(member);
  f.store.claim(member,c.id);
  const as=phone=>Work.create(f.storage,()=>{const committee=f.store.committee(c.id);return {committee,phone,member:committee.members.find(m=>m.phone===phone),desktop:true};},clock);
  assert.throws(()=>as(chair).saveDesktopAccount(account),/第 2 件/);
  assert.throws(()=>as(chair).add('A7','流水账',{}),/先完成第 7 件/);
  f.store.saveRoster(chair,c.id,{},true);
  assert.throws(()=>as(member).saveDesktopAccount(account),/财务主办/);
  assert.deepEqual(Setup.missingPrereqs({...f.store.committee(c.id),filingReview:null}).map(row=>row[0]),['filing']);
  assert.equal(as(chair).read().records.length,0);
});

test('account requires manual opening and commits account plus credential archive once',()=>{
  const f=fixture(),c=lock(f);
  f.store.saveRoster(chair,c.id,{},true);
  const model=Work.create(f.storage,()=>({committee:f.store.committee(c.id),phone:chair,member:{accountPhone:chair,id:'c',role:'主任'},desktop:true}),clock);
  const value={...account,kind:'开户许可证',receipt:'DEMO-001',credential:{key:'demo',type:'application/pdf',name:'开户许可证（示例）.pdf',demo:true}};
  value.checks=Object.fromEntries(['bank','name','number','receipt'].map(key=>[key,Setup.checkValue([key],value)]));
  assert.throws(()=>model.saveDesktopAccount({...value,number:'62100000000849'}),/核对「账号」/);
  assert.throws(()=>model.saveDesktopAccount({...value,opening:''}),/手动填写期初余额/);
  assert.equal(model.read().records.length,0);
  const saved=model.saveDesktopAccount(value);
  assert.equal(saved.openingCents,0);
  assert.equal(model.read().records[0].id,saved.archiveId);
  assert.equal(model.read().records[0].fields.categoryCode,'ZZ');
  assert.equal(model.read().records[0].fields.knowledgeExcluded,true);
  assert.equal(model.read().records[0].status,'已归档');
  assert.throws(()=>model.saveDesktopAccount(value),/已有账套/);
  assert.equal(model.read().records.length,1);
});

test('assistant claim and submission stay within the active delegation',()=>{
  const f=fixture(),c=lock(f),phone='13900000200';
  const assistant={id:'a',name:'郑清',phone,contract:true,start:'2026-11-19',end:'2026-11-21'};
  f.store.saveRoster(chair,c.id,{assistants:[assistant]},true);
  assert.throws(()=>f.store.claimAssistant(phone,c.id),/重新验证/);
  f.prove(phone);
  f.store.claimAssistant(phone,c.id);
  assert.equal(f.store.matches(phone).length,0);
  assert.throws(()=>f.store.submitAssistant(phone,c.id,{scope:'建账',title:'测试',note:'测试'}),/不包含/);
  const saved=f.store.submitAssistant(phone,c.id,{scope:'合同管理',title:'测试',note:'测试'});
  assert.equal(saved.origin,'物业报送 · 助理录入');
  f.store.saveRoster(chair,c.id,{assistants:[{...assistant,end:'2026-11-20',start:'2026-11-19',contract:false}]},true);
  assert.throws(()=>f.store.submitAssistant(phone,c.id,{scope:'合同管理',title:'测试',note:'测试'}),/不包含/);
});

test('approved committee membership changes close the former seat and clear its duty assignments',()=>{
  const f=fixture(),c=lock(f);
  f.prove(member);f.store.claim(member,c.id);
  f.store.saveRoster(chair,c.id,{assignments:[{duty:'档案与资料',owner:'m',helpers:['v']}]},true);
  assert.throws(()=>f.store.saveRoster(chair,c.id,{members:[{id:'n',name:'新委员',phone:'13900000000'}]},true),/变动单/);
  const row=f.store.submitRosterChange(chair,c.id,{kind:'辞职',memberId:'m',effective:'2026-11-20',basis:'辞职申请',conclusion:'已核对',file});
  assert.equal(f.store.matches(member).length,1);
  f.store.applyRosterChange(chair,c.id,row.id);
  assert.equal(f.store.matches(member).length,0);
  assert.equal(f.store.committee(c.id).setupRoster.assignments[0].owner,'');
  assert.throws(()=>f.store.applyRosterChange(chair,c.id,row.id),/没有待核对/);
});
