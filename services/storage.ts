// AsyncStorage service for Doze
import AsyncStorage from '@react-native-async-storage/async-storage';
import { PillarId } from '@/constants/theme';
import { scheduleMorningFocus } from './notifications';

// Storage Keys
const STORAGE_KEYS = {
  PILLAR_GOALS: 'doze_pillar_goals',
  WEEKLY_TASKS: 'doze_weekly_tasks',
  ONE_THING: 'doze_one_thing',
  CHAT_HISTORY: 'doze_chat_history',
  TWELVE_WEEK_PLANS: 'doze_twelve_week_plans',
  ONBOARDING_COMPLETED: 'doze_onboarding_completed_v2',
  ONBOARDING_CHAT: 'doze_onboarding_chat',
  GOVERNANCE_RITUALS: 'doze_governance_rituals',
} as const;

// Types
export interface PillarGoal {
  pillarId: PillarId;
  desire: string;
  okr: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface WeeklyTask {
  id: string;
  pillarId: PillarId;
  title: string;
  completed: boolean;
  dueDate?: string;
  createdAt: string;
}

export interface OneThing {
  id: string;
  title: string;
  weekNumber: number;
  startDate: string;
  endDate: string;
  createdAt: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'assistant';
  content: string;
  timestamp: string;
}

export interface TwelveWeekPlan {
  pillarId: PillarId;
  objective: string;
  keyResults: string[];
  weeks: WeekPlan[];
  startDate: string;
  createdAt: string;
  isApproved: boolean;
}

export interface WeekPlan {
  weekNumber: number;
  tasks: WeeklyTask[];
  startDate: string;
  endDate: string;
}

// Storage Functions

// Pillar Goals
export async function getPillarGoals(): Promise<Partial<Record<PillarId, PillarGoal | null>>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.PILLAR_GOALS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('Error getting pillar goals:', error);
    return {};
  }
}

export async function savePillarGoal(goal: PillarGoal): Promise<void> {
  try {
    const goals = await getPillarGoals();
    goals[goal.pillarId] = goal;
    await AsyncStorage.setItem(STORAGE_KEYS.PILLAR_GOALS, JSON.stringify(goals));
  } catch (error) {
    console.error('Error saving pillar goal:', error);
    throw error;
  }
}

// Weekly Tasks
export async function getWeeklyTasks(): Promise<WeeklyTask[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.WEEKLY_TASKS);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting weekly tasks:', error);
    return [];
  }
}

export async function saveWeeklyTasks(tasks: WeeklyTask[]): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_TASKS, JSON.stringify(tasks));
  } catch (error) {
    console.error('Error saving weekly tasks:', error);
    throw error;
  }
}

export async function toggleTaskCompletion(taskId: string): Promise<WeeklyTask[]> {
  try {
    const tasks = await getWeeklyTasks();
    const updatedTasks = tasks.map(task =>
      task.id === taskId ? { ...task, completed: !task.completed } : task
    );
    await saveWeeklyTasks(updatedTasks);
    return updatedTasks;
  } catch (error) {
    console.error('Error toggling task:', error);
    throw error;
  }
}

export async function addWeeklyTask(task: WeeklyTask): Promise<void> {
  try {
    const tasks = await getWeeklyTasks();
    tasks.push(task);
    await saveWeeklyTasks(tasks);
  } catch (error) {
    console.error('Error adding task:', error);
    throw error;
  }
}

// One Thing
export async function getOneThing(): Promise<OneThing | null> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ONE_THING);
    return data ? JSON.parse(data) : null;
  } catch (error) {
    console.error('Error getting one thing:', error);
    return null;
  }
}

export async function saveOneThing(oneThing: OneThing): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONE_THING, JSON.stringify(oneThing));

    // Schedule morning focus notification with the new One Thing title
    await scheduleMorningFocus(oneThing.title);
  } catch (error) {
    console.error('Error saving one thing:', error);
    throw error;
  }
}

// Chat History
export async function getChatHistory(): Promise<ChatMessage[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.CHAT_HISTORY);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting chat history:', error);
    return [];
  }
}

export async function saveChatMessage(message: ChatMessage): Promise<void> {
  try {
    const history = await getChatHistory();
    history.push(message);
    await AsyncStorage.setItem(STORAGE_KEYS.CHAT_HISTORY, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving chat message:', error);
    throw error;
  }
}

export async function clearChatHistory(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.CHAT_HISTORY);
  } catch (error) {
    console.error('Error clearing chat history:', error);
    throw error;
  }
}

// 12 Week Plans
export async function getTwelveWeekPlans(): Promise<Partial<Record<PillarId, TwelveWeekPlan | null>>> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.TWELVE_WEEK_PLANS);
    return data ? JSON.parse(data) : {};
  } catch (error) {
    console.error('[Storage] Error getting 12 week plans:', error);
    return {};
  }
}

export async function saveTwelveWeekPlan(plan: TwelveWeekPlan): Promise<void> {
  try {
    // Validate plan before saving
    if (!plan || !plan.pillarId) {
      console.error('[Storage] saveTwelveWeekPlan: Invalid plan - missing pillarId');
      throw new Error('Invalid plan: missing pillarId');
    }

    const plans = await getTwelveWeekPlans();
    plans[plan.pillarId] = plan;

    const dataToSave = JSON.stringify(plans);
    await AsyncStorage.setItem(STORAGE_KEYS.TWELVE_WEEK_PLANS, dataToSave);

    // Verify save was successful
    const verifyData = await AsyncStorage.getItem(STORAGE_KEYS.TWELVE_WEEK_PLANS);
    if (verifyData) {
      const verifyPlans = JSON.parse(verifyData);
      const savedPlan = verifyPlans[plan.pillarId];
      if (!savedPlan || savedPlan.weeks?.length !== plan.weeks?.length) {
        console.error(`[Storage] saveTwelveWeekPlan: Verification FAILED for ${plan.pillarId}`);
      }
    }
  } catch (error) {
    console.error('[Storage] Error saving 12 week plan:', error);
    throw error;
  }
}

// Calculate current week (1-12) based on plan start date
export function calculateCurrentWeek(startDate: string): number {
  const start = new Date(startDate);
  const now = new Date();

  // Calculate difference in days
  const diffTime = now.getTime() - start.getTime();
  const diffDays = Math.floor(diffTime / (1000 * 60 * 60 * 24));

  // Calculate week number (1-indexed, capped at 12)
  const weekNumber = Math.floor(diffDays / 7) + 1;

  // Clamp to 1-12 range
  return Math.max(1, Math.min(12, weekNumber));
}

// Sync 12-week plan tasks to weekly tasks for the dashboard
// IMPORTANT: Only syncs tasks if plan.isApproved is true
export async function syncPlanToWeeklyTasks(pillarId: PillarId, plan: TwelveWeekPlan): Promise<void> {
  try {
    // Get existing weekly tasks
    const existingTasks = await getWeeklyTasks();

    // CRUCIAL: First, remove ALL existing weekly tasks for this pillar (cleanup)
    const otherPillarTasks = existingTasks.filter(t => t.pillarId !== pillarId);

    // Create a map of existing task IDs to their completed status (to preserve later)
    const existingTasksMap = new Map<string, boolean>();
    existingTasks
      .filter(t => t.pillarId === pillarId)
      .forEach(t => existingTasksMap.set(t.id, t.completed));

    // Check if plan is approved
    // Backward compatibility: if isApproved is undefined, treat as approved (for existing plans)
    const isApproved = plan.isApproved ?? true;
    if (!isApproved) {
      // Plan not approved - just save the cleaned-up list (no tasks for this pillar)
      await saveWeeklyTasks(otherPillarTasks);
      return;
    }

    // Plan IS approved - add current week's tasks to the dashboard

    // Calculate which week we're currently in
    const currentWeekNumber = calculateCurrentWeek(plan.startDate);

    // Find current week's tasks in the plan
    const currentWeekPlan = plan.weeks.find(w => w.weekNumber === currentWeekNumber);
    if (!currentWeekPlan) {
      // No week plan found, just save cleaned list
      await saveWeeklyTasks(otherPillarTasks);
      return;
    }

    // Convert plan tasks to weekly tasks, preserving completed status
    const syncedTasks: WeeklyTask[] = currentWeekPlan.tasks.map(planTask => ({
      id: planTask.id,
      pillarId: pillarId,
      title: planTask.title,
      // Preserve completed status if this task existed before, otherwise false
      completed: existingTasksMap.get(planTask.id) ?? planTask.completed ?? false,
      createdAt: planTask.createdAt,
    }));

    // Combine other pillar tasks with synced tasks
    const updatedTasks = [...otherPillarTasks, ...syncedTasks];

    // Save updated tasks
    await saveWeeklyTasks(updatedTasks);
  } catch (error) {
    console.error('Error syncing plan to weekly tasks:', error);
    throw error;
  }
}

// Sync all plans to weekly tasks (useful on app start)
export async function syncAllPlansToWeeklyTasks(): Promise<void> {
  try {
    const plans = await getTwelveWeekPlans();

    for (const pillarId of Object.keys(plans) as PillarId[]) {
      const plan = plans[pillarId];
      if (plan) {
        await syncPlanToWeeklyTasks(pillarId, plan);
      }
    }
  } catch (error) {
    console.error('Error syncing all plans:', error);
    throw error;
  }
}

// Helper to get all user data as context for AI
export async function getUserContext(): Promise<string> {
  try {
    const [goals, tasks, oneThing] = await Promise.all([
      getPillarGoals(),
      getWeeklyTasks(),
      getOneThing(),
    ]);

    const goalsText = Object.values(goals)
      .filter(g => g)
      .map(g => `- ${g?.pillarId}: ${g?.okr || g?.desire}`)
      .join('\n');

    const tasksText = tasks
      .map(t => `- [${t.completed ? 'x' : ' '}] ${t.title} (${t.pillarId})`)
      .join('\n');

    const oneThingText = oneThing ? `A Única Coisa desta semana: ${oneThing.title}` : '';

    return `
Metas do Usuário:
${goalsText || 'Nenhuma meta definida ainda.'}

${oneThingText}

Tarefas desta Semana:
${tasksText || 'Nenhuma tarefa definida ainda.'}
    `.trim();
  } catch (error) {
    console.error('Error getting user context:', error);
    return 'Erro ao carregar contexto do usuário.';
  }
}

// Comprehensive mentor context with all progress data
export interface MentorContextData {
  // Basic info
  calendarWeekNumber: number;

  // Plans & Progress
  activePlans: {
    pillarId: PillarId;
    pillarName: string;
    currentWeek: number;
    totalTasks: number;
    completedTasks: number;
    progressPercent: number;
    hasDelayedWeeks: boolean;
  }[];
  overallProgress: number;

  // Current Week Tasks
  currentWeekTasks: {
    total: number;
    completed: number;
    pending: number;
    completionRate: number;
  };

  // Overdue Tasks
  overdueTasks: {
    count: number;
    byPillar: { pillarId: PillarId; count: number }[];
  };

  // Governance Rituals
  rituals: {
    weeklyReview: boolean;
    weeklyPlanning: boolean;
    allDone: boolean;
  };

  // One Thing
  oneThing: string | null;

  // Goals
  goals: { pillarId: PillarId; okr: string | null }[];
}

const PILLAR_NAMES: Record<PillarId, string> = {
  business: 'Negócios',
  physical: 'Saúde Física',
  mental: 'Saúde Mental',
  spiritual: 'Saúde Espiritual',
  education: 'Educação',
  finance: 'Finanças',
  family: 'Família',
};

export async function getMentorContext(): Promise<MentorContextData> {
  const [plans, tasks, oneThing, goals, overdue, rituals] = await Promise.all([
    getTwelveWeekPlans(),
    getWeeklyTasks(),
    getOneThing(),
    getPillarGoals(),
    getOverdueTasks(),
    getGovernanceRituals(),
  ]);

  // Process active plans
  const activePlans = Object.entries(plans)
    .filter(([, plan]) => plan && plan.isApproved !== false && plan.weeks?.length > 0)
    .map(([pillarId, plan]) => {
      const p = plan!;
      const currentWeek = calculateCurrentWeek(p.startDate);
      const totalTasks = p.weeks.reduce((sum, w) => sum + w.tasks.length, 0);
      const completedTasks = p.weeks.reduce(
        (sum, w) => sum + w.tasks.filter(t => t.completed).length,
        0
      );
      const progressPercent = totalTasks > 0 ? Math.round((completedTasks / totalTasks) * 100) : 0;

      // Check for delayed weeks (past weeks with incomplete tasks)
      const hasDelayedWeeks = p.weeks.some(
        w => w.weekNumber < currentWeek && w.tasks.some(t => !t.completed)
      );

      return {
        pillarId: pillarId as PillarId,
        pillarName: PILLAR_NAMES[pillarId as PillarId],
        currentWeek,
        totalTasks,
        completedTasks,
        progressPercent,
        hasDelayedWeeks,
      };
    });

  // Calculate overall progress
  const totalAllTasks = activePlans.reduce((sum, p) => sum + p.totalTasks, 0);
  const completedAllTasks = activePlans.reduce((sum, p) => sum + p.completedTasks, 0);
  const overallProgress = totalAllTasks > 0 ? Math.round((completedAllTasks / totalAllTasks) * 100) : 0;

  // Current week tasks
  const currentWeekCompleted = tasks.filter(t => t.completed).length;
  const currentWeekTotal = tasks.length;

  // Overdue by pillar
  const overdueByPillar = overdue.reduce((acc, ot) => {
    const existing = acc.find(p => p.pillarId === ot.pillarId);
    if (existing) {
      existing.count++;
    } else {
      acc.push({ pillarId: ot.pillarId, count: 1 });
    }
    return acc;
  }, [] as { pillarId: PillarId; count: number }[]);

  return {
    calendarWeekNumber: getCalendarWeekNumber(),
    activePlans,
    overallProgress,
    currentWeekTasks: {
      total: currentWeekTotal,
      completed: currentWeekCompleted,
      pending: currentWeekTotal - currentWeekCompleted,
      completionRate: currentWeekTotal > 0 ? Math.round((currentWeekCompleted / currentWeekTotal) * 100) : 0,
    },
    overdueTasks: {
      count: overdue.length,
      byPillar: overdueByPillar,
    },
    rituals: {
      weeklyReview: rituals.weeklyReview,
      weeklyPlanning: rituals.weeklyPlanning,
      allDone: rituals.weeklyReview && rituals.weeklyPlanning,
    },
    oneThing: oneThing?.title || null,
    goals: Object.entries(goals)
      .filter(([, g]) => g)
      .map(([pillarId, g]) => ({
        pillarId: pillarId as PillarId,
        okr: g?.okr || null,
      })),
  };
}

// Generate a formatted context string for the AI
export async function getMentorContextString(): Promise<string> {
  try {
    const ctx = await getMentorContext();

    const plansText = ctx.activePlans.length > 0
      ? ctx.activePlans
          .map(p => `• ${p.pillarName}: Semana ${p.currentWeek}/12, ${p.progressPercent}% concluído${p.hasDelayedWeeks ? ' (tem atrasos)' : ''}`)
          .join('\n')
      : 'Nenhum plano ativo.';

    const overdueText = ctx.overdueTasks.count > 0
      ? `⚠️ ${ctx.overdueTasks.count} tarefa(s) atrasada(s): ${ctx.overdueTasks.byPillar.map(p => `${PILLAR_NAMES[p.pillarId]} (${p.count})`).join(', ')}`
      : '✅ Sem tarefas atrasadas';

    const ritualsText = ctx.rituals.allDone
      ? '✅ Rituais da semana concluídos'
      : `Rituais pendentes: ${!ctx.rituals.weeklyReview ? 'Revisão Semanal' : ''}${!ctx.rituals.weeklyReview && !ctx.rituals.weeklyPlanning ? ', ' : ''}${!ctx.rituals.weeklyPlanning ? 'Planejamento' : ''}`;

    return `
📊 CONTEXTO DO USUÁRIO (Semana ${ctx.calendarWeekNumber})

🎯 PLANOS DE 12 SEMANAS:
${plansText}
Progresso Geral: ${ctx.overallProgress}%

📋 TAREFAS DESTA SEMANA:
• Total: ${ctx.currentWeekTasks.total}
• Concluídas: ${ctx.currentWeekTasks.completed}
• Pendentes: ${ctx.currentWeekTasks.pending}
• Taxa de Conclusão: ${ctx.currentWeekTasks.completionRate}%

${overdueText}

🏁 RITUAIS DE GOVERNANÇA:
${ritualsText}

${ctx.oneThing ? `⭐ ÚNICA COISA: "${ctx.oneThing}"` : '📝 Única Coisa não definida'}
    `.trim();
  } catch (error) {
    console.error('Error getting mentor context string:', error);
    return 'Erro ao carregar contexto completo.';
  }
}

// Generate proactive insights based on data
export async function getMentorInsights(): Promise<{
  urgentIssues: string[];
  suggestions: string[];
  celebrations: string[];
}> {
  const ctx = await getMentorContext();
  const urgentIssues: string[] = [];
  const suggestions: string[] = [];
  const celebrations: string[] = [];

  // Check overdue tasks
  if (ctx.overdueTasks.count > 0) {
    urgentIssues.push(`Você tem ${ctx.overdueTasks.count} tarefa(s) atrasada(s) que precisam de atenção.`);
  }

  // Check governance rituals
  if (!ctx.rituals.allDone) {
    if (!ctx.rituals.weeklyReview) {
      suggestions.push('Ainda não fez a Revisão Semanal do Plano.');
    }
    if (!ctx.rituals.weeklyPlanning) {
      suggestions.push('O Planejamento da Próxima Semana ainda está pendente.');
    }
  } else {
    celebrations.push('Parabéns! Você completou todos os rituais de governança desta semana!');
  }

  // Check One Thing
  if (!ctx.oneThing) {
    suggestions.push('Defina sua Única Coisa para esta semana - é o fator mais importante para seu sucesso.');
  }

  // Check weekly completion rate
  if (ctx.currentWeekTasks.total > 0) {
    if (ctx.currentWeekTasks.completionRate >= 80) {
      celebrations.push(`Excelente! Você está com ${ctx.currentWeekTasks.completionRate}% de conclusão esta semana!`);
    } else if (ctx.currentWeekTasks.completionRate < 50 && ctx.currentWeekTasks.total > 2) {
      suggestions.push(`Sua taxa de conclusão esta semana está em ${ctx.currentWeekTasks.completionRate}%. Vamos revisar suas prioridades?`);
    }
  }

  // Check pillar progress
  for (const plan of ctx.activePlans) {
    const expectedProgress = Math.round((plan.currentWeek / 12) * 100);
    if (plan.progressPercent < expectedProgress - 20) {
      urgentIssues.push(`O pilar "${plan.pillarName}" está ${expectedProgress - plan.progressPercent}% atrás do esperado.`);
    } else if (plan.progressPercent >= expectedProgress + 10) {
      celebrations.push(`O pilar "${plan.pillarName}" está acima da meta! ${plan.progressPercent}% vs ${expectedProgress}% esperado.`);
    }
  }

  return { urgentIssues, suggestions, celebrations };
}

// Onboarding Status
export async function hasCompletedOnboarding(): Promise<boolean> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_COMPLETED);
    return data === 'true';
  } catch (error) {
    console.error('Error checking onboarding status:', error);
    return false;
  }
}

export async function setOnboardingCompleted(completed: boolean): Promise<void> {
  try {
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_COMPLETED, completed ? 'true' : 'false');
  } catch (error) {
    console.error('Error setting onboarding status:', error);
    throw error;
  }
}

// Onboarding Chat History (separate from main chat)
export async function getOnboardingChat(): Promise<ChatMessage[]> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.ONBOARDING_CHAT);
    return data ? JSON.parse(data) : [];
  } catch (error) {
    console.error('Error getting onboarding chat:', error);
    return [];
  }
}

export async function saveOnboardingChatMessage(message: ChatMessage): Promise<void> {
  try {
    const history = await getOnboardingChat();
    history.push(message);
    await AsyncStorage.setItem(STORAGE_KEYS.ONBOARDING_CHAT, JSON.stringify(history));
  } catch (error) {
    console.error('Error saving onboarding chat message:', error);
    throw error;
  }
}

export async function clearOnboardingChat(): Promise<void> {
  try {
    await AsyncStorage.removeItem(STORAGE_KEYS.ONBOARDING_CHAT);
  } catch (error) {
    console.error('Error clearing onboarding chat:', error);
    throw error;
  }
}

// Bulk Save Methods (for onboarding completion)
export async function bulkSavePillarGoals(goals: PillarGoal[]): Promise<void> {
  try {
    const existingGoals = await getPillarGoals();
    const updatedGoals = { ...existingGoals };

    for (const goal of goals) {
      updatedGoals[goal.pillarId] = goal;
    }

    await AsyncStorage.setItem(STORAGE_KEYS.PILLAR_GOALS, JSON.stringify(updatedGoals));
  } catch (error) {
    console.error('Error bulk saving pillar goals:', error);
    throw error;
  }
}

export async function bulkAddWeeklyTasks(newTasks: WeeklyTask[]): Promise<void> {
  try {
    const existingTasks = await getWeeklyTasks();
    const combinedTasks = [...existingTasks, ...newTasks];
    await AsyncStorage.setItem(STORAGE_KEYS.WEEKLY_TASKS, JSON.stringify(combinedTasks));
  } catch (error) {
    console.error('Error bulk adding weekly tasks:', error);
    throw error;
  }
}

// Generated Plan Data Structure (for AI output parsing)
export interface GeneratedPlanData {
  pillars: {
    id: PillarId;
    okr: string;
  }[];
  tasks: {
    title: string;
    pillarId: PillarId;
  }[];
  oneThing?: string;
}

// Save generated plan from onboarding
export async function saveGeneratedPlan(planData: GeneratedPlanData): Promise<void> {
  try {
    const now = new Date().toISOString();

    // Convert and save pillar goals
    const pillarGoals: PillarGoal[] = planData.pillars.map(p => ({
      pillarId: p.id,
      desire: '',
      okr: p.okr,
      createdAt: now,
      updatedAt: now,
    }));
    await bulkSavePillarGoals(pillarGoals);

    // Convert and save weekly tasks
    const weeklyTasks: WeeklyTask[] = planData.tasks.map((t, index) => ({
      id: `onboarding-task-${Date.now()}-${index}`,
      pillarId: t.pillarId,
      title: t.title,
      completed: false,
      createdAt: now,
    }));
    await bulkAddWeeklyTasks(weeklyTasks);

    // Save One Thing if provided
    if (planData.oneThing) {
      const weekInfo = getCurrentWeekInfo();
      const oneThing: OneThing = {
        id: `onething-${Date.now()}`,
        title: planData.oneThing,
        weekNumber: weekInfo.weekNumber,
        startDate: weekInfo.startDate,
        endDate: weekInfo.endDate,
        createdAt: now,
      };
      await saveOneThing(oneThing);
    }
  } catch (error) {
    console.error('Error saving generated plan:', error);
    throw error;
  }
}

// Helper to get current week info
function getCurrentWeekInfo() {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  const weekNumber = Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);

  const dayOfWeek = now.getDay();
  const diff = now.getDate() - dayOfWeek + (dayOfWeek === 0 ? -6 : 1);
  const weekStart = new Date(now);
  weekStart.setDate(diff);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  return {
    weekNumber,
    startDate: weekStart.toISOString(),
    endDate: weekEnd.toISOString(),
  };
}

// Clear all data (for testing/reset)
export async function clearAllData(): Promise<void> {
  try {
    await AsyncStorage.multiRemove(Object.values(STORAGE_KEYS));
  } catch (error) {
    console.error('Error clearing all data:', error);
    throw error;
  }
}

// ============================================
// GOVERNANCE RITUALS
// ============================================

export interface GovernanceRitualState {
  weeklyReview: boolean;
  weeklyPlanning: boolean;
  weekNumber: number; // To track which week these belong to
  updatedAt: string;
}

// Get current week number of the year
export function getCalendarWeekNumber(): number {
  const now = new Date();
  const startOfYear = new Date(now.getFullYear(), 0, 1);
  const pastDaysOfYear = (now.getTime() - startOfYear.getTime()) / 86400000;
  return Math.ceil((pastDaysOfYear + startOfYear.getDay() + 1) / 7);
}

// Get governance rituals state (auto-resets if new week)
export async function getGovernanceRituals(): Promise<GovernanceRitualState> {
  try {
    const data = await AsyncStorage.getItem(STORAGE_KEYS.GOVERNANCE_RITUALS);
    const currentWeek = getCalendarWeekNumber();

    if (data) {
      const stored: GovernanceRitualState = JSON.parse(data);

      // If it's a new week, reset the rituals
      if (stored.weekNumber !== currentWeek) {
        const resetState: GovernanceRitualState = {
          weeklyReview: false,
          weeklyPlanning: false,
          weekNumber: currentWeek,
          updatedAt: new Date().toISOString(),
        };
        await AsyncStorage.setItem(STORAGE_KEYS.GOVERNANCE_RITUALS, JSON.stringify(resetState));
        return resetState;
      }

      return stored;
    }

    // First time - return default state
    const defaultState: GovernanceRitualState = {
      weeklyReview: false,
      weeklyPlanning: false,
      weekNumber: currentWeek,
      updatedAt: new Date().toISOString(),
    };
    return defaultState;
  } catch (error) {
    console.error('Error getting governance rituals:', error);
    return {
      weeklyReview: false,
      weeklyPlanning: false,
      weekNumber: getCalendarWeekNumber(),
      updatedAt: new Date().toISOString(),
    };
  }
}

// Save governance rituals state
export async function saveGovernanceRituals(state: GovernanceRitualState): Promise<void> {
  try {
    const updatedState = {
      ...state,
      updatedAt: new Date().toISOString(),
    };
    await AsyncStorage.setItem(STORAGE_KEYS.GOVERNANCE_RITUALS, JSON.stringify(updatedState));
  } catch (error) {
    console.error('Error saving governance rituals:', error);
    throw error;
  }
}

// Toggle a specific ritual
export async function toggleGovernanceRitual(
  ritual: 'weeklyReview' | 'weeklyPlanning'
): Promise<GovernanceRitualState> {
  try {
    const current = await getGovernanceRituals();
    const updated: GovernanceRitualState = {
      ...current,
      [ritual]: !current[ritual],
      updatedAt: new Date().toISOString(),
    };
    await saveGovernanceRituals(updated);
    return updated;
  } catch (error) {
    console.error('Error toggling governance ritual:', error);
    throw error;
  }
}

// ============================================
// OVERDUE TASK MANAGEMENT
// ============================================

export interface OverdueTask {
  task: WeeklyTask;
  weekNumber: number;
  pillarId: PillarId;
  planStartDate: string;
}

// Get all overdue tasks from all active plans
export async function getOverdueTasks(): Promise<OverdueTask[]> {
  try {
    const plans = await getTwelveWeekPlans();
    const overdueTasks: OverdueTask[] = [];

    for (const pillarId of Object.keys(plans) as PillarId[]) {
      const plan = plans[pillarId];
      if (!plan || plan.isApproved === false) continue;

      const currentWeek = calculateCurrentWeek(plan.startDate);

      // Check all past weeks for incomplete tasks
      for (const weekPlan of plan.weeks) {
        if (weekPlan.weekNumber < currentWeek) {
          const incompleteTasks = weekPlan.tasks.filter(t => !t.completed);
          for (const task of incompleteTasks) {
            overdueTasks.push({
              task,
              weekNumber: weekPlan.weekNumber,
              pillarId: pillarId,
              planStartDate: plan.startDate,
            });
          }
        }
      }
    }

    return overdueTasks;
  } catch (error) {
    console.error('Error getting overdue tasks:', error);
    return [];
  }
}

// Move a task to the current week
export async function moveTaskToCurrentWeek(
  pillarId: PillarId,
  taskId: string,
  fromWeekNumber: number
): Promise<void> {
  try {
    const plans = await getTwelveWeekPlans();
    const plan = plans[pillarId];
    if (!plan) throw new Error('Plan not found');

    const currentWeek = calculateCurrentWeek(plan.startDate);

    // Find the task in the source week
    const sourceWeek = plan.weeks.find(w => w.weekNumber === fromWeekNumber);
    if (!sourceWeek) throw new Error('Source week not found');

    const taskIndex = sourceWeek.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    const task = sourceWeek.tasks[taskIndex];

    // Remove from source week
    sourceWeek.tasks.splice(taskIndex, 1);

    // Find or create the current week
    let targetWeek = plan.weeks.find(w => w.weekNumber === currentWeek);
    if (!targetWeek) {
      targetWeek = {
        weekNumber: currentWeek,
        tasks: [],
        startDate: '',
        endDate: '',
      };
      plan.weeks.push(targetWeek);
      plan.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
    }

    // Create a new task ID for the moved task
    const movedTask: WeeklyTask = {
      ...task,
      id: `${pillarId}-w${currentWeek}-moved-${Date.now()}`,
      completed: false,
    };

    targetWeek.tasks.push(movedTask);

    // Save the updated plan
    await saveTwelveWeekPlan(plan);

    // Sync to weekly tasks
    await syncPlanToWeeklyTasks(pillarId, plan);
  } catch (error) {
    console.error('Error moving task to current week:', error);
    throw error;
  }
}

// Mark a task as completed in its original week
export async function completeOverdueTask(
  pillarId: PillarId,
  taskId: string,
  weekNumber: number
): Promise<void> {
  try {
    const plans = await getTwelveWeekPlans();
    const plan = plans[pillarId];
    if (!plan) throw new Error('Plan not found');

    const week = plan.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) throw new Error('Week not found');

    const task = week.tasks.find(t => t.id === taskId);
    if (!task) throw new Error('Task not found');

    task.completed = true;

    // Save the updated plan
    await saveTwelveWeekPlan(plan);
  } catch (error) {
    console.error('Error completing overdue task:', error);
    throw error;
  }
}

// Discard (remove) a task from the plan
export async function discardOverdueTask(
  pillarId: PillarId,
  taskId: string,
  weekNumber: number
): Promise<void> {
  try {
    const plans = await getTwelveWeekPlans();
    const plan = plans[pillarId];
    if (!plan) throw new Error('Plan not found');

    const week = plan.weeks.find(w => w.weekNumber === weekNumber);
    if (!week) throw new Error('Week not found');

    const taskIndex = week.tasks.findIndex(t => t.id === taskId);
    if (taskIndex === -1) throw new Error('Task not found');

    week.tasks.splice(taskIndex, 1);

    // Save the updated plan
    await saveTwelveWeekPlan(plan);
  } catch (error) {
    console.error('Error discarding overdue task:', error);
    throw error;
  }
}

// Update task status in the Twelve Week Plan (reverse sync from dashboard)
// This ensures the source of truth for Analytics/Score is updated
export async function updatePlanTaskStatus(taskId: string, completed: boolean): Promise<void> {
  try {
    const plans = await getTwelveWeekPlans();

    // Iterate through all plans to find the task
    for (const pillarId of Object.keys(plans) as PillarId[]) {
      const plan = plans[pillarId];
      if (!plan || !plan.weeks) continue;

      // Search through all weeks for the task
      for (const week of plan.weeks) {
        const taskIndex = week.tasks.findIndex(t => t.id === taskId);
        if (taskIndex !== -1) {
          // Found the task - update its status
          week.tasks[taskIndex].completed = completed;

          // Save the updated plan
          await saveTwelveWeekPlan(plan);
          return; // Task found and updated, exit
        }
      }
    }

    // Task not found in any plan - this is OK for manually added tasks
    // that aren't part of the 12-week plan
  } catch (error) {
    console.error('Error updating plan task status:', error);
    // Fail silently - don't break the dashboard flow
  }
}

// Move all overdue tasks to current week
export async function moveAllOverdueToCurrentWeek(): Promise<number> {
  try {
    const overdueTasks = await getOverdueTasks();
    let movedCount = 0;

    // Group tasks by pillar for efficient processing
    const tasksByPillar = new Map<PillarId, OverdueTask[]>();
    for (const overdueTask of overdueTasks) {
      const tasks = tasksByPillar.get(overdueTask.pillarId) || [];
      tasks.push(overdueTask);
      tasksByPillar.set(overdueTask.pillarId, tasks);
    }

    // Process each pillar
    for (const [pillarId, tasks] of tasksByPillar) {
      const plans = await getTwelveWeekPlans();
      const plan = plans[pillarId];
      if (!plan) continue;

      const currentWeek = calculateCurrentWeek(plan.startDate);

      // Find or create current week
      let targetWeek = plan.weeks.find(w => w.weekNumber === currentWeek);
      if (!targetWeek) {
        targetWeek = {
          weekNumber: currentWeek,
          tasks: [],
          startDate: '',
          endDate: '',
        };
        plan.weeks.push(targetWeek);
        plan.weeks.sort((a, b) => a.weekNumber - b.weekNumber);
      }

      // Move each task
      for (const overdueTask of tasks) {
        const sourceWeek = plan.weeks.find(w => w.weekNumber === overdueTask.weekNumber);
        if (!sourceWeek) continue;

        const taskIndex = sourceWeek.tasks.findIndex(t => t.id === overdueTask.task.id);
        if (taskIndex === -1) continue;

        const task = sourceWeek.tasks[taskIndex];
        sourceWeek.tasks.splice(taskIndex, 1);

        const movedTask: WeeklyTask = {
          ...task,
          id: `${pillarId}-w${currentWeek}-moved-${Date.now()}-${movedCount}`,
          completed: false,
        };

        targetWeek.tasks.push(movedTask);
        movedCount++;
      }

      // Save the updated plan
      await saveTwelveWeekPlan(plan);
      await syncPlanToWeeklyTasks(pillarId, plan);
    }

    return movedCount;
  } catch (error) {
    console.error('Error moving all overdue tasks:', error);
    throw error;
  }
}
