// Run against the .NET server. Tests real JSON binding and C#/JS parity, never calls AI.
import assert from 'node:assert/strict';
import {buildTwin,simulate} from '../src/TwinSight/wwwroot/engine.js';
const base=process.env.TEST_URL||'http://127.0.0.1:5080';
async function call(path,body){const response=await fetch(base+path,{method:body?'POST':'GET',headers:body?{'Content-Type':'application/json'}:{},body:body?JSON.stringify(body):undefined,signal:AbortSignal.timeout(10000)});return{status:response.status,data:await response.json()};}
const health=await call('/api/health');assert.equal(health.data.product,'TwinSight');
const data=(await call('/api/demo')).data;
assert.equal((await call('/api/twins',{sources:['github']})).status,400);
const twin=(await call('/api/twins',{sources:['github','jira','telemetry','support']})).data;
assert.equal(twin.coverage,100);assert.equal(twin.recordCount,2648);
const request={twinId:twin.id,description:'مهاجرت درگاه پرداخت به API جدید و منطق retry',targets:['payment'],kind:'migration',rollout:100,testCoverage:45,canary:false};
assert.equal((await call('/api/simulations',{...request,twinId:'stale'})).status,400);
assert.equal((await call('/api/simulations',{...request,targets:[]})).status,400);
assert.equal((await call('/api/simulations',{...request,rollout:101})).status,400);
let cases=0;
for(const target of data.nodes)for(const kind of ['feature','migration','performance','security'])for(const canary of [false,true]){
  const input={...request,targets:[target.id],kind,canary};const response=await call('/api/simulations',input);assert.equal(response.status,200);const expected=simulate(data,twin,input),actual=response.data;
  for(const key of ['overallRisk','coverage','nodes','customers','timeline','evidenceIds'])assert.deepEqual(actual[key],expected[key],`${target.id}/${kind}/${canary}: ${key}`);cases++;
}
const partial=(await call('/api/twins',{sources:['github','jira']})).data;
assert.equal(partial.coverage,60);const result=(await call('/api/simulations',{...request,twinId:partial.id})).data;assert.equal(result.overallRisk,59.9);assert.ok(result.evidenceIds.every(id=>['jira','github'].includes(data.evidence.find(e=>e.id===id).source)));
const blocked=await fetch(base+'/api/twins',{method:'POST',headers:{Origin:'https://example.org','Content-Type':'application/json'},body:JSON.stringify({sources:['github','jira']})});assert.equal(blocked.status,403);
const index=await fetch(base+'/');assert.equal(index.status,200);assert.match(index.headers.get('content-security-policy'),/frame-ancestors 'none'/);assert.match(await index.text(),/TwinSight/);
console.log(`PASS: real API validation, origin guard, static serving and ${cases} C#/JS parity cases`);
