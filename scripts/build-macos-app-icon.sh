#!/usr/bin/env bash
# LovecaSimulator.app 用 .icns を生成し、同梱起動スクリプトも同期する（macOS）
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/icons/simulator-app-icon.png}"
if [[ ! -f "$SRC" ]]; then
  SRC="$ROOT/icons/icon-512.png"
fi
APP_RESOURCES="$ROOT/LovecaSimulator.app/Contents/Resources"
ICONSET="$APP_RESOURCES/AppIcon.iconset"
REAL_PNG="${TMPDIR:-/tmp}/loveca-app-icon-src-$$.png"

if [[ ! -f "$SRC" ]]; then
  echo "ソース画像がありません: $SRC"
  exit 1
fi

mkdir -p "$APP_RESOURCES/scripts"
cp "$ROOT/scripts/start-oneclick.sh" "$APP_RESOURCES/scripts/start-oneclick.sh"
chmod +x "$APP_RESOURCES/scripts/start-oneclick.sh" "$ROOT/LovecaSimulator.app/Contents/MacOS/LovecaSimulator"

# JPEG 偽装 PNG などを正規 PNG に変換してから iconset を作る
sips -s format png "$SRC" --out "$REAL_PNG" >/dev/null

rm -rf "$ICONSET"
mkdir -p "$ICONSET"
sips -z 16 16     "$REAL_PNG" --out "$ICONSET/icon_16x16.png"      >/dev/null
sips -z 32 32     "$REAL_PNG" --out "$ICONSET/icon_16x16@2x.png"  >/dev/null
sips -z 32 32     "$REAL_PNG" --out "$ICONSET/icon_32x32.png"      >/dev/null
sips -z 64 64     "$REAL_PNG" --out "$ICONSET/icon_32x32@2x.png"  >/dev/null
sips -z 128 128   "$REAL_PNG" --out "$ICONSET/icon_128x128.png"    >/dev/null
sips -z 256 256   "$REAL_PNG" --out "$ICONSET/icon_128x128@2x.png" >/dev/null
sips -z 256 256   "$REAL_PNG" --out "$ICONSET/icon_256x256.png"    >/dev/null
sips -z 512 512   "$REAL_PNG" --out "$ICONSET/icon_256x256@2x.png" >/dev/null
sips -z 512 512   "$REAL_PNG" --out "$ICONSET/icon_512x512.png"    >/dev/null
sips -z 1024 1024 "$REAL_PNG" --out "$ICONSET/icon_512x512@2x.png" >/dev/null

iconutil -c icns "$ICONSET" -o "$APP_RESOURCES/AppIcon.icns"
rm -rf "$ICONSET" "$REAL_PNG"

# PWA 用も同じ見た目に揃える（任意）
if [[ -x "$ROOT/scripts/build-pwa-icons.sh" ]]; then
  "$ROOT/scripts/build-pwa-icons.sh" "$SRC" 2>/dev/null || true
fi

echo "OK: $APP_RESOURCES/AppIcon.icns"
ls -la "$APP_RESOURCES/AppIcon.icns"
