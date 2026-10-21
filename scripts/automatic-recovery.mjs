import fs from 'node:fs/promises';import {execFileSync} from 'node:child_process';
import {missingDataAudit} from './missing-data.mjs';import {buildResearch,footballHistory} from '../worker/index.js';
import {mergeRecoveryHistory} from './recovery-history.mjs';
const snapshot='research/snapshot/picks.json',p=JSON.parse(await fs.readFile(snapshot,'utf8'));
const read=async(path,fallback)=>{try{return JSON.parse(await fs.readFile(path,'utf8'))}catch(e){if(e.code==='ENOENT')return fallback;throw e}};
const previous=await read('research/snapshot/recovery-report.json',{attempts:[]}),observations=await read('research/snapshot/market-observations.json',null);
const audit=missingDataAudit(p.records,observations,previous.attempts),tasks=audit.records.flatMap(r=>r.gaps.filter(g=>g.adapter).map(g=>({...g,eventId:r.eventId,side:g.field.split('.')[1],teamName:p.records.find(f=>f.eventId===r.eventId)[g.field.split('.')[1]]?.name}))).sort((a,b)=>(a.severity==='blocking'?0:1)-(b.severity==='blocking'?0:1)||String(a.lastAttempt?.attemptedAt||'').localeCompare(String(b.lastAttempt?.attemptedAt||'')));
await fs.mkdir('.edgeform-state/recovery',{recursive:true});await fs.writeFile('.edgeform-state/recovery/request.json',JSON.stringify({tasks}));
execFileSync('python',['scripts/recover-public-history.py'],{stdio:'inherit',timeout:360000});
const result=await read('.edgeform-state/recovery/results.json',{attempts:[],results:[]}),historyCache=await read('research/snapshot/source-history-cache.json',{});
const oldHistory=await read('research/recovery/history.json',[]);
result.results=[...new Map([...oldHistory,...result.results].map(r=>[r.eventId+':'+r.side,r])).values()].slice(-1000);
// Reuse only explicitly mapped domestic history already in the cache. No extra CSV downloads.
const domestic={pl:'E0',bl1:'D1',la1:'SP1'};
for(const t of tasks.filter(t=>t.adapter==='cached-domestic-history')){
 const r=p.records.find(r=>r.eventId===t.eventId);const code=(r.sources||[]).map(s=>Object.entries(domestic).find(([shortcut])=>s.url?.includes('/getmatchdata/'+shortcut+'/'))?.[1]).find(Boolean);
 const caches=Object.entries(historyCache).filter(([k])=>code&&k.endsWith('/'+code));let rows=[];const sources=[];
 for(const [,c]of caches){if(!Array.isArray(c.rows))continue;rows.push(...footballHistory(c.rows,r[t.side].name,Date.now(),c.url));sources.push({url:c.url,retrievedAt:new Date(c.at).toISOString(),cached:true})}
 result.attempts.push({taskId:t.taskId,eventId:t.eventId,side:t.side,adapter:t.adapter,attemptedAt:new Date().toISOString(),status:rows.length?'cached_results':'no_cached_alternative',usableResults:rows.length,sources});
 if(rows.length)result.results.push({eventId:t.eventId,side:t.side,history:rows,sources,taskId:t.taskId});
}
const changes=new Map(),outcomes=[];
for(const x of result.results){const original=p.records.find(r=>r.eventId===x.eventId);if(!original||original.publicationStatus==='published'){outcomes.push({taskId:x.taskId,status:'protected_published_record'});continue}
 if(original.savedAt&&!original.generatedByScan){outcomes.push({taskId:x.taskId,status:'protected_reviewed_record',candidateResults:x.history.length});continue}
 const r=changes.get(x.eventId)||structuredClone(original),merged=mergeRecoveryHistory(r.history?.[x.side]||[],x.history,r.sport);
 if(merged.conflicts.length){outcomes.push({taskId:x.taskId,status:'conflicting_scores',conflicts:merged.conflicts});continue}
 if(merged.rows.length<=(r.history?.[x.side]||[]).length&&!merged.oldDuplicates){outcomes.push({taskId:x.taskId,status:'no_sample_improvement',candidateResults:merged.rows.length});continue}
 r.history[x.side]=merged.rows;r.sources=[...r.sources,...x.sources.filter(s=>s.url&&s.retrievedAt).map(s=>({...s,classification:'SOURCE_REPORTED',cacheMaxAgeMinutes:1440}))];r.scope=(original.scope||'')+' Automatic recovery adds sourced domestic/official league scores; competition and venue scope remain source-specific. No opponent-strength adjustment.';changes.set(r.eventId,r);outcomes.push({taskId:x.taskId,status:merged.oldDuplicates?'history_deduplicated':'history_extended',results:merged.rows.length});
}
const completedRecordIds=[];
for(const [id,r]of changes){const rebuilt={...buildResearch(r),generatedByScan:true,recoveredAt:new Date().toISOString(),dataRecovery:'Public fallback history; sport inputs and calibration still incomplete'};p.records[p.records.findIndex(x=>x.eventId===id)]=rebuilt;completedRecordIds.push(id)}
if(changes.size){p.updated=new Date().toISOString();p.message='Saved research includes automatic history recovery. Remaining gaps are listed in the missing-data desk.';await fs.writeFile(snapshot,JSON.stringify(p,null,2))}
const attempts=[...new Map([...previous.attempts,...result.attempts].map(a=>[a.taskId,a])).values()].slice(-1000);
await fs.mkdir('research/recovery',{recursive:true});await fs.writeFile('research/recovery/history.json',JSON.stringify(result.results));
const report={...result,results:undefined,attempts,outcomes,completedRecordIds,automaticRun:true,frameworkExecution:'Partial deterministic history recovery; not complete nine-step research',publicationEligible:false};
await fs.writeFile('research/snapshot/recovery-report.json',JSON.stringify(report,null,2));
await fs.writeFile('research/snapshot/missing-data.json',JSON.stringify(missingDataAudit(p.records,observations,attempts),null,2));
console.log(JSON.stringify({recoveredRecords:completedRecordIds,networkRequests:result.networkRequests,stopReason:result.stopReason,remainingHistoryBlocking:missingDataAudit(p.records).historyBlocking}));
