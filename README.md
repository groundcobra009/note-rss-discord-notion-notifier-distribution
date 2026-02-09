# note-rss-discord-notion-notifier

📝 Monitor note.com creators via RSS and auto-notify to Discord & Notion database with Google Apps Script

## 概要

noteで情報発信しているクリエイターの新着記事を自動収集し、DiscordとNotionに通知するGoogle Apps Scriptプロジェクトです。

## 主な機能

- 📡 **RSS監視**: note.comクリエイターのRSSフィードを定期的に監視
- 💬 **Discord通知**: 新着記事をWebhookでDiscordチャンネルに自動投稿
- 📊 **Notion連携**: 記事情報をNotionデータベースに自動記録
- 🎨 **直感的なUI**: サイドバーUIで簡単に設定・管理
- 🔄 **重複防止**: 通知済み記事を自動判定してスキップ
- ⏰ **期間フィルタ**: 1日/3日/7日以内の記事のみを取得可能

## セットアップ

### 1. Googleスプレッドシートの準備

1. 新しいGoogleスプレッドシートを作成
2. スクリプトエディタを開く（拡張機能 > Apps Script）
3. このリポジトリのファイルをコピー

### 2. claspでデプロイ（推奨）

```bash
npm install -g @google/clasp
clasp login
clasp clone <YOUR_SCRIPT_ID>
# ファイルをコピー後
clasp push
```

### 3. 初期設定

1. スプレッドシートを開く
2. メニューバーに「📝 note通知」が表示されるのを確認
3. `⚙️ 設定を開く` をクリック
4. 必要な情報を入力:
   - Discord Webhook URL
   - Notion API Key
   - Notion Database ID
   - Notion Page URL（固定リンク）
5. `🚀 初期セットアップ` で監視リスト・通知履歴シートを作成

## 使い方

### 監視リストに追加

`監視リスト` シートに以下の情報を追加（初期セットアップで自動作成されるサンプル）:

| クリエイター名 | 有効 | RSS URL | 備考 |
|---------------|------|---------|------|
| 深津貴之 | 1 | https://note.com/fladdict/rss | THE GUILD代表 / note CXO / AI活用 |
| けんすう | 1 | https://note.com/kensuu/rss | アル代表 / スタートアップ |
| shi3z（清水亮） | 1 | https://note.com/shi3z/rss | AI研究者 / プログラマー / LLM |
| 落合陽一 | 1 | https://note.com/ochyai/rss | メディアアーティスト / 筑波大学 |
| 梶谷健人 | 1 | https://note.com/kajikent/rss | XR / AI / スタートアップ |
| 堀江貴文 | 1 | https://note.com/takapon/rss | 実業家 / 起業家 |

### 手動実行

メニューから実行:
- `▶️ 今すぐ実行（全て）`: 全クリエイターの記事をチェック
- `📅 1日以内の記事をチェック`: 過去24時間の記事のみ
- `📅 3日以内の記事をチェック`: 過去3日間の記事のみ
- `📆 7日以内の記事をチェック`: 過去7日間の記事のみ

### 自動実行（トリガー設定）

1. サイドバーの「⏰ トリガー設定」をクリック
2. 実行頻度を選択（例: 1時間ごと）
3. 「作成」ボタンをクリック

## ファイル構成

```
├── Code.gs              # メインエントリーポイント
├── Note.gs              # RSS取得・OGP取得処理
├── Discord.gs           # Discord通知処理
├── Notion.gs            # Notion連携処理
├── Settings.gs          # 設定管理・シート初期化
├── Trigger.gs           # トリガー管理
├── Sidebar.html         # サイドバーUI
├── TriggerDialog.html   # トリガー設定ダイアログ
├── HowToUse.html        # 使い方ガイド
├── Styles.html          # 共通スタイル
└── appsscript.json      # Apps Script設定
```

## Discord通知フォーマット

```
📝 **{クリエイター名}** から新しい記事が投稿されました！

[Embedカード]
- タイトル: {記事タイトル}（リンク付き）
- サムネイル: {OGP画像}
- 説明: {記事概要（150文字まで）}
- クリエイター: {クリエイター名}
- 公開日時: YYYY/MM/DD HH:mm
- Notionリンク
```

## Notionデータベーススキーマ

| プロパティ名 | タイプ | 内容 |
|-------------|--------|------|
| タイトル | Title | 記事タイトル |
| URL | URL | 記事URL |
| クリエイター | Select/Text | noteユーザー名 |
| 公開日 | Date | 記事の公開日時 |
| 概要 | Text | 記事の概要 |
| サムネイル | Files & Media | OGP画像URL |

## 注意事項

- RSSフィードは最新20件程度のみ取得可能
- レート制限対策として、各記事処理後に1秒待機
- Discord Webhook URLとNotion API Keyは厳重に管理してください
- 初回実行時は期間フィルタを適切に設定することを推奨

## ライセンス

MIT License

## 作者

[@groundcobra009](https://github.com/groundcobra009)
