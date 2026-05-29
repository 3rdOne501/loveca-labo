#!/usr/bin/env bash
# wlt233/llocg_db の cards.json を data/cards.json に取り込む（手動・CI 共通）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEST="${ROOT}/data/cards.json"
URL="${LL_OCG_CARDS_JSON_URL:-https://cdn.jsdelivr.net/gh/wlt233/llocg_db@master/json/cards.json}"

mkdir -p "${ROOT}/data"
TMP="${DEST}.part"

echo "取得: ${URL}"
curl -fsSL --max-time 120 "${URL}" -o "${TMP}"

python3 - <<'PY' "${TMP}"
import json, sys
path = sys.argv[1]
with open(path, encoding="utf-8") as f:
    data = json.load(f)
if not isinstance(data, dict):
    raise SystemExit("cards.json はオブジェクト形式である必要があります")
n = sum(1 for k in data if not str(k).startswith("_"))
print(f"検証 OK: {n} 枚（キー総数 {len(data)}）")
PY

mv "${TMP}" "${DEST}"
echo "書き込み: ${DEST}"
