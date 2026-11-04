// 1.1.294 owner: another shop inside a shop app shows Home, Category, Promotion, Cart and an exit back to the app's shop.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path'),vm=require('node:vm');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
function run({standalone=true,path:p,home}){
 const store=new Map(home?[['gh-app-home',home],['gh-app-home-name','Kaizen Beauty']]:[]),appended=[],hidden=[],body=new Set();
 const nav={querySelectorAll:()=>[{set hidden(v){hidden.push(v)}},{set hidden(v){hidden.push(v)}}],append:e=>appended.push(e)};
 const win={location:{pathname:p},navigator:{},matchMedia:q=>({matches:standalone&&/standalone/.test(q)}),sessionStorage:{getItem:k=>store.get(k)??null,setItem:(k,v)=>store.set(k,v)},addEventListener(){},setTimeout(){},
  document:{body:{classList:{add:c=>body.add(c)}},querySelector:s=>/nav/.test(s)?nav:null,createElement:()=>({setAttribute(k,v){this[k]=v}})}};
 vm.runInNewContext(read('public/visit-shop.js'),win);return {store,appended,hidden,body};
}
test('the first shop of the app session is home; another shop gets the exit button, a browser tab never does',()=>{
 let r=run({path:'/shops/kaizen-beauty/'});assert.equal(r.store.get('gh-app-home'),'/shops/kaizen-beauty/');assert.equal(r.appended.length,0);
 r=run({path:'/shops/polestar/',home:'/shops/kaizen-beauty/'});assert.ok(r.body.has('visiting-shop'));assert.equal(r.appended.length,2,'phone bar and PC bar');
 assert.equal(r.appended[0].href,'/shops/kaizen-beauty/');assert.equal(r.appended[0]['aria-label'],'Back to Kaizen Beauty');assert.deepEqual(r.hidden,[true,true,true,true],'Shops and Settings hidden on both bars');
 r=run({standalone:false,path:'/shops/polestar/',home:'/shops/kaizen-beauty/'});assert.equal(r.appended.length,0);
 const index=read('public/index.html'),sw=read('public/sw.js'),css=read('public/style.css');
 const tag=index.match(/<script src="(\/visit-shop\.js\?v=[^"]+)"><\/script><script src="\/smart-search\.js/)[1];assert.ok(sw.includes('"'+tag+'"'));
 assert.match(css,/body\.visiting-shop \.mobile-bottom-nav\{grid-template-columns:repeat\(5,minmax\(0,1fr\)\)!important\}/);
});
