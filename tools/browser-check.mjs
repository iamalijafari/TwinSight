// Requires npm install and npx playwright install chromium. Tests the local application only.
import {chromium} from '@playwright/test';
import assert from 'node:assert/strict';
import {mkdir} from 'node:fs/promises';
const base=process.env.TEST_URL||'http://127.0.0.1:5080';
await mkdir('qa',{recursive:true});
const browser=await chromium.launch({headless:true});
try{
  const page=await browser.newPage({viewport:{width:1440,height:1000},acceptDownloads:true});
  const errors=[];page.on('pageerror',error=>errors.push(error.message));page.on('console',message=>{if(message.type()==='error'&&!message.text().includes('404'))errors.push(message.text());});
  await page.goto(base);await page.waitForSelector('[data-source]');
  await page.locator('#build').click();await page.waitForFunction(()=>!document.getElementById('simulate').disabled);
  await page.locator('#simulate').click();await page.waitForFunction(()=>document.getElementById('risk-value').textContent==='۵۹٫۹');
  await page.locator('#network [role=button]').filter({hasText:'گزارش فروش'}).press('Enter');assert.match(await page.locator('#inspector').textContent(),/Payment → Orders → Analytics/);
  await page.locator('#pin').click();await page.locator('#canary').check();assert.match(await page.locator('#draft-state').textContent(),/اجرای قبلی/);await page.locator('#simulate').click();await page.waitForFunction(()=>document.getElementById('risk-value').textContent==='۳۷٫۱');assert.match(await page.locator('#comparison').textContent(),/کمتر/);
  await page.locator('#baseline-view').click();assert.equal(await page.locator('#risk-value').textContent(),'۰');await page.locator('#future-view').click();
  const downloadPromise=page.waitForEvent('download');await page.locator('#export').click();const download=await downloadPromise;await download.saveAs('qa/TwinSight-scenario-report.json');
  await page.screenshot({path:'qa/desktop.png',fullPage:true});
  for(const width of [390,768,1024]){await page.setViewportSize({width,height:900});await page.screenshot({path:`qa/viewport-${width}.png`,fullPage:true});assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=window.innerWidth+1),`body overflow at ${width}`);assert.ok(await page.locator('#simulate').isVisible());}
  await page.setViewportSize({width:1440,height:1000});await page.locator('[data-source][value=support]').uncheck();assert.ok(await page.locator('#simulate').isDisabled());assert.ok(await page.locator('#export').isDisabled());await page.locator('#build').click();await page.waitForFunction(()=>!document.getElementById('simulate').disabled);await page.locator('#simulate').click();await page.waitForFunction(()=>!document.getElementById('export').disabled);assert.equal(await page.locator('#confidence-value').textContent(),'۸۵٪');
  for(const checkbox of await page.locator('[data-target]').all())await checkbox.uncheck();await page.locator('#simulate').click();assert.match(await page.locator('#notice').textContent(),/حداقل یک سرویس/);
  assert.deepEqual(errors,[]);console.log('PASS: browser interactions, keyboard service selection, export, responsive body widths and no page errors. Inspect qa/*.png visually before claiming visual QA.');
}finally{await browser.close();}
