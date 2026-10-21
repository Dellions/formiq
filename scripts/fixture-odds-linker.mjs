// Explicit senior-football aliases only. Never strip gender, age or reserve labels.
const FOOTBALL_TEAM_GROUPS = [
  ['Manchester United FC','Manchester United','Man Utd'],
  ['Lille OSC','Lille'], ['FC Bayern München','Bayern Munich'],
  ['FC Arsenal','Arsenal'], ['Viking','Viking FK'],
  ['Real Betis','Betis'], ['Feyenoord Rotterdam','Feyenoord']
];
const FOOTBALL_LEAGUE_GROUPS = [
  ['Champions League','International Clubs UEFA Champions League','UEFA Champions League'],
  ['England Premier League','English Premier League','Premier League']
];
const BASKETBALL_TEAM_GROUPS=[['Hapoel Tel-Aviv','Hapoel Tel Aviv BC'],['Virtus Bologna','Virtus Pallacanestro Bologna']];
const BASKETBALL_LEAGUE_GROUPS=[['USA NBA','NBA'],['International Euroleague','EuroLeague Basketball','EuroLeague'],['Germany BBL','German BBL']];
const HOCKEY_LEAGUE_GROUPS=[['USA NHL','NHL'],['Russia KHL','KHL'],['Sweden SHL','SHL'],['USA AHL','American AHL','AHL'],['Germany DEL','DEL'],['Finland Liiga','Liiga']];
// Conservative cross-source linking. A candidate is never verification or a bet.
export function linkObservations(sample, fixtures, now = Date.now()) {
  const norm = x => String(x || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const sports = {football:'Football', basketball:'Basketball', iceHockey:'Ice hockey', handball:'Handball'};
  const aliasKey=(value,groups)=>{const n=norm(value);const i=groups.findIndex(g=>g.some(v=>norm(v)===n));return i<0?'literal:'+n:'group:'+i};
  const rows = (sample?.observations || []).map(o => {
    const teams=o.sportPath==='football'?FOOTBALL_TEAM_GROUPS:o.sportPath==='basketball'?BASKETBALL_TEAM_GROUPS:[];
    const leagues=o.sportPath==='football'?FOOTBALL_LEAGUE_GROUPS:o.sportPath==='basketball'?BASKETBALL_LEAGUE_GROUPS:o.sportPath==='iceHockey'?HOCKEY_LEAGUE_GROUPS:[];
    const leagueKey=value=>aliasKey(String(value||'').replace(/\s+20\d{2}\/20\d{2}$/,''),leagues);
    const exact=f=>norm(f.home?.name)===norm(o.home)&&norm(f.away?.name)===norm(o.away)&&norm(f.league)===norm(o.competitionSourceLabel);
    const candidates = fixtures.filter(f => f.sport === sports[o.sportPath] &&
      Number.isFinite(Date.parse(o.start)) && Date.parse(f.start) === Date.parse(o.start) &&
      (exact(f)||['football','basketball','iceHockey'].includes(o.sportPath)&&
        aliasKey(f.home?.name,teams)===aliasKey(o.home,teams)&&
        aliasKey(f.away?.name,teams)===aliasKey(o.away,teams)&&
        leagueKey(f.league)===leagueKey(o.competitionSourceLabel)));
    const f = candidates.length === 1 ? candidates[0] : null;
    const reasons = [];
    if (!f) reasons.push(candidates.length > 1 ? 'Ambiguous fixture identity' : 'No exact team, competition and kickoff match; review required');
    const observed = Date.parse(o.observedAt), start = Date.parse(o.start);
    if (!Number.isFinite(observed) || observed > now || observed <= now - 1800000) reasons.push('Stale, future-dated or missing observation time');
    if (!Number.isFinite(start) || start <= now) reasons.push('Fixture is not upcoming');
    const quotes = (o.quotes || []).map(q => {
      const gaps = [...reasons];
      if (!Number.isFinite(q.odds) || q.odds <= 1) gaps.push('Invalid decimal price');
      if (q.period !== 'full_match') gaps.push('Full-match period unconfirmed');
      if (!({win:['home','away'], total:['over','under'], btts:['yes','no'], double_chance:['1X','X2']}[q.type] || []).includes(q.side) || q.type === 'total' && (!Number.isFinite(q.line) || q.line < .5 || q.line % 1 !== .5)) gaps.push('Unsupported market or line');
      if (q.rulesVerified !== true || !['regulation','including_overtime','including_overtime_and_shootout'].includes(q.settlement)) gaps.push('Exact settlement rules unverified');
      // Collector output cannot assert independent price/mapping verification.
      gaps.push('Independent price and identity verification required', 'Calibrated model required');
      return {...q, gaps, usableForBetting:false, probability:null, estimatedEV:null};
    });
    return {...o, eventId:f?.eventId || null, mappingStatus:f?(exact(f)?'exact_candidate':'alias_candidate'):'unmatched',
      candidateCount:candidates.length, aliasRegistryVersion:'scoped-sports-v2',
      researchFixture:f?{eventId:f.eventId,home:f.home.name,away:f.away.name,league:f.league,start:f.start,sources:f.sources||[]}:null,
      mappingVerified:false, reasons, quotes, publicationEligible:false};
  });
  return {generatedAt:new Date(now).toISOString(), observedAt:sample?.observedAt || sample?.startedAt || null,
    status:'research_only', publicationEligible:false, fixtureCount:rows.length,
    exactCandidates:rows.filter(r=>r.mappingStatus==='exact_candidate').length,
    aliasCandidates:rows.filter(r=>r.mappingStatus==='alias_candidate').length,
    unmatched:rows.filter(r=>!r.eventId).length, rows,
    note:'Source-observed prices; exact candidates still require independent verification. No price is a betting recommendation.'};
}
