import {run} from '../worker/index.js';
import {writeFile} from 'node:fs/promises';
const map=new Map();const env={BUCKET:{get:async k=>map.has(k)?{json:async()=>JSON.parse(map.get(k))}:null,put:async(k,v)=>{map.set(k,v);return {}},list:async({prefix})=>({objects:[...map.keys()].filter(k=>k.startsWith(prefix)).map(key=>({key})),truncated:false})}};
const result=await run(env,process.argv[2]||'2026-10-21',3);await writeFile('/tmp/edgeform-real-batch.json',JSON.stringify(result,null,2));console.log(JSON.stringify({status:result.status,discovered:result.discovered,records:result.records.map(r=>({id:r.id,match:r.match,start:r.start,samples:[r.homeSample,r.awaySample],verdict:r.verdict})),coverage:result.coverage}));
