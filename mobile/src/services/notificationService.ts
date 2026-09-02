import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';
import { CalendarEvent } from './calendarMockService';

const STORAGE_KEY = '@sidekick:event_notifications';

type StoredMap = Record<string, string[]>;

/**
 * Configure default notification behavior
 */
Notifications.setNotificationHandler({
  handleNotification: async () => ({
    shouldShowAlert: true,
    shouldPlaySound: true,
    shouldSetBadge: true,
    shouldShowBanner: true,
    shouldShowList: true,
  }),
});

export async function requestPermissions() {
  if (!Device.isDevice) return false;
  const { status } = await Notifications.getPermissionsAsync();
  let finalStatus = status;
  if (status !== 'granted') {
    const res = await Notifications.requestPermissionsAsync();
    finalStatus = res.status;
  }
  if (finalStatus !== 'granted') return false;

  // Create high-importance channel for Android
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'default',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff6b6b',
    });
  }
  return true;
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    console.log('[NotificationService] Web environment; push notifications skipped.');
    return null;
  }

  try {
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('[NotificationService] Push notification permissions denied.');
      return null;
    }

    const tokenData = await Notifications.getExpoPushTokenAsync().catch(err => {
      console.log('[NotificationService] Push token fetch info:', err.message);
      return null;
    });

    if (!tokenData?.data) {
      return null;
    }

    const token = tokenData.data;
    console.log('[NotificationService] Obtained Push Token:', token);

    await apiService.post('/api/user/push-token', { pushToken: token }).catch(err => {
      console.log('[NotificationService] Error registering token on backend:', err.message);
    });

    return token;
  } catch (error) {
    console.error('[NotificationService] Unexpected error in registerForPushNotificationsAsync:', error);
    return null;
  }
}

function parseDateTime(dateStr: string, timeStr: string) {
  const cleanDateStr = dateStr.substring(0, 10);
  const [y, m, d] = cleanDateStr.split('-').map(Number);
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
  const ok = await requestPermissions();
  if (!ok) return;

  const eventDate = parseDateTime(event.date, event.time || '08:00');
  const dayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
  const identifiers: string[] = [];

  if (dayBefore > new Date()) {
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${event.title} — Amanhã`,
        body: event.description || 'Lembrete do seu evento',
        data: { eventId: event.id },
      },
      trigger: {
        type: 'date',
        date: dayBefore,
        channelId: 'default',
      } as any,
    });
    identifiers.push(id1);
  }

  const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
  if (oneHourBefore > new Date()) {
    const id3 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${event.title} — Daqui a 1 hora`,
        body: event.description || 'Seu evento começa em 1 hora',
        data: { eventId: event.id },
      },
      trigger: {
        type: 'date',
        date: oneHourBefore,
        channelId: 'default',
      } as any,
    });
    identifiers.push(id3);
  }

  if (eventDate > new Date()) {
    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `${event.title} — Hoje`,
        body: event.description || 'Seu evento começa hoje',
        data: { eventId: event.id },
      },
      trigger: {
        type: 'date',
        date: eventDate,
        channelId: 'default',
      } as any,
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

const notificationService = {
  scheduleEventNotifications,
  cancelEventNotifications,
  requestPermissions,
  registerForPushNotificationsAsync,
};

export default notificationService;
