#!/usr/bin/env bash
# 静的サイトをローカルで配信してブラウザを開く（ワンクリック／ターミナル共通）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
# .app/Contents/MacOS から起動される場合のリポジトリルート
if [[ -f "$(cd "${SCRIPT_DIR}/../../.." && pwd)/index.html" ]]; then
  ROOT="$(cd "${SCRIPT_DIR}/../../.." && pwd)"
else
  ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
fi

PORT="${LOCAL_PORT:-8844}"
PID_FILE="${TMPDIR:-/tmp}/loveca-local-http.${PORT}.pid"
URL="http://127.0.0.1:${PORT}/index.html"

started_by_us=0

if command -v curl >/dev/null 2>&1; then
  if curl -sf -o /dev/null --max-time 1 "$URL"; then
    :
  else
    started_by_us=1
  fi
else
  if command -v nc >/dev/null 2>&1; then
    if nc -z 127.0.0.1 "$PORT" 2>/dev/null; then
      :
    else
      started_by_us=1
    fi
  else
    started_by_us=1
  fi
fi

if [[ "$started_by_us" -eq 1 ]]; then
  if [[ -n "${LL_OCG_KILL_EXISTING_PORT:-}" ]]; then
    lsof -ti ":${PORT}" 2>/dev/null | xargs kill -9 2>/dev/null || true
  fi
  if command -v lsof >/dev/null 2>&1 && lsof -i ":${PORT}" >/dev/null 2>&1; then
    echo "ポート ${PORT} は使用中です。別ポートで起動しますか: LOCAL_PORT=8855 \"$0\""
    exit 1
  fi
  cd "$ROOT"
  python3 -m http.server "$PORT" --directory "$ROOT" >/dev/null 2>&1 &
  echo $! >"$PID_FILE"
  disown 2>/dev/null || true
  sleep 0.4
fi

exec open "$URL"
