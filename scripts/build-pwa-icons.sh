#!/usr/bin/env bash
# ホーム画面／PWA 用アイコンを、正方形のマスター PNG から生成します（macOS の sips を使用）。
#
# 使い方:
#   1. チャットやデザインツールから、正方形（推奨 1024×1024 以上）の PNG を用意する
#   2. 次のいずれかの名前でこのリポジトリの icons/ に保存する:
#        icons/source-app-icon.png  （既定）
#        または第1引数でパスを指定:  ./scripts/build-pwa-icons.sh /path/to/your-icon.png
#   3. リポジトリ直下で実行:
#        chmod +x scripts/build-pwa-icons.sh
#        ./scripts/build-pwa-icons.sh
#
# 出力: icons/apple-touch-icon.png (180), icons/icon-192.png, icons/icon-512.png
# その後、ブラウザのキャッシュを消すかシークレットで開き直すとホーム追加時の見え方が更新されます。

set -euo pipefail
ROOT="$(cd "$(dirname "$0")/.." && pwd)"
SRC="${1:-$ROOT/icons/source-app-icon.png}"
OUT_DIR="$ROOT/icons"

if [[ ! -f "$SRC" ]]; then
  echo "マスター画像が見つかりません: $SRC"
  echo "正方形の PNG を上記パスに保存するか、引数でパスを渡してください。"
  exit 1
fi

mkdir -p "$OUT_DIR"
sips -z 180 180 "$SRC" --out "$OUT_DIR/apple-touch-icon.png" >/dev/null
sips -z 192 192 "$SRC" --out "$OUT_DIR/icon-192.png" >/dev/null
sips -z 512 512 "$SRC" --out "$OUT_DIR/icon-512.png" >/dev/null

echo "生成しました:"
ls -la "$OUT_DIR/apple-touch-icon.png" "$OUT_DIR/icon-192.png" "$OUT_DIR/icon-512.png"
