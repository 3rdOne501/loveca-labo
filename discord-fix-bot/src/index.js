import path from "node:path";
import { fileURLToPath } from "node:url";
import dotenv from "dotenv";
import { createFixBot } from "./bot.js";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
dotenv.config({ path: path.resolve(__dirname, "../.env") });

const bot = createFixBot();
await bot.start();

process.on("SIGINT", async () => {
  await bot.stop();
  process.exit(0);
});
process.on("SIGTERM", async () => {
  await bot.stop();
  process.exit(0);
});
