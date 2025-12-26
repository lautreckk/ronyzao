// Strategic Notifications Service for Doze
import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';
import { getOverdueTasks } from './storage';

// Notification identifiers for managing scheduled notifications
const NOTIFICATION_IDS = {
  MORNING_FOCUS: 'morning-focus-notification',
  WEEKLY_REVIEW: 'weekly-review-notification',
  MID_WEEK_ALERT: 'mid-week-alert-notification',
} as const;

// Helper to check if we're on a native platform
const isNativePlatform = Platform.OS === 'ios' || Platform.OS === 'android';

// Configure notification handler to show alerts even in foreground (native only)
if (isNativePlatform) {
  Notifications.setNotificationHandler({
    handleNotification: async () => ({
      shouldShowAlert: true,
      shouldPlaySound: true,
      shouldSetBadge: true,
      shouldShowBanner: true,
      shouldShowList: true,
    }),
  });
}

/**
 * Request permission for push notifications
 * @returns The expo push token if granted, null otherwise
 */
export async function registerForPushNotificationsAsync(): Promise<string | null> {
  // Skip on web - notifications API not available
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform detected - skipping native notifications');
    return null;
  }

  try {
    // Check existing permissions
    const { status: existingStatus } = await Notifications.getPermissionsAsync();
    let finalStatus = existingStatus;

    // Request permission if not already granted
    if (existingStatus !== 'granted') {
      const { status } = await Notifications.requestPermissionsAsync();
      finalStatus = status;
    }

    if (finalStatus !== 'granted') {
      return null;
    }

    // Configure Android channel
    if (Platform.OS === 'android') {
      await Notifications.setNotificationChannelAsync('default', {
        name: 'Doze',
        importance: Notifications.AndroidImportance.HIGH,
        vibrationPattern: [0, 250, 250, 250],
        lightColor: '#FFD93D',
        sound: 'default',
      });
    }

    return 'local';
  } catch (error) {
    console.error('[Notifications] Error requesting permissions:', error);
    return null;
  }
}

/**
 * Cancel a specific scheduled notification by identifier
 */
async function cancelNotification(identifier: string): Promise<void> {
  // Skip on web
  if (Platform.OS === 'web') return;

  try {
    const scheduledNotifications = await Notifications.getAllScheduledNotificationsAsync();
    const existing = scheduledNotifications.find(n => n.identifier === identifier);
    if (existing) {
      await Notifications.cancelScheduledNotificationAsync(identifier);
    }
  } catch (error) {
    console.error(`[Notifications] Error cancelling notification ${identifier}:`, error);
  }
}

/**
 * Schedule Morning Focus notification at 8:00 AM daily
 * @param oneThingTitle The title of the "One Thing" for today
 */
export async function scheduleMorningFocus(oneThingTitle?: string): Promise<void> {
  // Skip on web - scheduled notifications not available
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform - skipping morning focus scheduling');
    return;
  }

  try {
    // Cancel previous morning notification to avoid duplicates
    await cancelNotification(NOTIFICATION_IDS.MORNING_FOCUS);

    const body = oneThingTitle
      ? `Sua Única Coisa hoje é: ${oneThingTitle}`
      : 'Foque na sua tarefa mais importante do dia!';

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.MORNING_FOCUS,
      content: {
        title: '☀️ Foco Matinal',
        body,
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.DAILY,
        hour: 8,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('[Notifications] Error scheduling morning focus:', error);
  }
}

/**
 * Schedule Weekly Review notification for Sunday at 6:00 PM
 */
export async function scheduleWeeklyReview(): Promise<void> {
  // Skip on web - scheduled notifications not available
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform - skipping weekly review scheduling');
    return;
  }

  try {
    // Cancel previous weekly review notification to avoid duplicates
    await cancelNotification(NOTIFICATION_IDS.WEEKLY_REVIEW);

    await Notifications.scheduleNotificationAsync({
      identifier: NOTIFICATION_IDS.WEEKLY_REVIEW,
      content: {
        title: '🔄 Chamada para Revisão',
        body: 'Hora da Revisão Semanal 📊. Feche a semana com chave de ouro!',
        sound: 'default',
        priority: Notifications.AndroidNotificationPriority.HIGH,
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
        weekday: 1, // Sunday (1 = Sunday in expo-notifications)
        hour: 18,
        minute: 0,
      },
    });
  } catch (error) {
    console.error('[Notifications] Error scheduling weekly review:', error);
  }
}

/**
 * Check for overdue tasks and schedule a mid-week alert if needed (Wednesday at 12:00 PM)
 */
export async function checkAndScheduleMidWeekAlert(): Promise<void> {
  // Skip on web - scheduled notifications not available
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform - skipping mid-week alert scheduling');
    return;
  }

  try {
    // Cancel any existing mid-week alert
    await cancelNotification(NOTIFICATION_IDS.MID_WEEK_ALERT);

    // Get overdue tasks
    const overdueTasks = await getOverdueTasks();

    // Only schedule if there are overdue tasks
    if (overdueTasks.length > 0) {
      // Check if today is before Wednesday
      const now = new Date();
      const dayOfWeek = now.getDay(); // 0 = Sunday, 3 = Wednesday

      // Only schedule if it's before Wednesday (or early Wednesday)
      // This prevents scheduling for a time that has already passed
      if (dayOfWeek < 3 || (dayOfWeek === 3 && now.getHours() < 12)) {
        await Notifications.scheduleNotificationAsync({
          identifier: NOTIFICATION_IDS.MID_WEEK_ALERT,
          content: {
            title: '⚠️ Alerta de Pendências',
            body: `Meio da semana! Você tem ${overdueTasks.length} tarefa${overdueTasks.length > 1 ? 's' : ''} pendente${overdueTasks.length > 1 ? 's' : ''}. Vamos acelerar?`,
            sound: 'default',
            priority: Notifications.AndroidNotificationPriority.HIGH,
          },
          trigger: {
            type: Notifications.SchedulableTriggerInputTypes.WEEKLY,
            weekday: 4, // Wednesday (4 = Wednesday in expo-notifications)
            hour: 12,
            minute: 0,
          },
        });
      }
    }
  } catch (error) {
    console.error('[Notifications] Error checking/scheduling mid-week alert:', error);
  }
}

/**
 * Initialize notifications system
 * - Requests permissions
 * - Schedules fixed weekly review notification
 */
export async function initializeNotifications(): Promise<void> {
  // Skip on web - native notifications not available
  if (Platform.OS === 'web') {
    console.log('[Notifications] Web platform detected - notifications disabled');
    return;
  }

  try {
    // Request permissions
    const permissionResult = await registerForPushNotificationsAsync();

    if (!permissionResult) {
      return;
    }

    // Schedule fixed weekly review notification
    await scheduleWeeklyReview();

    // Schedule morning focus with default message (will be updated when One Thing is set)
    await scheduleMorningFocus();
  } catch (error) {
    console.error('[Notifications] Error during initialization:', error);
  }
}

/**
 * Cancel all scheduled notifications (useful for testing/reset)
 */
export async function cancelAllNotifications(): Promise<void> {
  // Skip on web
  if (Platform.OS === 'web') return;

  try {
    await Notifications.cancelAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error cancelling all notifications:', error);
  }
}

/**
 * Get all currently scheduled notifications (useful for debugging)
 */
export async function getScheduledNotifications(): Promise<Notifications.NotificationRequest[]> {
  // Return empty array on web
  if (Platform.OS === 'web') return [];

  try {
    return await Notifications.getAllScheduledNotificationsAsync();
  } catch (error) {
    console.error('[Notifications] Error getting scheduled notifications:', error);
    return [];
  }
}
