import assert from 'node:assert/strict';
import {prioritySportAudit} from '../scripts/priority-sport-audit.mjs';
const now=Date.parse('2026-10-21T12:00:00Z'),rows=Array.from({length:10},(_,i)=>({id:String(i),date:new Date(now-(i+1)*86400000).toISOString(),gf:80+i,ga:70,venue:i%2?'home':'away'}));
const f={sport:'Basketball',start:new Date(now+86400000).toISOString(),history:{home:rows,away:rows}};
const a=prioritySportAudit(f,now);assert.equal(a.home.last10.n,10);assert.equal(a.home.last10.scored,84.5);assert.equal(a.home.last5.scored,82);assert.equal(a.home.venue.n,5);assert.equal(a.home.restDays,2);assert.equal(a.modelReady,false);
const dirty=[...rows,rows[0],{...rows[0],id:'future',date:new Date(now+1000).toISOString()},{...rows[0],id:'missing',gf:null}];
const b=prioritySportAudit({...f,sport:'Ice hockey',history:{home:dirty,away:rows.slice(0,5)}},now);assert.equal(b.home.last10.n,10);assert.equal(b.home.excluded.length,3);assert.equal(b.away.sampleStatus,'insufficient');assert.equal(b.scoreSampleSufficient,false);assert.equal(b.units,'goals');
assert.equal(prioritySportAudit({...f,sport:'Football'},now),null);console.log('Priority sport audit: windows, splits, duplicate/missing/future exclusions and no invented inputs passed');
