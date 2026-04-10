// ==========================================
// Second Brain — Google Apps Script v3
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
      sheet.appendRow(['id','name','priority','para','due','done','date']);
      items.forEach(i => sheet.appendRow([i.id, i.name, i.priority, i.para, i.due||'', i.done, i.date]));
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
      result = { status: 'ok' };
    }

    // ===== LOAD ACTIONS =====
    if (action === 'getInbox') {
      const sheet = ss.getSheetByName('Inbox');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getDataRange().getValues();
        result = rows.slice(1).map(r => ({
          id: r[0], text: r[1], date: r[2],
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
          id: r[0], name: r[1], priority: r[2], para: r[3],
          due: r[4]||'', done: r[5] === true || r[5] === 'true', date: r[6]
        })).filter(r => r.name);
      } else {
        result = [];
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

function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
