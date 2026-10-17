const test=require('node:test');const assert=require('node:assert/strict');
const M=require('../public/seller-manager');
const now=Date.parse('2026-10-17T06:00:00Z'),day=864e5;
const shop=(o)=>({status:'active',subscription_status:'trial',ends_at:new Date(now+60*day).toISOString(),limits:{subscriptionState:'trial'},...o});
test('state flags suspended, expired, scheduled and expiring shops',()=>{
  assert.equal(M.state(shop({}),now),'active');
  assert.equal(M.state(shop({ends_at:new Date(now+3*day).toISOString()}),now),'expiring');
  assert.equal(M.state(shop({limits:{subscriptionState:'expired'}}),now),'expired');
  assert.equal(M.state(shop({subscription_status:'inactive',limits:{subscriptionState:'inactive'}}),now),'expired');
  assert.equal(M.state(shop({status:'suspended',limits:{subscriptionState:'suspended'}}),now),'suspended');
  assert.equal(M.state(shop({limits:{subscriptionState:'scheduled'}}),now),'scheduled');
  assert.equal(M.state(shop({ends_at:null}),now),'active');
});
test('Myanmar calendar dates round-trip through date inputs',()=>{
  assert.equal(M.yangonDate('2026-12-16T18:00:00Z'),'2026-12-17');
  assert.equal(M.yangonDate(M.fromYangonDate('2026-12-17',true)),'2026-12-17');
  assert.equal(M.yangonDate(M.fromYangonDate('2026-12-17',false)),'2026-12-17');
  assert.equal(M.fromYangonDate('',true),null);
});
test('expiry labels and storage percentages',()=>{
  assert.equal(M.expiryLabel(null,now),'No expiry');
  assert.equal(M.expiryLabel(new Date(now+day).toISOString(),now),'1 day left');
  assert.equal(M.expiryLabel(new Date(now-2*day).toISOString(),now),'Expired 2 days ago');
  assert.equal(M.usagePercent({usedBytes:95,storageLimit:100}),95);
  assert.equal(M.usagePercent({usedBytes:500,storageLimit:100}),100);
  assert.equal(M.usagePercent({usedBytes:1,storageLimit:0}),100);
});
test('filters combine tab, status, plan and search',()=>{
  const row={text:'Alice Tools alice@gmail.com',state:'expiring',plan:'Basic'};
  const v=(o)=>({tab:'all',q:'',status:'all',plan:'all',...o});
  assert.ok(M.matches(row,v({})));
  assert.ok(M.matches(row,v({tab:'active'})),'expiring shops are still active');
  assert.ok(M.matches(row,v({tab:'expiring'})));
  assert.ok(!M.matches(row,v({tab:'expired'})));
  assert.ok(!M.matches(row,v({status:'suspended'})));
  assert.ok(M.matches(row,v({q:'ALICE@'})));
  assert.ok(!M.matches(row,v({q:'bob'})));
  assert.ok(!M.matches(row,v({plan:'Pro'})));
});
