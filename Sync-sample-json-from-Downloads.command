#!/bin/bash
# Finder でダブルクリック → ダウンロード済み JSON を sample-deck-recipes.public.json に反映し、Downloads の古いコピーを消す
cd "$(dirname "$0")" || exit 1
bash ./scripts/sync-sample-json-from-downloads.sh
echo
read -r -p "Enter キーでウィンドウを閉じます... " _
