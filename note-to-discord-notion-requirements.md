# note記事監視 → Discord・Notion通知システム 完全要件定義書

> noteの記事更新を監視し、新着記事をDiscordに通知すると同時にNotionデータベースに記録するGoogle Apps Scriptプロジェクト

---

# 📑 目次

1. [プロジェクト概要](#-プロジェクト概要)
2. [機能要件](#-機能要件)
3. [システム構成](#-システム構成)
4. [技術仕様](#-技術仕様)
5. [UI設計ガイドライン](#-ui設計ガイドライン)
6. [セキュリティ要件](#-セキュリティ要件)
7. [実装フェーズ](#-実装フェーズ)
8. [補足事項](#-補足事項)

---

# 📋 プロジェクト概要

## 目的・背景

- noteで情報発信しているクリエイターの新着記事を自動収集したい
- 新着記事をDiscordチャンネルでチームに共有したい
- Notionデータベースで記事情報を一元管理・検索したい
- YouTube通知システムと同様のUI/UXを実現する

## スプレッドシート構成

### シート: 監視リスト
| クリエイター名 | 有効 | RSS URL | 備考 |
|---------------|------|---------|------|
| 深津貴之 | 1 | https://note.com/fladdict/rss | THE GUILD |
| けんすう | 1 | https://note.com/kensuu/rss | アル代表 |

### シート: 通知履歴
- 送信済み記事のログ
- 重複防止用のURLチェック

## 設定項目（PropertiesService）

| キー | 説明 |
|------|------|
| DISCORD_WEBHOOK_URL | Discord Webhook URL |
| NOTION_API_KEY | Notion Internal Integration Token |
| NOTION_DATABASE_ID | Notion データベースID |
| NOTION_PAGE_URL | Notion 固定リンク（Discord通知用） |
| FILTER_DAYS | フィルタ日数（1/3/7） |

## 主要関数

| 関数名 | 説明 |
|--------|------|
| onOpen() | メニュー作成 |
| openSidebar() | サイドバー表示 |
| checkAllCreators() | 全クリエイターチェック |
| checkCreatorsWithin1Day() | 1日以内の記事チェック |
| checkCreatorsWithin3Days() | 3日以内の記事チェック |
| checkCreatorsWithin7Days() | 7日以内の記事チェック |

---

# 📊 機能要件

## 1. 記事取得機能

### 1.1 データソース
| 方式 | URL形式 | 取得可能情報 |
|------|---------|-------------|
| RSS Feed | `https://note.com/{username}/rss` | タイトル、公開日、記事URL、概要 |
| マガジンRSS | `https://note.com/{username}/m/{magazine_id}/rss` | 同上（マガジン単位） |

### 1.2 取得可能な情報（RSS）
| フィールド | 説明 | 必須/任意 |
|-----------|------|----------|
| `title` | 記事タイトル | 必須 |
| `link` | 記事URL | 必須 |
| `pubDate` | 公開日時 | 必須 |
| `description` | 記事概要（HTML形式、最初の数百文字） | 必須 |
| `dc:creator` | 作者名（noteのユーザー名） | 必須 |

### 1.3 追加取得情報（OGP/スクレイピング）
| フィールド | 取得方法 | 必須/任意 |
|-----------|---------|----------|
| `og:image` | 記事ページのOGPタグから取得 | 任意（サムネイル用） |
| `og:description` | 記事ページのOGPタグから取得 | 任意（より長い概要） |

### 1.4 期間フィルタ
- 1日以内の記事のみ取得
- 3日以内の記事のみ取得
- 7日以内の記事のみ取得
- フィルタなし（全件取得）

## 2. スプレッドシート管理機能

### 2.1 監視対象シート（シート名: `監視リスト`）
| 列 | 内容 | 例 |
|----|------|-----|
| A | クリエイター名 | `深津貴之` |
| B | 有効フラグ（1=有効, 0=無効） | `1` |
| C | RSS URL | `https://note.com/fladdict/rss` |
| D | 備考（任意） | `THE GUILD代表` |

### 2.2 通知履歴シート（シート名: `通知履歴`）
| 列 | 内容 |
|----|------|
| A | 記事タイトル |
| B | 記事URL |
| C | クリエイター名 |
| D | 公開日時 |
| E | Discord通知日時 |
| F | Notion追加日時 |
| G | ステータス（成功/失敗） |

## 3. Discord通知機能

### 3.1 通知フォーマット（Embed形式）
```
📝 **{クリエイター名}** から新しい記事が投稿されました！

[Embedカード]
- タイトル: {記事タイトル}（リンク付き）
- サムネイル: {OGP画像}
- 説明: {記事概要（150文字まで）}
- フィールド:
  - 👤 クリエイター: {クリエイター名}
  - 📅 公開日時: {YYYY/MM/DD HH:mm}
  - 🔗 記事URL: [こちらをクリック]
  - 📝 Notion: [こちら]（固定リンク）
- フッター: note通知Bot
- カラー: #41C9B4（noteのブランドカラー）
```

### 3.2 Webhook設定
- Sidebar UIで設定
- 接続テストボタン付き
- URLはマスク表示（目玉トグル）

## 4. Notion連携機能

### 4.1 データベーススキーマ（Notionデータベース）
| プロパティ名 | タイプ | 内容 |
|-------------|--------|------|
| タイトル | Title | 記事タイトル |
| URL | URL | 記事URL |
| クリエイター | Select または Text | noteユーザー名 |
| 公開日 | Date | 記事の公開日時 |
| 概要 | Text (Rich Text) | 記事の概要 |
| サムネイル | Files & Media または URL | OGP画像URL |
| 取得日時 | Date | システムが取得した日時 |
| タグ | Multi-select | カテゴリ分類（任意） |

### 4.2 ページ本文
- Notionページの本文エリアに記事概要を追加
- 記事へのリンクを埋め込み

### 4.3 設定項目
- Notion API Key（Internal Integration Token）
- データベースID
- 接続テストボタン

## 5. 定期実行（トリガー）機能

### 5.1 実行モード
| モード | 説明 |
|--------|------|
| 定期実行 | 1時間/2時間/3時間/6時間/12時間/24時間ごと |
| 毎日実行 | 指定時刻（0〜23時）に1日1回実行 |

### 5.2 手動実行
- メニューから「今すぐ実行」
- 期間指定実行（1日/3日/7日以内）

## 6. UI/UX要件

### 6.1 Sidebar（設定・管理）
```
┌─────────────────────────────┐
│ 📝 note → Discord・Notion   │
├─────────────────────────────┤
│ ▼ 認証情報                   │
│   Discord Webhook URL [👁]   │
│   [接続テスト] [結果表示]     │
│                             │
│   Notion API Key [👁]        │
│   データベースID [👁]         │
│   [接続テスト] [結果表示]     │
├─────────────────────────────┤
│ ▼ 通知設定                   │
│   ○ 1日以内  ○ 3日以内       │
│   ○ 7日以内                  │
├─────────────────────────────┤
│ ▼ 管理                       │
│   [設定を保存]               │
│   [トリガー設定]             │
│   [使い方ガイド]             │
└─────────────────────────────┘
```

### 6.2 TriggerDialog（トリガー設定）
- 現在のトリガー状態表示
- 定期実行/毎日実行の選択
- 実行間隔・時刻の設定
- 期間フィルタの設定
- トリガー作成/削除ボタン

### 6.3 HowToUseDialog（使い方ガイド）
- 初期設定手順
- Discord Webhook取得方法
- Notion API設定方法
- スプレッドシートの使い方
- FAQ・トラブルシューティング

---

# 🏗️ システム構成

## ファイル構成
```
note-to-discord-notion/
├── appsscript.json       # GASマニフェスト
├── Code.gs               # メインエントリーポイント、メニュー、統括処理
├── Note.gs               # note RSS取得・パース処理
├── Discord.gs            # Discord Webhook送信処理
├── Notion.gs             # Notion API連携処理
├── Settings.gs           # 設定の保存・取得（PropertiesService）
├── Trigger.gs            # トリガー管理
├── Sidebar.html          # サイドバーUI
├── Styles.html           # 共通CSS
├── TriggerDialog.html    # トリガー設定ダイアログ
└── HowToUse.html         # 使い方ガイド
```

## 依存関係
```
[スプレッドシート]
     │
     ├── [監視リスト] ← 監視対象のnoteクリエイター
     │
     └── [通知履歴] ← 送信済み記事の記録（重複防止）

[Code.gs] ── メニュー ──► [Sidebar.html]
    │                        │
    │                        ├──► Discord設定
    │                        ├──► Notion設定
    │                        └──► トリガー設定
    │
    ├── checkAllCreators() ──► [Note.gs] RSS取得
    │                              │
    │                              ▼
    │                         記事データ
    │                              │
    │         ┌────────────────────┴────────────────────┐
    │         │                                         │
    │         ▼                                         ▼
    │   [Discord.gs]                              [Notion.gs]
    │   Webhook送信                               API送信
    │         │                                         │
    │         ▼                                         ▼
    │   Discord通知                             Notionページ作成
    │
    └── [Trigger.gs] ── 定期実行トリガー管理
```

---

# 🔧 技術仕様

## 1. Note.gs - RSS取得処理

```javascript
/**
 * noteのRSSを取得してパースする
 * @param {string} rssUrl - RSSフィードURL
 * @returns {Array<Object>} 記事オブジェクトの配列
 */
function fetchNoteRss(rssUrl) {
  const response = UrlFetchApp.fetch(rssUrl, {
    muteHttpExceptions: true
  });
  
  if (response.getResponseCode() !== 200) {
    throw new Error(`RSS取得失敗: ${response.getResponseCode()}`);
  }
  
  const xml = response.getContentText();
  const document = XmlService.parse(xml);
  const root = document.getRootElement();
  const channel = root.getChild('channel');
  const items = channel.getChildren('item');
  
  return items.map(item => ({
    title: item.getChildText('title'),
    url: item.getChildText('link'),
    published: new Date(item.getChildText('pubDate')),
    description: stripHtml(item.getChildText('description')),
    creator: getCreatorFromItem(item)
  }));
}

/**
 * 記事ページからOGP情報を取得
 * @param {string} articleUrl - 記事URL
 * @returns {Object} OGP情報
 */
function fetchOgpData(articleUrl) {
  const response = UrlFetchApp.fetch(articleUrl, {
    muteHttpExceptions: true
  });
  
  const html = response.getContentText();
  
  return {
    image: extractMetaContent(html, 'og:image'),
    description: extractMetaContent(html, 'og:description')
  };
}

/**
 * HTMLタグを除去
 * @param {string} html - HTML文字列
 * @returns {string} プレーンテキスト
 */
function stripHtml(html) {
  if (!html) return '';
  return html.replace(/<[^>]*>/g, '').trim();
}

/**
 * OGPメタタグからコンテンツを抽出
 * @param {string} html - HTML文字列
 * @param {string} property - OGPプロパティ名
 * @returns {string} コンテンツ
 */
function extractMetaContent(html, property) {
  const regex = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match = html.match(regex);
  return match ? match[1] : '';
}
```

## 2. Discord.gs - 通知送信

```javascript
/**
 * Discordに記事通知を送信
 * @param {string} creatorName - クリエイター名
 * @param {Object} article - 記事情報
 * @returns {boolean} 送信成功フラグ
 */
function sendDiscordNotification(creatorName, article) {
  const webhookUrl = getSettings('DISCORD_WEBHOOK_URL');
  
  if (!webhookUrl) {
    Logger.log('Discord Webhook URLが設定されていません');
    return false;
  }
  
  // 公開日時をフォーマット
  const publishedDate = Utilities.formatDate(
    article.published,
    Session.getScriptTimeZone(),
    'yyyy/MM/dd HH:mm'
  );
  
  const payload = {
    username: 'note通知Bot',
    avatar_url: 'https://assets.st-note.com/production/uploads/images/favicon/note_icon.png',
    content: `📝 **${creatorName}** から新しい記事が投稿されました！`,
    embeds: [{
      title: article.title,
      url: article.url,
      description: article.description.substring(0, 150) + '...',
      color: 4311476, // #41C9B4 (note green)
      thumbnail: {
        url: article.thumbnail || ''
      },
      fields: [
        { name: '👤 クリエイター', value: creatorName, inline: true },
        { name: '📅 公開日時', value: publishedDate, inline: true },
        { name: '🔗 記事URL', value: `[こちらをクリック](${article.url})`, inline: false },
        { name: '📝 Notion', value: '[こちら](NOTION_DB_URL)', inline: false }
      ],
      footer: { text: 'note通知Bot' },
      timestamp: article.published.toISOString()
    }]
  };
  
  try {
    const options = {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    };
    
    const response = UrlFetchApp.fetch(webhookUrl, options);
    const statusCode = response.getResponseCode();
    
    if (statusCode === 204 || statusCode === 200) {
      Logger.log(`Discord通知成功: ${article.title}`);
      return true;
    } else {
      Logger.log(`Discord通知失敗: ${statusCode}`);
      return false;
    }
  } catch (e) {
    Logger.log(`Discord送信エラー: ${e.message}`);
    return false;
  }
}

/**
 * Discord Webhook接続テスト
 * @returns {Object} テスト結果
 */
function testDiscordWebhook() {
  const webhookUrl = getSettings('DISCORD_WEBHOOK_URL');
  
  if (!webhookUrl) {
    return { success: false, message: 'Webhook URLが入力されていません' };
  }
  
  if (!webhookUrl.startsWith('https://discord.com/api/webhooks/') && 
      !webhookUrl.startsWith('https://discordapp.com/api/webhooks/')) {
    return { success: false, message: 'URLの形式が正しくありません' };
  }
  
  const testPayload = {
    username: 'note通知Bot',
    embeds: [{
      title: '🔗 接続テスト成功！',
      description: 'note通知システムからのテストメッセージです。',
      color: 5763719
    }]
  };
  
  try {
    const response = UrlFetchApp.fetch(webhookUrl, {
      method: 'post',
      contentType: 'application/json',
      payload: JSON.stringify(testPayload),
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 204 || statusCode === 200) {
      return { success: true, message: '接続成功！テストメッセージを送信しました。' };
    } else {
      return { success: false, message: `接続失敗（エラーコード: ${statusCode}）` };
    }
  } catch (e) {
    return { success: false, message: 'ネットワークエラーが発生しました' };
  }
}
```

## 3. Notion.gs - ページ作成

```javascript
/**
 * Notionデータベースに記事を追加
 * @param {Object} article - 記事情報
 * @returns {Object} 作成結果
 */
function addArticleToNotion(article) {
  const apiKey = getSettings('NOTION_API_KEY');
  const databaseId = getSettings('NOTION_DATABASE_ID');
  
  if (!apiKey || !databaseId) {
    return { success: false, message: 'Notion設定が不完全です' };
  }
  
  const payload = {
    parent: { database_id: databaseId },
    properties: {
      'タイトル': {
        title: [{ text: { content: article.title } }]
      },
      'URL': {
        url: article.url
      },
      'クリエイター': {
        select: { name: article.creator }
      },
      '公開日': {
        date: { start: article.published.toISOString() }
      },
      '概要': {
        rich_text: [{ text: { content: article.description.substring(0, 2000) } }]
      },
      '取得日時': {
        date: { start: new Date().toISOString() }
      }
    },
    children: [
      {
        object: 'block',
        type: 'paragraph',
        paragraph: {
          rich_text: [{
            type: 'text',
            text: { content: article.description }
          }]
        }
      },
      {
        object: 'block',
        type: 'bookmark',
        bookmark: { url: article.url }
      }
    ]
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28',
        'Content-Type': 'application/json'
      },
      payload: JSON.stringify(payload),
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      Logger.log(`Notion追加成功: ${article.title}`);
      return { success: true };
    } else {
      Logger.log(`Notion追加失敗: ${statusCode}`);
      return { success: false, message: `エラーコード: ${statusCode}` };
    }
  } catch (e) {
    Logger.log(`Notionエラー: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * Notion API接続テスト
 * @returns {Object} テスト結果
 */
function testNotionConnection() {
  const apiKey = getSettings('NOTION_API_KEY');
  const databaseId = getSettings('NOTION_DATABASE_ID');
  
  if (!apiKey) {
    return { success: false, message: 'API Keyが入力されていません' };
  }
  
  if (!databaseId) {
    return { success: false, message: 'データベースIDが入力されていません' };
  }
  
  try {
    const response = UrlFetchApp.fetch(`https://api.notion.com/v1/databases/${databaseId}`, {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': '2022-06-28'
      },
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      const data = JSON.parse(response.getContentText());
      return { success: true, message: `接続成功！データベース「${data.title[0]?.plain_text || 'Untitled'}」に接続しました。` };
    } else if (statusCode === 401) {
      return { success: false, message: 'API Keyが無効です' };
    } else if (statusCode === 404) {
      return { success: false, message: 'データベースが見つかりません。IDを確認するか、Integrationの共有設定を確認してください。' };
    } else {
      return { success: false, message: `接続失敗（エラーコード: ${statusCode}）` };
    }
  } catch (e) {
    return { success: false, message: 'ネットワークエラーが発生しました' };
  }
}
```

## 4. Settings.gs - 設定管理

```javascript
const SETTINGS_KEYS = {
  DISCORD_WEBHOOK_URL: 'DISCORD_WEBHOOK_URL',
  NOTION_API_KEY: 'NOTION_API_KEY',
  NOTION_DATABASE_ID: 'NOTION_DATABASE_ID',
  NOTION_PAGE_URL: 'NOTION_PAGE_URL',
  FILTER_DAYS: 'FILTER_DAYS'
};

/**
 * 設定を取得
 * @param {string} key - 設定キー
 * @returns {string} 設定値
 */
function getSettings(key) {
  return PropertiesService.getScriptProperties().getProperty(key);
}

/**
 * 設定を保存
 * @param {string} key - 設定キー
 * @param {string} value - 設定値
 */
function saveSettings(key, value) {
  PropertiesService.getScriptProperties().setProperty(key, value);
}

/**
 * 全設定を取得（UI用）
 * @returns {Object} 全設定
 */
function getAllSettings() {
  const props = PropertiesService.getScriptProperties();
  return {
    discordWebhookUrl: props.getProperty(SETTINGS_KEYS.DISCORD_WEBHOOK_URL) || '',
    notionApiKey: props.getProperty(SETTINGS_KEYS.NOTION_API_KEY) || '',
    notionDatabaseId: props.getProperty(SETTINGS_KEYS.NOTION_DATABASE_ID) || '',
    notionPageUrl: props.getProperty(SETTINGS_KEYS.NOTION_PAGE_URL) || '',
    filterDays: props.getProperty(SETTINGS_KEYS.FILTER_DAYS) || '1'
  };
}

/**
 * 全設定を保存（UI用）
 * @param {Object} settings - 設定オブジェクト
 */
function saveAllSettings(settings) {
  const props = PropertiesService.getScriptProperties();
  
  if (settings.discordWebhookUrl !== undefined) {
    props.setProperty(SETTINGS_KEYS.DISCORD_WEBHOOK_URL, settings.discordWebhookUrl);
  }
  if (settings.notionApiKey !== undefined) {
    props.setProperty(SETTINGS_KEYS.NOTION_API_KEY, settings.notionApiKey);
  }
  if (settings.notionDatabaseId !== undefined) {
    props.setProperty(SETTINGS_KEYS.NOTION_DATABASE_ID, settings.notionDatabaseId);
  }
  if (settings.notionPageUrl !== undefined) {
    props.setProperty(SETTINGS_KEYS.NOTION_PAGE_URL, settings.notionPageUrl);
  }
  if (settings.filterDays !== undefined) {
    props.setProperty(SETTINGS_KEYS.FILTER_DAYS, settings.filterDays);
  }
  
  return { success: true, message: '設定を保存しました' };
}
```

## 5. Code.gs - メイン処理

```javascript
/**
 * スプレッドシート起動時にメニューを作成
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📝 note通知')
    .addItem('⚙️ 設定を開く', 'openSidebar')
    .addSeparator()
    .addItem('▶️ 今すぐ実行（全て）', 'checkAllCreators')
    .addItem('📅 1日以内の記事をチェック', 'checkCreatorsWithin1Day')
    .addItem('📅 3日以内の記事をチェック', 'checkCreatorsWithin3Days')
    .addItem('📆 7日以内の記事をチェック', 'checkCreatorsWithin7Days')
    .addToUi();
}

/**
 * サイドバーを開く
 */
function openSidebar() {
  const html = HtmlService.createTemplateFromFile('Sidebar')
    .evaluate()
    .setTitle('📝 note → Discord・Notion')
    .setWidth(320);
  SpreadsheetApp.getUi().showSidebar(html);
}

/**
 * HTMLファイルをインクルード
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 全クリエイターをチェック
 * @param {number} overrideFilterDays - フィルタ日数（オプション）
 * @returns {number} 通知件数
 */
function checkAllCreators(overrideFilterDays) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('監視リスト');
  const historySheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName('通知履歴');
  
  if (!sheet) {
    Logger.log('監視リストシートが見つかりません');
    return 0;
  }
  
  const filterDays = overrideFilterDays || parseInt(getSettings('FILTER_DAYS')) || 1;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filterDays);
  
  const data = sheet.getDataRange().getValues();
  let notificationCount = 0;
  
  // 通知済みURLを取得
  const notifiedUrls = getNotifiedUrls(historySheet);
  
  for (let i = 1; i < data.length; i++) {
    const [creatorName, enabled, rssUrl, memo] = data[i];
    
    if (!enabled || !rssUrl) continue;
    
    try {
      const articles = fetchNoteRss(rssUrl);
      
      for (const article of articles) {
        // 期間フィルタ
        if (article.published < cutoffDate) {
          Logger.log(`${article.title}: ${filterDays}日前より古いためスキップ`);
          continue;
        }
        
        // 重複チェック
        if (notifiedUrls.has(article.url)) {
          Logger.log(`${article.title}: 通知済みのためスキップ`);
          continue;
        }
        
        // OGP情報を取得
        const ogpData = fetchOgpData(article.url);
        article.thumbnail = ogpData.image;
        
        // Discord通知
        const discordSuccess = sendDiscordNotification(creatorName, article);
        
        // Notion追加
        const notionResult = addArticleToNotion({
          ...article,
          creator: creatorName
        });
        
        // 履歴に追加
        addToHistory(historySheet, article, creatorName, discordSuccess, notionResult.success);
        
        if (discordSuccess) notificationCount++;
        
        // レート制限対策
        Utilities.sleep(1000);
      }
    } catch (e) {
      Logger.log(`${creatorName}の取得エラー: ${e.message}`);
    }
  }
  
  return notificationCount;
}

/**
 * 1日以内の記事をチェック
 */
function checkCreatorsWithin1Day() {
  const ui = SpreadsheetApp.getUi();
  const count = checkAllCreators(1);
  ui.alert('✅ 完了', `1日以内の記事をチェックしました。\n${count}件の通知を送信しました。`, ui.ButtonSet.OK);
}

/**
 * 3日以内の記事をチェック
 */
function checkCreatorsWithin3Days() {
  const ui = SpreadsheetApp.getUi();
  const count = checkAllCreators(3);
  ui.alert('✅ 完了', `3日以内の記事をチェックしました。\n${count}件の通知を送信しました。`, ui.ButtonSet.OK);
}

/**
 * 7日以内の記事をチェック
 */
function checkCreatorsWithin7Days() {
  const ui = SpreadsheetApp.getUi();
  const count = checkAllCreators(7);
  ui.alert('✅ 完了', `7日以内の記事をチェックしました。\n${count}件の通知を送信しました。`, ui.ButtonSet.OK);
}

/**
 * 通知済みURLのセットを取得
 */
function getNotifiedUrls(historySheet) {
  const urls = new Set();
  if (!historySheet) return urls;
  
  const data = historySheet.getDataRange().getValues();
  for (let i = 1; i < data.length; i++) {
    if (data[i][1]) urls.add(data[i][1]);
  }
  return urls;
}

/**
 * 履歴に追加
 */
function addToHistory(sheet, article, creatorName, discordSuccess, notionSuccess) {
  if (!sheet) return;
  
  const now = new Date();
  sheet.appendRow([
    article.title,
    article.url,
    creatorName,
    article.published,
    discordSuccess ? now : '',
    notionSuccess ? now : '',
    discordSuccess && notionSuccess ? '成功' : '一部失敗'
  ]);
}
```

---

# 🎨 UI設計ガイドライン

## Sidebar vs Dialog 使い分け

### Sidebar（設定・管理）
- 常時アクセス可能な設定画面
- 認証情報の入力・保存
- 接続テスト
- 保存ボタン

### Dialog（単発タスク）
- トリガー設定（集中作業）
- 使い方ガイド（参照）
- 確認ダイアログ

## 機密入力UI（必須）

### 要件
- 初期状態: マスク表示（type="password"）
- 目玉アイコンで表示/非表示切り替え
- 10秒後に自動で再マスク
- 保存時はPropertiesServiceに保存（ログに平文を残さない）

### 実装例
```html
<div class="input-with-toggle">
  <input type="password" id="apiKey" class="input-field masked-input">
  <button type="button" class="toggle-visibility" onclick="toggleVisibility('apiKey')">
    <span class="eye-icon">👁</span>
  </button>
</div>

<script>
let autoMaskTimers = {};

function toggleVisibility(inputId) {
  const input = document.getElementById(inputId);
  const isPassword = input.type === 'password';
  input.type = isPassword ? 'text' : 'password';
  
  // 自動再マスク（10秒後）
  if (isPassword) {
    clearTimeout(autoMaskTimers[inputId]);
    autoMaskTimers[inputId] = setTimeout(() => {
      input.type = 'password';
    }, 10000);
  }
}
</script>
```

## セクション構成（Sidebar）

1. **認証情報**（折りたたみ可）
   - Discord Webhook URL + 接続テスト
   - Notion API Key + 接続テスト
   - Notion Database ID

2. **通知設定**
   - 期間フィルタ（1日/3日/7日）
   - Notion固定リンク

3. **管理**
   - 設定を保存
   - トリガー設定
   - 使い方ガイド

## 接続テスト仕様

- ボタンは入力欄の近くに配置
- 実行中は「テスト中...」表示 + ボタン無効化
- 結果はインライン表示（成功=緑、失敗=赤）
- エラーメッセージは具体的に

## アクセシビリティ

- aria-label 必須
- キーボード操作対応
- フォーカス可視化
- 色だけに依存しない

## エラーメッセージ設計

- ユーザーが自走できる文言
- 「〜してください」形式
- 技術的な詳細は隠す

例:
- ✅「Webhook URLの形式が正しくありません。https://discord.com/api/webhooks/ で始まるURLを入力してください。」
- ❌「Error: Invalid URL format」

---

# 🔒 セキュリティ要件

## 機密情報の取り扱い
| 項目 | 保存場所 | 表示方法 |
|------|---------|---------|
| Discord Webhook URL | PropertiesService | マスク表示（目玉トグル） |
| Notion API Key | PropertiesService | マスク表示（目玉トグル） |
| Notion Database ID | PropertiesService | マスク表示（目玉トグル） |

## ログ出力
- 機密情報は平文でログに出力しない
- エラー時は「接続失敗」等の抽象的なメッセージのみ

---

# 📅 実装フェーズ

## Phase 1: 基盤構築
- [ ] プロジェクトセットアップ（appsscript.json）
- [ ] スプレッドシートテンプレート作成
- [ ] Settings.gs 実装
- [ ] Styles.html 作成

## Phase 2: コア機能
- [ ] Note.gs（RSS取得・パース）
- [ ] Discord.gs（通知送信）
- [ ] Notion.gs（ページ作成）
- [ ] 重複チェック機能

## Phase 3: UI実装
- [ ] Sidebar.html
- [ ] TriggerDialog.html
- [ ] HowToUse.html

## Phase 4: トリガー・運用
- [ ] Trigger.gs
- [ ] メニュー統合
- [ ] エラーハンドリング強化
- [ ] テスト・デバッグ

---

# 📝 補足事項

## noteのRSS仕様
- 最新15〜20件程度の記事が含まれる
- pubDateはRFC 2822形式（例: `Sat, 01 Jan 2026 12:00:00 +0900`）
- descriptionはHTMLタグを含む場合がある

```
URL形式: https://note.com/{username}/rss
マガジン: https://note.com/{username}/m/{magazine_id}/rss

取得可能情報:
- title: 記事タイトル
- link: 記事URL
- pubDate: 公開日時（RFC 2822形式）
- description: 概要（HTML含む可能性あり）
- dc:creator: 作者名
```

## Notionデータベース構成

| プロパティ | タイプ | 説明 |
|-----------|--------|------|
| タイトル | Title | 記事タイトル |
| URL | URL | 記事URL |
| クリエイター | Select | noteユーザー名 |
| 公開日 | Date | 記事公開日 |
| 概要 | Rich Text | 記事概要 |
| 取得日時 | Date | 取得タイムスタンプ |

## 制限事項
- noteのAPIは公式には公開されていない（RSSとOGPを活用）
- 有料記事の本文は取得不可（タイトル・概要のみ）
- 大量のクリエイターを監視する場合はAPI制限に注意

## 参考リンク
- [note RSS](https://note.com/info/n/na10a32d50e41)
- [Notion API](https://developers.notion.com/)
- [Discord Webhook](https://discord.com/developers/docs/resources/webhook)

## 参照プロジェクト
- youtube-to-discord-20260101（UIパターン、トリガー管理）

---

*最終更新: 2026/01/02*

