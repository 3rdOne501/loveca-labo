#!/usr/bin/env bash
# LovecaSimulator.app にサイト本体と起動スクリプトを同梱する（.app 単体でも起動可能にする）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/LovecaSimulator.app"
WWW="$APP/Contents/Resources/www"
RES="$APP/Contents/Resources"
DATA_DIR="$ROOT/data"
CARDS_JSON_SRC="${DATA_DIR}/cards.json"
SYNC_SCRIPT="$ROOT/scripts/sync-cards-json.sh"

mkdir -p "$DATA_DIR"
if [[ -x "$SYNC_SCRIPT" ]]; then
  echo "カード DB を同期..."
  if ! bash "$SYNC_SCRIPT"; then
    if [[ ! -s "$CARDS_JSON_SRC" ]]; then
      echo "エラー: data/cards.json が無く、同期にも失敗しました。" >&2
      exit 1
    fi
    echo "警告: 同期失敗。既存の data/cards.json を同梱します。" >&2
  fi
elif [[ ! -s "$CARDS_JSON_SRC" ]]; then
  echo "エラー: data/cards.json がありません。scripts/sync-cards-json.sh を用意してください。" >&2
  exit 1
fi

echo "同梱先: $WWW"
rm -rf "$WWW"
mkdir -p "$WWW" "$RES/scripts"

rsync -a --delete \
  --exclude '.git' \
  --exclude 'node_modules' \
  --exclude 'LovecaSimulator.app' \
  --exclude '.DS_Store' \
  "$ROOT/index.html" \
  "$ROOT/styles.css" \
  "$ROOT/site.webmanifest" \
  "$ROOT/sample-deck-recipes.public.json" \
  "$ROOT/data" \
  "$ROOT/js" \
  "$ROOT/assets" \
  "$ROOT/icons" \
  "$WWW/"

cp "$ROOT/scripts/start-oneclick.sh" "$RES/scripts/start-oneclick.sh"
cp "$ROOT/scripts/loveca_dev_server.py" "$RES/scripts/loveca_dev_server.py"
chmod +x "$RES/scripts/loveca_dev_server.py" 2>/dev/null || true
chmod +x "$ROOT/LovecaSimulator.app/Contents/MacOS/LovecaSimulator"
chmod +x "$RES/scripts/start-oneclick.sh"

if [[ -x "$ROOT/scripts/build-macos-app-icon.sh" ]]; then
  "$ROOT/scripts/build-macos-app-icon.sh"
fi

echo "OK: 同梱完了（$(du -sh "$WWW" | awk '{print $1}')）"
echo "LovecaSimulator.app をどこに置いても起動できるようになりました。"
