// Fictional scenario calculator. No AI inference or learned probabilities.
export const MODES = {
  full: { name: "انتشار کامل", exposure: 1, months: [1, 1, 1] },
  pilot: { name: "شروع محدود و گسترش", exposure: 0.55, months: [0.2, 0.6, 1] },
  wait: { name: "تعویق سه‌ماهه", exposure: 0, months: [0, 0, 0] },
};
const round = (n) => Math.round(n * 10) / 10;
export function scenarioById(data, id) {
  const s = data.scenarios.find((s) => s.id === id);
  if (!s) throw new Error("سناریوی نمونه معتبر نیست.");
  return s;
}
export function applyUpdate(data) {
  const next = structuredClone(data);
  if (next.evidence.some((e) => e.id === next.update.id)) return next;
  const { riskAddition, extraCost, ...evidence } = next.update;
  next.evidence.push(evidence);
  next.revision += 1;
  next.sources.find((s) => s.id === evidence.source).count += 1;
  return next;
}
export function analyze(data, request) {
  const s = scenarioById(data, request.scenarioId);
  if (!Object.hasOwn(MODES, request.mode))
    throw new Error("روش اجرا را انتخاب کنید.");
  if (
    !Number.isFinite(request.effect) ||
    request.effect < 0 ||
    request.effect > s.maxEffect
  )
    throw new Error("فرض منفعت در محدودهٔ مجاز نیست.");
  if (typeof request.note !== "string" || request.note.length > 600)
    throw new Error("یادداشت باید حداکثر ۶۰۰ نویسه باشد.");
  const updated = data.evidence.some((e) => e.id === data.update.id);
  const updateRelevant = updated && data.update.scenarioIds.includes(s.id);
  const extraRisk = updateRelevant ? data.update.riskAddition : 0;
  const extraCost = updateRelevant ? data.update.extraCost : 0;
  // Monetary amounts: million tomans. Guest/search: absolute percentage-point uplift.
  // Duplicate: relative reduction in incidents. Benefits exclude speculative avoided outages.
  const monthlyBenefit =
    (((s.units * request.effect) / 100) * s.unitValue) / 1e6;
  const options = Object.entries(MODES).map(([id, m]) => {
    const active = id !== "wait";
    const benefit = round(monthlyBenefit * m.months.reduce((a, b) => a + b, 0));
    const cost = active
      ? s.buildCost +
        3 * s.monthlyOps +
        extraCost +
        (id === "pilot" ? s.pilotCost : 0)
      : 0;
    return {
      id,
      name: m.name,
      risk: active
        ? Math.min(95, Math.round((s.baseRisk + extraRisk) * m.exposure))
        : null,
      benefit,
      cost,
      netLow: round(benefit * 0.6 - cost),
      netHigh: round(benefit * 1.2 - cost),
      monthly: m.months.map((f, i) => ({
        month: i + 1,
        benefit: round(monthlyBenefit * f),
      })),
    };
  });
  const selected = options.find((o) => o.id === request.mode);
  const paths = { [s.target]: [s.target] };
  for (let i = 0; i < data.nodes.length; i++)
    for (const e of data.edges) {
      if (paths[e.from] && s.affected.includes(e.to) && !paths[e.to])
        paths[e.to] = [...paths[e.from], e.to];
    }
  // Guest identity is an upstream dependency, not a downstream effect.
  if (s.id === "guest") paths.identity = ["identity", "checkout"];
  const affected = s.affected.map((id) => ({ id, path: paths[id] || [id] }));
  const ids = [...s.evidenceIds, ...(updateRelevant ? [data.update.id] : [])];
  return {
    request: { ...request, note: request.note.trim() },
    scenario: structuredClone(s),
    revision: data.revision,
    createdAt: new Date().toISOString(),
    mode: "fictional-scenario-calculator",
    selected,
    options,
    affected,
    updateRelevant,
    monthlyBenefit: round(monthlyBenefit),
    evidence: structuredClone(data.evidence.filter((e) => ids.includes(e.id))),
    assumptions: {
      horizonMonths: 3,
      units: s.units,
      unitValue: s.unitValue,
      effect: request.effect,
      benefitRangeMultipliers: [0.6, 1.2],
      rolloutByMonth: structuredClone(MODES[request.mode].months),
      buildCost: s.buildCost,
      monthlyOps: s.monthlyOps,
      pilotCost: s.pilotCost,
      extraCost,
      riskFormula:
        "(scenario base index + relevant ticket increment) × launch exposure",
      notice:
        "اعداد و بازه‌ها فرض سناریو هستند؛ احتمال آماری، سود قطعی و خروجی AI نیستند. زیان ناشی از اختلال و هزینهٔ اشتراک TwinSight در محاسبه نیست.",
    },
  };
}
