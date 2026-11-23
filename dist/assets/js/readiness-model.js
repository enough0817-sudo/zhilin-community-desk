(function(root){
const duties=['档案与资料','居民纳管','合同管理','印章保管'];
const specs=[['rooms','楼盘表','居民纳管','A2','楼盘表'],['rules','三规','档案与资料','A2','三规'],['property','物业服务合同','合同管理','A3',''],['members','委员名册与分工','','A17','职责分工'],['seals','印章台账','印章保管','A18','印章台账'],['filing','备案材料归档','','archive',''],['chair','主任登录确认','','archive','']];
function derive(c,data,{desktop=false}={}){
 const rs=(data.records||[]).filter(r=>!['已作废','已撤回'].includes(r.status)),cfg=data.readiness||{};
 const members=c.members||[],leader=members.find(m=>m.role==='主任')||members.find(m=>m.role==='副主任');
 const valid=id=>members.some(m=>m.id===id&&m.role!=='候补委员');
 const assignments=rs.filter(r=>r.module==='A17'&&r.type==='职责分工'&&r.status==='已生效'&&valid(r.fields.owner));
 const rooms=rs.filter(r=>r.module==='A2'&&r.type==='楼盘表'),locked=rooms.filter(r=>r.status==='已锁定');
 const managed=new Set(rs.filter(r=>r.module==='A10'&&r.status==='已纳管').map(r=>r.fields.roomId).filter(id=>locked.some(r=>r.id===id))).size;
 const rules=rs.filter(r=>r.module==='A2'&&r.type==='三规');
 const ruleTypes=['管理规约','业主大会议事规则','业委会工作规则'];
 const ruleReady=ruleTypes.filter(t=>rules.some(r=>r.fields.category===t&&r.status==='已归档'&&r.fields.parameters?.trim()&&r.fields.evidence?.length));
 const contracts=rs.filter(r=>r.module==='A3');
 const seals=rs.filter(r=>r.module==='A18'&&r.type==='印章台账'&&r.status==='使用中');
 const sealFingerprint=seals.map(r=>r.id+':'+r.fields.custodian).sort().join('|');
 const missing=members.filter(m=>!m.phone).length,missingDuties=duties.filter(d=>!assignments.some(r=>r.fields.duty===d));
 const checks={
 rooms:[Number(cfg.totalRooms)>0&&locked.length===Number(cfg.totalRooms)&&rooms.length===locked.length,rooms.length>0,`房屋总数 ${cfg.totalRooms||'未设置'} · 已录入 ${rooms.length} 户 · 已核对 ${locked.length} 户 · 已纳管 ${managed} 户`],
 rules:[ruleReady.length===3,rules.length>0,`已确认 ${ruleReady.length} / 3 类；需上传原文并核对工作参数`],
 property:[contracts.some(r=>['履行中','已评估'].includes(r.status)&&r.fields.evidence?.length&&r.fields.standard?.trim()),contracts.length>0,'上传合同，核对期限、服务标准与佐证要求'],
 members:[!missing&&!missingDuties.length,assignments.length>0,`待补手机号 ${missing} 人 · 建档相关职责 ${duties.length-missingDuties.length} / ${duties.length} 项已生效`],
 seals:[seals.length>0&&!!cfg.sealsConfirmed&&cfg.sealsFingerprint===sealFingerprint&&seals.every(r=>valid(r.fields.custodian)),seals.length>0,`使用中 ${seals.length} 枚；登记保管人后核对现有印章清单`],
 filing:[c.status==='active'&&!!c.file&&!!c.confirmedAt,!!c.file,'本届备案表或替代材料，由负责人确认归档'],
 chair:[members.some(m=>m.role==='主任'&&m.accountPhone&&m.accountPhone===m.phone),false,'主任使用已登记手机号登录并确认本人身份']
 };
 const order=desktop?[
  ['filing','备案记录表','','archive',''],['members','名单与分工','','A17','名单与分工'],
  specs[1],specs[2],specs[0],specs[4],['accounts','建账','财务与账目','A7','建账']
 ]:specs;
 if(desktop){
  checks.filing=[!!c.filingReview?.confirmedAt,!!c.file,c.filingReview?.confirmedAt?'十二项已核对并锁定':'对照原件逐项核对并确认锁定'];
  checks.members=[!!c.setupRoster?.completedAt,!!c.setupRoster,`待补手机号 ${members.filter(m=>m.role!=='候补委员'&&!m.inactiveAt&&!m.phone).length} 人 · 主办暂缺的职责不派发待办`];
  checks.accounts=[!!data.account,false,'完成第 1 件和第 2 件后，设置共有资金账套'];
 }
 const items=order.map(([id,title,duty,module,type])=>{
 const modernDuty={'居民纳管':'居民与纳管','印章保管':'印章管理'}[duty]||duty;
 const configured=desktop&&duty?c.setupRoster?.assignments?.find(row=>row.duty===modernDuty):null;
 const a=assignments.find(r=>r.fields.duty===duty),[done,started,description]=checks[id];
 const owner=desktop?(duty?configured?.owner||null:leader?.id):(a?.fields.owner||leader?.id);
 const helpers=(desktop?(configured?.owner?configured.helpers:[]):a?.fields.helperIds||[]).filter(valid);
 const excluded=['property','seals'].includes(id)&&!!cfg.exclusions?.[id]?.reason?.trim();
 const status=excluded?'不适用':done?'已完成':started?'待确认':'待完善';
 const assignees=desktop?[...new Set([owner,...helpers].filter(Boolean))]:
  [...new Set([owner,...helpers,...((status==='待确认'||(!a&&!leader?.accountPhone))?members.filter(m=>['主任','副主任'].includes(m.role)).map(m=>m.id):[])].filter(Boolean))];
 return {id,title,duty,module,type,description,done:done&&!excluded,excluded,status,owner,helpers,assignees,fallback:!desktop&&!!duty&&!a,reason:cfg.exclusions?.[id]?.reason||''};
 });
 const applicable=items.filter(i=>!i.excluded),completed=applicable.filter(i=>i.done).length;
 return {items,completed,total:applicable.length,percent:applicable.length?Math.round(completed/applicable.length*100):0,pending:items.filter(i=>!i.done&&!i.excluded),sealFingerprint,missingDuties};
}
const api={derive,duties};if(typeof module!=='undefined')module.exports=api;else root.ReadinessModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
