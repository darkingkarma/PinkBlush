
import { Platform } from 'react-native';
import * as Notifications from 'expo-notifications';
import Constants from 'expo-constants';

import { supabase } from './supabase';

// Keeps the token available during the current app session.
// We also retrieve it again from Expo when unregistering.
let registeredExpoPushToken: string | null = null;

// Get the EAS project ID.
function getEASProjectId(): string {
  const projectId =
    Constants.expoConfig?.extra?.eas?.projectId ??
    Constants.easConfig?.projectId;

  if (!projectId) {
    throw new Error('Expo EAS project ID was not found.');
  }

  return projectId;
}

// Retrieve this device's Expo Push Token.
async function getCurrentExpoPushToken(): Promise<string> {
  const projectId = getEASProjectId();

  const tokenResponse =
    await Notifications.getExpoPushTokenAsync({
      projectId,
    });

  return tokenResponse.data;
}

// Register push notifications for the logged-in user.
export async function registerForPushNotificationsAsync(
  userId: string,
): Promise<void> {
  try {
    if (!userId) {
      console.log('Push notification registration skipped: no user ID.');
      return;
    }

    // Create Android notification channel.
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Pink Blush Notifications',
        importance: Notifications.AndroidImportance.MAX,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#D96B8A',
      });
    }

    // Check existing notification permission.
    const { status: existingStatus } =
      await Notifications.getPermissionsAsync();

    let finalStatus = existingStatus;

    // Request permission if it has not been granted.
    if (existingStatus !== 'granted') {
      const { status } =
        await Notifications.requestPermissionsAsync();

      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      console.log(
        'Push notification permission was not granted.',
      );
      return;
    }

    // Retrieve Expo Push Token.
    const expoPushToken = await getCurrentExpoPushToken();

    registeredExpoPushToken = expoPushToken;

    console.log(
      'Pink Blush Expo Push Token:',
      expoPushToken,
    );

    // Save or update the token in Supabase.
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

    console.log(
      'Push notification token successfully saved.',
    );
  } catch (error) {
    console.error(
      'Push notification registration failed:',
      error,
    );
  }
}

// Remove this device's push token when the user logs out.
export async function unregisterPushNotificationsAsync(
  userId: string,
): Promise<void> {
  if (!userId) {
    console.log(
      'Push notification cleanup skipped: no user ID.',
    );
    return;
  }

  try {
    let expoPushToken: string | null = null;

    // First, try retrieving the token again from Expo.
    // This also works after the app has been restarted.
    try {
      expoPushToken = await getCurrentExpoPushToken();
    } catch (tokenError) {
      console.log(
        'Could not retrieve the current Expo Push Token:',
        tokenError,
      );

      // Fall back to the token stored during this app session.
      expoPushToken = registeredExpoPushToken;
    }

    if (!expoPushToken) {
      console.log(
        'No push token available for cleanup.',
      );
      return;
    }

    // Delete only this device's token for this user.
    const { error } = await supabase
      .from('push_tokens')
      .delete()
      .eq('user_id', userId)
      .eq('expo_push_token', expoPushToken);

    if (error) {
      throw error;
    }

    registeredExpoPushToken = null;

    console.log(
      'This device push token was successfully removed.',
    );
  } catch (error) {
    // Do not prevent the user from logging out
    // if push token cleanup fails.
    console.error(
      'Push notification cleanup failed:',
      error,
    );
  }
}
