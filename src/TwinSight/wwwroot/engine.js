// Offline reference implementation of the C# deterministic-demo engine.
export const kindWeights = { feature: .78, migration: 1, performance: .55, security: .88 };
export const sourceIds = ['jira', 'github', 'telemetry', 'support'];
const round = n => Math.floor(n * 10 + .5 + 1e-9) / 10;
const id = () => globalThis.crypto?.randomUUID?.() ?? `demo-${Date.now()}-${Math.random().toString(36).slice(2)}`;
export function validateBuild(sources) {
  if (!Array.isArray(sources) || sources.length < 2 || !sources.includes('github') || new Set(sources).size !== sources.length || sources.some(s => !sourceIds.includes(s))) throw new Error('حداقل دو منبع معتبر و یکتا، شامل GitHub، انتخاب کنید.');
}
export function buildTwin(data, sources) {
  validateBuild(sources);
  return { id: id(), sources: [...sources], recordCount: data.sources.filter(s => sources.includes(s.id)).reduce((sum,s) => sum+s.records,0), coverage: 40+(sources.includes('jira')?20:0)+(sources.includes('telemetry')?25:0)+(sources.includes('support')?15:0), missing: sourceIds.filter(s => !sources.includes(s)), evidenceIds: data.evidence.filter(e => sources.includes(e.source)).map(e=>e.id), builtAt: new Date().toISOString() };
}
export function validateRequest(data,r) {
  if (typeof r.description !== 'string' || r.description.trim().length < 12 || r.description.length > 2000) throw new Error('شرح تغییر باید بین ۱۲ و ۲۰۰۰ کاراکتر باشد.');
  if (!Array.isArray(r.targets) || !r.targets.length || new Set(r.targets).size !== r.targets.length || r.targets.some(t=>!data.nodes.some(n=>n.id===t))) throw new Error('حداقل یک سرویس معتبر و یکتا انتخاب کنید.');
  if (!Object.hasOwn(kindWeights,r.kind)) throw new Error('نوع تغییر معتبر نیست.');
  if (!Number.isInteger(r.rollout) || r.rollout<1 || r.rollout>100 || !Number.isInteger(r.testCoverage) || r.testCoverage<0 || r.testCoverage>100 || typeof r.canary !== 'boolean') throw new Error('تنظیمات انتشار و تست معتبر نیست.');
}
export function simulate(data,twin,r) {
  validateRequest(data,r);
  if (!twin || r.twinId!==twin.id) throw new Error('ابتدا مدل معتبر بسازید.');
  const scores=Object.fromEntries(data.nodes.map(n=>[n.id,0])), paths=Object.fromEntries(data.nodes.map(n=>[n.id,[]]));
  const base=82*kindWeights[r.kind]*(.25+.75*r.rollout/100)*(1-.006*r.testCoverage)*(r.canary?.62:1);
  for(const target of r.targets){scores[target]=base*data.nodes.find(n=>n.id===target).criticality;paths[target]=[target];}
  for(let i=0;i<data.nodes.length;i++){
    let changed=false;
    for(const edge of data.edges){const candidate=scores[edge.from]*edge.weight;if(candidate>scores[edge.to]+1e-9){scores[edge.to]=candidate;paths[edge.to]=[...paths[edge.from],edge.to];changed=true;}}
    if(!changed)break;
  }
  const nodes=data.nodes.map(n=>({id:n.id,risk:round(scores[n.id]),latencyDelta:round(scores[n.id]*2.4),path:paths[n.id]}));
  const customers=data.customers.map(c=>{const index=Math.min(95,Math.max(...c.services.map(s=>scores[s]))*c.sensitivity);return {id:c.id,name:c.name,users:c.users,challengeIndex:round(index),exposedUsers:Math.round(c.users*r.rollout/100*index/100)};});
  const overallRisk=round(Math.max(...nodes.map(n=>n.risk))),days=[0,1,3,7,14,30],factors=[0,.45,.85,1,.72,.38];
  const timeline=days.map((day,i)=>({day,factor:factors[i],risk:round(overallRisk*factors[i]),latencyDelta:round(Math.max(...nodes.map(n=>n.latencyDelta))*factors[i]),exposedUsers:Math.round(customers.reduce((s,c)=>s+c.exposedUsers,0)*factors[i])}));
  return {id:id(),twinId:twin.id,description:r.description.trim(),kind:r.kind,targets:[...r.targets],rollout:r.rollout,testCoverage:r.testCoverage,canary:r.canary,mode:'deterministic-demo',overallRisk,coverage:twin.coverage,nodes,customers,timeline,evidenceIds:data.evidence.filter(e=>twin.sources.includes(e.source)&&scores[e.node]>1).map(e=>e.id),assumptions:['تمام داده‌ها ساختگی‌اند؛ شاخص ریسک احتمال آماری نیست.','وابستگی‌ها جهت‌دارند و اثر با بیشترین مسیر وزنی منتقل می‌شود.','نمودار زمانی یک فرض نمایشی ثابت است؛ از تاریخچه آموزش ندیده است.','متن تغییر برای توضیح ثبت می‌شود؛ عددها از سرویس‌ها و تنظیمات صریح محاسبه می‌شوند.',twin.missing.length?`منابع غایب: ${twin.missing.join(', ')}. پوشش کمتر به معنای ریسک کمتر نیست.`:'همه منابع نمایشی انتخاب شده‌اند؛ این به معنی دقت ۱۰۰٪ نیست.'],mitigations:['انتشار محدود با امکان بازگشت را پیش از انتشار سراسری بررسی کنید.',`تست قرارداد برای مسیر ${r.targets.join('، ')} و سرویس‌های وابسته اضافه کنید.`,'شاخص خطای پرداخت و درخواست‌های پشتیبانی را با خط پایه مقایسه کنید؛ تصمیم نهایی با انسان است.'],createdAt:new Date().toISOString()};
}
export function atDay(result,day){
  const t=result.timeline,upper=t.findIndex(p=>p.day>=day);
  if(upper<=0)return {...t[upper===-1?t.length-1:0],day};
  const a=t[upper-1],b=t[upper],ratio=(day-a.day)/(b.day-a.day);
  return {day,factor:a.factor+(b.factor-a.factor)*ratio,risk:round(a.risk+(b.risk-a.risk)*ratio),latencyDelta:round(a.latencyDelta+(b.latencyDelta-a.latencyDelta)*ratio),exposedUsers:Math.round(a.exposedUsers+(b.exposedUsers-a.exposedUsers)*ratio)};
}
