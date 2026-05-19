import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import AsyncStorage from '@react-native-async-storage/async-storage';

import { CalendarEvent } from './calendarMockService';
import prefsService from './notificationPrefs';

const STORAGE_KEY = '@sidekick:event_notifications';

type StoredMap = Record<string, string[]>;

async function requestPermissions() {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  if (status !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    return res.status === 'granted';
  }
  return true;
}

function parseDateTime(dateStr: string, timeStr: string) {
  // dateStr: YYYY-MM-DD, timeStr: HH:mm
  const [y, m, d] = dateStr.split('-').map(Number);
  const [hh, mm] = timeStr.split(':').map(Number);
  return new Date(y, m - 1, d, hh || 8, mm || 0, 0);
}

async function loadStore(): Promise<StoredMap> {
  const raw = await AsyncStorage.getItem(STORAGE_KEY);
  if (!raw) return {};
  try {
    return JSON.parse(raw) as StoredMap;
  } catch {
    return {};
  }
}

async function saveStore(map: StoredMap) {
  await AsyncStorage.setItem(STORAGE_KEY, JSON.stringify(map));
}

export async function scheduleEventNotifications(event: CalendarEvent) {
  const prefs = await prefsService.loadPrefs();
  if (!prefs.enabled) return;

  const ok = await requestPermissions();
  if (!ok) return;

  const baseTime = event.time || prefs.remindTime || '08:00';
  const eventDate = parseDateTime(event.date, baseTime);

  const identifiers: string[] = [];

  // Day-before notification (respect remindBeforeDays)
  const dayBefore = new Date(eventDate.getTime() - prefs.remindBeforeDays * 24 * 60 * 60 * 1000);
  if (dayBefore > new Date()) {
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${event.title} — Amanhã`,
        body: event.description || 'Lembrete do seu evento',
        data: { eventId: event.id },
      },
      trigger: ({ date: dayBefore } as any),
    });
    identifiers.push(id1);
  }

  // Same-day notification
  if (eventDate > new Date()) {
    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${event.title} — Hoje`,
        body: event.description || 'Seu evento começa hoje',
        data: { eventId: event.id },
      },
      trigger: ({ date: eventDate } as any),
    });
    identifiers.push(id2);
  }

  const map = await loadStore();
  map[event.id] = identifiers;
  await saveStore(map);
}

export async function cancelEventNotifications(eventId: string) {
  const map = await loadStore();
  const ids = map[eventId] || [];
  await Promise.all(ids.map((id) => Notifications.cancelScheduledNotificationAsync(id)));
  delete map[eventId];
  await saveStore(map);
}

export default {
  scheduleEventNotifications,
  cancelEventNotifications,
};
