using System.Text.Json;
using TwinSight;
var data = JsonSerializer.Deserialize<DemoData>(File.ReadAllText(args.Length > 0 ? args[0] : "src/TwinSight/wwwroot/data/demo.json"), new JsonSerializerOptions(JsonSerializerDefaults.Web))!;
int checks = 0;
void Check(bool value, string name) { if (!value) throw new Exception("FAIL: " + name); checks++; }
var twin = SimulationEngine.Build(data, ["github", "jira", "telemetry", "support"]);
var request = new SimulationRequest(twin.Id, "مهاجرت درگاه پرداخت به قرارداد جدید", ["payment"], "migration", 100, 45, false);
var result = SimulationEngine.Simulate(data, twin, request);
Check(result.OverallRisk == 59.9, "golden risk");
Check(result.Customers.First(c => c.Id == "mobile").ExposedUsers == 8907, "golden customer exposure");
Check(result.Nodes.First(n => n.Id == "identity").Risk == 0, "no upstream effect");
Check(result.Nodes.First(n => n.Id == "analytics").Path.SequenceEqual(new[] { "payment", "orders", "analytics" }), "downstream path");
Check(SimulationEngine.Simulate(data, twin, request with { Canary = true }).OverallRisk < result.OverallRisk, "canary reduction");
Check(SimulationEngine.Simulate(data, twin, request with { Rollout = 20 }).OverallRisk < result.OverallRisk, "limited rollout");
Check(SimulationEngine.Simulate(data, twin, request with { TestCoverage = 90 }).OverallRisk < result.OverallRisk, "test coverage");
foreach (var invalid in new[] { request with { Description = "a" }, request with { Targets = [] }, request with { Targets = ["unknown"] }, request with { Targets = ["payment", "payment"] }, request with { Rollout = 0 }, request with { TestCoverage = 101 }, request with { Kind = "wrong" } }) Check(SimulationEngine.Validate(data, invalid) is not null, "invalid request");
Check(SimulationEngine.ValidateBuild(new BuildRequest(["github"])) is not null, "source minimum");
Check(SimulationEngine.ValidateBuild(new BuildRequest(["jira", "support"])) is not null, "architecture source required");
var partial = SimulationEngine.Build(data, ["github", "jira"]);
var partialResult = SimulationEngine.Simulate(data, partial, request with { TwinId = partial.Id });
Check(partial.Coverage == 60 && partial.RecordCount == 164, "partial model");
Check(partialResult.EvidenceIds.All(id => data.Evidence.Any(e => e.Id == id && (e.Source == "jira" || e.Source == "github"))), "evidence filtering");
Check(partialResult.OverallRisk == result.OverallRisk, "missing evidence is not reduced risk");
foreach (var node in data.Nodes) foreach (var kind in SimulationEngine.KindWeights.Keys) foreach (var rollout in new[] { 1, 25, 50, 75, 100 }) foreach (var canary in new[] { false, true }) foreach (var coverage in new[] { 0, 100 }) {
    var r = SimulationEngine.Simulate(data, twin, request with { Targets = [node.Id], Kind = kind, Rollout = rollout, TestCoverage = coverage, Canary = canary });
    Check(r.OverallRisk is >= 0 and <= 100 && r.Customers.All(c => c.ExposedUsers >= 0 && c.ExposedUsers <= c.Users), "bounded scores");
}
Console.WriteLine($"PASS: {checks} C# checks");
