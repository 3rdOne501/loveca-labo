import {
  Client,
  GatewayIntentBits,
  Partials,
  ChannelType,
} from "discord.js";
import { looksLikeBugReport, parseBugReport } from "./parseBugReport.js";
import { buildFixAgentPrompt } from "./buildPrompt.js";
import { runFixAgent } from "./runAgent.js";
import { applyFixToGithub, gitStatusPorcelain } from "./applyToGithub.js";

const DISCORD_LIMIT = 1900;

/**
 * @param {string} text
 * @param {number} [max]
 */
function chunkText(text, max = DISCORD_LIMIT) {
  const s = String(text || "");
  if (s.length <= max) return [s];
  const parts = [];
  for (let i = 0; i < s.length; i += max) {
    parts.push(s.slice(i, i + max));
  }
  return parts;
}

export function createFixBot() {
  const token = process.env.DISCORD_BOT_TOKEN;
  const channelId = process.env.DISCORD_CHANNEL_ID;
  if (!token) throw new Error("DISCORD_BOT_TOKEN が未設定です");
  if (!channelId) throw new Error("DISCORD_CHANNEL_ID が未設定です");

  const dryRun = String(process.env.DRY_RUN || "").toLowerCase() === "true";
  const requireMention =
    String(process.env.REQUIRE_MENTION || "false").toLowerCase() === "true";
  const githubMode = (
    process.env.GITHUB_APPLY_MODE || "push"
  ).toLowerCase();

  /** @type {Promise<void>} */
  let queue = Promise.resolve();
  /** @type {Set<string>} */
  const inflight = new Set();

  const client = new Client({
    intents: [
      GatewayIntentBits.Guilds,
      GatewayIntentBits.GuildMessages,
      GatewayIntentBits.MessageContent,
    ],
    partials: [Partials.Channel],
  });

  client.once("ready", () => {
    console.log(`discord ready as ${client.user?.tag}`);
    console.log(
      `watching channel ${channelId} dryRun=${dryRun} github=${githubMode}`,
    );
  });

  client.on("messageCreate", (message) => {
    void handleMessage(message);
  });

  /**
   * @param {import("discord.js").Message} message
   */
  async function handleMessage(message) {
    try {
      if (message.author.bot) return;
      if (message.channelId !== channelId) return;
      if (message.channel.type === ChannelType.DM) return;

      if (requireMention) {
        if (!client.user || !message.mentions.users.has(client.user.id)) return;
      }

      const content = message.content || "";
      if (!looksLikeBugReport(content)) return;

      const parsed = parseBugReport(content);
      if (!parsed.ok) {
        await message.reply(`受付できません: ${parsed.reason}`);
        return;
      }

      if (inflight.has(message.id)) return;
      inflight.add(message.id);

      queue = queue
        .then(() => processReport(message, parsed))
        .catch((err) => {
          console.error("queue job failed", err);
        })
        .finally(() => {
          inflight.delete(message.id);
        });
    } catch (err) {
      console.error("handleMessage error", err);
    }
  }

  /**
   * @param {import("discord.js").Message} message
   * @param {{ cardNos: string[], bug: string, note: string }} parsed
   */
  async function processReport(message, parsed) {
    const cards = parsed.cardNos.join(", ");
    const ack = await message.reply(
      [
        "受付しました。修正エージェントを起動します…",
        `カード: ${cards}`,
        dryRun ? "（DRY_RUN=true — Agent は起動しません）" : null,
      ]
        .filter(Boolean)
        .join("\n"),
    );

    const prompt = buildFixAgentPrompt({
      ...parsed,
      discordMeta: {
        channelId: message.channelId,
        messageId: message.id,
        authorTag: message.author.tag,
      },
    });

    if (dryRun) {
      await ack.reply(
        ["DRY_RUN プロンプト先頭:", "```", prompt.slice(0, 1500), "```"].join(
          "\n",
        ),
      );
      return;
    }

    try {
      const dirtyBefore = await gitStatusPorcelain();
      if (dirtyBefore) {
        await message.reply(
          [
            "作業ツリーに未コミット変更があるため中断しました。",
            "手動で片付けてから再投稿してください。",
            "```",
            dirtyBefore.slice(0, 1500),
            "```",
          ].join("\n"),
        );
        return;
      }
    } catch (err) {
      await message.reply(`git 状態確認に失敗: ${err?.message || err}`);
      return;
    }

    const started = Date.now();
    const result = await runFixAgent(prompt, {
      onLog: (line) => console.log(`[agent] ${line}`),
    });
    const sec = Math.round((Date.now() - started) / 1000);

    const header = result.ok
      ? `完了 (${sec}s) status=${result.status} run=${result.runId || "?"}`
      : `失敗 (${sec}s) status=${result.status} run=${result.runId || "?"}`;

    const body = result.text?.trim() || "(出力なし)";
    const chunks = chunkText(`${header}\n\n${body}`);
    for (const part of chunks) {
      await message.reply(part);
    }

    if (!result.ok) return;

    if (githubMode === "off" || githubMode === "false" || githubMode === "0") {
      await message.reply(
        "GitHub 自動適用はオフです（`GITHUB_APPLY_MODE=pr` または `push`）。",
      );
      return;
    }

    await message.reply(`GitHub へ反映中…（mode=${githubMode}）`);
    try {
      const gh = await applyFixToGithub({
        cardNos: parsed.cardNos,
        bug: parsed.bug,
        note: parsed.note,
        agentSummary: result.text,
        mode: githubMode,
        onLog: (line) => console.log(`[github] ${line}`),
      });
      if (!gh.applied) {
        await message.reply(`GitHub 反映スキップ: ${gh.reason}`);
        return;
      }
      const lines = [
        `GitHub 反映OK (${gh.mode})`,
        gh.branch ? `branch: \`${gh.branch}\`` : null,
        gh.commit ? `commit: \`${gh.commit}\`` : null,
        gh.prUrl || gh.message || null,
      ].filter(Boolean);
      await message.reply(lines.join("\n"));
    } catch (err) {
      await message.reply(`GitHub 反映失敗: ${err?.message || err}`);
    }
  }

  return {
    client,
    async start() {
      await client.login(token);
    },
    async stop() {
      client.destroy();
    },
  };
}
