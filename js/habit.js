const HABITS = [
  { id: 'inbox', emoji: '📥', name: 'จด Inbox', pts: 10 },
  { id: 'read', emoji: '📖', name: 'อ่าน 15 นาที', pts: 15 },
  { id: 'focus', emoji: '💻', name: 'โฟกัสงาน 1 ชม.', pts: 20 },
  { id: 'walk', emoji: '🚶', name: 'เดิน/ออกกำลัง', pts: 10 },
  { id: 'review', emoji: '🔄', name: 'Weekly Review', pts: 25 },
  { id: 'water', emoji: '💧', name: 'ดื่มน้ำ 8 แก้ว', pts: 5 },
];

const REWARDS = [
  { id: 'tea', emoji: '☕', name: 'ชาเย็น/กาแฟ', cost: 50 },
  { id: 'movie', emoji: '🎬', name: 'ดูหนัง', cost: 100 },
  { id: 'food', emoji: '🍜', name: 'ร้านอาหารโปรด', cost: 150 },
  { id: 'game', emoji: '🎲', name: 'Board Game ใหม่', cost: 200 },
  { id: 'rest', emoji: '😴', name: 'วันพักผ่อน', cost: 300 },
  { id: 'gift', emoji: '🎀', name: 'ของชิ้นพิเศษ', cost: 500 },
];

function getTodayLog() {
  const t = today();
  if (!state.habitLog[t]) state.habitLog[t] = {};
  return state.habitLog[t];
}

function calculateStreak() {
  let streak = 0;
  const now = new Date();
  for (let i = 0; i < 365; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    const log = state.habitLog[key] || {};
    const anyDone = HABITS.some(h => log[h.id]);
    if (!anyDone) break;
    streak++;
  }
  state.streak = streak;
  const el = document.getElementById('streak-num');
  if (el) el.textContent = streak;
  updateStats();
}

function renderHabits() {
  const grid = document.getElementById('habit-grid');
  if (!grid) return;
  const log = getTodayLog();
  grid.innerHTML = HABITS.map(h => `
    <div class="habit-card ${log[h.id] ? 'checked' : ''}" onclick="toggleHabit('${h.id}', ${h.pts})">
      <span class="habit-emoji">${h.emoji}</span>
      <div class="habit-name">${h.name}</div>
      <div class="habit-pts">+${h.pts} แต้ม</div>
      <div class="habit-circle">${log[h.id] ? '✓' : ''}</div>
    </div>
  `).join('');
  updateProgress();
}

function toggleHabit(id, pts) {
  const log = getTodayLog();
  if (log[id]) {
    log[id] = false;
    state.points = Math.max(0, state.points - pts);
  } else {
    log[id] = true;
    state.points += pts;
  }
  calculateStreak();
  save('habits');
  renderHabits();
  updatePoints();
  renderWeek();
  renderRewards();
}

function updateProgress() {
  const log = getTodayLog();
  const done = HABITS.filter(h => log[h.id]).length;
  const total = HABITS.length;
  const pct = Math.round(done / total * 100);
  const e = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  e('done-count', done);
  e('total-count', total);
  e('progress-pct', pct + '%');
  const fill = document.getElementById('progress-fill');
  if (fill) fill.style.width = pct + '%';
  const todayPts = HABITS.filter(h => log[h.id]).reduce((s, h) => s + h.pts, 0);
  e('today-score', todayPts);
}

function updatePoints() {
  const e = (id, v) => { const el = document.getElementById(id); if (el) el.textContent = v; };
  e('total-points', state.points);
  e('shop-points', state.points);
  document.querySelectorAll('#nav-points').forEach(el => el.textContent = state.points);
}

function renderWeek() {
  const grid = document.getElementById('week-grid');
  if (!grid) return;
  const days = ['อา','จ','อ','พ','พฤ','ศ','ส'];
  const now = new Date();
  const startOfWeek = new Date(now);
  startOfWeek.setDate(now.getDate() - now.getDay());
  grid.innerHTML = Array.from({length: 7}, (_, i) => {
    const d = new Date(startOfWeek);
    d.setDate(startOfWeek.getDate() + i);
    const key = d.toISOString().split('T')[0];
    const log = state.habitLog[key] || {};
    const doneCnt = HABITS.filter(h => log[h.id]).length;
    const isToday = key === today();
    const cls = doneCnt >= HABITS.length ? 'done' : isToday ? 'today' : '';
    return `
      <div class="week-day">
        <div class="week-day-name">${days[i]}</div>
        <div class="week-day-box ${cls}">${doneCnt > 0 ? doneCnt : d.getDate()}</div>
      </div>
    `;
  }).join('');
}

function renderRewards() {
  const grid = document.getElementById('reward-grid');
  if (!grid) return;
  grid.innerHTML = REWARDS.map(r => `
    <div class="reward-card ${state.points < r.cost ? 'locked' : ''}" onclick="redeemReward('${r.id}', ${r.cost}, '${r.name}', '${r.emoji}')">
      <span class="reward-emoji">${r.emoji}</span>
      <div class="reward-name">${r.name}</div>
      <div class="reward-cost">${r.cost} แต้ม</div>
    </div>
  `).join('');
}

function redeemReward(id, cost, name, emoji) {
  if (state.points < cost) {
    showToast(`ยังแต้มไม่พอค่ะ! ต้องการ ${cost} แต้ม`);
    return;
  }
  state.points -= cost;
  state.redeemLog.push({ id, name, emoji, cost, date: today() });
  save();
  updatePoints();
  renderRewards();
  renderRedeemLog();
  showToast(`🎉 ได้รับ ${emoji} ${name} แล้วค่ะ! หักแต้ม ${cost} แต้ม`);
}

function renderRedeemLog() {
  const log = state.redeemLog;
  const card = document.getElementById('redeem-log-card');
  const el = document.getElementById('redeem-log');
  if (!card || !el) return;
  if (!log.length) { card.style.display = 'none'; return; }
  card.style.display = 'block';
  el.innerHTML = log.slice().reverse().map(r => `
    <div class="item-row">
      <span>${r.emoji}</span>
      <span class="item-text">${r.name}</span>
      <span style="font-size:11px;color:var(--mid)">${r.date}</span>
      <span class="item-tag">-${r.cost} แต้ม</span>
    </div>
  `).join('');
}

function resetPoints() {
  if (!confirm('⚠️ ยืนยันการ Reset แต้มทั้งหมดเป็น 0 ใช่ไหมคะ?\n\nการกระทำนี้ไม่สามารถย้อนกลับได้นะคะ')) return;
  state.points = 0;
  save('points'); // sync 0 ขึ้น Sheets ทันที
  updatePoints();
  renderRewards();
  showToast('🔄 Reset แต้มเรียบร้อยแล้วค่ะ');
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
  t._timer = setTimeout(() => t.classList.remove('show'), 3000);
}

document.addEventListener('DOMContentLoaded', () => {
  renderHabits();
  updatePoints();
  renderWeek();
  renderRewards();
  renderRedeemLog();
  calculateStreak();
});
