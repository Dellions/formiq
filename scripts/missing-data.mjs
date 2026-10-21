// Detect gaps independently of whether a primary collector reported success.
export function missingDataAudit(records,observations=null,attempts=[],now=Date.now()){
  const prior=new Map(attempts.map(a=>[a.taskId,a]));
  const normalize=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
  const valid=rows=>[...new Map((rows||[]).filter(r=>Number.isFinite(r.gf)&&Number.isFinite(r.ga)&&r.gf>=0&&r.ga>=0&&Number.isFinite(Date.parse(r.date))&&Date.parse(r.date)<now&&Date.parse(r.date)>now-365*86400000).map(r=>[r.historyIdentityKey||(r.opponent?[r.date.slice(0,10),normalize(r.opponent),r.venue].join('|'):r.id||r.date),r])).values()].slice(0,10);
  const wat=t=>new Intl.DateTimeFormat('en-CA',{timeZone:'Africa/Lagos'}).format(t);
  const rows=records.filter(r=>Date.parse(r.start)>now&&wat(new Date(r.start))<=wat(new Date(now+2*86400000))).map(r=>{
    const gaps=[];
    for(const side of ['home','away']){const n=valid(r.history?.[side]).length;if(n<10)gaps.push({field:'history.'+side,actual:n,target:10,minimum:6,severity:n<6?'blocking':'preferred',reason:n<6?'Fewer than six valid completed results':'Preferred last-ten history incomplete',adapter:r.sport==='Ice hockey'&&r.league==='NHL'?'official-nhl-schedule':r.sport==='Basketball'&&r[side]?.id==='135386'?'virtus-club-schedule':r.sport==='Basketball'&&r[side]?.id==='136059'?'basketnews-hapoel':r.sport==='Football'?'cached-domestic-history':null})}
    const prices=(observations?.rows||[]).filter(o=>o.eventId===r.eventId).flatMap(o=>(o.quotes||[]).filter(q=>Number.isFinite(q.odds)&&q.odds>1).map(q=>({...q,observedAt:o.observedAt})));
    if(!prices.some(q=>Date.parse(q.observedAt)<=now&&Date.parse(q.observedAt)>now-1800000))gaps.push({field:'freshPrices',severity:'blocking',reason:'No fresh fixture-linked price',adapter:null});
    if(!prices.some(q=>q.rulesVerified===true&&q.settlement!=='unverified'))gaps.push({field:'exactRules',severity:'blocking',reason:'Independent exact market/rule verification missing',adapter:null});
    if(r.fixtureConfirmed!==true)gaps.push({field:'fixtureConfirmation',severity:'blocking',reason:'Independent fixture confirmation missing',adapter:null});
    const advanced=r.sport==='Basketball'?['pace','offensiveEfficiency','defensiveEfficiency','playerAvailability']:r.sport==='Ice hockey'?['expectedGoals','startingGoalie','powerPlay','penaltyKill']:['opponentStrength','playerAvailability'];
    for(const key of advanced)if(r.advancedInputs?.[key]==null)gaps.push({field:'advanced.'+key,severity:'research',reason:'Verified sport-specific input missing',adapter:null});
    const tasks=gaps.map(g=>{const taskId=r.eventId+':'+g.field,a=prior.get(taskId);return {...g,taskId,status:a?.status|| (g.adapter?'queued':'no_supported_adapter'),lastAttempt:a||null}});
    return {eventId:r.eventId,match:r.match,sport:r.sport,league:r.league,start:r.start,minimumHistoryReady:['home','away'].every(s=>valid(r.history?.[s]).length>=6),preferredHistoryReady:['home','away'].every(s=>valid(r.history?.[s]).length>=10),gaps:tasks};
  });
  return {generatedAt:new Date(now).toISOString(),status:'partial',records:rows,fixtures:rows.length,withGaps:rows.filter(r=>r.gaps.length).length,
    historyBlocking:rows.filter(r=>!r.minimumHistoryReady).length,historyPreferredIncomplete:rows.filter(r=>!r.preferredHistoryReady).length,
    automaticHistoryTasks:rows.flatMap(r=>r.gaps).filter(g=>g.adapter).length,publicationEligible:false,
    note:'Successful collection is not data completeness. Unsupported adapters remain explicit gaps; cached or failed attempts are never reported as recovered data.'};
}
