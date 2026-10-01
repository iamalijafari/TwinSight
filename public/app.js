import { analyze, applyUpdate, scenarioById, MODES } from "./engine.js";
const $ = (id) => document.getElementById(id);
const fa = (n) =>
  new Intl.NumberFormat("fa-IR", { maximumFractionDigits: 1 }).format(n);
const esc = (s) =>
  String(s).replace(
    /[&<>"']/g,
    (c) =>
      ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[
        c
      ],
  );
const iconPaths = {
  layers:
    '<path d="m12 3 9 5-9 5-9-5 9-5Z"/><path d="m3 12 9 5 9-5M3 16l9 5 9-5"/>',
  network:
    '<rect x="8" y="2" width="8" height="5" rx="1"/><rect x="2" y="17" width="7" height="5" rx="1"/><rect x="15" y="17" width="7" height="5" rx="1"/><path d="M12 7v5M5.5 17v-5h13v5"/>',
  file: '<path d="M14 2H5v20h14V7l-5-5Z"/><path d="M14 2v5h5M8 12h8M8 16h6"/>',
  compass: '<circle cx="12" cy="12" r="9"/><path d="m16 8-3 5-5 3 3-5 5-3Z"/>',
  play: '<path d="m8 4 12 8-12 8V4Z"/>',
  info: '<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7v.2"/>',
  spark:
    '<path d="m12 3 2.5 6.5L21 12l-6.5 2.5L12 21l-2.5-6.5L3 12l6.5-2.5L12 3Z"/>',
  shield:
    '<path d="m12 2 8 3v6c0 6-8 11-8 11S4 17 4 11V5l8-3Z"/><path d="m8 12 3 3 5-6"/>',
  bolt: '<path d="m13 2-9 12h7l-1 8 10-13h-7l1-7Z"/>',
  trend: '<path d="m3 17 6-6 4 4 8-10M15 5h6v6"/>',
  users:
    '<circle cx="9" cy="8" r="3"/><path d="M3 21v-3a6 6 0 0 1 12 0v3M16 5a3 3 0 0 1 0 6M17 15a5 5 0 0 1 4 5"/>',
  refresh:
    '<path d="M20 11a8 8 0 0 0-14-5L3 9M3 3v6h6M4 13a8 8 0 0 0 14 5l3-3M21 21v-6h-6"/>',
  search: '<circle cx="10" cy="10" r="6"/><path d="m15 15 6 6"/>',
  download: '<path d="M12 3v12m-5-5 5 5 5-5M4 16v5h16v-5"/>',
  check: '<path d="m5 12 4 4L19 6"/>',
  arrow: '<path d="M20 12H4m6-6-6 6 6 6"/>',
  alert: '<path d="m12 3 10 18H2L12 3Z"/><path d="M12 9v5M12 17v.2"/>',
  code: '<path d="m8 6-6 6 6 6M16 6l6 6-6 6m-3-15-2 18"/>',
};
const icon = (name) =>
  `<svg class="icon" viewBox="0 0 24 24" aria-hidden="true">${iconPaths[name] || iconPaths.file}</svg>`;
const sourceIcon = (id) =>
  ({ backlog: "layers", support: "users", code: "code", metrics: "trend" })[id];
const titles = {
  workspace: "بررسی تغییر",
  knowledge: "دانش سازمان",
  report: "گزارش تصمیم",
  about: "ایده و مسیر آینده",
};
const modeDescriptions = {
  full: "منفعت از ماه اول؛ مواجههٔ هم‌زمان همهٔ کاربران با تغییر.",
  pilot: "۲۰٪، ۶۰٪ و ۱۰۰٪ در سه ماه؛ فرصت یادگیری با هزینهٔ آزمون بیشتر.",
  wait: "فرصت تازه به دست نمی‌آید؛ مشکل فعلی هم برطرف نمی‌شود.",
};
let original,
  data,
  result,
  scenarioId = "guest",
  selectedNode = "checkout",
  decision = null,
  updateDelta = null,
  toastTimer,
  tourStep = 0;
const node = (id) => data.nodes.find((n) => n.id === id);
const nodeName = (id) => node(id)?.name || id;
const sourceName = (id) => data.sources.find((s) => s.id === id)?.name || id;
const range = (o) => `${fa(o.netLow)} تا ${fa(o.netHigh)}`;
const riskLabel = (score) =>
  score === null
    ? "بدون تغییر تازه"
    : score >= 60
      ? "نیازمند بررسی جدی"
      : score >= 35
        ? "نیازمند بررسی"
        : "مواجههٔ محدودتر";
const evidenceButton = (id) =>
  `<button class="evidence-link" data-evidence="${esc(id)}">${icon("file")}<span dir="ltr">${esc(id)}</span> · شاهد</button>`;
function pathMarkup(path) {
  return `<div class="path">${path.map((id) => `<span>${esc(nodeName(id))}</span>`).join("<i>←</i>")}</div>`;
}
function getRequest() {
  return {
    scenarioId,
    mode: $("launch-mode").value,
    effect: $("effect").value.trim() === "" ? NaN : Number($("effect").value),
    note: $("note").value.trim(),
  };
}
function dirty() {
  return (
    !!result && JSON.stringify(getRequest()) !== JSON.stringify(result.request)
  );
}
function notify(message) {
  $("toast").textContent = message;
  $("toast").hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => ($("toast").hidden = true), 3800);
}
function navigate(id, focus = false) {
  if (!Object.hasOwn(titles, id)) id = "workspace";
  document.querySelectorAll(".page").forEach((p) => (p.hidden = p.id !== id));
  document.querySelectorAll("[data-nav]").forEach((a) => {
    a.classList.toggle("active", a.dataset.nav === id);
    if (a.dataset.nav === id) a.setAttribute("aria-current", "page");
    else a.removeAttribute("aria-current");
  });
  $("page-title").textContent = titles[id];
  if (id === "report") renderReport();
  if (focus) {
    $("main").focus({ preventScroll: true });
    window.scrollTo({ top: 0, behavior: "instant" });
  }
}
function selectScenario(id, announce = true) {
  const s = scenarioById(data, id);
  scenarioId = id;
  selectedNode = s.target;
  decision = null;
  updateDelta = null;
  $("scenario-type").textContent = s.type;
  $("scenario-title").textContent = s.title;
  $("scenario-description").textContent = s.description;
  $("effect-label").textContent = s.effectLabel;
  $("effect-unit").textContent = s.effectUnit;
  $("effect").max = s.maxEffect;
  $("effect").value = s.defaultEffect;
  $("launch-mode").value = "full";
  $("note").value = "";
  $("decision").value = "";
  $("form-error").hidden = true;
  run(false);
  if (announce) notify(`سناریوی «${s.title}» آماده شد.`);
}
function drawScenarios() {
  $("scenarios").innerHTML = data.scenarios
    .map(
      (s) =>
        `<button class="scenario-card ${s.id === scenarioId ? "active" : ""}" data-scenario="${s.id}" aria-pressed="${s.id === scenarioId}"><span class="icon-box">${icon(s.icon)}</span><span><span class="type">${s.type}</span><strong>${s.title}</strong><small>${s.short}</small></span>${s.id === scenarioId ? `<span class="selected-mark">${icon("check")}</span>` : ""}</button>`,
    )
    .join("");
}
function run(announce = true) {
  try {
    result = analyze(data, getRequest());
    decision = null;
    updateDelta = null;
    $("decision").value = "";
    $("form-error").hidden = true;
    renderAll();
    if (announce) notify("پیامدها با فرض‌های فعلی بررسی شدند.");
  } catch (e) {
    $("form-error").textContent = e.message;
    $("form-error").hidden = false;
  }
}
function renderDraft() {
  const pending = dirty();
  $("draft-state").textContent = pending
    ? "تنظیمات تغییر کرده‌اند؛ برای نتیجهٔ تازه دوباره بررسی کنید."
    : `نتیجهٔ ثبت‌شده · نسخهٔ ${fa(result.revision)} دانش سازمان`;
  $("draft-state").style.color = pending ? "#a56616" : "";
  renderSummary();
  document
    .querySelectorAll("[data-choose-mode]")
    .forEach(
      (b) =>
        (b.disabled = pending || b.dataset.chooseMode === result.request.mode),
    );
}
function renderSummary() {
  const s = result.scenario,
    o = result.selected;
  let headline =
    o.id === "wait"
      ? "تغییر را عقب می‌اندازیم؛ مسئلهٔ امروز باقی می‌ماند."
      : o.netHigh < 0
        ? "با این فرض‌ها، هزینه از منفعت سه‌ماهه بیشتر است."
        : o.netLow < 0
          ? "این تغییر به آزمون فرض منفعت نیاز دارد."
          : o.id === "pilot"
            ? "شروع محدود، فرصت یادگیری پیش از گسترش می‌دهد."
            : "فرصت ایجاد ارزش داریم؛ وابستگی‌ها را پیش از اجرا بررسی کنیم.";
  $("decision-summary").innerHTML =
    `<div class="summary-topline"><span>${icon("compass")} خلاصهٔ تصمیم</span><span class="pill ${dirty() ? "dirty-badge" : ""}">${dirty() ? "نتیجهٔ اجرای قبلی" : `نسخهٔ ${fa(result.revision)} · دادهٔ فرضی`}</span></div><p class="summary-eyebrow">${esc(s.title)} / ${MODES[o.id].name}</p><h2>${headline}</h2><p class="summary-copy">${o.id === "wait" ? "در این گزینه توسعه و منفعت تازه‌ای در سه ماه نداریم. مسئله‌های موجود و هزینهٔ فرصت در عدد خالص محاسبه نشده‌اند." : `بازهٔ منفعت خالص سه‌ماهه، با فرض فعلی: ${range(o)} میلیون تومان. این عدد پس از هزینهٔ ساخت و اجراست؛ زیان اختلال و اشتراک TwinSight در آن نیست.`}</p><div class="summary-customer">${icon("users")}<span>${esc(s.customer)}</span></div><div class="summary-bottom"><p>${result.updateRelevant ? "تیکت تازهٔ درگاه به تحلیل اضافه شده است." : `تحلیل بر پایهٔ ${fa(result.evidence.length)} شاهد نمونه و فرض‌های قابل مشاهده است.`}</p><a href="#report">گزارش تصمیم ${icon("arrow")}</a></div>`;
}
function renderImpacts() {
  const o = result.selected;
  $("impact-cards").innerHTML =
    `<article class="impact-card opportunity"><div class="impact-top"><span>منفعت خالص سه‌ماهه</span>${icon("trend")}</div><div class="impact-number">${range(o)}<small> میلیون تومان</small></div><p>بازهٔ فرضی پس از هزینهٔ ساخت و اجرا</p></article><article class="impact-card risk"><div class="impact-top"><span>شاخص مواجهه با ریسک</span>${icon("shield")}</div><div class="impact-number">${o.risk === null ? "—" : fa(o.risk)}<small>${o.risk === null ? " تغییر تازه‌ای اجرا نمی‌شود" : " از ۱۰۰"}</small></div><p>${riskLabel(o.risk)} · احتمال خرابی نیست</p></article><article class="impact-card"><div class="impact-top"><span>بخش‌های مرتبط با تغییر</span>${icon("network")}</div><div class="impact-number">${fa(result.affected.length)}<small> از ${fa(data.nodes.length)} بخش</small></div><p>وابستگی‌ها و مسیرهای نیازمند بررسی</p></article>`;
}
function graphEdge(e) {
  const a = node(e.from),
    b = node(e.to),
    active =
      result.affected.some((n) => n.id === a.id) &&
      result.affected.some((n) => n.id === b.id);
  const sameRow = a.y === b.y;
  const down = b.y > a.y;
  const fromX = sameRow ? a.x - 75 : a.x,
    fromY = sameRow ? a.y + 33 : down ? a.y + 67 : a.y,
    toX = sameRow ? b.x + 75 : b.x,
    toY = sameRow ? b.y + 33 : down ? b.y - 2 : b.y + 69;
  const d = sameRow
    ? `M${fromX} ${fromY} H${toX}`
    : a.x === b.x
      ? `M${fromX} ${fromY} V${toY}`
      : `M${fromX} ${fromY} C${fromX} ${(fromY + toY) / 2},${toX} ${(fromY + toY) / 2},${toX} ${toY}`;
  return `<path class="graph-edge ${active ? "active" : ""}" d="${d}" marker-end="url(#arrow-${active ? "active" : "normal"})"/>`;
}
function renderGraph() {
  $("model-version").textContent = `نسخهٔ ${fa(data.revision)}`;
  $("network").innerHTML =
    `<defs><marker id="arrow-normal" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#d4dce8"/></marker><marker id="arrow-active" viewBox="0 0 10 10" refX="8" refY="5" markerWidth="5" markerHeight="5" orient="auto-start-reverse"><path d="M0 0 10 5 0 10" fill="#96aaec"/></marker></defs>${data.edges.map(graphEdge).join("")}${data.nodes
      .map((n) => {
        const target = n.id === result.scenario.target,
          affected = result.affected.some((a) => a.id === n.id);
        return `<g class="graph-node ${target ? "target" : affected ? "affected" : ""} ${selectedNode === n.id ? "selected" : ""}" data-node="${n.id}" tabindex="0" role="button" aria-label="${n.name}؛ ${target ? "محل تغییر" : affected ? "مرتبط با تغییر" : "خارج از دامنه"}" aria-pressed="${selectedNode === n.id}"><rect x="${n.x - 75}" y="${n.y}" width="150" height="67" rx="10"/><text x="${n.x}" y="${n.y + 29}">${n.name}</text><text class="node-en" x="${n.x}" y="${n.y + 49}">${n.en}</text></g>`;
      })
      .join("")}`;
  renderInspector();
}
function renderInspector() {
  const n = node(selectedNode),
    a = result.affected.find((a) => a.id === n.id);
  $("inspector").innerHTML =
    `<div class="inspector-top"><strong>${esc(n.name)}</strong><span class="pill">${esc(n.owner)}</span></div><p>${esc(n.description)} · ${a ? "مرتبط با سناریوی جاری" : "در این سناریوی آماده، خارج از دامنهٔ تغییر است."}</p>${a ? pathMarkup(a.path) : ""}`;
}
function renderOpportunity() {
  const s = result.scenario,
    o = result.selected;
  $("opportunity").innerHTML =
    `<span class="pill green">فرصت مبتنی بر فرض</span><p class="opportunity-copy">${esc(s.opportunity)}</p>${evidenceButton(s.opportunityEvidence)}<div class="money-breakdown"><div class="money-row"><span>منفعت ناخالص سه‌ماهه</span><strong>${fa(o.benefit)} میلیون</strong></div><div class="money-row"><span>ساخت و اجرای سه‌ماهه</span><strong>${fa(o.cost)} میلیون</strong></div><div class="money-row"><span>${s.effectLabel}</span><strong>${fa(result.request.effect)} ${s.effectUnit}</strong></div></div><p class="basis">مبنای منفعت: ${esc(s.basis)}.</p><p class="hint">منفعت ناخالص، برآورد مرکزی سناریو است. بازهٔ خالص با ۶۰٪ تا ۱۲۰٪ همین منفعت، پس از هزینه محاسبه می‌شود.</p>`;
}
function renderOptions() {
  $("options").innerHTML = result.options
    .map(
      (o) =>
        `<article class="option-card ${o.id === result.request.mode ? "chosen" : ""}"><div class="option-heading"><h3>${o.name}</h3>${o.id === result.request.mode ? '<span class="pill blue">گزینهٔ جاری</span>' : ""}</div><div class="option-number">${range(o)}</div><div class="option-unit">میلیون تومان · منفعت خالص سه‌ماهه</div><div class="option-details"><div><small>شاخص ریسک تغییر</small><strong>${o.risk === null ? "—" : `${fa(o.risk)} / ۱۰۰`}</strong></div><div><small>هزینهٔ سه‌ماهه</small><strong>${fa(o.cost)} میلیون</strong></div></div><p>${modeDescriptions[o.id]}</p><button class="button ${o.id === result.request.mode ? "primary" : ""}" data-choose-mode="${o.id}">${o.id === result.request.mode ? "بررسی‌شده با این روش" : "بررسی با این روش"}</button></article>`,
    )
    .join("");
}
function renderRisks() {
  const s = result.scenario;
  $("risks").innerHTML =
    s.risks
      .map(
        (r) =>
          `<div class="risk-item"><h3>${esc(r.title)}</h3><p>${esc(r.text)}</p>${evidenceButton(r.evidenceId)}</div>`,
      )
      .join("") +
    (result.updateRelevant
      ? `<div class="risk-item"><h3>تأخیر درگاه و تلاش مجدد مشتری</h3><p>تیکت تازه، نیاز به آزمون تلاش مجدد و تطبیق سفارش را برجسته می‌کند. افزایش شاخص و هزینه، فرض تعریف‌شدهٔ این دمو است.</p>${evidenceButton(data.update.id)}</div>`
      : "");
  $("questions").innerHTML =
    s.questions
      .map(
        (q, i) =>
          `<div class="question-item"><span class="question-number">۰${i + 1}</span><p>${esc(q)}</p></div>`,
      )
      .join("") +
    `<div class="test-note"><strong>کوچک‌ترین آزمون بعدی</strong>${esc(s.test)}</div><div class="test-note"><strong>معیار توقف پیشنهادی</strong>${esc(s.stop)}</div>`;
}
function renderDecision() {
  $("decision-status").textContent = decision
    ? `تصمیم ثبت‌شده: ${decision.label} · نسخهٔ ${fa(decision.revision)}. این ثبت فقط در همین صفحه نگه داشته می‌شود.`
    : "تصمیمی ثبت نشده است. با هر بررسی تازه، تصمیم قبلی نیاز به بازبینی دارد.";
}
function renderUpdate() {
  const banner = $("update-banner");
  banner.hidden = !updateDelta;
  if (updateDelta)
    banner.innerHTML = `${icon("refresh")}<p>تیکت تازه وارد شد؛ ${updateDelta.changed ? `شاخص ریسک از ${fa(updateDelta.before)} به ${fa(updateDelta.after)} رسید و هزینهٔ آزمون اضافه شد.` : "در این سناریو یا روش اجرا، عددها تغییر نکردند."} دانش سازمان به نسخهٔ ${fa(data.revision)} رسید.</p><a href="#knowledge">دیدن شاهد تازه ←</a>`;
}
function renderAll() {
  drawScenarios();
  renderSummary();
  renderImpacts();
  renderGraph();
  renderOpportunity();
  renderOptions();
  renderRisks();
  renderDecision();
  renderUpdate();
  renderDraft();
}
function renderKnowledge() {
  $("knowledge-revision").textContent = fa(data.revision);
  $("source-cards").innerHTML = data.sources
    .map(
      (s) =>
        `<article class="panel source-card"><span class="icon-box">${icon(sourceIcon(s.id))}</span><span class="en-source" dir="ltr">${s.en}</span><h3>${s.name}</h3><p>${s.description}</p><div class="source-count"><strong>${fa(s.count)}</strong><small>رکورد فرضی</small></div></article>`,
    )
    .join("");
  const filter = $("source-filter").value;
  $("source-filter").innerHTML =
    '<option value="all">همهٔ منابع</option>' +
    data.sources
      .map((s) => `<option value="${s.id}">${s.name}</option>`)
      .join("");
  $("source-filter").value = filter || "all";
  $("add-ticket").disabled = data.revision > 1;
  $("add-ticket").innerHTML =
    `${icon(data.revision > 1 ? "check" : "refresh")}${data.revision > 1 ? "تیکت نمونه وارد شد" : "ورود تیکت نمونه"}`;
  renderEvidence();
}
function renderEvidence() {
  const q = $("evidence-search").value.trim().toLocaleLowerCase(),
    filter = $("source-filter").value;
  const items = data.evidence.filter(
    (e) =>
      (filter === "all" || e.source === filter) &&
      `${e.id} ${e.title} ${e.text}`.toLocaleLowerCase().includes(q),
  );
  $("evidence-count").textContent = `${fa(items.length)} شاهد`;
  $("evidence-list").innerHTML = items.length
    ? items
        .map(
          (e) =>
            `<div class="evidence-row"><span class="evidence-id" dir="ltr">${e.id}</span><div><strong>${esc(e.title)}</strong><p>${esc(e.text)}</p><small>${sourceName(e.source)} · ${esc(nodeName(e.node))}</small></div><button class="button" data-evidence="${e.id}">جزئیات ←</button></div>`,
        )
        .join("")
    : '<p class="hint">شاهدی پیدا نشد؛ عبارت یا منبع جست‌وجو را تغییر دهید.</p>';
}
function openEvidence(id) {
  const e = data.evidence.find((e) => e.id === id);
  if (!e) return;
  $("evidence-detail").innerHTML =
    `<h2>${esc(e.title)}</h2><p>${esc(e.text)}</p><div class="detail-source"><span dir="ltr">${e.id}</span> · ${sourceName(e.source)} · ${esc(nodeName(e.node))}</div><p class="hint">این شاهد ساختگی است. در محصول واقعی، این قسمت به رکورد اصلی، زمان دریافت و مجوز دسترسی متصل خواهد شد.</p>`;
  $("evidence-dialog").showModal();
}
function addTicket(announce = true) {
  if (data.revision > 1) return;
  // Recalculate the last registered request, preserving any unsubmitted draft in the form.
  const before = result.selected.risk;
  data = applyUpdate(data);
  result = analyze(data, result.request);
  decision = null;
  $("decision").value = "";
  updateDelta = {
    before,
    after: result.selected.risk,
    changed: before !== result.selected.risk,
  };
  renderKnowledge();
  renderAll();
  $("knowledge-update-status").hidden = false;
  $("knowledge-update-status").innerHTML =
    `${icon("check")}<p>شاهد <b dir="ltr">${data.update.id}</b> اضافه شد. تحلیل ثبت‌شده با نسخهٔ ${fa(data.revision)} دوباره محاسبه شد؛ تنظیمات ارسال‌نشده همچنان پیش‌نویس‌اند.</p><a href="#workspace">دیدن پیامد تازه ←</a>`;
  if (announce) notify("تیکت نمونه وارد شد و تحلیل ثبت‌شده به‌روز شد.");
}
function saveDecision() {
  if (dirty()) {
    notify("ابتدا تغییرهای فرم را بررسی کنید، سپس تصمیم را ثبت کنید.");
    return;
  }
  if (!$("decision").value) {
    notify("یک تصمیم اولیه انتخاب کنید.");
    return;
  }
  decision = {
    value: $("decision").value,
    label: $("decision").selectedOptions[0].textContent,
    revision: result.revision,
    createdAt: new Date().toISOString(),
  };
  renderDecision();
  notify("تصمیم اولیهٔ تیم ثبت شد.");
}
function renderReport() {
  const s = result.scenario,
    o = result.selected;
  $("report-content").innerHTML =
    `<article class="panel report-card"><div class="panel-heading"><h2>${esc(s.title)}</h2><span class="pill blue">دادهٔ فرضی · محاسبهٔ سناریو</span></div><p class="report-note">${esc(s.description)}</p><div class="report-meta"><span class="pill">سپهر تجارت · سازمان نمونه</span><span class="pill">نسخهٔ ${fa(result.revision)} دانش سازمان</span><span class="pill">${o.name}</span><span class="pill">افق سه‌ماهه</span></div>${dirty() ? '<p class="report-note">تنظیمات فرم تغییر کرده‌اند؛ این گزارش مربوط به آخرین بررسی ثبت‌شده است.</p>' : ""}<div class="report-kpis"><div><strong>${range(o)}</strong><small>میلیون تومان · منفعت خالص فرضی</small></div><div><strong>${o.risk === null ? "—" : fa(o.risk)}</strong><small>شاخص ریسک / ۱۰۰؛ احتمال نیست</small></div><div><strong>${fa(o.cost)}</strong><small>میلیون تومان · هزینهٔ ساخت و اجرا</small></div></div><p class="report-note"><b>منفعت:</b> ${esc(s.opportunity)}</p><p class="report-note"><b>تجربهٔ مشتری:</b> ${esc(s.customer)}</p><p class="report-note"><b>تصمیم تیم:</b> ${decision ? esc(decision.label) : "هنوز ثبت نشده است."}</p>${result.request.note ? `<p class="report-note"><b>یادداشت:</b> ${esc(result.request.note)}</p>` : ""}</article><article class="panel report-card"><h2>مقایسهٔ روش اجرا</h2><div class="report-table-scroll"><table class="report-table"><caption>واحد پول: میلیون تومان؛ همهٔ اعداد فرضی‌اند.</caption><thead><tr><th>روش اجرا</th><th>منفعت ناخالص</th><th>هزینه</th><th>بازهٔ خالص</th><th>شاخص ریسک</th></tr></thead><tbody>${result.options.map((x) => `<tr><td>${x.name}</td><td>${fa(x.benefit)}</td><td>${fa(x.cost)}</td><td>${range(x)}</td><td>${x.risk === null ? "—" : fa(x.risk)}</td></tr>`).join("")}</tbody></table></div></article><article class="panel report-card"><h2>ریسک‌ها، آزمون و اطلاعات موردنیاز</h2><ul class="report-list">${s.risks.map((r) => `<li><b>${esc(r.title)}:</b> ${esc(r.text)} (${r.evidenceId})</li>`).join("")}${result.updateRelevant ? `<li>تیکت تازهٔ تأخیر درگاه، آزمون تلاش مجدد را ضروری‌تر می‌کند (${data.update.id}).</li>` : ""}${s.questions.map((q) => `<li>${esc(q)}</li>`).join("")}</ul><p class="report-note"><b>آزمون بعدی:</b> ${esc(s.test)}</p><p class="report-note"><b>معیار توقف:</b> ${esc(s.stop)}</p></article><article class="panel report-card"><h2>شواهد و فرض‌های محاسبه</h2><ul class="report-list">${result.evidence.map((e) => `<li><b dir="ltr">${e.id}</b> — ${esc(e.title)}: ${esc(e.text)}</li>`).join("")}</ul><p class="report-note">${esc(s.basis)}؛ فرض اثر ${fa(result.request.effect)} ${s.effectUnit}. خط پایه: ${fa(s.units)} ${s.unitLabel} و ${fa(s.unitValue)} تومان برای هر واحد.</p><p class="report-note">هزینهٔ ساخت ${fa(s.buildCost)}، اجرای ماهانه ${fa(s.monthlyOps)} و آزمون پایلوت ${fa(s.pilotCost)} میلیون تومان. هزینهٔ تیکت تازه: ${fa(result.assumptions.extraCost)} میلیون تومان. پایلوت در سه ماه، به‌ترتیب ۲۰٪، ۶۰٪ و ۱۰۰٪ دامنه را پوشش می‌دهد.</p><p class="report-note">بازهٔ خالص = ۶۰٪ تا ۱۲۰٪ منفعت مرکزی، منهای هزینه. شاخص ریسک از ضریب ثابت سناریو و روش انتشار محاسبه می‌شود؛ این ضریب هنوز با رخداد واقعی سنجیده نشده است.</p><p class="report-note"><b>حدود نمونه:</b> ${esc(result.assumptions.notice)} هیچ AI یا اتصال زنده‌ای اجرا نمی‌شود. تصمیم نهایی با انسان است.</p></article>`;
}
function exportReport() {
  const payload = {
    product: "TwinSight",
    team: "BridgeX",
    organization: data.organization,
    notice:
      "تمام داده‌ها فرضی‌اند. تحلیل با قواعد سناریوی آماده انجام می‌شود؛ پیش‌بینی AI نیست.",
    analysis: result,
    humanDecision: decision,
  };
  const url = URL.createObjectURL(
    new Blob([JSON.stringify(payload, null, 2)], {
      type: "application/json;charset=utf-8",
    }),
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `TwinSight-${result.request.scenarioId}-report.json`;
  a.click();
  setTimeout(() => URL.revokeObjectURL(url), 1000);
  notify("گزارش آخرین بررسی دریافت شد.");
}
function reset(announce = true) {
  data = structuredClone(original);
  decision = null;
  updateDelta = null;
  $("evidence-search").value = "";
  $("source-filter").value = "all";
  $("knowledge-update-status").hidden = true;
  document.querySelector(".assumption-editor").open = false;
  renderKnowledge();
  selectScenario("guest", false);
  location.hash = "workspace";
  navigate("workspace", true);
  if (announce) notify("داده‌ها و تصمیم‌ها به ابتدای دمو برگشتند.");
}
const tour = [
  {
    page: "workspace",
    title: "یک تغییر، یک تصمیم کسب‌وکار",
    copy: "فرض کنید می‌خواهیم خرید بدون ثبت‌نام را اضافه کنیم. TwinSight فرصت فروش بیشتر را کنار ریسک سفارش و پرداخت نشان می‌دهد. این نمونه با دادهٔ فرضی کار می‌کند.",
  },
  {
    page: "workspace",
    title: "سود و ریسک را کنار هم ببینید",
    copy: "منفعت از حجم خرید و فرض افزایش نرخ تکمیل خرید محاسبه می‌شود. هزینهٔ ساخت و اجرا جداست. نقشه نشان می‌دهد تغییر به کدام بخش‌ها وابسته است؛ عدد ریسک، احتمال خرابی نیست.",
  },
  {
    page: "workspace",
    title: "روش اجرا، نتیجه را عوض می‌کند",
    copy: "شروع محدود را با انتشار کامل مقایسه کنید. پایلوت مواجههٔ کمتری دارد، اما منفعتش دیرتر حاصل می‌شود و آزمون بیشتری می‌خواهد. هیچ گزینه‌ای بدون Trade-off نیست.",
  },
  {
    page: "knowledge",
    title: "دانش تازه، تحلیل تازه",
    copy: "یک تیکت نمونه دربارهٔ تأخیر درگاه اضافه شده است. دانش سازمان و تحلیل سناریوی خرید به‌روز می‌شوند. در محصول آینده، AI این کار را با دریافت مجاز تغییرهای بک‌لاگ و تیکت انجام خواهد داد.",
  },
  {
    page: "report",
    title: "تصمیم و مسئولیت با انسان است",
    copy: "گزارش، گزینه‌ها، شواهد و فرض‌ها را جمع می‌کند. تیم می‌تواند تحلیل را بررسی و تصمیم اولیه را ثبت کند. این دمو هیچ تغییری در سازمان واقعی اجرا نمی‌کند.",
  },
];
function showTourStep() {
  const t = tour[tourStep];
  if (tourStep === 2) {
    $("launch-mode").value = "pilot";
    run(false);
  }
  if (tourStep === 3) addTicket(false);
  location.hash = t.page;
  navigate(t.page, true);
  $("tour-counter").textContent =
    `نمایش ایده · ${fa(tourStep + 1)} از ${fa(tour.length)}`;
  $("tour-title").textContent = t.title;
  $("tour-copy").textContent = t.copy;
  $("tour-back").disabled = tourStep === 0;
  $("tour-next").textContent =
    tourStep === tour.length - 1 ? "پایان راهنما" : "بعدی ←";
  $("tour-dots").innerHTML = tour
    .map((_, i) => `<i class="${i === tourStep ? "active" : ""}"></i>`)
    .join("");
}
function startTour() {
  reset(false);
  tourStep = 0;
  showTourStep();
  $("tour-dialog").showModal();
}
function bind() {
  window.addEventListener("hashchange", () =>
    navigate(location.hash.slice(1), true),
  );
  $("scenario-form").addEventListener("submit", (e) => {
    e.preventDefault();
    run();
  });
  $("scenario-form").addEventListener("input", renderDraft);
  $("scenario-form").addEventListener("change", renderDraft);
  $("evidence-search").addEventListener("input", renderEvidence);
  $("source-filter").addEventListener("change", renderEvidence);
  $("add-ticket").addEventListener("click", () => addTicket());
  $("save-decision").addEventListener("click", saveDecision);
  document.addEventListener("click", (e) => {
    const scenario = e.target.closest("[data-scenario]");
    if (scenario) {
      selectScenario(scenario.dataset.scenario);
      $("scenarios")
        .querySelector(`[data-scenario="${scenarioId}"]`)
        .focus({ preventScroll: true });
    }
    const evidence = e.target.closest("[data-evidence]");
    if (evidence) openEvidence(evidence.dataset.evidence);
    const graph = e.target.closest("[data-node]");
    if (graph) {
      selectedNode = graph.dataset.node;
      renderGraph();
      $("network")
        .querySelector(`[data-node="${selectedNode}"]`)
        .focus({ preventScroll: true });
    }
    const mode = e.target.closest("[data-choose-mode]");
    if (mode && !dirty()) {
      $("launch-mode").value = mode.dataset.chooseMode;
      run();
    }
    const close = e.target.closest("[data-close]");
    if (close) $(close.dataset.close).close();
    const action = e.target.closest("[data-action]")?.dataset.action;
    if (action === "export") exportReport();
    if (action === "print") {
      location.hash = "report";
      navigate("report");
      window.print();
    }
    if (action === "reset") reset();
    if (action === "tour") startTour();
    if (action === "reload") location.reload();
  });
  $("network").addEventListener("keydown", (e) => {
    if (e.key === "Enter" || e.key === " ") {
      const target = e.target.closest("[data-node]");
      if (target) {
        e.preventDefault();
        selectedNode = target.dataset.node;
        renderGraph();
        $("network")
          .querySelector(`[data-node="${selectedNode}"]`)
          .focus({ preventScroll: true });
      }
    }
  });
  $("tour-back").addEventListener("click", () => {
    if (tourStep > 0) {
      tourStep--;
      showTourStep();
    }
  });
  $("tour-next").addEventListener("click", () => {
    if (tourStep < tour.length - 1) {
      tourStep++;
      showTourStep();
    } else $("tour-dialog").close();
  });
}
async function start() {
  try {
    const response = await fetch(new URL("data/demo.json", import.meta.url));
    if (!response.ok) throw new Error("Data unavailable");
    original = await response.json();
    data = structuredClone(original);
    document
      .querySelectorAll("[data-icon]")
      .forEach((el) => (el.innerHTML = icon(el.dataset.icon)));
    bind();
    renderKnowledge();
    selectScenario("guest", false);
    navigate(location.hash.slice(1));
    $("loading").hidden = true;
    $("demo-notice").hidden = false;
  } catch (error) {
    console.error("Could not initialize TwinSight", error);
    $("loading").hidden = true;
    $("load-error").hidden = false;
  }
}
start();
