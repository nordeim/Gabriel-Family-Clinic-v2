// lib/integrations/resend.ts
import { Resend } from "resend";
import { env } from "@/env";
import type { EmailProvider } from "@/lib/notifications/types";
import type { ReactElement } from "react";

class ResendEmailProvider implements EmailProvider {
  private client: Resend;

  constructor() {
    if (typeof window !== "undefined") {
      throw new Error("ResendEmailProvider can only be used on the server.");
    }
    this.client = new Resend(env.RESEND_API_KEY);
  }

  async sendEmail(props: {
    to: string;
    subject: string;
    body: ReactElement;
  }): Promise<{ id: string }> {
    const { to, subject, body } = props;
    try {
      const { data, error } = await this.client.emails.send({
        from: `Gabriel Family Clinic <no-reply@${env.RESEND_DOMAIN}>`, // Assuming RESEND_DOMAIN is in env
        to,
        subject,
        react: body,
      });

      if (error || !data) {
        throw error ?? new Error("Resend API returned no data.");
      }

      console.log(`Email sent successfully to ${to}. ID: ${data.id}`);
      return { id: data.id };
    } catch (error) {
      console.error(`Failed to send email to ${to}:`, error);
      throw new Error("Resend email sending failed.");
    }
  }
}

export const resendEmailProvider = new ResendEmailProvider();
