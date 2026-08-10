#!/usr/bin/env bash
# カードリストの更新を 1 日 1 回チェックし、更新があれば取り込むまでを自動化する。
#
#   1. scripts/sync-cards-json.sh    … 上流から健全な cards.json を取得（空 JSON / ダウングレードは拒否）
#   2. scripts/check-new-cards.mjs   … 前回スナップショットと比較して新規カードを検出
#   3. 新規があれば   … 能力インデックス再生成 → カバレッジ検証 → .app へ再同梱 → レポート出力
#
# git commit はしない（差分はワークツリーに残す）。
# 用法: bash scripts/daily-card-update.sh [--quiet]
set -uo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "${ROOT}"

LOG_DIR="${ROOT}/logs"
LOG_FILE="${LOG_DIR}/card-update.log"
REPORT_DIR="${ROOT}/docs/card-updates"
STAMP="$(date +%Y-%m-%d)"
QUIET=0
[[ "${1:-}" == "--quiet" ]] && QUIET=1

mkdir -p "${LOG_DIR}" "${REPORT_DIR}"

log() {
  local line="[$(date '+%Y-%m-%d %H:%M:%S')] $*"
  echo "${line}" >>"${LOG_FILE}"
  [[ "${QUIET}" -eq 0 ]] && echo "$*"
  return 0
}

notify() {
  [[ "$(uname -s)" == "Darwin" ]] || return 0
  command -v osascript >/dev/null 2>&1 || return 0
  osascript -e "display notification \"$2\" with title \"$1\"" >/dev/null 2>&1 || true
}

# node を PATH 上で解決（launchd 経由だと PATH が最小限になるため）
resolve_node() {
  if command -v node >/dev/null 2>&1; then return 0; fi
  for candidate in /opt/homebrew/bin /usr/local/bin "${HOME}/.volta/bin" "${HOME}/.nvm/versions/node"/*/bin; do
    if [[ -x "${candidate}/node" ]]; then
      PATH="${candidate}:${PATH}"
      export PATH
      return 0
    fi
  done
  return 1
}

if ! resolve_node; then
  log "ERROR: node が見つかりません。処理を中止します。"
  notify "カード更新チェック" "node が見つからず中止しました"
  exit 1
fi

log "=== カード更新チェック開始 ==="

if ! bash scripts/sync-cards-json.sh >>"${LOG_FILE}" 2>&1; then
  log "ERROR: cards.json の同期に失敗（既存データは維持）"
  notify "カード更新チェック" "上流の取得に失敗しました"
  exit 1
fi

SUMMARY="$(node scripts/check-new-cards.mjs --json 2>>"${LOG_FILE}")"
if [[ -z "${SUMMARY}" ]]; then
  log "ERROR: 差分チェックに失敗しました"
  exit 1
fi

read -r ADDED REMOVED CHANGED TOTAL NEEDS <<<"$(
  printf '%s' "${SUMMARY}" | node -e '
let s="";process.stdin.on("data",d=>s+=d).on("end",()=>{
  const r=JSON.parse(s);
  console.log(r.added, r.removed, r.abilityChanged, r.totalCards, r.needsWorkCount);
});'
)"

log "カード総数 ${TOTAL} / 新規 ${ADDED} / 削除 ${REMOVED} / 能力変更 ${CHANGED}"

if [[ "${ADDED}" == "0" && "${REMOVED}" == "0" && "${CHANGED}" == "0" ]]; then
  log "更新なし。終了します。"
  exit 0
fi

REPORT="${REPORT_DIR}/${STAMP}.md"
node scripts/check-new-cards.mjs --markdown "${REPORT}" >>"${LOG_FILE}" 2>&1
cp "${REPORT}" "${ROOT}/docs/card-update-report.md" 2>/dev/null || true
log "レポート: docs/card-updates/${STAMP}.md"

log "能力インデックスを再生成..."
node scripts/build-ability-index.mjs >>"${LOG_FILE}" 2>&1 || log "WARN: build-ability-index に失敗"

log "カバレッジ検証..."
if node scripts/verify-ability-coverage.mjs >>"${LOG_FILE}" 2>&1; then
  log "verify-ability-coverage OK"
else
  log "WARN: verify-ability-coverage が失敗（未監修商品の除外設定を確認してください）"
fi

log "LovecaSimulator.app へ再同梱..."
bash scripts/package-lovecasimulator-app.sh >>"${LOG_FILE}" 2>&1 || log "WARN: .app 同梱に失敗"

# ここまで成功したらスナップショットを更新（次回はこの状態が基準になる）
node scripts/check-new-cards.mjs --write >>"${LOG_FILE}" 2>&1
log "インベントリ更新完了"

MSG="新規 ${ADDED} 枚を取り込みました"
[[ "${NEEDS}" != "0" ]] && MSG="${MSG}（要ハンドラ対応 ${NEEDS} 枚）"
log "${MSG}"
notify "ラブカ カードリスト更新" "${MSG}"
log "=== 完了（git commit はしていません）==="
