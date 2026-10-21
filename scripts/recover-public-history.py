import json,os,time,hashlib,urllib.request,urllib.error
from pathlib import Path
from datetime import datetime,timezone,timedelta
from recovery_sources import NHL,key,virtus_rows,hapoel_rows,nhl_rows,usable
stamp=lambda:datetime.now(timezone.utc).isoformat().replace('+00:00','Z')
request=json.loads(Path('.edgeform-state/recovery/request.json').read_text());root=Path('research/recovery/cache');root.mkdir(parents=True,exist_ok=True)
budget=max(1,min(12,int(os.environ.get('RECOVERY_REQUEST_BUDGET','8'))));calls=0;stopped=False;last=0
results=[];attempts=[]
def fetch_rows(url,parser,ttl=14400):
 global calls,stopped,last
 path=root/(hashlib.sha256(url.encode()).hexdigest()+'.json')
 if path.exists():
  c=json.loads(path.read_text())
  if time.time()-c['at']<ttl:return c['rows'],c['retrievedAt'],True
 if stopped:raise RuntimeError('RUN_STOPPED_HTTP429')
 if calls>=budget:raise RuntimeError('REQUEST_BUDGET')
 time.sleep(max(0,3-(time.monotonic()-last)));last=time.monotonic();calls+=1
 try:
  with urllib.request.urlopen(url,timeout=20) as r:
   raw=r.read(3000001)
   if len(raw)>3000000:raise RuntimeError('SOURCE_BODY_LIMIT')
   if not r.geturl().startswith('https://'):raise RuntimeError('Unexpected insecure redirect')
 except urllib.error.HTTPError as e:
  if e.code==429:stopped=True
  raise RuntimeError('HTTP'+str(e.code))
 text=raw.decode('utf8')
 if any(s in text.lower() for s in ['verify you are human','access denied','cf-chl-','captcha']):raise RuntimeError('SOURCE_ACCESS_CHALLENGE')
 at=stamp();rows=parser(text)
 for row in rows:row.update(url=url,retrievedAt=at,total=row['gf']+row['ga'],result='W' if row['gf']>row['ga'] else 'L' if row['gf']<row['ga'] else 'D')
 c={'at':time.time(),'retrievedAt':at,'url':url,'rows':rows};path.write_text(json.dumps(c));return rows,at,False

for task in request['tasks']:
 if not task.get('adapter') or task['adapter']=='cached-domestic-history':continue
 prior=task.get('lastAttempt') or {}
 if prior.get('nextAttemptAt') and prior['nextAttemptAt']>stamp():continue
 if calls>=budget or stopped:break
 a={'taskId':task['taskId'],'eventId':task['eventId'],'side':task['side'],'adapter':task['adapter'],'attemptedAt':stamp(),'sources':[]};history=[];cache_hits=0
 try:
  if task['adapter']=='virtus-club-schedule':sources=[('https://www.virtus.it/stagione/eurolegue/',virtus_rows,14400)]
  elif task['adapter']=='basketnews-hapoel':sources=[('https://basketnews.com/teams/635-hapoel-ibi-tel-aviv/schedules.html',hapoel_rows,14400)]
  elif task['adapter']=='official-nhl-schedule':
   abbr=NHL.get(key(task['teamName']))
   if not abbr:raise RuntimeError('NO_VERIFIED_NHL_TEAM_MAPPING')
   now=datetime.now(timezone.utc);year=now.year if now.month>=7 else now.year-1
   sources=[('https://api-web.nhle.com/v1/club-schedule-season/'+abbr+'/'+str(y)+str(y+1),lambda t,abbr=abbr:nhl_rows(json.loads(t),abbr),14400 if y==year else 604800) for y in [year,year-1]]
  else:raise RuntimeError('NO_SUPPORTED_ADAPTER')
  for url,parser,ttl in sources:
   rows,at,cached=fetch_rows(url,parser,ttl);history.extend(rows);cache_hits+=int(cached);a['sources'].append({'url':url,'retrievedAt':at,'cached':cached})
   if len(usable(history))>=10:break
  rows=usable(history);a.update(status='recovered' if len(rows)>=10 else 'partial' if rows else 'no_results',usableResults=len(rows),cacheHits=cache_hits,nextAttemptAt=(datetime.now(timezone.utc)+timedelta(hours=4)).isoformat().replace('+00:00','Z'))
  if rows:results.append({'eventId':task['eventId'],'side':task['side'],'history':rows,'sources':a['sources'],'taskId':task['taskId']})
 except Exception as e:
  a.update(status='deferred' if str(e)=='REQUEST_BUDGET' else 'failed',error=str(e)[:240],usableResults=len(usable(history)),nextAttemptAt=(datetime.now(timezone.utc)+timedelta(hours=24 if any(t in str(e) for t in ['HTTP403','HTTP429','CHALLENGE']) else 4)).isoformat().replace('+00:00','Z'))
  if history:results.append({'eventId':task['eventId'],'side':task['side'],'history':usable(history),'sources':a['sources'],'taskId':task['taskId']})
 attempts.append(a)
report={'at':stamp(),'status':'partial','networkRequests':calls,'requestBudget':budget,'stopReason':'HTTP429' if stopped else 'REQUEST_BUDGET' if calls>=budget else None,'attempts':attempts,'results':results,'publicationEligible':False}
p=Path('.edgeform-state/recovery/results.json');p.write_text(json.dumps(report));print(json.dumps({**report,'results':[{'eventId':r['eventId'],'side':r['side'],'n':len(r['history'])} for r in results]}))
