import sys,unittest
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from recovery_sources import virtus_rows,hapoel_rows,nhl_rows,usable
class RecoveryTests(unittest.TestCase):
 def test_club_table(self):
  rows=virtus_rows('<table><tr><td>16/10/26</td><td>Virtus Bologna</td><td>86 - 78</td><td>Opponent</td></tr><tr><td>21/10/26</td><td>Virtus Bologna</td><td>18:00</td><td>Future</td></tr></table>')
  self.assertEqual(len(rows),1);self.assertEqual(rows[0]['gf'],86)
 def test_schedule_anchors(self):
  html='<div>2026-10-16</div><a href="/teams/1-test">Opponent</a><a href="/teams/2-test">Hapoel IBI Tel Aviv</a><a href="/games/1">81-91</a>'
  rows=hapoel_rows(html);self.assertEqual(rows[0]['gf'],91);self.assertEqual(rows[0]['venue'],'away')
 def test_official_final_only(self):
  g={'id':1,'gameType':2,'gameState':'OFF','startTimeUTC':'2026-10-16T23:00:00Z','homeTeam':{'abbrev':'BUF','score':0},'awayTeam':{'abbrev':'PHI','score':3,'placeName':{'default':'Philadelphia'},'commonName':{'default':'Flyers'}}}
  self.assertEqual(nhl_rows({'games':[g]},'BUF')[0]['gf'],0)
  self.assertEqual(nhl_rows({'games':[{**g,'gameState':'LIVE'}]},'BUF'),[])
  self.assertEqual(nhl_rows({'games':[{**g,'gameType':1}]},'BUF'),[])
  now=datetime(2026,10,21,tzinfo=timezone.utc)
  rows=nhl_rows({'games':[g]},'BUF');self.assertEqual(len(usable(rows+rows,now)),1)
  self.assertEqual(usable([{**rows[0],'gf':float('nan')}],now),[])
if __name__=='__main__':unittest.main()
