import fs from 'node:fs/promises';
const path='research/snapshot/picks.json',p=JSON.parse(await fs.readFile(path,'utf8'));let changed=0;
let names=[];try{names=await fs.readdir('research/supplements')}catch(e){if(e.code!=='ENOENT')throw e}
for(const name of names.filter(n=>/^tsdb-\d+\.json$/.test(n)).slice(0,50)){
  const r=JSON.parse(await fs.readFile('research/supplements/'+name,'utf8'));
  if(r.id!==name.slice(0,-5)||r.id!==r.eventId||r.generatedByScan!==false||r.publicationStatus!=='research')throw Error('Invalid research supplement');
  const i=p.records.findIndex(x=>x.id===r.id),old=p.records[i];
  if(old?.publicationStatus==='published'||old?.savedAt&&!old.generatedByScan&&Date.parse(old.savedAt)>=Date.parse(r.savedAt||r.completedAt))continue;
  const saved={...r,savedAt:new Date().toISOString()};if(i<0)p.records.push(saved);else p.records[i]=saved;changed++;
}
if(changed)await fs.writeFile(path,JSON.stringify(p,null,2));
console.log(JSON.stringify({reviewedSupplementsMerged:changed}));
