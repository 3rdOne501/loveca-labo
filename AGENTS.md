# ll-ocg-tools 共通作業ルール

This project uses custom instructions, capabilities and data to optimize work on ll-ocg-tools.

## 総合ルール ver.1.09（絶対遵守・恒久）

- 正本は公式総合ルール **ver.1.09**（2026-11-11）。PDF・検索用テキスト・差分は [docs/rules/README.md](docs/rules/README.md)。alwaysApply の詳細は `.cursor/rules/lovelive-tcg-comprehensive-rules.mdc`。
- カード効果の実装・修正、ルール処理、バグ修正の前に、関係する条文を `docs/rules/LoveLiveTCG_comprehensive_rules_ver1.09.txt` で読む。実装が条文と矛盾しないこと、必要な条文を飛ばしていないことを確認してから書く。
- カード文が総合ルールと矛盾する場合はカード文を優先する（1.3.1）。推測で条文を補わない。節番号は ver.1.09 を使う（登場は 11.5、ライブ開始時は 11.6、ライブ成功時は 11.7。旧 8.3.15 の必要ハートは 8.3.16）。
- ver.1.06 の抽出と、それ以前の節番号を現行の根拠にしない。

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
