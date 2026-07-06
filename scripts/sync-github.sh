#!/usr/bin/env bash
# 変更があれば git add -A → 時刻付きコミット → pull --rebase → push（ワンショットで GitHub へ）
set -euo pipefail

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]:-$0}")" && pwd)"
ROOT="$(cd "${SCRIPT_DIR}/.." && pwd)"
cd "$ROOT"

REMOTE="${LL_OCG_GIT_REMOTE:-origin}"
COMMIT_CREATED=0
LAST_COMMIT_HASH=""

print_local_ahead_hint() {
  local ahead
  ahead="$(git rev-list --count "${REMOTE}/${BRANCH}..HEAD" 2>/dev/null || echo 0)"
  if [[ "${ahead}" -gt 0 ]]; then
    echo
    echo "※ ローカルには ${ahead} 件の未 push コミットがあります（コミット自体は成功している可能性があります）。"
    git log --oneline "${REMOTE}/${BRANCH}..HEAD" 2>/dev/null | sed 's/^/    /' || true
  fi
}

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

SYNC_CARDS="${ROOT}/scripts/sync-cards-json.sh"
if [[ -x "$SYNC_CARDS" ]] && command -v curl >/dev/null 2>&1 && command -v python3 >/dev/null 2>&1; then
  echo "カード DB（llocg_db）を確認しています..."
  if bash "$SYNC_CARDS"; then
    echo "cards.json 同期 OK"
  else
    echo "警告: cards.json の同期に失敗しました（既存ファイルで続行）" >&2
  fi
  echo
fi

INDEX_BUILD="${ROOT}/scripts/build-ability-index.mjs"
if [[ -f "$INDEX_BUILD" ]] && command -v node >/dev/null 2>&1; then
  echo "能力 index を再生成しています..."
  node "$INDEX_BUILD" || echo "警告: build-ability-index に失敗しました" >&2
  echo
fi

if [[ -f .git/index.lock ]]; then
  echo "エラー: .git/index.lock が残っています。別の git 操作が実行中か、前回が異常終了した可能性があります。"
  echo "  他の git / Cursor / GitHub Desktop を閉じてから再実行してください。"
  exit 1
fi

if [[ -n "$(git status --porcelain 2>/dev/null)" ]]; then
  echo "変更をステージしています (git add -A) ..."
  git add -A
  if git diff --cached --quiet; then
    echo "（ステージできる差分がありませんでした）"
  else
    MSG="chore: sync $(date +'%Y-%m-%d %H:%M:%S')"
    echo "コミットしています: $MSG"
    if ! git commit -m "$MSG"; then
      echo
      echo "エラー: git commit に失敗しました。"
      echo "  - 上の git メッセージを確認してください"
      echo "  - index.lock が残っていないか確認してください"
      exit 1
    fi
    COMMIT_CREATED=1
    LAST_COMMIT_HASH="$(git rev-parse --short HEAD)"
    echo "コミット成功: ${LAST_COMMIT_HASH}"
  fi
else
  echo "未コミットの変更はありません。"
fi

echo
echo "リモートの最新を取り込みます (git fetch && git rebase) ..."
if ! git fetch "$REMOTE"; then
  echo "エラー: git fetch に失敗しました。ネットワークと認証を確認してください。"
  print_local_ahead_hint
  exit 1
fi
if ! git rebase "${REMOTE}/${BRANCH}"; then
  echo
  echo "エラー: git rebase に失敗しました（コンフリクトの可能性）。"
  echo "  手元で解決する例: 該当ファイルを直す → git add ... → git rebase --continue"
  echo "  取りやめる例: git rebase --abort"
  print_local_ahead_hint
  exit 1
fi

echo
echo "GitHub に送っています (git push) ..."
PUSH_OK=0
for attempt in 1 2 3; do
  # .app 同梱などでパックが大きいと HTTP 400 になることがあるためバッファを拡大
  if git -c http.postBuffer=524288000 push "$REMOTE" "$BRANCH"; then
    PUSH_OK=1
    break
  fi
  if [[ "$attempt" -lt 3 ]]; then
    echo "警告: push 失敗（${attempt}/3）。5 秒後に再試行します..." >&2
    sleep 5
  fi
done

if [[ "$PUSH_OK" -ne 1 ]]; then
  echo
  echo "エラー: git push に失敗しました（3 回試行）。"
  if [[ "$COMMIT_CREATED" -eq 1 ]]; then
    echo "  ※ コミット (${LAST_COMMIT_HASH}) はローカルに保存済みです。push だけ未完了です。"
  fi
  echo "  - ネットワーク・GitHub ログイン（Personal Access Token 等）を確認"
  echo "  - Finder の .command から実行した場合、ターミナル.app から同スクリプトを試すと認証が通ることがあります"
  echo "  - 再試行: git -c http.postBuffer=524288000 push $REMOTE $BRANCH"
  print_local_ahead_hint
  exit 1
fi

echo
echo "完了しました。"
if [[ "$COMMIT_CREATED" -eq 1 ]]; then
  echo "  コミット: ${LAST_COMMIT_HASH}"
fi
echo "  https://github.com/3rdOne501/loveca-labo (branch: ${BRANCH})"
