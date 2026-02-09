/**
 * Notion.gs - Notion API連携処理
 * 
 * Notion APIを使用したデータベースへのページ追加を管理
 */

const NOTION_API_VERSION = '2022-06-28';

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
  
  // 概要を2000文字に制限
  const description = article.description 
    ? article.description.substring(0, 2000) 
    : '';
  
  const payload = {
    parent: { database_id: databaseId },
    properties: {
      'タイトル': {
        title: [{ text: { content: article.title || '' } }]
      },
      'URL': {
        url: article.url || null
      },
      'クリエイター': {
        select: { name: article.creator || '不明' }
      },
      '公開日': {
        date: { start: article.published.toISOString() }
      },
      '概要': {
        rich_text: [{ text: { content: description } }]
      },
      '取得日時': {
        date: { start: new Date().toISOString() }
      }
    },
    children: buildPageContent(article)
  };
  
  try {
    const response = UrlFetchApp.fetch('https://api.notion.com/v1/pages', {
      method: 'post',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': NOTION_API_VERSION,
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
      const errorBody = response.getContentText();
      Logger.log(`Notion追加失敗: ${statusCode} - ${errorBody}`);
      return { success: false, message: `エラーコード: ${statusCode}` };
    }
  } catch (e) {
    Logger.log(`Notionエラー: ${e.message}`);
    return { success: false, message: e.message };
  }
}

/**
 * ページ本文のブロックを構築
 * @param {Object} article - 記事情報
 * @returns {Array} ブロック配列
 */
function buildPageContent(article) {
  const blocks = [];
  
  // 概要テキスト
  if (article.description) {
    blocks.push({
      object: 'block',
      type: 'paragraph',
      paragraph: {
        rich_text: [{
          type: 'text',
          text: { content: article.description.substring(0, 2000) }
        }]
      }
    });
  }
  
  // 区切り線
  blocks.push({
    object: 'block',
    type: 'divider',
    divider: {}
  });
  
  // 記事へのブックマーク
  blocks.push({
    object: 'block',
    type: 'bookmark',
    bookmark: { url: article.url }
  });
  
  return blocks;
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
  
  // データベースIDをフォーマット（ハイフンなしの場合に対応）
  const formattedDbId = formatDatabaseId(databaseId);
  
  try {
    const response = UrlFetchApp.fetch(`https://api.notion.com/v1/databases/${formattedDbId}`, {
      method: 'get',
      headers: {
        'Authorization': `Bearer ${apiKey}`,
        'Notion-Version': NOTION_API_VERSION
      },
      muteHttpExceptions: true
    });
    
    const statusCode = response.getResponseCode();
    
    if (statusCode === 200) {
      const data = JSON.parse(response.getContentText());
      const dbTitle = data.title && data.title[0] ? data.title[0].plain_text : 'Untitled';
      return { 
        success: true, 
        message: `接続成功！データベース「${dbTitle}」に接続しました。` 
      };
    } else if (statusCode === 401) {
      return { success: false, message: 'API Keyが無効です。正しいInternal Integration Tokenを入力してください。' };
    } else if (statusCode === 404) {
      return { 
        success: false, 
        message: 'データベースが見つかりません。IDを確認するか、IntegrationをデータベースにConnect（共有）してください。' 
      };
    } else {
      return { success: false, message: `接続失敗（エラーコード: ${statusCode}）` };
    }
  } catch (e) {
    return { success: false, message: 'ネットワークエラーが発生しました。インターネット接続を確認してください。' };
  }
}

/**
 * データベースIDをフォーマット（ハイフン付き32文字形式に）
 * @param {string} id - データベースID
 * @returns {string} フォーマット済みID
 */
function formatDatabaseId(id) {
  // 既にハイフンが含まれている場合はそのまま返す
  if (id.includes('-')) {
    return id;
  }
  
  // 32文字のIDをハイフン付きに変換（8-4-4-4-12形式）
  if (id.length === 32) {
    return `${id.slice(0,8)}-${id.slice(8,12)}-${id.slice(12,16)}-${id.slice(16,20)}-${id.slice(20,32)}`;
  }
  
  return id;
}

/**
 * Notion API Key検証（保存前チェック用）
 * @param {string} key - API Key
 * @returns {Object} 検証結果
 */
function validateNotionApiKey(key) {
  if (!key) {
    return { valid: false, message: 'API Keyを入力してください' };
  }
  
  if (!key.startsWith('secret_') && !key.startsWith('ntn_')) {
    return { 
      valid: false, 
      message: 'Notion API Keyの形式が正しくありません' 
    };
  }
  
  return { valid: true, message: '' };
}

/**
 * データベースID検証（保存前チェック用）
 * @param {string} id - データベースID
 * @returns {Object} 検証結果
 */
function validateNotionDatabaseId(id) {
  if (!id) {
    return { valid: false, message: 'データベースIDを入力してください' };
  }
  
  // ハイフンを除去して32文字かチェック
  const cleanId = id.replace(/-/g, '');
  if (cleanId.length !== 32) {
    return { 
      valid: false, 
      message: 'データベースIDの形式が正しくありません（32文字の英数字）' 
    };
  }
  
  return { valid: true, message: '' };
}

