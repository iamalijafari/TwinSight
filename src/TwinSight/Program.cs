using System.Collections.Concurrent;
using System.Text.Json;
using TwinSight;
var builder = WebApplication.CreateBuilder(args);
builder.Services.AddHttpClient(); builder.Services.AddSingleton<NarrativeService>();
builder.WebHost.ConfigureKestrel(options => options.Limits.MaxRequestBodySize = 64 * 1024);
var app = builder.Build();
var jsonOptions = new JsonSerializerOptions(JsonSerializerDefaults.Web);
var data = JsonSerializer.Deserialize<DemoData>(File.ReadAllText(Path.Combine(app.Environment.WebRootPath, "data", "demo.json")), jsonOptions)!;
var twins = new ConcurrentDictionary<string, TwinModel>();
var simulations = new ConcurrentDictionary<string, SimulationResult>();
// Local, single-user demo. Keep loopback binding; not an authenticated multi-tenant service.
app.Use(async (context, next) => {
    context.Response.Headers["X-Content-Type-Options"] = "nosniff";
    context.Response.Headers["Referrer-Policy"] = "no-referrer";
    context.Response.Headers["Content-Security-Policy"] = "default-src 'self'; script-src 'self'; style-src 'self'; img-src 'self' data:; connect-src 'self'; frame-ancestors 'none'; base-uri 'self'; form-action 'self'";
    var origin = context.Request.Headers.Origin.ToString();
    if (context.Request.Method == "POST" && origin.Length > 0 && origin != $"{context.Request.Scheme}://{context.Request.Host}") { context.Response.StatusCode = 403; return; }
    await next();
});
app.UseDefaultFiles(); app.UseStaticFiles();
app.MapGet("/api/health", (NarrativeService narrative) => Results.Ok(new { product = "TwinSight", mode = "deterministic-demo", aiEnabled = narrative.Enabled }));
app.MapGet("/api/demo", () => data);
app.MapPost("/api/twins", IResult (BuildRequest request) => {
    var error = SimulationEngine.ValidateBuild(request); if (error is not null) return Results.BadRequest(new { error });
    if (twins.Count >= 100) return Results.Json(new { error = "حد نمونه‌ها پر شده است؛ سرور محلی را دوباره اجرا کنید." }, statusCode: 429);
    var twin = SimulationEngine.Build(data, request.Sources!); twins[twin.Id] = twin; return Results.Ok(twin);
});
app.MapPost("/api/simulations", IResult (SimulationRequest request) => {
    if (request.TwinId is null || !twins.TryGetValue(request.TwinId, out var twin)) return Results.BadRequest(new { error = "ابتدا مدل را بسازید؛ پس از راه‌اندازی مجدد سرور دوباره بسازید." });
    var error = SimulationEngine.Validate(data, request); if (error is not null) return Results.BadRequest(new { error });
    if (simulations.Count >= 500) return Results.Json(new { error = "حد شبیه‌سازی‌ها پر شده است؛ سرور محلی را دوباره اجرا کنید." }, statusCode: 429);
    var result = SimulationEngine.Simulate(data, twin, request); simulations[result.Id] = result; return Results.Ok(result);
});
app.MapPost("/api/simulations/{id}/explain", async Task<IResult> (string id, NarrativeService narrative, CancellationToken cancellationToken) => {
    if (!simulations.TryGetValue(id, out var result)) return Results.NotFound(new { error = "شبیه‌سازی موجود نیست." });
    if (!narrative.Enabled) return Results.Ok(new { mode = "rules", text = "مسیرهای وابستگی و شواهد را بررسی کنید. این خروجی با قواعد ثابت و داده ساختگی ساخته شده است. " + string.Join(" ", result.Mitigations) });
    try { return Results.Ok(new { mode = "ai-narrative", text = await narrative.Explain(result, cancellationToken) }); }
    catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException or IndexOutOfRangeException) {
        return Results.Json(new { error = "توضیح هوش مصنوعی در دسترس نیست؛ شبیه‌سازی و شواهد همچنان قابل بررسی‌اند." }, statusCode: 502);
    }
});
app.MapPost("/api/proposals", async Task<IResult> (ProposalRequest request, NarrativeService narrative, CancellationToken cancellationToken) => {
    if (request.TwinId is null || !twins.TryGetValue(request.TwinId, out var twin)) return Results.BadRequest(new { error = "ابتدا مدل معتبر بسازید." });
    if (string.IsNullOrWhiteSpace(request.Description) || request.Description.Trim().Length < 12 || request.Description.Length > 2000) return Results.BadRequest(new { error = "شرح تغییر باید بین ۱۲ و ۲۰۰۰ کاراکتر باشد." });
    if (!narrative.Enabled) return Results.Json(new { error = "تفسیر هوش مصنوعی پیکربندی نشده است." }, statusCode: 409);
    try { return Results.Ok(new { mode = "ai-proposal", proposal = await narrative.Propose(data, twin, request.Description.Trim(), cancellationToken) }); }
    catch (Exception e) when (e is HttpRequestException or TaskCanceledException or JsonException or InvalidOperationException or KeyNotFoundException or IndexOutOfRangeException) {
        return Results.Json(new { error = "تفسیر هوش مصنوعی در دسترس نیست؛ سرویس‌ها را دستی انتخاب کنید." }, statusCode: 502);
    }
});
app.Run();
