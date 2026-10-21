"""Small, serial public-page collector; no accounts, betting actions or hidden feeds."""
import argparse,json,re,time
from datetime import datetime,timezone
from pathlib import Path
from urllib.parse import urlparse,unquote
from public_odds_parser import parse_market,start_from_display,displayed_offset,parse_listing,parse_priority_listing

def timestamp():return datetime.now(timezone.utc).isoformat().replace('+00:00','Z')

def collect(driver,urls,limit=6,spacing=10):
    from selenium.webdriver.common.by import By
    from selenium.webdriver.support.ui import WebDriverWait
    report={'startedAt':timestamp(),'bookmaker':'SportyBet Nigeria','status':'partial','observations':[],'pages':[],
            'fallback':{'bookmaker':'Bet9ja','status':'not_verified'},'publicationEligible':False}
    last=0
    def visit(url):
        nonlocal last
        p=urlparse(url)
        if p.scheme!='https' or p.netloc!='www.sportybet.com' or not p.path.startswith('/ng/') or p.username or p.password:
            raise ValueError('Only public SportyBet Nigeria pages are supported')
        time.sleep(max(0,spacing-(time.monotonic()-last)))
        last=time.monotonic();driver.get(url)
        def loaded(d):
            text=d.find_element(By.TAG_NAME,'body').text
            if re.search(r'verify you are human|checking your browser|access denied|request blocked|too many requests|\b403 forbidden\b|captcha',text,re.I):
                raise RuntimeError('Access challenge or source restriction; stopped without retry')
            return text if d.find_elements(By.CSS_SELECTOR,'.m-table-header-title') or d.find_elements(By.CSS_SELECTOR,'a[href*="sr:match:"]') or re.search(r'\bID:\s*\d+',text) else False
        WebDriverWait(driver,35).until(loaded)
        if urlparse(driver.current_url).netloc!='www.sportybet.com':raise RuntimeError('Unexpected redirect')
        report['pages'].append({'url':driver.current_url,'retrievedAt':timestamp()})
    try:
        candidates=[]
        for url in urls:
            if len(report['observations'])>=limit:break
            visit(url)
            if '/sr:match:' in url:candidates.append(url)
            else:
                sport=urlparse(url).path.rstrip('/').split('/')[-1]
                quota=min(max(1,(limit+len(urls)-1)//len(urls)),limit-len(report['observations']))
                if sport in ['basketball','iceHockey']:
                    report['observations'].extend(parse_priority_listing(driver.find_element(By.TAG_NAME,'body').text,driver.current_url,timestamp(),sport,quota))
                if '/sport/football/' in url:
                    report['observations'].extend(parse_listing(driver.find_element(By.TAG_NAME,'body').text,driver.current_url,timestamp(),quota))
                if len(report['observations'])>=limit:break
                for e in driver.find_elements(By.CSS_SELECTOR,'a[href*="sr:match:"]'):
                    href=e.get_attribute('href')
                    if href and href not in candidates:candidates.append(href)
        for url in candidates[:max(0,limit-len(report['observations']))]:
            if driver.current_url!=url:visit(url)
            title=driver.find_element(By.CSS_SELECTOR,'.j_title')
            name=title.text.splitlines()[0].strip()
            if name.count(' vs ')!=1:raise ValueError('Unrecognized match title')
            home,away=name.split(' vs ')
            offset=displayed_offset(driver.find_element(By.TAG_NAME,'body').text)
            start=start_from_display(title.find_element(By.XPATH,'..').text[:1200],utc_offset_minutes=offset) if offset is not None else None
            if not start:report['pages'][-1]['omission']='Upcoming WAT date/time not confirmed';continue
            observed=timestamp();seen=set();quotes=[]
            for header in driver.find_elements(By.CSS_SELECTOR,'.m-table-header-title'):
                market=header.text.strip()
                if market not in ['1X2','Over/Under','Double Chance','GG/NG']:continue
                node=header
                for level in range(5):
                    node=node.find_element(By.XPATH,'..')
                    if len(node.find_elements(By.CSS_SELECTOR,'.m-table-header-title'))>1:break
                    parsed=parse_market(market,node.text)
                    if parsed:
                        for q in parsed:
                            key=(q['type'],q['side'],q.get('line'))
                            if key not in seen:seen.add(key);quotes.append({**q,'marketLabel':market,'period':'full_match','settlement':'unverified','rulesVerified':False,'classification':'SOURCE_OBSERVED'})
                        break
            parts=unquote(urlparse(url).path).split('/')
            report['observations'].append({'bookmakerEventId':parts[-1],'sourceURL':url,'observedAt':observed,
                'home':home,'away':away,'start':start,'sportPath':parts[3],
                'competitionSourceLabel':parts[-3].replace('_',' '),'mappingVerified':False,
                'quotes':quotes,'classification':'RESEARCH_ONLY','calibrated':False})
        dedup={}
        for row in report['observations']:
            key=(row['sportPath'],row['home'],row['away'],row['start'])
            if key not in dedup:dedup[key]=row
        report['observations']=list(dedup.values())[:limit]
        report['sportCoverage']={sport:sum(r['sportPath']==sport for r in report['observations']) for sport in ['basketball','iceHockey','football']}
        report['status']='sample_collected' if any(r['quotes'] for r in report['observations']) else 'partial'
    except Exception as e:
        report['error']=type(e).__name__+': '+str(e).splitlines()[0][:400]
        try:
            report['failurePage']={'url':driver.current_url,'title':driver.title,'visibleText':driver.find_element(By.TAG_NAME,'body').text[:6000]}
        except Exception:
            report['failurePage']={'error':'Visible page state unavailable'}
    report['finishedAt']=timestamp()
    report['limitations']=['Small visible-page sample; no complete fixture coverage','No independent price corroboration or exact rules verification','Cross-source event matching not approved','No calibrated model, EV or betting publication produced','Bet9ja backup adapter not yet implemented']
    return report

def main():
    parser=argparse.ArgumentParser();parser.add_argument('--url',action='append');parser.add_argument('--limit',type=int,default=6);parser.add_argument('--out',default='research/snapshot/bookmaker-observations.json');args=parser.parse_args()
    if not 1<=args.limit<=10:parser.error('limit must be between 1 and 10')
    from selenium import webdriver
    options=webdriver.ChromeOptions()
    for flag in ['--headless=new','--no-sandbox','--disable-dev-shm-usage']:options.add_argument(flag)
    driver=None
    try:
        driver=webdriver.Chrome(options=options)
        driver.set_page_load_timeout(45)
        report=collect(driver,args.url or ['https://www.sportybet.com/ng/sport/basketball/','https://www.sportybet.com/ng/sport/iceHockey/','https://www.sportybet.com/ng/sport/football/'],args.limit)
    except Exception as e:
        report={'startedAt':timestamp(),'finishedAt':timestamp(),'status':'failed','observations':[],
                'error':type(e).__name__+': '+str(e).splitlines()[0][:400],'publicationEligible':False}
    finally:
        if driver:driver.quit()
    out=Path(args.out);out.parent.mkdir(parents=True,exist_ok=True)
    # A failed collection cannot erase a previous usable observation archive.
    if report['status'] not in ['sample_collected']:out=out.with_suffix('.failure.json')
    temporary=out.with_suffix('.tmp');temporary.write_text(json.dumps(report,indent=2));temporary.replace(out)
    print(json.dumps({'status':report['status'],'events':len(report['observations']),'quotes':sum(len(r['quotes']) for r in report['observations']),'error':report.get('error')}))
    if report.get('error') or report['status']!='sample_collected':raise SystemExit(1)
if __name__=='__main__':main()
