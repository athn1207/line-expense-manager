# 完成したプロジェクトを GitHub に保存する方法

初めての方でもできるように、手順をまとめました。

---

## 前提

- **GitHub のアカウント**があること
- パソコンに **Git** が入っていること  
  - 未導入の場合は [Git for Windows](https://git-scm.com/download/win) でインストール

---

## 手順1: GitHub で新しいリポジトリを作る

1. [GitHub](https://github.com) にログインする
2. 右上の **「+」** → **「New repository」** をクリック
3. **Repository name** に名前を入れる（例: `receipt-to-spreadsheet`）
4. **Public** を選ぶ（非公開にしたい場合は Private）
5. **「Add a README file」** にはチェックを入れない（既存のプロジェクトを上げるため）
6. **「Create repository」** をクリック
7. 表示された **リポジトリのURL** をコピーする  
   - 形式: `https://github.com/あなたのユーザー名/リポジトリ名.git`

---

## 手順2: プロジェクトフォルダで GitHub に送る

**PowerShell** または **コマンドプロンプト** を開き、次のように **順番に** 実行します。

### ① プロジェクトフォルダに移動

```powershell
cd "c:\Users\akiko\OneDrive\ドキュメント\AIエンジニア\第５章\5-3領収書読み取りスプシ保存ツール"
```

### ② 変更をすべてステージング

```powershell
git add .
```

### ③ コミット（保存ポイント）を作る

```powershell
git commit -m "領収書読み取りスプシ保存ツール完成"
```

### ④ ブランチ名を main にする（GitHub の標準に合わせる）

```powershell
git branch -M main
```

### ⑤ GitHub のリポジトリを登録

※ **手順1でコピーしたURL** に置き換えてください。

```powershell
git remote add origin https://github.com/あなたのユーザー名/リポジトリ名.git
```

すでに `origin` が登録されている場合は、次のように上書きできます。

```powershell
git remote set-url origin https://github.com/あなたのユーザー名/リポジトリ名.git
```

### ⑥ GitHub に送る（プッシュ）

```powershell
git push -u origin main
```

- 初回は **GitHub のユーザー名** と **パスワード** を聞かれることがあります。
- パスワードの代わりに **Personal Access Token (PAT)** が必要な場合があります。  
  - GitHub → **Settings** → **Developer settings** → **Personal access tokens** で発行できます。

---

## 重要: 秘密情報は GitHub に上げない

このプロジェクトでは **`.gitignore`** を用意しています。次のファイルは **自動的に GitHub に含まれません**。

| 無視されるもの     | 理由                         |
|--------------------|------------------------------|
| `.env`             | APIキー・秘密情報が書いてある |
| `node_modules/`    | パッケージは `npm install` で復元できる |
| `dist/`            | ビルド成果物（再ビルドで作れる） |
| `logs/`            | ログファイル                 |
| `sheets-writer*.json` | Google サービスアカウント鍵 |

- **`.env.example`** はリポジトリに含めています。他の人がどの環境変数が必要か分かるようにするためです。
- 別のパソコンで使うときは、`.env.example` をコピーして `.env` を作り、中身を自分の環境用に書き換えてください。

---

## まとめ

| 順番 | やること |
|------|----------|
| 1 | GitHub で「New repository」を作り、URL をコピー |
| 2 | プロジェクトフォルダで `git add .` → `git commit -m "メッセージ"` |
| 3 | `git branch -M main` でブランチ名を main に |
| 4 | `git remote add origin (URL)` でリモートを登録 |
| 5 | `git push -u origin main` で GitHub に送る |

ここまでできれば、完成したコードは GitHub に保存された状態になります。
