#!/usr/bin/env bash
# カードリスト日次更新の launchd ジョブを登録／解除する。
#
#   bash scripts/launchd/install.sh              # 登録（設定を変えた後の再登録も同じ）
#   bash scripts/launchd/install.sh --run-now    # 今すぐ実行
#   bash scripts/launchd/install.sh --uninstall  # 解除
#
# その他:
#   bash scripts/launchd/install.sh --status     # 登録状態を表示
#   bash scripts/launchd/install.sh --help       # 用法
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LABEL="com.loveca.card-update"
AGENT_DIR="${HOME}/Library/LaunchAgents"
PLIST="${AGENT_DIR}/${LABEL}.plist"
TEMPLATE="${SCRIPT_DIR}/${LABEL}.plist"
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
  bash scripts/launchd/install.sh --help       # このヘルプ

実行時刻: 毎日 17:10（日本時間想定・ローカル時計）
ログ:     logs/card-update.log / logs/launchd.{out,err}.log
EOF
}

require_darwin() {
  if [[ "$(uname -s)" != "Darwin" ]]; then
    echo "ERROR: launchd は macOS 専用です（現在: $(uname -s)）。" >&2
    echo "Linux / CI では直接実行してください:" >&2
    echo "  bash scripts/daily-card-update.sh" >&2
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

install_job() {
  require_darwin
  if [[ ! -f "${TEMPLATE}" ]]; then
    echo "ERROR: テンプレートがありません: ${TEMPLATE}" >&2
    exit 1
  fi

  mkdir -p "${AGENT_DIR}" "${ROOT}/logs"
  sed "s|__REPO_ROOT__|${ROOT}|g" "${TEMPLATE}" >"${PLIST}"

  launchctl bootout "${SERVICE}" 2>/dev/null || true
  launchctl bootstrap "${DOMAIN}" "${PLIST}"

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
    echo "plist : 存在する"
  else
    echo "plist : 未作成（未登録）"
  fi
  if is_loaded; then
    echo "state : loaded"
    launchctl print "${SERVICE}" 2>/dev/null | head -30 || true
  else
    echo "state : not loaded"
    echo "登録: bash scripts/launchd/install.sh"
  fi
}

case "${1:-}" in
  "" )
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
    launchctl kickstart -k "${SERVICE}"
    echo "実行しました。ログ: logs/card-update.log"
    ;;
  --status)
    show_status
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
