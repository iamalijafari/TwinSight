import {simulate, atDay} from './engine.js';
const $ = id => document.getElementById(id);
const esc = value => String(value).replace(/[&<>"']/g, c => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const fa = value => new Intl.NumberFormat('fa-IR', {maximumFractionDigits: 1}).format(value);
const icons = {
  layers: '<path d="m3 7 9-4 9 4-9 4-9-4Zm0 5 9 4 9-4M3 17l9 4 9-4"/>',
  network: '<rect x="9" y="2" width="6" height="6" rx="1"/><rect x="2" y="16" width="6" height="6" rx="1"/><rect x="16" y="16" width="6" height="6" rx="1"/><path d="M12 8v4M5 16v-4h14v4"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Zm0 0v5h5M8 12h8M8 16h6"/>',
  spark: '<path d="m12 3 2.4 6.6L21 12l-6.6 2.4L12 21l-2.4-6.6L3 12l6.6-2.4L12 3ZM20 2v4M18 4h4"/>',
  shield: '<path d="m12 2 9 4v6c0 5-9 10-9 10S3 17 3 12V6l9-4Z"/><path d="m8 12 3 3 5-6"/>',
  play: '<path d="m9 5 10 7-10 7V5Z"/><circle cx="12" cy="12" r="10"/>',
  route: '<circle cx="5" cy="5" r="2"/><circle cx="19" cy="19" r="2"/><path d="M7 5h9a4 4 0 0 1 0 8H8a3 3 0 0 0 0 6h9"/>',
  users: '<circle cx="9" cy="7" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 4a3 3 0 0 1 0 6M21 21v-3a6 6 0 0 0-4-5"/>',
  compare: '<path d="M5 4v16M19 4v16M5 8h13l-3-3M19 16H6l3 3"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  payment: '<rect x="2" y="5" width="20" height="14" rx="3"/><path d="M2 10h20M6 15h4"/>',
  identity: '<circle cx="10" cy="7" r="3"/><path d="M3 21v-3a7 7 0 0 1 10-6M15 15h6v6h-6zM16 15v-2a2 2 0 0 1 4 0v2"/>',
  analytics: '<path d="M3 3v18h18M7 16v-4M12 16V8M17 16V5"/>',
  clock: '<circle cx="12" cy="12" r="9"/><path d="M12 6v6l4 2"/>',
  alert: '<path d="m12 3 10 18H2L12 3ZM12 9v5M12 17v1"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M3 16v5h18v-5"/>',
  print: '<path d="M6 8V2h12v6M6 17H3V8h18v9h-3M6 14h12v8H6z"/>',
  mobile: '<rect x="6" y="2" width="12" height="20" rx="2"/><path d="M10 18h4"/>',
  store: '<path d="M3 9h18l-2-6H5L3 9ZM4 9v12h16V9M8 21v-7h5v7"/>',
};
const icon = name => `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${icons[name] || icons.layers}</svg>`;
function hydrateIcons(root = document) { root.querySelectorAll('[data-icon]').forEach(el => { el.innerHTML = icon(el.dataset.icon); }); }
hydrateIcons();
const presets = {
  payment: {title:'تعویض درگاه پرداخت', subtitle:'وقتی پرداخت تغییر کند، خرید چه می‌شود؟', description:'اتصال پرداخت به درگاه جدید و تغییر روش تلاش مجدد در صورت ناموفق بودن پرداخت.', target:'payment', kind:'migration', testCoverage:45, rollout:100, canary:false},
  identity: {title:'تغییر ورود کاربران', subtitle:'از ورود کاربر تا ثبت سفارش', description:'تغییر روش صدور توکن و ورود یکپارچه کاربران در سامانه فروشگاه.', target:'identity', kind:'security', testCoverage:55, rollout:100, canary:false},
  analytics: {title:'بهبود گزارش فروش', subtitle:'یک تغییر کوچک، با اثر محدودتر', description:'بهینه‌سازی موتور گزارش فروش برای پاسخ سریع‌تر به درخواست مدیران.', target:'analytics', kind:'performance', testCoverage:80, rollout:100, canary:false},
};
const sourceLabels = {github:'مخزن کد', jira:'تیکت‌های توسعه', telemetry:'پایش سرویس‌ها', support:'پشتیبانی مشتری'};
const kindLabels = {migration:'تعویض اتصال', feature:'قابلیت جدید', performance:'بهبود عملکرد', security:'تغییر امنیتی'};
const titles = {workspace:'بررسی تغییر', organization:'نمای سازمان', report:'گزارش تصمیم', about:'دربارهٔ ایده'};
const assumptions = ['تمام داده‌ها و شواهد ساختگی‌اند؛ شاخص اثر، احتمال خرابی نیست.', 'اثر با بیشترین مسیر وزنی در گراف ثابت انتقال می‌یابد. ضریب پایه ۸۲ و ضریب نوع تغییر از فرض‌های دمو هستند.', 'پوشش آزمون و درصد انتشار ضرایب نمایشی‌اند. انتشار تدریجی ضریب ثابت ۰٫۶۲ دارد؛ کاهش حاصل، نتیجهٔ آزمایش واقعی نیست.', 'اوج در روز هفتم و سپس کاهش اثر، الگوی زمانی فرضی است؛ از تاریخچه یاد گرفته نشده است.', 'تعداد کاربران و تأخیر، خروجی قواعد ثابت‌اند. متن آزاد تحلیل نمی‌شود؛ سرویس و تنظیمات صریح مبنای محاسبه‌اند.', 'نتیجه مجوز انتشار نیست؛ در محصول واقعی، دادهٔ زنده، اعتبارسنجی تاریخی و تأیید مسئول انتشار لازم‌اند.'];
let data, result = null, comparison = null, selectedPreset = 'payment', selectedNode = 'payment', day = 7, view = 'current', tourStep = 0, toastTimer;
const label = id => data.nodes.find(n => n.id === id)?.label || id;
const nodeResult = id => result?.nodes.find(n => n.id === id);
const severity = n => n > 50 ? 'اثر زیاد' : n > 25 ? 'نیازمند بررسی' : n > 1 ? 'اثر محدود' : 'بدون اثر سناریو';
const color = n => n > 50 ? '#ef7c88' : n > 25 ? '#dca057' : n > 1 ? '#b0a1fa' : '#8b89a3';
const request = () => ({description:$('description').value, target:$('target').value, kind:$('kind').value, rollout:Number($('rollout').value), testCoverage:Number($('coverage').value), canary:$('canary').checked});
function isDirty() { return result && JSON.stringify(request()) !== JSON.stringify(result.request); }
function toast(message) { clearTimeout(toastTimer); $('toast').textContent = message; $('toast').hidden = false; toastTimer = setTimeout(() => { $('toast').hidden = true; }, 4000); }
function navigate(name, focus = false) {
  name = Object.hasOwn(titles, name) ? name : 'workspace';
  document.querySelectorAll('.page').forEach(p => { p.hidden = p.id !== name; });
  document.querySelectorAll('[data-nav]').forEach(a => { a.classList.toggle('active', a.dataset.nav === name); if (a.dataset.nav === name) a.setAttribute('aria-current','page'); else a.removeAttribute('aria-current'); });
  $('page-title').textContent = titles[name];
  if (name === 'report') renderReport();
  if (focus) { window.scrollTo({top:0, behavior:'instant'}); $('main').focus({preventScroll:true}); }
}
function drawPresets() {
  $('presets').innerHTML = Object.entries(presets).map(([id, p]) => `<button class="preset" type="button" data-preset="${id}" aria-pressed="${selectedPreset === id}"><span class="preset-icon">${icon(id)}</span><span><strong>${p.title}</strong><small>${p.subtitle}</small></span><span class="preset-check" aria-hidden="true"></span></button>`).join('');
}
function setPreset(id) {
  selectedPreset = id; const p = presets[id];
  $('description').value = p.description; $('target').value = p.target; $('kind').value = p.kind;
  $('rollout').value = p.rollout; $('coverage').value = p.testCoverage; $('canary').checked = p.canary;
  selectedNode = p.target; result = null; comparison = null; day = 7; view = 'current';
  drawPresets(); updateForm(); render();
}
function updateForm() {
  $('rollout-value').textContent = `${fa($('rollout').value)}٪`;
  $('coverage-value').textContent = `${fa($('coverage').value)}٪`;
  const dirty = isDirty();
  $('draft-state').textContent = dirty ? 'تنظیمات تغییر کرده؛ نتیجهٔ نمایش‌داده‌شده مربوط به اجرای قبلی است.' : result ? 'نتیجه برای همین تنظیمات محاسبه شده است.' : 'نمای سازمان آماده است؛ نیازی به ساخت مدل نیست.';
  $('draft-state').classList.toggle('dirty', Boolean(dirty));
  $('compare').disabled = !result || Boolean(dirty) || result.request.canary;
  $('compare').innerHTML = icon('compare') + (result?.request.canary ? 'این سناریو از ابتدا تدریجی است' : dirty ? 'ابتدا تنظیمات جدید را بررسی کنید' : 'مقایسه با انتشار تدریجی');
}
function run() {
  try {
    result = simulate(data, request()); comparison = null; day = 7; view = 'future'; selectedNode = result.request.target;
    render(); updateForm(); toast('پیامد تغییر محاسبه شد؛ مسیرها و اثر مشتری را ببینید.');
  } catch (error) { toast(error.message); }
}
function pathMarkup(ids) { return `<div class="path-flow" aria-label="مسیر انتقال اثر">${ids.map((id,i) => `${i ? '<i aria-hidden="true">→</i>' : ''}<span>${esc(label(id))}</span>`).join('')}</div>`; }
function edgePath(a,b) {
  if (a.x === b.x) {
    const direction=b.y>a.y?1:-1;
    return `M${a.x},${a.y+36*direction} L${b.x},${b.y-42*direction}`;
  }
  const sx=a.x+82, sy=a.y, ex=b.x-87, ey=b.y, mid=(sx+ex)/2;
  return `M${sx},${sy} C${mid},${sy} ${mid},${ey} ${ex},${ey}`;
}
function renderGraph() {
  const future = result && view === 'future', factor = future ? atDay(result, day).factor : 0;
  const selectedPath = future ? nodeResult(selectedNode).path : [];
  const edges = data.edges.map(e => {
    const a=data.nodes.find(n=>n.id===e.from), b=data.nodes.find(n=>n.id===e.to);
    const affected=future && nodeResult(e.from).risk*factor>1;
    const onPath=selectedPath.some((id,i)=>id===e.from && selectedPath[i+1]===e.to);
    return `<path d="${edgePath(a,b)}" class="edge ${affected?'affected':''} ${onPath?'selected-edge':''}" marker-end="url(#${onPath?'arrow-selected':affected?'arrow-effect':'arrow'})"/>`;
  }).join('');
  const nodes = data.nodes.map(n=>{
    const score = future ? nodeResult(n.id).risk*factor : 0;
    return `<g class="node ${selectedNode===n.id?'selected':''}" role="button" tabindex="0" data-node="${n.id}" aria-label="${esc(n.label)}؛ ${future?`${severity(score)}؛ ${fa(score)} از ۱۰۰`:'نمای فعلی'}" aria-pressed="${selectedNode===n.id}" transform="translate(${n.x-82},${n.y-36})"><rect class="node-box" width="164" height="72" rx="11"/><circle class="node-dot" cx="15" cy="16" r="3" style="fill:${color(score)}"/><text class="node-label" x="82" y="32" direction="rtl">${esc(n.label)}</text><text class="node-name" x="82" y="53">${esc(n.name)}</text>${future?`<text class="node-score" x="150" y="17" style="fill:${color(score)}">${fa(score)}</text>`:''}</g>`;
  }).join('');
  $('network').innerHTML=`<defs><marker id="arrow" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#66647f"/></marker><marker id="arrow-effect" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#a89be6"/></marker><marker id="arrow-selected" markerWidth="6" markerHeight="6" refX="5" refY="3" orient="auto"><path d="M0 0L6 3L0 6Z" fill="#e0d7ff"/></marker><pattern id="grid" width="20" height="20" patternUnits="userSpaceOnUse"><circle cx="10" cy="10" r=".7" fill="#ffffff0c"/></pattern></defs><rect width="940" height="410" fill="url(#grid)"/>${edges}${nodes}`;
  $('view-current').setAttribute('aria-pressed', String(view==='current')); $('view-future').setAttribute('aria-pressed', String(view==='future')); $('view-future').disabled=!result;
  $('map-status').textContent=future?`پیامد نمایشی در روز ${fa(day)}`:'نمای ثابت سازمان نمونه';
  $('map-subtitle').textContent = future ? 'شاخص اثر از ۱۰۰؛ احتمال خرابی نیست.' : 'روی هر بخش بزنید تا نقش و شواهدش را ببینید.';
  $('timeline').hidden=!result;
  if (result) {
    $('day-buttons').innerHTML=[1,7,14,30].map(d=>`<button type="button" data-day="${d}" aria-pressed="${d===day}">روز ${fa(d)}</button>`).join('');
    const point = t => `${10+t.day/30*460},${48-t.risk/100*44}`;
    const line=result.timeline.map(point).join(' '),current=atDay(result,day);
    $('trajectory').innerHTML=`<defs><linearGradient id="chart-fill" x1="0" y1="0" x2="0" y2="1"><stop offset="0%" stop-color="#afa0ef" stop-opacity=".2"/><stop offset="100%" stop-color="#afa0ef" stop-opacity="0"/></linearGradient></defs><line x1="10" y1="48" x2="470" y2="48" stroke="#eee9f7"/><polygon points="10,48 ${line} 470,48" fill="url(#chart-fill)"/><polyline points="${line}" fill="none" stroke="#a18bde" stroke-width="2"/><line x1="${10+day/30*460}" y1="4" x2="${10+day/30*460}" y2="48" stroke="#c7b8e8" stroke-dasharray="3 3"/><circle cx="${10+day/30*460}" cy="${48-current.risk/100*44}" r="3" fill="#7960bc"/>`;
  }
}
function miniEvidence(e) { return `<button class="evidence-mini" data-evidence="${e.id}"><span dir="ltr">${e.id}</span>${esc(e.text)}</button>`; }
function renderInspector() {
  const n=data.nodes.find(n=>n.id===selectedNode), info=nodeResult(n.id), future=result && view==='future';
  const score=future?info.risk*atDay(result,day).factor:0;
  const evidence=data.evidence.filter(e=>e.node===n.id);
  $('inspector').innerHTML=`<div class="inspector-body"><div class="selected-service"><div><h3>${esc(n.label)}</h3><small>${esc(n.owner)} · <span dir="ltr">${esc(n.name)}</span></small></div><span class="pill">${future?severity(score):'نمای فعلی'}</span></div><p>${esc(n.description)}. تأخیر پایهٔ نمونه: ${fa(n.latency)} میلی‌ثانیه.</p>${future ? info.path.length ? pathMarkup(info.path)+`<p>${info.path.length===1?'این بخش مستقیماً تغییر می‌کند.':'اثر از مسیر وابستگی بالا به این بخش می‌رسد.'} شاخص روز ${fa(day)}: ${fa(score)} از ۱۰۰.</p>` : '<p>در این سناریو، مسیری برای انتقال اثر به این بخش وجود ندارد.</p>' : '<p>ساختار سازمان آماده است. شواهد زیر زمینهٔ بررسی این بخش را نشان می‌دهند.</p>'}${evidence.length?evidence.map(miniEvidence).join(''):'<p class="empty-inline">برای این بخش، شاهد مستقیم در نمونه ثبت نشده است.</p>'}<a class="text-button inspector-link" href="#organization">دیدن تمام شواهد و منابع ←</a></div>`;
}
function customerMessage(c,index) {
  if(index<=1)return 'در این سناریو اثر قابل توجهی به این گروه نمی‌رسد.';
  const affected=result.nodes.filter(n=>n.risk>1).map(n=>n.id);
  if(c.id==='mobile')return affected.includes('payment')?'ممکن است پرداخت و تکمیل خرید با تأخیر یا تلاش مجدد همراه شود.':'ورود و تکمیل خرید ممکن است با تأخیر همراه شود.';
  if(c.id==='merchants')return 'تأیید سفارش و رزرو موجودی ممکن است دیرتر انجام شود.';
  return 'گزارش فروش و پیگیری سفارش‌ها ممکن است با تأخیر به‌روز شود.';
}
function renderCustomers() {
  const factor=result?atDay(result,day).factor:0;
  $('customer-caption').textContent=result?`پیامد فرضی در روز ${fa(day)}؛ تعدادها برآورد دمو هستند`:'پیامد تغییر برای سه گروه مشتری نمونه';
  $('customers').innerHTML=data.customers.map(c=>{
    const info=result?.customers.find(x=>x.id===c.id),index=info?info.challengeIndex*factor:0;
    return `<div class="customer-card"><span class="customer-avatar">${icon(c.id==='mobile'?'mobile':c.id==='merchants'?'store':'users')}</span><div><strong>${esc(c.name)}</strong><small>${fa(c.users)} کاربر نمونه</small><p>${result?customerMessage(c,index):'پس از بررسی تغییر، پیامد برای این گروه نمایش داده می‌شود.'}</p>${result?`<div class="customer-bar"><span style="width:${index}%"></span></div>`:''}</div><div class="customer-score">${result?fa(Math.round(info.exposedUsers*factor)):'—'}<small>کاربر در معرض اثر</small></div></div>`;
  }).join('');
}
function renderSummary() {
  $('metrics').hidden=!result;
  $('result-summary').classList.toggle('has-result', Boolean(result));
  if (!result) {$('result-summary').innerHTML=`<span class="summary-icon">${icon('spark')}</span><div><h2>اثر یک تغییر، به همان سرویس محدود نمی‌ماند.</h2><p>«بررسی پیامد تغییر» را بزنید؛ مسیرهای درگیر و تجربهٔ مشتری اینجا روشن می‌شوند.</p></div>`;return;}
  const t=atDay(result,day),affected=result.nodes.filter(n=>n.risk*t.factor>1).length;
  $('result-summary').innerHTML=`<span class="summary-icon">${icon('route')}</span><div><h2>تغییر در ${esc(label(result.request.target))}، به ${fa(Math.max(0,affected-1))} بخش دیگر هم می‌رسد.</h2><p>روز ${fa(day)}: ${severity(t.risk)}. اثر را روی نقشه دنبال کنید و پیش از انتشار، مسیرهای حساس را بررسی کنید.</p></div><a class="text-button" style="margin-right:auto;white-space:nowrap" href="#report">گزارش تصمیم ←</a>`;
  const metrics=[['شاخص اثر سناریو',fa(t.risk),'از ۱۰۰ · احتمال خرابی نیست','alert'],['بخش‌های تحت تأثیر',fa(affected),'از ۸ سرویس سازمان نمونه','network'],['کاربران در معرض اثر',fa(t.exposedUsers),'برآورد نمایشی · کاربر','users'],['افزایش تأخیر مسیر',fa(t.latencyDelta),'میلی‌ثانیه · فرض دمو','clock']];
  $('metrics').innerHTML=metrics.map(m=>`<div class="metric">${icon(m[3])}<span class="metric-label">${m[0]} · روز ${fa(day)}</span><strong>${m[1]}</strong><small>${m[2]}</small></div>`).join('');
}
function renderComparison() {
  $('comparison').hidden=!comparison;
  if(!comparison)return;
  const reduction=Math.round((1-comparison.overallRisk/result.overallRisk)*100);
  $('comparison').innerHTML=`<div class="comparison-result"><div><h3>روش انتشار فعلی</h3><strong>${fa(result.overallRisk)}</strong><small>شاخص اوج اثر · روز هفتم</small></div><div><h3>همان تغییر، با انتشار تدریجی</h3><strong>${fa(comparison.overallRisk)}</strong><small>شاخص اوج اثر · روز هفتم</small></div><div class="reduction"><h3>کاهش در فرض‌های این دمو</h3><strong>${fa(reduction)}٪</strong><small>با ضریب ثابت انتشار تدریجی</small></div><p class="comparison-footnote">شرح تغییر، درصد کاربران و پوشش آزمون یکسان‌اند. تنها انتشار تدریجی فعال شده است؛ این کاهش، نتیجهٔ واقعی یا تضمین انتشار نیست.</p></div>`;
}
function render() { renderGraph();renderInspector();renderCustomers();renderSummary();renderComparison();updateForm(); }
function renderOrganization() {
  $('source-cards').innerHTML=data.sources.map(s=>`<article class="panel source-card"><div class="source-logo">${icon(s.id==='github'?'layers':s.id==='jira'?'file':s.id==='telemetry'?'analytics':'users')}</div><h3>${sourceLabels[s.id]} <small dir="ltr">/ ${s.name}</small></h3><p>${esc(s.description)}</p><strong>${fa(s.records)}</strong><small>رکورد ساختگی · از قبل آماده</small></article>`).join('');
  $('service-cards').innerHTML=data.nodes.map(n=>`<button class="service-card" data-service="${n.id}">${icon('route')}<strong>${esc(n.label)}</strong><small>${esc(n.owner)} · <span dir="ltr">${esc(n.name)}</span></small><p>${esc(n.description)}</p></button>`).join('');
  $('source-filter').innerHTML='<option value="all">همهٔ منابع</option>'+data.sources.map(s=>`<option value="${s.id}">${sourceLabels[s.id]}</option>`).join('');
  renderEvidence();
}
function renderEvidence() {
  const q=$('evidence-search').value.trim().toLocaleLowerCase(),source=$('source-filter').value;
  const items=data.evidence.filter(e=>(source==='all'||e.source===source)&&`${e.id} ${e.text} ${label(e.node)} ${sourceLabels[e.source]}`.toLocaleLowerCase().includes(q));
  $('evidence-count').textContent=`${fa(items.length)} شاهد نمونه`;
  $('evidence-list').innerHTML=items.length?items.map(e=>`<div class="evidence-row"><span class="evidence-id" dir="ltr">${e.id}</span><div class="evidence-text"><p>${esc(e.text)}</p><small>${sourceLabels[e.source]} · ${esc(label(e.node))}</small></div><button class="button" data-evidence="${e.id}">جزئیات ←</button></div>`).join(''):'<p class="empty-inline">شاهدی با این عبارت پیدا نشد؛ جست‌وجو یا فیلتر را تغییر دهید.</p>';
}
function openEvidence(id) {
  const e=data.evidence.find(e=>e.id===id);if(!e)return;
  $('detail-content').innerHTML=`<h2>${sourceLabels[e.source]} / ${esc(label(e.node))}</h2><p>${esc(e.text)}</p><p class="detail-meta">شناسه: <b dir="ltr">${e.id}</b> · ${data.snapshot.label} · ${data.snapshot.date}</p><p class="detail-note">این یک شاهد ساختگی برای نمایش ایده است. در نسخهٔ واقعی، این قسمت به سند یا رخداد اصلی و زمان آخرین دریافت آن پیوند دارد.</p>`;
  $('detail-dialog').showModal();
}
function mitigations() {
  return [`مسیر ${result.nodes.filter(n=>n.path.length>1).length?result.nodes.filter(n=>n.path.length>1).sort((a,b)=>b.risk-a.risk)[0].path.map(label).join(' ← '):label(result.request.target)} را پیش از انتشار بررسی کنید.`, 'انتشار را ابتدا محدود و تدریجی انجام دهید؛ معیار توقف و امکان بازگشت مشخص باشد.', 'شاخص خطای سرویس و تیکت‌های مشتری را با خط پایه مقایسه کنید؛ تصمیم نهایی با مسئول انتشار است.'];
}
function renderReport() {
  if(!result){$('report-content').innerHTML=`<div class="empty-panel">${icon('file')}<h2>اول یک تغییر را بررسی کنید.</h2><p>پس از اجرای سناریو، گزارش مسیر اثر و پیشنهادهای انتشار اینجا آماده می‌شود.</p><a class="button primary" href="#workspace">رفتن به بررسی تغییر ←</a></div>`;return;}
  const r=result.request,t=atDay(result,day);
  const affected=result.nodes.filter(n=>n.risk>1).sort((a,b)=>b.risk-a.risk);
  $('report-content').innerHTML=`<article class="panel report-card"><div class="report-heading"><div><h2>تغییر در ${esc(label(r.target))}</h2><p>سپهر تجارت · سازمان ساختگی · ${data.snapshot.label}</p></div><span class="pill">${isDirty()?'اجرای قبلی':'نتیجهٔ سناریو'}</span></div><p class="report-description">${esc(r.description)}</p><div class="report-settings"><span>${kindLabels[r.kind]}</span><span>انتشار برای ${fa(r.rollout)}٪ کاربران</span><span>پوشش آزمون ${fa(r.testCoverage)}٪</span><span>${r.canary?'انتشار تدریجی':'انتشار یک‌مرحله‌ای'}</span><span>روز ${fa(day)}</span></div>${isDirty()?'<div class="info-strip"><p>تنظیمات فرم تغییر کرده‌اند. این گزارش مربوط به آخرین اجرای ثبت‌شده است، نه تنظیمات جدید.</p></div>':''}<div class="report-stats"><div><strong>${fa(t.risk)}</strong><small>شاخص اثر در روز انتخابی / ۱۰۰</small></div><div><strong>${fa(t.exposedUsers)}</strong><small>کاربر در معرض اثر · برآورد دمو</small></div><div><strong>${fa(t.latencyDelta)}</strong><small>افزایش تأخیر · میلی‌ثانیه</small></div></div><div class="report-paths"><h3>مسیرهای انتقال اثر</h3>${affected.map(n=>pathMarkup(n.path)).join('')}</div>${comparison?`<div class="info-strip"><div><strong>مقایسهٔ انتشار در روز هفتم</strong><p>شاخص اوج فعلی: ${fa(result.overallRisk)}؛ با انتشار تدریجی: ${fa(comparison.overallRisk)}. با همان ورودی‌ها و ضریب فرضی ۰٫۶۲.</p></div></div>`:''}<div class="report-actions"><button class="button primary" data-action="export">${icon('download')}دریافت گزارش JSON</button><button class="button" data-action="print">${icon('print')}چاپ یا ذخیرهٔ PDF</button><a class="button" href="#workspace">بازگشت به سناریو</a></div></article><article class="panel report-card"><h2>پیش از انتشار چه چیزی را بررسی کنیم؟</h2><ol class="decision-list">${mitigations().map(m=>`<li>${esc(m)}</li>`).join('')}</ol><div class="report-evidence"><h3>شواهد مرتبط با مسیرهای درگیر</h3>${data.evidence.filter(e=>result.evidenceIds.includes(e.id)).map(miniEvidence).join('')}</div><details class="report-limits"><summary>فرض‌ها و محدودیت‌های محاسبه</summary><ul class="assumptions">${assumptions.map(a=>`<li>${a}</li>`).join('')}</ul></details></article>`;
}
function exportReport() {
  if(!result)return;
  const report={product:'TwinSight',team:'BridgeX',notice:data.notice,snapshot:data.snapshot,organization:data.organization,scenario:result,selectedDay:day,daySummary:atDay(result,day),comparison,sourceRecords:data.sources,evidence:data.evidence.filter(e=>result.evidenceIds.includes(e.id)),mitigations:mitigations(),assumptions};
  const blob=new Blob([JSON.stringify(report,null,2)],{type:'application/json;charset=utf-8'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='TwinSight-demo-report.json';a.click();setTimeout(()=>URL.revokeObjectURL(url),1000);toast('گزارش سناریوی اجراشده دریافت شد.');
}
const tourSteps=[
  {title:'یک تغییر، چند پیامد',copy:'فرض کنید تیم مالی می‌خواهد درگاه پرداخت را عوض کند. TwinSight نشان می‌دهد این تصمیم چطور از پرداخت به سفارش، انبار و تجربهٔ مشتری می‌رسد.',page:'workspace'},
  {title:'دانش سازمان از قبل آماده است',copy:'منابع و شواهد را اینجا می‌بینید. برای هر تصمیم، مدل سازمان را دوباره نمی‌سازیم؛ سناریوی تغییر را روی همین نمای مشترک بررسی می‌کنیم.',page:'organization'},
  {title:'حالا اثر تغییر را ببینید',copy:'سناریوی تعویض درگاه با انتشار برای همهٔ کاربران اجرا شده است. روی گزارش فروش در نقشه بزنید؛ مسیر پرداخت ← سفارش‌ها ← گزارش فروش و شواهد آن قابل بررسی است.',page:'workspace'},
  {title:'روش انتشار را مقایسه کنید',copy:'همان سناریو با انتشار تدریجی مقایسه شده است. شاخص اوج اثر از ۵۹٫۹ به ۳۷٫۱ می‌رسد؛ این اعداد از فرض‌های دمو می‌آیند و پیش‌بینی واقعی نیستند.',page:'workspace'},
  {title:'تصمیم با تیم انتشار می‌ماند',copy:'گزارش، مسیرهای حساس و بررسی‌های پیشنهادی را یک‌جا جمع می‌کند. خروجی را دریافت کنید یا به سناریوها برگردید. هیچ تغییری در سازمان واقعی انجام نمی‌شود.',page:'report'},
];
function showTourStep() {
  const s=tourSteps[tourStep];
  if(tourStep===2){setPreset('payment');run();selectedNode='analytics';render();}
  if(tourStep===3){if(!result||result.request.target!=='payment'||result.request.canary||isDirty()){setPreset('payment');run();}comparison=simulate(data,{...result.request,canary:true});renderComparison();}
  history.replaceState(null,'',`#${s.page}`);navigate(s.page);window.scrollTo({top:tourStep===3?$('compare-section').offsetTop-120:tourStep===2?$('scenario-form').offsetTop-120:0,behavior:'instant'});
  $('tour-step').textContent=`راهنمای ارائه · ${fa(tourStep+1)} از ${fa(tourSteps.length)}`;$('tour-title').textContent=s.title;$('tour-copy').textContent=s.copy;
  $('tour-back').disabled=tourStep===0;$('tour-next').textContent=tourStep===tourSteps.length-1?'پایان راهنما':'بعدی ←';
  $('tour-dots').innerHTML=tourSteps.map((_,i)=>`<i class="${i===tourStep?'active':''}"></i>`).join('');
}
function reset() { setPreset('payment');history.replaceState(null,'','#workspace');navigate('workspace',true);$('scenario-form').querySelector('details').open=false;toast('دمو به حالت اولیه برگشت.'); }
function bindEvents() {
  window.addEventListener('hashchange',()=>navigate(location.hash.slice(1),true));
  $('scenario-form').addEventListener('submit',e=>{e.preventDefault();run();});
  $('scenario-form').addEventListener('input',()=>{selectedPreset=null;drawPresets();updateForm();});
  $('scenario-form').addEventListener('change',()=>{selectedPreset=null;drawPresets();updateForm();});
  $('presets').addEventListener('click',e=>{const b=e.target.closest('[data-preset]');if(b)setPreset(b.dataset.preset);});
  function selectNode(e){const n=e.target.closest('[data-node]');if(n){selectedNode=n.dataset.node;renderGraph();renderInspector();}}
  $('network').addEventListener('click',selectNode);
  $('network').addEventListener('keydown',e=>{if(e.key==='Enter'||e.key===' '){e.preventDefault();const id=e.target.closest('[data-node]')?.dataset.node;selectNode(e);if(id)$('network').querySelector(`[data-node="${id}"]`)?.focus();}});
  $('view-current').addEventListener('click',()=>{view='current';renderGraph();renderInspector();});
  $('view-future').addEventListener('click',()=>{if(result){view='future';renderGraph();renderInspector();}});
  $('day-buttons').addEventListener('click',e=>{const b=e.target.closest('[data-day]');if(b){day=Number(b.dataset.day);render();$('day-buttons').querySelector(`[data-day="${day}"]`)?.focus();}});
  $('compare').addEventListener('click',()=>{if(!result||isDirty()||result.request.canary)return;comparison=simulate(data,{...result.request,canary:true});renderComparison();toast('همان تغییر با روش انتشار تدریجی مقایسه شد.');});
  $('evidence-search').addEventListener('input',renderEvidence);$('source-filter').addEventListener('change',renderEvidence);
  document.addEventListener('click',e=>{
    const evidence=e.target.closest('[data-evidence]');if(evidence)openEvidence(evidence.dataset.evidence);
    const service=e.target.closest('[data-service]');if(service){selectedNode=service.dataset.service;location.hash='workspace';renderGraph();renderInspector();}
    const action=e.target.closest('[data-action]')?.dataset.action;
    if(action==='export')exportReport();
    if(action==='print'){renderReport();window.print();}
    if(action==='reset')reset();
    if(action==='tour'){tourStep=0;showTourStep();$('tour-dialog').showModal();}
  });
  $('close-detail').addEventListener('click',()=>$('detail-dialog').close());
  $('close-tour').addEventListener('click',()=>$('tour-dialog').close());
  $('tour-back').addEventListener('click',()=>{if(tourStep>0){tourStep--;showTourStep();}});
  $('tour-next').addEventListener('click',()=>{if(tourStep<tourSteps.length-1){tourStep++;showTourStep();}else $('tour-dialog').close();});
}
async function start() {
  try {
    const response=await fetch(new URL('./data/demo.json',import.meta.url));if(!response.ok)throw new Error('Data unavailable');data=await response.json();
    $('target').innerHTML=data.nodes.map(n=>`<option value="${n.id}">${esc(n.label)}</option>`).join('');
    bindEvents();renderOrganization();setPreset('payment');navigate(location.hash.slice(1));$('loading').hidden=true;
  } catch(error) { $('loading').hidden=true;$('load-error').hidden=false;console.error('Could not initialize TwinSight:',error); }
}
start();
