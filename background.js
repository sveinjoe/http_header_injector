// =============================================================================
// HTTP Header Injector - Service Worker
// 负责根据用户配置动态更新 declarativeNetRequest 规则
// =============================================================================

const RULE_ID_BASE = 1000;
const STORAGE_KEY = 'headerRules';

/**
 * 将用户配置的 header 列表转换为 declarativeNetRequest 规则
 */
function buildRules(headers) {
  return headers
    .filter(h => h.name && h.name.trim() && h.value !== undefined)
    .map((header, index) => ({
      id: RULE_ID_BASE + index,
      priority: 1,
      action: {
        type: 'modifyHeaders',
        requestHeaders: [
          {
            header: header.name.trim(),
            operation: header.override ? 'set' : 'set',
            value: header.value
          }
        ]
      },
      condition: {
        urlFilter: '*',
        resourceTypes: [
          'main_frame', 'sub_frame', 'stylesheet', 'script',
          'image', 'font', 'object', 'xmlhttprequest',
          'ping', 'csp_report', 'media', 'websocket',
          'webtransport', 'webbundle', 'other'
        ]
      }
    }));
}

/**
 * 从 storage 读取配置并更新动态规则
 */
async function syncRules() {
  try {
    const result = await chrome.storage.local.get(STORAGE_KEY);
    const headers = result[STORAGE_KEY] || [];

    if (headers.length === 0) {
      // 没有规则，清除所有动态规则
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeIds = existingRules.map(r => r.id);
      if (removeIds.length > 0) {
        await chrome.declarativeNetRequest.updateDynamicRules({
          removeRuleIds: removeIds
        });
      }
      console.log('[Header Injector] 已清除所有规则');
    } else {
      const newRules = buildRules(headers);

      // 获取当前已有规则 ID
      const existingRules = await chrome.declarativeNetRequest.getDynamicRules();
      const removeIds = existingRules.map(r => r.id);

      await chrome.declarativeNetRequest.updateDynamicRules({
        removeRuleIds: removeIds,
        addRules: newRules
      });

      console.log('[Header Injector] 已更新', newRules.length, '条规则');
      newRules.forEach(rule => {
        const h = rule.action.requestHeaders[0];
        console.log('  -', h.header + ':', h.value);
      });
    }
  } catch (err) {
    console.error('[Header Injector] 规则同步失败:', err);
  }
}

// 监听 storage 变化
chrome.storage.onChanged.addListener((changes, areaName) => {
  if (areaName === 'local' && changes[STORAGE_KEY]) {
    syncRules();
  }
});

// 初始化：安装/更新时同步规则
chrome.runtime.onInstalled.addListener(() => {
  console.log('[Header Injector] 插件已安装/更新');
  // 设置默认规则
  chrome.storage.local.get(STORAGE_KEY, (result) => {
    if (!result[STORAGE_KEY]) {
      chrome.storage.local.set({
        [STORAGE_KEY]: [
          { name: 'client_id', value: 'abcd123456', override: true }
        ]
      });
    } else {
      syncRules();
    }
  });
});

// 启动时同步规则
syncRules();
