#!/usr/bin/env node
/** Decode base64 JSON from stdin: { "honoka": "<base64>", ... } → id.png */
import fs from "fs";
import path from "path";
import { fileURLToPath } from "url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const OUT = path.join(__dirname, "../assets/game-icons/member-icons");
const raw = fs.readFileSync(0, "utf8");
const data = JSON.parse(raw);
fs.mkdirSync(OUT, { recursive: true });
for (const [id, b64] of Object.entries(data)) {
  if (!b64 || typeof b64 !== "string") continue;
  const dest = path.join(OUT, id + ".png");
  const buf = Buffer.from(b64, "base64");
  fs.writeFileSync(dest, buf);
  console.log("wrote", id + ".png", buf.length);
}
