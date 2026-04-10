let currentFilter = 'all';

function addTask() {
  const name = document.getElementById('task-name').value.trim();
  if (!name) return;
  const task = {
    id: Date.now(), name,
    priority: document.getElementById('task-priority').value,
    para: document.getElementById('task-para').value,
    due: document.getElementById('task-due').value,
    done: false, date: today()
  };
  state.tasks.push(task);
  save('tasks');
  document.getElementById('task-name').value = '';
  renderTasks();
}

function renderTasks() {
  const priorities = ['high', 'medium', 'low'];
  priorities.forEach(p => {
    const el = document.getElementById('tasks-' + p);
    const count = document.getElementById('count-' + p);
    if (!el) return;
    const items = state.tasks.filter(t => t.priority === p && !t.done);
    if (count) count.textContent = items.length;
    if (!items.length) {
      el.innerHTML = '<div class="empty-state" style="padding:14px;font-size:13px">ไม่มีงานค่ะ 🎉</div>';
      return;
    }
    el.innerHTML = items.map(t => taskHTML(t)).join('');
  });

  const doneEl = document.getElementById('tasks-done');
  if (doneEl) {
    const doneTasks = state.tasks.filter(t => t.done);
    doneEl.innerHTML = doneTasks.length
      ? doneTasks.map(t => taskHTML(t, true)).join('')
      : '<div class="empty-state" style="padding:14px;font-size:13px">ยังไม่มีงานที่เสร็จค่ะ</div>';
  }

  // Apply filter visibility
  ['high', 'medium', 'low', 'done'].forEach(p => {
    const el = document.getElementById('tasks-' + p);
    if (!el) return;
    const card = el.closest('.card');
    if (!card) return;
    if (currentFilter === 'all') {
      card.style.display = '';
    } else {
      card.style.display = (currentFilter === p) ? '' : 'none';
    }
  });

  syncNav();
}

function taskHTML(t, done = false) {
  const priorityColor = t.priority === 'high' ? '#f87171' : t.priority === 'medium' ? '#fbbf24' : '#34d399';
  const paraEmoji = t.para === 'projects' ? '📁' : t.para === 'areas' ? '🌀' : '📚';
  return `
    <div class="item-row ${done ? 'done-item' : ''}">
      <div style="width:10px;height:10px;border-radius:50%;background:${priorityColor};flex-shrink:0"></div>
      <span class="item-text">${t.name}</span>
      <span class="item-tag">${paraEmoji} ${t.para}</span>
      ${t.due ? `<span style="font-size:11px;color:var(--mid)">📅 ${t.due}</span>` : ''}
      ${!done ? `<button class="item-btn" onclick="completeTask(${t.id})">✓</button>` : ''}
      <button class="item-btn" onclick="deleteTask(${t.id})">✕</button>
    </div>
  `;
}

function completeTask(id) {
  // ใช้ Number() ป้องกัน type mismatch ระหว่าง id จาก onclick (number) กับ t.id ใน state
  const t = state.tasks.find(t => Number(t.id) === Number(id));
  if (!t) return;
  t.done = true;
  state.points += 10;
  save('tasks');
  syncPoints();
  renderTasks();
  showToast('✅ เสร็จแล้ว! +10 แต้ม 🎉');
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => Number(t.id) !== Number(id));
  save('tasks'); renderTasks();
}

function clearDoneTasks() {
  state.tasks = state.tasks.filter(t => !t.done);
  save('tasks'); renderTasks();
}

function filterTasks(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  if (btn) btn.classList.add('active');
  renderTasks();
}

function showToast(msg) {
  let t = document.getElementById('toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  const nameInput = document.getElementById('task-name');
  if (nameInput) nameInput.addEventListener('keypress', e => {
    if (e.key === 'Enter') addTask();
  });
});
