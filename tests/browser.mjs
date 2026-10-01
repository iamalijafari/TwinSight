// Optional browser QA. The application itself has no npm dependencies.
import {createRequire} from 'node:module';
import {spawn} from 'node:child_process';
import {mkdir,readFile} from 'node:fs/promises';
import assert from 'node:assert/strict';
const require=createRequire(import.meta.url);
const {chromium}=require(process.env.PLAYWRIGHT_MODULE_PATH||'playwright');
const server=spawn(process.execPath,['scripts/serve.mjs'],{env:{...process.env,PORT:'8098'},stdio:'pipe'});
let browser;
try {
 await new Promise((r,j)=>{server.stdout.once('data',r);server.on('error',j);server.on('exit',code=>j(new Error('Server exited '+code)))});
 browser=await chromium.launch({headless:true});
 const page=await browser.newPage({viewport:{width:1440,height:1000},reducedMotion:'reduce'});
 const navigate=async id=>{
  await page.locator(`nav [href="#${id}"]`).click();
  await page.locator(`#${id}:not([hidden])`).waitFor();
  await page.locator(`nav [href="#${id}"].active`).waitFor();
 };
 const errors=[];page.on('pageerror',e=>errors.push(e.message));
 await mkdir('qa',{recursive:true});
 await page.goto('http://127.0.0.1:8098');
 await page.locator('#workspace:not([hidden])').waitFor();
 await page.evaluate(()=>document.fonts.ready);
 assert.match(await page.locator('#impact-cards').textContent(),/۴۲ تا ۱۸۶/);
 for(const width of [1440,1024,768,390,320]){
  await page.setViewportSize({width,height:1000});
  const sizes=await page.evaluate(()=>({width:innerWidth,scroll:document.documentElement.scrollWidth}));
  assert.ok(sizes.scroll<=width+1,`Horizontal overflow: ${width} -> ${sizes.scroll}`);
  await page.screenshot({path:`qa/workspace-${width}.png`,fullPage:true,animations:'disabled'});
 }
 await page.setViewportSize({width:1440,height:1000});
 await page.locator('[data-choose-mode="pilot"]').click();
 assert.match(await page.locator('#impact-cards').textContent(),/−۲۷٫۶ تا ۵۸٫۸/);
 await navigate('knowledge');
 await page.locator('#add-ticket').click();
 await page.screenshot({path:'qa/knowledge-desktop.png',fullPage:true,animations:'disabled'});
 await navigate('workspace');
 assert.match(await page.locator('#update-banner').textContent(),/۲۹ به ۳۶/);
 await page.locator('#decision').selectOption('pilot');await page.locator('#save-decision').click();
 assert.match(await page.locator('#decision-status').textContent(),/تصمیم ثبت‌شده/);
 await page.locator('#effect').evaluate(el=>{el.closest('details').open=true});
 await page.locator('#effect').fill('0');await page.locator('button[type="submit"]').click();
 assert.match(await page.locator('#decision-summary').textContent(),/هزینه از منفعت/);
 await page.locator('[data-scenario="duplicate"]').click();
 assert.match(await page.locator('#scenario-title').textContent(),/پرداخت تکراری/);
 await page.locator('[data-scenario="search"]').click();
 assert.match(await page.locator('#impact-cards').textContent(),/۲۸/);
 await page.locator('[data-scenario="guest"]').click();
 await page.locator('[data-evidence="SUP-086"]').first().click();
 await page.locator('#evidence-dialog[open]').waitFor();await page.keyboard.press('Escape');
 const downloadPromise=page.waitForEvent('download');
 await navigate('report');
 await page.locator('[data-action="export"]').click();
 const download=await downloadPromise;await download.saveAs('qa/report.json');
 const report=JSON.parse(await readFile('qa/report.json','utf8'));assert.equal(report.analysis.revision,2);
 await page.screenshot({path:'qa/report-desktop.png',fullPage:true,animations:'disabled'});
 await page.pdf({path:'qa/report.pdf',format:'A4',printBackground:true,preferCSSPageSize:true});
 await navigate('about');await page.screenshot({path:'qa/about-desktop.png',fullPage:true,animations:'disabled'});
 await page.setViewportSize({width:390,height:844});
 for(const id of ['knowledge','report','about']){
  await navigate(id);
  assert.ok(await page.evaluate(()=>document.documentElement.scrollWidth<=innerWidth+1),`Mobile overflow: ${id}`);
  await page.screenshot({path:`qa/${id}-mobile.png`,fullPage:true,animations:'disabled'});
 }
 assert.deepEqual(errors,[]);
 console.log('Browser QA passed: 5 widths, all pages, comparison, ticket, decision, evidence, export, PDF and no runtime errors.');
} finally {await browser?.close();server.kill()}
