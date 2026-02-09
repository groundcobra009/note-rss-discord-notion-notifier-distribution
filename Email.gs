/**
 * Email.gs - メール通知処理（ダイジェスト版）
 *
 * GASのMailAppを使用したメール通知送信を管理
 * 1回の実行でまとまった記事を「本日の新着記事」として一括送信
 * 送信先メールアドレスはスクリプトプロパティに保存
 */

/**
 * 複数記事をまとめてダイジェストメールとして送信
 * @param {Array<{creatorName: string, article: Object}>} items - 記事リスト
 * @returns {boolean} 送信成功フラグ
 */
function sendEmailDigest(items) {
  const emailEnabled = getSettings('EMAIL_ENABLED');
  const emailSettings = getEmailSettings();

  if (emailEnabled !== '1' || !emailSettings.to) {
    Logger.log('メール通知は無効またはメールアドレス未設定（スキップ）');
    return false;
  }

  if (!items || items.length === 0) {
    Logger.log('メール送信対象の記事がありません');
    return false;
  }

  const today = Utilities.formatDate(new Date(), Session.getScriptTimeZone(), 'yyyy/MM/dd');

  // 件名テンプレート
  const subjectTemplate = getSettings('EMAIL_SUBJECT') || '【note新着】本日の新着記事 {count}件';
  const subject = applyTemplate(subjectTemplate, {
    '{count}': String(items.length),
    '{date}': today
  });

  // プレーンテキスト本文
  const bodyLines = [`${today} の新着記事（${items.length}件）`, ''];
  for (const item of items) {
    const pubDate = Utilities.formatDate(
      item.article.published,
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm'
    );
    bodyLines.push(`■ ${item.article.title}`);
    bodyLines.push(`  ${item.creatorName} / ${pubDate}`);
    bodyLines.push(`  ${item.article.url}`);
    bodyLines.push('');
  }
  bodyLines.push('---');
  bodyLines.push('note通知Bot から自動送信');
  const body = bodyLines.join('\n');

  // HTML版
  const htmlBody = buildDigestHtmlEmail(items, today);

  try {
    MailApp.sendEmail({
      to: emailSettings.to,
      subject: subject,
      body: body,
      htmlBody: htmlBody
    });
    Logger.log(`ダイジェストメール送信成功: ${items.length}件 → ${emailSettings.to}`);
    return true;
  } catch (e) {
    Logger.log(`メール送信エラー: ${e.message}`);
    return false;
  }
}

/**
 * テンプレートにプレースホルダーを適用
 * @param {string} template - テンプレート文字列
 * @param {Object} replacements - 置換マップ
 * @returns {string} 置換済み文字列
 */
function applyTemplate(template, replacements) {
  let result = template;
  for (const [key, value] of Object.entries(replacements)) {
    result = result.split(key).join(value);
  }
  return result;
}

/**
 * ダイジェスト用HTML形式のメール本文を構築
 * @param {Array<{creatorName: string, article: Object}>} items - 記事リスト
 * @param {string} today - 今日の日付文字列
 * @returns {string} HTML文字列
 */
function buildDigestHtmlEmail(items, today) {
  const articleCards = items.map(item => {
    const pubDate = Utilities.formatDate(
      item.article.published,
      Session.getScriptTimeZone(),
      'yyyy/MM/dd HH:mm'
    );

    const description = item.article.description
      ? (item.article.description.length > 150
          ? item.article.description.substring(0, 150) + '...'
          : item.article.description)
      : '';

    const thumbnailHtml = item.article.thumbnail
      ? `<img src="${item.article.thumbnail}" alt="" style="width:100%;max-width:440px;border-radius:6px;margin-bottom:12px;">`
      : '';

    return `
      <div style="margin-bottom:20px;padding:16px;background:#ffffff;border-radius:8px;border:1px solid #e8e8e8;">
        ${thumbnailHtml}
        <h3 style="margin:0 0 6px;font-size:16px;">
          <a href="${item.article.url}" style="color:#333;text-decoration:none;">${item.article.title || ''}</a>
        </h3>
        <p style="margin:0 0 4px;font-size:13px;color:#41C9B4;font-weight:500;">${item.creatorName}</p>
        <p style="margin:0 0 8px;font-size:12px;color:#999;">${pubDate}</p>
        ${description ? `<p style="margin:0 0 12px;font-size:13px;color:#666;line-height:1.5;">${description}</p>` : ''}
        <a href="${item.article.url}" style="display:inline-block;padding:8px 20px;background:#41C9B4;color:#fff;text-decoration:none;border-radius:5px;font-size:13px;">記事を読む</a>
      </div>`;
  }).join('');

  return `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Hiragino Sans','Noto Sans JP',sans-serif;background:#f5f5f5;">
  <div style="max-width:560px;margin:20px auto;background:#f5f5f5;">
    <div style="background:#41C9B4;padding:20px 24px;border-radius:12px 12px 0 0;">
      <h2 style="margin:0;color:#ffffff;font-size:18px;">📝 本日の新着記事</h2>
      <p style="margin:6px 0 0;color:rgba(255,255,255,0.85);font-size:13px;">${today} / ${items.length}件の新着</p>
    </div>
    <div style="padding:20px 24px;background:#f0f0f0;border-radius:0 0 12px 12px;">
      ${articleCards}
    </div>
    <div style="padding:16px 24px;text-align:center;font-size:11px;color:#999;">
      note通知Bot から自動送信
    </div>
  </div>
</body>
</html>`.trim();
}

/**
 * メール送信テスト
 * @returns {Object} テスト結果
 */
function testEmailNotification() {
  const emailSettings = getEmailSettings();

  if (!emailSettings.to) {
    return { success: false, message: '送信先メールアドレスが設定されていません' };
  }

  try {
    const remaining = MailApp.getRemainingDailyQuota();
    if (remaining <= 0) {
      return { success: false, message: '本日のメール送信上限に達しています' };
    }

    MailApp.sendEmail({
      to: emailSettings.to,
      subject: '【note通知Bot】接続テスト',
      body: 'note通知Botからのテストメールです。メール通知が正常に動作しています。',
      htmlBody: `
<!DOCTYPE html>
<html>
<head><meta charset="UTF-8"></head>
<body style="margin:0;padding:0;font-family:'Hiragino Sans','Noto Sans JP',sans-serif;background:#f5f5f5;">
  <div style="max-width:520px;margin:20px auto;background:#ffffff;border-radius:12px;overflow:hidden;box-shadow:0 2px 8px rgba(0,0,0,0.1);">
    <div style="background:#41C9B4;padding:16px 24px;">
      <h2 style="margin:0;color:#ffffff;font-size:16px;">接続テスト成功</h2>
    </div>
    <div style="padding:24px;text-align:center;">
      <p style="font-size:14px;color:#333;line-height:1.6;">
        note通知Botからのテストメールです。<br>
        メール通知が正常に動作しています。
      </p>
      <p style="font-size:12px;color:#999;margin-top:16px;">
        残り送信可能数: ${remaining - 1}通/日
      </p>
    </div>
  </div>
</body>
</html>`.trim()
    });

    return { success: true, message: `テストメールを ${emailSettings.to} に送信しました` };
  } catch (e) {
    return { success: false, message: `メール送信エラー: ${e.message}` };
  }
}
