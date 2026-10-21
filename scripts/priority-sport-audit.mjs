// Descriptive inputs only. Does not invent possession, xG, lineups or probabilities.
export function prioritySportAudit(f, now=Date.now()) {
  if(!['Basketball','Ice hockey'].includes(f.sport))return null;
  const start=Date.parse(f.start),mean=xs=>xs.length?xs.reduce((a,b)=>a+b,0)/xs.length:null;
  function team(rows,venue){
    const ids=new Set(),accepted=[],excluded=[];
    for(const r of [...(rows||[])].sort((a,b)=>Date.parse(b.date)-Date.parse(a.date))){
      const t=Date.parse(r.date),key=r.id||[r.date,r.opponent,r.venue].join('|');
      if(!Number.isFinite(t)||t>=Math.min(start,now)||!Number.isFinite(r.gf)||!Number.isFinite(r.ga)||r.gf<0||r.ga<0||ids.has(key)){excluded.push({id:r.id||null,reason:'Missing/invalid score or date, duplicate or not completed before observation'});continue}
      ids.add(key);accepted.push(r);
    }
    const recent=accepted.slice(0,10),summary=rs=>{
      const totals=rs.map(r=>r.gf+r.ga),avg=mean(totals);
      return {n:rs.length,scored:mean(rs.map(r=>r.gf)),conceded:mean(rs.map(r=>r.ga)),combinedTotal:avg,
        margin:mean(rs.map(r=>r.gf-r.ga)),totalSD:rs.length>1?Math.sqrt(totals.reduce((s,x)=>s+(x-avg)**2,0)/(rs.length-1)):null,
        winRate:rs.length?rs.filter(r=>r.gf>r.ga).length/rs.length:null};
    };
    const split=recent.filter(r=>r.venue===venue);
    return {last10:summary(recent),last5:summary(recent.slice(0,5)),venue:summary(split),venueType:venue,
      sampleStatus:recent.length>=10?'preferred_10':recent.length>=6?'fallback_6_to_9':'insufficient',
      restDays:recent.length?(start-Date.parse(recent[0].date))/86400000:null,
      longGap:recent.length?(start-Date.parse(recent[0].date))/86400000>45:null,
      overtimeScope:'Source final scores; overtime/shootout inclusion not independently verified',excluded};
  }
  const home=team(f.history?.home,'home'),away=team(f.history?.away,'away');
  const enough=home.last10.n>=6&&away.last10.n>=6;
  return {version:'priority-sports-v1',classification:'CALCULATED_DESCRIPTIVE',home,away,
    scoreSampleSufficient:enough,modelReady:false,calibrated:false,publicationEligible:false,
    units:f.sport==='Basketball'?'points':'goals',
    missing:f.sport==='Basketball'?['Possessions and pace','Opponent-adjusted offensive/defensive efficiency','Injuries and rotations','Travel','Confirmed market and overtime settlement','Historical calibration']:['Expected goals/chance quality','Starting goalie confirmation','Power play and penalty kill','Rest/travel context','Confirmed regulation/overtime/shootout settlement','Historical calibration'],
    note:'Last-five/ten and venue descriptions are calculated from available score history. They are not an opponent-adjusted projection or an achieved accuracy result.'};
}
