#!/usr/bin/env bash
# Downloads に溜まったサンプル公開用 JSON をリポジトリルートの正しい名前にコピーし、
# Downloads 内の同名パターンのファイルを削除する（Safari 等の連番付きダウンロード用）。
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
PROJECT_ROOT="$(cd "$SCRIPT_DIR/.." && pwd)"
DEST="${PROJECT_ROOT}/sample-deck-recipes.public.json"
DOWNLOADS="${HOME}/Downloads"

if [[ ! -d "$DOWNLOADS" ]]; then
  echo "エラー: Downloads フォルダが見つかりません: $DOWNLOADS"
  exit 1
fi

shopt -s nullglob
matches=("$DOWNLOADS"/sample-deck-recipes.public*.json)
shopt -u nullglob

if [[ ${#matches[@]} -eq 0 ]]; then
  echo "Downloads に sample-deck-recipes.public*.json がありません。"
  echo "（例: sample-deck-recipes.public.json / sample-deck-recipes.public-8.json）"
  exit 1
fi

newest=""
best=0
for f in "${matches[@]}"; do
  [[ -f "$f" ]] || continue
  m=0
  if stat -f %m "$f" &>/dev/null; then
    m=$(stat -f %m "$f")
  elif stat -c %Y "$f" &>/dev/null; then
    m=$(stat -c %Y "$f")
  fi
  if [[ $m -ge $best ]]; then
    best=$m
    newest="$f"
  fi
done

if [[ -z "$newest" ]] || [[ ! -f "$newest" ]]; then
  echo "エラー: コピー元ファイルを決められませんでした。"
  exit 1
fi

cp "$newest" "$DEST"
echo "反映しました:"
echo "  元: $newest"
echo "  先: $DEST"

# Downloads 側のブラウザ用コピーのみ削除（リポジトリ内のファイルは触らない）
for f in "${matches[@]}"; do
  [[ -f "$f" ]] || continue
  rm -f "$f"
done
echo "Downloads 内の sample-deck-recipes.public*.json は削除しました（ブラウザで落ちた分のみ）。"
