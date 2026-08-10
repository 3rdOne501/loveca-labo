#!/usr/bin/env bash
# wlt233/llocg_db の cards.json を data/cards.json に取り込む（手動・自動共通）
#
# 上流の auto-commit はまれに空 `{}` を書き込むため、次の順で健全な版を探す:
#   1. 明示 URL（LL_OCG_CARDS_JSON_URL）/ master
#   2. GitHub API で json/cards.json を触った直近コミットを新しい順に走査
#   3. ピン留めコミット
# 取得した版が既存 data/cards.json より **少ない** 枚数ならダウングレードとして破棄する。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
DEST="${ROOT}/data/cards.json"
PIN="${LL_OCG_CARDS_JSON_PIN:-ddc00741}"
MIN_CARDS="${LL_OCG_MIN_CARDS:-50}"
REPO="${LL_OCG_CARDS_REPO:-wlt233/llocg_db}"
COMMIT_SCAN="${LL_OCG_COMMIT_SCAN:-20}"

mkdir -p "${ROOT}/data"
TMP="${DEST}.part"

count_cards() {
  python3 - "$1" <<'PY'
import json, sys
try:
    with open(sys.argv[1], encoding="utf-8") as f:
        data = json.load(f)
except Exception:
    print(-1)
    raise SystemExit(0)
if isinstance(data, list):
    print(len(data))
elif isinstance(data, dict):
    print(sum(1 for k in data if not str(k).startswith("_")))
else:
    print(-1)
PY
}

BASELINE=0
if [[ -s "${DEST}" ]]; then
  BASELINE="$(count_cards "${DEST}")"
  [[ "${BASELINE}" -lt 0 ]] && BASELINE=0
fi

# 候補 URL を順に試す。健全なら採用して 0 を返す。
try_url() {
  local url="$1"
  echo "取得: ${url}"
  if ! curl -fsSL --max-time 120 "${url}" -o "${TMP}"; then
    echo "  → 取得失敗" >&2
    return 1
  fi
  local n
  n="$(count_cards "${TMP}")"
  if [[ "${n}" -lt 0 ]]; then
    echo "  → JSON として不正" >&2
    return 1
  fi
  if [[ "${n}" -lt "${MIN_CARDS}" ]]; then
    echo "  → カード件数が不足: ${n} 件（最低 ${MIN_CARDS} 件）" >&2
    return 1
  fi
  if [[ "${n}" -lt "${BASELINE}" ]]; then
    echo "  → 既存 ${BASELINE} 枚より少ない ${n} 枚のためダウングレード扱いで破棄" >&2
    return 1
  fi
  echo "  検証 OK: ${n} 枚"
  return 0
}

# json/cards.json を触った直近コミットを新しい順に列挙（GitHub API・失敗時は空）
recent_commit_shas() {
  curl -fsSL --max-time 60 \
    "https://api.github.com/repos/${REPO}/commits?path=json/cards.json&per_page=${COMMIT_SCAN}" \
    2>/dev/null | python3 -c '
import json, sys
try:
    for c in json.load(sys.stdin):
        print(c["sha"])
except Exception:
    pass
' || true
}

ok=0
chosen_url=""

CANDIDATES=(
  "${LL_OCG_CARDS_JSON_URL:-https://cdn.jsdelivr.net/gh/${REPO}@master/json/cards.json}"
  "https://raw.githubusercontent.com/${REPO}/master/json/cards.json"
)

for url in "${CANDIDATES[@]}"; do
  if try_url "${url}"; then
    ok=1
    chosen_url="${url}"
    break
  fi
done

if [[ "${ok}" -ne 1 ]]; then
  echo "master が健全でないため、直近コミットを新しい順に走査します。"
  while read -r sha; do
    [[ -n "${sha}" ]] || continue
    if try_url "https://raw.githubusercontent.com/${REPO}/${sha}/json/cards.json"; then
      ok=1
      chosen_url="${REPO}@${sha}"
      break
    fi
  done < <(recent_commit_shas)
fi

if [[ "${ok}" -ne 1 ]]; then
  for url in \
    "https://cdn.jsdelivr.net/gh/${REPO}@${PIN}/json/cards.json" \
    "https://raw.githubusercontent.com/${REPO}/${PIN}/json/cards.json"; do
    if try_url "${url}"; then
      ok=1
      chosen_url="${url}"
      break
    fi
  done
fi

if [[ "${ok}" -ne 1 ]]; then
  rm -f "${TMP}"
  if [[ -s "${DEST}" ]]; then
    echo "エラー: 健全な cards.json を取得できませんでした。既存の ${DEST}（${BASELINE} 枚）を維持します。" >&2
  else
    echo "エラー: 健全な cards.json を取得できず、${DEST} もありません。" >&2
  fi
  exit 1
fi

if [[ -s "${DEST}" ]] && cmp -s "${TMP}" "${DEST}"; then
  rm -f "${TMP}"
  echo "変更なし: ${DEST}（${BASELINE} 枚・ソース: ${chosen_url}）"
  exit 0
fi

mv "${TMP}" "${DEST}"
echo "書き込み: ${DEST}（ソース: ${chosen_url}）"
