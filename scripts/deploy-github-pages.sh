#!/usr/bin/env bash
# 静的サイトを gh-pages ブランチへ force-push（GitHub Pages 用）。
# main 直配信は LovecaSimulator.app 等が重くビルド失敗しやすいため、軽量ツリーを別ブランチへ載せる。
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
REMOTE="${LL_OCG_GIT_REMOTE:-origin}"
STAGE="$(mktemp -d "${TMPDIR:-/tmp}/loveca-pages.XXXXXX")"
cleanup() { rm -rf "$STAGE"; }
trap cleanup EXIT

echo "GitHub Pages 用ツリーを作成しています..."
mkdir -p "$STAGE"
rsync -a \
  --exclude '.git' \
  --exclude '.github' \
  --exclude 'node_modules' \
  --exclude 'LovecaSimulator.app' \
  --exclude 'discord-fix-bot' \
  --exclude 'donjara' \
  --exclude 'scripts' \
  --exclude 'docs' \
  --exclude '_site' \
  --exclude '.DS_Store' \
  --exclude '.cursor' \
  --exclude 'assets/playmat-drafts' \
  --exclude 'アイコンよう' \
  --exclude '*.command' \
  "$ROOT/" "$STAGE/"
touch "$STAGE/.nojekyll"

cd "$STAGE"
git init -q -b gh-pages
git config user.email "pages@loveca-labo.local"
git config user.name "loveca-pages"
git add -A
git -c commit.gpgsign=false commit -q -m "deploy pages $(date '+%Y-%m-%d %H:%M:%S')"
git remote add origin "$(cd "$ROOT" && git remote get-url "$REMOTE")"
echo "gh-pages へ push しています..."
git -c http.postBuffer=524288000 push -f origin gh-pages
echo "OK: https://3rdone501.github.io/loveca-labo/"
