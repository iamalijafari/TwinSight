import test from "node:test";
import assert from "node:assert/strict";
import { readFile } from "node:fs/promises";
import { analyze, applyUpdate } from "../public/engine.js";
const data = JSON.parse(
  await readFile(new URL("../public/data/demo.json", import.meta.url), "utf8"),
);
const request = (scenarioId = "guest", mode = "full", effect = 2) => ({
  scenarioId,
  mode,
  effect,
  note: "",
});
test("financial comparison accounts for rollout, build, operations and pilot costs", () => {
  const r = analyze(data, request());
  assert.equal(r.monthlyBenefit, 80);
  assert.deepEqual(
    [
      r.selected.benefit,
      r.selected.cost,
      r.selected.netLow,
      r.selected.netHigh,
    ],
    [240, 102, 42, 186],
  );
  const pilot = r.options.find((o) => o.id === "pilot");
  assert.deepEqual(
    [pilot.benefit, pilot.cost, pilot.netLow, pilot.netHigh],
    [144, 114, -27.6, 58.8],
  );
  assert.ok(pilot.risk < r.selected.risk);
  const wait = r.options.find((o) => o.id === "wait");
  assert.equal(wait.cost, 0);
  assert.equal(wait.netHigh, 0);
  assert.equal(wait.risk, null);
});
test("zero benefit remains a visible loss rather than an invented return", () => {
  const r = analyze(data, request("guest", "full", 0));
  assert.equal(r.selected.netHigh, -102);
  assert.equal(r.selected.netLow, -102);
});
test("ticket update is immutable, idempotent and only changes its linked scenarios", () => {
  const baseline = structuredClone(data),
    updated = applyUpdate(data);
  assert.deepEqual(data, baseline);
  assert.equal(updated.revision, 2);
  assert.equal(updated.evidence.length, data.evidence.length + 1);
  assert.deepEqual(applyUpdate(updated), updated);
  const guest = analyze(updated, request());
  assert.equal(guest.selected.risk, 66);
  assert.equal(guest.selected.cost, 108);
  assert.equal(guest.updateRelevant, true);
  const before = analyze(data, request("search", "full", 1.5));
  const after = analyze(updated, request("search", "full", 1.5));
  assert.equal(after.updateRelevant, false);
  assert.deepEqual(after.options, before.options);
});
test("report snapshots do not change when the source data changes", () => {
  const source = structuredClone(data),
    r = analyze(source, request());
  source.evidence[0].text = "changed";
  source.scenarios[0].title = "changed";
  assert.notEqual(r.evidence[0].text, "changed");
  assert.notEqual(r.scenario.title, "changed");
});
test("invalid assumptions and scenario requests fail explicitly", () => {
  for (const effect of [NaN, Infinity, -1, 11])
    assert.throws(() => analyze(data, request("guest", "full", effect)));
  assert.throws(() => analyze(data, request("unknown")));
  assert.throws(() => analyze(data, request("guest", "__proto__")));
  assert.throws(() => analyze(data, { ...request(), note: "x".repeat(601) }));
});
test("all scenarios have coherent evidence and finite outcomes across launch modes", () => {
  const ids = new Set(data.evidence.map((e) => e.id)),
    nodes = new Set(data.nodes.map((n) => n.id));
  for (const s of data.scenarios) {
    for (const id of s.evidenceIds) assert.ok(ids.has(id));
    for (const id of s.affected) assert.ok(nodes.has(id));
    for (const mode of ["full", "pilot", "wait"])
      for (const effect of [0, s.defaultEffect, s.maxEffect]) {
        const r = analyze(data, request(s.id, mode, effect));
        for (const o of r.options) {
          assert.ok(Number.isFinite(o.netLow));
          assert.ok(o.netLow <= o.netHigh);
          assert.ok(o.risk === null || (o.risk >= 0 && o.risk <= 95));
        }
      }
  }
});
