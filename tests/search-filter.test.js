// 1.1.304 owner: search filter (Product / Excel / Trash) left of the bar; pull down to refresh with a sound;
// a new personal post comes first in Discover.
const {test}=require('node:test'),assert=require('node:assert/strict'),fs=require('node:fs'),path=require('node:path');
const read=f=>fs.readFileSync(path.join(__dirname,'..',f),'utf8');
test('search filter, pull to refresh and newest personal post first are wired',()=>{
 const html=read('public/index.html'),sw=read('public/sw.js'),filter=read('public/search-filter.js'),css=read('public/search-filter.css'),excel=read('public/excel-search.js'),pull=read('public/pull-refresh.js'),feed=read('public/shops-feed.js');
 for(const tag of html.match(/\/(?:search-filter|pull-refresh)\.(?:js|css)\?v=[0-9.]+/g))assert.ok(sw.includes('"'+tag+'"'),tag+' in SHELL');
 assert.match(html,/excel-search\.js\?v=[0-9.]+"><\/script><script src="\/search-filter\.js/,'the filter loads after the Excel search that makes the bar tools');
 assert.ok(filter.indexOf('data-scope="files"')<filter.indexOf('data-scope="product"'),'Excel files is the first item');assert.match(css,/\.mobile-search:has\(\.search-filter\)>\.excel-folder-button\{display:none!important\}/,'no folder button on the right');
 for(const scope of ['files','product','excel','trash'])assert.match(filter,new RegExp('data-scope="'+scope+'"'));
 assert.match(filter,/\.search-tools \.search-clear'\)\?\.click\(\)/,'Trash empties the search with the bin');
 assert.match(excel,/GearHubSearchScope\?\.get\(\)==='product'/,'Product shows no Excel rows');
 assert.match(css,/body\.searching\.scope-excel #products\{display:none!important\}/,'Excel shows only the Excel rows');
 assert.match(pull,/GearHubShops\.refresh/);assert.match(pull,/createOscillator/,'a short sound, no sound file');
 assert.match(feed,/when\(extra\[j\]\) >= when\(products\[i\]\)/,'a new personal post comes before older products');
});
