/**
 * Multi-channel customer messaging adapters: Email, SMS, WhatsApp.
 *
 * These are "integration-ready": each checks for its provider credentials and
 * no-ops (logging) when unconfigured, so the app works out of the box and you
 * can drop in a provider later without touching call sites.
 */

type Channel = 'SMS' | 'WHATSAPP' | 'EMAIL';
type Recipient = { mobile?: string | null; email?: string | null };

export async function sendEmail(to: string, subject: string, body: string): Promise<void> {
  const apiKey = process.env.EMAIL_API_KEY;
  if (!apiKey) {
    console.log(`[email:stub] → ${to} | ${subject}`);
    return;
  }
  // TODO: integrate Resend / SendGrid / SES here.
  // await fetch('https://api.resend.com/emails', { ... })
}

export async function sendSms(to: string, body: string): Promise<void> {
  const sid = process.env.SMS_API_KEY;
  if (!sid) {
    console.log(`[sms:stub] → ${to} | ${body.slice(0, 40)}…`);
    return;
  }
  // TODO: integrate Twilio / MSG91 / Fast2SMS here.
}

export async function sendWhatsApp(to: string, body: string): Promise<void> {
  const url = process.env.WHATSAPP_API_URL;
  const token = process.env.WHATSAPP_API_TOKEN;
  if (!url || !token) {
    console.log(`[whatsapp:stub] → ${to} | ${body.slice(0, 40)}…`);
    return;
  }
  await fetch(url, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}`, 'Content-Type': 'application/json' },
    body: JSON.stringify({ to, type: 'text', text: { body } }),
  });
}

/** Broadcast a message to many customers across the chosen channels. */
export async function sendCustomerAlert(
  recipients: Recipient[],
  channels: Channel[],
  message: string,
  subject = 'Service Notification'
): Promise<void> {
  await Promise.all(
    recipients.flatMap((r) =>
      channels.map((ch) => {
        if (ch === 'EMAIL' && r.email) return sendEmail(r.email, subject, message);
        if (ch === 'SMS' && r.mobile) return sendSms(r.mobile, message);
        if (ch === 'WHATSAPP' && r.mobile) return sendWhatsApp(r.mobile, message);
        return Promise.resolve();
      })
    )
  );
}
