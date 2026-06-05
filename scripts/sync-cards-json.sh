#!/usr/bin/env bash
# wlt233/llocg_db の cards.json を data/cards.json に取り込む（手動・CI 共通）
# master が空 `{}` のときはピン留めコミットへフォールバックする。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEST="${ROOT}/data/cards.json"
PIN="${LL_OCG_CARDS_JSON_PIN:-ddc00741}"
MIN_CARDS="${LL_OCG_MIN_CARDS:-50}"

DEFAULT_URLS=(
  "${LL_OCG_CARDS_JSON_URL:-https://cdn.jsdelivr.net/gh/wlt233/llocg_db@master/json/cards.json}"
  "https://cdn.jsdelivr.net/gh/wlt233/llocg_db@${PIN}/json/cards.json"
  "https://raw.githubusercontent.com/wlt233/llocg_db/${PIN}/json/cards.json"
  "https://raw.githubusercontent.com/wlt233/llocg_db/master/json/cards.json"
)

mkdir -p "${ROOT}/data"
TMP="${DEST}.part"

validate_cards_json() {
  python3 - <<'PY' "$1" "$MIN_CARDS"
import json, sys
path, min_s = sys.argv[1], sys.argv[2]
min_cards = int(min_s)
with open(path, encoding="utf-8") as f:
    data = json.load(f)
if isinstance(data, list):
    n = len(data)
elif isinstance(data, dict):
    n = sum(1 for k in data if not str(k).startswith("_"))
else:
    raise SystemExit("cards.json はオブジェクトまたは配列である必要があります")
if n < min_cards:
    raise SystemExit(f"カード件数が不足しています: {n} 件（最低 {min_cards} 件）")
print(f"検証 OK: {n} 枚")
PY
}

ok=0
chosen_url=""
for url in "${DEFAULT_URLS[@]}"; do
  echo "取得: ${url}"
  if ! curl -fsSL --max-time 120 "${url}" -o "${TMP}"; then
    echo "  → 取得失敗（次の URL を試します）" >&2
    continue
  fi
  if err="$(validate_cards_json "${TMP}" 2>&1)"; then
    echo "  ${err}"
    ok=1
    chosen_url="${url}"
    break
  else
    echo "  → ${err}（次の URL を試します）" >&2
  fi
done

if [[ "${ok}" -ne 1 ]]; then
  rm -f "${TMP}"
  if [[ -s "${DEST}" ]]; then
    echo "エラー: 有効な cards.json を取得できませんでした。既存の ${DEST} はそのまま残しています。" >&2
    validate_cards_json "${DEST}" || true
  else
    echo "エラー: 有効な cards.json を取得できず、${DEST} もありません。" >&2
  fi
  exit 1
fi

mv "${TMP}" "${DEST}"
echo "書き込み: ${DEST}（ソース: ${chosen_url}）"
