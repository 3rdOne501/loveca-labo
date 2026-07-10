#!/bin/bash
# Finder でダブルクリック → cards.json 同期 + ability index 再生成 → push
cd "$(dirname "$0")" || exit 1
echo "========================================"
echo "  GitHub にアプデ（フル）"
echo "  cards.json / ability index 更新あり"
echo "========================================"
echo
if ! bash ./scripts/sync-github.sh; then
  echo
  echo "同期に失敗しました。上のメッセージを確認してください。"
  read -r -p "Enter キーでウィンドウを閉じます... " _
  exit 1
fi
echo
read -r -p "Enter キーでウィンドウを閉じます... " _
