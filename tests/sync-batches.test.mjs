import assert from 'node:assert/strict';
import {syncBatches} from '../scripts/export-sync-batches.mjs';
const records=Array.from({length:25},(_,i)=>({id:String(i),start:'2026-10-21T12:00:00Z',data:'x'.repeat(20000)}));
const d=syncBatches([...records,{id:'huge',data:'x'.repeat(180001)}]);
assert.equal(d.batches.flatMap(x=>x.records).length,25);assert.equal(d.skipped.length,1);
for(const b of d.batches){assert.ok(b.records.length<=10);assert.ok(Buffer.byteLength(JSON.stringify(b))<=180000)}
assert.deepEqual(syncBatches([]),{batches:[],skipped:[]});
console.log('Bounded sync export: record preservation, byte/count limits and skipped records passed');
