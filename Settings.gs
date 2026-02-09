/**
 * Settings.gs - 設定管理
 * 
 * スプレッドシートの「設定」シートから設定を読み書き
 */

const SETTINGS_SHEET_NAME = '設定';
const WATCHLIST_SHEET_NAME = '監視リスト';
const HISTORY_SHEET_NAME = '通知履歴';

// 設定項目の定義（設定シートの行番号と対応）
const SETTING_ROWS = {
  DISCORD_WEBHOOK_URL: 2,
  NOTION_API_KEY: 3,
  NOTION_DATABASE_ID: 4,
  NOTION_PAGE_URL: 5,
  FILTER_DAYS: 6,
  EMAIL_ENABLED: 7,
  EMAIL_SUBJECT: 8
};

// セキュア情報のスクリプトプロパティキー（LINE・メール認証）
const SECURE_PROPERTY_KEYS = {
  LINE_CHANNEL_ACCESS_TOKEN: 'LINE_CHANNEL_ACCESS_TOKEN',
  LINE_USER_ID: 'LINE_USER_ID',
  EMAIL_TO: 'EMAIL_TO',
  EMAIL_PASSWORD: 'EMAIL_PASSWORD'
};

/**
 * 設定シートから設定を取得
 * @param {string} key - 設定キー
 * @returns {string} 設定値
 */
function getSettings(key) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  
  if (!sheet) {
    Logger.log('設定シートが見つかりません');
    return '';
  }
  
  const row = SETTING_ROWS[key];
  if (!row) {
    Logger.log(`不明な設定キー: ${key}`);
    return '';
  }
  
  // B列（2列目）から値を取得
  const value = sheet.getRange(row, 2).getValue();
  return value ? String(value).trim() : '';
}

/**
 * 設定シートに設定を保存
 * @param {string} key - 設定キー
 * @param {string} value - 設定値
 */
function saveSettings(key, value) {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  
  if (!sheet) {
    Logger.log('設定シートが見つかりません');
    return;
  }
  
  const row = SETTING_ROWS[key];
  if (!row) {
    Logger.log(`不明な設定キー: ${key}`);
    return;
  }
  
  // B列（2列目）に値を保存
  sheet.getRange(row, 2).setValue(value);
}

/**
 * 全設定を取得（UI用）
 * @returns {Object} 全設定
 */
function getAllSettings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  
  if (!sheet) {
    return {
      discordWebhookUrl: '',
      notionApiKey: '',
      notionDatabaseId: '',
      notionPageUrl: '',
      filterDays: '1'
    };
  }
  
  // セキュア設定はスクリプトプロパティから取得（マスク済み）
  const props = PropertiesService.getScriptProperties();
  const lineToken = props.getProperty(SECURE_PROPERTY_KEYS.LINE_CHANNEL_ACCESS_TOKEN) || '';
  const lineUserId = props.getProperty(SECURE_PROPERTY_KEYS.LINE_USER_ID) || '';
  const emailTo = props.getProperty(SECURE_PROPERTY_KEYS.EMAIL_TO) || '';
  const emailPassword = props.getProperty(SECURE_PROPERTY_KEYS.EMAIL_PASSWORD) || '';

  return {
    discordWebhookUrl: getCellValue(sheet, SETTING_ROWS.DISCORD_WEBHOOK_URL, 2),
    notionApiKey: getCellValue(sheet, SETTING_ROWS.NOTION_API_KEY, 2),
    notionDatabaseId: getCellValue(sheet, SETTING_ROWS.NOTION_DATABASE_ID, 2),
    notionPageUrl: getCellValue(sheet, SETTING_ROWS.NOTION_PAGE_URL, 2),
    filterDays: getCellValue(sheet, SETTING_ROWS.FILTER_DAYS, 2) || '1',
    emailEnabled: getCellValue(sheet, SETTING_ROWS.EMAIL_ENABLED, 2) || '0',
    emailTo: emailTo ? '********' : '',
    emailPassword: emailPassword ? '********' : '',
    emailSubject: getCellValue(sheet, SETTING_ROWS.EMAIL_SUBJECT, 2),
    lineChannelAccessToken: lineToken ? '********' : '',
    lineUserId: lineUserId ? '********' : '',
    hasLine: !!(lineToken && lineUserId),
    hasEmail: !!(getCellValue(sheet, SETTING_ROWS.EMAIL_ENABLED, 2) === '1' && emailTo)
  };
}

/**
 * セルの値を安全に取得
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - シート
 * @param {number} row - 行番号
 * @param {number} col - 列番号
 * @returns {string} セル値
 */
function getCellValue(sheet, row, col) {
  const value = sheet.getRange(row, col).getValue();
  return value ? String(value).trim() : '';
}

/**
 * 全設定を保存（UI用）
 * @param {Object} settings - 設定オブジェクト
 * @returns {Object} 保存結果
 */
function saveAllSettings(settings) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let sheet = ss.getSheetByName(SETTINGS_SHEET_NAME);
  
  // 設定シートがなければ作成
  if (!sheet) {
    sheet = createSettingsSheet(ss);
  }
  
  if (settings.discordWebhookUrl !== undefined) {
    sheet.getRange(SETTING_ROWS.DISCORD_WEBHOOK_URL, 2).setValue(settings.discordWebhookUrl);
  }
  if (settings.notionApiKey !== undefined) {
    sheet.getRange(SETTING_ROWS.NOTION_API_KEY, 2).setValue(settings.notionApiKey);
  }
  if (settings.notionDatabaseId !== undefined) {
    sheet.getRange(SETTING_ROWS.NOTION_DATABASE_ID, 2).setValue(settings.notionDatabaseId);
  }
  if (settings.notionPageUrl !== undefined) {
    sheet.getRange(SETTING_ROWS.NOTION_PAGE_URL, 2).setValue(settings.notionPageUrl);
  }
  if (settings.filterDays !== undefined) {
    sheet.getRange(SETTING_ROWS.FILTER_DAYS, 2).setValue(settings.filterDays);
  }
  if (settings.emailEnabled !== undefined) {
    sheet.getRange(SETTING_ROWS.EMAIL_ENABLED, 2).setValue(settings.emailEnabled);
  }
  if (settings.emailSubject !== undefined) {
    sheet.getRange(SETTING_ROWS.EMAIL_SUBJECT, 2).setValue(settings.emailSubject);
  }

  // セキュア設定はスクリプトプロパティに保存（マスク値は無視）
  const props = PropertiesService.getScriptProperties();
  if (settings.lineChannelAccessToken && settings.lineChannelAccessToken !== '********') {
    props.setProperty(SECURE_PROPERTY_KEYS.LINE_CHANNEL_ACCESS_TOKEN, settings.lineChannelAccessToken);
  }
  if (settings.lineUserId && settings.lineUserId !== '********') {
    props.setProperty(SECURE_PROPERTY_KEYS.LINE_USER_ID, settings.lineUserId);
  }
  if (settings.emailTo && settings.emailTo !== '********') {
    props.setProperty(SECURE_PROPERTY_KEYS.EMAIL_TO, settings.emailTo);
  }
  if (settings.emailPassword && settings.emailPassword !== '********') {
    props.setProperty(SECURE_PROPERTY_KEYS.EMAIL_PASSWORD, settings.emailPassword);
  }

  return { success: true, message: '設定を保存しました' };
}

/**
 * 設定シートを作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function createSettingsSheet(ss) {
  const sheet = ss.insertSheet(SETTINGS_SHEET_NAME);
  
  // ヘッダー行
  sheet.getRange(1, 1, 1, 3).setValues([['設定項目', '設定値', '説明']]);
  
  // 設定項目（メールアドレス・パスワードはスクリプトプロパティに保存）
  const settingsData = [
    ['Discord Webhook URL', '', 'DiscordのWebhook URL'],
    ['Notion API Key', '', 'NotionのInternal Integration Token'],
    ['Notion データベースID', '', 'NotionデータベースのID（32文字）'],
    ['Notion 固定リンク', '', 'Discord通知に表示するNotionリンク（任意）'],
    ['取得期間（日数）', '1', '1 / 3 / 7 のいずれか'],
    ['メール通知', '0', '1=有効 / 0=無効'],
    ['メール件名テンプレート', '【note新着】本日の新着記事 {count}件', '{count},{date}が使えます']
  ];
  
  sheet.getRange(2, 1, settingsData.length, 3).setValues(settingsData);
  
  // スタイル設定
  sheet.getRange(1, 1, 1, 3)
    .setBackground('#41C9B4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  
  // A列（設定項目名）の背景色
  sheet.getRange(2, 1, settingsData.length, 1)
    .setBackground('#E8F8F5');
  
  // 列幅調整
  sheet.setColumnWidth(1, 180);
  sheet.setColumnWidth(2, 350);
  sheet.setColumnWidth(3, 250);
  
  // 1行目を固定
  sheet.setFrozenRows(1);
  
  // B列の書式設定（URLや長い文字列用）
  sheet.getRange(2, 2, settingsData.length, 1).setWrap(true);
  
  return sheet;
}

/**
 * 監視リストシートを作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function createWatchlistSheet(ss) {
  const sheet = ss.insertSheet(WATCHLIST_SHEET_NAME);
  
  // ヘッダー行
  sheet.getRange(1, 1, 1, 4).setValues([['クリエイター名', '有効', 'RSS URL', '備考']]);
  
  // サンプルデータ（AI/テック系の著名クリエイター）
  const sampleData = [
    ['深津貴之', 1, 'https://note.com/fladdict/rss', 'THE GUILD代表 / note CXO / AI活用'],
    ['けんすう', 1, 'https://note.com/kensuu/rss', 'アル代表 / スタートアップ'],
    ['shi3z（清水亮）', 1, 'https://note.com/shi3z/rss', 'AI研究者 / プログラマー / LLM'],
    ['落合陽一', 1, 'https://note.com/ochyai/rss', 'メディアアーティスト / 筑波大学'],
    ['梶谷健人', 1, 'https://note.com/kajikent/rss', 'XR / AI / スタートアップ'],
    ['堀江貴文', 1, 'https://note.com/takapon/rss', '実業家 / 起業家']
  ];
  
  sheet.getRange(2, 1, sampleData.length, 4).setValues(sampleData);
  
  // ヘッダー行のスタイル設定
  sheet.getRange(1, 1, 1, 4)
    .setBackground('#41C9B4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');
  
  // 列幅を調整
  sheet.setColumnWidth(1, 150);
  sheet.setColumnWidth(2, 50);
  sheet.setColumnWidth(3, 300);
  sheet.setColumnWidth(4, 250);
  
  // 1行目を固定
  sheet.setFrozenRows(1);
  
  // 有効列の中央揃え
  sheet.getRange(2, 2, 100, 1).setHorizontalAlignment('center');
  
  return sheet;
}

/**
 * 通知履歴シートを作成
 * @param {GoogleAppsScript.Spreadsheet.Spreadsheet} ss - スプレッドシート
 * @returns {GoogleAppsScript.Spreadsheet.Sheet} 作成されたシート
 */
function createHistorySheet(ss) {
  const sheet = ss.insertSheet(HISTORY_SHEET_NAME);
  
  // ヘッダー行を設定
  sheet.getRange(1, 1, 1, 9).setValues([[
    '記事タイトル',
    '記事URL',
    'クリエイター名',
    '公開日時',
    'Discord通知日時',
    'Notion追加日時',
    'LINE通知日時',
    'メール通知日時',
    'ステータス'
  ]]);

  // ヘッダー行のスタイル設定
  sheet.getRange(1, 1, 1, 9)
    .setBackground('#41C9B4')
    .setFontColor('#FFFFFF')
    .setFontWeight('bold');

  // 列幅を調整
  sheet.setColumnWidth(1, 300);
  sheet.setColumnWidth(2, 250);
  sheet.setColumnWidth(3, 120);
  sheet.setColumnWidth(4, 150);
  sheet.setColumnWidth(5, 150);
  sheet.setColumnWidth(6, 150);
  sheet.setColumnWidth(7, 150);
  sheet.setColumnWidth(8, 150);
  sheet.setColumnWidth(9, 80);
  
  // 1行目を固定
  sheet.setFrozenRows(1);
  
  return sheet;
}

/**
 * 全シートを初期セットアップ
 * @returns {Object} セットアップ結果
 */
function setupAllSheets() {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const results = [];
  
  // 設定シート
  if (!ss.getSheetByName(SETTINGS_SHEET_NAME)) {
    createSettingsSheet(ss);
    results.push('設定');
  }
  
  // 監視リストシート
  if (!ss.getSheetByName(WATCHLIST_SHEET_NAME)) {
    createWatchlistSheet(ss);
    results.push('監視リスト');
  }
  
  // 通知履歴シート
  if (!ss.getSheetByName(HISTORY_SHEET_NAME)) {
    createHistorySheet(ss);
    results.push('通知履歴');
  }
  
  if (results.length > 0) {
    return { 
      success: true, 
      message: `以下のシートを作成しました: ${results.join(', ')}` 
    };
  } else {
    return { 
      success: true, 
      message: 'すべてのシートは既に存在します' 
    };
  }
}

/**
 * 設定をリセット（シートの値をクリア）
 * @returns {Object} リセット結果
 */
function resetAllSettings() {
  const sheet = SpreadsheetApp.getActiveSpreadsheet().getSheetByName(SETTINGS_SHEET_NAME);
  
  if (!sheet) {
    return { success: false, message: '設定シートが見つかりません' };
  }
  
  // B列の設定値をクリア
  sheet.getRange(2, 2, 7, 1).clearContent();
  sheet.getRange(SETTING_ROWS.FILTER_DAYS, 2).setValue('1');
  sheet.getRange(SETTING_ROWS.EMAIL_ENABLED, 2).setValue('0');

  // セキュア設定もクリア
  const props = PropertiesService.getScriptProperties();
  Object.values(SECURE_PROPERTY_KEYS).forEach(key => props.deleteProperty(key));

  return { success: true, message: '設定をリセットしました' };
}

/**
 * LINE設定をスクリプトプロパティから取得
 * @returns {Object} LINE設定
 */
function getLineSettings() {
  const props = PropertiesService.getScriptProperties();
  return {
    channelAccessToken: props.getProperty(SECURE_PROPERTY_KEYS.LINE_CHANNEL_ACCESS_TOKEN) || '',
    userId: props.getProperty(SECURE_PROPERTY_KEYS.LINE_USER_ID) || ''
  };
}

/**
 * メール設定をスクリプトプロパティから取得
 * @returns {Object} メール設定
 */
function getEmailSettings() {
  const props = PropertiesService.getScriptProperties();
  return {
    to: props.getProperty(SECURE_PROPERTY_KEYS.EMAIL_TO) || '',
    password: props.getProperty(SECURE_PROPERTY_KEYS.EMAIL_PASSWORD) || ''
  };
}

/**
 * LINE設定をスクリプトプロパティに保存
 * @param {string} channelAccessToken - LINEチャネルアクセストークン
 * @param {string} userId - LINEユーザーID
 * @returns {Object} 保存結果
 */
function saveLineSettings(channelAccessToken, userId) {
  const props = PropertiesService.getScriptProperties();
  if (channelAccessToken) {
    props.setProperty(SECURE_PROPERTY_KEYS.LINE_CHANNEL_ACCESS_TOKEN, channelAccessToken);
  }
  if (userId) {
    props.setProperty(SECURE_PROPERTY_KEYS.LINE_USER_ID, userId);
  }
  return { success: true, message: 'LINE設定を保存しました' };
}
