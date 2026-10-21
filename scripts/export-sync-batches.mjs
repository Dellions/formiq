import fs from 'node:fs/promises';
import {pathToFileURL} from 'node:url';
export function syncBatches(records) {
  const batches=[],skipped=[];let batch=[];
  const bytes=rs=>Buffer.byteLength(JSON.stringify({records:rs}));
  for(const r of [...records].sort((a,b)=>String(a.start).localeCompare(String(b.start)))){
    if(bytes([r])>180000){skipped.push({id:r.id,reason:'Record exceeds 180KB transfer limit'});continue}
    if(batch.length===10||bytes([...batch,r])>180000){batches.push({records:batch});batch=[]}
    batch.push(r);
  }
  if(batch.length)batches.push({records:batch});
  return {batches,skipped};
}
if(process.argv[1]&&import.meta.url===pathToFileURL(process.argv[1]).href){
  const source=JSON.parse(await fs.readFile('research/snapshot/picks.json','utf8'));
  const {batches,skipped}=syncBatches(source.records||[]),dir='research/snapshot/sync';
  await fs.mkdir(dir,{recursive:true});
  for(const p of await fs.readdir(dir))if(/^batch-\d+\.json$/.test(p))await fs.unlink(dir+'/'+p);
  const files=[];
  for(let i=0;i<batches.length;i++){const name='batch-'+i+'.json',text=JSON.stringify(batches[i]);await fs.writeFile(dir+'/'+name,text);files.push({path:dir+'/'+name,bytes:Buffer.byteLength(text),recordIds:batches[i].records.map(r=>r.id)})}
  await fs.writeFile(dir+'/manifest.json',JSON.stringify({snapshotUpdated:source.updated,generatedAt:new Date().toISOString(),files,skipped},null,2));
  console.log(JSON.stringify({syncBatches:files.length,records:files.reduce((n,f)=>n+f.recordIds.length,0),skipped:skipped.length}));
}
