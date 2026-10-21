import assert from 'node:assert/strict';import {missingDataAudit} from '../scripts/missing-data.mjs';
const now=Date.parse('2026-10-21T12:00:00Z'),h=Array.from({length:10},(_,i)=>({id:String(i),date:'2026-10-10',gf:90,ga:80}));
const f={eventId:'x',sport:'Basketball',league:'EuroLeague Basketball',home:{id:'136059'},away:{id:'135386'},start:'2026-10-21T16:00:00Z',history:{home:h.slice(0,2),away:h.slice(0,6)}};
let d=missingDataAudit([f],null,[],now);assert.equal(d.historyBlocking,1);assert.equal(d.automaticHistoryTasks,2);assert.equal(d.records[0].gaps[0].adapter,'basketnews-hapoel');
d=missingDataAudit([{...f,history:{home:[...h,h[0],{id:'bad',date:'2026-10-22',gf:3,ga:2}],away:h}}],null,[],now);assert.equal(d.historyBlocking,0);assert.equal(d.historyPreferredIncomplete,0);assert(d.records[0].gaps.some(g=>g.field==='freshPrices'));
const attempt={taskId:'x:history.home',status:'failed',error:'HTTP429'};d=missingDataAudit([f],null,[attempt],now);assert.equal(d.records[0].gaps[0].status,'failed');assert.equal(d.historyBlocking,1);
assert.equal(missingDataAudit([{...f,start:'2026-10-20'}],null,[],now).fixtures,0);
console.log('Missing-data audit: preferred/minimum samples, invalid/duplicate exclusion, failure retention and unresolved price gaps passed');
