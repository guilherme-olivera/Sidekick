import { Expo } from 'expo-server-sdk';
import fs from 'fs';
import path from 'path';

const tokensFile = path.join(__dirname, '../../push_tokens.json');

let expo = new Expo();

type TokenStore = Record<string, string[]>; // userId -> tokens

function loadStore(): TokenStore {
  try {
    if (!fs.existsSync(tokensFile)) return {};
    const raw = fs.readFileSync(tokensFile, 'utf8');
    return JSON.parse(raw);
  } catch (e) {
    console.warn('Failed loading push tokens store', e);
    return {};
  }
}

function saveStore(store: TokenStore) {
  try {
    fs.writeFileSync(tokensFile, JSON.stringify(store, null, 2), 'utf8');
  } catch (e) {
    console.warn('Failed saving push tokens store', e);
  }
}

export function registerToken(userId: string, token: string) {
  const store = loadStore();
  store[userId] = Array.from(new Set([...(store[userId] || []), token]));
  saveStore(store);
}

export function getAllTokens(): string[] {
  const store = loadStore();
  const tokens = new Set<string>();
  Object.values(store).forEach((arr) => arr.forEach((t) => tokens.add(t)));
  return Array.from(tokens);
}

export async function broadcastMessage(title: string, body: string, data?: any) {
  const tokens = getAllTokens();
  if (tokens.length === 0) return { success: true, sent: 0 };

  const messages = tokens
    .filter((t) => Expo.isExpoPushToken(t))
    .map((t) => ({
      to: t,
      sound: 'default',
      title,
      body,
      data: data || {},
    }));

  const chunks = expo.chunkPushNotifications(messages);
  let tickets: any[] = [];

  for (const chunk of chunks) {
    try {
      const ticketChunk = await expo.sendPushNotificationsAsync(chunk);
      tickets.push(...ticketChunk);
    } catch (error) {
      console.error('Error sending push chunk', error);
    }
  }

  return { success: true, sent: messages.length, tickets };
}
