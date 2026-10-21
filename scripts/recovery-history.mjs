import {teamNameKey} from '../worker/index.js';
export function mergeRecoveryHistory(old,added,sport,now=Date.now()){
 const norm=s=>String(s||'').normalize('NFKD').replace(/[\u0300-\u036f]/g,'').toLowerCase().replace(/[^a-z0-9]/g,'');
 const identity=r=>[r.date.slice(0,10),sport==='Football'?teamNameKey(r.opponent):norm(r.opponent),r.venue].join('|');
 const map=new Map(),conflicts=new Set();let oldDuplicates=0;const oldKeys=new Set();
 for(const r of old){if(!r.date||!r.opponent)continue;const k=identity(r);if(oldKeys.has(k))oldDuplicates++;oldKeys.add(k)}
 for(const r of [...old,...added]){if(!Number.isFinite(r.gf)||!Number.isFinite(r.ga)||r.gf<0||r.ga<0||!Number.isFinite(Date.parse(r.date))||Date.parse(r.date)>=now||Date.parse(r.date)<=now-365*86400000||!r.opponent)continue;const k=identity(r);if(map.has(k)&&(map.get(k).gf!==r.gf||map.get(k).ga!==r.ga)){conflicts.add(k);continue}map.set(k,{...r,historyIdentityKey:k})}
 return {rows:[...map].filter(([k])=>!conflicts.has(k)).map(([,r])=>r).sort((a,b)=>Date.parse(b.date)-Date.parse(a.date)).slice(0,10),conflicts:[...conflicts],oldDuplicates};
}
