// Every browser script must at least parse: one missing ")" in admin.js once made the
// whole admin page dead (no login, GearHub brand left on seller admins).
const {test}=require('node:test');const assert=require('node:assert/strict');const fs=require('node:fs');const path=require('node:path');const vm=require('node:vm');
test('every public/*.js file parses',()=>{
 const dir=path.join(__dirname,'..','public');
 for(const name of fs.readdirSync(dir).filter(n=>n.endsWith('.js')))assert.doesNotThrow(()=>new vm.Script(fs.readFileSync(path.join(dir,name),'utf8'),{filename:name}),name);
});
