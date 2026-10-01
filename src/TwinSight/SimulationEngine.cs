namespace TwinSight;
// Deterministic, deliberately conservative demo rules; not a trained predictive model.
public static class SimulationEngine
{
    public static readonly Dictionary<string, double> KindWeights = new() { ["feature"] = .78, ["migration"] = 1, ["performance"] = .55, ["security"] = .88 };
    public static readonly string[] SourceIds = ["jira", "github", "telemetry", "support"];
    public static string? ValidateBuild(BuildRequest request)
    {
        var sources = request.Sources;
        return sources is null || sources.Distinct().Count() != sources.Length || sources.Length < 2 || !sources.Contains("github") || sources.Any(s => !SourceIds.Contains(s))
            ? "حداقل دو منبع معتبر و یکتا، شامل GitHub، انتخاب کنید." : null;
    }
    public static TwinModel Build(DemoData data, string[] sources) => new(
        Guid.NewGuid().ToString("N"), sources.ToArray(), data.Sources.Where(s => sources.Contains(s.Id)).Sum(s => s.Records),
        40 + (sources.Contains("jira") ? 20 : 0) + (sources.Contains("telemetry") ? 25 : 0) + (sources.Contains("support") ? 15 : 0),
        SourceIds.Except(sources).ToArray(), data.Evidence.Where(e => sources.Contains(e.Source)).Select(e => e.Id).ToArray(), DateTimeOffset.UtcNow);
    public static string? Validate(DemoData data, SimulationRequest r)
    {
        if (string.IsNullOrWhiteSpace(r.Description) || r.Description.Trim().Length < 12 || r.Description.Length > 2000) return "شرح تغییر باید بین ۱۲ و ۲۰۰۰ کاراکتر باشد.";
        if (r.Targets is null || r.Targets.Length == 0 || r.Targets.Distinct().Count() != r.Targets.Length || r.Targets.Any(t => !data.Nodes.Any(n => n.Id == t))) return "حداقل یک سرویس معتبر و یکتا انتخاب کنید.";
        if (r.Kind is null || !KindWeights.ContainsKey(r.Kind)) return "نوع تغییر معتبر نیست.";
        if (r.Rollout is < 1 or > 100 || r.TestCoverage is < 0 or > 100) return "میزان انتشار و پوشش تست خارج از محدوده است.";
        return null;
    }
    static double Round(double value, int digits = 1) => Math.Round(value, digits, MidpointRounding.AwayFromZero);
    public static SimulationResult Simulate(DemoData data, TwinModel twin, SimulationRequest r)
    {
        var error = Validate(data, r); if (error is not null) throw new ArgumentException(error);
        if (r.TwinId != twin.Id) throw new ArgumentException("مدل درخواست با مدل شبیه‌سازی یکسان نیست.");
        var scores = data.Nodes.ToDictionary(n => n.Id, _ => 0d);
        var paths = data.Nodes.ToDictionary(n => n.Id, _ => Array.Empty<string>());
        var baseRisk = 82 * KindWeights[r.Kind!] * (.25 + .75 * r.Rollout / 100d) * (1 - .006 * r.TestCoverage) * (r.Canary ? .62 : 1);
        foreach (var id in r.Targets!) { scores[id] = baseRisk * data.Nodes.First(n => n.Id == id).Criticality; paths[id] = [id]; }
        // Max-product propagation. Cycles cannot amplify because every edge weight is <= 1.
        for (var i = 0; i < data.Nodes.Length; i++)
        {
            var changed = false;
            foreach (var edge in data.Edges)
            {
                var candidate = scores[edge.From] * edge.Weight;
                if (candidate > scores[edge.To] + 1e-9) { scores[edge.To] = candidate; paths[edge.To] = [.. paths[edge.From], edge.To]; changed = true; }
            }
            if (!changed) break;
        }
        var nodes = data.Nodes.Select(n => new NodeImpact(n.Id, Round(scores[n.Id]), Round(scores[n.Id] * 2.4), paths[n.Id])).ToArray();
        var customers = data.Customers.Select(c => {
            var index = Math.Min(95, c.Services.Max(s => scores[s]) * c.Sensitivity);
            return new SegmentImpact(c.Id, c.Name, c.Users, Round(index), (int)Math.Floor(c.Users * r.Rollout / 100d * index / 100d + .5));
        }).ToArray();
        var overall = Round(nodes.Max(n => n.Risk));
        int[] days = [0, 1, 3, 7, 14, 30]; double[] factors = [0, .45, .85, 1, .72, .38];
        var timeline = days.Select((day, i) => new TimelinePoint(day, factors[i], Round(overall * factors[i]), Round(nodes.Max(n => n.LatencyDelta) * factors[i]), (int)Math.Floor(customers.Sum(c => c.ExposedUsers) * factors[i] + .5))).ToArray();
        var evidence = data.Evidence.Where(e => twin.Sources.Contains(e.Source) && scores[e.Node] > 1).Select(e => e.Id).ToArray();
        return new(Guid.NewGuid().ToString("N"), twin.Id, r.Description!.Trim(), r.Kind!, r.Targets!, r.Rollout, r.TestCoverage, r.Canary,
            "deterministic-demo", overall, twin.Coverage, nodes, customers, timeline, evidence,
            ["تمام داده‌ها ساختگی‌اند؛ شاخص ریسک احتمال آماری نیست.", "وابستگی‌ها جهت‌دارند و اثر با بیشترین مسیر وزنی منتقل می‌شود.", "نمودار زمانی یک فرض نمایشی ثابت است؛ از تاریخچه آموزش ندیده است.", "متن تغییر برای توضیح ثبت می‌شود؛ عددها از سرویس‌ها و تنظیمات صریح محاسبه می‌شوند.", twin.Missing.Length > 0 ? "منابع غایب: " + string.Join(", ", twin.Missing) + ". پوشش کمتر به معنای ریسک کمتر نیست." : "همه منابع نمایشی انتخاب شده‌اند؛ این به معنی دقت ۱۰۰٪ نیست."],
            ["انتشار محدود با امکان بازگشت را پیش از انتشار سراسری بررسی کنید.", "تست قرارداد برای مسیر " + string.Join("، ", r.Targets!) + " و سرویس‌های وابسته اضافه کنید.", "شاخص خطای پرداخت و درخواست‌های پشتیبانی را با خط پایه مقایسه کنید؛ تصمیم نهایی با انسان است."], DateTimeOffset.UtcNow);
    }
}
