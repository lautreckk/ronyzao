import React, { useState, useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Animated } from 'react-native';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows } from '@/constants/theme';
import {
  getGovernanceRituals,
  toggleGovernanceRitual,
  getTwelveWeekPlans,
  GovernanceRitualState,
  TwelveWeekPlan,
  getCalendarWeekNumber,
} from '@/services/storage';
import { trackGovernanceRitualCompleted } from '@/services/analytics';
import WeeklyReviewModal from './WeeklyReviewModal';

interface RitualItem {
  id: 'weeklyReview' | 'weeklyPlanning';
  title: string;
  description: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  day: string;
}

const RITUALS: RitualItem[] = [
  {
    id: 'weeklyReview',
    title: 'Revisão Semanal do Plano',
    description: 'Revise o progresso e ajuste metas',
    icon: 'rate-review',
    day: 'Domingo',
  },
  {
    id: 'weeklyPlanning',
    title: 'Planejamento da Próxima Semana',
    description: 'Defina prioridades e tarefas',
    icon: 'event-note',
    day: 'Domingo',
  },
];

export default function GovernanceRituals() {
  const [rituals, setRituals] = useState<GovernanceRitualState | null>(null);
  const [loading, setLoading] = useState(true);
  const [showWeeklyReview, setShowWeeklyReview] = useState(false);
  const [plans, setPlans] = useState<TwelveWeekPlan[]>([]);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnims = useRef(RITUALS.map(() => new Animated.Value(1))).current;

  useEffect(() => {
    loadData();
  }, []);

  useEffect(() => {
    if (!loading) {
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 300,
        useNativeDriver: true,
      }).start();
    }
  }, [loading, fadeAnim]);

  const loadData = async () => {
    try {
      const [ritualsData, plansData] = await Promise.all([
        getGovernanceRituals(),
        getTwelveWeekPlans(),
      ]);
      setRituals(ritualsData);

      // Filter for active/approved plans
      const activePlans = Object.values(plansData)
        .filter((plan): plan is TwelveWeekPlan =>
          plan !== null &&
          plan !== undefined &&
          plan.isApproved !== false &&
          plan.weeks &&
          plan.weeks.length > 0
        );
      setPlans(activePlans);
    } catch (error) {
      console.error('Error loading data:', error);
    } finally {
      setLoading(false);
    }
  };

  const handleToggle = async (ritual: 'weeklyReview' | 'weeklyPlanning', index: number) => {
    // Animate the press
    Animated.sequence([
      Animated.timing(scaleAnims[index], {
        toValue: 0.95,
        duration: 100,
        useNativeDriver: true,
      }),
      Animated.timing(scaleAnims[index], {
        toValue: 1,
        duration: 100,
        useNativeDriver: true,
      }),
    ]).start();

    // For weekly review, open the guided wizard instead of simple toggle
    if (ritual === 'weeklyReview' && !rituals?.weeklyReview) {
      setShowWeeklyReview(true);
      return;
    }

    try {
      const updated = await toggleGovernanceRitual(ritual);
      setRituals(updated);

      // Track when ritual is toggled to completed (not when uncompleting)
      if (updated[ritual] && !rituals?.[ritual]) {
        trackGovernanceRitualCompleted(ritual, weekNumber);
      }
    } catch (error) {
      console.error('Error toggling ritual:', error);
    }
  };

  const handleWeeklyReviewComplete = async () => {
    // Reload rituals to get updated state
    const data = await getGovernanceRituals();
    setRituals(data);
    setShowWeeklyReview(false);
  };

  if (loading || !rituals) {
    return null;
  }

  const completedCount = [rituals.weeklyReview, rituals.weeklyPlanning].filter(Boolean).length;
  const weekNumber = getCalendarWeekNumber();

  return (
    <Animated.View style={[styles.container, Shadows.sm, { opacity: fadeAnim }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <MaterialIcons name="flag" size={20} color={Colors.goldenAmber} />
          <Text style={styles.title}>Rituais de Governança</Text>
        </View>
        <View style={styles.weekBadge}>
          <Text style={styles.weekBadgeText}>Semana {weekNumber}</Text>
        </View>
      </View>

      {/* Progress indicator */}
      <View style={styles.progressRow}>
        <View style={styles.progressBar}>
          <View
            style={[
              styles.progressFill,
              { width: `${(completedCount / RITUALS.length) * 100}%` },
            ]}
          />
        </View>
        <Text style={styles.progressText}>{completedCount}/{RITUALS.length}</Text>
      </View>

      {/* Ritual Items */}
      {RITUALS.map((ritual, index) => {
        const isCompleted = rituals[ritual.id];
        return (
          <Animated.View
            key={ritual.id}
            style={{ transform: [{ scale: scaleAnims[index] }] }}
          >
            <TouchableOpacity
              style={[styles.ritualItem, isCompleted && styles.ritualItemCompleted]}
              onPress={() => handleToggle(ritual.id, index)}
              activeOpacity={0.7}
            >
              <View style={[styles.checkbox, isCompleted && styles.checkboxChecked]}>
                {isCompleted && (
                  <MaterialIcons name="check" size={14} color={Colors.paperWhite} />
                )}
              </View>
              <View style={styles.ritualContent}>
                <View style={styles.ritualTitleRow}>
                  <MaterialIcons
                    name={ritual.icon}
                    size={16}
                    color={isCompleted ? Colors.sageGreen : Colors.slate}
                  />
                  <Text style={[styles.ritualTitle, isCompleted && styles.ritualTitleCompleted]}>
                    {ritual.title}
                  </Text>
                </View>
                <Text style={styles.ritualDescription}>
                  {ritual.description}
                </Text>
              </View>
              <View style={styles.dayBadge}>
                <Text style={styles.dayBadgeText}>{ritual.day}</Text>
              </View>
            </TouchableOpacity>
          </Animated.View>
        );
      })}

      {/* Completion Message */}
      {completedCount === RITUALS.length && (
        <View style={styles.completionBanner}>
          <MaterialIcons name="celebration" size={18} color={Colors.sageGreen} />
          <Text style={styles.completionText}>
            Parabéns! Rituais da semana concluídos!
          </Text>
        </View>
      )}

      {/* Info Text */}
      <Text style={styles.infoText}>
        Os rituais são reiniciados automaticamente a cada nova semana.
      </Text>

      {/* Weekly Review Modal */}
      <WeeklyReviewModal
        visible={showWeeklyReview}
        onClose={() => setShowWeeklyReview(false)}
        plans={plans}
        onComplete={handleWeeklyReviewComplete}
      />
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  headerLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  title: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  weekBadge: {
    backgroundColor: Colors.deepNavy + '10',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 4,
    borderRadius: BorderRadius.full,
  },
  weekBadgeText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.deepNavy,
    fontWeight: Typography.weights.medium,
  },
  progressRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  progressBar: {
    flex: 1,
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    backgroundColor: Colors.sageGreen,
    borderRadius: 3,
  },
  progressText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    fontWeight: Typography.weights.medium,
  },
  ritualItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    backgroundColor: Colors.paperWhite,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  ritualItemCompleted: {
    backgroundColor: Colors.sageGreen + '10',
    borderColor: Colors.sageGreen + '30',
  },
  checkbox: {
    width: 22,
    height: 22,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.lightSlate,
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  checkboxChecked: {
    backgroundColor: Colors.sageGreen,
    borderColor: Colors.sageGreen,
  },
  ritualContent: {
    flex: 1,
  },
  ritualTitleRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: 2,
  },
  ritualTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.deepNavy,
  },
  ritualTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.slate,
  },
  ritualDescription: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
    marginLeft: 20,
  },
  dayBadge: {
    backgroundColor: Colors.goldenAmber + '15',
    paddingHorizontal: Spacing.sm,
    paddingVertical: 3,
    borderRadius: BorderRadius.sm,
  },
  dayBadgeText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.goldenAmber,
    fontWeight: Typography.weights.medium,
  },
  completionBanner: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    backgroundColor: Colors.sageGreen + '15',
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    borderRadius: BorderRadius.sm,
    marginTop: Spacing.sm,
  },
  completionText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.sageGreen,
    fontWeight: Typography.weights.medium,
  },
  infoText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
    textAlign: 'center',
    marginTop: Spacing.md,
    fontStyle: 'italic',
  },
});
