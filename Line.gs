/**
 * Line.gs - LINE Messaging API連携処理
 *
 * LINE公式アカウントからのプッシュメッセージ送信を管理
 * ※LINE Notifyは2025年3月末で廃止のため、Messaging APIを使用
 */

const LINE_PUSH_URL = 'https://api.line.me/v2/bot/message/push';
const LINE_BOT_INFO_URL = 'https://api.line.me/v2/bot/info';

/**
 * LINE Messaging APIで記事通知を送信
 * @param {string} creatorName - クリエイター名
 * @param {Object} article - 記事情報
 * @returns {boolean} 送信成功フラグ
 */
function sendLineNotification(creatorName, article) {
  const lineSettings = getLineSettings();

  if (!lineSettings.channelAccessToken || !lineSettings.userId) {
    Logger.log('LINE設定が不完全です（スキップ）');
    return false;
  }

  const publishedDate = Utilities.formatDate(
    article.published,
    Session.getScriptTimeZone(),
    'yyyy/MM/dd HH:mm'
  );

  // 説明文を100文字に制限
  const description = article.description
    ? (article.description.length > 100
        ? article.description.substring(0, 100) + '...'
        : article.description)
    : '';

  // Flex Messageで記事情報を送信
  const flexMessage = buildArticleFlexMessage(creatorName, article, publishedDate, description);

  const payload = {
    to: lineSettings.userId,
    messages: [flexMessage]
  };

  try {
    const response = fetchLineApi(LINE_PUSH_URL, 'post', lineSettings.channelAccessToken, payload);
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      Logger.log(`LINE通知成功: ${article.title}`);
      return true;
    } else {
      const errorBody = response.getContentText();
      Logger.log(`LINE通知失敗: ${statusCode} - ${errorBody}`);
      return false;
    }
  } catch (e) {
    Logger.log(`LINE送信エラー: ${e.message}`);
    return false;
  }
}

/**
 * 記事通知用のFlex Messageを構築
 * @param {string} creatorName - クリエイター名
 * @param {Object} article - 記事情報
 * @param {string} publishedDate - フォーマット済み公開日時
 * @param {string} description - 説明文（制限済み）
 * @returns {Object} Flex Messageオブジェクト
 */
function buildArticleFlexMessage(creatorName, article, publishedDate, description) {
  const bodyContents = [
    {
      type: 'text',
      text: article.title || '（タイトルなし）',
      weight: 'bold',
      size: 'md',
      wrap: true,
      maxLines: 3
    },
    {
      type: 'text',
      text: creatorName,
      size: 'sm',
      color: '#41C9B4',
      margin: 'md'
    },
    {
      type: 'text',
      text: publishedDate,
      size: 'xs',
      color: '#999999',
      margin: 'sm'
    }
  ];

  if (description) {
    bodyContents.push({
      type: 'separator',
      margin: 'lg'
    });
    bodyContents.push({
      type: 'text',
      text: description,
      size: 'xs',
      color: '#666666',
      wrap: true,
      margin: 'md'
    });
  }

  return {
    type: 'flex',
    altText: `${creatorName}さんの新着記事: ${article.title}`,
    contents: {
      type: 'bubble',
      header: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'text',
          text: 'note 新着記事',
          color: '#FFFFFF',
          size: 'sm',
          weight: 'bold'
        }],
        backgroundColor: '#41C9B4',
        paddingAll: '12px'
      },
      body: {
        type: 'box',
        layout: 'vertical',
        contents: bodyContents,
        paddingAll: '16px'
      },
      footer: {
        type: 'box',
        layout: 'vertical',
        contents: [{
          type: 'button',
          action: {
            type: 'uri',
            label: '記事を読む',
            uri: article.url
          },
          style: 'primary',
          color: '#41C9B4'
        }],
        paddingAll: '12px'
      }
    }
  };
}

/**
 * LINE API共通リクエスト関数（リトライ付き）
 * @param {string} url - APIエンドポイント
 * @param {string} method - HTTPメソッド
 * @param {string} token - チャネルアクセストークン
 * @param {Object} payload - リクエストボディ（省略可）
 * @returns {HTTPResponse} レスポンス
 */
function fetchLineApi(url, method, token, payload) {
  const options = {
    method: method,
    headers: {
      'Authorization': `Bearer ${token}`,
      'Content-Type': 'application/json'
    },
    muteHttpExceptions: true
  };

  if (payload) {
    options.payload = JSON.stringify(payload);
  }

  // リトライ（5xxエラー時、最大3回）
  const maxRetries = 3;
  for (let attempt = 0; attempt < maxRetries; attempt++) {
    const response = UrlFetchApp.fetch(url, options);
    const statusCode = response.getResponseCode();

    if (statusCode < 500) {
      return response;
    }

    Logger.log(`LINE API ${statusCode}エラー、リトライ ${attempt + 1}/${maxRetries}`);
    if (attempt < maxRetries - 1) {
      Utilities.sleep(Math.pow(2, attempt) * 1000);
    }
  }

  return UrlFetchApp.fetch(url, options);
}

/**
 * LINE Messaging API接続テスト
 * @returns {Object} テスト結果
 */
function testLineConnection() {
  const lineSettings = getLineSettings();

  if (!lineSettings.channelAccessToken) {
    return { success: false, message: 'チャネルアクセストークンが設定されていません' };
  }

  try {
    const response = fetchLineApi(LINE_BOT_INFO_URL, 'get', lineSettings.channelAccessToken);
    const statusCode = response.getResponseCode();

    if (statusCode === 200) {
      const data = JSON.parse(response.getContentText());
      const botName = data.displayName || 'Bot';
      return {
        success: true,
        message: `接続成功！Bot名: ${botName}`
      };
    } else if (statusCode === 401) {
      return { success: false, message: 'チャネルアクセストークンが無効です。LINE Developers Consoleで確認してください。' };
    } else {
      return { success: false, message: `接続失敗（エラーコード: ${statusCode}）` };
    }
  } catch (e) {
    return { success: false, message: 'ネットワークエラーが発生しました。' };
  }
}

/**
 * LINEチャネルアクセストークンの検証
 * @param {string} token - チャネルアクセストークン
 * @returns {Object} 検証結果
 */
function validateLineToken(token) {
  if (!token) {
    return { valid: false, message: 'チャネルアクセストークンを入力してください' };
  }
  if (token.length < 50) {
    return { valid: false, message: 'チャネルアクセストークンの形式が正しくありません' };
  }
  return { valid: true, message: '' };
}

/**
 * LINE User IDの検証
 * @param {string} userId - ユーザーID
 * @returns {Object} 検証結果
 */
function validateLineUserId(userId) {
  if (!userId) {
    return { valid: false, message: 'ユーザーIDを入力してください' };
  }
  if (!userId.startsWith('U') || userId.length !== 33) {
    return { valid: false, message: 'ユーザーIDは「U」で始まる33文字の英数字です' };
  }
  return { valid: true, message: '' };
}
