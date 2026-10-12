// Test-process-only fault injection; production never loads this fixture.
const fs=require('node:fs');const original=fs.promises.mkdtemp;
fs.promises.mkdtemp=async function(prefix,...args){if(process.env.TEST_EXPORT_FAILURE==='true'&&String(prefix).includes('gearhub-backup-'))throw Object.assign(new Error('temporary storage unavailable'),{code:'EACCES'});return original.call(this,prefix,...args);};
if(process.env.TEST_SMTP_FAILURE==='true')require('nodemailer').createTransport=()=>({sendMail:async()=>{throw Object.assign(new Error('rejected private-owner@example.test credential-value'),{code:'EAUTH'});},close(){}});
