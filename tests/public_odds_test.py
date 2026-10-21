import sys,unittest
from pathlib import Path
from datetime import datetime,timezone
sys.path.insert(0,str(Path(__file__).resolve().parents[1]/'scripts'))
from public_odds_parser import parse_market,start_from_display,displayed_offset,parse_listing

class PublicOddsTests(unittest.TestCase):
    def test_market_identity(self):
        # Synthetic test prices; never published as observations.
        text='Over/Under\nOver 2.5\n1.80\nUnder 2.5\n2.10'
        self.assertEqual(len(parse_market('Over/Under',text)),2)
        for label in ['1st Half - Over/Under','Bayern Munich Over/Under','Over/Under - Early Goals','Bookings - Over/Under']:
            self.assertEqual(parse_market(label,text),[])
    def test_missing_integer_suspended(self):
        self.assertEqual(parse_market('Over/Under','Over 2 1.80 Under 2 2.10'),[])
        self.assertEqual(parse_market('Over/Under','Over 2.5 suspended Under 2.5 locked'),[])
        self.assertEqual(parse_market('1X2','Home 1.80 Home 1.90 Away suspended'),[])
    def test_date_horizon(self):
        now=datetime(2026,12,31,10,tzinfo=timezone.utc)
        self.assertEqual(start_from_display('Friday 01/01 20:00',now),'2027-01-01T19:00:00Z')
        self.assertIsNone(start_from_display('Friday 04/01 20:00',now))
        self.assertIsNone(start_from_display('31/12 09:00',now))
        self.assertEqual(start_from_display('01/01 20:00',now,0),'2027-01-01T20:00:00Z')
    def test_visible_table_and_timezone(self):
        now=datetime(2026,10,21,10,tzinfo=timezone.utc)
        text='GMT+00:00\n\ue6a3 Test League\n21/10 Wednesday\n1\nX\n2\nGoals\nOver\nUnder\n19:00\nID: 123\nHome\nAway\n2.10\n3.20\n3.30\n2.5\n1.80\n2.10\n+100'
        rows=parse_listing(text,'https://example.test','2026-10-21T10:00:00Z',now=now)
        self.assertEqual(len(rows),1);self.assertEqual(len(rows[0]['quotes']),5)
        self.assertEqual(rows[0]['start'],'2026-10-21T19:00:00Z')
        self.assertFalse(rows[0]['mappingVerified']);self.assertTrue(all(q['settlement']=='unverified' for q in rows[0]['quotes']))
        self.assertEqual(parse_listing(text.replace('GMT+00:00',''),'https://example.test','now',now=now),[])
        self.assertEqual(parse_listing(text.replace('2.10\n3.20','suspended\n3.20'),'https://example.test','now',now=now),[])
        self.assertEqual(displayed_offset('GMT-03:30'),-210)

if __name__=='__main__':unittest.main()
