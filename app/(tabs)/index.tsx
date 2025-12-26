import React, { useState, useCallback, useMemo } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  Modal,
  Alert,
  Dimensions,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS, PillarId } from '@/constants/theme';
import {
  getWeeklyTasks,
  toggleTaskCompletion,
  addWeeklyTask,
  getOneThing,
  saveOneThing,
  getPillarGoals,
  getTwelveWeekPlans,
  getOverdueTasks,
  calculateCurrentWeek,
  updatePlanTaskStatus,
  WeeklyTask,
  OneThing,
  PillarGoal,
  TwelveWeekPlan,
  OverdueTask,
} from '@/services/storage';
import ProjectProgress from '@/components/ProjectProgress';
import AnalyticsModal from '@/components/AnalyticsModal';
import RetrospectiveModal from '@/components/RetrospectiveModal';
import GovernanceRituals from '@/components/GovernanceRituals';
import { checkAndScheduleMidWeekAlert } from '@/services/notifications';
import {
  trackTaskCompleted,
  trackOneThingSet,
  trackScreenView,
} from '@/services/analytics';

// Screen dimensions for carousel calculations
const { width: SCREEN_WIDTH } = Dimensions.get('window');
const CONTAINER_PADDING = Spacing.base; // padding on both sides
const CARD_PEEK = 24; // amount of next card visible
const CARD_GAP = 12; // gap between cards
const CARD_WIDTH = SCREEN_WIDTH - (CONTAINER_PADDING * 2) - CARD_PEEK;

// Helper to get current week info
function getCurrentWeekInfo() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  // Get week start (Monday) and end (Sunday)
  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now.setDate(diff));
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return {
    weekNumber,
    dateRange: `${formatDate(weekStart)} - ${formatDate(weekEnd)}`,
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  };
}

interface TaskItemProps {
  task: WeeklyTask;
  onToggle: (taskId: string) => void;
}

function TaskItem({ task, onToggle }: TaskItemProps) {
  return (
    <TouchableOpacity
      style={styles.taskItem}
      onPress={() => onToggle(task.id)}
      activeOpacity={0.7}
    >
      <View style={[styles.checkbox, task.completed && styles.checkboxChecked]}>
        {task.completed && (
          <MaterialIcons name="check" size={14} color={Colors.paperWhite} />
        )}
      </View>
      <View style={styles.taskContent}>
        <Text style={[styles.taskTitle, task.completed && styles.taskTitleCompleted]}>
          {task.title}
        </Text>
        {task.dueDate && (
          <Text style={styles.taskDue}>{task.dueDate}</Text>
        )}
      </View>
    </TouchableOpacity>
  );
}

interface TaskGroupProps {
  pillarId: PillarId;
  tasks: WeeklyTask[];
  onToggleTask: (taskId: string) => void;
  goal?: PillarGoal | null;
}

function TaskGroup({ pillarId, tasks, onToggleTask, goal: _goal }: TaskGroupProps) {
  const pillar = PILLARS.find(p => p.id === pillarId);
  const completedCount = tasks.filter(t => t.completed).length;
  const totalCount = tasks.length;
  const progress = totalCount > 0 ? (completedCount / totalCount) * 100 : 0;

  if (!pillar) return null;

  const getIconName = (): keyof typeof MaterialIcons.glyphMap => {
    switch (pillarId) {
      case 'business': return 'business-center';
      case 'physical': return 'fitness-center';
      case 'mental': return 'psychology';
      case 'spiritual': return 'self-improvement';
      case 'education': return 'school';
      case 'finance': return 'account-balance-wallet';
      case 'family': return 'family-restroom';
      default: return 'flag';
    }
  };

  return (
    <View style={[styles.taskGroup, Shadows.sm]}>
      <View style={styles.taskGroupHeader}>
        <View style={styles.taskGroupLeft}>
          <MaterialIcons name={getIconName()} size={20} color={pillar.color} />
          <Text style={styles.taskGroupTitle}>{pillar.name}</Text>
        </View>
        <Text style={styles.taskGroupCount}>
          {completedCount}/{totalCount}
        </Text>
      </View>

      {tasks.map(task => (
        <TaskItem key={task.id} task={task} onToggle={onToggleTask} />
      ))}

      {/* Progress bar */}
      <View style={styles.progressBar}>
        <View
          style={[styles.progressFill, { width: `${progress}%`, backgroundColor: pillar.color }]}
        />
      </View>
    </View>
  );
}

export default function DashboardScreen() {
  const insets = useSafeAreaInsets();
  const [tasks, setTasks] = useState<WeeklyTask[]>([]);
  const [oneThing, setOneThing] = useState<OneThing | null>(null);
  const [goals, setGoals] = useState<Record<string, PillarGoal | null>>({});
  const [plans, setPlans] = useState<TwelveWeekPlan[]>([]);
  const [showAddTask, setShowAddTask] = useState(false);
  const [showSetOneThing, setShowSetOneThing] = useState(false);
  const [showAnalytics, setShowAnalytics] = useState(false);
  const [showRetrospective, setShowRetrospective] = useState(false);
  const [overdueTasks, setOverdueTasks] = useState<OverdueTask[]>([]);
  const [newTaskTitle, setNewTaskTitle] = useState('');
  const [newTaskPillar, setNewTaskPillar] = useState<PillarId>('business');
  const [newOneThingTitle, setNewOneThingTitle] = useState('');

  const weekInfo = getCurrentWeekInfo();

  // Use useFocusEffect to reload data every time the tab is focused
  // This ensures the dashboard shows the latest synced tasks from the 12-week plans
  useFocusEffect(
    useCallback(() => {
      trackScreenView('dashboard');
      loadData();
    }, [])
  );

  const loadData = async () => {
    const [loadedTasks, loadedOneThing, loadedGoals, loadedPlans, loadedOverdueTasks] = await Promise.all([
      getWeeklyTasks(),
      getOneThing(),
      getPillarGoals(),
      getTwelveWeekPlans(),
      getOverdueTasks(),
    ]);
    setTasks(loadedTasks);
    setOneThing(loadedOneThing);
    setGoals(loadedGoals);
    setOverdueTasks(loadedOverdueTasks);

    // Filter for active/approved plans with weeks
    const activePlans = Object.values(loadedPlans)
      .filter((plan): plan is TwelveWeekPlan =>
        plan !== null &&
        plan !== undefined &&
        plan.isApproved !== false && // true or undefined (backward compat)
        plan.weeks &&
        plan.weeks.length > 0
      );
    setPlans(activePlans);

    // Check and schedule mid-week alert based on overdue tasks
    checkAndScheduleMidWeekAlert();
  };

  // Calculate current week for score calculation
  const currentWeekForScore = useMemo(() => {
    if (plans.length === 0) return 1;
    const earliestStart = plans.reduce((earliest, plan) => {
      const planStart = new Date(plan.startDate);
      return planStart < earliest ? planStart : earliest;
    }, new Date(plans[0].startDate));
    return calculateCurrentWeek(earliestStart.toISOString());
  }, [plans]);

  // Calculate Weekly Score (percentage of current week tasks completed)
  const weeklyScore = useMemo(() => {
    if (plans.length === 0) return { percentage: 0, completed: 0, total: 0 };

    let totalCurrentWeekTasks = 0;
    let completedCurrentWeekTasks = 0;

    plans.forEach(plan => {
      const weekPlan = plan.weeks.find(w => w.weekNumber === currentWeekForScore);
      if (weekPlan) {
        totalCurrentWeekTasks += weekPlan.tasks.length;
        completedCurrentWeekTasks += weekPlan.tasks.filter(t => t.completed).length;
      }
    });

    const percentage = totalCurrentWeekTasks > 0
      ? Math.round((completedCurrentWeekTasks / totalCurrentWeekTasks) * 100)
      : 0;

    return { percentage, completed: completedCurrentWeekTasks, total: totalCurrentWeekTasks };
  }, [plans, currentWeekForScore]);

  // Get score color based on percentage
  const getScoreColor = (percentage: number): string => {
    if (percentage >= 80) return Colors.sageGreen;
    if (percentage >= 50) return Colors.goldenAmber;
    return Colors.slate;
  };

  const handleToggleTask = async (taskId: string) => {
    // Find the task to check if it's being completed (not uncompleted)
    const taskBeforeToggle = tasks.find(t => t.id === taskId);
    const updatedTasks = await toggleTaskCompletion(taskId);
    setTasks(updatedTasks);

    // Determine the new status (opposite of before)
    const newCompletedStatus = taskBeforeToggle ? !taskBeforeToggle.completed : true;

    // REVERSE SYNC: Update the task status in the Twelve Week Plan
    // This ensures Analytics and Weekly Score are calculated correctly
    await updatePlanTaskStatus(taskId, newCompletedStatus);

    // Reload all data to recalculate weeklyScore and activePlans immediately
    await loadData();

    // Track only when completing a task (not uncompleting)
    if (taskBeforeToggle && !taskBeforeToggle.completed) {
      const pillar = PILLARS.find(p => p.id === taskBeforeToggle.pillarId);
      trackTaskCompleted(pillar?.name || taskBeforeToggle.pillarId, weekInfo.weekNumber);
    }
  };

  const handleAddTask = async () => {
    if (!newTaskTitle.trim()) {
      Alert.alert('Atenção', 'Digite o título da tarefa.');
      return;
    }

    const newTask: WeeklyTask = {
      id: Date.now().toString(),
      pillarId: newTaskPillar,
      title: newTaskTitle.trim(),
      completed: false,
      createdAt: new Date().toISOString(),
    };

    await addWeeklyTask(newTask);
    setTasks(prev => [...prev, newTask]);
    setNewTaskTitle('');
    setShowAddTask(false);
  };

  const handleSetOneThing = async () => {
    if (!newOneThingTitle.trim()) {
      Alert.alert('Atenção', 'Digite sua Única Coisa.');
      return;
    }

    const newOneThing: OneThing = {
      id: Date.now().toString(),
      title: newOneThingTitle.trim(),
      weekNumber: weekInfo.weekNumber,
      startDate: weekInfo.startDate,
      endDate: weekInfo.endDate,
      createdAt: new Date().toISOString(),
    };

    await saveOneThing(newOneThing);
    setOneThing(newOneThing);
    setNewOneThingTitle('');
    setShowSetOneThing(false);

    // Track "One Thing" set event (week number only, not content)
    trackOneThingSet(weekInfo.weekNumber);
  };

  // Group tasks by pillar
  const tasksByPillar = PILLARS.reduce((acc, pillar) => {
    const pillarTasks = tasks.filter(t => t.pillarId === pillar.id);
    if (pillarTasks.length > 0) {
      acc[pillar.id] = pillarTasks;
    }
    return acc;
  }, {} as Record<PillarId, WeeklyTask[]>);

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Execute sua Visão</Text>
          <Text style={styles.subtitle}>Semana {weekInfo.weekNumber}: {weekInfo.dateRange}</Text>
        </View>
        <View style={styles.headerRight}>
          {/* Weekly Score Widget */}
          {plans.length > 0 && (
            <TouchableOpacity
              style={[
                styles.scoreWidget,
                { backgroundColor: getScoreColor(weeklyScore.percentage) + '20' },
              ]}
              onPress={() => setShowAnalytics(true)}
              activeOpacity={0.7}
            >
              <Text style={[styles.scorePercentage, { color: getScoreColor(weeklyScore.percentage) }]}>
                {weeklyScore.percentage}%
              </Text>
              <Text style={styles.scoreLabel}>Score Semanal</Text>
            </TouchableOpacity>
          )}
          {/* Relatório Button */}
          <TouchableOpacity
            style={styles.analyticsButton}
            onPress={() => setShowAnalytics(true)}
          >
            <MaterialIcons name="insights" size={22} color={Colors.goldenAmber} />
          </TouchableOpacity>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* Overdue Tasks Alert */}
        {overdueTasks.length > 0 && (
          <TouchableOpacity
            style={[styles.overdueAlert, Shadows.sm]}
            onPress={() => setShowRetrospective(true)}
            activeOpacity={0.8}
          >
            <View style={styles.overdueAlertIcon}>
              <MaterialIcons name="history" size={24} color={Colors.error} />
            </View>
            <View style={styles.overdueAlertContent}>
              <Text style={styles.overdueAlertTitle}>
                Tarefas Pendentes
              </Text>
              <Text style={styles.overdueAlertText}>
                Você tem {overdueTasks.length} tarefa{overdueTasks.length > 1 ? 's' : ''} de semanas anteriores
              </Text>
            </View>
            <View style={styles.overdueAlertAction}>
              <Text style={styles.overdueAlertActionText}>Resolver</Text>
              <MaterialIcons name="chevron-right" size={20} color={Colors.error} />
            </View>
          </TouchableOpacity>
        )}

        {/* One Thing Card */}
        <TouchableOpacity
          style={[styles.oneThingCard, Shadows.md]}
          onPress={() => setShowSetOneThing(true)}
          activeOpacity={0.9}
        >
          <Text style={styles.oneThingLabel}>
            Sua <Text style={styles.oneThingHighlight}>ÚNICA COISA</Text> esta semana:
          </Text>
          {oneThing ? (
            <Text style={styles.oneThingTitle}>{oneThing.title}</Text>
          ) : (
            <Text style={styles.oneThingPlaceholder}>Toque para definir sua Única Coisa</Text>
          )}
        </TouchableOpacity>

        {/* Project Status Section - Horizontal Carousel */}
        {plans.length > 0 && (
          <View style={styles.projectStatusSection}>
            <Text style={styles.projectStatusTitle}>Status dos Projetos</Text>
            <ScrollView
              horizontal
              showsHorizontalScrollIndicator={false}
              snapToInterval={CARD_WIDTH + CARD_GAP}
              snapToAlignment="start"
              decelerationRate="fast"
              contentContainerStyle={styles.carouselContentContainer}
              style={styles.carouselScrollView}
            >
              {plans.map((plan, index) => (
                <View
                  key={plan.pillarId}
                  style={[
                    styles.carouselCard,
                    { width: CARD_WIDTH },
                    index === plans.length - 1 && styles.carouselCardLast,
                  ]}
                >
                  <ProjectProgress plan={plan} showPillarName />
                </View>
              ))}
            </ScrollView>
            {/* Carousel indicator dots */}
            {plans.length > 1 && (
              <View style={styles.carouselIndicators}>
                {plans.map((plan, index) => (
                  <View
                    key={plan.pillarId}
                    style={[
                      styles.carouselDot,
                      index === 0 && styles.carouselDotActive,
                    ]}
                  />
                ))}
              </View>
            )}
          </View>
        )}

        {/* Task Groups */}
        <View style={styles.tasksSection}>
          <View style={styles.tasksSectionHeader}>
            <Text style={styles.tasksSectionTitle}>Tarefas da Semana</Text>
            <TouchableOpacity
              style={styles.addTaskButton}
              onPress={() => setShowAddTask(true)}
            >
              <MaterialIcons name="add" size={24} color={Colors.goldenAmber} />
            </TouchableOpacity>
          </View>

          {Object.entries(tasksByPillar).length > 0 ? (
            Object.entries(tasksByPillar).map(([pillarId, pillarTasks]) => (
              <TaskGroup
                key={pillarId}
                pillarId={pillarId as PillarId}
                tasks={pillarTasks}
                onToggleTask={handleToggleTask}
                goal={goals[pillarId]}
              />
            ))
          ) : (
            <View style={styles.emptyState}>
              <MaterialIcons name="assignment" size={48} color={Colors.lightSlate} />
              <Text style={styles.emptyStateText}>
                Nenhuma tarefa ainda.{'\n'}Adicione tarefas para começar!
              </Text>
            </View>
          )}
        </View>

        {/* Governance Rituals */}
        <GovernanceRituals />
      </ScrollView>

      {/* Add Task Modal */}
      <Modal
        visible={showAddTask}
        transparent
        animationType="fade"
        onRequestClose={() => setShowAddTask(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Shadows.lg]}>
            <Text style={styles.modalTitle}>Nova Tarefa</Text>

            <TextInput
              style={styles.modalInput}
              placeholder="Título da tarefa"
              placeholderTextColor={Colors.lightSlate}
              value={newTaskTitle}
              onChangeText={setNewTaskTitle}
            />

            <Text style={styles.modalLabel}>Pilar:</Text>
            <ScrollView horizontal showsHorizontalScrollIndicator={false} style={styles.pillarSelector}>
              {PILLARS.map(pillar => (
                <TouchableOpacity
                  key={pillar.id}
                  style={[
                    styles.pillarOption,
                    newTaskPillar === pillar.id && { backgroundColor: pillar.color },
                  ]}
                  onPress={() => setNewTaskPillar(pillar.id)}
                >
                  <Text
                    style={[
                      styles.pillarOptionText,
                      newTaskPillar === pillar.id && { color: Colors.paperWhite },
                    ]}
                  >
                    {pillar.name}
                  </Text>
                </TouchableOpacity>
              ))}
            </ScrollView>

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowAddTask(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleAddTask}>
                <Text style={styles.modalConfirmText}>Adicionar</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Set One Thing Modal */}
      <Modal
        visible={showSetOneThing}
        transparent
        animationType="fade"
        onRequestClose={() => setShowSetOneThing(false)}
      >
        <View style={styles.modalOverlay}>
          <View style={[styles.modalContent, Shadows.lg]}>
            <Text style={styles.modalTitle}>Sua Única Coisa</Text>
            <Text style={styles.modalDescription}>
              Qual é a ÚNICA coisa que, se você fizer esta semana, tornará tudo mais fácil ou desnecessário?
            </Text>

            <TextInput
              style={[styles.modalInput, styles.oneThingInput]}
              placeholder="Ex: Finalizar protótipo da interface"
              placeholderTextColor={Colors.lightSlate}
              value={newOneThingTitle}
              onChangeText={setNewOneThingTitle}
              multiline
            />

            <View style={styles.modalButtons}>
              <TouchableOpacity
                style={styles.modalCancelButton}
                onPress={() => setShowSetOneThing(false)}
              >
                <Text style={styles.modalCancelText}>Cancelar</Text>
              </TouchableOpacity>
              <TouchableOpacity style={styles.modalConfirmButton} onPress={handleSetOneThing}>
                <Text style={styles.modalConfirmText}>Definir</Text>
              </TouchableOpacity>
            </View>
          </View>
        </View>
      </Modal>

      {/* Analytics Modal */}
      <AnalyticsModal
        visible={showAnalytics}
        onClose={() => setShowAnalytics(false)}
        plans={plans}
      />

      {/* Retrospective Modal */}
      <RetrospectiveModal
        visible={showRetrospective}
        onClose={() => setShowRetrospective(false)}
        overdueTasks={overdueTasks}
        onTasksUpdated={loadData}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  header: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  headerRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  scoreWidget: {
    alignItems: 'center',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.md,
    minWidth: 70,
  },
  scorePercentage: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
  },
  scoreLabel: {
    fontFamily: Typography.body,
    fontSize: 9,
    color: Colors.lightSlate,
    marginTop: 1,
  },
  analyticsButton: {
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: 'rgba(255, 193, 7, 0.15)',
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.lightSlate,
    marginTop: Spacing.xs,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.paperWhite,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  scrollContent: {
    padding: Spacing.base,
    paddingBottom: Spacing['3xl'],
  },
  oneThingCard: {
    backgroundColor: Colors.goldenAmber,
    borderRadius: BorderRadius.lg,
    padding: Spacing.lg,
    marginBottom: Spacing.xl,
  },
  oneThingLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    marginBottom: Spacing.sm,
  },
  oneThingHighlight: {
    fontWeight: Typography.weights.bold,
  },
  oneThingTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    fontStyle: 'italic',
  },
  oneThingPlaceholder: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    color: Colors.deepNavy + '80',
    fontStyle: 'italic',
  },
  projectStatusSection: {
    marginBottom: Spacing.xl,
    marginHorizontal: -CONTAINER_PADDING, // Extend to edges for carousel effect
  },
  projectStatusTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    marginBottom: Spacing.md,
    paddingHorizontal: CONTAINER_PADDING, // Add padding back for title
  },
  carouselScrollView: {
    marginLeft: 0,
  },
  carouselContentContainer: {
    paddingLeft: CONTAINER_PADDING,
    paddingRight: CARD_PEEK, // Extra padding for the peeking effect
  },
  carouselCard: {
    marginRight: CARD_GAP,
  },
  carouselCardLast: {
    marginRight: CONTAINER_PADDING, // Extra margin for last card
  },
  carouselIndicators: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  carouselDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    backgroundColor: Colors.lightSlate,
  },
  carouselDotActive: {
    backgroundColor: Colors.deepNavy,
    width: 16,
  },
  tasksSection: {
    marginBottom: Spacing.xl,
  },
  tasksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  tasksSectionTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  addTaskButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.goldenAmber + '20',
    alignItems: 'center',
    justifyContent: 'center',
  },
  taskGroup: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.base,
    marginBottom: Spacing.md,
  },
  taskGroupHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  taskGroupLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  taskGroupTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  taskGroupCount: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
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
    marginTop: 2,
  },
  checkboxChecked: {
    backgroundColor: Colors.sageGreen,
    borderColor: Colors.sageGreen,
  },
  taskContent: {
    flex: 1,
  },
  taskTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
  },
  taskTitleCompleted: {
    textDecorationLine: 'line-through',
    color: Colors.lightSlate,
  },
  taskDue: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    marginTop: 2,
  },
  progressBar: {
    height: 4,
    backgroundColor: '#E2E8F0',
    borderRadius: 2,
    marginTop: Spacing.md,
    overflow: 'hidden',
  },
  progressFill: {
    height: '100%',
    borderRadius: 2,
  },
  emptyState: {
    alignItems: 'center',
    paddingVertical: Spacing['2xl'],
  },
  emptyStateText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.md,
    lineHeight: 24,
  },
  // Modal Styles
  modalOverlay: {
    flex: 1,
    backgroundColor: 'rgba(0, 0, 0, 0.5)',
    justifyContent: 'center',
    alignItems: 'center',
    padding: Spacing.xl,
  },
  modalContent: {
    backgroundColor: Colors.paperWhite,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    width: '100%',
    maxWidth: 400,
  },
  modalTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    marginBottom: Spacing.md,
  },
  modalDescription: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginBottom: Spacing.lg,
    lineHeight: 20,
  },
  modalLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.slate,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  modalInput: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  oneThingInput: {
    minHeight: 80,
    textAlignVertical: 'top',
  },
  pillarSelector: {
    flexDirection: 'row',
    marginBottom: Spacing.lg,
  },
  pillarOption: {
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.sm,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.ivory,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  pillarOptionText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
  },
  modalButtons: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    gap: Spacing.md,
    marginTop: Spacing.lg,
  },
  modalCancelButton: {
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
  },
  modalCancelText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.slate,
  },
  modalConfirmButton: {
    backgroundColor: Colors.goldenAmber,
    paddingHorizontal: Spacing.lg,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.sm,
  },
  modalConfirmText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  // Overdue Alert Styles
  overdueAlert: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.error + '12',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.error,
  },
  overdueAlertIcon: {
    width: 44,
    height: 44,
    borderRadius: 22,
    backgroundColor: Colors.error + '18',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  overdueAlertContent: {
    flex: 1,
  },
  overdueAlertTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.error,
  },
  overdueAlertText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginTop: 2,
  },
  overdueAlertAction: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  overdueAlertActionText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.error,
  },
});
