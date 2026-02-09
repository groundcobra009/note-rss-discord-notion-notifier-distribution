/**
 * Discord.gs - Discord Webhook送信処理
 * 
 * Discord Webhookを使用した通知送信を管理
 */

// noteのブランドカラー（#41C9B4 = 4311476）
const NOTE_BRAND_COLOR = 4311476;

/**
 * Discordに記事通知を送信
 * @param {string} creatorName - クリエイター名
 * @param {Object} article - 記事情報
 * @returns {boolean} 送信成功フラグ
 */
function sendDiscordNotification(creatorName, article) {
  const webhookUrl = getSettings('DISCORD_WEBHOOK_URL');
  const notionPageUrl = getSettings('NOTION_PAGE_URL');
  
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
  
  // 説明文を150文字に制限
  const description = article.description 
    ? (article.description.length > 150 
        ? article.description.substring(0, 150) + '...' 
        : article.description)
    : '';
  
  const fields = [
    { name: '👤 クリエイター', value: creatorName, inline: true },
    { name: '📅 公開日時', value: publishedDate, inline: true },
    { name: '🔗 記事URL', value: `[こちらをクリック](${article.url})`, inline: false }
  ];
  
  // Notion固定リンクがあれば追加
  if (notionPageUrl) {
    fields.push({ name: '📝 Notion', value: `[こちら](${notionPageUrl})`, inline: false });
  }
  
  const payload = {
    username: 'note通知Bot',
    avatar_url: 'https://assets.st-note.com/production/uploads/images/favicon/note_icon.png',
    content: `📝 **${creatorName}** から新しい記事が投稿されました！`,
    embeds: [{
      title: article.title,
      url: article.url,
      description: description,
      color: NOTE_BRAND_COLOR,
      thumbnail: article.thumbnail ? { url: article.thumbnail } : undefined,
      fields: fields,
      footer: { text: 'note通知Bot' },
      timestamp: article.published.toISOString()
    }]
  };
  
  // thumbnailがない場合は削除
  if (!article.thumbnail) {
    delete payload.embeds[0].thumbnail;
  }
  
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
    return { 
      success: false, 
      message: 'URLの形式が正しくありません。https://discord.com/api/webhooks/ で始まるURLを入力してください。' 
    };
  }
  
  const testPayload = {
    username: 'note通知Bot',
    avatar_url: 'https://assets.st-note.com/production/uploads/images/favicon/note_icon.png',
    embeds: [{
      title: '🔗 接続テスト成功！',
      description: 'note通知システムからのテストメッセージです。\nDiscordへの通知が正常に動作しています。',
      color: 5763719, // 緑色
      footer: { text: 'note通知Bot - 接続テスト' },
      timestamp: new Date().toISOString()
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
    } else if (statusCode === 401) {
      return { success: false, message: 'Webhook URLが無効です。URLを確認してください。' };
    } else if (statusCode === 404) {
      return { success: false, message: 'Webhookが見つかりません。URLを確認してください。' };
    } else {
      return { success: false, message: `接続失敗（エラーコード: ${statusCode}）` };
    }
  } catch (e) {
    return { success: false, message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。' };
  }
}

/**
 * テスト用のDiscord Webhook URL検証（保存前チェック用）
 * @param {string} url - Webhook URL
 * @returns {Object} 検証結果
 */
function validateDiscordWebhookUrl(url) {
  if (!url) {
    return { valid: false, message: 'URLを入力してください' };
  }
  
  if (!url.startsWith('https://discord.com/api/webhooks/') && 
      !url.startsWith('https://discordapp.com/api/webhooks/')) {
    return { 
      valid: false, 
      message: 'Discord Webhook URLの形式が正しくありません' 
    };
  }
  
  return { valid: true, message: '' };
}

