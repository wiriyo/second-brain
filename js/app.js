// ===== PWA SERVICE WORKER =====
if ('serviceWorker' in navigator) {
      navigator.serviceWorker.register('./sw.js');
}

// ===== CONFIG =====
const SHEET_URL = 'https://script.google.com/macros/s/AKfycbwXhdM9ldY9_mcjQze0TUOmVixP_DztyR5_vzo_DpCIPxcXwm1GXXpqm4LaqYHBKT_5SQ/exec';

// ===== ESCAPE =====
function escapeHtml(str) {
  return String(str)
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}

// ===== UNIQUE ID (ป้องกัน Date.now() ซ้ำ) =====
let _idCounter = 0;
function genId() {
      return Date.now() * 1000 + (_idCounter = (_idCounter + 1) % 1000);
}

// ===== STORAGE =====
const S = {
      get: k => { try { return JSON.parse(localStorage.getItem(k)) } catch { return null } },
      set: (k, v) => localStorage.setItem(k, JSON.stringify(v)),
};

// ===== FOCUS MIGRATION =====
function _migrateFocus(raw) {
      if (!raw || !Array.isArray(raw)) return [null, null, null];
      return raw.map(item => {
              if (item === null || item === undefined || item === '') return null;
              if (typeof item === 'string') return { text: item, refType: null, refId: null, done: false, focusDate: null };
              if (!item.focusDate) item.focusDate = null;
              return item;
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
function _migrateTasks(arr) {
      if (!Array.isArray(arr)) return [];
      return arr.map(t => {
              if (!t.name && t.text) t.name = t.text;
              if (!t.priority) t.priority = 'medium';
              return t;
      });
}

// ===== DEDUP =====
function dedupById(arr) {
      const seen = new Set();
      return arr.filter(item => {
              const key = String(item.id);
              if (seen.has(key)) return false;
              seen.add(key);
              return true;
      });
}

// ===== AUTO-SYNC (debounce) =====
const _syncTimers = {};
function _debouncedSync(action, fn, delay = 1500) {
      clearTimeout(_syncTimers[action]);
      _syncTimers[action] = setTimeout(fn, delay);
}

// ===== SAVE LOCAL + AUTO SYNC =====
function save(syncAction = null) {
  const all = !syncAction;

  if (all || syncAction === 'inbox')  { state.inbox = dedupById(state.inbox); S.set('sb_inbox', state.inbox); }
  if (all || syncAction === 'tasks')  { state.tasks = dedupById(state.tasks); S.set('sb_tasks', state.tasks); }
  if (all || syncAction === 'habits') { S.set('sb_habitlog', state.habitLog); S.set('sb_streak', state.streak); }
  if (all || syncAction === 'habits' || syncAction === 'points') { S.set('sb_points', state.points); }
  if (all || syncAction === 'points') { S.set('sb_redeemlog', state.redeemLog); }
  if (all || syncAction === 'focus')  { S.set('sb_focus', state.focus); }
  if (all) S.set('sb_para', state.para);

  if (syncAction === 'inbox')  _debouncedSync('inbox', () => syncInbox());
  if (syncAction === 'tasks')  _debouncedSync('tasks', () => syncTasks());
  if (syncAction === 'habits') { _debouncedSync('habits', () => syncHabits()); _debouncedSync('points', () => syncPoints()); }
  if (syncAction === 'points') { _debouncedSync('points', () => syncPoints()); _debouncedSync('redeemlog', () => syncRedeemLog()); }
  if (syncAction === 'focus')  _debouncedSync('focus', () => syncFocus());
  if (all) { _debouncedSync('para', () => syncPara(), 2000); _debouncedSync('focus', () => syncFocus(), 2000); }
}

// ===== SYNC TO SHEETS =====
let _jsonpSeq = 0;
function jsonpCall(params, onSuccess, label) {
      const id = 'cb_' + Date.now() + '_' + (++_jsonpSeq);
      const parts = Object.entries(params).map(([k,v]) => k + '=' + encodeURIComponent(v));
      parts.push('callback=' + id);
      const url = SHEET_URL + '?' + parts.join('&');
      window[id] = function(data) {
              clearTimeout(window[id + '_timeout']);
              delete window[id];
              if (s && s.parentNode) s.parentNode.removeChild(s);
              if (onSuccess) onSuccess(data);
              if (label) showSyncBadge(label);
      };
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
              showSyncBadge('⚠️ Sync ไม่สำเร็จ (ดู Console F12)');
      };
      document.head.appendChild(s);
}

// ===== POST helper =====
// ===== SYNC TRACKING =====
let _lastSyncMap = {};
function _markSynced(action) {
      _lastSyncMap[action] = Date.now();
      S.set('sb_lastsync', _lastSyncMap);
}
function _getLastSync(action) {
      const stored = S.get('sb_lastsync') || {};
      const ts = stored[action] || 0;
      if (!ts) return 'ยังไม่เคย sync';
      const diff = Math.floor((Date.now() - ts) / 1000);
      if (diff < 60) return 'เมื่อกี้นี้';
      if (diff < 3600) return Math.floor(diff/60) + ' นาทีที่แล้ว';
      return new Date(ts).toLocaleTimeString('th-TH');
}

async function postToSheets(payload) {
      try {
              await fetch(SHEET_URL, {
                        method: 'POST',
                        mode: 'no-cors',
                        headers: { 'Content-Type': 'text/plain;charset=utf-8' },
                        body: JSON.stringify(payload)
              });
              _markSynced(payload.action);
              return true;
      } catch(e) {
              console.error('[POST] failed:', payload.action, e);
              return false;
      }
}

async function syncInbox() {
      showSyncBadge('☁️ กำลัง sync Inbox... (' + _getLastSync('saveInbox') + ')');
      await postToSheets({ action: 'saveInbox', items: state.inbox });
      showSyncBadge('📥 Inbox sync แล้ว ✨');
}

async function syncTasks() {
      showSyncBadge('☁️ กำลัง sync Tasks... (' + _getLastSync('saveTasks') + ')');
      await postToSheets({ action: 'saveTasks', items: state.tasks });
      showSyncBadge('📋 Tasks sync แล้ว ✨');
}

async function syncHabits() {
      showSyncBadge('☁️ กำลัง sync Habits... (' + _getLastSync('saveHabits') + ')');
      await postToSheets({ action: 'saveHabits', log: state.habitLog, points: state.points });
      showSyncBadge('🎯 Habits sync แล้ว ✨');
}

async function syncPoints() {
      await postToSheets({ action: 'savePoints', points: state.points });
      showSyncBadge('💎 Points sync แล้ว ✨');
}

async function syncFocus() {
      showSyncBadge('☁️ กำลัง sync Focus... (' + _getLastSync('saveFocus') + ')');
      await postToSheets({ action: 'saveFocus', items: state.focus });
      showSyncBadge('🎯 Focus sync แล้ว ✨');
}

async function syncPara() {
  showSyncBadge('☁️ กำลัง sync PARA... (' + _getLastSync('savePara') + ')');
  await postToSheets({ action: 'savePara', data: state.para });
  showSyncBadge('📂 PARA sync แล้ว ✨');
}

async function syncRedeemLog() {
  await postToSheets({ action: 'saveRedeemLog', items: state.redeemLog });
}

// ===== SYNC ALL =====
async function syncAllToSheets() {
  showSyncBadge('☁️ กำลัง sync ทุกอย่าง...');
  await Promise.all([
    syncInbox(),
    syncTasks(),
    syncHabits(),
    syncPoints(),
    syncFocus(),
    syncPara(),
    syncRedeemLog()
  ]);
  showSyncBadge('✅ Sync ทุกอย่างเสร็จแล้ว! ✨');
}

// ===== LOAD FROM SHEETS =====
function loadFromSheets() {
      showSyncBadge('🔄 กำลังโหลดข้อมูล...');

  jsonpCall({ action: 'getInbox' }, (data) => {
          if (Array.isArray(data) && data.length > 0) {
                    state.inbox = dedupById(data);
                    S.set('sb_inbox', state.inbox);
                    syncNav();
                    updateStats();
                    if (typeof renderInbox === 'function') renderInbox();
                    showSyncBadge('☁️ โหลด Inbox จาก Sheets ✅');
          }
  });

  jsonpCall({ action: 'getPoints' }, (data) => {
          if (data && typeof data.points === 'number' && !isNaN(data.points)) {
                    state.points = data.points;
                    S.set('sb_points', data.points);
                    updateStats();
                    syncNav();
                    if (typeof updatePoints === 'function') updatePoints();
          }
  });

  jsonpCall({ action: 'getTasks' }, (data) => {
          if (Array.isArray(data) && data.length > 0) {
                    const migrated = _migrateTasks(data);
                    state.tasks = dedupById(migrated);
                    S.set('sb_tasks', state.tasks);
                    updateStats();
                    if (typeof renderTasks === 'function') renderTasks();
                    showSyncBadge('☁️ โหลด Tasks จาก Sheets ✅');
          }
  });

  jsonpCall({ action: 'getPara' }, (data) => {
    if (data && typeof data === 'object' && !Array.isArray(data) && data.projects) {
      state.para = data;
      S.set('sb_para', state.para);
      if (typeof renderPara === 'function') renderPara();
      showSyncBadge('📂 โหลด PARA จาก Sheets ✅');
    }
  });

  jsonpCall({ action: 'getFocus' }, (data) => {
          if (Array.isArray(data)) {
                    // ตรวจว่า Sheets มีข้อมูล focus จริง (อย่างน้อย 1 slot ไม่ใช่ null)
            const hasData = data.some(item => item !== null && item && item.text);
                    if (hasData) {
                                // merge: Sheets ชนะ ถ้า local เป็น null หรือว่าง
                      const merged = [0, 1, 2].map(i => {
                                    const sheetItem = data[i];
                                    const localItem = state.focus[i];
                                    // ถ้า Sheets มีข้อมูล ใช้ Sheets (เป็น source of truth)
                                                             if (sheetItem && sheetItem.text) return sheetItem;
                                    // ถ้า Sheets ว่าง แต่ local มีข้อมูล ใช้ local
                                                             if (localItem && localItem.text) return localItem;
                                    return null;
                      });
                                state.focus = _migrateFocus(merged);
                                S.set('sb_focus', state.focus);
                                if (typeof renderFocusCards === 'function') renderFocusCards();
                                showSyncBadge('🎯 โหลด Focus จาก Sheets ✅');
                    }
          }
  });
}

// ===== GREETING =====
function getGreeting() {
  const h = new Date().getHours();
  if (h < 12) return 'สวัสดีตอนเช้า';
  if (h < 17) return 'สวัสดีตอนบ่าย';
  if (h < 21) return 'สวัสดีตอนเย็น';
  return 'สวัสดีตอนกลางคืน';
}

// ===== PRUNE HABIT LOG =====
function pruneHabitLog(days = 90) {
  const cutoff = new Date();
  cutoff.setDate(cutoff.getDate() - days);
  const cutoffStr = cutoff.toISOString().split('T')[0];
  let pruned = false;
  Object.keys(state.habitLog).forEach(k => {
    if (k < cutoffStr) { delete state.habitLog[k]; pruned = true; }
  });
  if (pruned) S.set('sb_habitlog', state.habitLog);
}

// ===== EXPORT BACKUP =====
function exportData() {
  const data = {
    exportDate: new Date().toISOString(),
    inbox: state.inbox,
    tasks: state.tasks,
    para: state.para,
    points: state.points,
    habitLog: state.habitLog,
    redeemLog: state.redeemLog,
    focus: state.focus,
  };
  const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `second-brain-backup-${today()}.json`;
  a.click();
  URL.revokeObjectURL(url);
  showToast('📥 Export สำเร็จแล้วค่ะ!');
}

// ===== MOBILE NAV =====
function _initMobileNav() {
  const sidebar = document.getElementById('sidebar') || document.querySelector('.sidebar');
  if (!sidebar) return;

  const overlay = document.createElement('div');
  overlay.className = 'sidebar-overlay';
  overlay.id = 'sidebar-overlay';
  overlay.onclick = () => { sidebar.classList.remove('open'); overlay.classList.remove('open'); };
  document.body.appendChild(overlay);

  const btn = document.createElement('button');
  btn.className = 'hamburger';
  btn.id = 'hamburger';
  btn.innerHTML = '☰';
  btn.setAttribute('aria-label', 'เปิดเมนู');
  btn.onclick = () => { sidebar.classList.toggle('open'); overlay.classList.toggle('open'); };
  document.body.appendChild(btn);
}

// ===== TOAST =====
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
      b.textContent = msg;
      b.style.opacity = '1';
      clearTimeout(b._t);
      b._t = setTimeout(() => b.style.opacity = '0', 3000);
}

// ===== DATE =====
function today() {
      return new Date().toISOString().split('T')[0];
}

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
              el.textContent = n;
              el.style.display = n > 0 ? 'inline-block' : 'none';
      });
      const t = state.tasks.filter(i => !i.done).length;
      document.querySelectorAll('#tasks-badge').forEach(el => {
              el.textContent = t;
              el.style.display = t > 0 ? 'inline-block' : 'none';
      });
      document.querySelectorAll('#nav-points').forEach(el => el.textContent = state.points);
}

// ===== QUICK CAPTURE =====
function quickCapture() {
      const input = document.getElementById('quick-input');
      if (!input) return;
      const text = input.value.trim();
      if (!text) return;
      state.inbox.push({ id: genId(), text, date: today(), done: false });
      save('inbox');
      input.value = '';
      renderInboxPreview();
      syncNav();
      updateStats();
}

function renderInboxPreview() {
      const el = document.getElementById('inbox-preview');
      if (!el) return;
      const recent = state.inbox.filter(i => !i.done).slice(-3).reverse();
      el.innerHTML = recent.map(i => `
          <div class="inbox-preview-item"><div class="inbox-dot"></div><span>${escapeHtml(i.text)}</span></div>
            `).join('');
}

// ===== FOCUS =====
function setFocusItem(index, text, refType, refId) {
      state.focus[index] = { text, refType: refType || null, refId: refId || null, done: false, focusDate: today() };
      save('focus');
      if (typeof renderFocusCards === 'function') renderFocusCards();
}

function clearFocusItem(index) {
      // ถ้าเป็น linked item ให้ uncomplete original ด้วย
      const item = state.focus[index];
      if (item && item.refType === 'task' && item.refId != null) {
            const t = state.tasks.find(t => Number(t.id) === Number(item.refId));
            if (t && t.done) t.done = false;
      }
      state.focus[index] = null;
      save('focus');
      save('tasks');
      if (typeof renderFocusCards === 'function') renderFocusCards();
      if (typeof renderTasks === 'function') renderTasks();
      updateStats();
      syncNav();
}

function completeFocus(index) {
      const item = state.focus[index];
      if (!item || item.done) return;
      item.done = true;
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
      if (item.refType === 'inbox' && item.refId != null) {
              const inbox = state.inbox.find(i => Number(i.id) === Number(item.refId));
              if (inbox) {
                    inbox.done = true;
                    save('inbox');
              }
      }
      save('focus');
      if (typeof renderFocusCards === 'function') renderFocusCards();
      updateStats();
      syncNav();
}

function loadFocus() {
      // Auto-reset focus ที่ไม่ใช่วันนี้
      const fd = today();
      let changed = false;
      state.focus = state.focus.map(f => {
            if (f && f.focusDate !== fd) {
                  changed = true;
                  return null;
            }
            return f;
      });
      if (changed) save('focus');
      if (typeof renderFocusCards === 'function') renderFocusCards();
}

// ===== STATS =====
function updateStats() {
      const ic = state.inbox.filter(i => !i.done).length;
      const tc = state.tasks.filter(t => !t.done).length;
      const e = (id, v) => { const el = document.getElementById(id); if(el) el.textContent = v; };
      e('stat-inbox', ic);
      e('stat-tasks', tc);
      e('stat-points', state.points);
      e('stat-streak', state.streak);
      e('card-inbox', ic + ' รายการ');
      e('card-tasks', tc + ' งาน');
      e('card-points', state.points + ' แต้ม');
}

// ===== LAST SYNC LABEL =====
function _updateLastSyncLabel() {
  const el = document.getElementById('last-sync-label');
  if (!el) return;
  const stored = S.get('sb_lastsync') || {};
  const newest = Object.values(stored).reduce((max, ts) => Math.max(max, ts), 0);
  if (!newest) { el.textContent = '☁️ ยังไม่เคย sync'; return; }
  const diff = Math.floor((Date.now() - newest) / 1000);
  if (diff < 60) el.textContent = '☁️ sync เมื่อกี้นี้';
  else if (diff < 3600) el.textContent = '☁️ sync ' + Math.floor(diff/60) + ' นาทีที่แล้ว';
  else el.textContent = '☁️ sync ' + new Date(newest).toLocaleTimeString('th-TH');
}

// ===== SYNC ALL EXPORT BUTTON (shared) =====
function _initSidebarFooter() {
  const footer = document.querySelector('.sidebar-footer');
  if (!footer) return;
  // ตรวจสอบว่ามีปุ่ม sync อยู่แล้วหรือไม่ (จาก index.html)
  let syncBtn = footer.querySelector('.sync-all-btn');
  if (!syncBtn) {
    syncBtn = document.createElement('button');
    syncBtn.className = 'sync-all-btn';
    syncBtn.textContent = '☁️ Sync All';
    syncBtn.onclick = syncAllToSheets;
    footer.appendChild(syncBtn);
  }
  // Export backup
  let expBtn = footer.querySelector('.export-btn');
  if (!expBtn) {
    expBtn = document.createElement('button');
    expBtn.className = 'sync-all-btn';
    expBtn.style.marginTop = '4px';
    expBtn.textContent = '📥 Export Backup';
    expBtn.onclick = exportData;
    footer.appendChild(expBtn);
  }
  // Last sync label
  let syncLabel = document.getElementById('last-sync-label');
  if (!syncLabel) {
    syncLabel = document.createElement('div');
    syncLabel.id = 'last-sync-label';
    syncLabel.style.cssText = 'font-size:10px;color:rgba(255,255,255,0.35);text-align:center;margin-top:4px;';
    footer.appendChild(syncLabel);
  }
}

// ===== INIT =====
document.addEventListener('DOMContentLoaded', () => {
  const heroTitle = document.querySelector('.hero-title');
  if (heroTitle) heroTitle.textContent = `${getGreeting()} พี่ทะเล 👋`;
  const d = document.getElementById('hero-date');
  if (d) d.textContent = thaiDate();
  const t = document.getElementById('today-date');
  if (t) t.textContent = thaiDate();
  syncNav();
  updateStats();
  loadFocus();
  renderInboxPreview();
  pruneHabitLog();
  _initMobileNav();
  _initSidebarFooter();
  _updateLastSyncLabel();
  setInterval(_updateLastSyncLabel, 30000); // update every 30s
  loadFromSheets();
});
