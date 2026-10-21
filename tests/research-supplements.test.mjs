import assert from 'node:assert/strict';import fs from 'node:fs/promises';import os from 'node:os';import path from 'node:path';import {execFileSync} from 'node:child_process';import {fileURLToPath} from 'node:url';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'formiq-supplement-test-')),script=fileURLToPath(new URL('../scripts/merge-research-supplements.mjs',import.meta.url));
const record=(id,patch={})=>({id,eventId:id,publicationStatus:'research',generatedByScan:false,completedAt:'2026-10-21T12:00:00Z',value:'reviewed',...patch});
try{
 await fs.mkdir(root+'/research/snapshot',{recursive:true});await fs.mkdir(root+'/research/supplements',{recursive:true});
 await fs.writeFile(root+'/research/snapshot/picks.json',JSON.stringify({records:[record('tsdb-1',{publicationStatus:'published',value:'published'}),record('tsdb-2',{savedAt:'2026-10-21T13:00:00Z',value:'newer'}),record('tsdb-3',{generatedByScan:true,value:'scan'})]}));
 for(const id of ['tsdb-1','tsdb-2','tsdb-3'])await fs.writeFile(root+'/research/supplements/'+id+'.json',JSON.stringify(record(id)));
 execFileSync(process.execPath,[script],{cwd:root});let p=JSON.parse(await fs.readFile(root+'/research/snapshot/picks.json'));
 assert.equal(p.records[0].value,'published');assert.equal(p.records[1].value,'newer');assert.equal(p.records[2].value,'reviewed');assert(p.records[2].savedAt);
 const before=JSON.stringify(p);execFileSync(process.execPath,[script],{cwd:root});p=JSON.parse(await fs.readFile(root+'/research/snapshot/picks.json'));assert.equal(JSON.stringify(p),before);
 console.log('Supplement merge: published/newer enrichment preserved, scan repaired and repeated import idempotent');
}finally{await fs.rm(root,{recursive:true,force:true})}
