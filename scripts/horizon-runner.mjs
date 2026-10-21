// Keep orchestration separate from provider clients so limits can be tested offline.
export const rateLimited = response => response?.http===429 || response?.statusCode===429 || (response?.coverage||[]).some(c=>/\b429\b|rate.?limit/i.test(c.reason||''));
export async function collectHorizon({dates, refresh, collect, loadCursor, checkpoint, snapshot, coreOnly=false, maxBatches=69}) {
  const receipt={startedAt:new Date().toISOString(),status:'partial',core:[],batches:[],unfinished:[],stopReason:null};
  const finish=async()=>{receipt.finishedAt=new Date().toISOString();await snapshot(receipt);return receipt;};
  // Every date gets its core inventory before an extended provider can stop the run.
  for(const date of dates){
    try {const r=await refresh(date);receipt.core.push({date,screened:r.screened,status:r.status});
      if(rateLimited(r)){receipt.stopReason='HTTP_429';receipt.unfinished=dates.map(date=>({date,cursor:0}));return finish();}
    }catch(e){receipt.core.push({date,status:'failed',error:e.message});}
    await snapshot(receipt);
  }
  if(coreOnly){receipt.stopReason='CORE_ONLY';receipt.unfinished=dates.map(date=>({date,cursor:0}));return finish();}
  for(let i=0;i<dates.length;i++){
    const date=dates[i];let cursor=(await loadCursor(date))??0;
    while(cursor!==null){
      if(receipt.batches.length>=maxBatches){receipt.stopReason='BATCH_BUDGET';receipt.unfinished=[{date,cursor},...dates.slice(i+1).map(date=>({date,cursor:0}))];return finish();}
      let batch;
      try {batch=await collect(date,cursor);}
      catch(e){receipt.stopReason='COLLECTION_ERROR';receipt.batches.push({date,cursor,error:e.message});receipt.unfinished=[{date,cursor},...dates.slice(i+1).map(date=>({date,cursor:0}))];await checkpoint(date,cursor);return finish();}
      const limited=rateLimited(batch),failed=(batch.coverage||[]).some(c=>/failed/.test(c.status));
      const next=batch.nextCursor;
      if(!limited && next!==null && (!Number.isInteger(next)||next<=cursor))throw Error('Invalid collection cursor');
      receipt.batches.push({date,cursor,nextCursor:next,records:batch.records?.length||0,rateLimited:limited,sourceFailures:failed});
      await checkpoint(date,limited?cursor:next); // Retry an incomplete batch; source cache avoids duplicate downloads.
      if(limited){receipt.stopReason='HTTP_429';receipt.unfinished=[{date,cursor},...dates.slice(i+1).map(date=>({date,cursor:0}))];return finish();}
      cursor=next;await snapshot(receipt);
    }
  }
  receipt.status=receipt.core.some(c=>c.status==='failed')||receipt.batches.some(b=>b.sourceFailures)?'partial':'catalogue_processed';
  // Catalogue processed still does not mean complete coverage or full research execution.
  return finish();
}
