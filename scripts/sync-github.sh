#!/usr/bin/env bash
# 変更があれば git add -A → 時刻付きコミット → pull --rebase → push（ワンショットで GitHub へ）
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
  echo "未コミットの変更はありません。"
fi

echo
echo "リモートの最新を取り込みます (git fetch && git pull --rebase) ..."
if ! git fetch "$REMOTE" 2>/dev/null; then
  echo "警告: git fetch に失敗しました。ネットワークと認証を確認してください。"
  exit 1
fi
if ! git pull --rebase "$REMOTE" "$BRANCH"; then
  echo
  echo "エラー: git pull --rebase に失敗しました（コンフリクトの可能性）。"
  echo "  手元で解決する例: 該当ファイルを直す → git add ... → git rebase --continue"
  echo "  取りやめる例: git rebase --abort"
  exit 1
fi

echo
echo "GitHub に送っています (git push) ..."
# .app 同梱などでパックが大きいと HTTP 400 になることがあるためバッファを拡大
if ! git -c http.postBuffer=524288000 push "$REMOTE" "$BRANCH"; then
  echo
  echo "エラー: git push に失敗しました。"
  echo "  - ネットワーク・GitHub ログイン（Personal Access Token 等）を確認"
  echo "  - 再試行: git -c http.postBuffer=524288000 push $REMOTE $BRANCH"
  exit 1
fi
echo
echo "完了しました。"
echo "  https://github.com/3rdOne501/loveca-labo （ブランチ: $BRANCH）"
