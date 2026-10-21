import assert from 'node:assert/strict';
import {collectHorizon,rateLimited} from '../scripts/horizon-runner.mjs';
import {inspectQuote} from '../scripts/market-ingestion.mjs';
const calls=[],checkpoints=[];
const dates=['2026-10-21','2026-10-22','2026-10-23'];
assert.equal(rateLimited({coverage:[{retrievedAt:'2026-10-21T10:00:00.429Z',reason:'Cached source'}]}),false);
const receipt=await collectHorizon({dates,refresh:async d=>{calls.push('refresh '+d);return {screened:1,status:'partial'};},
  loadCursor:async()=>2,collect:async(d,c)=>{calls.push('collect '+d+' '+c);return {nextCursor:4,records:[],coverage:[{status:'history_failed',reason:'Public source returned HTTP 429'}]};},
  checkpoint:async(d,c)=>checkpoints.push([d,c]),snapshot:async()=>{}});
assert.deepEqual(calls,[...dates.map(d=>'refresh '+d),'collect 2026-10-21 2']);
assert.equal(receipt.stopReason,'HTTP_429');assert.deepEqual(checkpoints,[[dates[0],2]]);assert.equal(receipt.unfinished.length,3);
let active=0,maxActive=0;
const serial=await collectHorizon({dates,refresh:async()=>({screened:0}),loadCursor:async()=>0,collect:async()=>{active++;maxActive=Math.max(maxActive,active);await Promise.resolve();active--;return {nextCursor:null,records:[],coverage:[]};},checkpoint:async()=>{},snapshot:async()=>{}});
assert.equal(maxActive,1);assert.equal(serial.status,'catalogue_processed');
const budget=await collectHorizon({dates,refresh:async()=>({}),loadCursor:async()=>0,collect:async()=>{throw Error('Should not run');},checkpoint:async()=>{},snapshot:async()=>{},maxBatches:0});assert.equal(budget.stopReason,'BATCH_BUDGET');
// Synthetic test inputs, never written to research records.
const now=Date.parse('2026-10-21T10:00:00Z'),f={eventId:'test-only',sport:'Ice hockey',league:'Test League',home:{name:'Home'},away:{name:'Away'},start:'2026-10-22T10:00:00Z'};
const q={eventId:f.eventId,sport:f.sport,league:f.league,home:'Home',away:'Away',start:f.start,odds:1.9,bookmaker:'Test only',bookmakerEventId:'synthetic',sourceURL:'https://example.test/price',rulesURL:'https://example.test/rules',verificationURL:'https://example.test/evidence',observedAt:'2026-10-21T09:55:00Z',verifiedAt:'2026-10-21T09:56:00Z',type:'total',side:'over',line:5.5,period:'full_match',settlement:'including_overtime_and_shootout',mappingVerified:true,priceVerified:true,rulesVerified:true};
assert.equal(inspectQuote(q,[f],now).status,'research_only');
for(const patch of [{home:'Away',away:'Home'},{start:'2026-10-22T10:05:00Z'},{league:'Other league'},{observedAt:'2026-10-21T08:00:00Z'},{observedAt:'2026-10-21T10:00:01Z'},{observedAt:'2026-10-21T09:55:00'},{line:null},{line:-.5},{odds:0},{rulesURL:null},{rulesVerified:false},{mappingVerified:false},{verifiedAt:'2026-10-21T09:54:00Z'},{period:'first_half'}])assert.equal(inspectQuote({...q,...patch},[f],now).status,'quarantined',JSON.stringify(patch));
assert.equal(inspectQuote(q,[f,f],now).status,'quarantined');
assert.equal(inspectQuote(q,[f],now).publicationEligible,false);assert.equal(inspectQuote(q,[f],now).estimatedEV,null);
console.log('PASS: core horizon first, serial collection, rate-limit stop/resume, budget receipt, fixture identity, stale odds, exact market/rules quarantine, no automatic publication.');
