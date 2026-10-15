// Writes only a private, Git-ignored file; never prints credentials.
const fs=require('node:fs'),path=require('node:path'),crypto=require('node:crypto');
const target=path.resolve(__dirname,'../.env.web-push.local');
const keys=require('web-push').generateVAPIDKeys();
fs.writeFileSync(target,'WEB_PUSH_PUBLIC_KEY='+keys.publicKey+'\nWEB_PUSH_PRIVATE_KEY='+keys.privateKey+'\nWEB_PUSH_SUBJECT=https://gearhub-industrial-1.onrender.com\nWEB_PUSH_RELEASE_TOKEN='+crypto.randomBytes(32).toString('hex')+'\n',{mode:0o600,flag:'wx'});
console.log('Private Web Push settings created in .env.web-push.local (not printed). Keep this key pair stable.');
