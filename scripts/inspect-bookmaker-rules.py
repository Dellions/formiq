"""Read three public Nigeria rule pages; preserve evidence, never assert quote verification."""
import json,time,re,hashlib
from datetime import datetime,timezone
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
stamp=lambda:datetime.now(timezone.utc).isoformat()
options=webdriver.ChromeOptions()
for flag in ['--headless=new','--no-sandbox','--disable-dev-shm-usage']:options.add_argument(flag)
report={'startedAt':stamp(),'status':'partial','pages':[],'rulesVerified':False,'publicationEligible':False};driver=None
try:
 driver=webdriver.Chrome(options=options);driver.set_page_load_timeout(45)
 for sport in ['football','basketball','iceHockey']:
  url='https://www.sportybet.com/ng/m/help/how-to-play/sports/'+sport
  driver.get(url)
  def ready(d):
   t=d.find_element(By.TAG_NAME,'body').text
   if re.search(r'captcha|access denied|too many requests|verify you are human|request blocked',t,re.I):raise RuntimeError('Challenge or restriction; stop')
   return t if re.search(r'Regular 90 Minutes|Markets do not consider overtime|All markets.*regular time',t,re.I|re.S) else False
  try:text=WebDriverWait(driver,30).until(ready);status='rule_text_observed'
  except Exception:text=driver.find_element(By.TAG_NAME,'body').text;status='incomplete'
  report['pages'].append({'sport':sport,'url':driver.current_url,'retrievedAt':stamp(),'status':status,'sha256':hashlib.sha256(text.encode()).hexdigest(),'visibleText':text[:50000]})
  if re.search(r'captcha|access denied|too many requests|verify you are human|request blocked',text,re.I):break
  time.sleep(10)
except Exception as e:report['error']=type(e).__name__+': '+str(e).splitlines()[0][:300]
finally:
 if driver:driver.quit()
report['finishedAt']=stamp();p=Path('.edgeform-state/rule-inspection/report.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,ensure_ascii=False,indent=2));print(json.dumps(report,ensure_ascii=False))
