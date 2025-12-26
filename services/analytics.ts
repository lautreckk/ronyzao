/**
 * PostHog Analytics Service
 *
 * Provides a fail-safe wrapper around PostHog analytics.
 * If initialization fails or tracking fails, methods will no-op instead of crashing.
 *
 * PRIVACY: Only track events and metadata. NEVER track PII or content.
 */

import PostHog from 'posthog-react-native';

// Configuration from environment variables
const POSTHOG_API_KEY = process.env.EXPO_PUBLIC_POSTHOG_API_KEY;
const POSTHOG_HOST = process.env.EXPO_PUBLIC_POSTHOG_HOST || 'https://app.posthog.com';

// Singleton instance
let posthogClient: PostHog | null = null;
let isInitialized = false;
let initializationFailed = false;

/**
 * Initialize PostHog analytics
 * Should be called once when the app starts
 */
export async function initializeAnalytics(): Promise<void> {
  // Don't retry if initialization already failed
  if (initializationFailed) {
    return;
  }

  // Don't initialize twice
  if (isInitialized && posthogClient) {
    return;
  }

  // Skip if API key is missing
  if (!POSTHOG_API_KEY) {
    console.log('[Analytics] Skipping initialization - missing API key');
    initializationFailed = true;
    return;
  }

  try {
    posthogClient = new PostHog(POSTHOG_API_KEY, {
      host: POSTHOG_HOST,
    });

    // Wait for PostHog to be ready
    await posthogClient.ready();

    isInitialized = true;
    console.log('[Analytics] PostHog initialized successfully');
  } catch (error) {
    console.error('[Analytics] Failed to initialize PostHog:', error);
    initializationFailed = true;
    posthogClient = null;
  }
}

// Type for event properties that PostHog accepts
type EventProperties = Record<string, string | number | boolean | null>;

/**
 * Safely capture an analytics event
 * No-ops if analytics is not initialized
 */
export function trackEvent(
  eventName: string,
  properties?: EventProperties
): void {
  if (!posthogClient || !isInitialized) {
    // Silent no-op in production, log in dev
    if (__DEV__) {
      console.log(`[Analytics] Would track: ${eventName}`, properties);
    }
    return;
  }

  try {
    posthogClient.capture(eventName, properties);
  } catch (error) {
    // Fail silently - analytics should never crash the app
    if (__DEV__) {
      console.error('[Analytics] Error tracking event:', error);
    }
  }
}

/**
 * Identify a user (without PII)
 * Use a hashed or anonymous ID, never email/name
 */
export function identifyUser(
  userId: string,
  traits?: Record<string, string | number | boolean>
): void {
  if (!posthogClient || !isInitialized) {
    return;
  }

  try {
    posthogClient.identify(userId, traits);
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Error identifying user:', error);
    }
  }
}

/**
 * Reset user identity (e.g., on logout)
 */
export function resetAnalytics(): void {
  if (!posthogClient || !isInitialized) {
    return;
  }

  try {
    posthogClient.reset();
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Error resetting analytics:', error);
    }
  }
}

/**
 * Flush pending events immediately
 * Useful before app backgrounding
 */
export async function flushAnalytics(): Promise<void> {
  if (!posthogClient || !isInitialized) {
    return;
  }

  try {
    await posthogClient.flush();
  } catch (error) {
    if (__DEV__) {
      console.error('[Analytics] Error flushing analytics:', error);
    }
  }
}

// ============================================
// TYPED EVENT HELPERS
// These ensure consistent event naming and properties
// ============================================

/**
 * Track when onboarding screen loads
 */
export function trackOnboardingStart(): void {
  trackEvent('onboarding_start');
}

/**
 * Track when a user defines a goal for a pillar
 */
export function trackGoalDefined(pillar: string): void {
  trackEvent('goal_defined', {
    pillar,
  });
}

/**
 * Track when AI generates a plan
 */
export function trackPlanGenerated(pillar: string, weekCount: number): void {
  trackEvent('plan_generated', {
    pillar,
    week_count: weekCount,
  });
}

/**
 * Track when a user approves their plan
 */
export function trackPlanApproved(pillar: string, totalTasks: number): void {
  trackEvent('plan_approved', {
    pillar,
    total_tasks: totalTasks,
  });
}

/**
 * Track when a task is completed
 */
export function trackTaskCompleted(pillar: string, weekNumber: number): void {
  trackEvent('task_completed', {
    pillar,
    week: weekNumber,
  });
}

/**
 * Track when the "One Thing" is set
 */
export function trackOneThingSet(weekNumber: number): void {
  trackEvent('one_thing_set', {
    week: weekNumber,
  });
}

/**
 * Track when the weekly review is completed
 */
export function trackWeeklyReviewCompleted(
  weekNumber: number,
  scorePercentage: number
): void {
  trackEvent('weekly_review_completed', {
    week: weekNumber,
    score_percentage: scorePercentage,
  });
}

/**
 * Track when a mentor message is sent (NOT the content)
 */
export function trackMentorMessageSent(): void {
  trackEvent('mentor_message_sent');
}

/**
 * Track when a quick action is used in mentor
 */
export function trackMentorQuickAction(actionId: string): void {
  trackEvent('mentor_quick_action', {
    action_id: actionId,
  });
}

/**
 * Track when governance rituals are completed
 */
export function trackGovernanceRitualCompleted(
  ritual: 'weeklyReview' | 'weeklyPlanning',
  weekNumber: number
): void {
  trackEvent('governance_ritual_completed', {
    ritual_type: ritual,
    week: weekNumber,
  });
}

/**
 * Track screen views
 */
export function trackScreenView(screenName: string): void {
  trackEvent('screen_view', {
    screen_name: screenName,
  });
}

/**
 * Track app lifecycle events
 */
export function trackAppOpen(): void {
  trackEvent('app_open');
}

export function trackAppBackground(): void {
  trackEvent('app_background');
  // Flush events when backgrounding
  flushAnalytics();
}

/**
 * Track overdue task actions
 */
export function trackOverdueTaskAction(
  action: 'complete' | 'move' | 'discard',
  pillar: string
): void {
  trackEvent('overdue_task_action', {
    action,
    pillar,
  });
}
