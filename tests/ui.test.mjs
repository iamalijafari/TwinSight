import test from 'node:test';
import assert from 'node:assert/strict';
import {readFileSync} from 'node:fs';
import {createDocument} from './mock-dom.mjs';
const html=readFileSync(new URL('../src/TwinSight/wwwroot/index.html',import.meta.url),'utf8');
const data=JSON.parse(readFileSync(new URL('../src/TwinSight/wwwroot/data/demo.json',import.meta.url)));
const doc=createDocument(html);globalThis.document=doc;
globalThis.fetch=async url=>{if(url==='data/demo.json')return{ok:true,json:async()=>data};throw new Error('no API — test offline mode');};
const $=id=>doc.getElementById(id);
await import('../src/TwinSight/wwwroot/app.js');
await new Promise(resolve=>setImmediate(resolve));
test('offline UI flow — build, simulate, scrub, inspect, compare, explain, export, invalidate',async()=>{
  assert.match($('runtime').textContent,/OFFLINE JS/);assert.equal($('simulate').disabled,true);
  assert.equal($('source-grid').children.length,4);assert.equal($('targets').children.length,8);
  await $('build').click();assert.equal($('simulate').disabled,false);assert.match($('step1').textContent,/۲٬۶۴۸/);
  await $('change-form').emit('submit');assert.equal($('future-view').disabled,false);assert.equal($('risk-value').textContent,'۵۹٫۹');assert.equal($('customer-list').children.length,4);assert.match($('inspector').textContent,/SEP-142/);
  $('day').value='0';await $('day').emit('input');assert.equal($('risk-value').textContent,'۰');
  $('day').value='7';await $('day').emit('input');assert.equal($('risk-value').textContent,'۵۹٫۹');
  const analytics=$('network').children.find(n=>n.getAttribute('aria-label')?.startsWith('Analytics'));await analytics.emit('keydown');assert.match($('inspector').textContent,/Payment → Orders → Analytics/);
  await $('baseline-view').click();assert.equal($('risk-value').textContent,'۰');await $('future-view').click();assert.equal($('risk-value').textContent,'۵۹٫۹');
  await $('pin').click();$('canary').checked=true;await $('change-form').emit('input');assert.match($('draft-state').textContent,/اجرای قبلی/);assert.equal($('risk-value').textContent,'۵۹٫۹');
  await $('change-form').emit('submit');assert.equal($('risk-value').textContent,'۳۷٫۱');assert.equal($('comparison').hidden,false);assert.match($('comparison').textContent,/کمتر/);
  await $('explain').click();assert.match($('narrative').textContent,/قواعد ثابت/);
  await $('export').click();assert.ok(doc.clicked.some(n=>n.getAttribute('download')==='TwinSight-scenario-report.json'));
  $('description').value='<script>alert(1)</script> شرح تغییر شامل متن ساختگی';await $('change-form').emit('input');await $('change-form').emit('submit');await $('pin').click();assert.match($('comparison').textContent,/<script>/);assert.ok(!$('comparison').children.some(n=>n.tagName==='SCRIPT'));
  const source=doc.querySelectorAll('[data-source]').find(n=>n.value==='support');source.checked=false;await source.emit('change');assert.equal($('simulate').disabled,true);assert.equal($('export').disabled,true);assert.equal($('risk-value').textContent,'—');assert.equal($('comparison').hidden,true);assert.match($('notice').textContent,/دوباره بسازید/);
  await $('build').click();assert.equal($('confidence-value').textContent,'۸۵٪');await $('change-form').emit('submit');assert.match($('customer-list').textContent,/غایب/);
  for(const target of doc.querySelectorAll('[data-target]'))target.checked=false;await $('change-form').emit('input');await $('change-form').emit('submit');assert.match($('notice').textContent,/حداقل یک سرویس/);assert.equal($('simulate').disabled,false);
});

test('API UI flow preserves server mode, rejects stale async responses, handles outages',async()=>{
  const {buildTwin,simulate}=await import('../src/TwinSight/wwwroot/engine.js');
  const serverDoc=createDocument(html);globalThis.document=serverDoc;
  const s=id=>serverDoc.getElementById(id);let twin,delayBuild=false,delaySim=false,releaseBuild,releaseSim,failSim=false;
  globalThis.fetch=async(url,options)=>{
    if(url==='data/demo.json')return{ok:true,json:async()=>data};
    if(url==='api/health')return{ok:true,json:async()=>({product:'TwinSight',aiEnabled:false})};
    const body=JSON.parse(options.body);
    if(url==='api/twins'){if(delayBuild)await new Promise(resolve=>releaseBuild=resolve);twin=buildTwin(data,body.sources);return{ok:true,json:async()=>twin};}
    if(url==='api/simulations'){if(failSim)throw new Error('server unreachable');if(delaySim)await new Promise(resolve=>releaseSim=resolve);return{ok:true,json:async()=>simulate(data,twin,body)};}
    if(url.endsWith('/explain'))return{ok:true,json:async()=>({mode:'rules',text:'server rule explanation'})};
    throw new Error('unexpected endpoint '+url);
  };
  await import('../src/TwinSight/wwwroot/app.js?api-mode-test');await new Promise(resolve=>setImmediate(resolve));
  assert.match(s('runtime').textContent,/NET API/);
  delayBuild=true;const pending=s('build').click();await new Promise(resolve=>setImmediate(resolve));const source=serverDoc.querySelectorAll('[data-source]').find(n=>n.value==='support');source.checked=false;await source.emit('change');releaseBuild();await pending;assert.equal(s('simulate').disabled,true);assert.match(s('notice').textContent,/هنگام ساخت/);
  delayBuild=false;await s('build').click();delaySim=true;const simulation=s('change-form').emit('submit');await new Promise(resolve=>setImmediate(resolve));s('rollout').value='20';await s('change-form').emit('input');releaseSim();await simulation;assert.equal(s('risk-value').textContent,'—');assert.match(s('notice').textContent,/هنگام محاسبه/);
  delaySim=false;await s('change-form').emit('submit');assert.equal(s('risk-value').textContent,'۲۳٫۹');await s('explain').click();assert.match(s('narrative').textContent,/server rule explanation/);
  failSim=true;await s('change-form').emit('submit');assert.match(s('notice').textContent,/server unreachable/);assert.equal(s('risk-value').textContent,'۲۳٫۹');assert.match(s('runtime').textContent,/NET API/);assert.equal(s('simulate').disabled,false);
});

test('AI proposal UI requires explicit approval before applying suggested targets',async()=>{
  const {buildTwin,simulate}=await import('../src/TwinSight/wwwroot/engine.js');
  const aiDoc=createDocument(html);globalThis.document=aiDoc;const s=id=>aiDoc.getElementById(id);let twin;
  globalThis.fetch=async(url,options)=>{
    if(url==='data/demo.json')return{ok:true,json:async()=>data};
    if(url==='api/health')return{ok:true,json:async()=>({product:'TwinSight',aiEnabled:true})};
    const body=JSON.parse(options.body);
    if(url==='api/twins'){twin=buildTwin(data,body.sources);return{ok:true,json:async()=>twin};}
    if(url==='api/proposals')return{ok:true,json:async()=>({mode:'ai-proposal',proposal:{targets:['analytics'],kind:'performance',reasoning:'پیشنهاد آزمایشی، <script>متن</script>، نیازمند تأیید انسان.',evidenceIds:['SUP-58']}})};
    if(url==='api/simulations'){assert.deepEqual(body.targets,['analytics']);assert.equal(body.kind,'performance');return{ok:true,json:async()=>simulate(data,twin,body)};}
    throw new Error('unexpected endpoint');
  };
  await import('../src/TwinSight/wwwroot/app.js?ai-ui-test');await new Promise(resolve=>setImmediate(resolve));
  await s('build').click();assert.equal(s('understand').disabled,false);await s('understand').click();
  assert.equal(s('proposal-review').hidden,false);assert.match(s('proposal-text').textContent,/SUP-58/);
  assert.deepEqual(aiDoc.querySelectorAll('[data-target]:checked').map(n=>n.value),['payment']);assert.equal(s('kind').value,'migration');
  await s('apply-proposal').click();assert.deepEqual(aiDoc.querySelectorAll('[data-target]:checked').map(n=>n.value),['analytics']);assert.equal(s('kind').value,'performance');assert.equal(s('proposal-review').hidden,true);
  await s('change-form').emit('submit');assert.equal(s('risk-value').textContent,'۱۴٫۸');
});
