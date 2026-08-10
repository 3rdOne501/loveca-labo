#!/usr/bin/env bash
# カードリスト日次更新の launchd ジョブを登録／解除する。
#   登録: bash scripts/launchd/install.sh
#   解除: bash scripts/launchd/install.sh --uninstall
#   即実行: bash scripts/launchd/install.sh --run-now
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/../.." && pwd)"
LABEL="com.loveca.card-update"
AGENT_DIR="${HOME}/Library/LaunchAgents"
PLIST="${AGENT_DIR}/${LABEL}.plist"
TEMPLATE="${SCRIPT_DIR}/${LABEL}.plist"
UID_NUM="$(id -u)"

case "${1:-}" in
  --uninstall)
    launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true
    rm -f "${PLIST}"
    echo "解除しました: ${LABEL}"
    exit 0
    ;;
  --run-now)
    launchctl kickstart -p "gui/${UID_NUM}/${LABEL}"
    echo "実行しました。ログ: logs/card-update.log"
    exit 0
    ;;
esac

mkdir -p "${AGENT_DIR}" "${ROOT}/logs"
sed "s|__REPO_ROOT__|${ROOT}|g" "${TEMPLATE}" >"${PLIST}"

launchctl bootout "gui/${UID_NUM}/${LABEL}" 2>/dev/null || true
launchctl bootstrap "gui/${UID_NUM}" "${PLIST}"

echo "登録しました: ${LABEL}"
echo "  plist : ${PLIST}"
echo "  実行  : 毎日 17:10（scripts/daily-card-update.sh --quiet）"
echo "  ログ  : ${ROOT}/logs/card-update.log"
echo ""
echo "確認: launchctl print gui/${UID_NUM}/${LABEL} | head -20"
echo "即実行: bash scripts/launchd/install.sh --run-now"
echo "解除:   bash scripts/launchd/install.sh --uninstall"
