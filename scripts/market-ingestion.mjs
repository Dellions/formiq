// No network requests and no automatic promotion to a betting recommendation.
const https=value=>{try{const u=new URL(value);return u.protocol==='https:'&&!u.username&&!u.password;}catch{return false;}};
const normalized=s=>String(s||'').normalize('NFKC').trim().toLowerCase().replace(/\s+/g,' ');
const timed=value=>typeof value==='string'&&/T.*(?:Z|[+-]\d{2}:\d{2})$/.test(value)&&Number.isFinite(Date.parse(value));
export function inspectQuote(q,fixtures,now=Date.now()){
  const reasons=[],reject=s=>reasons.push(s);
  if(!q||typeof q!=='object')return {status:'quarantined',reasons:['Invalid quote']};
  const matches=fixtures.filter(f=>f.eventId===q.eventId);
  const f=matches.length===1?matches[0]:null;
  if(!f)reject('Fixture ID missing or ambiguous');
  if(!Number.isFinite(q.odds)||q.odds<=1)reject('Decimal odds must be greater than one');
  if(!q.bookmaker||!q.bookmakerEventId)reject('Bookmaker identity and event ID required');
  if(!https(q.sourceURL)||!https(q.rulesURL))reject('Price and rules HTTPS evidence required');
  const observed=Date.parse(q.observedAt),start=Date.parse(q.start);
  if(!timed(q.observedAt)||observed>now||observed<=now-30*60000)reject('Quote is stale, future-dated or untimed');
  if(!timed(q.start)||start<=now||observed>=start)reject('Upcoming pre-match quote required');
  if(f && (f.sport!==q.sport||normalized(f.league)!==normalized(q.league)||normalized(f.home?.name)!==normalized(q.home)||normalized(f.away?.name)!==normalized(q.away)||Date.parse(f.start)!==start))reject('Fixture identity, home/away, competition or kickoff mismatch');
  if(q.type==='total'){
    if(!['over','under'].includes(q.side)||!Number.isFinite(q.line)||q.line<.5||q.line%1!==.5)reject('Supported total requires over/under and a positive half-point line');
  }else if(!({win:['home','away'],double_chance:['1X','X2'],btts:['yes','no']}[q.type]||[]).includes(q.side))reject('Unsupported market/side');
  if(q.type!=='total'&&q.line!=null)reject('Unexpected line on non-total market');
  if(q.period!=='full_match'||!['regulation','including_overtime','including_overtime_and_shootout'].includes(q.settlement))reject('Exact full-match settlement required');
  if(f?.sport==='Football'&&q.settlement!=='regulation')reject('Football market is not regulation time');
  if(q.mappingVerified!==true)reject('Cross-source mapping has not been reviewed');
  if(q.priceVerified!==true||q.rulesVerified!==true)reject('Price/rules verification missing');
  if(!https(q.verificationURL)||!timed(q.verifiedAt)||Date.parse(q.verifiedAt)<observed||Date.parse(q.verifiedAt)>now)reject('Timed verification evidence required');
  return {status:reasons.length?'quarantined':'research_only',reasons,eventId:q.eventId,quote:q,
    publicationEligible:false,probability:null,estimatedEV:null,
    note:'Schema and identity checks do not independently verify the source, calibrate a model, or authorize publication.'};
}
