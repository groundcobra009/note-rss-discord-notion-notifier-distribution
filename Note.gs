/**
 * Note.gs - note RSS取得・パース処理
 * 
 * noteのRSSフィードを取得し、記事情報をパースする
 */

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
    title: item.getChildText('title') || '',
    url: item.getChildText('link') || '',
    published: parsePubDate(item.getChildText('pubDate')),
    description: stripHtml(item.getChildText('description')),
    creator: getCreatorFromItem(item)
  }));
}

/**
 * pubDateをDateオブジェクトに変換
 * @param {string} pubDate - RFC 2822形式の日付文字列
 * @returns {Date} Dateオブジェクト
 */
function parsePubDate(pubDate) {
  if (!pubDate) return new Date();
  try {
    return new Date(pubDate);
  } catch (e) {
    Logger.log(`日付パースエラー: ${pubDate}`);
    return new Date();
  }
}

/**
 * RSS itemから作者名を取得
 * @param {XmlService.Element} item - RSS item要素
 * @returns {string} 作者名
 */
function getCreatorFromItem(item) {
  // dc:creator名前空間から取得を試みる
  const dcNs = XmlService.getNamespace('dc', 'http://purl.org/dc/elements/1.1/');
  const creator = item.getChild('creator', dcNs);
  if (creator) {
    return creator.getText();
  }
  
  // author要素から取得
  const author = item.getChildText('author');
  if (author) {
    return author;
  }
  
  return '';
}

/**
 * 記事ページからOGP情報を取得
 * @param {string} articleUrl - 記事URL
 * @returns {Object} OGP情報
 */
function fetchOgpData(articleUrl) {
  try {
    const response = UrlFetchApp.fetch(articleUrl, {
      muteHttpExceptions: true,
      followRedirects: true
    });
    
    if (response.getResponseCode() !== 200) {
      return { image: '', description: '' };
    }
    
    const html = response.getContentText();
    
    return {
      image: extractMetaContent(html, 'og:image'),
      description: extractMetaContent(html, 'og:description')
    };
  } catch (e) {
    Logger.log(`OGP取得エラー: ${e.message}`);
    return { image: '', description: '' };
  }
}

/**
 * HTMLタグを除去
 * @param {string} html - HTML文字列
 * @returns {string} プレーンテキスト
 */
function stripHtml(html) {
  if (!html) return '';
  return html
    .replace(/<[^>]*>/g, '')
    .replace(/&nbsp;/g, ' ')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .trim();
}

/**
 * OGPメタタグからコンテンツを抽出
 * @param {string} html - HTML文字列
 * @param {string} property - OGPプロパティ名
 * @returns {string} コンテンツ
 */
function extractMetaContent(html, property) {
  // property="og:xxx" content="yyy" 形式
  const regex1 = new RegExp(`<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`, 'i');
  const match1 = html.match(regex1);
  if (match1) return match1[1];
  
  // content="yyy" property="og:xxx" 形式
  const regex2 = new RegExp(`<meta[^>]+content=["']([^"']+)["'][^>]+property=["']${property}["']`, 'i');
  const match2 = html.match(regex2);
  if (match2) return match2[1];
  
  return '';
}

/**
 * 指定日数以内の記事をフィルタリング
 * @param {Array<Object>} articles - 記事配列
 * @param {number} days - フィルタ日数
 * @returns {Array<Object>} フィルタ済み記事配列
 */
function filterArticlesByDays(articles, days) {
  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return articles.filter(article => article.published >= cutoffDate);
}

/**
 * RSS URLの妥当性を検証
 * @param {string} url - RSS URL
 * @returns {boolean} 有効なURLかどうか
 */
function isValidNoteRssUrl(url) {
  if (!url) return false;
  return url.startsWith('https://note.com/') && url.includes('/rss');
}

