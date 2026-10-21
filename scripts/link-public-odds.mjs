import fs from 'node:fs/promises';
import {linkObservations} from './fixture-odds-linker.mjs';
const sample=JSON.parse(await fs.readFile('research/snapshot/bookmaker-observations.json','utf8'));
const fixtures=JSON.parse(await fs.readFile('research/snapshot/picks.json','utf8')).records||[];
const linked=linkObservations(sample,fixtures);
await fs.writeFile('research/snapshot/market-observations.json',JSON.stringify(linked,null,2)+'\n');
console.log(JSON.stringify({fixtures:linked.fixtureCount,exactCandidates:linked.exactCandidates,publicationEligible:false}));
