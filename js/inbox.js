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
  const item = state.inbox.find(i => Number(i.id) === Number(selectedItemId));
  if (!item) return;

  if (dest === 'projects') {
    // เปิด dialog สร้าง task จาก inbox
    openTaskFromInboxModal(item);
    return;
  }

  // สำหรับ areas, resources, archive, done — mark done + เพิ่มลง PARA
  item.done = true;
  item.tag = dest === 'done' ? '✅ จัดแล้ว' :
             dest === 'areas' ? '🌀 Areas' :
             dest === 'resources' ? '📚 Resources' : '📦 Archive';

  // เพิ่มข้อความเข้า state.para (ยกเว้น 'done')
  if (dest !== 'done' && state.para && state.para[dest] !== undefined) {
    state.para[dest].push(item.text);
  }

  save('inbox'); closeModal(); renderInbox();
}

function openTaskFromInboxModal(item) {
  // แสดง modal สร้าง task
  const taskModal = document.getElementById('task-from-inbox-modal');
  if (!taskModal) {
    // สร้าง modal ถ้ายังไม่มี
    const modalHTML = `
      <div class="modal" id="task-from-inbox-modal">
        <div class="modal-box" style="max-width: 500px">
          <h3 class="modal-title">📁 สร้าง Task จาก Inbox</h3>
          <div class="modal-form">
            <label class="modal-label">ชื่องาน:</label>
            <input type="text" class="modal-input" id="task-inbox-name" value="${item.text}" />

            <label class="modal-label">Priority:</label>
            <select class="modal-select" id="task-inbox-priority">
              <option value="high">🔴 High</option>
              <option value="medium" selected>🟡 Medium</option>
              <option value="low">🟢 Low</option>
            </select>

            <label class="modal-label">PARA Category:</label>
            <select class="modal-select" id="task-inbox-para">
              <option value="projects" selected>📁 Projects</option>
              <option value="areas">🌀 Areas</option>
              <option value="resources">📚 Resources</option>
            </select>

            <label class="modal-label">Due Date (ถ้ามี):</label>
            <input type="date" class="modal-input" id="task-inbox-due" />
          </div>
          <div class="modal-actions">
            <button class="modal-btn modal-btn-cancel" onclick="closeTaskFromInboxModal()">ยกเลิก</button>
            <button class="modal-btn modal-btn-confirm" onclick="createTaskFromInbox(${item.id})">✅ สร้าง Task</button>
          </div>
        </div>
      </div>
    `;
    document.body.insertAdjacentHTML('beforeend', modalHTML);
    // เพิ่ม CSS สำหรับ modal
    const style = document.createElement('style');
    style.textContent = `
      .modal-form {
        display: flex;
        flex-direction: column;
        gap: 12px;
        margin: 16px 0;
      }
      .modal-label {
        font-size: 14px;
        font-weight: 500;
        color: var(--dark);
      }
      .modal-input, .modal-select {
        padding: 10px 14px;
        border: 2px solid #e5e7eb;
        border-radius: 8px;
        font-size: 14px;
        font-family: inherit;
        outline: none;
      }
      .modal-input:focus, .modal-select:focus {
        border-color: var(--pink);
      }
      .modal-actions {
        display: flex;
        gap: 10px;
        justify-content: flex-end;
        margin-top: 20px;
      }
      .modal-btn {
        padding: 10px 20px;
        border-radius: 8px;
        border: none;
        font-size: 14px;
        font-weight: 500;
        cursor: pointer;
        transition: all 0.2s;
      }
      .modal-btn-cancel {
        background: #f3f4f6;
        color: var(--dark);
      }
      .modal-btn-confirm {
        background: var(--pink);
        color: white;
      }
      .modal-btn:hover {
        transform: translateY(-2px);
      }
    `;
    document.head.appendChild(style);
  } else {
    // อัปเดตค่าทุก field ใน modal ถ้ามีอยู่แล้ว
    document.getElementById('task-inbox-name').value = item.text;
    document.getElementById('task-inbox-priority').value = 'medium';
    document.getElementById('task-inbox-para').value = 'projects';
    document.getElementById('task-inbox-due').value = '';
    // อัปเดต onclick ของปุ่ม Confirm ให้ชี้ไปที่ item ปัจจุบัน (แก้บั๊ค item.id เก่าค้างอยู่)
    const confirmBtn = document.querySelector('#task-from-inbox-modal .modal-btn-confirm');
    if (confirmBtn) confirmBtn.setAttribute('onclick', `createTaskFromInbox(${item.id})`);
  }

  document.getElementById('task-from-inbox-modal').classList.add('open');
  document.getElementById('move-modal').classList.remove('open');
}

function closeTaskFromInboxModal() {
  const modal = document.getElementById('task-from-inbox-modal');
  if (modal) modal.classList.remove('open');
  closeModal();
}

function createTaskFromInbox(inboxItemId) {
  const item = state.inbox.find(i => Number(i.id) === Number(inboxItemId));
  if (!item) return;

  // สร้าง task ใหม่
  const task = {
    id: Date.now(),
    name: document.getElementById('task-inbox-name').value.trim() || item.text,
    priority: document.getElementById('task-inbox-priority').value,
    para: document.getElementById('task-inbox-para').value,
    due: document.getElementById('task-inbox-due').value,
    done: false, // ❌ สำคัญ: task ยังไม่เสร็จ
    date: today()
  };

  state.tasks.push(task);

  // mark inbox item ว่าจัดแล้ว
  item.done = true;
  item.tag = '📁 สร้าง Task แล้ว';

  save(); // บันทึกลง localStorage ทุกอย่าง
  syncInbox(); // sync inbox (item done=true) ขึ้น Sheets ทันที
  syncTasks(); // sync task ใหม่ขึ้น Sheets ทันที
  closeTaskFromInboxModal();
  renderInbox();
  syncNav();

  // ถ้าอยู่หน้า tasks ให้ render ใหม่
  if (typeof renderTasks === 'function') renderTasks();

  showToast('✅ สร้าง Task สำเร็จ!');
}

function clearDone() {
  state.inbox = state.inbox.filter(i => !i.done);
  save('inbox'); renderInbox();
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.className = 'toast';
    t.id = 'toast';
    t.style.cssText = `
      position: fixed;
      bottom: 20px;
      left: 50%;
      transform: translateX(-50%) translateY(100px);
      background: var(--dark);
      color: white;
      padding: 12px 24px;
      border-radius: 10px;
      font-size: 14px;
      font-family: 'Sarabun', sans-serif;
      box-shadow: 0 4px 20px rgba(0,0,0,0.2);
      transition: transform 0.3s ease;
      z-index: 10000;
    `;
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  t.style.transform = 'translateX(-50%) translateY(0)';
  setTimeout(() => {
    t.style.transform = 'translateX(-50%) translateY(100px)';
    t.classList.remove('show');
  }, 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  renderInbox();
  document.getElementById('inbox-input').addEventListener('keypress', e => {
    if (e.key === 'Enter') addInboxItem();
  });
});
