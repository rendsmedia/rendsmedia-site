/**
 * Rends Media website: contact form mailer (Google Apps Script).
 * Lives in the business@rendsmedia.com Google account. The website posts each
 * enquiry here; this script emails it to the business inbox.
 * SECRET must match 'secret' in /home/rends/rends-mail-config.php on the server.
 */
const SECRET = 'PASTE-THE-SECRET-HERE';
const TO = 'business@rendsmedia.com';

function doPost(e) {
  try {
    const p = JSON.parse(e.postData.contents);
    if (p.secret !== SECRET) return reply('denied');
    MailApp.sendEmail({
      to: TO,
      subject: String(p.subject || 'Website enquiry').slice(0, 200),
      body: String(p.body || '').slice(0, 20000),
      replyTo: String(p.replyTo || ''),
      name: 'Rends Media Website'
    });
    return reply('ok');
  } catch (err) {
    return reply('error: ' + err);
  }
}

function reply(text) {
  return ContentService.createTextOutput(text);
}

// Run this once from the editor to grant permission to send email.
function authorize() {
  MailApp.getRemainingDailyQuota();
}
