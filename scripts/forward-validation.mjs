// Forward research audit: never reconstruct a past forecast from a later model.
export function freezeForecast(r,now=Date.now()){
  const f=r.forecast,p=f?.probability;
  if(!f||!Number.isFinite(p)||p<=0||p>=1||Date.parse(r.start)<=now||r.homeSample<6||r.awaySample<6||!r.sources?.length)return null;
  if(!['win','total','double_chance','btts'].includes(f.type))return null;
  if(f.type==='total'&&(!Number.isFinite(f.line)||f.line%1!==.5))return null;
  return {id:r.eventId,eventId:r.eventId,match:r.match,sport:r.sport,league:r.league,start:r.start,home:r.home,away:r.away,
    recordedAt:new Date(now).toISOString(),modelVersion:f.modelVersion||r.pipelineVersion,
    type:f.type,side:f.side,line:f.line??null,probability:p,period:f.period,settlement:f.settlement,
    homeSample:r.homeSample,awaySample:r.awaySample,sources:r.sources,
    classification:'FORWARD_EXPERIMENTAL_FORECAST',calibrated:false,publicationEligible:false,
    odds:null,estimatedEV:null,note:'First recorded forecast per fixture; descriptive source-final scoring only, never bookmaker settlement.'};
}
export function scoreFrozen(f,records,now=Date.now()){
  if(Date.parse(f.start)>=now||Date.parse(f.recordedAt)>=Date.parse(f.start))return null;
  const candidates=[];
  for(const r of records){
    if(r.sport!==f.sport)continue;
    for(const side of ['home','away']){
      const owner=r[side];
      for(const h of r.history?.[side]||[]){
        let sameEvent=h.id===f.eventId;
        if(!sameEvent&&f.eventId.startsWith('ol-')&&String(h.id)===f.eventId.slice(3)){try{sameEvent=new URL(h.url).hostname==='api.openligadb.de'}catch{}}
        if(!sameEvent||Date.parse(h.date)!==Date.parse(f.start)||!Number.isFinite(h.gf)||!Number.isFinite(h.ga)||h.gf<0||h.ga<0)continue;
        if(!/^https:\/\//.test(h.url||''))continue;
        let home,away;
        if(String(owner.id)===String(f.home.id)&&String(h.opponentId)===String(f.away.id)){home=h.gf;away=h.ga}
        else if(String(owner.id)===String(f.away.id)&&String(h.opponentId)===String(f.home.id)){home=h.ga;away=h.gf}
        else continue;
        candidates.push({home,away,url:h.url});
      }
    }
  }
  if(!candidates.length||new Set(candidates.map(c=>c.home+':'+c.away)).size!==1)return null;
  // Source-final basketball/hockey outcomes must never be mixed with regulation markets.
  if(['Basketball','Ice hockey','Handball'].includes(f.sport)&&f.period!=='source_final')return null;
  const {home,away}=candidates[0];let outcome;
  if(f.type==='total')outcome=f.side==='over'?home+away>f.line:f.side==='under'?home+away<f.line:undefined;
  else if(f.type==='win')outcome=f.side==='home'?home>away:f.side==='away'?away>home:undefined;
  else if(f.type==='double_chance')outcome=f.side==='1X'?home>=away:f.side==='X2'?away>=home:undefined;
  else if(f.type==='btts')outcome=f.side==='yes'?home>0&&away>0:f.side==='no'?home===0||away===0:undefined;
  if(outcome===undefined)return null;
  return {eventId:f.eventId,home,away,outcome:Number(outcome),scoredAt:new Date(now).toISOString(),sources:[...new Set(candidates.map(c=>c.url))],classification:'SOURCE_FINAL_RESEARCH_OUTCOME',bettingSettlement:false};
}
export function forwardMetrics(forecasts,outcomes){
  const resultMap=new Map(outcomes.map(x=>[x.eventId,x])),groups=new Map();
  for(const f of forecasts){const key=[f.sport,f.league,f.modelVersion,f.type,f.side,f.period,f.settlement].join('|');if(!groups.has(key))groups.set(key,[]);groups.get(key).push(f)}
  return {type:'PROSPECTIVE_EXPERIMENTAL_AUDIT',recorded:forecasts.length,resolved:outcomes.length,calibrated:false,publicationEligible:false,
    groups:[...groups].map(([key,fs])=>{const rs=fs.filter(f=>resultMap.has(f.eventId)),n=rs.length;
      const bins=Array.from({length:5},(_,i)=>{const rows=rs.filter(f=>f.probability>=i*.2&&f.probability<(i+1)*.2);return {range:[i*.2,(i+1)*.2],n:rows.length,predicted:rows.length?rows.reduce((s,f)=>s+f.probability,0)/rows.length:null,observed:rows.length?rows.reduce((s,f)=>s+resultMap.get(f.eventId).outcome,0)/rows.length:null}});
      return {key,recorded:fs.length,resolved:n,pending:fs.length-n,hitRate:n?rs.reduce((s,f)=>s+resultMap.get(f.eventId).outcome,0)/n:null,brier:n?rs.reduce((s,f)=>s+(f.probability-resultMap.get(f.eventId).outcome)**2,0)/n:null,logLoss:n?-rs.reduce((s,f)=>{const y=resultMap.get(f.eventId).outcome;return s+y*Math.log(f.probability)+(1-y)*Math.log(1-f.probability)},0)/n:null,bins,reviewThresholdReached:n>=100,calibrated:false};}),
    limitations:['No automatic calibration certification at any sample size','Source-final research outcomes are not verified bookmaker settlement','No ROI or accumulator performance without historical verified prices','First forecast per fixture is frozen; later revisions do not replace it']};
}
