const {test}=require('node:test');
const assert=require('node:assert/strict');
const storage=require('../public/platform-storage');
test('storage form converts MB/GB, preserves existing byte quotas, and supports plan inheritance',()=>{
  assert.equal(storage.bytes('50','MB'),52428800);
  assert.equal(storage.bytes('0.5','GB'),536870912);
  assert.equal(storage.bytes('','MB',true),null);
  for(const n of [0,1,52428801,1073741825,10*1024**3]){
    const d=storage.display(n);
    assert.equal(storage.bytes(String(d.amount),d.unit),n);
  }
  assert.equal(storage.label(52428800),'50 MB');
});
test('storage form rejects invalid and oversized limits instead of silently changing quota',()=>{
  for(const [amount,unit] of [['','MB'],['-1','MB'],['NaN','MB'],['Infinity','GB'],['11','GB'],['1','TB']]){
    assert.throws(()=>storage.bytes(amount,unit));
  }
});
