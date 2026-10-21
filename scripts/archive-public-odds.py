"""Retain successful, explicitly research-only observations without changing bet records."""
import argparse,json,os,re,math
from pathlib import Path
from urllib.parse import urlparse

def archive(source,run_id,attempt='1',root=Path('.')):
    if not re.fullmatch(r'\d+',run_id) or not re.fullmatch(r'\d+',attempt):raise ValueError('Numeric workflow run identity required')
    raw=Path(source).read_text();data=json.loads(raw)
    rows=data.get('observations',[])
    if data.get('status')!='sample_collected' or data.get('publicationEligible') is not False or not 1<=len(rows)<=10:raise ValueError('Only successful bounded research samples can be archived')
    quotes=0
    for row in rows:
        url=urlparse(row.get('sourceURL',''))
        if url.scheme!='https' or url.hostname!='www.sportybet.com' or not url.path.startswith('/ng/'):raise ValueError('Unexpected observation source')
        if row.get('classification')!='RESEARCH_ONLY' or row.get('mappingVerified') is not False:raise ValueError('Imported observations cannot assert verified mapping')
        for q in row.get('quotes',[]):
            if q.get('settlement')!='unverified' or q.get('rulesVerified') is not False:raise ValueError('Collector cannot assert settlement verification')
            if not isinstance(q.get('odds'),(float,int)) or isinstance(q['odds'],bool) or not math.isfinite(q['odds']) or not q['odds']>1:raise ValueError('Actual decimal quote required')
            quotes+=1
    if quotes==0:raise ValueError('No prices to archive')
    history=root/'research'/'odds-history'/('run-'+run_id+'-'+attempt+'.json');history.parent.mkdir(parents=True,exist_ok=True)
    if history.exists():
        if history.read_text()!=raw:raise ValueError('A recorded workflow observation cannot be overwritten')
    else:
        with history.open('x') as output:output.write(raw)
    latest=root/'research'/'snapshot'/'bookmaker-observations.json';latest.parent.mkdir(parents=True,exist_ok=True)
    temporary=latest.with_suffix('.tmp');temporary.write_text(raw);temporary.replace(latest)
    return {'events':len(rows),'quotes':quotes,'history':str(history),'publicationEligible':False}

if __name__=='__main__':
    p=argparse.ArgumentParser();p.add_argument('source');a=p.parse_args()
    print(json.dumps(archive(a.source,os.environ.get('GITHUB_RUN_ID',''),os.environ.get('GITHUB_RUN_ATTEMPT','1'))))
