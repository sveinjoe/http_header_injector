// =============================================================================
// HTTP Header Injector - Popup Logic
// =============================================================================

const STORAGE_KEY = 'headerRules';

// 状态
let headers = [];
let editingIndex = -1;

// DOM 元素
const rulesList = document.getElementById('rulesList');
const emptyState = document.getElementById('emptyState');
const headerNameInput = document.getElementById('headerName');
const headerValueInput = document.getElementById('headerValue');
const addBtn = document.getElementById('addBtn');
const ruleCount = document.getElementById('ruleCount');
const toggleAllBtn = document.getElementById('toggleAllBtn');
const toggleText = document.getElementById('toggleText');
const exportBtn = document.getElementById('exportBtn');
const importBtn = document.getElementById('importBtn');

// =============================================================================
// 初始化
// =============================================================================
document.addEventListener('DOMContentLoaded', async () => {
  await loadHeaders();

  addBtn.addEventListener('click', handleAdd);
  headerNameInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdd();
  });
  headerValueInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') handleAdd();
  });

  toggleAllBtn.addEventListener('click', handleToggleAll);
  exportBtn.addEventListener('click', handleExport);
  importBtn.addEventListener('click', handleImport);
});

// =============================================================================
// 数据操作
// =============================================================================
async function loadHeaders() {
  const result = await chrome.storage.local.get(STORAGE_KEY);
  headers = result[STORAGE_KEY] || [];
  render();
}

async function saveHeaders() {
  await chrome.storage.local.set({ [STORAGE_KEY]: headers });
}

// =============================================================================
// 渲染
// =============================================================================
function render() {
  rulesList.innerHTML = '';
  ruleCount.textContent = headers.length;

  if (headers.length === 0) {
    emptyState.classList.remove('hidden');
    toggleAllBtn.style.display = 'none';
  } else {
    emptyState.classList.add('hidden');
    toggleAllBtn.style.display = 'flex';

    headers.forEach((header, index) => {
      const item = createRuleItem(header, index);
      rulesList.appendChild(item);
    });
  }

  updateToggleButtonState();
}

function createRuleItem(header, index) {
  const div = document.createElement('div');
  div.className = 'rule-item';

  if (editingIndex === index) {
    div.classList.add('editing');
    div.innerHTML = `
      <div class="edit-form">
        <input type="text" class="edit-name" value="${escapeHtml(header.name)}" placeholder="Header 名称">
        <input type="text" class="edit-value" value="${escapeHtml(header.value)}" placeholder="Header 值">
        <button class="edit-save-btn save-edit" data-index="${index}" title="保存">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 7.5L5.5 10l5.5-6"/>
          </svg>
        </button>
        <button class="edit-cancel-btn cancel-edit" title="取消">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="2">
            <path d="M3 3l8 8M11 3l-8 8"/>
          </svg>
        </button>
      </div>
    `;

    // 绑定事件
    setTimeout(() => {
      const saveBtn = div.querySelector('.save-edit');
      const cancelBtn = div.querySelector('.cancel-edit');
      const nameInput = div.querySelector('.edit-name');
      const valueInput = div.querySelector('.edit-value');

      saveBtn.addEventListener('click', () => handleSaveEdit(index, nameInput.value, valueInput.value));
      cancelBtn.addEventListener('click', handleCancelEdit);

      nameInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSaveEdit(index, nameInput.value, valueInput.value);
      });
      valueInput.addEventListener('keydown', (e) => {
        if (e.key === 'Enter') handleSaveEdit(index, nameInput.value, valueInput.value);
      });

      nameInput.focus();
      nameInput.select();
    }, 0);
  } else {
    div.innerHTML = `
      <div class="rule-info">
        <div class="rule-name" title="${escapeHtml(header.name)}">${escapeHtml(header.name)}</div>
        <div class="rule-value" title="${escapeHtml(header.value)}">${escapeHtml(header.value)}</div>
      </div>
      <div class="rule-actions">
        <button class="btn-icon edit-btn" data-index="${index}" title="编辑">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M10 1.5l2.5 2.5-8 8L2 13l1-2.5 8-8z"/>
          </svg>
        </button>
        <button class="btn-icon danger delete-btn" data-index="${index}" title="删除">
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" stroke="currentColor" stroke-width="1.5">
            <path d="M2.5 4.5h9M5.5 4.5V3a.5.5 0 01.5-.5h2a.5.5 0 01.5.5v1.5M11 4.5l-.7 7.5a.5.5 0 01-.5.5H4.2a.5.5 0 01-.5-.5L3 4.5"/>
          </svg>
        </button>
      </div>
    `;

    div.querySelector('.edit-btn').addEventListener('click', () => handleEdit(index));
    div.querySelector('.delete-btn').addEventListener('click', () => handleDelete(index));
  }

  return div;
}

function updateToggleButtonState() {
  const hasHeaders = headers.length > 0;
  toggleAllBtn.style.display = hasHeaders ? 'flex' : 'none';
}

// =============================================================================
// 事件处理
// =============================================================================
async function handleAdd() {
  const name = headerNameInput.value.trim();
  const value = headerValueInput.value.trim();

  if (!name) {
    showToast('请输入 Header 名称');
    headerNameInput.focus();
    return;
  }

  if (!value) {
    showToast('请输入 Header 值');
    headerValueInput.focus();
    return;
  }

  headers.push({ name, value, override: true });
  await saveHeaders();

  headerNameInput.value = '';
  headerValueInput.value = '';
  headerNameInput.focus();

  render();
  showToast('已添加: ' + name);
}

function handleEdit(index) {
  editingIndex = index;
  render();
}

async function handleSaveEdit(index, name, value) {
  name = name.trim();
  value = value.trim();

  if (!name || !value) {
    showToast('名称和值不能为空');
    return;
  }

  headers[index] = { name, value, override: true };
  editingIndex = -1;
  await saveHeaders();
  render();
  showToast('已更新: ' + name);
}

function handleCancelEdit() {
  editingIndex = -1;
  render();
}

async function handleDelete(index) {
  const name = headers[index].name;
  headers.splice(index, 1);

  if (editingIndex === index) {
    editingIndex = -1;
  }

  await saveHeaders();
  render();
  showToast('已删除: ' + name);
}

async function handleToggleAll() {
  const result = await chrome.storage.local.get(['disabled', STORAGE_KEY + '_backup']);
  const isDisabled = result.disabled || false;

  if (isDisabled) {
    // 重新启用：从备份恢复
    const backup = result[STORAGE_KEY + '_backup'] || [];
    headers = backup;
    toggleText.textContent = '暂停注入';
    toggleAllBtn.classList.remove('btn-primary');
    toggleAllBtn.classList.add('btn-outline');
    await chrome.storage.local.set({ disabled: false, [STORAGE_KEY]: headers });
    await chrome.storage.local.remove(STORAGE_KEY + '_backup');
    showToast('注入已恢复');
  } else {
    // 暂停：备份当前规则后清空
    toggleText.textContent = '恢复注入';
    toggleAllBtn.classList.remove('btn-outline');
    toggleAllBtn.classList.add('btn-primary');
    await chrome.storage.local.set({ disabled: true, [STORAGE_KEY + '_backup']: headers, [STORAGE_KEY]: [] });
    headers = [];
    showToast('注入已暂停');
  }

  render();
}

// =============================================================================
// 导入 / 导出
// =============================================================================
function handleExport() {
  if (headers.length === 0) {
    showToast('没有规则可导出');
    return;
  }

  const data = JSON.stringify(headers, null, 2);
  const blob = new Blob([data], { type: 'application/json' });
  const url = URL.createObjectURL(blob);

  const a = document.createElement('a');
  a.href = url;
  a.download = 'http-header-rules.json';
  a.click();

  URL.revokeObjectURL(url);
  showToast('已导出 ' + headers.length + ' 条规则');
}

function handleImport() {
  const input = document.createElement('input');
  input.type = 'file';
  input.accept = '.json';

  input.addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;

    try {
      const text = await file.text();
      const imported = JSON.parse(text);

      if (!Array.isArray(imported)) {
        throw new Error('格式错误：应为数组');
      }

      for (const item of imported) {
        if (!item.name || item.value === undefined) {
          throw new Error('格式错误：每项需包含 name 和 value');
        }
      }

      // 合并：不覆盖同名规则，追加导入
      let added = 0;
      for (const item of imported) {
        const exists = headers.some(h => h.name === item.name);
        if (!exists) {
          headers.push({ name: item.name, value: item.value, override: true });
          added++;
        }
      }

      await saveHeaders();
      render();
      showToast('导入成功，新增 ' + added + ' 条（跳过 ' + (imported.length - added) + ' 条重复）');
    } catch (err) {
      showToast('导入失败: ' + err.message);
    }
  });

  input.click();
}

// =============================================================================
// 工具函数
// =============================================================================
function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}

let toastTimer;
function showToast(message) {
  let toast = document.querySelector('.toast');
  if (!toast) {
    toast = document.createElement('div');
    toast.className = 'toast';
    document.body.appendChild(toast);
  }

  toast.textContent = message;
  toast.classList.add('show');

  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toast.classList.remove('show');
  }, 2000);
}
