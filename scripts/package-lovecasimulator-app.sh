#!/usr/bin/env bash
# LovecaSimulator.app にサイト本体と起動スクリプトを同梱する（.app 単体でも起動可能にする）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
APP="$ROOT/LovecaSimulator.app"
WWW="$APP/Contents/Resources/www"
RES="$APP/Contents/Resources"

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
  "$ROOT/js" \
  "$ROOT/assets" \
  "$ROOT/icons" \
  "$WWW/"

cp "$ROOT/scripts/start-oneclick.sh" "$RES/scripts/start-oneclick.sh"
chmod +x "$ROOT/LovecaSimulator.app/Contents/MacOS/LovecaSimulator"
chmod +x "$RES/scripts/start-oneclick.sh"

if [[ -x "$ROOT/scripts/build-macos-app-icon.sh" ]]; then
  "$ROOT/scripts/build-macos-app-icon.sh"
fi

echo "OK: 同梱完了（$(du -sh "$WWW" | awk '{print $1}')）"
echo "LovecaSimulator.app をどこに置いても起動できるようになりました。"
