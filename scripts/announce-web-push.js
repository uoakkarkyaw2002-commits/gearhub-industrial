// Run only after main CI succeeds. Secrets come from private runner settings, never CLI arguments.
const origin='https://gearhub-industrial-1.onrender.com',service='srv-db4q992jnfac73858fu0';
async function announce({env=process.env,fetcher=fetch,sleep=ms=>new Promise(r=>setTimeout(r,ms))}={}){
 const commit=env.RELEASE_COMMIT;
 if(!/^[a-f0-9]{40}$/.test(commit||'')||!env.RENDER_API_KEY||!/^[a-f0-9]{64}$/.test(env.WEB_PUSH_RELEASE_TOKEN||''))throw Error('Private release settings are missing.');
 for(let attempt=0;attempt<80;attempt++){
  const r=await fetcher('https://api.render.com/v1/services/'+service+'/deploys?limit=5',{headers:{Authorization:'Bearer '+env.RENDER_API_KEY},signal:AbortSignal.timeout(15000)});if(!r.ok)throw Error('Cannot verify Render deployment.');
  const rows=await r.json(),live=rows.map(x=>x.deploy||x).find(x=>x.status==='live');
  if(live?.commit?.id===commit){
   const health=await fetcher(origin+'/api/health',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!health.ok)throw Error('Production health check failed.');
   const backup=await fetcher(origin+'/api/health/backups',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!backup.ok)throw Error('Backup release gate is not healthy.');
   const response=await fetcher(origin+'/api/app-release',{cache:'no-store',signal:AbortSignal.timeout(15000)});if(!response.ok)throw Error('Release check failed.');const release=await response.json();
   const sent=await fetcher(origin+'/api/push/confirm-release',{method:'POST',headers:{Origin:origin,Authorization:'Bearer '+env.WEB_PUSH_RELEASE_TOKEN,'Content-Type':'application/json'},body:JSON.stringify({releaseVersion:release.version,commit,deploymentId:live.id}),signal:AbortSignal.timeout(15000)});
   if(!sent.ok)throw Error('Release confirmation was rejected.');return {version:release.version,commit,deploymentId:live.id};
  }
  // A newer successful build must never announce the older workflow's release.
  if(rows.map(x=>x.deploy||x).some(x=>x.commit?.id===commit&&['build_failed','update_failed','canceled','deactivated'].includes(x.status)))throw Error('Target deployment did not become live.');
  await sleep(15000);
 }
 throw Error('Timed out waiting for the exact main commit to be live. No release was announced.');
}
if(require.main===module)announce().then(r=>console.log(JSON.stringify(r))).catch(()=>{console.error('Web Push release gate failed. No credentials or provider response bodies are logged. Check private configuration and exact Render deployment status.');process.exitCode=1;});
module.exports={announce};
