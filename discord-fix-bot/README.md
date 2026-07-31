# Discord → Cursor Agent カード修正 Bot（PoC）

## やること

1. Discord Developer Portal で Bot 作成 → Token 取得
2. Privileged Intent の **Message Content Intent** を ON
3. 対象サーバーに Bot を招待（`applications.commands` 不要、メッセージ読む権限があれば可）
4. 修正指示用チャンネルの ID をコピー
5. Cursor API key を [Integrations](https://cursor.com/dashboard/integrations) で発行
6. このディレクトリで:

```bash
cp .env.example .env
# .env を編集
npm install
npm test
npm start
# または DRY_RUN=true npm start
```

## 投稿フォーマット

```
カード番号：PL!S-bp3-006-SEC
バグ内容：起動使うと善子も控え行く
追記（あれば）：
```

同一チャンネルに上記が揃ったメッセージがあると受付 →（キュー）→ Cursor Agent 起動 → 結果を返信。

## GitHub 自動適用

`GITHUB_APPLY_MODE`（要 `git push` 権限。既定は `push`）:

| 値 | 動作 |
|---|---|
| `off` | 反映しない |
| `push` | 現在ブランチへ commit → push（直適用・既定） |
| `pr` | `fix/discord-…` ブランチへ commit → push → PR |

Agent 側は commit しない。Bot が成功後に一括反映する。起動前に作業ツリーが dirty だと中断。

## 注意

- 同時実行は 1 本（キュー）
- 本番は `REQUIRE_MENTION=true` や専用ロール推奨
- `push` は今いるブランチ（だいたい main）に直接載る
