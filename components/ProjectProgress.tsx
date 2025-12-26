import React, { useEffect, useRef } from 'react';
import { View, Text, StyleSheet, TouchableOpacity, Alert, Animated } from 'react-native';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS } from '@/constants/theme';
import { TwelveWeekPlan, calculateCurrentWeek, WeekPlan } from '@/services/storage';

interface ProjectProgressProps {
  plan: TwelveWeekPlan;
  showPillarName?: boolean;
}

type WeekStatus = 'completed' | 'delayed' | 'current' | 'upcoming';

// Helper to format date range
function formatDateRange(startDate: string, endDate: string): string {
  const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];

  const start = new Date(startDate);
  const end = new Date(endDate);

  return `${start.getDate()} ${months[start.getMonth()]} - ${end.getDate()} ${months[end.getMonth()]}`;
}

// Helper to get status label in Portuguese
function getStatusLabel(status: WeekStatus): string {
  switch (status) {
    case 'completed':
      return 'Concluído';
    case 'delayed':
      return 'Atrasado';
    case 'current':
      return 'Em Andamento';
    case 'upcoming':
      return 'Futuro';
  }
}

// Calculate week dates from plan start date
function getWeekDates(planStartDate: string, weekNumber: number): { startDate: string; endDate: string } {
  const start = new Date(planStartDate);
  start.setDate(start.getDate() + (weekNumber - 1) * 7);

  const end = new Date(start);
  end.setDate(end.getDate() + 6);

  return {
    startDate: start.toISOString(),
    endDate: end.toISOString(),
  };
}

export default function ProjectProgress({ plan, showPillarName = false }: ProjectProgressProps) {
  const currentWeek = calculateCurrentWeek(plan.startDate);
  // Clamp currentWeek to valid range (1-12)
  const displayCurrentWeek = Math.min(Math.max(currentWeek, 1), 12);

  // Animation values
  const fadeAnim = useRef(new Animated.Value(0)).current;
  const scaleAnim = useRef(new Animated.Value(0.95)).current;
  const weekAnims = useRef(
    Array.from({ length: 12 }, () => new Animated.Value(0))
  ).current;

  // Run entry animation on mount
  useEffect(() => {
    // Container fade-in
    Animated.parallel([
      Animated.timing(fadeAnim, {
        toValue: 1,
        duration: 400,
        useNativeDriver: true,
      }),
      Animated.spring(scaleAnim, {
        toValue: 1,
        friction: 8,
        tension: 40,
        useNativeDriver: true,
      }),
    ]).start();

    // Stagger animation for week blocks
    const animations = weekAnims.map((anim, index) =>
      Animated.timing(anim, {
        toValue: 1,
        duration: 300,
        delay: index * 50,
        useNativeDriver: true,
      })
    );

    Animated.stagger(30, animations).start();
  }, [fadeAnim, scaleAnim, weekAnims]);

  // Calculate total progress
  const totalTasks = plan.weeks.reduce((sum, week) => sum + week.tasks.length, 0);
  const completedTasks = plan.weeks.reduce(
    (sum, week) => sum + week.tasks.filter(t => t.completed).length,
    0
  );
  const progressPercentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

  // Determine status for each week
  const getWeekStatus = (weekNumber: number): WeekStatus => {
    if (weekNumber > currentWeek) {
      return 'upcoming';
    }

    if (weekNumber === currentWeek) {
      return 'current';
    }

    // Past week - check task completion
    const week = plan.weeks.find(w => w.weekNumber === weekNumber);
    if (!week || week.tasks.length === 0) {
      // No tasks defined = consider completed
      return 'completed';
    }

    const allCompleted = week.tasks.every(t => t.completed);
    return allCompleted ? 'completed' : 'delayed';
  };

  // Get color for each status
  const getStatusColor = (status: WeekStatus): string => {
    switch (status) {
      case 'completed':
        return Colors.sageGreen;
      case 'delayed':
        return Colors.error;
      case 'current':
        return Colors.goldenAmber;
      case 'upcoming':
        return '#E2E8F0';
    }
  };

  // Get week data for alert
  const getWeekData = (weekNumber: number): WeekPlan | undefined => {
    return plan.weeks.find(w => w.weekNumber === weekNumber);
  };

  // Handle week block press
  const handleWeekPress = (weekNumber: number) => {
    const status = getWeekStatus(weekNumber);
    const statusLabel = getStatusLabel(status);
    const weekData = getWeekData(weekNumber);
    const dates = getWeekDates(plan.startDate, weekNumber);
    const dateRange = formatDateRange(dates.startDate, dates.endDate);

    // Get task info
    const totalWeekTasks = weekData?.tasks.length || 0;
    const completedWeekTasks = weekData?.tasks.filter(t => t.completed).length || 0;

    let taskMessage: string;
    if (totalWeekTasks === 0) {
      taskMessage = 'Nenhuma tarefa definida';
    } else {
      taskMessage = `Tarefas: ${completedWeekTasks}/${totalWeekTasks} concluídas`;
    }

    Alert.alert(
      `Semana ${weekNumber}`,
      `📅 ${dateRange}\n\n📊 Status: ${statusLabel}\n\n✅ ${taskMessage}`,
      [{ text: 'OK' }]
    );
  };

  // Get pillar info if showing pillar name
  const pillar = PILLARS.find(p => p.id === plan.pillarId);

  // Handle case where plan.weeks might be empty
  if (!plan.weeks || plan.weeks.length === 0) {
    return null;
  }

  return (
    <Animated.View
      style={[
        styles.container,
        Shadows.sm,
        {
          opacity: fadeAnim,
          transform: [{ scale: scaleAnim }],
        },
      ]}
    >
      {/* Pillar Name (optional, for dashboard) */}
      {showPillarName && pillar && (
        <View style={styles.pillarHeader}>
          <View style={[styles.pillarDot, { backgroundColor: pillar.color }]} />
          <Text style={styles.pillarName}>{pillar.name}</Text>
        </View>
      )}

      {/* Progress Header */}
      <View style={styles.header}>
        <Text style={styles.label}>Progresso do Trimestre</Text>
        <Text style={styles.percentage}>{progressPercentage}%</Text>
      </View>

      {/* Week Blocks (1-12) - Interactive */}
      <View style={styles.weekBlocks}>
        {Array.from({ length: 12 }, (_, i) => i + 1).map((weekNum, index) => {
          const status = getWeekStatus(weekNum);
          const color = getStatusColor(status);
          return (
            <Animated.View
              key={weekNum}
              style={{
                flex: 1,
                opacity: weekAnims[index],
                transform: [
                  {
                    translateY: weekAnims[index].interpolate({
                      inputRange: [0, 1],
                      outputRange: [10, 0],
                    }),
                  },
                ],
              }}
            >
              <TouchableOpacity
                activeOpacity={0.7}
                onPress={() => handleWeekPress(weekNum)}
                style={[
                  styles.weekBlock,
                  { backgroundColor: color },
                  status === 'current' && styles.weekBlockCurrent,
                ]}
              />
            </Animated.View>
          );
        })}
      </View>

      {/* Week Numbers */}
      <View style={styles.weekNumbers}>
        <Text style={styles.weekNumber}>1</Text>
        <Text style={styles.weekNumber}>6</Text>
        <Text style={styles.weekNumber}>12</Text>
      </View>

      {/* Legend */}
      <View style={styles.legend}>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.sageGreen }]} />
          <Text style={styles.legendText}>Feito</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.error }]} />
          <Text style={styles.legendText}>Atrasado</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: Colors.goldenAmber }]} />
          <Text style={styles.legendText}>Atual</Text>
        </View>
        <View style={styles.legendItem}>
          <View style={[styles.legendDot, { backgroundColor: '#E2E8F0' }]} />
          <Text style={styles.legendText}>Futuro</Text>
        </View>
      </View>

      {/* Current Week Indicator */}
      <View style={styles.currentWeekInfo}>
        <Text style={styles.currentWeekText}>
          Semana {displayCurrentWeek} de 12 {currentWeek <= 12 ? 'em andamento' : 'concluído'}
        </Text>
        <Text style={styles.tasksCompletedText}>
          {completedTasks}/{totalTasks} tarefas concluídas
        </Text>
      </View>
    </Animated.View>
  );
}

const styles = StyleSheet.create({
  container: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.lg,
  },
  pillarDot: {
    width: 16,
    height: 16,
    borderRadius: 8,
    marginRight: Spacing.sm,
  },
  pillarName: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    marginBottom: Spacing.lg,
  },
  label: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.slate,
    fontWeight: Typography.weights.medium,
  },
  percentage: {
    fontFamily: Typography.heading,
    fontSize: 40,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    lineHeight: 44,
  },
  weekBlocks: {
    flexDirection: 'row',
    gap: 6,
    marginBottom: Spacing.sm,
  },
  weekBlock: {
    height: 32,
    borderRadius: 6,
    minWidth: '100%',
  },
  weekBlockCurrent: {
    borderWidth: 3,
    borderColor: Colors.goldenAmber,
  },
  weekNumbers: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    paddingHorizontal: 4,
    marginBottom: Spacing.lg,
  },
  weekNumber: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    fontWeight: Typography.weights.medium,
  },
  legend: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.lg,
    marginBottom: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 12,
    height: 12,
    borderRadius: 6,
  },
  legendText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },
  currentWeekInfo: {
    backgroundColor: Colors.deepNavy + '0A',
    borderRadius: BorderRadius.md,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.lg,
    alignItems: 'center',
  },
  currentWeekText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  tasksCompletedText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginTop: 4,
  },
});
