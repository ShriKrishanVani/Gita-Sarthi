/**
 * Gita Sarthi - saves "Stay connected" sign-ups into this Google Sheet.
 * Paste this whole file into: your Sheet -> Extensions -> Apps Script  (see LEADS-SETUP.md)
 */
var SHEET_NAME = 'Leads';
var HEADERS = ['Time (IST)', 'Name', 'WhatsApp', 'City', 'Language', 'Consent', 'Device ID', 'Source'];

function doPost(e) {
  var lock = LockService.getScriptLock();
  try {
    lock.waitLock(15000);

    var d = JSON.parse((e && e.postData && e.postData.contents) || '{}');

    // bots fill the hidden "website" field; pretend success and save nothing
    if (d.website) return reply_({ ok: true });

    var name = clean_(d.name, 60);
    var phone = String(d.phone || '').replace(/\D/g, '');
    if (phone.length === 12 && phone.indexOf('91') === 0) phone = phone.slice(2);
    if (phone.length === 11 && phone.charAt(0) === '0') phone = phone.slice(1);

    if (name.length < 2) return reply_({ ok: false, error: 'name missing' });
    if (!/^[6-9]\d{9}$/.test(phone)) return reply_({ ok: false, error: 'invalid phone' });
    if (String(d.consent).toLowerCase() !== 'yes') return reply_({ ok: false, error: 'no consent' });

    var ss = SpreadsheetApp.getActiveSpreadsheet();
    var sh = ss.getSheetByName(SHEET_NAME) || ss.insertSheet(SHEET_NAME);
    if (sh.getLastRow() === 0) {
      sh.appendRow(HEADERS);
      sh.getRange(1, 1, 1, HEADERS.length).setFontWeight('bold').setBackground('#f3e9cf');
      sh.setFrozenRows(1);
      sh.getRange('C:C').setNumberFormat('@');           // keep phone numbers as text
    }

    // same number already saved? do not add it twice
    var last = sh.getLastRow();
    if (last > 1) {
      var phones = sh.getRange(2, 3, last - 1, 1).getValues();
      for (var i = 0; i < phones.length; i++) {
        if (String(phones[i][0]).replace(/\D/g, '') === phone) return reply_({ ok: true, duplicate: true });
      }
    }

    var when = Utilities.formatDate(new Date(), 'Asia/Kolkata', 'dd-MM-yyyy HH:mm:ss');
    var row = sh.getLastRow() + 1;
    sh.getRange(row, 3).setNumberFormat('@');
    sh.getRange(row, 1, 1, HEADERS.length).setValues([[
      when, name, phone, clean_(d.city, 50), d.lang === 'en' ? 'English' : 'Hindi',
      'Yes', clean_(d.deviceId, 60), clean_(d.source, 20) || 'app'
    ]]);

    return reply_({ ok: true });
  } catch (err) {
    return reply_({ ok: false, error: String(err) });
  } finally {
    try { lock.releaseLock(); } catch (x) {}
  }
}

// Open the web-app address in a browser to check that it is running.
function doGet() {
  return reply_({ ok: true, message: 'Gita Sarthi leads endpoint is running' });
}

// Trim, limit length, and stop spreadsheet formulas (=, +, -, @) from being run.
function clean_(v, max) {
  var s = String(v == null ? '' : v).replace(/[\r\n\t]+/g, ' ').trim().slice(0, max);
  return /^[=+\-@]/.test(s) ? "'" + s : s;
}

function reply_(obj) {
  return ContentService.createTextOutput(JSON.stringify(obj)).setMimeType(ContentService.MimeType.JSON);
}
