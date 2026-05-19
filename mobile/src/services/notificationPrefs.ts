import AsyncStorage from '@react-native-async-storage/async-storage';

const KEY = '@sidekick:notification_prefs';

export type NotificationPrefs = {
  enabled: boolean;
  remindBeforeDays: number; // e.g. 1 = one day before
  remindTime: string; // HH:mm
};

const DEFAULTS: NotificationPrefs = {
  enabled: true,
  remindBeforeDays: 1,
  remindTime: '08:00',
};

export async function loadPrefs(): Promise<NotificationPrefs> {
  try {
    const raw = await AsyncStorage.getItem(KEY);
    if (!raw) return DEFAULTS;
    return { ...DEFAULTS, ...(JSON.parse(raw) || {}) } as NotificationPrefs;
  } catch (e) {
    return DEFAULTS;
  }
}

export async function savePrefs(prefs: Partial<NotificationPrefs>) {
  const current = await loadPrefs();
  const merged = { ...current, ...prefs };
  await AsyncStorage.setItem(KEY, JSON.stringify(merged));
  return merged;
}

export default { loadPrefs, savePrefs };
