"""Parse visible SportyBet market text. Never infer missing prices or rules."""
import re
from datetime import datetime, timedelta, timezone

def start_from_display(text, now=None, utc_offset_minutes=60):
    now=now or datetime.now(timezone.utc)
    local=now.astimezone(timezone(timedelta(minutes=utc_offset_minutes)))
    wat=timezone(timedelta(hours=1));today=now.astimezone(wat).date()
    match=re.search(r'\b(\d{2})/(\d{2})\s+(\d{2}):(\d{2})\b',text)
    if not match:return None
    day,month,hour,minute=map(int,match.groups())
    for offset in range(-1,4):
        date=local.date()+timedelta(days=offset)
        if (date.day,date.month)==(day,month):
            candidate=datetime(date.year,month,day,hour,minute,tzinfo=local.tzinfo)
            if candidate>now and 0<=(candidate.astimezone(wat).date()-today).days<=2:return candidate.astimezone(timezone.utc).isoformat().replace('+00:00','Z')
    return None

def displayed_offset(text):
    m=re.search(r'GMT([+-])(\d{2}):(\d{2})',text)
    if not m:return None
    minutes=int(m[2])*60+int(m[3])
    if minutes>14*60 or int(m[3])>59:return None
    return minutes if m[1]=='+' else -minutes

def parse_listing(text,url,observed_at,limit=6,now=None):
    """Football's visible 3 Way & O/U table. Source labels are retained without fuzzy joins."""
    offset=displayed_offset(text)
    if offset is None:return []
    lines=[s.strip() for s in text.splitlines() if s.strip()]
    league=None;date=None;out=[];seen=set()
    price=lambda s:bool(re.fullmatch(r'\d+\.\d{2}',s)) and float(s)>1
    for i,line in enumerate(lines):
        if line.startswith('\ue6a3 ') and len(line)>2:league=line[2:].strip()
        if re.fullmatch(r'\d{2}/\d{2}\s+\w+',line):date=line.split()[0]
        if not re.fullmatch(r'\d{2}:\d{2}',line) or i+9>=len(lines) or not league or not date:continue
        block=lines[i:i+10]
        match=re.fullmatch(r'ID:\s*(\d+)',block[1])
        if not match or not all(price(x) for x in block[4:7]) or re.search('virtual|simulated|esoccer|efootball',league,re.I):continue
        start=start_from_display(date+' '+line,now,offset)
        if not start or match[1] in seen:continue
        home,away=block[2:4]
        if not home or not away or home==away:continue
        seen.add(match[1]);quotes=[{'type':'win','side':side,'odds':float(value),'marketLabel':'1X2'} for side,value in zip(['home','draw','away'],block[4:7])]
        if re.fullmatch(r'\d+\.5',block[7]) and all(price(x) for x in block[8:10]):
            quotes.extend({'type':'total','side':side,'line':float(block[7]),'odds':float(value),'marketLabel':'Over/Under'} for side,value in zip(['over','under'],block[8:10]))
        for q in quotes:q.update(period='full_match',settlement='unverified',rulesVerified=False,classification='SOURCE_OBSERVED')
        out.append({'bookmakerEventId':'display:'+match[1],'sourceURL':url,'observedAt':observed_at,'home':home,'away':away,'start':start,'sportPath':'football',
                    'competitionSourceLabel':league,'mappingVerified':False,'quotes':quotes,'classification':'RESEARCH_ONLY','calibrated':False,'displayedTimezoneMinutes':offset})
        if len(out)>=limit:break
    return out

def parse_priority_listing(text,url,observed_at,sport,limit=4,now=None):
    """Observed 2-way basketball and 3-way hockey tables; rules remain unverified."""
    if sport not in ['basketball','iceHockey']:return []
    offset=displayed_offset(text)
    if offset is None:return []
    lines=[s.strip() for s in text.splitlines() if s.strip()]
    league=date=mode=None;rows=[];seen=set();price=lambda s:bool(re.fullmatch(r'\d+\.\d{2}',s)) and float(s)>1
    for i,line in enumerate(lines):
        if line.startswith('\ue6a3 '):league=line[2:].strip();date=mode=None
        if line in ['2 Way & O/U','3 Way & O/U']:mode=line
        if re.fullmatch(r'\d{2}/\d{2}\s+\w+',line):date=line.split()[0]
        width=2 if sport=='basketball' else 3
        if not league or not date or mode!=('2 Way & O/U' if width==2 else '3 Way & O/U') or re.search(r'virtual|simulated|ebasketball|eice',league,re.I):continue
        if not re.fullmatch(r'\d{2}:\d{2}',line) or i+4+width>len(lines):continue
        b=lines[i:];m=re.fullmatch(r'ID:\s*(\d+)',b[1])
        if not m or not all(price(x) for x in b[4:4+width]):continue
        start=start_from_display(date+' '+line,now,offset)
        if not start or m[1] in seen or b[2]==b[3]:continue
        seen.add(m[1]);sides=['home','away'] if width==2 else ['home','draw','away']
        quotes=[{'type':'win','side':side,'odds':float(value),'marketLabel':'2 Way' if width==2 else '3 Way'} for side,value in zip(sides,b[4:4+width])]
        n=4+width
        if len(b)>n+2 and re.fullmatch(r'\d+\.5',b[n]) and all(price(x) for x in b[n+1:n+3]):
            quotes.extend({'type':'total','side':side,'line':float(b[n]),'odds':float(value),'marketLabel':'Over/Under'} for side,value in zip(['over','under'],b[n+1:n+3]))
        for q in quotes:q.update(period='full_match',settlement='unverified',rulesVerified=False,classification='SOURCE_OBSERVED')
        rows.append({'bookmakerEventId':'display:'+m[1],'sourceURL':url,'observedAt':observed_at,'home':b[2],'away':b[3],'start':start,'sportPath':sport,'competitionSourceLabel':league,'mappingVerified':False,'quotes':quotes,'classification':'RESEARCH_ONLY','calibrated':False,'displayedTimezoneMinutes':offset})
    # Spread the bounded sample across visible competitions instead of filling it from one league.
    groups={}
    for r in rows:groups.setdefault(r['competitionSourceLabel'],[]).append(r)
    out=[]
    while groups and len(out)<limit:
        for league in list(groups):
            if len(out)>=limit:break
            out.append(groups[league].pop(0))
            if not groups[league]:del groups[league]
    return out

def parse_exact_detail_market(sport,title,text):
    """Label evidence only; does not certify independent price/rule verification."""
    settlement=None;canonical=None;line=None
    if sport=='basketball':
        if title=='Winner (incl. overtime)':settlement='including_overtime';canonical='1X2'
        m=re.fullmatch(r'Over/Under \(incl\. overtime\)(?: (\d+\.5))?',title)
        if m:settlement='including_overtime';canonical='Over/Under';line=float(m[1]) if m[1] else None
        if title in ['1X2','Over/Under']:settlement='regulation';canonical=title
    elif sport=='iceHockey':
        if title=='Winner (incl. overtime and penalties)':settlement='including_overtime_and_shootout';canonical='1X2'
        if title=='Total (incl. overtime and penalties)':settlement='including_overtime_and_shootout';canonical='Over/Under'
        if title in ['1X2','Over/Under']:settlement='regulation';canonical=title
    if not canonical:return []
    rows=parse_market(canonical,text)
    if line is not None:rows=[q for q in rows if q.get('line')==line]
    for q in rows:q.update(marketLabel=title,period='full_match',settlement='unverified',observedSettlement=settlement,settlementLabelVerified=True,rulesVerified=False,classification='SOURCE_OBSERVED')
    return rows

def parse_market(title,text):
    # Exact names keep promoted, first-half, team-total and player markets separate.
    types={'1X2':('win',{'Home':'home','Away':'away'}),
           'Double Chance':('double_chance',{'Home or Draw':'1X','Draw or Away':'X2'}),
           'GG/NG':('btts',{'Yes':'yes','No':'no'})}
    rows=[]
    if title=='Over/Under':
        for side,line,price in re.findall(r'\b(Over|Under)\s+(\d+(?:\.\d+)?)\s+(\d+\.\d{2})\b',text):
            line,price=float(line),float(price)
            if line%1==.5 and price>1:rows.append({'type':'total','side':side.lower(),'line':line,'odds':price})
    elif title in types:
        kind,labels=types[title]
        for label,side in labels.items():
            found=re.findall(r'(?<!\w)'+re.escape(label)+r'\s+(\d+\.\d{2})(?!\d)',text)
            if len(found)==1 and float(found[0])>1:rows.append({'type':kind,'side':side,'odds':float(found[0])})
    return rows
