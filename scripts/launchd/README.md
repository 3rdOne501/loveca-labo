# launchd: カードリスト日次更新

macOS の LaunchAgents で `scripts/daily-card-update.sh` を毎日 17:10 に実行する。

## 使い方

```bash
bash scripts/launchd/install.sh              # 登録（設定を変えた後の再登録も同じ）
bash scripts/launchd/install.sh --run-now    # 今すぐ実行
bash scripts/launchd/install.sh --uninstall  # 解除
```

補助コマンド:

```bash
bash scripts/launchd/install.sh --status     # 登録状態
bash scripts/launchd/install.sh --dry-run    # plist 生成検証（Linux / CI 可）
bash scripts/launchd/install.sh --help
```

## 補足

- Label: `com.loveca.card-update`
- 実体: `scripts/daily-card-update.sh --quiet`
- ログ: `logs/card-update.log`, `logs/launchd.out.log`, `logs/launchd.err.log`
- Linux / CI では launchctl は使えない。更新パイプライン自体は `bash scripts/daily-card-update.sh`、plist 検証は `--dry-run`
