import fs from 'node:fs/promises';
import {inspectQuote} from './market-ingestion.mjs';
const input=process.argv[2];if(!input)throw Error('Usage: node scripts/inspect-market-import.mjs <local-quotes.json>');
const quotes=JSON.parse(await fs.readFile(input,'utf8'));
if(!Array.isArray(quotes)||quotes.length>10000)throw Error('Expected an array of at most 10000 quotes');
const {records=[]}=JSON.parse(await fs.readFile('research/snapshot/picks.json','utf8'));
const rows=quotes.map(q=>inspectQuote(q,records));
const report={createdAt:new Date().toISOString(),status:'research_only',rows,
  accepted:rows.filter(r=>r.status==='research_only').length,quarantined:rows.filter(r=>r.status==='quarantined').length,
  limitations:['Imported evidence is not independently verified','No model probabilities or betting selections created']};
await fs.mkdir('.edgeform-state/imports',{recursive:true});
await fs.writeFile('.edgeform-state/imports/quote-review.json',JSON.stringify(report,null,2));
console.log(JSON.stringify({accepted:report.accepted,quarantined:report.quarantined,publicationEligible:0}));
