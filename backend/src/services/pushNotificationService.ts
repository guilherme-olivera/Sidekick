import { prisma } from "../utils/prisma";

export interface PushMessagePayload {
  title: string;
  body: string;
  data?: Record<string, any>;
}

/**
 * Saves or updates a user's Expo Push Token in PostgreSQL
 */
export async function saveUserPushToken(
  userId: string,
  pushToken: string
): Promise<boolean> {
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
export async function sendExpoPushNotifications(
  tokens: string[],
  title: string,
  body: string,
  data: any = {}
) {
  const validTokens = tokens.filter(
    (t) =>
      t &&
      (t.startsWith("ExponentPushToken") ||
        t.startsWith("ExpoPushToken") ||
        t.includes("PushToken"))
  );
  if (validTokens.length === 0) {
    console.log("[PushService] No valid push tokens to send to.");
    return { sent: 0, failed: 0 };
  }

  const messages = validTokens.map((token) => ({
    to: token,
    sound: "default",
    channelId: "default",
    priority: "high",
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
    console.log(
      `[PushService] Dispatched ${messages.length} push notifications. Response:`,
      resData
    );
    return { sent: messages.length, resData };
  } catch (error) {
    console.error(
      "[PushService] Failed sending Expo push notifications:",
      error
    );
    return { sent: 0, error };
  }
}

/**
 * Admin Broadcast Push Notification + Persistent In-App Notification
 * Ensures 100% of targeted users receive the broadcast in the Home Bell (🔔)
 * AND dispatches Expo Push to devices with active pushTokens.
 */
export async function broadcastNotification(
  title: string,
  body: string,
  planTypeFilter?: string,
  extraData: any = {}
) {
  const normalizedFilter =
    planTypeFilter === "free" || planTypeFilter === "premium"
      ? planTypeFilter
      : "all";

  // 1. Save persistent In-App Broadcast Notification in PostgreSQL
  const savedNotification = await prisma.appNotification.create({
    data: {
      userId: null,
      targetPlan: normalizedFilter,
      title: title.trim().slice(0, 120),
      body: body.trim().slice(0, 500),
      icon: "📢",
      type: "broadcast",
    },
  });

  // 2. Count total target users & fetch push tokens
  const userWhere: any = {};
  if (normalizedFilter !== "all") {
    userWhere.planType = normalizedFilter;
  }

  const [totalTargetUsers, usersWithTokens] = await Promise.all([
    prisma.user.count({ where: userWhere }),
    prisma.user.findMany({
      where: {
        ...userWhere,
        pushToken: { not: null },
      },
      select: { pushToken: true },
    }),
  ]);

  const tokens = usersWithTokens
    .map((u) => u.pushToken)
    .filter(Boolean) as string[];
  console.log(
    `[PushService] Broadcast saved In-App for ${totalTargetUsers} users and sending Push to ${tokens.length} tokens (filter: ${normalizedFilter})`
  );

  const pushResult = await sendExpoPushNotifications(
    tokens,
    title,
    body,
    extraData
  );

  return {
    sent: pushResult.sent,
    totalTargetUsers,
    inAppSaved: true,
    notificationId: savedNotification.id,
  };
}
