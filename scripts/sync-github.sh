#!/usr/bin/env bash
# 変更があれば git add -A → 時刻付きコミット → git push（ワンショットで GitHub へ）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

REMOTE="${LL_OCG_GIT_REMOTE:-origin}"

if ! git rev-parse --is-inside-work-tree >/dev/null 2>&1; then
  echo "エラー: ここは Git リポジトリではありません。"
  exit 1
fi

BRANCH="$(git branch --show-current || true)"
if [[ -z "$BRANCH" ]]; then
  echo "エラー: ブランチが取れません（detached HEAD など）。push しません。"
  exit 1
fi

echo "リポジトリ: $ROOT"
echo "ブランチ: $BRANCH  →  $REMOTE/$BRANCH"
echo

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "変更をステージしています (git add -A) ..."
  git add -A
  if git diff --cached --quiet; then
    echo "（ステージできる差分がありませんでした）"
  else
    MSG="chore: sync $(date +'%Y-%m-%d %H:%M:%S')"
    echo "コミットしています: $MSG"
    git commit -m "$MSG"
  fi
else
  echo "未コミットの変更はありません（そのまま push のみ）。"
fi

echo
echo "GitHub に送っています (git push) ..."
git push "$REMOTE" "$BRANCH"
echo
echo "完了しました。"
