// lib/integrations/twilio.ts
import twilio from "twilio";
import { env } from "@/env";
import { type SmsProvider } from "@/lib/notifications/types";

class TwilioSmsProvider implements SmsProvider {
  private client: twilio.Twilio;

  constructor() {
    // Should only be initialized on the server
    if (typeof window !== "undefined") {
      throw new Error("TwilioSmsProvider can only be used on the server.");
    }
    this.client = twilio(env.TWILIO_ACCOUNT_SID, env.TWILIO_AUTH_TOKEN);
  }

  async sendSms(to: string, body: string): Promise<{ id: string }> {
    // Add +65 prefix for Singapore numbers if not present
    const formattedTo = to.startsWith("+") ? to : `+65${to}`;
    
    try {
      const message = await this.client.messages.create({
        body,
        from: env.TWILIO_PHONE_NUMBER,
        to: formattedTo,
      });
      console.log(`SMS sent successfully to ${formattedTo}. SID: ${message.sid}`);
      return { id: message.sid };
    } catch (error) {
      console.error(`Failed to send SMS to ${formattedTo}:`, error);
      throw new Error("Twilio SMS sending failed.");
    }
  }
}

export const twilioSmsProvider = new TwilioSmsProvider();
