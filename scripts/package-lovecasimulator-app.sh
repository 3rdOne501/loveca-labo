#!/usr/bin/env bash
# LovecaSimulator.app にサイト本体と起動スクリプトを同梱する（.app 単体でも起動可能にする）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/LovecaSimulator.app"
WWW="$APP/Contents/Resources/www"
RES="$APP/Contents/Resources"
DATA_DIR="$ROOT/data"
CARDS_JSON_SRC="${DATA_DIR}/cards.json"
CARDS_JSON_URL="${LL_OCG_CARDS_JSON_URL:-https://cdn.jsdelivr.net/gh/wlt233/llocg_db@master/json/cards.json}"

mkdir -p "$DATA_DIR"
if [[ ! -s "$CARDS_JSON_SRC" ]]; then
  echo "カード DB を取得: $CARDS_JSON_URL"
  if ! curl -fsSL --max-time 120 "$CARDS_JSON_URL" -o "$CARDS_JSON_SRC.part"; then
    echo "警告: data/cards.json の取得に失敗しました（オンライン時は CDN から取得します）" >&2
    rm -f "$CARDS_JSON_SRC.part"
  else
    mv "$CARDS_JSON_SRC.part" "$CARDS_JSON_SRC"
  fi
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
