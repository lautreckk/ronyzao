import React, { useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS } from '@/constants/theme';
import { TwelveWeekPlan, calculateCurrentWeek } from '@/services/storage';

interface AnalyticsModalProps {
  visible: boolean;
  onClose: () => void;
  plans: TwelveWeekPlan[];
}

interface PillarPerformance {
  pillarId: string;
  name: string;
  color: string;
  completedTasks: number;
  totalTasks: number;
  percentage: number;
}

interface WeekData {
  weekNumber: number;
  plannedCumulative: number;
  actualCumulative: number;
}

interface WeeklyPerformance {
  weekNumber: number;
  completed: number;
  total: number;
  percentage: number;
}

export default function AnalyticsModal({ visible, onClose, plans }: AnalyticsModalProps) {
  const insets = useSafeAreaInsets();

  // Calculate current week based on earliest plan start date
  const currentWeek = useMemo(() => {
    if (plans.length === 0) return 1;
    const earliestStart = plans.reduce((earliest, plan) => {
      const planStart = new Date(plan.startDate);
      return planStart < earliest ? planStart : earliest;
    }, new Date(plans[0].startDate));
    return calculateCurrentWeek(earliestStart.toISOString());
  }, [plans]);

  // Calculate Weekly Score (current week execution across all pillars)
  const weeklyScore = useMemo(() => {
    if (plans.length === 0) return { percentage: 0, completed: 0, total: 0 };

    let totalCurrentWeekTasks = 0;
    let completedCurrentWeekTasks = 0;

    plans.forEach(plan => {
      const weekPlan = plan.weeks.find(w => w.weekNumber === currentWeek);
      if (weekPlan) {
        totalCurrentWeekTasks += weekPlan.tasks.length;
        completedCurrentWeekTasks += weekPlan.tasks.filter(t => t.completed).length;
      }
    });

    const percentage = totalCurrentWeekTasks > 0
      ? Math.round((completedCurrentWeekTasks / totalCurrentWeekTasks) * 100)
      : 0;

    return { percentage, completed: completedCurrentWeekTasks, total: totalCurrentWeekTasks };
  }, [plans, currentWeek]);

  // Get dynamic label based on score
  const getScoreLabel = (percentage: number): { emoji: string; text: string; color: string } => {
    if (percentage >= 80) return { emoji: '🔥', text: 'Imparável', color: Colors.sageGreen };
    if (percentage >= 60) return { emoji: '💪', text: 'No Caminho', color: Colors.goldenAmber };
    if (percentage >= 40) return { emoji: '⚠️', text: 'Precisa de Foco', color: '#F59E0B' };
    return { emoji: '🚨', text: 'Atenção Urgente', color: Colors.error };
  };

  const scoreLabel = getScoreLabel(weeklyScore.percentage);

  // Calculate Burn-up Chart Data
  const burnUpData = useMemo((): WeekData[] => {
    const data: WeekData[] = [];

    for (let week = 1; week <= 12; week++) {
      let plannedCumulative = 0;
      let actualCumulative = 0;

      plans.forEach(plan => {
        // Count all tasks up to and including this week
        for (let w = 1; w <= week; w++) {
          const weekPlan = plan.weeks.find(wp => wp.weekNumber === w);
          if (weekPlan) {
            plannedCumulative += weekPlan.tasks.length;
            // Only count actual completed tasks up to current week
            if (w <= currentWeek) {
              actualCumulative += weekPlan.tasks.filter(t => t.completed).length;
            }
          }
        }
      });

      data.push({
        weekNumber: week,
        plannedCumulative,
        actualCumulative: week <= currentWeek ? actualCumulative : 0,
      });
    }

    return data;
  }, [plans, currentWeek]);

  // Get max value for chart scaling
  const maxChartValue = useMemo(() => {
    if (burnUpData.length === 0) return 1;
    return Math.max(...burnUpData.map(d => Math.max(d.plannedCumulative, d.actualCumulative)), 1);
  }, [burnUpData]);

  // Calculate Pillar Performance
  const pillarPerformance = useMemo((): PillarPerformance[] => {
    return plans
      .map(plan => {
        const pillar = PILLARS.find(p => p.id === plan.pillarId);
        const totalTasks = plan.weeks.reduce((sum, w) => sum + w.tasks.length, 0);
        const completedTasks = plan.weeks.reduce(
          (sum, w) => sum + w.tasks.filter(t => t.completed).length,
          0
        );
        const percentage = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

        return {
          pillarId: plan.pillarId,
          name: pillar?.name || plan.pillarId,
          color: pillar?.color || Colors.slate,
          completedTasks,
          totalTasks,
          percentage,
        };
      })
      .sort((a, b) => b.percentage - a.percentage);
  }, [plans]);

  // Total overall progress
  const overallProgress = useMemo(() => {
    const total = pillarPerformance.reduce((sum, p) => sum + p.totalTasks, 0);
    const completed = pillarPerformance.reduce((sum, p) => sum + p.completedTasks, 0);
    return total > 0 ? Math.round((completed / total) * 100) : 0;
  }, [pillarPerformance]);

  // Calculate Historical Weekly Performance Scores (Week 1 to Current Week)
  const historicalPerformance = useMemo((): WeeklyPerformance[] => {
    const data: WeeklyPerformance[] = [];

    for (let week = 1; week <= 12; week++) {
      let totalTasks = 0;
      let completedTasks = 0;

      plans.forEach(plan => {
        const weekPlan = plan.weeks.find(w => w.weekNumber === week);
        if (weekPlan) {
          totalTasks += weekPlan.tasks.length;
          completedTasks += weekPlan.tasks.filter(t => t.completed).length;
        }
      });

      const percentage = totalTasks > 0
        ? Math.round((completedTasks / totalTasks) * 100)
        : 0;

      data.push({
        weekNumber: week,
        completed: completedTasks,
        total: totalTasks,
        percentage,
      });
    }

    return data;
  }, [plans]);

  // Calculate High Performance Streak (consecutive weeks with ≥80% from current week backwards)
  const highPerformanceStreak = useMemo(() => {
    let streak = 0;

    // Start from current week and work backwards
    for (let week = currentWeek; week >= 1; week--) {
      const weekData = historicalPerformance[week - 1];
      // Only count if the week has tasks and performance is ≥80%
      if (weekData && weekData.total > 0 && weekData.percentage >= 80) {
        streak++;
      } else {
        break;
      }
    }

    return streak;
  }, [historicalPerformance, currentWeek]);

  // Get performance bar color based on percentage
  const getPerformanceColor = (percentage: number): string => {
    if (percentage >= 80) return Colors.sageGreen;
    if (percentage >= 50) return Colors.goldenAmber;
    return Colors.error;
  };

  if (plans.length === 0) {
    return (
      <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
        <View style={[styles.container, { paddingTop: insets.top }]}>
          <View style={styles.header}>
            <Text style={styles.headerTitle}>Status do Projeto</Text>
            <TouchableOpacity style={styles.closeButton} onPress={onClose}>
              <MaterialIcons name="close" size={24} color={Colors.paperWhite} />
            </TouchableOpacity>
          </View>
          <View style={styles.emptyState}>
            <MaterialIcons name="analytics" size={64} color={Colors.lightSlate} />
            <Text style={styles.emptyStateText}>
              Nenhum projeto ativo.{'\n'}Crie um plano de 12 semanas para ver as análises.
            </Text>
          </View>
        </View>
      </Modal>
    );
  }

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <Text style={styles.headerTitle}>Status do Projeto</Text>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={Colors.paperWhite} />
          </TouchableOpacity>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 24 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Weekly Score Card - The Pulse */}
          <View style={[styles.pulseCard, Shadows.md]}>
            <View style={styles.pulseHeader}>
              <Text style={styles.pulseLabel}>Execução da Semana {currentWeek}</Text>
              <View style={[styles.pulseBadge, { backgroundColor: scoreLabel.color + '20' }]}>
                <Text style={styles.pulseBadgeEmoji}>{scoreLabel.emoji}</Text>
                <Text style={[styles.pulseBadgeText, { color: scoreLabel.color }]}>
                  {scoreLabel.text}
                </Text>
              </View>
            </View>
            <View style={styles.pulseScoreContainer}>
              <Text style={styles.pulseScore}>{weeklyScore.percentage}%</Text>
              <Text style={styles.pulseDetail}>
                {weeklyScore.completed} de {weeklyScore.total} tarefas concluídas
              </Text>
            </View>
            {/* Score Progress Ring Visual */}
            <View style={styles.pulseProgressContainer}>
              <View style={styles.pulseProgressBackground}>
                <View
                  style={[
                    styles.pulseProgressFill,
                    {
                      width: `${weeklyScore.percentage}%`,
                      backgroundColor: scoreLabel.color,
                    },
                  ]}
                />
              </View>
            </View>
          </View>

          {/* Overall Progress */}
          <View style={[styles.overallCard, Shadows.sm]}>
            <View style={styles.overallHeader}>
              <MaterialIcons name="trending-up" size={20} color={Colors.goldenAmber} />
              <Text style={styles.overallLabel}>Progresso Geral do Trimestre</Text>
            </View>
            <Text style={styles.overallPercentage}>{overallProgress}%</Text>
            <View style={styles.overallProgressBar}>
              <View
                style={[styles.overallProgressFill, { width: `${overallProgress}%` }]}
              />
            </View>
          </View>

          {/* Burn-up Chart */}
          <View style={[styles.chartCard, Shadows.sm]}>
            <Text style={styles.chartTitle}>Trajetória de 12 Semanas</Text>
            <Text style={styles.chartSubtitle}>Planejado vs Realizado (acumulado)</Text>

            {/* Chart Legend */}
            <View style={styles.chartLegend}>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.lightSlate }]} />
                <Text style={styles.legendText}>Planejado</Text>
              </View>
              <View style={styles.legendItem}>
                <View style={[styles.legendDot, { backgroundColor: Colors.sageGreen }]} />
                <Text style={styles.legendText}>Realizado</Text>
              </View>
            </View>

            {/* Chart Container */}
            <View style={styles.chartContainer}>
              {/* Y-axis labels */}
              <View style={styles.yAxis}>
                <Text style={styles.yAxisLabel}>{maxChartValue}</Text>
                <Text style={styles.yAxisLabel}>{Math.round(maxChartValue / 2)}</Text>
                <Text style={styles.yAxisLabel}>0</Text>
              </View>

              {/* Chart Bars */}
              <View style={styles.barsContainer}>
                {burnUpData.map((weekData) => {
                  const plannedHeight = (weekData.plannedCumulative / maxChartValue) * 100;
                  const actualHeight = (weekData.actualCumulative / maxChartValue) * 100;
                  const isCurrentWeek = weekData.weekNumber === currentWeek;
                  const isFutureWeek = weekData.weekNumber > currentWeek;

                  return (
                    <View key={weekData.weekNumber} style={styles.barGroup}>
                      <View style={styles.barWrapper}>
                        {/* Planned Bar */}
                        <View
                          style={[
                            styles.bar,
                            styles.plannedBar,
                            { height: `${plannedHeight}%` },
                            isFutureWeek && styles.futureBar,
                          ]}
                        />
                        {/* Actual Bar */}
                        {!isFutureWeek && (
                          <View
                            style={[
                              styles.bar,
                              styles.actualBar,
                              { height: `${actualHeight}%` },
                            ]}
                          />
                        )}
                      </View>
                      {/* Week label */}
                      <Text
                        style={[
                          styles.barLabel,
                          isCurrentWeek && styles.barLabelCurrent,
                        ]}
                      >
                        {weekData.weekNumber}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Chart Status */}
            <View style={styles.chartStatus}>
              {burnUpData[currentWeek - 1] && (
                <Text style={styles.chartStatusText}>
                  {burnUpData[currentWeek - 1].actualCumulative >= burnUpData[currentWeek - 1].plannedCumulative
                    ? '✅ Você está no ritmo ou à frente!'
                    : '⚠️ Você está atrás do planejado'}
                </Text>
              )}
            </View>
          </View>

          {/* Performance Evolution (Trend Chart) */}
          <View style={[styles.trendCard, Shadows.sm]}>
            <Text style={styles.trendTitle}>Evolução da Performance</Text>
            <Text style={styles.trendSubtitle}>Score semanal ao longo do trimestre</Text>

            {/* Trend Legend */}
            <View style={styles.trendLegend}>
              <View style={styles.trendLegendItem}>
                <View style={[styles.trendLegendDot, { backgroundColor: Colors.sageGreen }]} />
                <Text style={styles.trendLegendText}>≥80%</Text>
              </View>
              <View style={styles.trendLegendItem}>
                <View style={[styles.trendLegendDot, { backgroundColor: Colors.goldenAmber }]} />
                <Text style={styles.trendLegendText}>≥50%</Text>
              </View>
              <View style={styles.trendLegendItem}>
                <View style={[styles.trendLegendDot, { backgroundColor: Colors.error }]} />
                <Text style={styles.trendLegendText}>&lt;50%</Text>
              </View>
            </View>

            {/* Trend Chart Container */}
            <View style={styles.trendChartContainer}>
              {/* Y-axis labels */}
              <View style={styles.trendYAxis}>
                <Text style={styles.trendYAxisLabel}>100%</Text>
                <Text style={styles.trendYAxisLabel}>50%</Text>
                <Text style={styles.trendYAxisLabel}>0%</Text>
              </View>

              {/* Trend Bars */}
              <View style={styles.trendBarsContainer}>
                {/* 50% threshold line */}
                <View style={styles.trendThresholdLine} />

                {historicalPerformance.map((weekData) => {
                  const isCurrentWeek = weekData.weekNumber === currentWeek;
                  const isFutureWeek = weekData.weekNumber > currentWeek;
                  const hasTasks = weekData.total > 0;
                  const barHeight = hasTasks && !isFutureWeek ? weekData.percentage : 0;
                  const barColor = isFutureWeek
                    ? '#E2E8F0'
                    : hasTasks
                      ? getPerformanceColor(weekData.percentage)
                      : '#E2E8F0';

                  return (
                    <View key={weekData.weekNumber} style={styles.trendBarGroup}>
                      <View style={styles.trendBarWrapper}>
                        {/* Performance Bar */}
                        <View
                          style={[
                            styles.trendBar,
                            {
                              height: isFutureWeek ? '100%' : `${barHeight}%`,
                              backgroundColor: barColor,
                              opacity: isFutureWeek ? 0.3 : 1,
                            },
                            isCurrentWeek && styles.trendBarCurrent,
                          ]}
                        />
                        {/* Score label on bar */}
                        {!isFutureWeek && hasTasks && weekData.percentage > 0 && (
                          <Text style={[
                            styles.trendBarScore,
                            { bottom: Math.max((barHeight / 100) * 120 - 12, 4) },
                          ]}>
                            {weekData.percentage}
                          </Text>
                        )}
                      </View>
                      {/* Week label */}
                      <Text
                        style={[
                          styles.trendBarLabel,
                          isCurrentWeek && styles.trendBarLabelCurrent,
                        ]}
                      >
                        {weekData.weekNumber}
                      </Text>
                    </View>
                  );
                })}
              </View>
            </View>

            {/* Consistency Insight */}
            <View style={styles.trendInsight}>
              {highPerformanceStreak > 0 ? (
                <>
                  <Text style={styles.trendInsightEmoji}>🔥</Text>
                  <Text style={styles.trendInsightText}>
                    Você manteve a alta performance por{' '}
                    <Text style={styles.trendInsightHighlight}>
                      {highPerformanceStreak} semana{highPerformanceStreak > 1 ? 's' : ''} seguida{highPerformanceStreak > 1 ? 's' : ''}
                    </Text>
                    !
                  </Text>
                </>
              ) : (
                <>
                  <Text style={styles.trendInsightEmoji}>💪</Text>
                  <Text style={styles.trendInsightText}>
                    Mantenha o foco para construir sua sequência de alta performance!
                  </Text>
                </>
              )}
            </View>
          </View>

          {/* Pillar Performance Rank */}
          <View style={[styles.rankCard, Shadows.sm]}>
            <Text style={styles.rankTitle}>Ranking de Pilares</Text>
            <Text style={styles.rankSubtitle}>Ordenado por taxa de conclusão</Text>

            {pillarPerformance.map((pillar, index) => (
              <View key={pillar.pillarId} style={styles.rankItem}>
                <View style={styles.rankPosition}>
                  <Text style={[
                    styles.rankPositionText,
                    index === 0 && styles.rankPositionFirst,
                  ]}>
                    {index === 0 ? '🥇' : index === 1 ? '🥈' : index === 2 ? '🥉' : `${index + 1}º`}
                  </Text>
                </View>
                <View style={styles.rankInfo}>
                  <View style={styles.rankHeader}>
                    <View style={[styles.rankDot, { backgroundColor: pillar.color }]} />
                    <Text style={styles.rankName}>{pillar.name}</Text>
                    <Text style={styles.rankPercentage}>{pillar.percentage}%</Text>
                  </View>
                  <View style={styles.rankProgressBar}>
                    <View
                      style={[
                        styles.rankProgressFill,
                        { width: `${pillar.percentage}%`, backgroundColor: pillar.color },
                      ]}
                    />
                  </View>
                  <Text style={styles.rankTasks}>
                    {pillar.completedTasks}/{pillar.totalTasks} tarefas
                  </Text>
                </View>
              </View>
            ))}
          </View>

          {/* Week Info Footer */}
          <View style={styles.weekInfoFooter}>
            <MaterialIcons name="info-outline" size={16} color={Colors.lightSlate} />
            <Text style={styles.weekInfoText}>
              Semana {currentWeek} de 12 • {12 - currentWeek} semanas restantes
            </Text>
          </View>
        </ScrollView>
      </View>
    </Modal>
  );
}

const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CHART_HEIGHT = 180;

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.lg,
  },
  headerTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    fontStyle: 'italic',
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.paperWhite,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  scrollContent: {
    padding: Spacing.base,
  },
  emptyState: {
    flex: 1,
    backgroundColor: Colors.paperWhite,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.xl,
  },
  emptyStateText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.lg,
    lineHeight: 24,
  },

  // Pulse Card (Weekly Score)
  pulseCard: {
    backgroundColor: Colors.deepNavy,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.md,
  },
  pulseHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  pulseLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.lightSlate,
  },
  pulseBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    gap: Spacing.xs,
  },
  pulseBadgeEmoji: {
    fontSize: 14,
  },
  pulseBadgeText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.semibold,
  },
  pulseScoreContainer: {
    alignItems: 'center',
    marginBottom: Spacing.md,
  },
  pulseScore: {
    fontFamily: Typography.heading,
    fontSize: 64,
    fontWeight: Typography.weights.bold,
    color: Colors.goldenAmber,
  },
  pulseDetail: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.lightSlate,
    marginTop: Spacing.xs,
  },
  pulseProgressContainer: {
    marginTop: Spacing.sm,
  },
  pulseProgressBackground: {
    height: 8,
    backgroundColor: 'rgba(255,255,255,0.1)',
    borderRadius: 4,
    overflow: 'hidden',
  },
  pulseProgressFill: {
    height: '100%',
    borderRadius: 4,
  },

  // Overall Card
  overallCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  overallHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.sm,
  },
  overallLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },
  overallPercentage: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  overallProgressBar: {
    height: 6,
    backgroundColor: '#E2E8F0',
    borderRadius: 3,
    marginTop: Spacing.sm,
    overflow: 'hidden',
  },
  overallProgressFill: {
    height: '100%',
    backgroundColor: Colors.goldenAmber,
    borderRadius: 3,
  },

  // Chart Card
  chartCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  chartTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  chartSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  chartLegend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  legendText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
  },
  chartContainer: {
    flexDirection: 'row',
    height: CHART_HEIGHT,
    marginBottom: Spacing.sm,
  },
  yAxis: {
    width: 30,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
    paddingBottom: 20,
  },
  yAxisLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
  },
  barsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: Spacing.xs,
    paddingBottom: 20,
  },
  barGroup: {
    flex: 1,
    alignItems: 'center',
    maxWidth: (SCREEN_WIDTH - 100) / 12,
  },
  barWrapper: {
    flex: 1,
    width: '100%',
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'flex-end',
    gap: 2,
  },
  bar: {
    width: 8,
    borderRadius: 4,
    minHeight: 4,
  },
  plannedBar: {
    backgroundColor: Colors.lightSlate,
  },
  actualBar: {
    backgroundColor: Colors.sageGreen,
  },
  futureBar: {
    opacity: 0.3,
  },
  barLabel: {
    fontFamily: Typography.body,
    fontSize: 9,
    color: Colors.lightSlate,
    marginTop: 4,
    position: 'absolute',
    bottom: 0,
  },
  barLabelCurrent: {
    color: Colors.goldenAmber,
    fontWeight: Typography.weights.bold,
  },
  chartStatus: {
    alignItems: 'center',
    paddingTop: Spacing.sm,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  chartStatusText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
  },

  // Rank Card
  rankCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  rankTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  rankSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  rankItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  rankPosition: {
    width: 36,
    alignItems: 'center',
  },
  rankPositionText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },
  rankPositionFirst: {
    fontSize: Typography.sizes.lg,
  },
  rankInfo: {
    flex: 1,
    marginLeft: Spacing.sm,
  },
  rankHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.xs,
  },
  rankDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  rankName: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.deepNavy,
  },
  rankPercentage: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  rankProgressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    overflow: 'hidden',
    marginBottom: Spacing.xs,
  },
  rankProgressFill: {
    height: '100%',
    borderRadius: 2,
  },
  rankTasks: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
  },

  // Week Info Footer
  weekInfoFooter: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.md,
  },
  weekInfoText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
  },

  // Trend Chart Card (Performance Evolution)
  trendCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  trendTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  trendSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    marginTop: 2,
    marginBottom: Spacing.md,
  },
  trendLegend: {
    flexDirection: 'row',
    gap: Spacing.lg,
    marginBottom: Spacing.md,
  },
  trendLegendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  trendLegendDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
  },
  trendLegendText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
  },
  trendChartContainer: {
    flexDirection: 'row',
    height: 160,
    marginBottom: Spacing.md,
  },
  trendYAxis: {
    width: 40,
    justifyContent: 'space-between',
    alignItems: 'flex-end',
    paddingRight: Spacing.xs,
    paddingBottom: 20,
  },
  trendYAxisLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
  },
  trendBarsContainer: {
    flex: 1,
    flexDirection: 'row',
    alignItems: 'flex-end',
    justifyContent: 'space-between',
    borderLeftWidth: 1,
    borderBottomWidth: 1,
    borderColor: '#E2E8F0',
    paddingLeft: Spacing.xs,
    paddingBottom: 20,
    position: 'relative',
  },
  trendThresholdLine: {
    position: 'absolute',
    left: 0,
    right: 0,
    bottom: 20 + (140 * 0.5), // 50% line
    height: 1,
    backgroundColor: Colors.goldenAmber,
    opacity: 0.4,
  },
  trendBarGroup: {
    flex: 1,
    alignItems: 'center',
    maxWidth: (SCREEN_WIDTH - 100) / 12,
  },
  trendBarWrapper: {
    flex: 1,
    width: '100%',
    alignItems: 'center',
    justifyContent: 'flex-end',
    position: 'relative',
  },
  trendBar: {
    width: 16,
    borderRadius: 4,
    minHeight: 4,
  },
  trendBarCurrent: {
    borderWidth: 2,
    borderColor: Colors.deepNavy,
  },
  trendBarScore: {
    position: 'absolute',
    fontFamily: Typography.body,
    fontSize: 8,
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    textAlign: 'center',
    width: 20,
  },
  trendBarLabel: {
    fontFamily: Typography.body,
    fontSize: 9,
    color: Colors.lightSlate,
    marginTop: 4,
    position: 'absolute',
    bottom: 0,
  },
  trendBarLabelCurrent: {
    color: Colors.goldenAmber,
    fontWeight: Typography.weights.bold,
  },
  trendInsight: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.deepNavy + '10',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  trendInsightEmoji: {
    fontSize: 24,
  },
  trendInsightText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    lineHeight: 20,
  },
  trendInsightHighlight: {
    fontWeight: Typography.weights.bold,
    color: Colors.sageGreen,
  },
});
