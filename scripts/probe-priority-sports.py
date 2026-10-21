"""Bounded logged-out page inspection. Does not infer market semantics or prices."""
import json,time,re
from datetime import datetime,timezone
from pathlib import Path
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
def stamp():return datetime.now(timezone.utc).isoformat()
options=webdriver.ChromeOptions()
for flag in ['--headless=new','--no-sandbox','--disable-dev-shm-usage']:options.add_argument(flag)
report={'startedAt':stamp(),'status':'partial','pages':[],'publicationEligible':False}
driver=None
try:
 driver=webdriver.Chrome(options=options);driver.set_page_load_timeout(45)
 for sport in ['basketball','iceHockey']:
  url='https://www.sportybet.com/ng/sport/'+sport+'/'
  driver.get(url)
  def loaded(d):
   text=d.find_element(By.TAG_NAME,'body').text
   if re.search(r'captcha|access denied|too many requests|verify you are human|request blocked',text,re.I):raise RuntimeError('Challenge or source restriction; stopping')
   return text if 'GMT' in text and re.search(r'ID:\s*\d+',text) else False
  try:text=WebDriverWait(driver,35).until(loaded)
  except Exception:
   text=driver.find_element(By.TAG_NAME,'body').text
   report['pages'].append({'sport':sport,'url':driver.current_url,'retrievedAt':stamp(),'status':'unsupported_or_unavailable','visibleText':text[:18000]})
   if re.search(r'captcha|access denied|too many requests|verify you are human|request blocked',text,re.I):break
  else:report['pages'].append({'sport':sport,'url':driver.current_url,'retrievedAt':stamp(),'status':'visible_listing','visibleText':text[:18000]})
  time.sleep(10)
except Exception as e:report['error']=type(e).__name__+': '+str(e).splitlines()[0][:300]
finally:
 if driver:driver.quit()
report['finishedAt']=stamp();p=Path('.edgeform-state/priority-sports/probe.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(report,ensure_ascii=False,indent=2))
print(json.dumps(report,ensure_ascii=False))
