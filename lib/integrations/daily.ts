// lib/integrations/daily.ts
"use server";
import { env } from "@/env";

/**
 * A server-side adapter for the Daily.co REST API.
 * This class handles the creation and management of video call rooms.
 */
export class DailyVideoProvider {
  private apiKey: string;
  private apiUrl = "https://api.daily.co/v1";

  constructor() {
    if (!env.DAILY_API_KEY) {
      throw new Error("DAILY_API_KEY is not set in environment variables.");
    }
    this.apiKey = env.DAILY_API_KEY;
  }

  /**
   * Creates a new, private, short-lived video call room for a specific appointment.
   * @param appointmentId - The unique ID of the appointment to associate with the room.
   * @returns The newly created room object, including its URL.
   */
  async createRoom(appointmentId: string): Promise<{ url: string; name: string }> {
    const expiryTime = Math.floor(Date.now() / 1000) + 2 * 60 * 60; // Expires in 2 hours

    const response = await fetch(`${this.apiUrl}/rooms`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${this.apiKey}`,
      },
      body: JSON.stringify({
        name: `gfc-appt-${appointmentId}`,
        privacy: "private",
        properties: {
          exp: expiryTime,
          enable_chat: true,
          enable_screenshare: true,
          max_participants: 2,
        },
      }),
    });

    if (!response.ok) {
      const errorBody = await response.json();
      console.error("Failed to create Daily.co room:", errorBody);
      throw new Error(`Daily.co API error: ${errorBody.info || response.statusText}`);
    }

    const room = await response.json();
    return { url: room.url, name: room.name };
  }
}

export const dailyVideoProvider = new DailyVideoProvider();
