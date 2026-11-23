const test=require('node:test');
const assert=require('node:assert/strict');
const {clearData}=require('../dist/assets/js/demo-reset.js');

function storage(keys){
  const entries=new Set(keys);
  return {get length(){return entries.size;},key:index=>[...entries][index],removeItem:key=>entries.delete(key),entries};
}

function databaseMock(blocked){
  const deleted=[];
  return {deleted,deleteDatabase(name){
    const request={};
    queueMicrotask(()=>{
      if(name===blocked){request.onblocked();return;}
      deleted.push(name);
      request.onsuccess();
    });
    return request;
  }};
}

test('demo reset clears only app storage, including both attachment databases',async()=>{
  const local=storage(['other-app','zhilin-a0-v1','zhilin-business-v1-demo','zhilin-work-phone-term','zhilin-assistant-hint-demo','zhilin-other']);
  const session=storage(['other-session','a0-phone','a0-committee','zhilin-open-assistants']);
  const db=databaseMock();
  await clearData(local,session,db);
  assert.deepEqual([...local.entries],['other-app','zhilin-other']);
  assert.deepEqual([...session.entries],['other-session']);
  assert.deepEqual(db.deleted,['zhilin-a0-files','zhilin-business-files']);
});

test('a blocked attachment reset leaves the saved form and login keys available for retry',async()=>{
  const local=storage(['zhilin-a0-v1']);
  const session=storage(['a0-committee']);
  await assert.rejects(clearData(local,session,databaseMock('zhilin-a0-files')),/其他标签页/);
  assert.ok(local.entries.has('zhilin-a0-v1'));
  assert.ok(session.entries.has('a0-committee'));
});
