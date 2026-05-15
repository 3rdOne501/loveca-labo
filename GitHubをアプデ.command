#!/bin/bash
# Finder からダブルクリック → ターミナルで GitHub へ同期（初回のみ chmod +x が必要な場合あり）
cd "$(dirname "$0")" || exit 1
bash ./scripts/sync-github.sh
echo
read -r -p "Enter キーでウィンドウを閉じます... " _
