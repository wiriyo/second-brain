// ==========================================
// Second Brain — Google Apps Script v6
// GET  → อ่านข้อมูล (JSONP)
// POST → เขียนข้อมูล (no-cors fetch)
// ==========================================

// ===== POST =====
function doPost(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  let result = { status: 'ok' };
  try {
    const body = JSON.parse(e.postData.contents || '{}');
    const action = body.action;

    if (action === 'saveInbox') {
      const items = body.items || [];
      const sheet = getOrCreate(ss, 'Inbox');
      sheet.clearContents();
      sheet.appendRow(['id','text','date','done','tag']);
      items.forEach(i => sheet.appendRow([i.id, i.text, i.date, i.done, i.tag||'']));
      result = { status: 'ok', saved: items.length };
    }

    if (action === 'saveTasks') {
      const items = body.items || [];
      const sheet = getOrCreate(ss, 'Tasks');
      sheet.clearContents();
      sheet.appendRow(['id','name','priority','para','start','due','done','date']);
      items.forEach(i => sheet.appendRow([i.id, i.name, i.priority, i.para, i.start||'', i.due||'', i.done, i.date]));
      result = { status: 'ok', saved: items.length };
    }

    if (action === 'saveHabits') {
      const log = body.log || {};
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

    if (action === 'savePoints') {
      const sheet = getOrCreate(ss, 'Points');
      sheet.clearContents();
      sheet.appendRow(['points']);
      sheet.appendRow([body.points || 0]);
      result = { status: 'ok' };
    }

    if (action === 'saveFocus') {
      const items = body.items || [null, null, null];
      const sheet = getOrCreate(ss, 'Focus');
      sheet.clearContents();
      sheet.appendRow(['slot','text','refType','refId','done']);
      items.forEach((item, i) => {
        if (item && item.text) {
          sheet.appendRow([i, item.text, item.refType||'', item.refId||'', item.done||false]);
        } else {
          sheet.appendRow([i, '', '', '', false]);
        }
      });
      result = { status: 'ok', saved: items.length };
    }

    if (action === 'savePara') {
      const data = body.data || {};
      const sheet = getOrCreate(ss, 'Para');
      sheet.clearContents();
      sheet.appendRow(['key','json','updated']);
      sheet.appendRow(['para', JSON.stringify(data), new Date().toISOString()]);
      result = { status: 'ok' };
    }

    if (action === 'saveRedeemLog') {
      const items = body.items || [];
      const sheet = getOrCreate(ss, 'RedeemLog');
      sheet.clearContents();
      sheet.appendRow(['id','name','emoji','cost','date']);
      items.forEach(r => sheet.appendRow([r.id, r.name, r.emoji, r.cost, r.date]));
      result = { status: 'ok', saved: items.length };
    }

  } catch(err) {
    result = { status: 'error', message: err.message };
  }
  return ContentService.createTextOutput(JSON.stringify(result))
    .setMimeType(ContentService.MimeType.JSON);
}

// ===== GET (JSONP) =====
function doGet(e) {
  const ss = SpreadsheetApp.getActiveSpreadsheet();
  const action = e.parameter.action;
  const cb = e.parameter.callback || 'callback';
  let data = null;

  try {

    if (action === 'getInbox') {
      const sheet = ss.getSheetByName('Inbox');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getRange(2, 1, sheet.getLastRow()-1, 5).getValues();
        data = rows.map(r => ({
          id: Number(r[0]),
          text: String(r[1]), date: String(r[2]),
          done: r[3] === true || r[3] === 'true',
          tag: r[4] || ''
        })).filter(r => r.text);
      } else { data = []; }
    }

    if (action === 'getTasks') {
      const sheet = ss.getSheetByName('Tasks');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getRange(2, 1, sheet.getLastRow()-1, 8).getValues();
        data = rows.map(r => ({
          id: Number(r[0]),
          name: String(r[1]), priority: r[2], para: r[3],
          start: r[4]||'', due: r[5]||'',
          done: r[6] === true || r[6] === 'true',
          date: r[7]
        })).filter(r => r.name);
      } else { data = []; }
    }

    if (action === 'getPoints') {
      const sheet = ss.getSheetByName('Points');
      if (sheet && sheet.getLastRow() > 1) {
        data = { points: Number(sheet.getRange(2, 1).getValue()) || 0 };
      } else { data = { points: 0 }; }
    }

    if (action === 'getFocus') {
      const sheet = ss.getSheetByName('Focus');
      if (sheet && sheet.getLastRow() > 1) {
        const rows = sheet.getRange(2, 1, sheet.getLastRow()-1, 5).getValues();
        const result = [null, null, null];
        rows.forEach(r => {
          const slot = Number(r[0]);
          if (slot >= 0 && slot <= 2) {
            result[slot] = r[1] !== '' ? { text: String(r[1]), refType: r[2]||null, refId: r[3]||null, done: r[4] } : null;
          }
        });
        data = result;
      } else { data = [null, null, null]; }
    }

    if (action === 'getPara') {
      const sheet = ss.getSheetByName('Para');
      if (sheet && sheet.getLastRow() > 1) {
        const json = sheet.getRange(2, 2).getValue();
        try { data = JSON.parse(json); } catch(e) { data = {}; }
      } else { data = {}; }
    }

  } catch(err) {
    data = { status: 'error', message: err.message };
  }

  return ContentService.createTextOutput(cb + '(' + JSON.stringify(data) + ')')
    .setMimeType(ContentService.MimeType.JAVASCRIPT);
}

// ===== HELPER =====
function getOrCreate(ss, name) {
  return ss.getSheetByName(name) || ss.insertSheet(name);
}
