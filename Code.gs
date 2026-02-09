/**
 * Code.gs - メインエントリーポイント
 * 
 * note記事監視 → Discord・Notion・LINE・メール通知システム
 * メニュー作成、統括処理を管理
 */

/**
 * スプレッドシート起動時にメニューを作成
 */
function onOpen() {
  const ui = SpreadsheetApp.getUi();
  ui.createMenu('📝 note通知')
    .addItem('⚙️ 設定を開く', 'openSidebar')
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
 * @param {string} filename - ファイル名
 * @returns {string} HTMLコンテンツ
 */
function include(filename) {
  return HtmlService.createHtmlOutputFromFile(filename).getContent();
}

/**
 * 使い方ダイアログを開く
 */
function openHowToUse() {
  const html = HtmlService.createTemplateFromFile('HowToUse')
    .evaluate()
    .setWidth(600)
    .setHeight(500);
  SpreadsheetApp.getUi().showModalDialog(html, '📖 使い方ガイド');
}

/**
 * 初期セットアップを実行
 */
function runInitialSetup() {
  const ui = SpreadsheetApp.getUi();
  const result = setupAllSheets();
  ui.alert('🚀 初期セットアップ', result.message, ui.ButtonSet.OK);
}

/**
 * サイドバーから記事チェックを実行
 * @param {number} filterDays - フィルタ日数（省略時は設定値を使用）
 * @returns {Object} 実行結果
 */
function runCheckFromSidebar(filterDays) {
  const count = checkAllCreators(filterDays || undefined);
  return { success: true, message: count + '件の通知を送信しました。' };
}

/**
 * 全クリエイターをチェック
 * @param {number} overrideFilterDays - フィルタ日数（オプション）
 * @returns {number} 通知件数
 */
function checkAllCreators(overrideFilterDays) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const sheet = ss.getSheetByName(WATCHLIST_SHEET_NAME);
  let historySheet = ss.getSheetByName(HISTORY_SHEET_NAME);
  
  if (!sheet) {
    Logger.log('監視リストシートが見つかりません。初期セットアップを実行してください。');
    return 0;
  }
  
  // 通知履歴シートがなければ作成
  if (!historySheet) {
    historySheet = createHistorySheet(ss);
  }
  
  const filterDays = overrideFilterDays || parseInt(getSettings('FILTER_DAYS')) || 1;
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - filterDays);
  
  const lastRow = sheet.getLastRow();
  if (lastRow <= 1) {
    Logger.log('監視リストにデータがありません');
    return 0;
  }
  
  const data = sheet.getRange(2, 1, lastRow - 1, 4).getValues();
  let notificationCount = 0;

  // 通知済みURLを取得
  const notifiedUrls = getNotifiedUrls(historySheet);

  // ダイジェストメール用の記事蓄積リスト
  const digestItems = [];
  // 履歴書き込み用の結果リスト
  const historyBuffer = [];

  for (let i = 0; i < data.length; i++) {
    const [creatorName, enabled, rssUrl, memo] = data[i];

    // 空行または無効な行はスキップ
    if (!creatorName || !rssUrl) continue;

    // 有効フラグのチェック（1, true, "TRUE" など）
    if (!enabled || enabled === 0 || enabled === '0' || enabled === false || enabled === 'FALSE') continue;

    try {
      Logger.log(`${creatorName}の記事を取得中...`);
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

        // LINE通知（オプション）
        const lineSuccess = sendLineNotification(creatorName, article);

        // メール用に記事を蓄積（ループ後にまとめて送信）
        digestItems.push({ creatorName, article });

        // 履歴バッファに追加（メール結果はループ後に確定）
        historyBuffer.push({ article, creatorName, discordSuccess, notionSuccess: notionResult.success, lineSuccess });

        // 通知済みURLに追加（重複防止）
        notifiedUrls.add(article.url);

        // いずれかの通知が成功していればカウント
        if (discordSuccess || lineSuccess) notificationCount++;

        // レート制限対策（1秒待機）
        Utilities.sleep(1000);
      }
    } catch (e) {
      Logger.log(`${creatorName}の取得エラー: ${e.message}`);
    }
  }

  // ダイジェストメール送信（全記事をまとめて1通）
  const emailSuccess = digestItems.length > 0 ? sendEmailDigest(digestItems) : false;
  if (emailSuccess) notificationCount++;

  // 履歴に書き込み
  for (const entry of historyBuffer) {
    addToHistory(historySheet, entry.article, entry.creatorName, {
      discord: entry.discordSuccess,
      notion: entry.notionSuccess,
      line: entry.lineSuccess,
      email: emailSuccess
    });
  }

  Logger.log(`処理完了: ${notificationCount}件の通知を送信`);
  return notificationCount;
}


/**
 * 通知済みURLのセットを取得
 * @param {GoogleAppsScript.Spreadsheet.Sheet} historySheet - 通知履歴シート
 * @returns {Set<string>} 通知済みURLのセット
 */
function getNotifiedUrls(historySheet) {
  const urls = new Set();
  if (!historySheet) return urls;
  
  const lastRow = historySheet.getLastRow();
  if (lastRow <= 1) return urls;
  
  const data = historySheet.getRange(2, 2, lastRow - 1, 1).getValues();
  for (let i = 0; i < data.length; i++) {
    if (data[i][0]) urls.add(data[i][0]);
  }
  return urls;
}

/**
 * 履歴に追加
 * @param {GoogleAppsScript.Spreadsheet.Sheet} sheet - 通知履歴シート
 * @param {Object} article - 記事情報
 * @param {string} creatorName - クリエイター名
 * @param {Object} results - 各チャネルの送信結果
 * @param {boolean} results.discord - Discord送信成功フラグ
 * @param {boolean} results.notion - Notion追加成功フラグ
 * @param {boolean} results.line - LINE送信成功フラグ
 * @param {boolean} results.email - メール送信成功フラグ
 */
function addToHistory(sheet, article, creatorName, results) {
  if (!sheet) return;

  const now = new Date();
  const allResults = [results.discord, results.notion, results.line, results.email];
  const attempted = allResults.filter(r => r !== false);
  const succeeded = allResults.filter(r => r === true);

  let status = '成功';
  if (succeeded.length === 0) {
    status = '失敗';
  } else if (succeeded.length < attempted.length) {
    status = '一部失敗';
  }

  sheet.appendRow([
    article.title,
    article.url,
    creatorName,
    article.published,
    results.discord ? now : '',
    results.notion ? now : '',
    results.line ? now : '',
    results.email ? now : '',
    status
  ]);
}

