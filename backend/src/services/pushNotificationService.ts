import { prisma } from "../utils/prisma";

export interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Saves or updates a user's Expo Push Token in PostgreSQL
 */
export async function saveUserPushToken(userId: string, pushToken: string): Promise<boolean> {
  try {
    await prisma.user.update({
      where: { id: userId },
      data: { pushToken },
    });
    console.log(`[PushService] Saved push token for user ${userId}`);
    return true;
  } catch (error) {
    console.error("[PushService] Error saving push token:", error);
    return false;
  }
}

/**
 * Sends push notifications using Expo Push API (https://exp.host/--/api/v2/push/send)
 */
export async function sendExpoPushNotifications(tokens: string[], title: string, body: string, data: any = {}) {
  const validTokens = tokens.filter(t => t && t.startsWith("ExponentPushToken"));
  if (validTokens.length === 0) {
    console.log("[PushService] No valid push tokens to send to.");
    return { sent: 0, failed: 0 };
  }

  const messages = validTokens.map(token => ({
    to: token,
    sound: "default",
    title,
    body,
    data,
  }));

  try {
    const response = await fetch("https://exp.host/--/api/v2/push/send", {
      method: "POST",
      headers: {
        Accept: "application/json",
        "Accept-encoding": "gzip, deflate",
        "Content-Type": "application/json",
      },
      body: JSON.stringify(messages),
    });

    const resData = await response.json();
    console.log(`[PushService] Dispatched ${messages.length} push notifications. Response:`, resData);
    return { sent: messages.length, resData };
  } catch (error) {
    console.error("[PushService] Failed sending Expo push notifications:", error);
    return { sent: 0, error };
  }
}

/**
 * Admin Broadcast Push Notification to all users or filtered by plan (free/premium)
 */
export async function broadcastNotification(title: string, body: string, planTypeFilter?: string, extraData: any = {}) {
  const whereClause: any = {
    pushToken: {
      not: null,
    },
  };

  if (planTypeFilter && (planTypeFilter === "free" || planTypeFilter === "premium")) {
    whereClause.planType = planTypeFilter;
  }

  const users = await prisma.user.findMany({
    where: whereClause,
    select: { pushToken: true },
  });

  const tokens = users.map(u => u.pushToken).filter(Boolean) as string[];
  console.log(`[PushService] Broadcast sending to ${tokens.length} tokens (filter: ${planTypeFilter || "all"})`);

  return sendExpoPushNotifications(tokens, title, body, extraData);
}
