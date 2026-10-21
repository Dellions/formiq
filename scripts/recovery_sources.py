"""Public, credential-free fallback adapters. No account access or challenge bypass."""
import json,re,unicodedata,math
from datetime import datetime,timezone,timedelta
from html.parser import HTMLParser

def key(s):return re.sub(r'[^a-z0-9]','',unicodedata.normalize('NFKD',str(s)).encode('ascii','ignore').decode().lower())
NHL=dict((key(name),abbr) for abbr,name in [
 ('ANA','Anaheim Ducks'),('BOS','Boston Bruins'),('BUF','Buffalo Sabres'),('CAR','Carolina Hurricanes'),('CBJ','Columbus Blue Jackets'),('CGY','Calgary Flames'),('CHI','Chicago Blackhawks'),('COL','Colorado Avalanche'),('DAL','Dallas Stars'),('DET','Detroit Red Wings'),('EDM','Edmonton Oilers'),('FLA','Florida Panthers'),('LAK','Los Angeles Kings'),('MIN','Minnesota Wild'),('MTL','Montreal Canadiens'),('NJD','New Jersey Devils'),('NSH','Nashville Predators'),('NYI','New York Islanders'),('NYR','New York Rangers'),('OTT','Ottawa Senators'),('PHI','Philadelphia Flyers'),('PIT','Pittsburgh Penguins'),('SEA','Seattle Kraken'),('SJS','San Jose Sharks'),('STL','St Louis Blues'),('TBL','Tampa Bay Lightning'),('TOR','Toronto Maple Leafs'),('UTA','Utah Mammoth'),('VAN','Vancouver Canucks'),('VGK','Vegas Golden Knights'),('WPG','Winnipeg Jets'),('WSH','Washington Capitals')])
NHL[key('Utah Hockey Club')]='UTA'

class Page(HTMLParser):
 def __init__(self):super().__init__();self.rows=[];self.cells=None;self.cell=None;self.link=None;self.events=[];self.text=[];self.skip=0
 def handle_starttag(self,tag,attrs):
  a=dict(attrs)
  if tag in ['script','style']:self.skip+=1
  if tag=='tr':self.cells=[]
  if tag in ['td','th'] and self.cells is not None:self.cell=[]
  if tag=='a':self.link={'href':a.get('href',''),'text':[]}
 def handle_data(self,data):
  if self.skip:return
  t=' '.join(data.split())
  if not t:return
  self.text.append(t)
  if self.cell is not None:self.cell.append(t)
  if self.link is not None:self.link['text'].append(t)
  if re.fullmatch(r'20\d{2}-\d{2}-\d{2}',t):self.events.append(('date',t))
 def handle_endtag(self,tag):
  if tag in ['script','style']:self.skip=max(0,self.skip-1)
  if tag in ['td','th'] and self.cell is not None:
   if self.cells is not None:self.cells.append(' '.join(self.cell))
   self.cell=None
  if tag=='tr' and self.cells is not None:self.rows.append(self.cells);self.cells=None
  if tag=='a' and self.link is not None:self.events.append(('link',(self.link['href'],' '.join(self.link['text']))));self.link=None

def virtus_rows(html):
 p=Page();p.feed(html);out=[]
 for row in p.rows:
  if len(row)<4 or not re.fullmatch(r'\d{2}/\d{2}/\d{2}',row[0]):continue
  m=re.fullmatch(r'(\d+)\s*[-–]\s*(\d+)',row[2]);home=key(row[1])==key('Virtus Bologna');away=key(row[3])==key('Virtus Bologna')
  if not m or home==away:continue
  date=datetime.strptime(row[0],'%d/%m/%y').date().isoformat();a,b=map(int,m.groups())
  out.append({'id':'virtus-'+date,'date':date,'datePrecision':'day','gf':a if home else b,'ga':b if home else a,'venue':'home' if home else 'away','opponent':row[3] if home else row[1]})
 return out

def hapoel_rows(html):
 p=Page();p.feed(html);out=[];date=None;teams=[];scores=[]
 def flush():
  if date and len(teams)==2 and len(scores)==1:
   own=next((i for i,n in enumerate(teams) if key(n) in [key('Hapoel IBI Tel Aviv'),key('Hapoel Tel Aviv')]),None)
   if own is None:return
   a,b=scores[0];out.append({'id':'basketnews-hta-'+date,'date':date,'datePrecision':'day','gf':a if own==0 else b,'ga':b if own==0 else a,'venue':'home' if own==0 else 'away','opponent':teams[1-own]})
 for kind,value in p.events:
  if kind=='date':flush();date=value;teams=[];scores=[];continue
  if not date:continue
  href,text=value
  if re.search(r'/teams/\d+',href) and text and text not in teams and len(teams)<2:teams.append(text)
  m=re.fullmatch(r'(\d+)\s*[-–:]\s*(\d+)',text)
  if m:scores.append(tuple(map(int,m.groups())))
 flush();return out

def nhl_rows(data,abbr):
 out=[]
 for g in data.get('games',[]):
  if g.get('gameType') not in [2,3] or g.get('gameState') not in ['OFF','FINAL']:continue
  h,a=g.get('homeTeam',{}),g.get('awayTeam',{});home=h.get('abbrev')==abbr
  if not home and a.get('abbrev')!=abbr:continue
  if any(type(x.get('score')) is not int or x['score']<0 for x in [h,a]):continue
  own,opp=(h,a) if home else (a,h);date=g.get('startTimeUTC')
  if not date:continue
  out.append({'id':'nhl-'+str(g['id']),'date':date,'gf':own['score'],'ga':opp['score'],'venue':'home' if home else 'away','opponent':' '.join([opp.get('placeName',{}).get('default',''),opp.get('commonName',{}).get('default','')]).strip(),'opponentProviderId':opp.get('id'),'lastPeriodType':g.get('gameOutcome',{}).get('lastPeriodType'),'scoreScope':'Official source final; regulation separation not inferred'})
 return out

def usable(rows,now=None):
 now=now or datetime.now(timezone.utc);out={}
 for r in rows:
  try:d=datetime.fromisoformat(r['date'].replace('Z','+00:00'));d=d.replace(tzinfo=timezone.utc) if d.tzinfo is None else d
  except (ValueError,KeyError):continue
  if not now-timedelta(days=365)<d<now or type(r.get('gf')) not in [int,float] or type(r.get('ga')) not in [int,float] or not all(math.isfinite(r[k]) and r[k]>=0 for k in ['gf','ga']):continue
  out[(r['date'][:10],key(r.get('opponent','')),r.get('venue'))]=r
 return sorted(out.values(),key=lambda x:x['date'],reverse=True)[:10]
