(function(root){
  const filing = [
    ['小区名称','name'], ['坐落地址','address'], ['行政区划','province','city','district'],
    ['建筑区划名称','buildingZone'], ['街道','street'], ['社区','neighborhood'],
    ['备案编号','filingNo'], ['记录机关','authority'], ['备案日期','filingDate'],
    ['届次起止','term','start','end'], ['主任','chairName'], ['副主任','viceName']
  ];
  const posts = ['主任','副主任','委员','财务委员','工程与设施委员','环境与服务委员','安全委员','宣传与沟通委员','文书与档案委员','其他'];
  const duties = ['财务与账目','会议与公示','合同管理','工程与设施','环境管理','安全与消防','档案与资料','居民与纳管','对外联络','宣传与沟通','印章管理','监督与考评','其他'];
  const scopes = ['居民纳管','档案上传','整改填报','公示起草','会议记录','待办代办'];
  const credentials = ['基本存款账户信息','专用存款账户信息','开户许可证'];
  const materials = ['备案表','业委会入驻登记表'];
  const clean = value => String(value ?? '').trim();
  const validPhone = value => /^1[3-9]\d{9}$/.test(value);
  const normalizePhone = value => clean(value).replace(/[\s-]/g,'').replace(/^\+86(?=1\d{10}$)/,'');
  const mask = value => value ? value.slice(0,3)+'****'+value.slice(-4) : '未填写';
  const isDate = value => /^\d{4}-\d{2}-\d{2}$/.test(value) && Number.isFinite(Date.parse(value)) && new Date(value).toISOString().slice(0,10)===value;
  const checkValue = (keys, values) => JSON.stringify(keys.map(key=>clean(values[key])));
  const unchecked = (values, checks) => filing.filter(([, ...keys])=>!keys.every(key=>clean(values[key])) || checks[keys[0]]!==checkValue(keys,values));
  function validateFiling(values, checks, file, kind, stamped) {
    if(!materials.includes(kind)||!file?.key) throw Error('请上传《备案记录表》或《业委会入驻登记表》');
    if(file.source!=='sample' && !(file.pages||[file]).every(page=>kind==='备案表' ? page.type==='application/pdf' : ['application/pdf','image/jpeg','image/png','image/webp'].includes(page.type))) throw Error('请上传有效的备案记录表 PDF 或盖章登记表扫描件');
    if(kind===materials[1]&&!stamped) throw Error('请确认登记表已加盖业主委员会公章');
    const missing=unchecked(values,checks);
    if(missing.length) throw Error('请核对：'+missing.map(([label])=>label).join('、'));
    if(!isDate(values.filingDate)) throw Error('请填写有效的备案日期');
    if(!isDate(values.start)||!isDate(values.end)||values.end<=values.start) throw Error('请核对届次起止日期');
    if(values.chairName===values.viceName) throw Error('主任和副主任须为不同成员');
  }
  function validatePhones(members, assistants=[]) {
    const used=new Map();
    for(const member of [...members.filter(m=>m.role!=='候补委员'&&!m.inactiveAt), ...assistants]){
      const phone=normalizePhone(member.phone);
      if(!phone) continue;
      if(!validPhone(phone)) throw Error(member.name+'的手机号格式不正确');
      if(used.has(phone)) throw Error('这个号已经给'+used.get(phone)+'了');
      used.set(phone,member.name);
    }
  }
  function missingPrereqs(committee) {
    return [['filing','第 1 件《备案记录表》',committee.status==='active'&&committee.filingReview?.confirmedAt],
      ['members','第 2 件名单与分工',committee.setupRoster?.completedAt]].filter(([, , done])=>!done);
  }
  function canAccount(committee,member,phone){
    return !!phone && !!member && committee.members.some(m=>m.id===member.id&&m.accountPhone===phone&&m.phone===phone
      && m.role!=='候补委员' && !m.inactiveAt && (['主任','副主任'].includes(m.role)||committee.setupRoster?.assignments?.some(row=>row.duty==='财务与账目'&&row.owner===m.id)));
  }
  const accountFields = [['bank','开户银行'],['name','账户名称'],['number','账号']];
  function validateAccountStep(step, value, committee) {
    if(step===0 && value.credential && (!credentials.includes(value.kind)||!value.credential.key||value.credential.type!=='application/pdf')) throw Error('请核对账户凭证类型');
    if(step===1) {
      const missing=accountFields.filter(([key])=>!clean(value[key]));
      if(missing.length) throw Error('缺少'+missing.map(([,label])=>'「'+label+'」').join('、')+'。先填「'+missing[0][1]+'」。');
      if(!/^\d{6,40}$/.test(value.number)) throw Error('请填写有效的银行账号');
      if(!['已开通','未开通','待核实'].includes(value.online)) throw Error('请选择网银开通状态');
      if(value.opened&&!isDate(value.opened)) throw Error('请核对开户日期');
      if(value.credential) {
        const checks=[...accountFields, ['receipt',value.kind==='开户许可证'?'核准号':value.kind==='专用存款账户信息'?'专用存款账户编号':'基本存款账户编号']];
        const unconfirmed=checks.filter(([key])=>value.checks?.[key]!==checkValue([key],value));
        if(unconfirmed.length) throw Error('请核对'+unconfirmed.map(([,label])=>'「'+label+'」').join('、'));
      }
    }
    if(step===2) {
      if(!isDate(value.start)) throw Error('请手动填写有效的起始日期');
      if(!/^\d{1,12}(\.\d{1,2})?$/.test(value.opening)) throw Error('请手动填写期初余额，可填 0，最多两位小数');
      if(!committee.members.some(m=>m.id===value.handler&&!m.inactiveAt&&m.role!=='候补委员')) throw Error('请选择本届经办人');
    }
    if(step===3) {
      if(!value.income?.length||!value.expenses?.length) throw Error('请至少各填写一项收入和支出科目');
      if(!['required','optional'].includes(value.budget)) throw Error('请选择是否编制预算');
    }
  }
  function cents(value){
    const [yuan, fraction='']=value.split('.');
    return Number(yuan)*100+Number(fraction.padEnd(2,'0'));
  }
  const api={filing,posts,duties,scopes,credentials,materials,clean,mask,validPhone,normalizePhone,isDate,checkValue,unchecked,validateFiling,validatePhones,missingPrereqs,canAccount,accountFields,validateAccountStep,cents};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;else root.DesktopSetupModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
