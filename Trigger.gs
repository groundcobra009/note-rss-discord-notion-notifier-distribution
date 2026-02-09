/**
 * Trigger.gs - トリガー管理
 * 
 * 定期実行トリガーの作成・削除・取得を管理
 */

const TRIGGER_FUNCTION_NAME = 'checkAllCreators';

/**
 * 現在のトリガー情報を取得
 * @returns {Object} トリガー情報
 */
function getTriggerInfo() {
  const triggers = ScriptApp.getProjectTriggers();
  const targetTrigger = triggers.find(t => t.getHandlerFunction() === TRIGGER_FUNCTION_NAME);
  
  if (!targetTrigger) {
    return {
      exists: false,
      type: null,
      interval: null,
      hour: null
    };
  }
  
  const triggerType = targetTrigger.getTriggerSource();
  
  if (triggerType === ScriptApp.TriggerSource.CLOCK) {
    // 時間ベースのトリガー
    return {
      exists: true,
      type: 'time',
      interval: getTriggerInterval(targetTrigger),
      hour: getTriggerHour(targetTrigger)
    };
  }
  
  return {
    exists: true,
    type: 'unknown',
    interval: null,
    hour: null
  };
}

/**
 * トリガーの実行間隔を取得
 * @param {ScriptApp.Trigger} trigger - トリガー
 * @returns {string|null} 実行間隔
 */
function getTriggerInterval(trigger) {
  try {
    // トリガーのUniqueIdを使って識別
    const props = PropertiesService.getScriptProperties();
    const savedInterval = props.getProperty('TRIGGER_INTERVAL');
    return savedInterval || null;
  } catch (e) {
    return null;
  }
}

/**
 * トリガーの実行時刻を取得
 * @param {ScriptApp.Trigger} trigger - トリガー
 * @returns {number|null} 実行時刻（時）
 */
function getTriggerHour(trigger) {
  try {
    const props = PropertiesService.getScriptProperties();
    const savedHour = props.getProperty('TRIGGER_HOUR');
    return savedHour ? parseInt(savedHour) : null;
  } catch (e) {
    return null;
  }
}

/**
 * 定期実行トリガーを作成
 * @param {string} intervalType - 間隔タイプ（'hourly', 'daily'）
 * @param {number} intervalValue - 間隔値（時間数）または実行時刻（時）
 * @returns {Object} 作成結果
 */
function createTimeTrigger(intervalType, intervalValue) {
  // 既存のトリガーを削除
  deleteTrigger();
  
  const props = PropertiesService.getScriptProperties();
  
  try {
    if (intervalType === 'hourly') {
      // 時間間隔トリガー（有効値: 1, 2, 3, 6, 12, 24）
      const validIntervals = [1, 2, 3, 6, 12, 24];
      const hours = validIntervals.includes(intervalValue) ? intervalValue : 1;
      ScriptApp.newTrigger(TRIGGER_FUNCTION_NAME)
        .timeBased()
        .everyHours(hours)
        .create();
      
      props.setProperty('TRIGGER_INTERVAL', String(intervalValue));
      props.deleteProperty('TRIGGER_HOUR');
      
      return { 
        success: true, 
        message: `${intervalValue}時間ごとの定期実行を設定しました` 
      };
      
    } else if (intervalType === 'daily') {
      // 毎日特定時刻トリガー
      ScriptApp.newTrigger(TRIGGER_FUNCTION_NAME)
        .timeBased()
        .atHour(intervalValue)
        .everyDays(1)
        .create();
      
      props.deleteProperty('TRIGGER_INTERVAL');
      props.setProperty('TRIGGER_HOUR', String(intervalValue));
      
      return { 
        success: true, 
        message: `毎日 ${intervalValue}:00 に実行するよう設定しました` 
      };
    }
    
    return { success: false, message: '不正な間隔タイプです' };
    
  } catch (e) {
    Logger.log(`トリガー作成エラー: ${e.message}`);
    return { success: false, message: `トリガー作成に失敗しました: ${e.message}` };
  }
}

/**
 * トリガーを削除
 * @returns {Object} 削除結果
 */
function deleteTrigger() {
  const triggers = ScriptApp.getProjectTriggers();
  let deleted = false;
  
  triggers.forEach(trigger => {
    if (trigger.getHandlerFunction() === TRIGGER_FUNCTION_NAME) {
      ScriptApp.deleteTrigger(trigger);
      deleted = true;
    }
  });
  
  // 保存されたトリガー情報をクリア
  const props = PropertiesService.getScriptProperties();
  props.deleteProperty('TRIGGER_INTERVAL');
  props.deleteProperty('TRIGGER_HOUR');
  
  if (deleted) {
    return { success: true, message: 'トリガーを削除しました' };
  }
  return { success: true, message: '削除するトリガーがありませんでした' };
}

/**
 * トリガーダイアログを開く
 */
function openTriggerDialog() {
  const html = HtmlService.createTemplateFromFile('TriggerDialog')
    .evaluate()
    .setWidth(450)
    .setHeight(400);
  SpreadsheetApp.getUi().showModalDialog(html, '⏰ トリガー設定');
}

