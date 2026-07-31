import path from "node:path";
import { fileURLToPath } from "node:url";
import { Agent, CursorAgentError } from "@cursor/sdk";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CWD = path.resolve(__dirname, "../..");

/**
 * @param {string} prompt
 * @param {{
 *   apiKey?: string,
 *   cwd?: string,
 *   model?: string,
 *   runtime?: "local" | "cloud",
 *   cloudRepos?: string[],
 *   onLog?: (line: string) => void,
 * }} [opts]
 */
export async function runFixAgent(prompt, opts = {}) {
  const apiKey = opts.apiKey || process.env.CURSOR_API_KEY;
  if (!apiKey) {
    throw new Error("CURSOR_API_KEY が未設定です");
  }

  const modelId = opts.model || process.env.CURSOR_MODEL || "composer-2.5";
  const runtime = opts.runtime || process.env.AGENT_RUNTIME || "local";
  const cwd = opts.cwd || process.env.CURSOR_REPO_CWD || DEFAULT_CWD;
  const log = opts.onLog || ((line) => console.log(line));

  /** @type {import("@cursor/sdk").AgentOptions} */
  const agentOpts = {
    apiKey,
    model: { id: modelId },
  };

  if (runtime === "cloud") {
    const repos =
      opts.cloudRepos ||
      (process.env.CURSOR_CLOUD_REPOS || "")
        .split(",")
        .map((s) => s.trim())
        .filter(Boolean);
    if (!repos.length) {
      throw new Error("cloud 実行には CURSOR_CLOUD_REPOS（カンマ区切り）が必要です");
    }
    agentOpts.cloud = {
      repos: repos.map((url) => ({ url })),
      autoCreatePR: false,
      skipReviewerRequest: true,
    };
  } else {
    agentOpts.local = {
      cwd,
      settingSources: [],
    };
  }

  log(`agent start runtime=${runtime} model=${modelId} cwd=${cwd}`);

  try {
    await using agent = await Agent.create(agentOpts);
    const run = await agent.send(prompt);
    log(`agentId=${agent.agentId} runId=${run.id}`);

    let assistantText = "";
    if (typeof run.stream === "function") {
      for await (const event of run.stream()) {
        if (event?.type === "assistant" && event.message?.content) {
          for (const block of event.message.content) {
            if (block.type === "text" && block.text) {
              assistantText += block.text;
            }
          }
        }
      }
    }

    const result = await run.wait();
    if (result.status === "error") {
      return {
        ok: false,
        agentId: agent.agentId,
        runId: run.id,
        status: result.status,
        text: assistantText || `run failed: ${run.id}`,
      };
    }

    const finalText =
      (result && typeof result.result === "string" && result.result) ||
      assistantText ||
      `(status=${result.status})`;

    return {
      ok: true,
      agentId: agent.agentId,
      runId: run.id,
      status: result.status,
      text: finalText,
    };
  } catch (err) {
    if (err instanceof CursorAgentError) {
      return {
        ok: false,
        agentId: null,
        runId: null,
        status: "startup_error",
        text: `起動失敗: ${err.message} (retryable=${err.isRetryable})`,
      };
    }
    throw err;
  }
}
