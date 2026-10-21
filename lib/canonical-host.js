// When the shop has its own domain (PUBLIC_ORIGIN, e.g. https://skyshopmm.com), a page opened on the
// old Render address (*.onrender.com) is sent to the same path on the real domain. Only GET/HEAD
// pages move; health checks, API writes and the app's own domain are never touched. Nothing happens
// while PUBLIC_ORIGIN is itself an onrender.com address.
function canonicalRedirect(publicOrigin){
 let canonical;try{canonical=new URL(publicOrigin);}catch{return (_req,_res,next)=>next();}
 const old=/\.onrender\.com$/i,active=!old.test(canonical.hostname);
 return (req,res,next)=>{
  if(!active||!['GET','HEAD'].includes(req.method)||req.path.startsWith('/api/health'))return next();
  const host=String(req.headers.host||'').toLowerCase().replace(/:\d+$/,'');
  if(old.test(host))return res.redirect(301,canonical.origin+req.originalUrl);
  next();
 };
}
module.exports={canonicalRedirect};
