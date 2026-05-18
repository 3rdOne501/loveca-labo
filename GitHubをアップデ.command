#!/bin/bash
# Finder からダブルクリック → 変更をコミットして GitHub へ push
# 初回のみ: ターミナルで chmod +x "GitHubをアップデ.command"
cd "$(dirname "$0")" || exit 1
echo "Loveca Labo → GitHub 同期を開始します..."
echo
if ! bash ./scripts/sync-github.sh; then
  echo
  echo "同期に失敗しました。上のメッセージを確認してください。"
  read -r -p "Enter キーでウィンドウを閉じます... " _
  exit 1
fi
echo
read -r -p "Enter キーでウィンドウを閉じます... " _
