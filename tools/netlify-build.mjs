import { cp, mkdir, readdir, rm } from "node:fs/promises";

await rm("dist-netlify", { recursive: true, force: true });
await mkdir("dist-netlify");
for (const entry of await readdir(".", { withFileTypes: true })) {
  if (entry.isFile() && /\.(html|css|svg|ico|png|webmanifest)$/.test(entry.name))
    await cp(entry.name, `dist-netlify/${entry.name}`);
}
for (const file of ["app.js"]) {
  try { await cp(file, `dist-netlify/${file}`); }
  catch (error) { if (error.code !== "ENOENT") throw error; }
}
