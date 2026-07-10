#!/bin/bash
# Finder でダブルクリック → 変更をコミットして GitHub (loveca-labo) へ push
# 初回のみ: chmod +x "GitHubにアプデ.command"
cd "$(dirname "$0")" || exit 1
echo "========================================"
echo "  GitHub にアプデ（クイック）"
echo "  loveca-labo / donjara など"
echo "========================================"
echo
if ! bash ./scripts/sync-github.sh --fast; then
  echo
  echo "同期に失敗しました。上のメッセージを確認してください。"
  read -r -p "Enter キーでウィンドウを閉じます... " _
  exit 1
fi
echo
read -r -p "Enter キーでウィンドウを閉じます... " _
