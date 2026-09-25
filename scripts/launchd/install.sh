#!/usr/bin/env bash
# カードリスト日次更新の launchd ジョブを登録／解除する。
#
#   bash scripts/launchd/install.sh              # 登録（設定を変えた後の再登録も同じ）
#   bash scripts/launchd/install.sh --run-now    # 今すぐ実行
#   bash scripts/launchd/install.sh --uninstall  # 解除
#
# その他:
#   bash scripts/launchd/install.sh --status     # 登録状態を表示
#   bash scripts/launchd/install.sh --dry-run    # plist 生成のみ検証（macOS 不要）
#   bash scripts/launchd/install.sh --help       # 用法
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LABEL="com.loveca.card-update"
AGENT_DIR="${HOME}/Library/LaunchAgents"
PLIST="${AGENT_DIR}/${LABEL}.plist"
TEMPLATE="${SCRIPT_DIR}/${LABEL}.plist"
UPDATE_SCRIPT="${ROOT}/scripts/daily-card-update.sh"
UID_NUM="$(id -u)"
DOMAIN="gui/${UID_NUM}"
SERVICE="${DOMAIN}/${LABEL}"

usage() {
  cat <<'EOF'
カードリスト日次更新（scripts/daily-card-update.sh）の launchd 管理

  bash scripts/launchd/install.sh              # 登録（設定を変えた後の再登録も同じ）
  bash scripts/launchd/install.sh --run-now    # 今すぐ実行
  bash scripts/launchd/install.sh --uninstall  # 解除

  bash scripts/launchd/install.sh --status     # 登録状態を表示
  bash scripts/launchd/install.sh --dry-run    # plist 生成のみ検証（Linux / CI 可）
  bash scripts/launchd/install.sh --help       # このヘルプ

実行時刻: 毎日 17:10（日本時間想定・ローカル時計）
ログ:     logs/card-update.log / logs/launchd.{out,err}.log

macOS 専用（登録／実行／解除／状態）。Linux / CI では:
  bash scripts/launchd/install.sh --dry-run
  bash scripts/daily-card-update.sh
EOF
}

require_darwin() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "ERROR: launchd は macOS 専用です（現在: $(uname -s)）。" >&2
    echo "Linux / CI では直接実行してください:" >&2
    echo "  bash scripts/daily-card-update.sh" >&2
    echo "plist 生成の検証だけなら:" >&2
    echo "  bash scripts/launchd/install.sh --dry-run" >&2
    exit 1
  fi
  if ! command -v launchctl >/dev/null 2>&1; then
    echo "ERROR: launchctl が見つかりません。" >&2
    exit 1
  fi
}

is_loaded() {
  launchctl print "${SERVICE}" >/dev/null 2>&1
}

validate_inputs() {
  if [[ ! -f "${TEMPLATE}" ]]; then
    echo "ERROR: テンプレートがありません: ${TEMPLATE}" >&2
    exit 1
  fi
  if [[ ! -f "${UPDATE_SCRIPT}" ]]; then
    echo "ERROR: 更新スクリプトがありません: ${UPDATE_SCRIPT}" >&2
    exit 1
  fi
  if [[ ! -x "${UPDATE_SCRIPT}" ]]; then
    echo "WARN: 更新スクリプトに実行権限がありません（launchd は /bin/bash 経由なので動作はします）: ${UPDATE_SCRIPT}" >&2
  fi
  if [[ "${ROOT}" == *"|"* ]]; then
    echo "ERROR: リポジトリパスに '|' が含まれており、plist を生成できません: ${ROOT}" >&2
    exit 1
  fi
}

# 生成済み plist の置換漏れと参照パスを検証する。
validate_generated_plist() {
  local target="$1"
  if grep -q '__REPO_ROOT__' "${target}"; then
    echo "ERROR: plist へのパス置換に失敗しました: ${target}" >&2
    exit 1
  fi
  if ! grep -q "${UPDATE_SCRIPT}" "${target}"; then
    echo "ERROR: 生成 plist に更新スクリプトパスが含まれていません: ${UPDATE_SCRIPT}" >&2
    exit 1
  fi
  if command -v plutil >/dev/null 2>&1; then
    if ! plutil -lint "${target}" >/dev/null; then
      echo "ERROR: plist の構文チェックに失敗しました: ${target}" >&2
      plutil -lint "${target}" >&2 || true
      exit 1
    fi
  fi
}

write_plist() {
  local dest="${1:-${PLIST}}"
  validate_inputs
  mkdir -p "$(dirname "${dest}")" "${ROOT}/logs"
  sed "s|__REPO_ROOT__|${ROOT}|g" "${TEMPLATE}" >"${dest}"
  validate_generated_plist "${dest}"
}

install_job() {
  require_darwin
  write_plist "${PLIST}"

  launchctl bootout "${SERVICE}" 2>/dev/null || true
  launchctl bootstrap "${DOMAIN}" "${PLIST}"

  if ! is_loaded; then
    echo "ERROR: 登録に失敗しました（launchctl print ${SERVICE} を確認）。" >&2
    exit 1
  fi

  echo "登録しました: ${LABEL}"
  echo "  plist : ${PLIST}"
  echo "  実行  : 毎日 17:10（scripts/daily-card-update.sh --quiet）"
  echo "  ログ  : ${ROOT}/logs/card-update.log"
  echo ""
  echo "確認: launchctl print ${SERVICE} | head -20"
  echo "即実行: bash scripts/launchd/install.sh --run-now"
  echo "解除:   bash scripts/launchd/install.sh --uninstall"
}

show_status() {
  require_darwin
  echo "label : ${LABEL}"
  echo "plist : ${PLIST}"
  if [[ -f "${PLIST}" ]]; then
    echo "file  : 存在する"
  else
    echo "file  : 未作成（未登録）"
  fi
  if is_loaded; then
    echo "state : loaded"
    launchctl print "${SERVICE}" 2>/dev/null | head -30 || true
  else
    echo "state : not loaded"
    echo "登録: bash scripts/launchd/install.sh"
  fi
}

dry_run() {
  local tmp
  tmp="$(mktemp "${TMPDIR:-/tmp}/com.loveca.card-update.XXXXXX")"
  # 失敗時も一時ファイルを残さない
  # shellcheck disable=SC2064
  trap "rm -f '${tmp}'" EXIT

  write_plist "${tmp}"

  echo "dry-run OK"
  echo "  os      : $(uname -s)"
  echo "  root    : ${ROOT}"
  echo "  script  : ${UPDATE_SCRIPT}"
  echo "  label   : ${LABEL}"
  echo "  schedule: 毎日 17:10（StartCalendarInterval）"
  echo "  sample  : ${tmp}"
  echo ""
  echo "--- generated plist (head) ---"
  head -n 40 "${tmp}"
}

case "${1:-}" in
  "")
    install_job
    ;;
  --uninstall)
    require_darwin
    launchctl bootout "${SERVICE}" 2>/dev/null || true
    rm -f "${PLIST}"
    echo "解除しました: ${LABEL}"
    ;;
  --run-now)
    require_darwin
    if ! is_loaded; then
      echo "未登録のため先に登録します..."
      install_job
    fi
    # -k: 実行中なら終了させてから起動（「今すぐ実行」）
    launchctl kickstart -k "${SERVICE}"
    echo "実行しました。ログ: logs/card-update.log"
    ;;
  --status)
    show_status
    ;;
  --dry-run)
    dry_run
    ;;
  -h|--help|help)
    usage
    ;;
  *)
    echo "ERROR: 未知の引数: $1" >&2
    echo "" >&2
    usage >&2
    exit 2
    ;;
esac
