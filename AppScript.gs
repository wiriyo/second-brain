// ==========================================
// Second Brain — Google Apps Script v4
// ส่งทุกอย่างผ่าน GET เพื่อหลีก CORS ปัญหา
// ==========================================

function doGet(e) {
  const action = e.parameter.action;
  const callback = e.parameter.callback || 'callback';
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let result = { status: 'ok' };

  try {

    // ===== SAVE ACTIONS =====
    if (action === 'saveInbox') {
      const items = JSON.parse(decodeURIComponent(e.parameter.items || '[]'));
      const sheet = getOrCreate(ss, 'Inbox');
      sheet.clearContents();
      sheet.appendRow(['id','text','date','done','tag']);
      items.forEach(i => sheet.appendRow([i.id, i.text, i.date, i.done, i.tag||'']));
      result = { status: 'ok', saved: items.length };
    }

    if (action === 'saveTasks') {
      const items = JSON.parse(decodeURIComponent(e.parameter.items || '[]'));
      const sheet = getOrCreate(ss, 'Tasks');
      sheet.clearContents();
      sheet.appendRow(['id','name','priority','para','start','due','done','date']);
      items.forEach(i => sheet.appendRow([i.id, i.name, i.priority, i.para, i.start||'', i.due||'', i.done, i.date]));
      result = { status: 'ok', saved: items.length };
    }

    if (action === 'saveHabits') {
      const log = JSON.parse(decodeURIComponent(e.parameter.log || '{}'));
      const sheet = getOrCreate(ss, 'Habits');
      sheet.clearContents();
      sheet.appendRow(['date','habitId','done']);
      Object.entries(log).forEach(([date, habits]) => {
        Object.entries(habits).forEach(([habitId, done]) => {
          sheet.appendRow([date, habitId, done]);
        });
      });

      // บันทึก points ไปด้วยพร้อมกันเลย (ประหยัด 1 JSONP call)
      const pts = parseInt(e.parameter.points);
      if (!isNaN(pts)) {
        savePointsToSheet(ss, pts);
      }

      result = { status: 'ok' };
    }

    // บันทึกแต้มอย่างเดียว (เรียกจาก task complete / reset)
    if (action === 'savePoints') {
      const pts = parseInt(e.parameter.points || '0');
      savePointsToSheet(ss, pts);
      result = { status: 'ok', points: pts };
    }

    // ===== LOAD ACTIONS =====
    if (action === 'getInbox') {
      const sheet = ss.getSheetByName('Inbox');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        result = rows.slice(1).map(r => ({
          id: Number(r[0]),  // บังคับ Number เสมอ ป้องกัน type mismatch
          text: r[1], date: r[2],
          done: r[3] === true || r[3] === 'true',
          tag: r[4] || ''
        })).filter(r => r.text);
      } else {
        result = [];
      }
    }

    if (action === 'getTasks') {
      const sheet = ss.getSheetByName('Tasks');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        result = rows.slice(1).map(r => ({
          id: Number(r[0]),  // บังคับ Number เสมอ ป้องกัน type mismatch
          name: r[1], priority: r[2], para: r[3],
          start: r[4]||'', due: r[5]||'', done: r[6] === true || r[6] === 'true', date: r[7]
        })).filter(r => r.name);
      } else {
        result = [];
      }
    }

    if (action === 'getPoints') {
      const sheet = ss.getSheetByName('Points');
      if (sheet && sheet.getLastRow() > 1) {
        const val = sheet.getRange(2, 2).getValue();
        result = { points: parseInt(val) || 0 };
      } else {
        result = { points: 0 };
      }
    }

  } catch(err) {
    result = { status: 'error', message: err.toString() };
  }

  // ส่งกลับเป็น JSONP
  return ContentService
    .createTextOutput(`${callback}(${JSON.stringify(result)})`)
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ===== HELPERS =====
function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}

function savePointsToSheet(ss, pts) {
  const sheet = getOrCreate(ss, 'Points');
  sheet.clearContents();
  sheet.appendRow(['key', 'value', 'updated']);
  sheet.appendRow(['points', pts, new Date().toISOString()]);
}
