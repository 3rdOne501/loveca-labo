# ll-ocg-tools 共通作業ルール

This project uses custom instructions, capabilities and data to optimize work on ll-ocg-tools.

## Cursor / GPT 共通の引き継ぎ（必須）

- 作業開始時に `docs/HANDOFF.md` を読み、既存の変更と未完了項目を確認する。
- 調査・実装・検証・方針変更を行った各作業の終了前に、必ず `docs/HANDOFF.md` を更新する。長時間の作業では途中経過も更新する。
- 実施内容、変更ファイル、実行コマンドと成否、既存の失敗、未検証事項、次に行う作業、公開／アプリ同期状況を残す。会話だけに重要な仕様や判断を残さない。
- 最新状態は `docs/HANDOFF.md` を正本とし、作業履歴は `docs/WORKLOG.md` に追記する。過去の判断を上書きして消さない。
- 検証成功と実プレイ確認、分類済みと正しい実装を区別する。監査の「要確認」を「対応済み」と表現しない。
- 能力修正では既存の `.cursor/rules/card-fix-workflow.mdc` と類似効果の横展開ルールを確認する。
- 能力文・分類器・ハンドラ・契約定義の変更後は `npm run audit:abilities` と `npm run test:ability-audit` を実行し、監査結果も引き継ぐ。新規データの自動更新でも同じ監査を実行する。
- 監査の指摘を消すために閾値を緩めたり、契約未定義を合格にしたり、カード番号が既出という理由で除外しない。
- 依頼のないコミット・push・公開はしない。既存のユーザー変更を保持する。
