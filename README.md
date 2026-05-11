# Loveca Labo

ラブカ向けの**非公式**デッキ構築・ソロプレイ用ブラウザツールです（HTML / CSS / JavaScript のみ）。

## あなたがやること（アカウント作成済みのあと）

### 1. このフォルダを GitHub に載せる

1. [GitHub](https://github.com) で **New repository** を作る（名前は任意・**Public** 推奨）。
2. **README は追加しない**（このリポジトリに README があるので）。
3. PC でこのフォルダを開き、**ターミナル**で次を実行（`<URL>` は GitHub が表示した `https://github.com/あなた/リポジトリ名.git`）:

```bash
cd /このフォルダへのパス/ll-ocg-tools
git init -b main
git remote add origin <URL>
git add -A
git commit -m "Initial commit: Loveca Labo"
git push -u origin main
```

初回 `git push` で GitHub のログインやトークンを聞かれたら、画面の指示に従ってください。

**トークン（Classic）で push するとき:** **`repo`** にチェックがあれば十分です。  
`.github/workflows` を push で更新したい場合だけ **`workflow`** も必要になります（このリポジトリは **Actions ではなくブランチ公開**にしているので `repo` のみで OK）。

### 2. GitHub Pages を有効にする（初回だけ）

1. GitHub 上のそのリポジトリを開く。
2. **Settings** → 左メニュー **Pages**。
3. **Build and deployment** の **Source** で **Deploy from a branch** を選ぶ。
4. **Branch** を **`main`**、フォルダを **`/ (root)`** にして **Save**。

（**GitHub Actions** は、トークンに `workflow` 権限がないと `git push` でワークフローを送れないため、**ブランチ公開**の方がトークン設定が簡単です。）

### 3. サイトの URL

1〜2分待つと、同じ **Settings → Pages** に **サイトの URL**（例: `https://3rdOne501.github.io/loveca-labo/`）が表示されます。  
あとから `main` に **push するたび**、その URL の内容が更新されます。

## ローカルで試す（開発用）

- **Mac / Linux:** `python3 -m http.server 8080` → ブラウザで `http://127.0.0.1:8080/`
- **Windows:** `start.bat` をダブルクリック、または `npm start`（Node.js 入り）

`index.html` をダブルクリック（`file://`）だけでは、ブラウザの仕様で動かないことがあります。

## 免責

非公式ツールです。ルール・レギュ・著作権は公式および各権利者に従ってください。
