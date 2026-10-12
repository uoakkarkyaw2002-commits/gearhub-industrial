function logError(event,error,fields={}){const supplied=String(error?.code||error?.name||'Error');const code=/^[A-Za-z0-9_-]{1,64}$/.test(supplied)?supplied:'Error';console.error(JSON.stringify({event,code,...fields}));}
module.exports={logError};
