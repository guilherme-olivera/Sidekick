import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import Constants from 'expo-constants';
import { Platform } from 'react-native';
import AsyncStorage from '@react-native-async-storage/async-storage';
import { apiService } from './apiService';
import { CalendarEvent } from './calendarMockService';

const STORAGE_KEY = '@sidekick:event_notifications';

type StoredMap = Record<string, string[]>;

/**
 * Configure default notification behavior (SDK 54 compatible)
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

async function ensureAndroidChannel() {
  if (Platform.OS === 'android') {
    await Notifications.setNotificationChannelAsync('default', {
      name: 'Sidekick Lembretes e Treinos',
      importance: Notifications.AndroidImportance.MAX,
      vibrationPattern: [0, 250, 250, 250],
      lightColor: '#ff6b6b',
      sound: 'default',
      enableVibrate: true,
      showBadge: true,
    });
  }
}

export async function requestPermissions(): Promise<boolean> {
  if (Platform.OS === 'web') return false;

  try {
    await ensureAndroidChannel();

    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;
    if (existingStatus !== 'granted') {
      const res = await Notifications.requestPermissionsAsync();
      finalStatus = res.status;
    }

    return finalStatus === 'granted';
  } catch (error) {
    console.warn('[NotificationService] Permission check failed:', error);
    return false;
  }
}

export async function registerForPushNotificationsAsync(): Promise<string | null> {
  if (Platform.OS === 'web') {
    return null;
  }

  try {
    const granted = await requestPermissions();
    if (!granted) {
      console.log('[NotificationService] Notification permissions not granted.');
      return null;
    }

    if (!Device.isDevice) {
      console.log('[NotificationService] Running on emulator; local notifications ready, remote push token skipped.');
      return null;
    }

    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ||
      Constants.easConfig?.projectId ||
      '3b69b29e-876f-4286-8c61-339dddd6a282';

    const tokenData = await Notifications.getExpoPushTokenAsync({ projectId }).catch((err) => {
      console.log('[NotificationService] Push token fetch info:', err.message);
      return null;
    });

    if (!tokenData?.data) {
      return null;
    }

    const token = tokenData.data;
    console.log('[NotificationService] Obtained Push Token:', token);

    await apiService.post('/user/push-token', { pushToken: token }).catch((err) => {
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
  const [hh, mm] = (timeStr || '08:00').split(':').map(Number);
  return new Date(y, m - 1, d, isNaN(hh) ? 8 : hh, isNaN(mm) ? 0 : mm, 0);
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

  // Cancela agendamentos antigos deste mesmo evento para evitar duplicidade
  await cancelEventNotifications(event.id).catch(() => {});

  const eventDate = parseDateTime(event.date, event.time || '08:00');
  const now = new Date();
  const identifiers: string[] = [];

  // 1) Lembrete 24h antes
  const dayBefore = new Date(eventDate.getTime() - 24 * 60 * 60 * 1000);
  if (dayBefore > now) {
    const id1 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `📅 Amanhã: ${event.title}`,
        body: event.description || `Seu compromisso está marcado para amanhã às ${event.time || '08:00'}. Prepare-se!`,
        sound: true,
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: dayBefore,
        channelId: 'default',
      },
    });
    identifiers.push(id1);
  }

  // 2) Lembrete 1h antes
  const oneHourBefore = new Date(eventDate.getTime() - 60 * 60 * 1000);
  if (oneHourBefore > now) {
    const id2 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `⏰ Daqui a 1 hora: ${event.title}`,
        body: event.description || 'Falta 1 hora para o seu treino/compromisso começar!',
        sound: true,
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: oneHourBefore,
        channelId: 'default',
      },
    });
    identifiers.push(id2);
  }

  // 3) No horário exato do evento
  if (eventDate > now) {
    const id3 = await Notifications.scheduleNotificationAsync({
      content: {
        title: `🚀 Hora do Treino: ${event.title}`,
        body: event.description || 'Chegou a hora! Vamos colocar o plano em prática.',
        sound: true,
        data: { eventId: event.id },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DATE,
        date: eventDate,
        channelId: 'default',
      },
    });
    identifiers.push(id3);
  }

  const map = await loadStore();
  map[event.id] = identifiers;
  await saveStore(map);
}

export async function cancelEventNotifications(eventId: string) {
  const map = await loadStore();
  const ids = map[eventId] || [];
  await Promise.all(
    ids.map((id) => Notifications.cancelScheduledNotificationAsync(id).catch(() => {}))
  );
  delete map[eventId];
  await saveStore(map);
}

export async function sendTestNotification(
  title = '⚡ Sidekick — Notificação Ativa!',
  body = 'Tudo certo! Os alertas de treinos, provas e avisos do seu companheiro estão funcionando no seu aparelho. 👟🚀'
): Promise<boolean> {
  if (Platform.OS === 'web') {
    if (typeof window !== 'undefined' && 'Notification' in window) {
      if (Notification.permission === 'granted') {
        new Notification(title, { body });
        return true;
      } else if (Notification.permission !== 'denied') {
        const perm = await Notification.requestPermission();
        if (perm === 'granted') {
          new Notification(title, { body });
          return true;
        }
      }
    }
    return false;
  }

  const granted = await requestPermissions();
  if (!granted) {
    return false;
  }

  await Notifications.scheduleNotificationAsync({
    content: {
      title,
      body,
      sound: true,
      data: { test: true },
    },
    trigger: {
      type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
      seconds: 2,
      repeats: false,
      channelId: 'default',
    },
  });

  return true;
}

const notificationService = {
  scheduleEventNotifications,
  cancelEventNotifications,
  requestPermissions,
  registerForPushNotificationsAsync,
  sendTestNotification,
};

export default notificationService;
