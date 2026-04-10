let selectedItemId = null;

function addInboxItem() {
  const input = document.getElementById('inbox-input');
  const text = input.value.trim();
  if (!text) return;
  state.inbox.push({ id: Date.now(), text, date: today(), done: false, tag: null });
  save('inbox'); input.value = '';
  renderInbox(); syncNav();
}

function renderInbox() {
  const list = document.getElementById('inbox-list');
  const count = document.getElementById('inbox-count');
  const items = state.inbox.filter(i => !i.done);
  count.textContent = items.length;
  if (!items.length) {
    list.innerHTML = '<div class="empty-state">ยังไม่มีรายการค่ะ จดอะไรสักอย่างดิ! 🌸</div>';
    return;
  }
  list.innerHTML = items.map(item => `
    <div class="item-row" id="item-${item.id}">
      <span class="inbox-dot"></span>
      <span class="item-text">${item.text}</span>
      ${item.tag ? `<span class="item-tag">${item.tag}</span>` : ''}
      <button class="item-btn" onclick="openMoveModal(${item.id})">จัด →</button>
      <button class="item-btn" onclick="deleteInboxItem(${item.id})">✕</button>
    </div>
  `).join('');
  syncNav();
}

function deleteInboxItem(id) {
  state.inbox = state.inbox.filter(i => i.id !== id);
  save('inbox'); renderInbox(); syncNav();
}

function openMoveModal(id) {
  selectedItemId = id;
  document.getElementById('move-modal').classList.add('open');
}

function closeModal() {
  document.getElementById('move-modal').classList.remove('open');
  selectedItemId = null;
}

function moveItem(dest) {
  const item = state.inbox.find(i => i.id === selectedItemId);
  if (item) {
    item.done = true;
    item.tag = dest === 'done' ? '✅ จัดแล้ว' :
               dest === 'projects' ? '📁 Projects' :
               dest === 'areas' ? '🌀 Areas' :
               dest === 'resources' ? '📚 Resources' : '📦 Archive';
  }
  save('inbox'); closeModal(); renderInbox();
}

function clearDone() {
  state.inbox = state.inbox.filter(i => !i.done);
  save('inbox'); renderInbox();
}

document.addEventListener('DOMContentLoaded', () => {
  renderInbox();
  document.getElementById('inbox-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') addInboxItem();
  });
});
