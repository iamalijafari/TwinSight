// Deterministic presentation model. These constants are demo assumptions, not trained predictions.
const kindWeights = {feature: .78, migration: 1, performance: .55, security: .88};
const round = n => Math.round((n + Number.EPSILON) * 10) / 10;
export function simulate(data, request) {
  if (!request.description || request.description.trim().length < 12 || request.description.length > 1000) throw new Error('شرح تغییر باید بین ۱۲ تا ۱۰۰۰ نویسه باشد.');
  if (!data.nodes.some(n => n.id === request.target) || !Object.hasOwn(kindWeights, request.kind)) throw new Error('سرویس و نوع تغییر را انتخاب کنید.');
  if (!Number.isInteger(request.rollout) || request.rollout < 1 || request.rollout > 100 || !Number.isInteger(request.testCoverage) || request.testCoverage < 0 || request.testCoverage > 100 || typeof request.canary !== 'boolean') throw new Error('تنظیمات انتشار معتبر نیست.');
  const scores = Object.fromEntries(data.nodes.map(n => [n.id, 0]));
  const paths = Object.fromEntries(data.nodes.map(n => [n.id, []]));
  const base = 82 * kindWeights[request.kind] * (.25 + .75 * request.rollout / 100) * (1 - .006 * request.testCoverage) * (request.canary ? .62 : 1);
  scores[request.target] = base * data.nodes.find(n => n.id === request.target).criticality;
  paths[request.target] = [request.target];
  // Strongest weighted path propagates a change through the fixed organizational graph.
  for (let i = 0; i < data.nodes.length; i++) {
    let changed = false;
    for (const edge of data.edges) {
      const next = scores[edge.from] * edge.weight;
      if (next > scores[edge.to] + 1e-9) {
        scores[edge.to] = next; paths[edge.to] = [...paths[edge.from], edge.to]; changed = true;
      }
    }
    if (!changed) break;
  }
  const nodes = data.nodes.map(n => ({id: n.id, risk: round(scores[n.id]), latencyDelta: round(scores[n.id] * 2.4), path: paths[n.id]}));
  const customers = data.customers.map(c => {
    const index = Math.min(95, Math.max(...c.services.map(id => scores[id])) * c.sensitivity);
    return {id: c.id, name: c.name, users: c.users, challengeIndex: round(index), exposedUsers: Math.round(c.users * request.rollout / 100 * index / 100)};
  });
  const overallRisk = round(Math.max(...nodes.map(n => n.risk)));
  const factors = [0, .45, .85, 1, .72, .38];
  const timeline = [0, 1, 3, 7, 14, 30].map((day, i) => ({day, factor: factors[i], risk: round(overallRisk * factors[i]), latencyDelta: round(Math.max(...nodes.map(n => n.latencyDelta)) * factors[i]), exposedUsers: Math.round(customers.reduce((sum, c) => sum + c.exposedUsers, 0) * factors[i])}));
  return {snapshotId: data.snapshot.id, request: {...request, description: request.description.trim()}, overallRisk, nodes, customers, timeline, evidenceIds: data.evidence.filter(e => scores[e.node] > 1).map(e => e.id), mode: 'fixed-rule-demo', createdAt: new Date().toISOString()};
}
export function atDay(result, day) { return result.timeline.find(t => t.day === day) || result.timeline.find(t => t.day === 7); }
