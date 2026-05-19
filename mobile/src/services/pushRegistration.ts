import * as Notifications from 'expo-notifications';
import * as Device from 'expo-device';
import { apiService } from './apiService';

async function getExpoPushTokenAsync() {
  if (!Device.isDevice) return null;

  const { status: existingStatus } = await Notifications.getPermissionsAsync();
  let finalStatus = existingStatus;
  if (existingStatus !== 'granted') {
    const { status } = await Notifications.requestPermissionsAsync();
    finalStatus = status;
  }

  if (finalStatus !== 'granted') return null;

  const tokenData = await Notifications.getExpoPushTokenAsync();
  // tokenData is { data: 'ExponentPushToken[...]' }
  // @ts-ignore
  return tokenData.data || null;
}

export async function registerPushToken(userId?: string) {
  try {
    const token = await getExpoPushTokenAsync();
    if (!token) return { success: false, error: 'no-token' };
    // send to backend
    await apiService.post('/api/push/register', { token });
    return { success: true };
  } catch (e) {
    console.warn('Failed to register push token', e);
    return { success: false, error: e };
  }
}

export default { registerPushToken };
