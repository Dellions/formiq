"""Inspect public detail labels reached by a normal click from observed listing rows."""
import json,time,re
from pathlib import Path
from datetime import datetime,timezone
from selenium import webdriver
from selenium.webdriver.common.by import By
from selenium.webdriver.support.ui import WebDriverWait
from public_odds_parser import parse_priority_listing
stamp=lambda:datetime.now(timezone.utc).isoformat()
options=webdriver.ChromeOptions()
for flag in ['--headless=new','--no-sandbox','--disable-dev-shm-usage']:options.add_argument(flag)
out={'startedAt':stamp(),'status':'partial','pages':[],'publicationEligible':False};driver=None
try:
 driver=webdriver.Chrome(options=options);driver.set_page_load_timeout(45)
 for sport in ['basketball','iceHockey']:
  url='https://www.sportybet.com/ng/sport/'+sport+'/'
  driver.get(url)
  def ready(d):
   t=d.find_element(By.TAG_NAME,'body').text
   if re.search(r'captcha|access denied|too many requests|verify you are human|request blocked',t,re.I):raise RuntimeError('Challenge or restriction; stopping')
   return t if 'GMT' in t and re.search(r'ID:\s*\d+',t) else False
  text=WebDriverWait(driver,35).until(ready);rows=parse_priority_listing(text,url,stamp(),sport,1)
  if not rows:out['pages'].append({'sport':sport,'status':'no_supported_row'});continue
  row=rows[0]
  name=row['home'];xpath='//*[normalize-space(text())='+('"'+name+'"' if '"' not in name else "'"+name+"'") +']'
  elements=driver.find_elements(By.XPATH,xpath);clicked=False
  for el in elements:
   if el.is_displayed():el.click();clicked=True;break
  if not clicked:out['pages'].append({'sport':sport,'status':'team_click_unavailable','observation':row});continue
  try:WebDriverWait(driver,20).until(lambda d:bool(d.find_elements(By.CSS_SELECTOR,'.j_title')))
  except Exception:out['pages'].append({'sport':sport,'status':'detail_not_confirmed','url':driver.current_url,'observation':row});continue
  body=driver.find_element(By.TAG_NAME,'body').text
  if re.search(r'captcha|access denied|too many requests|verify you are human|request blocked',body,re.I):raise RuntimeError('Challenge or restriction; stopping')
  out['pages'].append({'sport':sport,'status':'detail_observed','url':driver.current_url,'retrievedAt':stamp(),'observation':row,'title':driver.find_element(By.CSS_SELECTOR,'.j_title').text,'marketLabels':[e.text for e in driver.find_elements(By.CSS_SELECTOR,'.m-table-header-title')],'visibleText':body[:30000]})
  time.sleep(10)
except Exception as e:out['error']=type(e).__name__+': '+str(e).splitlines()[0][:300]
finally:
 if driver:driver.quit()
out['finishedAt']=stamp();p=Path('.edgeform-state/exact-markets/report.json');p.parent.mkdir(parents=True,exist_ok=True);p.write_text(json.dumps(out,ensure_ascii=False,indent=2));print(json.dumps(out,ensure_ascii=False))
