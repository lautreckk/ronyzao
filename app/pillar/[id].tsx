import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TouchableOpacity,
  TextInput,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useLocalSearchParams, router, useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS, PillarId } from '@/constants/theme';
import {
  getPillarGoals,
  getTwelveWeekPlans,
  saveTwelveWeekPlan,
  syncPlanToWeeklyTasks,
  TwelveWeekPlan,
  PillarGoal,
} from '@/services/storage';
import { trackScreenView, trackPlanGenerated, trackPlanApproved } from '@/services/analytics';
import ProjectProgress from '@/components/ProjectProgress';

// Helper to generate week dates
function generateWeekDates(startDate: Date) {
  const weeks: { weekNumber: number; startDate: string; endDate: string; label: string }[] = [];

  for (let i = 0; i < 12; i++) {
    const weekStart = new Date(startDate);
    weekStart.setDate(startDate.getDate() + i * 7);

    const weekEnd = new Date(weekStart);
    weekEnd.setDate(weekStart.getDate() + 6);

    const formatDate = (date: Date) => {
      const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
      return `${months[date.getMonth()]} ${date.getDate()}`;
    };

    weeks.push({
      weekNumber: i + 1,
      startDate: weekStart.toISOString(),
      endDate: weekEnd.toISOString(),
      label: `Semana ${i + 1} (${formatDate(weekStart)} - ${formatDate(weekEnd)})`,
    });
  }

  return weeks;
}

interface WeekAccordionProps {
  week: {
    weekNumber: number;
    label: string;
    tasks: string[];
  };
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateTask: (weekNumber: number, taskIndex: number, newText: string) => void;
  isSaving: boolean;
}

interface EditableTaskProps {
  task: string;
  taskIndex: number;
  weekNumber: number;
  onUpdateTask: (weekNumber: number, taskIndex: number, newText: string) => void;
}

function EditableTask({ task, taskIndex, weekNumber, onUpdateTask }: EditableTaskProps) {
  const [editedText, setEditedText] = useState(task);
  const [isFocused, setIsFocused] = useState(false);

  // Update local state when task prop changes (e.g., after reload)
  useEffect(() => {
    setEditedText(task);
  }, [task]);

  const handleBlur = () => {
    setIsFocused(false);
    if (editedText.trim() !== task) {
      onUpdateTask(weekNumber, taskIndex, editedText.trim());
    }
  };

  return (
    <View style={styles.taskItem}>
      <View style={styles.checkbox} />
      <TextInput
        style={[
          styles.taskTextInput,
          isFocused && styles.taskTextInputFocused,
        ]}
        value={editedText}
        onChangeText={setEditedText}
        onFocus={() => setIsFocused(true)}
        onBlur={handleBlur}
        multiline
        textAlignVertical="top"
        placeholder="Descreva a tarefa..."
        placeholderTextColor={Colors.lightSlate}
      />
    </View>
  );
}

function WeekAccordion({ week, isExpanded, onToggle, onUpdateTask, isSaving }: WeekAccordionProps) {
  return (
    <View style={styles.weekAccordion}>
      <TouchableOpacity style={styles.weekHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.weekHeaderLeft}>
          <MaterialIcons
            name={isExpanded ? 'expand-more' : 'chevron-right'}
            size={24}
            color={Colors.slate}
          />
          <Text style={styles.weekTitle}>{week.label}</Text>
        </View>
        <View style={styles.weekHeaderRight}>
          {isSaving && isExpanded && (
            <View style={styles.weekSavingIndicator}>
              <ActivityIndicator size="small" color={Colors.sageGreen} />
            </View>
          )}
          {week.tasks.length > 0 && (
            <Text style={styles.weekTaskCount}>{week.tasks.length} tarefas</Text>
          )}
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.weekContent}>
          {week.tasks.length > 0 ? (
            <>
              {week.tasks.map((task, index) => (
                <EditableTask
                  key={`${week.weekNumber}-${index}`}
                  task={task}
                  taskIndex={index}
                  weekNumber={week.weekNumber}
                  onUpdateTask={onUpdateTask}
                />
              ))}
              <Text style={styles.editTaskHint}>Toque em uma tarefa para editar</Text>
            </>
          ) : (
            <Text style={styles.noTasksText}>Nenhuma tarefa definida para esta semana.</Text>
          )}
        </View>
      )}
    </View>
  );
}

export default function PillarDetailScreen() {
  const insets = useSafeAreaInsets();
  const { id } = useLocalSearchParams<{ id: PillarId }>();
  const [goal, setGoal] = useState<PillarGoal | null>(null);
  const [plan, setPlan] = useState<TwelveWeekPlan | null>(null);
  const [expandedWeek, setExpandedWeek] = useState<number | null>(1);
  const [generatedWeeks, setGeneratedWeeks] = useState<{ weekNumber: number; label: string; tasks: string[] }[]>([]);
  const [isSaving, setIsSaving] = useState(false);

  const pillar = PILLARS.find(p => p.id === id);

  const { generateText, isLoading } = useTextGeneration({
    onSuccess: async (text) => {
      try {
        // Parse the generated plan
        const weeklyTasks = parseGeneratedPlan(text);
        setGeneratedWeeks(weeklyTasks);

        // Save the plan (initially NOT approved - user must approve to sync to dashboard)
        if (goal && id) {
          const newPlan: TwelveWeekPlan = {
            pillarId: id,
            objective: goal.okr?.split('\n')[0] || goal.desire,
            keyResults: goal.okr?.split('\n').slice(1) || [],
            weeks: weeklyTasks.map(w => ({
              weekNumber: w.weekNumber,
              tasks: w.tasks.map((t, i) => ({
                id: `${id}-w${w.weekNumber}-t${i}`,
                pillarId: id,
                title: t,
                completed: false,
                createdAt: new Date().toISOString(),
              })),
              startDate: '',
              endDate: '',
            })),
            startDate: new Date().toISOString(),
            createdAt: new Date().toISOString(),
            isApproved: false, // Plan requires explicit approval before syncing to dashboard
          };

          await saveTwelveWeekPlan(newPlan);
          setPlan(newPlan);

          // Track plan generated event (pillar name and week count, not content)
          const pillar = PILLARS.find(p => p.id === id);
          trackPlanGenerated(pillar?.name || id, weeklyTasks.length);

          // Note: We don't sync to weekly tasks here - user must approve first
        } else {
          console.warn('[PillarDetail] Cannot save plan: missing goal or id');
        }
      } catch (error) {
        console.error('[PillarDetail] Error parsing/saving plan:', error);
        Alert.alert('Erro', 'Erro ao salvar o plano. Por favor, tente novamente.');
      }
    },
    onError: (_error) => {
      Alert.alert('Erro', 'Não foi possível gerar o plano. Tente novamente.');
    },
  });

  const loadData = useCallback(async () => {
    if (!id) {
      return;
    }

    try {
      const [goals, plans] = await Promise.all([
        getPillarGoals(),
        getTwelveWeekPlans(),
      ]);

      const pillarGoal = goals[id as PillarId];
      setGoal(pillarGoal || null);

      const existingPlan = plans[id as PillarId];

      if (existingPlan && existingPlan.weeks && existingPlan.weeks.length > 0) {
        setPlan(existingPlan);
        // Convert to display format with proper week labels
        const weekDates = generateWeekDates(new Date(existingPlan.startDate || Date.now()));
        const displayWeeks = existingPlan.weeks.map(w => ({
          weekNumber: w.weekNumber,
          label: weekDates[w.weekNumber - 1]?.label || `Semana ${w.weekNumber}`,
          tasks: w.tasks.map(t => t.title),
        }));
        setGeneratedWeeks(displayWeeks);
      } else {
        // Clear state if no plan exists
        setPlan(null);
        setGeneratedWeeks([]);
      }
    } catch (error) {
      console.error('[PillarDetail] Error loading data:', error);
      // Clear state on error to avoid stale data
      setPlan(null);
      setGeneratedWeeks([]);
    }
  }, [id]);

  // Use useFocusEffect to reload data every time the screen becomes active
  useFocusEffect(
    useCallback(() => {
      if (id) {
        trackScreenView('pillar_detail');
      }
      loadData();
    }, [loadData, id])
  );

  const parseGeneratedPlan = (text: string): { weekNumber: number; label: string; tasks: string[] }[] => {
    const weeks: { weekNumber: number; label: string; tasks: string[] }[] = [];
    const weekDates = generateWeekDates(new Date());

    // Try to parse structured week output
    const lines = text.split('\n').filter(l => l.trim());

    let currentWeek = 0;
    let currentTasks: string[] = [];

    for (const line of lines) {
      // Check if this is a week header (e.g., "Semana 1:" or "Week 1:")
      const weekMatch = line.match(/(?:semana|week)\s*(\d+)/i);
      if (weekMatch) {
        // Save previous week
        if (currentWeek > 0 && currentTasks.length > 0) {
          weeks.push({
            weekNumber: currentWeek,
            label: weekDates[currentWeek - 1]?.label || `Semana ${currentWeek}`,
            tasks: currentTasks,
          });
        }
        currentWeek = parseInt(weekMatch[1]);
        currentTasks = [];
      } else if (currentWeek > 0) {
        // This is a task line
        const task = line.replace(/^[-•*\d.)\s]+/, '').trim();
        if (task.length > 0 && !task.toLowerCase().startsWith('semana')) {
          currentTasks.push(task);
        }
      }
    }

    // Save last week
    if (currentWeek > 0 && currentTasks.length > 0) {
      weeks.push({
        weekNumber: currentWeek,
        label: weekDates[currentWeek - 1]?.label || `Semana ${currentWeek}`,
        tasks: currentTasks,
      });
    }

    // If parsing failed, create a basic structure
    if (weeks.length === 0) {
      for (let i = 1; i <= 12; i++) {
        weeks.push({
          weekNumber: i,
          label: weekDates[i - 1]?.label || `Semana ${i}`,
          tasks: [],
        });
      }
    } else {
      // Fill in missing weeks
      for (let i = 1; i <= 12; i++) {
        if (!weeks.find(w => w.weekNumber === i)) {
          weeks.push({
            weekNumber: i,
            label: weekDates[i - 1]?.label || `Semana ${i}`,
            tasks: [],
          });
        }
      }
      weeks.sort((a, b) => a.weekNumber - b.weekNumber);
    }

    return weeks;
  };

  const handleGeneratePlan = async () => {
    if (!goal?.okr && !goal?.desire) {
      Alert.alert('Atenção', 'Defina um OKR primeiro antes de gerar o plano.');
      return;
    }

    const prompt = `Você é um consultor especializado na metodologia "12 Week Year".

Crie um plano detalhado de 12 semanas para o seguinte objetivo:

Pilar: ${pillar?.name}
OKR: ${goal?.okr || goal?.desire}

Para cada semana (1-12), liste 2-3 tarefas específicas e acionáveis.
Garanta progressão lógica ao longo das semanas.
As primeiras semanas devem focar em fundação/preparação.
As semanas do meio devem focar em execução.
As últimas semanas devem focar em otimização e consolidação.

Formato de resposta:
Semana 1:
- Tarefa 1
- Tarefa 2

Semana 2:
- Tarefa 1
- Tarefa 2

[Continue até a Semana 12]

Seja específico e prático. Use verbos de ação.`;

    await generateText(prompt, { maxTokens: 2000 });
  };

  const handleUpdateTask = async (weekNumber: number, taskIndex: number, newText: string) => {
    if (!id) return;

    setIsSaving(true);

    try {
      // Update generatedWeeks state
      const updatedWeeks = generatedWeeks.map(week => {
        if (week.weekNumber === weekNumber) {
          const updatedTasks = [...week.tasks];
          updatedTasks[taskIndex] = newText;
          return { ...week, tasks: updatedTasks };
        }
        return week;
      });
      setGeneratedWeeks(updatedWeeks);

      // Update the plan in storage
      if (plan) {
        const updatedPlan: TwelveWeekPlan = {
          ...plan,
          weeks: plan.weeks.map(week => {
            if (week.weekNumber === weekNumber) {
              const updatedTasks = week.tasks.map((task, idx) => {
                if (idx === taskIndex) {
                  return { ...task, title: newText };
                }
                return task;
              });
              return { ...week, tasks: updatedTasks };
            }
            return week;
          }),
        };
        await saveTwelveWeekPlan(updatedPlan);
        setPlan(updatedPlan);

        // Sync to weekly tasks for the dashboard
        await syncPlanToWeeklyTasks(id, updatedPlan);
      } else {
        // Create a new plan if it doesn't exist (shouldn't happen but just in case)
        const newPlan: TwelveWeekPlan = {
          pillarId: id,
          objective: goal?.okr?.split('\n')[0] || goal?.desire || '',
          keyResults: goal?.okr?.split('\n').slice(1) || [],
          weeks: updatedWeeks.map(w => ({
            weekNumber: w.weekNumber,
            tasks: w.tasks.map((t, i) => ({
              id: `${id}-w${w.weekNumber}-t${i}`,
              pillarId: id,
              title: t,
              completed: false,
              createdAt: new Date().toISOString(),
            })),
            startDate: '',
            endDate: '',
          })),
          startDate: new Date().toISOString(),
          createdAt: new Date().toISOString(),
          isApproved: false, // New plans require approval
        };
        await saveTwelveWeekPlan(newPlan);
        setPlan(newPlan);

        // Note: Don't sync to weekly tasks - plan requires approval first
      }
    } catch (error) {
      console.error('Error updating task:', error);
      Alert.alert('Erro', 'Não foi possível salvar a alteração.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleApprovePlan = async () => {
    if (!id || !plan) return;

    setIsSaving(true);

    try {
      // Update plan with isApproved = true
      const approvedPlan: TwelveWeekPlan = {
        ...plan,
        isApproved: true,
      };

      // Save the approved plan
      await saveTwelveWeekPlan(approvedPlan);
      setPlan(approvedPlan);

      // Now sync to weekly tasks (this will add tasks to Dashboard)
      await syncPlanToWeeklyTasks(id, approvedPlan);

      // Track plan approved event (pillar name and total tasks, not content)
      const pillar = PILLARS.find(p => p.id === id);
      const totalTasks = approvedPlan.weeks.reduce((sum, w) => sum + w.tasks.length, 0);
      trackPlanApproved(pillar?.name || id, totalTasks);

      // Show confirmation
      Alert.alert(
        '✅ Plano Aprovado!',
        'As tarefas da semana atual foram adicionadas à tela de Execução. Boa jornada!',
        [{ text: 'OK', style: 'default' }]
      );
    } catch (error) {
      console.error('Error approving plan:', error);
      Alert.alert('Erro', 'Não foi possível aprovar o plano. Tente novamente.');
    } finally {
      setIsSaving(false);
    }
  };

  if (!pillar) {
    return (
      <View style={[styles.container, { paddingTop: insets.top }]}>
        <Text style={styles.errorText}>Pilar não encontrado</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <TouchableOpacity style={styles.backButton} onPress={() => router.back()}>
          <MaterialIcons name="arrow-back" size={24} color={Colors.paperWhite} />
        </TouchableOpacity>
        <View style={styles.headerContent}>
          <Text style={styles.title}>{pillar.name}</Text>
          <Text style={styles.subtitle}>Q1 2026 - Plano de 12 Semanas</Text>
        </View>
      </View>

      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {/* OKR Card */}
        {goal?.okr && (
          <View style={[styles.okrCard, Shadows.md]}>
            <Text style={styles.okrCardTitle}>OKR Anual</Text>
            <Text style={styles.okrCardText}>{goal.okr}</Text>
          </View>
        )}

        {/* Project Progress Tracking */}
        {generatedWeeks.length > 0 && plan && (
          <ProjectProgress plan={plan} />
        )}

        {/* Generate Plan Button */}
        {generatedWeeks.length === 0 && (
          <TouchableOpacity
            style={[styles.generatePlanButton, isLoading && styles.generatePlanButtonDisabled]}
            onPress={handleGeneratePlan}
            disabled={isLoading}
          >
            {isLoading ? (
              <>
                <ActivityIndicator color={Colors.deepNavy} size="small" />
                <Text style={styles.generatePlanButtonText}>Gerando plano...</Text>
              </>
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={20} color={Colors.deepNavy} />
                <Text style={styles.generatePlanButtonText}>Gerar Plano de 12 Semanas com IA</Text>
              </>
            )}
          </TouchableOpacity>
        )}

        {/* Approval Section */}
        {generatedWeeks.length > 0 && plan && (
          <View style={styles.approvalSection}>
            {/* Backward compatibility: undefined isApproved is treated as approved */}
            {plan.isApproved === false ? (
              // Show Approve Button (only when explicitly false)
              <TouchableOpacity
                style={[styles.approveButton, isSaving && styles.approveButtonDisabled]}
                onPress={handleApprovePlan}
                disabled={isSaving}
              >
                {isSaving ? (
                  <>
                    <ActivityIndicator color={Colors.paperWhite} size="small" />
                    <Text style={styles.approveButtonText}>Aprovando...</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="check-circle" size={22} color={Colors.paperWhite} />
                    <Text style={styles.approveButtonText}>Aprovar Plano e Iniciar Execução</Text>
                  </>
                )}
              </TouchableOpacity>
            ) : (
              // Show Approved Badge (when true or undefined for backward compatibility)
              <View style={styles.approvedBadge}>
                <MaterialIcons name="verified" size={20} color={Colors.sageGreen} />
                <Text style={styles.approvedBadgeText}>Plano em Execução</Text>
              </View>
            )}
            <Text style={styles.approvalHint}>
              {plan.isApproved === false
                ? 'Revise o plano acima e aprove para iniciar a execução. As tarefas aparecerão na aba Execução.'
                : 'As tarefas da semana atual estão disponíveis na aba Execução.'}
            </Text>
          </View>
        )}

        {/* Weeks Accordion */}
        {generatedWeeks.length > 0 && (
          <View style={styles.weeksSection}>
            <View style={styles.weeksSectionHeader}>
              <Text style={styles.weeksSectionTitle}>Plano de 12 Semanas</Text>
              {isSaving && (
                <View style={styles.headerSavingIndicator}>
                  <ActivityIndicator size="small" color={Colors.sageGreen} />
                  <Text style={styles.headerSavingText}>Salvando...</Text>
                </View>
              )}
            </View>
            {generatedWeeks.map(week => (
              <WeekAccordion
                key={week.weekNumber}
                week={week}
                isExpanded={expandedWeek === week.weekNumber}
                onToggle={() =>
                  setExpandedWeek(prev => (prev === week.weekNumber ? null : week.weekNumber))
                }
                onUpdateTask={handleUpdateTask}
                isSaving={isSaving}
              />
            ))}
          </View>
        )}

        {/* Month Focus Indicator */}
        {generatedWeeks.length > 0 && (
          <View style={styles.monthFocusCard}>
            <Text style={styles.monthFocusTitle}>Mês 1: Janeiro</Text>
            <Text style={styles.monthFocusDescription}>
              Foco em fundação e preparação. Estabeleça as bases para o sucesso nas próximas 12 semanas.
            </Text>
          </View>
        )}
      </ScrollView>
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
    alignItems: 'center',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.xl,
  },
  backButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
    marginRight: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    fontStyle: 'italic',
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
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
  errorText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    color: Colors.paperWhite,
    textAlign: 'center',
    padding: Spacing.xl,
  },
  okrCard: {
    backgroundColor: Colors.goldenAmber + '20',
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginBottom: Spacing.lg,
    borderLeftWidth: 4,
    borderLeftColor: Colors.goldenAmber,
  },
  okrCardTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    marginBottom: Spacing.sm,
  },
  okrCardText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    lineHeight: 22,
  },
  generatePlanButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldenAmber,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
  },
  generatePlanButtonDisabled: {
    opacity: 0.7,
  },
  generatePlanButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  weeksSection: {
    marginTop: Spacing.md,
  },
  weeksSectionHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.md,
  },
  weeksSectionTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  headerSavingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  headerSavingText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.sageGreen,
  },
  weekAccordion: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.sm,
    overflow: 'hidden',
    ...Shadows.sm,
  },
  weekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.md,
  },
  weekHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  weekTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.deepNavy,
    marginLeft: Spacing.sm,
  },
  weekHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  weekSavingIndicator: {
    marginRight: Spacing.xs,
  },
  weekTaskCount: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },
  weekContent: {
    padding: Spacing.md,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.sm,
  },
  checkbox: {
    width: 20,
    height: 20,
    borderRadius: 4,
    borderWidth: 2,
    borderColor: Colors.lightSlate,
    marginRight: Spacing.md,
    marginTop: 2,
  },
  taskText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    flex: 1,
    lineHeight: 20,
  },
  taskTextInput: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    flex: 1,
    lineHeight: 20,
    padding: Spacing.sm,
    paddingTop: Spacing.sm,
    marginLeft: -Spacing.sm,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'transparent',
    minHeight: 40,
  },
  taskTextInputFocused: {
    backgroundColor: Colors.paperWhite,
    borderWidth: 1,
    borderColor: Colors.goldenAmber,
  },
  editTaskHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
    fontStyle: 'italic',
    marginTop: Spacing.sm,
    textAlign: 'center',
  },
  noTasksText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    fontStyle: 'italic',
    paddingVertical: Spacing.sm,
  },
  monthFocusCard: {
    backgroundColor: Colors.deepNavy,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    marginTop: Spacing.xl,
  },
  monthFocusTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.goldenAmber,
    marginBottom: Spacing.sm,
  },
  monthFocusDescription: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.paperWhite,
    lineHeight: 20,
    opacity: 0.9,
  },
  approvalSection: {
    marginBottom: Spacing.lg,
    alignItems: 'center',
  },
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sageGreen,
    borderRadius: BorderRadius.md,
    padding: Spacing.lg,
    gap: Spacing.sm,
    width: '100%',
  },
  approveButtonDisabled: {
    opacity: 0.7,
  },
  approveButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.paperWhite,
  },
  approvedBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sageGreen + '20',
    borderRadius: BorderRadius.full,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    gap: Spacing.sm,
    borderWidth: 1,
    borderColor: Colors.sageGreen,
  },
  approvedBadgeText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.sageGreen,
  },
  approvalHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.sm,
    paddingHorizontal: Spacing.lg,
    lineHeight: 18,
  },
});
