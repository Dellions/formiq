import assert from 'node:assert/strict';import {mergeRecoveryHistory} from '../scripts/recovery-history.mjs';
const now=Date.parse('2026-10-21T12:00:00Z'),row={id:'ol-1',date:'2026-10-16T18:00:00Z',gf:2,ga:1,opponent:'FC Arsenal',venue:'home'};
let m=mergeRecoveryHistory([row],[{...row,id:'fd-1',opponent:'Arsenal',date:'2026-10-16T19:00:00Z'}],'Football',now);assert.equal(m.rows.length,1);assert.equal(m.conflicts.length,0);
m=mergeRecoveryHistory([row],[{...row,opponent:'Arsenal',gf:3}],'Football',now);assert.equal(m.rows.length,0);assert.equal(m.conflicts.length,1);
m=mergeRecoveryHistory([row,{...row,id:'duplicate',opponent:'Arsenal'}],[],'Football',now);assert.equal(m.oldDuplicates,1);assert.equal(m.rows.length,1);
assert.equal(mergeRecoveryHistory([],[{...row,date:'2026-10-22'}],'Football',now).rows.length,0);
console.log('Recovery merge: cross-provider aliases deduplicated, conflicts excluded, duplicate repair and future-score rejection passed');
