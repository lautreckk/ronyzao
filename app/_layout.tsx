import { useEffect } from 'react';
import { AppState, AppStateStatus } from 'react-native';
import { Stack } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { initializeNotifications } from '@/services/notifications';
import {
  initializeAnalytics,
  trackAppOpen,
  trackAppBackground,
} from '@/services/analytics';

export default function RootLayout() {
  // Initialize services on app start
  useEffect(() => {
    initializeNotifications();

    // Initialize analytics (fail-safe, won't crash if it fails)
    initializeAnalytics().then(() => {
      trackAppOpen();
    });

    // Track app state changes for analytics
    const handleAppStateChange = (nextAppState: AppStateStatus) => {
      if (nextAppState === 'background' || nextAppState === 'inactive') {
        trackAppBackground();
      } else if (nextAppState === 'active') {
        trackAppOpen();
      }
    };

    const subscription = AppState.addEventListener('change', handleAppStateChange);

    return () => {
      subscription.remove();
    };
  }, []);

  return (
    <>
      <StatusBar style="light" />
      <Stack screenOptions={{ headerShown: false }}>
        <Stack.Screen name="index" options={{ headerShown: false }} />
        <Stack.Screen name="onboarding" options={{ headerShown: false }} />
        <Stack.Screen name="(tabs)" options={{ headerShown: false }} />
        <Stack.Screen
          name="pillar/[id]"
          options={{
            headerShown: false,
            presentation: 'modal',
          }}
        />
      </Stack>
    </>
  );
}
