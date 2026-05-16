#!/usr/bin/env bash
# ダブルクリックで Loveca Labo をローカル起動（ターミナルは一瞬だけ表示）
set -uo pipefail
DIR="$(cd "$(dirname "$0")" && pwd)"
export LL_OCG_ROOT="$DIR"
export LL_OCG_KILL_EXISTING_PORT=1
LOG="${HOME}/Library/Logs/LovecaLabo/launcher-command.log"
mkdir -p "$(dirname "$LOG")" 2>/dev/null || true
{
  echo "=== $(date '+%Y-%m-%d %H:%M:%S') ==="
  echo "DIR=$DIR"
} >>"$LOG"
if [[ -x "$DIR/LovecaSimulator.app/Contents/MacOS/LovecaSimulator" ]]; then
  exec "$DIR/LovecaSimulator.app/Contents/MacOS/LovecaSimulator" >>"$LOG" 2>&1
fi
if [[ -f "$DIR/scripts/start-oneclick.sh" ]]; then
  exec /bin/bash "$DIR/scripts/start-oneclick.sh" >>"$LOG" 2>&1
fi
osascript -e 'display alert "Loveca Labo" message "起動スクリプトが見つかりません。ll-ocg-tools フォルダごとコピーしているか確認してください。" as warning' 2>/dev/null || true
exit 1
