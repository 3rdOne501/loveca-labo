import { spawn } from "node:child_process";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const DEFAULT_CWD = path.resolve(__dirname, "../..");

/**
 * @param {string} cmd
 * @param {string[]} args
 * @param {{ cwd?: string }} [opts]
 * @returns {Promise<{ code: number, stdout: string, stderr: string }>}
 */
function run(cmd, args, opts = {}) {
  return new Promise((resolve, reject) => {
    const child = spawn(cmd, args, {
      cwd: opts.cwd || DEFAULT_CWD,
      env: process.env,
      shell: false,
    });
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (d) => {
      stdout += String(d);
    });
    child.stderr.on("data", (d) => {
      stderr += String(d);
    });
    child.on("error", reject);
    child.on("close", (code) => {
      resolve({ code: code ?? 1, stdout, stderr });
    });
  });
}

/**
 * @param {string} cwd
 */
export async function gitStatusPorcelain(cwd = DEFAULT_CWD) {
  const r = await run("git", ["status", "--porcelain"], { cwd });
  if (r.code !== 0) {
    throw new Error(`git status failed: ${r.stderr || r.stdout}`);
  }
  return r.stdout.trim();
}

/**
 * @param {string} cwd
 */
export async function assertCleanOrOnlyAllowedDirty(cwd = DEFAULT_CWD) {
  const porcelain = await gitStatusPorcelain(cwd);
  return porcelain;
}

function slugCardNos(cardNos) {
  const raw = (cardNos || [])
    .join("-")
    .replace(/[^A-Za-z0-9._-]+/g, "-")
    .replace(/-+/g, "-")
    .replace(/^-|-$/g, "");
  return (raw || "cards").slice(0, 48);
}

/**
 * Agent 成功後に GitHub へ反映する。
 *
 * GITHUB_APPLY_MODE:
 * - off   … 何もしない
 * - pr    … 新ブランチに commit → push → gh pr create
 * - push  … 現在ブランチに commit → push（既定・直適用）
 *
 * @param {{
 *   cardNos: string[],
 *   bug: string,
 *   note?: string,
 *   agentSummary?: string,
 *   cwd?: string,
 *   mode?: "off" | "pr" | "push",
 *   baseBranch?: string,
 *   onLog?: (line: string) => void,
 * }} opts
 */
export async function applyFixToGithub(opts) {
  const cwd = opts.cwd || process.env.CURSOR_REPO_CWD || DEFAULT_CWD;
  const mode = (
    opts.mode ||
    process.env.GITHUB_APPLY_MODE ||
    "push"
  ).toLowerCase();
  const log = opts.onLog || ((line) => console.log(line));

  if (mode === "off" || mode === "false" || mode === "0") {
    return { applied: false, mode: "off", reason: "GITHUB_APPLY_MODE=off" };
  }
  if (mode !== "pr" && mode !== "push") {
    return {
      applied: false,
      mode,
      reason: `未知の GITHUB_APPLY_MODE=${mode}（off|pr|push）`,
    };
  }

  const porcelain = await gitStatusPorcelain(cwd);
  if (!porcelain) {
    return { applied: false, mode, reason: "変更なし（commit スキップ）" };
  }

  const cards = (opts.cardNos || []).join(", ") || "(unspecified)";
  const bugOne = String(opts.bug || "")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 72);
  const msg = [
    `fix(discord): ${cards}${bugOne ? ` — ${bugOne}` : ""}`,
    "",
    "Discord 修正指示からの自動適用。",
    opts.note ? `追記: ${opts.note}` : null,
    "",
    "Co-authored-by: loveca-discord-fix-bot <bot@local>",
  ]
    .filter((l) => l != null)
    .join("\n");

  const branchRes = await run("git", ["branch", "--show-current"], { cwd });
  const currentBranch = branchRes.stdout.trim();
  if (!currentBranch) {
    return {
      applied: false,
      mode,
      reason: "detached HEAD のため適用できません",
    };
  }

  const baseBranch =
    opts.baseBranch ||
    process.env.GITHUB_BASE_BRANCH ||
    (mode === "pr" ? currentBranch : currentBranch);

  let workBranch = currentBranch;
  const restoreBranch = async () => {
    if (mode === "pr" && workBranch !== currentBranch) {
      await run("git", ["checkout", currentBranch], { cwd });
    }
  };

  if (mode === "pr") {
    const stamp = new Date()
      .toISOString()
      .replace(/[-:TZ.]/g, "")
      .slice(0, 14);
    workBranch = `fix/discord-${slugCardNos(opts.cardNos)}-${stamp}`;
    log(`checkout -b ${workBranch} (from ${currentBranch})`);
    const co = await run("git", ["checkout", "-b", workBranch], { cwd });
    if (co.code !== 0) {
      return {
        applied: false,
        mode,
        reason: `branch 作成失敗: ${co.stderr || co.stdout}`,
      };
    }
  }

  log("git add -A");
  const add = await run("git", ["add", "-A"], { cwd });
  if (add.code !== 0) {
    await restoreBranch();
    return {
      applied: false,
      mode,
      reason: `git add 失敗: ${add.stderr || add.stdout}`,
      branch: workBranch,
    };
  }

  log("git commit");
  const commit = await run("git", ["commit", "-m", msg], { cwd });
  if (commit.code !== 0) {
    await restoreBranch();
    if (/nothing to commit/i.test(commit.stdout + commit.stderr)) {
      return { applied: false, mode, reason: "nothing to commit", branch: workBranch };
    }
    return {
      applied: false,
      mode,
      reason: `git commit 失敗: ${commit.stderr || commit.stdout}`,
      branch: workBranch,
    };
  }

  const hash = (await run("git", ["rev-parse", "--short", "HEAD"], { cwd }))
    .stdout.trim();

  log(`git push -u origin ${workBranch}`);
  const push = await run(
    "git",
    ["push", "-u", "origin", "HEAD"],
    { cwd },
  );
  if (push.code !== 0) {
    return {
      applied: false,
      mode,
      reason: `git push 失敗: ${push.stderr || push.stdout}`,
      branch: workBranch,
      commit: hash,
    };
  }

  if (mode === "push") {
    return {
      applied: true,
      mode,
      branch: workBranch,
      commit: hash,
      prUrl: null,
      message: `${workBranch} に push 済み (${hash})`,
    };
  }

  // PR
  const title = `fix(discord): ${cards}`.slice(0, 80);
  const body = [
    "## Summary",
    `- Discord からの修正指示を自動適用`,
    `- カード: ${cards}`,
    `- バグ: ${opts.bug || "(なし)"}`,
    opts.note ? `- 追記: ${opts.note}` : null,
    "",
    "## Agent 報告（抜粋）",
    "```",
    String(opts.agentSummary || "").slice(0, 3500),
    "```",
    "",
    "## Test plan",
    "- [ ] verify-ability-coverage / 関連 verify",
    "- [ ] シミュで再現確認",
  ]
    .filter((l) => l != null)
    .join("\n");

  log(`gh pr create --base ${baseBranch}`);
  const pr = await run(
    "gh",
    [
      "pr",
      "create",
      "--base",
      baseBranch,
      "--head",
      workBranch,
      "--title",
      title,
      "--body",
      body,
    ],
    { cwd },
  );

  // return to original branch so next job isn't stuck on fix/*
  await run("git", ["checkout", currentBranch], { cwd });

  if (pr.code !== 0) {
    return {
      applied: true,
      mode,
      branch: workBranch,
      commit: hash,
      prUrl: null,
      message: `push 済みだが PR 作成失敗: ${pr.stderr || pr.stdout}`,
    };
  }

  const prUrl = (pr.stdout || "").trim().split("\n").filter(Boolean).pop();
  return {
    applied: true,
    mode,
    branch: workBranch,
    commit: hash,
    prUrl,
    message: `PR 作成: ${prUrl}`,
  };
}
