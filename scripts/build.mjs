import { cp, mkdir, readFile, rm, stat } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { resolve } from "node:path";
import { spawnSync } from "node:child_process";
const root = fileURLToPath(new URL("../", import.meta.url));
const source = resolve(root, "public"),
  output = resolve(root, "dist");
// No bundler or dependency install: validate inputs and copy the static website.
for (const file of [
  "index.html",
  "styles.css",
  "app.js",
  "engine.js",
  "assets/logo.svg",
  "assets/fonts/Vazirmatn.woff2",
  "assets/fonts/OFL.txt",
]) {
  if (!(await stat(resolve(source, file))).size)
    throw new Error(`Empty file: ${file}`);
}
JSON.parse(await readFile(resolve(source, "data/demo.json"), "utf8"));
for (const file of ["app.js", "engine.js"]) {
  const check = spawnSync(
    process.execPath,
    ["--check", resolve(source, file)],
    { stdio: "inherit" },
  );
  if (check.status !== 0) process.exit(check.status || 1);
}
await rm(output, { recursive: true, force: true });
await mkdir(output, { recursive: true });
await cp(source, output, { recursive: true });
console.log(
  "TwinSight built successfully → dist/ (static files, no runtime server required)",
);
