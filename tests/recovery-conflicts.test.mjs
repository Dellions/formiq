import assert from 'node:assert/strict';
import {buildResearch,eligible} from '../worker/index.js';
import {missingDataAudit} from '../scripts/missing-data.mjs';
const now=Date.now(), h=Array.from({length:10},(_,i)=>({id:String(i),date:new Date(now-(i+1)*86400000).toISOString(),gf:2,ga:1,total:3,venue:'home',opponent:'Opponent '+i}));
const f={eventId:'conflict-test',sport:'Football',start:new Date(now+86400000).toISOString(),home:{name:'A'},away:{name:'B'},history:{home:h,away:h},dataRecoveryConflicts:['2026-09-12|brentford|home']};
const r=buildResearch(f);assert.equal(r.forecast,null);assert.equal(r.projection,null);assert.deepEqual(r.markets,[]);assert.equal(r.steps[8].alternatives.length,0);assert.equal(eligible({...r,publicationStatus:'published'}),false);assert(missingDataAudit([r],null,[],now).records[0].gaps.some(g=>g.field==='historyConflicts'&&g.severity==='blocking'));
console.log('Conflicting score histories block projections, forecasts and publication; audit exposes review requirement');
