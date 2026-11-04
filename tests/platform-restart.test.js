// 1.1.290 owner: right after a deploy the iPhone showed "The string did not match the expected pattern" on My shop
// (the restarting server answered with an HTML page). The page now says the server is restarting and retries.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const js=fs.readFileSync(path.join(__dirname,'..','public','platform.js'),'utf8');
test('a non-JSON reply becomes a "server is restarting" message and the first load retries',()=>{
 assert.match(js,/try \{ v = JSON\.parse\(await r\.text\(\)\); \} catch \{ throw Object\.assign\(Error\("Server is restarting\./);
 assert.doesNotMatch(js,/await r\.json\(\)/);
 assert.match(js,/if \(e\.busy && tries < 40\) setTimeout\(\(\) => start\(tries \+ 1\), 3000\);/);
});
