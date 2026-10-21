// The old Render address sends visitors to the shop's own domain, and nothing else is affected.
const {test}=require('node:test');const assert=require('node:assert/strict');const http=require('node:http');const express=require('express');
const {canonicalRedirect}=require('../lib/canonical-host');
function get(port,host,path,method='GET'){return new Promise((resolve,reject)=>{const r=http.request({host:'127.0.0.1',port,path,method,headers:{Host:host}},res=>{res.resume();res.on('end',()=>resolve({status:res.statusCode,location:res.headers.location}));});r.on('error',reject);r.end();});}
async function serve(origin){const app=express();app.use(canonicalRedirect(origin));app.all('*',(_req,res)=>res.send('ok'));const server=app.listen(0,'127.0.0.1');await new Promise(r=>server.once('listening',r));return {server,port:server.address().port};}
test('old onrender.com pages move to the shop domain; everything else is untouched',async t=>{
 const {server,port}=await serve('https://skyshopmm.com');t.after(()=>server.close());
 const old='gearhub-industrial-1.onrender.com';
 const moved=await get(port,old,'/shops/psm-test-shop/?x=1');assert.equal(moved.status,301);assert.equal(moved.location,'https://skyshopmm.com/shops/psm-test-shop/?x=1');
 assert.equal((await get(port,old+':443','/admin.html')).status,301);
 assert.equal((await get(port,old,'/api/health')).status,200,'Render health checks keep working');
 assert.equal((await get(port,old,'/api/products','POST')).status,200,'writes are never redirected');
 assert.equal((await get(port,'skyshopmm.com','/')).status,200,'the real domain is served');
 assert.equal((await get(port,'127.0.0.1','/')).status,200,'local and test hosts are served');
});
test('no redirect while PUBLIC_ORIGIN is still the onrender.com address',async t=>{
 const {server,port}=await serve('https://gearhub-industrial-1.onrender.com');t.after(()=>server.close());
 assert.equal((await get(port,'gearhub-industrial-1.onrender.com','/')).status,200);
});
