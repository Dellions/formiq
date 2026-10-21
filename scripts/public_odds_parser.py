"""Parse visible SportyBet market text. Never infer missing prices or rules."""
import re
from datetime import datetime, timedelta, timezone

def start_from_display(text, now=None):
    now=now or datetime.now(timezone.utc)
    local=now.astimezone(timezone(timedelta(hours=1)))
    match=re.search(r'\b(\d{2})/(\d{2})\s+(\d{2}):(\d{2})\b',text)
    if not match:return None
    day,month,hour,minute=map(int,match.groups())
    for offset in range(3):
        date=local.date()+timedelta(days=offset)
        if (date.day,date.month)==(day,month):
            candidate=datetime(date.year,month,day,hour,minute,tzinfo=local.tzinfo)
            if candidate>now:return candidate.astimezone(timezone.utc).isoformat().replace('+00:00','Z')
    return None

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
