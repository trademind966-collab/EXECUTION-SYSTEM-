import { sendEmail } from "./email";

export type ReminderChannel = "IN_APP" | "PUSH" | "EMAIL" | "WHATSAPP" | "SMS";

interface DispatchInput {
  channel: ReminderChannel;
  to: { email: string; phone?: string | null; pushToken?: string | null };
  message: string;
  subject?: string;
}

/**
 * Channel dispatch table. IN_APP and EMAIL are fully implemented.
 * PUSH / WHATSAPP / SMS are architected (interface + env vars + docs) but
 * require external credentials the deploying team must supply — see
 * docs/NOTIFICATIONS.md for exactly what remains to configure.
 */
export async function dispatchReminder(input: DispatchInput): Promise<{ delivered: boolean; note?: string }> {
  switch (input.channel) {
    case "IN_APP":
      // In-app reminders are simply rows in `reminders` with status PENDING,
      // rendered by the dashboard. Nothing to dispatch externally.
      return { delivered: true };

    case "EMAIL":
      await sendEmail({
        to: input.to.email,
        subject: input.subject ?? "Reminder",
        text: input.message,
        html: `<p>${input.message}</p>`,
      });
      return { delivered: true };

    case "PUSH": {
      const key = process.env.PUSH_PROVIDER_API_KEY;
      if (!key || !input.to.pushToken) {
        return { delivered: false, note: "PUSH_PROVIDER_API_KEY or device token not configured." };
      }
      // Integration point: call your push provider (e.g. FCM/APNs) here.
      return { delivered: false, note: "Push provider integration not yet wired to a vendor." };
    }

    case "WHATSAPP": {
      const key = process.env.WHATSAPP_API_TOKEN;
      if (!key || !input.to.phone) {
        return { delivered: false, note: "WHATSAPP_API_TOKEN or phone number not configured." };
      }
      // Integration point: call WhatsApp Business Cloud API here.
      return { delivered: false, note: "WhatsApp integration not yet wired to a vendor." };
    }

    case "SMS": {
      const key = process.env.SMS_PROVIDER_API_KEY;
      if (!key || !input.to.phone) {
        return { delivered: false, note: "SMS_PROVIDER_API_KEY or phone number not configured." };
      }
      // Integration point: call Twilio/Vonage/etc here.
      return { delivered: false, note: "SMS integration not yet wired to a vendor." };
    }
  }
}

/**
 * Reminder copy generator. Deliberately avoids guilt/shame language
 * ("you failed", "you're behind") per product spec — frames everything
 * around the user's own stated reason ("why") and the next small step.
 */
export function reminderMessage(kind: "TASK" | "MISSED" | "PATTERN" | "GOAL", ctx: {
  goalWhy?: string | null;
  taskTitle?: string;
  estimatedMinutes?: number;
}): string {
  switch (kind) {
    case "TASK":
      return `Next step: "${ctx.taskTitle}"${
        ctx.estimatedMinutes ? ` — about ${ctx.estimatedMinutes} minutes.` : "."
      }`;
    case "MISSED":
      return `"${ctx.taskTitle}" wasn't completed. No judgment — let's figure out what got in the way.`;
    case "PATTERN":
      return `We've noticed a repeating pattern around this kind of task. Worth a look together?`;
    case "GOAL":
      return ctx.goalWhy
        ? `You started this because: "${ctx.goalWhy}". Is today's step still pointing that way?`
        : `A quick check-in on your goal — still the right direction?`;
  }
}
