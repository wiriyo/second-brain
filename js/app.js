// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
  navigator.serviceWorker.register('./sw.js');
}

// ===== CONFIG =====
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbyIF-DXOreA1i-eFJJSKEjhvjvT8tueflebpiun8pmS/exec';

// ===== STORAGE =====
const S = {
  get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
  set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ===== FOCUS MIGRATION =====
// แปลง format เก่า (array of strings) เป็น format ใหม่ (array of objects)
function _migrateFocus(raw) {
  if (!raw || !Array.isArray(raw)) return [null, null, null];
  return raw.map(item => {
    if (item === null || item === undefined || item === '') return null;
    if (typeof item === 'string') return { text: item, refType: null, refId: null, done: false };
    return item; // new format already
  });
}

// ===== STATE =====
const state = {
  inbox: S.get('sb_inbox') || [],
  tasks: _migrateTasks(S.get('sb_tasks') || []),
  para: S.get('sb_para') || {
    projects: ['คอร์ส Vibe Coding', 'เตรียมสไลด์ Day 1-5'],
    areas: ['การสอน & ออกแบบหลักสูตร', 'IoT / ESP32 Development', 'Board Games Collection', 'สุขภาพ & ออกกำลังกาย'],
    resources: ['ESP32-WROOM-32 Docs', 'Arduino Libraries ที่ดี', 'Zombicide Game Tips'],
    archive: [],
  },
  points: S.get('sb_points') || 0,
  streak: S.get('sb_streak') || 0,
  habitLog: S.get('sb_habitlog') || {},
  redeemLog: S.get('sb_redeemlog') || [],
  focus: _migrateFocus(S.get('sb_focus')),
};

// ===== MIGRATE old data format =====
// แปลง tasks เก่าที่ใช้ field 'text' → 'name' และเติม default priority
function _migrateTasks(arr) {
  if (!Array.isArray(arr)) return [];
  return arr.map(t => {
    if (!t.name && t.text) t.name = t.text;
    if (!t.priority) t.priority = 'medium';
    return t;
  });
}

// ===== DEDUP helpers — ล้าง duplicate ID ที่เกิดจาก type mismatch =====
function dedupById(arr) {
  const seen = new Set();
  return arr.filter(item => {
    const key = String(item.id);
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ===== SAVE LOCAL + SYNC =====
function save(syncAction = null) {
  state.inbox = dedupById(state.inbox);
  state.tasks = dedupById(state.tasks);
  S.set('sb_inbox', state.inbox);
  S.set('sb_tasks', state.tasks);
  S.set('sb_para', state.para);
  S.set('sb_points', state.points);
  S.set('sb_streak', state.streak);
  S.set('sb_habitlog', state.habitLog);
  S.set('sb_redeemlog', state.redeemLog);
  S.set('sb_focus', state.focus);
  if (syncAction === 'inbox') syncInbox();
  if (syncAction === 'tasks') syncTasks();
  if (syncAction === 'habits') syncHabits();
  if (syncAction === 'points') syncPoints();
}

// ===== SYNC TO SHEETS =====
function jsonpCall(params, onSuccess, label) {
  const id = 'cb_' + Date.now();
  const parts = Object.entries(params).map(([k,v]) => k + '=' + v);
  parts.push('callback=' + id);
  const url = SHEET_URL + '?' + parts.join('&');
  // ต้อง set window[id] ก่อน append script เสมอ
  window[id] = function(data) {
    clearTimeout(window[id + '_timeout']);
    delete window[id];
    if (s && s.parentNode) s.parentNode.removeChild(s);
    if (onSuccess) onSuccess(data);
    if (label) showSyncBadge(label);
  };
  // timeout 10s ป้องกัน callback หลุด
  window[id + '_timeout'] = setTimeout(() => {
    if (window[id]) {
      delete window[id];
      showSyncBadge('⚠️ Sync timeout — ลองใหม่ทีหลังนะคะ');
    }
  }, 10000);
  const s = document.createElement('script');
  s.src = url;
  s.onerror = () => {
    clearTimeout(window[id + '_timeout']);
    delete window[id];
    showSyncBadge('⚠️ Sync ไม่สำเร็จ');
  };
  document.head.appendChild(s);
}

async function syncInbox() {
  jsonpCall({
    action: 'saveInbox',
    items: encodeURIComponent(JSON.stringify(state.inbox))
  }, null, '📥 Inbox synced ✅');
}

async function syncTasks() {
  jsonpCall({
    action: 'saveTasks',
    items: encodeURIComponent(JSON.stringify(state.tasks))
  }, null, '✅ Tasks synced ✅');
}

async function syncHabits() {
  // ส่ง points ไปพร้อมกับ habits เลย ประหยัด 1 call
  jsonpCall({
    action: 'saveHabits',
    log: encodeURIComponent(JSON.stringify(state.habitLog)),
    points: state.points
  }, null, '🎯 Habits synced ✅');
}

async function syncPoints() {
  jsonpCall({
    action: 'savePoints',
    points: state.points
  }, null, '💎 Points synced ✅');
}

function forceSyncAll() {
  showSyncBadge('☁️ กำลัง Push ข้อมูลทั้งหมดขึ้น Sheets...');
  syncInbox();
  syncTasks();
  syncHabits();
  setTimeout(() => showSyncBadge('✅ Push สำเร็จ! เปิด Android แล้ว Refresh ได้เลยค่า'), 3000);
}

// ===== LOAD FROM SHEETS =====
function loadFromSheets() {
  showSyncBadge('🔄 กำลังโหลดข้อมูล...');
  jsonpCall({ action: 'getInbox' }, (data) => {
    if (Array.isArray(data) && data.length > 0) {
      // Sheets-first merge: ใช้ข้อมูลทุก field จาก Sheets เป็นหลัก
      // item ที่มีอยู่ใน local แต่ไม่มีใน Sheets (ยังไม่ sync) → คงไว้
      const sheetMap = new Map(data.map(i => [String(i.id), i]));
      const localOnly = state.inbox.filter(i => !sheetMap.has(String(i.id)));
      state.inbox = dedupById([...data, ...localOnly]);
      S.set('sb_inbox', state.inbox);
      syncNav(); updateStats();
      if (typeof renderInbox === 'function') renderInbox();
      showSyncBadge('☁️ โหลด Inbox จาก Sheets ✅');
    }
  });
  jsonpCall({ action: 'getPoints' }, (data) => {
    if (data && typeof data.points === 'number' && !isNaN(data.points)) {
      state.points = data.points;
      S.set('sb_points', data.points);
      updateStats();
      if (typeof updatePoints === 'function') updatePoints();
    }
  });
  jsonpCall({ action: 'getTasks' }, (data) => {
    if (Array.isArray(data) && data.length > 0) {
      // Sheets-first merge: ใช้ข้อมูลทุก field จาก Sheets เป็นหลัก
      // task ที่มีอยู่ใน local แต่ไม่มีใน Sheets (ยังไม่ sync) → คงไว้
      const migrated = _migrateTasks(data);
      const sheetMap = new Map(migrated.map(t => [String(t.id), t]));
      const localOnly = state.tasks.filter(t => !sheetMap.has(String(t.id)));
      state.tasks = dedupById([...migrated, ...localOnly]);
      S.set('sb_tasks', state.tasks);
      updateStats();
      if (typeof renderTasks === 'function') renderTasks();
      showSyncBadge('☁️ โหลด Tasks จาก Sheets ✅');
    }
  });
}

// ===== SYNC BADGE =====
function showSyncBadge(msg) {
  let b = document.getElementById('sync-badge');
  if (!b) {
    b = document.createElement('div');
    b.id = 'sync-badge';
    b.style.cssText = `position:fixed;bottom:20px;left:260px;background:#1a1630;color:white;
      padding:10px 16px;border-radius:10px;font-size:12px;font-family:'Sarabun',sans-serif;
      box-shadow:0 4px 20px rgba(0,0,0,0.2);z-index:9999;transition:opacity 0.3s;opacity:0;`;
    document.body.appendChild(b);
  }
  b.textContent = msg; b.style.opacity = '1';
  clearTimeout(b._t);
  b._t = setTimeout(() => b.style.opacity = '0', 3000);
}

// ===== DATE =====
function today() { return new Date().toISOString().split('T')[0]; }
function thaiDate(d) {
  const days = ['อาทิตย์','จันทร์','อังคาร','พุธ','พฤหัสบดี','ศุกร์','เสาร์'];
  const months = ['ม.ค.','ก.พ.','มี.ค.','เม.ย.','พ.ค.','มิ.ย.','ก.ค.','ส.ค.','ก.ย.','ต.ค.','พ.ย.','ธ.ค.'];
  const dt = d ? new Date(d) : new Date();
  return `วัน${days[dt.getDay()]} ${dt.getDate()} ${months[dt.getMonth()]} ${dt.getFullYear() + 543}`;
}

// ===== NAV =====
function syncNav() {
  const n = state.inbox.filter(i => !i.done).length;
  document.querySelectorAll('#inbox-badge').forEach(el => {
    el.textContent = n; el.style.display = n > 0 ? 'inline-block' : 'none';
  });
  const t = state.tasks.filter(i => !i.done).length;
  document.querySelectorAll('#tasks-badge').forEach(el => {
    el.textContent = t; el.style.display = t > 0 ? 'inline-block' : 'none';
  });
  document.querySelectorAll('#nav-points').forEach(el => el.textContent = state.points);
}

// ===== QUICK CAPTURE =====
function quickCapture() {
  const input = document.getElementById('quick-input');
  if (!input) return;
  const text = input.value.trim();
  if (!text) return;
  state.inbox.push({ id: Date.now(), text, date: today(), done: false });
  save('inbox');
  input.value = '';
  renderInboxPreview();
  syncNav(); updateStats();
}

function renderInboxPreview() {
  const el = document.getElementById('inbox-preview');
  if (!el) return;
  const recent = state.inbox.filter(i => !i.done).slice(-3).reverse();
  el.innerHTML = recent.map(i => `
    <div class="inbox-preview-item"><div class="inbox-dot"></div><span>${i.text}</span></div>
  `).join('');
}

// ===== FOCUS =====

// ตั้งค่า focus item (เรียกจาก index.html picker)
function setFocusItem(index, text, refType, refId) {
  state.focus[index] = { text, refType: refType || null, refId: refId || null, done: false };
  save();
  if (typeof renderFocusCards === 'function') renderFocusCards();
}

// ล้าง focus slot
function clearFocusItem(index) {
  state.focus[index] = null;
  save();
  if (typeof renderFocusCards === 'function') renderFocusCards();
}

// กด ✓ บน focus card
function completeFocus(index) {
  const item = state.focus[index];
  if (!item) return;

  // toggle done
  item.done = !item.done;

  if (item.done) {
    // ถ้าผูกกับ task → complete task + รับแต้ม
    if (item.refType === 'task' && item.refId != null) {
      const t = state.tasks.find(t => Number(t.id) === Number(item.refId));
      if (t && !t.done) {
        t.done = true;
        state.points += 10;
        save('tasks');
        syncPoints();
        showSyncBadge('✅ Task เสร็จแล้ว! +10 แต้ม 🎉');
      }
    }
    // ถ้าผูกกับ inbox → mark done
    if (item.refType === 'inbox' && item.refId != null) {
      const inbox = state.inbox.find(i => Number(i.id) === Number(item.refId));
      if (inbox) { inbox.done = true; save('inbox'); }
    }
  }

  save();
  if (typeof renderFocusCards === 'function') renderFocusCards();
  updateStats(); syncNav();
}

// โหลด focus (เรียกจาก DOMContentLoaded)
function loadFocus() {
  if (typeof renderFocusCards === 'function') renderFocusCards();
}

// ===== STATS =====
function updateStats() {
  const ic = state.inbox.filter(i => !i.done).length;
  const tc = state.tasks.filter(t => !t.done).length;
  const e = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
  e('stat-inbox', ic); e('stat-tasks', tc);
  e('stat-points', state.points); e('stat-streak', state.streak);
  e('card-inbox', ic + ' รายการ');
  e('card-tasks', tc + ' งาน');
  e('card-points', state.points + ' แต้ม');
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const d = document.getElementById('hero-date'); if(d) d.textContent = thaiDate();
  const t = document.getElementById('today-date'); if(t) t.textContent = thaiDate();
  syncNav(); updateStats(); loadFocus(); renderInboxPreview();
  loadFromSheets();
});
