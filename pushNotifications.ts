
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';
import { supabase } from './supabase';
let registeredExpoPushToken: string | null = null;
export async function registerForPushNotificationsAsync(
  userId: string,
): Promise<void> {
  try {
    // Android requires a notification channel before requesting permission.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Pink Blush Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D96B8A',
      });
    }

    // Check notification permission.
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log('Push notification permission was not granted.');
      return;
    }

    // Get the existing EAS project ID from app.json.
    const projectId =
      Constants.expoConfig?.extra?.eas?.projectId ??
      Constants.easConfig?.projectId;

    if (!projectId) {
      throw new Error('Expo EAS project ID was not found.');
    }

    // Get this device's Expo Push Token.
    const expoPushToken = (
      await Notifications.getExpoPushTokenAsync({
        projectId,
      })
    ).data;
    registeredExpoPushToken = expoPushToken;

    console.log('Pink Blush Expo Push Token:', expoPushToken);

    // Save or update the token for this logged-in user.
    const { error } = await supabase
      .from('push_tokens')
      .upsert(
        {
          user_id: userId,
          expo_push_token: expoPushToken,
          device_type: Platform.OS,
          updated_at: new Date().toISOString(),
        },
        {
          onConflict: 'user_id,expo_push_token',
        },
      );

    if (error) {
      throw error;
    }

    console.log('Push token successfully saved to Supabase.');
  } catch (error) {
    console.error('Push notification registration failed:', error);
  }
}
export async function unregisterPushNotificationsAsync(
  userId: string,
): Promise<void> {
  if (!registeredExpoPushToken) {
    console.log('No registered push token found for this device.');
    return;
  }

  const { error } = await supabase
    .from('push_tokens')
    .delete()
    .eq('user_id', userId)
    .eq('expo_push_token', registeredExpoPushToken);

  if (error) {
    throw error;
  }

  registeredExpoPushToken = null;

  console.log('This device push token was removed from Supabase.');
}