// lib/notifications/types.ts
import { ReactElement } from "react";

export interface SmsProvider {
  sendSms(to: string, message: string): Promise<{ id: string }>;
}

export interface EmailProvider {
  sendEmail(props: {
    to: string;
    subject: string;
    body: ReactElement;
  }): Promise<{ id:string }>;
}
