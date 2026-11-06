/* Record a separate mixed stream; never replace or stop the live call's tracks. */
(()=>{
 const prepare=()=>{try{const A=window.AudioContext||window.webkitAudioContext;const c=A?new A():null;c?.resume().catch(()=>{});return c}catch{return null}};
 async function start({id,context,local,remote,video,localVideo,remoteVideo,api,state}){
  if(!context||typeof MediaRecorder==='undefined'||!remote?.getAudioTracks().length)throw Error('Recording is not supported on this device.');
  await context.resume();if(context.state!=='running')throw Error('Recording audio is unavailable.');
  const destination=context.createMediaStreamDestination(),sources=[],owned=[];
  for(const stream of [local,remote])if(stream?.getAudioTracks().length){const source=context.createMediaStreamSource(new MediaStream(stream.getAudioTracks()));const gain=context.createGain();gain.gain.value=.5;source.connect(gain);gain.connect(destination);sources.push(source,gain)}
  const mixed=new MediaStream(destination.stream.getAudioTracks());owned.push(...destination.stream.getTracks());let drawTimer=0;
  const release=()=>{clearInterval(drawTimer);sources.forEach(s=>{try{s.disconnect()}catch{}});owned.forEach(t=>t.stop());context.close().catch(()=>{})};
  let claim;
  try{
   if(video){
    const canvas=document.createElement('canvas');canvas.width=640;canvas.height=360;const pen=canvas.getContext('2d');if(!pen||!canvas.captureStream)throw Error('Video recording is unavailable.');
    const draw=()=>{pen.fillStyle='#10223a';pen.fillRect(0,0,640,360);for(const [v,x] of [[remoteVideo,0],[localVideo,320]]){if(v&&!v.hidden&&v.style.visibility!=='hidden'&&v.readyState>=2){const scale=Math.min(320/v.videoWidth,360/v.videoHeight),w=v.videoWidth*scale,h=v.videoHeight*scale;try{pen.drawImage(v,x+(320-w)/2,(360-h)/2,w,h)}catch{}}}};
    draw();drawTimer=setInterval(draw,84);const tracks=canvas.captureStream(12).getVideoTracks();tracks.forEach(t=>mixed.addTrack(t));owned.push(...tracks);
   }
   const candidates=video?['video/mp4;codecs=avc1.42E01E,mp4a.40.2','video/mp4','video/webm;codecs=vp8,opus','video/webm']:['audio/mp4;codecs=mp4a.40.2','audio/webm;codecs=opus','audio/mp4','audio/webm'];
   const mimeType=candidates.find(t=>MediaRecorder.isTypeSupported(t));if(!mimeType)throw Error('Recording format is unavailable.');
   claim=await api('/api/platform/call/'+id+'/recording','POST',{source:crypto.randomUUID()});
   if(!claim.owns){release();state('recording');return {owns:false,stop:()=>Promise.resolve()}}
   let mr=null,segmentTimer=0,stopped=false,failed=false,finishing=false,sequence=0,queue=Promise.resolve(),queuedBytes=0,settled;
   const done=new Promise(resolve=>{settled=resolve});
   const finish=()=>{if(finishing)return;finishing=true;release();queue.catch(()=>{}).then(()=>api('/api/platform/call-recordings/'+id+'/finish','POST',{failed},claim.key)).catch(()=>{failed=true}).finally(()=>{state(failed?'partial':'saved');settled()})};
   const stop=()=>{if(stopped)return done;stopped=true;clearTimeout(segmentTimer);if(mr&&mr.state!=='inactive')mr.stop();else finish();return done};
   const bad=()=>{failed=true;state('failed');stop()};
   function segment(){
    const chunks=[],began=Date.now();mr=new MediaRecorder(mixed,{mimeType,audioBitsPerSecond:64000,...(video?{videoBitsPerSecond:384000}:{})});
    mr.ondataavailable=e=>{if(e.data?.size)chunks.push(e.data)};
    mr.onerror=bad;
    mr.onstop=()=>{
     clearTimeout(segmentTimer);const blob=new Blob(chunks,{type:mimeType}),secs=Math.max(1,Math.min(90,Math.round((Date.now()-began)/1000)));
     if(blob.size){
      if(blob.size>8*1024*1024||queuedBytes+blob.size>16*1024*1024){failed=true;stopped=true}
      else{const seq=sequence++;queuedBytes+=blob.size;queue=queue.then(async()=>{try{for(let attempt=0;;attempt++){try{await api('/api/platform/call-recordings/'+id+'/parts?seq='+seq+'&secs='+secs,'POST',blob,claim.key);break}catch(e){if(attempt>=2||e.status&&e.status<500&&e.status!==429)throw e;await new Promise(r=>setTimeout(r,1000*(attempt+1)))}}}finally{queuedBytes-=blob.size}});queue.catch(bad)}
     }
     if(stopped)finish();else try{segment()}catch{bad()}
    };
    mr.start();segmentTimer=setTimeout(()=>{if(mr.state==='recording')mr.stop()},60000);
   }
   segment();state('recording');return {owns:true,stop};
  }catch(e){release();if(claim?.owns)api('/api/platform/call-recordings/'+id+'/finish','POST',{failed:true},claim.key).catch(()=>{});throw e}
 }
 window.GearHubCallReplay={prepare,start};
})();
