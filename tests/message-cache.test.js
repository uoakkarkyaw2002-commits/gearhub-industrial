const {test}=require('node:test'),assert=require('node:assert/strict');
const create=require('../public/message-cache');
const deferred=()=>{let resolve,reject;const promise=new Promise((a,b)=>{resolve=a;reject=b});return {promise,resolve,reject}};
test('chat preload deduplicates concurrent reads and keeps a snapshot during refresh',async()=>{
 const requests=[],cache=create(key=>{const d=deferred();requests.push([key,d]);return d.promise});
 const first=cache.load('shop-a');assert.equal(cache.load('shop-a'),first);await Promise.resolve();assert.equal(requests.length,1);
 requests[0][1].resolve({messages:['old']});await first;assert.deepEqual(cache.peek('shop-a').messages,['old']);
 const next=cache.load('shop-a');assert.deepEqual(cache.peek('shop-a').messages,['old']);await Promise.resolve();requests[1][1].resolve({messages:['new']});await next;assert.deepEqual(cache.peek('shop-a').messages,['new']);
});
test('a late read cannot overwrite a successful message send or a different shop',async()=>{
 const response=deferred(),cache=create(()=>response.promise);cache.put('shop-a',{messages:['old']});cache.put('shop-b',{messages:['private B']});
 const read=cache.load('shop-a');await Promise.resolve();cache.put('shop-a',{messages:['sent']});response.resolve({messages:['old']});
 assert.deepEqual((await read).messages,['sent']);assert.deepEqual(cache.peek('shop-b').messages,['private B']);
});
test('session reset drops snapshots and ignores in-flight results',async()=>{
 const response=deferred(),cache=create(()=>response.promise);cache.put('inbox',{rows:['private']});const read=cache.load('thread');await Promise.resolve();cache.clear();response.resolve({messages:['private']});assert.equal(await read,null);assert.equal(cache.peek('thread'),undefined);assert.equal(cache.peek('inbox'),undefined);
});
test('authorization failure clears all private snapshots; a network failure keeps them',async()=>{
 let status=0;const cache=create(async()=>{const e=Error('offline');e.status=status;throw e});cache.put('inbox',{rows:['cached']});await assert.rejects(cache.load('inbox'));assert.deepEqual(cache.peek('inbox').rows,['cached']);
 status=401;await assert.rejects(cache.load('thread'));assert.equal(cache.peek('inbox'),undefined);
});
test('conversation cache is bounded and survives a superseded request finishing after reset',async()=>{
 const old=deferred(),fresh=deferred();let n=0;const cache=create(()=>++n===1?old.promise:fresh.promise,2);
 cache.put('a',1);cache.put('b',2);cache.put('c',3);assert.equal(cache.peek('a'),undefined);
 const a=cache.load('same');await Promise.resolve();cache.clear();const b=cache.load('same');await Promise.resolve();old.resolve('old');assert.equal(await a,null);assert.equal(cache.load('same'),b);fresh.resolve('fresh');assert.equal(await b,'fresh');
});
