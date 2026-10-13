import { readFileSync, writeFileSync } from "node:fs";

const css = readFileSync("../.cache/gf.css", "utf8");
const blocks = css.split(/(?=@font-face)/).filter((b) => b.startsWith("@font-face"));
const latin = blocks.filter((b) => /unicode-range:[^;]*U\+0000-00FF/.test(b));
if (!latin.length) throw new Error("no latin blocks");

const out = [];
for (const b of latin) {
  const url = b.match(/url\((https:[^)]+)\)/)[1];
  const buf = Buffer.from(await (await fetch(url)).arrayBuffer());
  out.push(b.replace(/url\(https:[^)]+\)/, `url("data:font/woff2;base64,${buf.toString("base64")}")`));
  console.error(`${b.match(/font-family: '([^']+)'/)[1]} ${b.match(/font-weight: ([^;]+)/)?.[1]} — ${(buf.length / 1024) | 0}KB`);
}

out.push(`:root {
  --font-sans: "Space Grotesk", ui-sans-serif, system-ui, sans-serif;
  --font-geist-mono: "Geist Mono", ui-monospace, monospace;
}`);

writeFileSync("fonts.css", out.join("\n\n") + "\n");
