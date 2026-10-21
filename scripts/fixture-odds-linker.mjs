// Conservative cross-source linking. A candidate is never verification or a bet.
export function linkObservations(sample, fixtures, now = Date.now()) {
  const norm = x => String(x || '').normalize('NFKC').trim().toLowerCase().replace(/\s+/g, ' ');
  const sports = {football:'Football', basketball:'Basketball', iceHockey:'Ice Hockey', handball:'Handball'};
  const rows = (sample?.observations || []).map(o => {
    const candidates = fixtures.filter(f => f.sport === sports[o.sportPath] &&
      norm(f.home?.name) === norm(o.home) && norm(f.away?.name) === norm(o.away) &&
      Number.isFinite(Date.parse(o.start)) && Date.parse(f.start) === Date.parse(o.start) &&
      norm(f.league) === norm(o.competitionSourceLabel));
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
    return {...o, eventId:f?.eventId || null, mappingStatus:f?'exact_candidate':'unmatched', mappingVerified:false, reasons, quotes, publicationEligible:false};
  });
  return {generatedAt:new Date(now).toISOString(), observedAt:sample?.observedAt || sample?.startedAt || null,
    status:'research_only', publicationEligible:false, fixtureCount:rows.length,
    exactCandidates:rows.filter(r=>r.eventId).length, rows,
    note:'Source-observed prices; exact candidates still require independent verification. No price is a betting recommendation.'};
}
