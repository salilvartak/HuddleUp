/**
 * HuddleUp — Email Notification Function
 *
 * Triggered by: Appwrite Database event
 *   databases.*.collections.notifications.documents.*.create
 *
 * Environment variables required:
 *   RESEND_API_KEY        — your Resend API key (get one free at resend.com)
 *   FROM_EMAIL            — sender address (e.g. notifications@yourdomain.com)
 *   APP_URL               — your app URL (e.g. https://huddleup.app)
 *   APPWRITE_ENDPOINT     — your Appwrite endpoint
 *   APPWRITE_PROJECT_ID   — your Appwrite project ID
 *   APPWRITE_API_KEY      — Appwrite API key with databases.write permission
 *   DATABASE_ID           — your Appwrite database ID
 */

import { Client, Databases } from 'node-appwrite';

const TYPE_SUBJECT = {
  assignment: '👤 Task assigned to you',
  comment:    '💬 New comment on your task',
  due:        '📅 Task due reminder',
  info:       'ℹ️  HuddleUp notification',
};

export default async ({ req, res, log, error }) => {
  // ── Parse the triggering document ────────────────────────────────────────
  // Appwrite passes the document as req.body (already parsed object) for
  // event triggers, or as a raw JSON string for manual HTTP executions.
  let notification;
  try {
    notification = typeof req.body === 'string'
      ? JSON.parse(req.body)
      : req.body;
    if (!notification || typeof notification !== 'object') throw new Error('empty');
  } catch {
    error('Could not parse request body');
    return res.json({ ok: false, reason: 'invalid_body' }, 400);
  }

  const { $id, user_id, email, type, title, body, task_id, email_sent } = notification;

  if (email_sent) {
    log(`Notification ${$id} already sent — skipping`);
    return res.json({ ok: true, reason: 'already_sent' });
  }

  if (!email) {
    error(`Notification ${$id} has no email address`);
    return res.json({ ok: false, reason: 'no_email' }, 400);
  }

  const subject = TYPE_SUBJECT[type] || TYPE_SUBJECT.info;
  const appUrl  = process.env.APP_URL || 'https://yourapp.com';
  const taskLink = task_id ? `${appUrl}/?task=${task_id}` : appUrl;

  // ── Build HTML email ──────────────────────────────────────────────────────
  const html = `<!DOCTYPE html>
<html lang="en">
<head>
  <meta charset="UTF-8" />
  <meta name="viewport" content="width=device-width, initial-scale=1.0" />
  <title>${subject}</title>
</head>
<body style="margin:0;padding:0;background:#FFF8F0;font-family:Inter,system-ui,sans-serif;">
  <table width="100%" cellpadding="0" cellspacing="0" style="background:#FFF8F0;padding:40px 20px;">
    <tr><td align="center">
      <table width="560" cellpadding="0" cellspacing="0"
        style="background:#ffffff;border:2px solid #1a1a1a;box-shadow:4px 4px 0 #1a1a1a;max-width:560px;width:100%;">

        <!-- Header -->
        <tr>
          <td style="padding:24px 32px;border-bottom:2px solid #1a1a1a;background:#ffffff;">
            <span style="font-size:18px;font-weight:900;text-transform:uppercase;letter-spacing:-0.5px;color:#0A0A0A;">
              HuddleUp
            </span>
          </td>
        </tr>

        <!-- Body -->
        <tr>
          <td style="padding:32px;">
            <p style="margin:0 0 8px;font-size:20px;font-weight:900;color:#0A0A0A;line-height:1.3;">
              ${title}
            </p>
            <p style="margin:0 0 28px;font-size:14px;font-weight:600;color:#555555;line-height:1.6;">
              ${body}
            </p>
            ${task_id ? `
            <a href="${taskLink}"
              style="display:inline-block;padding:12px 24px;background:#10b981;color:#ffffff;
                     text-decoration:none;font-weight:900;font-size:13px;text-transform:uppercase;
                     letter-spacing:0.5px;border:2px solid #1a1a1a;box-shadow:3px 3px 0 #1a1a1a;">
              View Task →
            </a>` : ''}
          </td>
        </tr>

        <!-- Footer -->
        <tr>
          <td style="padding:16px 32px;border-top:2px solid #e5e5e5;background:#FFF8F0;">
            <p style="margin:0;font-size:11px;font-weight:700;color:#AAAAAA;text-transform:uppercase;letter-spacing:0.5px;">
              HuddleUp · Manage your
              <a href="${appUrl}/settings" style="color:#10b981;text-decoration:none;">notification preferences</a>
            </p>
          </td>
        </tr>
      </table>
    </td></tr>
  </table>
</body>
</html>`;

  // ── Send via Resend ───────────────────────────────────────────────────────
  try {
    const resendResponse = await fetch('https://api.resend.com/emails', {
      method:  'POST',
      headers: {
        'Content-Type':  'application/json',
        'Authorization': `Bearer ${process.env.RESEND_API_KEY}`,
      },
      body: JSON.stringify({
        from:    process.env.FROM_EMAIL || 'HuddleUp <notifications@resend.dev>',
        to:      [email],
        subject,
        html,
      }),
    });

    if (!resendResponse.ok) {
      const text = await resendResponse.text();
      error(`Resend error ${resendResponse.status}: ${text}`);
      return res.json({ ok: false, reason: 'resend_error', detail: text }, 500);
    }

    log(`Email sent to ${email} for notification ${$id}`);
  } catch (e) {
    error(`Failed to call Resend: ${e.message}`);
    return res.json({ ok: false, reason: 'fetch_error' }, 500);
  }

  // ── Mark email_sent = true in Appwrite ───────────────────────────────────
  try {
    const client = new Client()
      .setEndpoint(process.env.APPWRITE_ENDPOINT)
      .setProject(process.env.APPWRITE_PROJECT_ID)
      .setKey(process.env.APPWRITE_API_KEY);

    const db = new Databases(client);
    await db.updateDocument(process.env.DATABASE_ID, 'notifications', $id, { email_sent: true });
    log(`Marked notification ${$id} as email_sent`);
  } catch (e) {
    // Non-fatal — the email was sent; just log the update failure
    error(`Could not mark notification ${$id} as sent: ${e.message}`);
  }

  return res.json({ ok: true });
};
