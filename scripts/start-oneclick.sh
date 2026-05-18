#!/usr/bin/env bash
# 静的サイトをローカルで配信してブラウザを開く（ワンクリック／LovecaSimulator.app 共通）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"

# リポジトリルート（index.html があるディレクトリ）を決める
resolve_root() {
  if [[ -n "${LL_OCG_ROOT:-}" && -f "${LL_OCG_ROOT}/index.html" ]]; then
    (cd "${LL_OCG_ROOT}" && pwd)
    return 0
  fi
  # scripts/ のひとつ上が通常の ll-ocg-tools ルート
  if [[ -f "${SCRIPT_DIR}/../index.html" ]]; then
    (cd "${SCRIPT_DIR}/.." && pwd)
    return 0
  fi
  # .app 内 Resources/www に同梱している場合
  if [[ -f "${SCRIPT_DIR}/../Resources/www/index.html" ]]; then
    (cd "${SCRIPT_DIR}/../Resources/www" && pwd)
    return 0
  fi
  if [[ -f "${SCRIPT_DIR}/../../Resources/www/index.html" ]]; then
    (cd "${SCRIPT_DIR}/../../Resources/www" && pwd)
    return 0
  fi
  return 1
}

alert_user() {
  local msg="$1"
  if command -v osascript >/dev/null 2>&1; then
    osascript -e "display alert \"Loveca Simulator\" message \"${msg//\"/\\\"}\" as warning" 2>/dev/null || true
  fi
  echo "Loveca Simulator: $msg" >&2
}

ROOT="$(resolve_root)" || {
  alert_user "index.html が見つかりません。LovecaSimulator.app を ll-ocg-tools フォルダ内に置いてください。"
  exit 1
}

BASE_PORT="${LOCAL_PORT:-8844}"
PORT=""
PID_FILE=""
URL=""

server_serves_loveca() {
  local base="$1"
  if ! command -v curl >/dev/null 2>&1; then
    return 0
  fi
  local body=""
  body="$(curl -sf --max-time 2 "${base}/index.html" 2>/dev/null)" || return 1
  [[ "${#body}" -gt 200 ]] || return 1
  case "$body" in
    *"Loveca Labo"*|*"loveca-labo"*|*"llocg"*|*"deckbuilder"*) return 0 ;;
  esac
  return 1
}

port_listening() {
  local p="$1"
  if command -v lsof >/dev/null 2>&1; then
    lsof -i ":${p}" -sTCP:LISTEN >/dev/null 2>&1
  elif command -v nc >/dev/null 2>&1; then
    nc -z 127.0.0.1 "$p" 2>/dev/null
  else
    return 1
  fi
}

start_server_on_port() {
  local p="$1"
  PID_FILE="${TMPDIR:-/tmp}/loveca-local-http.${p}.pid"
  cd "$ROOT"
  if command -v lsof >/dev/null 2>&1 && lsof -i ":${p}" -sTCP:LISTEN >/dev/null 2>&1; then
    lsof -ti ":${p}" 2>/dev/null | xargs kill -9 2>/dev/null || true
    sleep 0.2
  fi
  python3 -m http.server "$p" --bind 127.0.0.1 --directory "$ROOT" >/dev/null 2>&1 &
  echo $! >"$PID_FILE"
  disown 2>/dev/null || true
  local n=0
  while [[ "$n" -lt 8 ]]; do
    if server_serves_loveca "http://127.0.0.1:${p}"; then
      return 0
    fi
    n=$((n + 1))
    sleep 0.2
  done
  if [[ -f "$PID_FILE" ]]; then
    kill "$(cat "$PID_FILE")" 2>/dev/null || true
    rm -f "$PID_FILE"
  fi
  return 1
}

# 8844 から順に空き／正しいサーバを探す
for try in $(seq 0 10); do
  candidate=$((BASE_PORT + try))
  base="http://127.0.0.1:${candidate}"
  if port_listening "$candidate"; then
    if server_serves_loveca "$base"; then
      PORT="$candidate"
      URL="${base}/index.html"
      break
    fi
    continue
  fi
  if start_server_on_port "$candidate"; then
    PORT="$candidate"
    URL="${base}/index.html"
    break
  fi
done

if [[ -z "$URL" ]]; then
  alert_user "ローカルサーバを起動できませんでした（ポート ${BASE_PORT}〜$((BASE_PORT + 10)) が使用中の可能性があります）。他のアプリを終了するか、ターミナルで LOCAL_PORT=8855 ./scripts/start-oneclick.sh を試してください。"
  exit 1
fi

if ! command -v open >/dev/null 2>&1; then
  alert_user "ブラウザを開けません（macOS の open コマンドがありません）。次の URL を手動で開いてください: ${URL}"
  exit 1
fi

open "$URL"
