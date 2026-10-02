import { readFile, readdir, mkdir, writeFile } from "node:fs/promises";
import { resolve, relative } from "node:path";
import { fileURLToPath } from "node:url";
const root = fileURLToPath(new URL("../", import.meta.url));
// Small ZIP writer with stored entries; no npm dependencies or external zip utility.
const table = Array.from({ length: 256 }, (_, i) => {
  let c = i;
  for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  return c >>> 0;
});
function crc32(bytes) {
  let c = 0xffffffff;
  for (const b of bytes) c = table[(c ^ b) & 255] ^ (c >>> 8);
  return (c ^ 0xffffffff) >>> 0;
}
async function files(dir) {
  const out = [];
  for (const e of await readdir(dir, { withFileTypes: true })) {
    const p = resolve(dir, e.name);
    if (e.isDirectory()) out.push(...(await files(p)));
    else out.push(p);
  }
  return out.sort();
}
async function zip(entries, path) {
  const local = [],
    central = [];
  let offset = 0;
  for (const [name, bytes] of entries) {
    const n = Buffer.from(name),
      crc = crc32(bytes),
      h = Buffer.alloc(30);
    h.writeUInt32LE(0x04034b50);
    h.writeUInt16LE(20, 4);
    h.writeUInt16LE(0x0800, 6);
    h.writeUInt16LE(33, 12);
    h.writeUInt32LE(crc, 14);
    h.writeUInt32LE(bytes.length, 18);
    h.writeUInt32LE(bytes.length, 22);
    h.writeUInt16LE(n.length, 26);
    const c = Buffer.alloc(46);
    c.writeUInt32LE(0x02014b50);
    c.writeUInt16LE(20, 4);
    c.writeUInt16LE(20, 6);
    c.writeUInt16LE(0x0800, 8);
    c.writeUInt16LE(33, 14);
    c.writeUInt32LE(crc, 16);
    c.writeUInt32LE(bytes.length, 20);
    c.writeUInt32LE(bytes.length, 24);
    c.writeUInt16LE(n.length, 28);
    c.writeUInt32LE(offset, 42);
    local.push(h, n, bytes);
    central.push(c, n);
    offset += h.length + n.length + bytes.length;
  }
  const cd = Buffer.concat(central),
    end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(cd.length, 12);
  end.writeUInt32LE(offset, 16);
  await writeFile(path, Buffer.concat([...local, cd, end]));
}
const release = resolve(root, "release");
await mkdir(release, { recursive: true });
const dist = resolve(root, "dist"),
  staticEntries = [];
for (const p of await files(dist))
  staticEntries.push([
    relative(dist, p).replaceAll("\\", "/"),
    await readFile(p),
  ]);
await zip(staticEntries, resolve(release, "TwinSight-static.zip"));
const dockerEntries = [];
for (const p of await files(resolve(root, "public")))
  dockerEntries.push([
    relative(root, p).replaceAll("\\", "/"),
    await readFile(p),
  ]);
for (const name of ["Dockerfile", "scripts/serve.mjs", "docs/DEPLOYMENT.md"])
  dockerEntries.push([name, await readFile(resolve(root, name))]);
await zip(dockerEntries, resolve(release, "TwinSight-runflare.zip"));
console.log(
  "Deployment packages → release/TwinSight-static.zip and release/TwinSight-runflare.zip",
);
