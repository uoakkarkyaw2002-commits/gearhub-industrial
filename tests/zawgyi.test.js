// 1.1.252 owner: a customer name typed with a Zawgyi keyboard showed as "▯◌◌▯" in alerts.
const {test}=require('node:test'),assert=require('node:assert/strict');
const {isZawgyi,toUnicode}=require('../lib/zawgyi'),{orderMessage}=require('../lib/order-push');
test('1.1.252: Zawgyi Burmese becomes Unicode; Unicode, English and numbers stay the same',()=>{
 assert.equal(toUnicode('ေမာင္ေမာင္'),'မောင်မောင်');
 assert.equal(toUnicode('ၾကည္ၿပိဳင္'),'ကြည်ပြိုင်');
 assert.equal(toUnicode('ေဒၚသီတာ'),'ဒေါ်သီတာ');
 for(const s of ['မောင်မောင်','ကျော်ကျော်','ဦးအောင်','ဒေါ်သီတာ','Aung Aung','09-766472432','',null])assert.equal(toUnicode(s),s);
 assert.equal(isZawgyi('မောင်မောင်'),false);assert.equal(isZawgyi('ေမာင္ေမာင္'),true);
 assert.match(orderMessage({code:'GH-1',total:3500000,customer:'ေမာင္ေမာင္'}).body,/^မောင်မောင် · 3,500,000 Ks · GH-1$/);
});
