/**
 * Email delivery abstraction.
 *
 * Production: set RESEND_API_KEY (https://resend.com) and EMAIL_FROM in your
 * environment. If RESEND_API_KEY is absent, we fall back to logging the
 * email to the server console — this keeps local development and CI
 * runnable without a real provider, per docs/DECISIONS.md.
 */

interface SendEmailInput {
  to: string;
  subject: string;
  html: string;
  text: string;
}

export async function sendEmail(input: SendEmailInput): Promise<void> {
  const apiKey = process.env.RESEND_API_KEY;
  const from = process.env.EMAIL_FROM ?? "Execution System <no-reply@execution.system>";

  if (!apiKey) {
    // Development fallback — no external credential configured.
    console.log(
      `\n[email:dev-fallback] to=${input.to} subject="${input.subject}"\n${input.text}\n`
    );
    return;
  }

  const res = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      from,
      to: input.to,
      subject: input.subject,
      html: input.html,
      text: input.text,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Failed to send email via Resend: ${res.status} ${body}`);
  }
}

export function verificationEmail(link: string) {
  return {
    subject: "Verify your email",
    text: `Confirm your email to activate your account: ${link}`,
    html: `<p>Confirm your email to activate your account:</p><p><a href="${link}">${link}</a></p>`,
  };
}

export function passwordResetEmail(link: string) {
  return {
    subject: "Reset your password",
    text: `Reset your password: ${link}. This link expires in 1 hour.`,
    html: `<p>Reset your password:</p><p><a href="${link}">${link}</a></p><p>This link expires in 1 hour.</p>`,
  };
}
