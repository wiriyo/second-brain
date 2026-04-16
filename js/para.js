// ===== PARA — State-backed persistence =====

let _restoreIndex = null;

function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

function renderPara() {
  ['projects', 'areas', 'resources', 'archive'].forEach(section => {
    const list = document.getElementById('list-' + section);
    if (!list) return;
    const items = (state.para && state.para[section]) ? state.para[section] : [];
    if (!items.length) {
      list.innerHTML = `<div class="para-item" style="opacity:0.5">
        <span class="para-item-dot"></span>
        <span class="para-item-text">ยังไม่มีรายการค่ะ กด + เพื่อเพิ่ม</span>
      </div>`;
      return;
    }
    list.innerHTML = items.map((item, i) => {
      // รองรับทั้ง format เก่า (string) และใหม่ (object {name, start, due})
      const isObj = typeof item === 'object' && item !== null;
      const text = isObj ? item.name : item;
      const dateStr = isObj && (item.start || item.due)
        ? `${item.start || '?'} → ${item.due || '?'}`
        : '';

      if (section === 'archive') {
        return `
          <div class="para-item">
            <span class="para-item-dot" style="background:#94a3b8"></span>
            <div style="flex:1;min-width:0">
              <div class="para-item-text" style="opacity:0.6">${escapeHtml(text)}</div>
            </div>
            <button class="item-btn restore-btn" onclick="openRestoreModal(${i})" title="นำกลับมาทำ">↩ Restore</button>
            <button class="item-btn" onclick="deleteParaItem('${section}', ${i})">✕</button>
          </div>
        `;
      }
      return `
        <div class="para-item">
          <span class="para-item-dot"></span>
          <div style="flex:1;min-width:0">
            <div class="para-item-text">${escapeHtml(text)}</div>
            ${dateStr ? `<div class="para-item-date">📅 ${dateStr}</div>` : ''}
          </div>
          <button class="item-btn" onclick="deleteParaItem('${section}', ${i})">✕</button>
        </div>
      `;
    }).join('');
  });
}

// ===== ADD / SAVE / DELETE =====

function addParaItem(section) {
  if (section === 'projects') {
    const form = document.getElementById('form-projects');
    const isHidden = !form.style.display || form.style.display === 'none';
    form.style.display = isHidden ? 'block' : 'none';
    if (isHidden) document.getElementById('input-projects').focus();
    return;
  }
  const input = document.getElementById('input-' + section);
  if (!input) return;
  const isHidden = input.style.display === 'none' || input.style.display === '';
  input.style.display = isHidden ? 'block' : 'none';
  if (isHidden) input.focus();
}

function saveParaProject() {
  const name = document.getElementById('input-projects').value.trim();
  if (!name) { document.getElementById('input-projects').focus(); return; }
  const start = document.getElementById('projects-start').value;
  const due = document.getElementById('projects-due').value;
  if (!state.para.projects) state.para.projects = [];
  state.para.projects.push({ name, start, due });
  save();
  document.getElementById('input-projects').value = '';
  document.getElementById('projects-start').value = '';
  document.getElementById('projects-due').value = '';
  document.getElementById('form-projects').style.display = 'none';
  renderPara();
}

function cancelParaProject() {
  document.getElementById('input-projects').value = '';
  document.getElementById('projects-start').value = '';
  document.getElementById('projects-due').value = '';
  document.getElementById('form-projects').style.display = 'none';
}

function saveParaItem(section) {
  const input = document.getElementById('input-' + section);
  if (!input) return;
  const text = input.value.trim();
  if (!text) { input.style.display = 'none'; return; }
  if (!state.para[section]) state.para[section] = [];
  state.para[section].push(text);
  save();
  input.value = '';
  input.style.display = 'none';
  renderPara();
}

function deleteParaItem(section, index) {
  if (!state.para[section]) return;
  state.para[section].splice(index, 1);
  save();
  renderPara();
}

// ===== RESTORE FROM ARCHIVE =====

function openRestoreModal(index) {
  _restoreIndex = index;
  const raw = (state.para.archive && state.para.archive[index]) || '';
  const text = typeof raw === 'object' ? raw.name : raw;
  document.getElementById('restore-item-name').textContent = `"${text}"`;
  document.getElementById('restore-modal').classList.add('open');
}

function closeRestoreModal() {
  document.getElementById('restore-modal').classList.remove('open');
  _restoreIndex = null;
}

function restoreToSection(dest) {
  if (_restoreIndex === null || !state.para.archive) return;
  const raw = state.para.archive[_restoreIndex];
  if (!raw) return;
  const text = typeof raw === 'object' ? raw.name : raw;

  state.para.archive.splice(_restoreIndex, 1);
  if (!state.para[dest]) state.para[dest] = [];
  // ถ้าย้ายกลับไป projects ให้เป็น object (ยังไม่มีวันเริ่ม/ครบ รอใส่ทีหลัง)
  state.para[dest].push(dest === 'projects' ? { name: text, start: '', due: '' } : text);

  save();
  closeRestoreModal();
  renderPara();

  const label = { projects: 'Projects 📁', areas: 'Areas 🌀', resources: 'Resources 📚' }[dest];
  showParaToast(`↩ ย้าย "${text}" ไปที่ ${label} แล้วค่ะ!`);
}

function openRestoreAsTask() {
  if (_restoreIndex === null || !state.para.archive) return;
  const raw = state.para.archive[_restoreIndex];
  const text = typeof raw === 'object' ? raw.name : (raw || '');
  document.getElementById('restore-task-name').value = text;
  document.getElementById('restore-task-start').value = (typeof raw === 'object' && raw.start) ? raw.start : '';
  document.getElementById('restore-task-priority').value = 'medium';
  document.getElementById('restore-task-start').value = '';
  document.getElementById('restore-task-due').value = '';
  document.getElementById('restore-modal').classList.remove('open');
  document.getElementById('restore-task-modal').classList.add('open');
}

function closeRestoreTaskModal() {
  document.getElementById('restore-task-modal').classList.remove('open');
  // กลับไปที่ restore modal
  document.getElementById('restore-modal').classList.add('open');
}

function confirmRestoreAsTask() {
  if (_restoreIndex === null) return;
  const name = document.getElementById('restore-task-name').value.trim();
  if (!name) {
    document.getElementById('restore-task-name').focus();
    return;
  }

  const task = {
    id: Date.now(),
    name,
    priority: document.getElementById('restore-task-priority').value,
    para: 'projects',
    start: document.getElementById('restore-task-start').value,
    due: document.getElementById('restore-task-due').value,
    done: false,
    date: today()
  };

  state.tasks.push(task);
  state.para.archive.splice(_restoreIndex, 1);

  save();
  syncTasks();

  document.getElementById('restore-task-modal').classList.remove('open');
  closeRestoreModal();
  renderPara();
  showParaToast(`✅ สร้าง Task "${name}" แล้วค่ะ! ไปดูที่หน้า Tasks นะคะ`);
}

// ===== TOAST =====

function showParaToast(msg) {
  let t = document.getElementById('para-toast');
  if (!t) {
    t = document.createElement('div');
    t.id = 'para-toast';
    t.className = 'toast';
    document.body.appendChild(t);
  }
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(t._timer);
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', renderPara);
