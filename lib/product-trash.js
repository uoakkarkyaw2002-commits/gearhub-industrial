// Reversible metadata only. No delete of rows, stock, shared files or historical orders.
function ensureTrashColumns(db,table){if(!['products','platform_products'].includes(table))throw Error('Invalid product table.');const cols=db.prepare('PRAGMA table_info('+table+')').all();if(!cols.some(c=>c.name==='trashed_at'))db.exec('ALTER TABLE '+table+' ADD COLUMN trashed_at TEXT');if(!cols.some(c=>c.name==='trash_previous_active'))db.exec('ALTER TABLE '+table+' ADD COLUMN trash_previous_active INTEGER');}
function changeTrash(db,{table,id,shopId,restore=false,productLimit=Infinity}){
 if(!['products','platform_products'].includes(table)||!Number.isSafeInteger(id)||id<1)throw Object.assign(Error('Product not found.'),{status:404});
 const where=table==='platform_products'?'id=? AND shop_id=?':'id=?',args=table==='platform_products'?[id,shopId]:[id];
 return db.transaction(()=>{const p=db.prepare('SELECT * FROM '+table+' WHERE '+where).get(...args);if(!p)throw Object.assign(Error('Product not found.'),{status:404});
  if(restore&&p.trashed_at){const active=p.trash_previous_active===1?1:0;if(active&&table==='platform_products'&&db.prepare('SELECT count(*) n FROM platform_products WHERE shop_id=? AND active=1').get(shopId).n>=productLimit)throw Object.assign(Error('Plan product limit reached. Free a slot before restoring.'),{status:403});db.prepare('UPDATE '+table+' SET active=?,trashed_at=NULL,trash_previous_active=NULL WHERE '+where).run(active,...args);}
  if(!restore&&!p.trashed_at)db.prepare('UPDATE '+table+" SET trash_previous_active=active,active=0,trashed_at=? WHERE "+where).run(new Date().toISOString(),...args);
  return {ok:true,trashed:!restore};
 }).immediate();
}
module.exports={ensureTrashColumns,changeTrash};
