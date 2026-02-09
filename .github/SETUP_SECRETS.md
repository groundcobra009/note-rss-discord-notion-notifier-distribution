# GitHub Secrets セットアップ手順

GitHub Actions でのデプロイに必要なSecretsの設定方法です。

## 必要なSecrets

| Secret名 | 必須 | 説明 |
|-----------|------|------|
| `CLASPRC_JSON_BASE64` | 必須 | clasp認証情報（base64エンコード） |
| `CLASP_JSON` | 任意 | .clasp.json がリポジトリにない場合のみ |
| `DISCORD_WEBHOOK_URL` | 任意 | デプロイ通知用Discord Webhook URL |

## 1. CLASPRC_JSON_BASE64 の取得

```bash
# claspにログイン
npx @google/clasp login

# 生成された認証ファイルをbase64エンコード
cat ~/.clasprc.json | base64 | tr -d '\n'
```

出力された文字列をGitHub Secretsに `CLASPRC_JSON_BASE64` として保存。

## 2. DISCORD_WEBHOOK_URL の取得

1. Discordサーバーの「サーバー設定」→「連携サービス」→「ウェブフック」
2. 「新しいウェブフック」を作成
3. 「ウェブフックURLをコピー」
4. GitHub Secretsに `DISCORD_WEBHOOK_URL` として保存

## 3. Secretsの登録方法

1. GitHubリポジトリの **Settings** → **Secrets and variables** → **Actions**
2. **New repository secret** をクリック
3. 名前と値を入力して **Add secret**

## ワークフローの動作

- `main` ブランチへのpush時に自動デプロイ
- 手動実行も可能（Actions → Deploy to Google Apps Script → Run workflow）
- デプロイ結果をDiscordに通知（Webhook設定時）
