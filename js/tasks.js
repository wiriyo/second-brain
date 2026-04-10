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
    const items = state.tasks.filter(t => t.priority === p && !t.done);
    count.textContent = items.length;
    if (!items.length) {
      el.innerHTML = '<div class="empty-state" style="padding:14px;font-size:13px">ไม่มีงานค่ะ 🎉</div>';
      return;
    }
    el.innerHTML = items.map(t => taskHTML(t)).join('');
  });

  const doneEl = document.getElementById('tasks-done');
  const doneTasks = state.tasks.filter(t => t.done);
  doneEl.innerHTML = doneTasks.length
    ? doneTasks.map(t => taskHTML(t, true)).join('')
    : '<div class="empty-state" style="padding:14px;font-size:13px">ยังไม่มีงานที่เสร็จค่ะ</div>';

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
  const t = state.tasks.find(t => t.id === id);
  if (t) { t.done = true; state.points += 10; }
  save(); renderTasks();
  showToast('✅ เสร็จแล้ว! +10 แต้ม 🎉');
}

function deleteTask(id) {
  state.tasks = state.tasks.filter(t => t.id !== id);
  save('tasks'); renderTasks();
}

function clearDoneTasks() {
  state.tasks = state.tasks.filter(t => !t.done);
  save('tasks'); renderTasks();
}

function filterTasks(f, btn) {
  currentFilter = f;
  document.querySelectorAll('.filter-btn').forEach(b => b.classList.remove('active'));
  btn.classList.add('active');
  renderTasks();
}

function showToast(msg) {
  const t = document.getElementById('toast') || document.createElement('div');
  t.className = 'toast show'; t.id = 'toast'; t.textContent = msg;
  if (!document.getElementById('toast')) document.body.appendChild(t);
  setTimeout(() => t.classList.remove('show'), 2500);
}

document.addEventListener('DOMContentLoaded', () => {
  renderTasks();
  document.getElementById('task-name').addEventListener('keypress', e => {
    if (e.key === 'Enter') addTask();
  });
});
