import fs from 'node:fs/promises';import {freezeForecast,scoreFrozen,forwardMetrics} from './forward-validation.mjs';
const records=JSON.parse(await fs.readFile('research/snapshot/picks.json','utf8')).records||[];
const base='research/snapshot/forward-ledger';
async function read(kind){await fs.mkdir(base+'/'+kind,{recursive:true});return Promise.all((await fs.readdir(base+'/'+kind)).filter(n=>n.endsWith('.json')).map(async n=>JSON.parse(await fs.readFile(base+'/'+kind+'/'+n,'utf8'))))}
const forecasts=await read('forecasts'),outcomes=await read('outcomes'),known=new Set(forecasts.map(x=>x.eventId)),resolved=new Set(outcomes.map(x=>x.eventId));
let captured=0,scored=0;
for(const r of records.filter(r=>r.sport==='Football')){if(known.has(r.eventId))continue;const f=freezeForecast(r);if(!f)continue;await fs.writeFile(base+'/forecasts/'+encodeURIComponent(f.eventId)+'.json',JSON.stringify(f),{flag:'wx'});forecasts.push(f);known.add(f.eventId);captured++}
for(const f of forecasts){if(resolved.has(f.eventId))continue;const result=scoreFrozen(f,records);if(!result)continue;await fs.writeFile(base+'/outcomes/'+encodeURIComponent(f.eventId)+'.json',JSON.stringify(result),{flag:'wx'});outcomes.push(result);resolved.add(f.eventId);scored++}
const report={...forwardMetrics(forecasts,outcomes),generatedAt:new Date().toISOString(),forecasts,outcomes};
await fs.writeFile('research/snapshot/forward-validation.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({captured,scored,recorded:forecasts.length,resolved:outcomes.length,calibrated:false}));
