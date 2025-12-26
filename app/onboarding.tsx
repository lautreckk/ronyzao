import React, { useState, useEffect, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  LayoutAnimation,
  Platform,
  UIManager,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, BorderRadius, PillarId } from '@/constants/theme';
import {
  saveTwelveWeekPlan,
  syncPlanToWeeklyTasks,
  getTwelveWeekPlans,
  setOnboardingCompleted,
  TwelveWeekPlan,
  WeekPlan,
  WeeklyTask,
} from '@/services/storage';
import {
  trackOnboardingStart,
  trackGoalDefined,
  trackPlanGenerated,
  trackPlanApproved,
  trackScreenView,
} from '@/services/analytics';

// Enable LayoutAnimation on Android
if (Platform.OS === 'android' && UIManager.setLayoutAnimationEnabledExperimental) {
  UIManager.setLayoutAnimationEnabledExperimental(true);
}

// Pillar info with icons and examples
interface PillarInfo {
  id: PillarId | string;
  name: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  color: string;
  examples: string[];
  isCustom?: boolean;
}

const PILLAR_DATA: Record<string, PillarInfo> = {
  business: {
    id: 'business',
    name: 'Negócios',
    icon: 'business-center',
    color: Colors.pillarBusiness,
    examples: [
      'Faturar R$ 60.000 em vendas até a semana 12',
      'Lançar 1 produto digital com 200 vendas até 15/03',
      'Adquirir 150 novos clientes pagantes em 12 semanas',
      'Aumentar margem de lucro de 15% para 25% até abril',
      'Fechar 5 contratos B2B no valor total de R$ 100k',
    ],
  },
  physical: {
    id: 'physical',
    name: 'Saúde Física',
    icon: 'fitness-center',
    color: Colors.pillarPhysical,
    examples: [
      'Correr 10km em menos de 55 minutos na semana 12',
      'Reduzir percentual de gordura de 25% para 18%',
      'Completar 48 treinos de musculação (4x/semana)',
      'Dormir média de 7h30 por noite durante 84 dias',
      'Completar meia-maratona (21km) em março',
    ],
  },
  mental: {
    id: 'mental',
    name: 'Saúde Mental',
    icon: 'psychology',
    color: Colors.pillarMental,
    examples: [
      'Acumular 1.260 minutos de meditação (15min/dia)',
      'Realizar 12 sessões de terapia semanais',
      'Reduzir tempo de tela de 6h para 2h diárias',
      'Escrever 84 páginas de journaling (1 página/dia)',
      'Implementar 3 técnicas de gestão de ansiedade',
    ],
  },
  spiritual: {
    id: 'spiritual',
    name: 'Saúde Espiritual',
    icon: 'self-improvement',
    color: Colors.pillarSpiritual,
    examples: [
      'Completar retiro de silêncio de 5 dias em fevereiro',
      'Escrever 84 gratidões (1/dia por 12 semanas)',
      'Ler e resumir 4 livros sobre propósito de vida',
      'Participar de 12 encontros de grupo espiritual',
      'Praticar 42 horas de reflexão (30min/dia)',
    ],
  },
  education: {
    id: 'education',
    name: 'Educação',
    icon: 'school',
    color: Colors.pillarEducation,
    examples: [
      'Concluir 6 disciplinas do MBA até março',
      'Atingir nível B2 de inglês (pontuação 785 TOEIC)',
      'Ler e fichar 12 livros técnicos em 12 semanas',
      'Obter certificação AWS até a semana 10',
      'Completar 120 horas de curso de programação',
    ],
  },
  finance: {
    id: 'finance',
    name: 'Finanças',
    icon: 'account-balance-wallet',
    color: Colors.pillarFinance,
    examples: [
      'Economizar R$ 36.000 (R$ 3.000/semana)',
      'Quitar R$ 15.000 em dívidas de cartão até março',
      'Investir R$ 24.000 (R$ 2.000/mês por 12 semanas)',
      'Construir reserva de R$ 30.000 (6 meses de custo)',
      'Gerar R$ 3.000/mês em renda passiva até abril',
    ],
  },
  family: {
    id: 'family',
    name: 'Família',
    icon: 'family-restroom',
    color: Colors.pillarFamily,
    examples: [
      'Realizar 48 jantares em família (4x/semana)',
      'Planejar e executar viagem de 7 dias em março',
      'Ter 24 momentos 1:1 com cada filho (2x/semana)',
      'Organizar 3 reuniões familiares mensais',
      'Criar 12 domingos de tradição familiar',
    ],
  },
};

// State for each pillar
interface PillarState {
  desire: string;
  structuredGoal: string;
  weeklyPlan: WeekPlan[] | null;
  step: 1 | 2 | 3;
  isGeneratingGoal: boolean;
  isGeneratingPlan: boolean;
  isComplete: boolean;
  expandedWeek: number | null;
  isSavingApproval: boolean;
}

// Parse weekly plan from AI response
function parseWeeklyPlan(text: string, pillarId: string): WeekPlan[] | null {
  try {
    const jsonMatch = text.match(/\{[\s\S]*\}/);
    if (!jsonMatch) return null;

    const parsed = JSON.parse(jsonMatch[0]);
    if (!parsed.weeks || !Array.isArray(parsed.weeks)) return null;

    const now = new Date();
    const startDate = new Date(now);
    startDate.setDate(startDate.getDate() - startDate.getDay() + 1); // Start from Monday

    return parsed.weeks.map((week: { weekNumber: number; tasks: string[] }, index: number) => {
      const weekStart = new Date(startDate);
      weekStart.setDate(weekStart.getDate() + index * 7);
      const weekEnd = new Date(weekStart);
      weekEnd.setDate(weekEnd.getDate() + 6);

      const tasks: WeeklyTask[] = (week.tasks || []).map((taskTitle: string, taskIndex: number) => ({
        id: `${pillarId}-w${week.weekNumber}-t${taskIndex}-${Date.now()}`,
        pillarId: pillarId as PillarId,
        title: taskTitle,
        completed: false,
        createdAt: new Date().toISOString(),
      }));

      return {
        weekNumber: week.weekNumber,
        tasks,
        startDate: weekStart.toISOString(),
        endDate: weekEnd.toISOString(),
      };
    });
  } catch (error) {
    console.error('Error parsing weekly plan:', error);
    return null;
  }
}

// Helper to generate week labels
function generateWeekLabel(weekNumber: number, startDate: Date): string {
  const weekStart = new Date(startDate);
  weekStart.setDate(startDate.getDate() + (weekNumber - 1) * 7);
  const weekEnd = new Date(weekStart);
  weekEnd.setDate(weekStart.getDate() + 6);

  const formatDate = (date: Date) => {
    const months = ['Jan', 'Fev', 'Mar', 'Abr', 'Mai', 'Jun', 'Jul', 'Ago', 'Set', 'Out', 'Nov', 'Dez'];
    return `${months[date.getMonth()]} ${date.getDate()}`;
  };

  return `Semana ${weekNumber} (${formatDate(weekStart)} - ${formatDate(weekEnd)})`;
}

// Editable Task Component for Plan Review
interface OnboardingEditableTaskProps {
  task: WeeklyTask;
  taskIndex: number;
  weekNumber: number;
  onUpdateTask: (weekNumber: number, taskIndex: number, newText: string) => void;
}

function OnboardingEditableTask({ task, taskIndex, weekNumber, onUpdateTask }: OnboardingEditableTaskProps) {
  const [editedText, setEditedText] = useState(task.title);
  const [isFocused, setIsFocused] = useState(false);

  useEffect(() => {
    setEditedText(task.title);
  }, [task.title]);

  const handleBlur = () => {
    setIsFocused(false);
    if (editedText.trim() !== task.title) {
      onUpdateTask(weekNumber, taskIndex, editedText.trim());
    }
  };

  return (
    <View style={styles.reviewTaskItem}>
      <View style={styles.reviewTaskCheckbox} />
      <TextInput
        style={[
          styles.reviewTaskInput,
          isFocused && styles.reviewTaskInputFocused,
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

// Week Accordion Component for Plan Review
interface OnboardingWeekAccordionProps {
  week: WeekPlan;
  weekLabel: string;
  isExpanded: boolean;
  onToggle: () => void;
  onUpdateTask: (weekNumber: number, taskIndex: number, newText: string) => void;
}

function OnboardingWeekAccordion({ week, weekLabel, isExpanded, onToggle, onUpdateTask }: OnboardingWeekAccordionProps) {
  return (
    <View style={styles.reviewWeekAccordion}>
      <TouchableOpacity style={styles.reviewWeekHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.reviewWeekHeaderLeft}>
          <MaterialIcons
            name={isExpanded ? 'expand-more' : 'chevron-right'}
            size={20}
            color={Colors.slate}
          />
          <Text style={styles.reviewWeekTitle}>{weekLabel}</Text>
        </View>
        {week.tasks.length > 0 && (
          <Text style={styles.reviewWeekTaskCount}>{week.tasks.length} tarefas</Text>
        )}
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.reviewWeekContent}>
          {week.tasks.length > 0 ? (
            <>
              {week.tasks.map((task, index) => (
                <OnboardingEditableTask
                  key={task.id}
                  task={task}
                  taskIndex={index}
                  weekNumber={week.weekNumber}
                  onUpdateTask={onUpdateTask}
                />
              ))}
              <Text style={styles.reviewEditHint}>Toque em uma tarefa para editar</Text>
            </>
          ) : (
            <Text style={styles.reviewNoTasksText}>Nenhuma tarefa definida para esta semana.</Text>
          )}
        </View>
      )}
    </View>
  );
}

// Expandable Pillar Card Component
interface ExpandablePillarCardProps {
  pillarInfo: PillarInfo;
  state: PillarState;
  isExpanded: boolean;
  onToggleExpand: () => void;
  onUpdateState: (updates: Partial<PillarState>) => void;
  onGenerateGoal: () => void;
  onGeneratePlan: () => void;
  onUpdateTask: (weekNumber: number, taskIndex: number, newText: string) => void;
  onApprovePlan: () => void;
}

function ExpandablePillarCard({
  pillarInfo,
  state,
  isExpanded,
  onToggleExpand,
  onUpdateState,
  onGenerateGoal,
  onGeneratePlan,
  onUpdateTask,
  onApprovePlan,
}: ExpandablePillarCardProps) {
  const [currentExampleIndex, setCurrentExampleIndex] = useState(0);

  // Rotate examples every 3 seconds when expanded
  useEffect(() => {
    if (!isExpanded) return;
    const interval = setInterval(() => {
      setCurrentExampleIndex((prev) => (prev + 1) % pillarInfo.examples.length);
    }, 3000);
    return () => clearInterval(interval);
  }, [isExpanded, pillarInfo.examples.length]);

  return (
    <View style={[styles.pillarCard, state.isComplete && styles.pillarCardComplete]}>
      {/* Header - Always visible */}
      <TouchableOpacity
        style={styles.pillarCardHeader}
        onPress={onToggleExpand}
        activeOpacity={0.7}
      >
        <View style={[styles.pillarIconContainer, { backgroundColor: pillarInfo.color + '20' }]}>
          <MaterialIcons name={pillarInfo.icon} size={24} color={pillarInfo.color} />
        </View>
        <View style={styles.pillarHeaderText}>
          <Text style={styles.pillarName}>{pillarInfo.name}</Text>
          {state.isComplete && (
            <Text style={styles.pillarCompleteLabel}>✅ Planejado</Text>
          )}
        </View>
        <MaterialIcons
          name={isExpanded ? 'keyboard-arrow-up' : 'keyboard-arrow-down'}
          size={28}
          color={Colors.slate}
        />
      </TouchableOpacity>

      {/* Expanded Content */}
      {isExpanded && (
        <View style={styles.pillarExpandedContent}>
          {/* Step 1: Goal Definition */}
          <View style={styles.stepContainer}>
            <View style={styles.stepHeader}>
              <View style={[styles.stepBadge, state.step >= 1 && styles.stepBadgeActive]}>
                <Text style={[styles.stepBadgeText, state.step >= 1 && styles.stepBadgeTextActive]}>1</Text>
              </View>
              <Text style={styles.stepTitle}>Defina seu Objetivo</Text>
            </View>

            {/* Educational Box */}
            <View style={styles.educationalBox}>
              <View style={styles.educationalHeader}>
                <MaterialIcons name="lightbulb" size={20} color={Colors.goldenAmber} />
                <Text style={styles.educationalTitle}>O Segredo das Metas que Funcionam</Text>
              </View>
              <Text style={styles.educationalText}>
                No método <Text style={styles.boldText}>Ano de 12 Semanas</Text>, metas vagas nunca funcionam.
                Você precisa de <Text style={styles.boldText}>entregas específicas e mensuráveis</Text>.
              </Text>
              <View style={styles.educationalExamples}>
                <Text style={styles.educationalText}>
                  ❌ <Text style={styles.vagueText}>Vago:</Text> {'"'}Quero emagrecer{'"'}, {'"'}Vender mais{'"'}, {'"'}Melhorar finanças{'"'}
                </Text>
                <Text style={styles.educationalText}>
                  ✅ <Text style={styles.specificText}>Específico:</Text> {'"'}Perder <Text style={styles.boldText}>6kg</Text> em <Text style={styles.boldText}>12 semanas</Text>{'"'}
                </Text>
                <Text style={styles.educationalText}>
                  ✅ <Text style={styles.specificText}>Mensurável:</Text> {'"'}Faturar <Text style={styles.boldText}>R$ 50.000</Text> até <Text style={styles.boldText}>15/03</Text>{'"'}
                </Text>
              </View>
              <View style={styles.educationalFormula}>
                <Text style={styles.formulaTitle}>📐 Fórmula da Meta Perfeita:</Text>
                <Text style={styles.formulaText}>
                  <Text style={styles.boldText}>[Verbo de Ação]</Text> + <Text style={styles.boldText}>[Número Específico]</Text> + <Text style={styles.boldText}>[Prazo em Semanas/Data]</Text>
                </Text>
                <Text style={styles.formulaExample}>
                  Ex: {'"'}Adquirir 100 clientes pagantes até a semana 12{'"'}
                </Text>
              </View>
              <Text style={styles.educationalTip}>
                💡 <Text style={styles.boldText}>Dica:</Text> Se você não consegue medir, você não consegue melhorar.
                Pergunte-se: {'"'}Como vou saber que alcancei essa meta?{'"'}
              </Text>
            </View>

            {/* Input Field */}
            <TextInput
              style={styles.goalInput}
              placeholder="Descreva seu objetivo para os próximos 3 meses..."
              placeholderTextColor={Colors.lightSlate}
              value={state.desire}
              onChangeText={(text) => onUpdateState({ desire: text })}
              multiline
              maxLength={500}
              textAlignVertical="top"
            />

            {/* Rotating Examples */}
            <View style={styles.examplesContainer}>
              <Text style={styles.examplesLabel}>💡 Inspiração:</Text>
              <Text style={styles.exampleText}>&ldquo;{pillarInfo.examples[currentExampleIndex]}&rdquo;</Text>
            </View>
          </View>

          {/* Step 2: Structure */}
          {state.desire.trim().length > 10 && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, state.step >= 2 && styles.stepBadgeActive]}>
                  <Text style={[styles.stepBadgeText, state.step >= 2 && styles.stepBadgeTextActive]}>2</Text>
                </View>
                <Text style={styles.stepTitle}>Estruture sua Meta</Text>
              </View>

              {!state.structuredGoal ? (
                <TouchableOpacity
                  style={[styles.actionButton, state.isGeneratingGoal && styles.actionButtonDisabled]}
                  onPress={onGenerateGoal}
                  disabled={state.isGeneratingGoal}
                >
                  {state.isGeneratingGoal ? (
                    <ActivityIndicator size="small" color={Colors.deepNavy} />
                  ) : (
                    <Text style={styles.actionButtonIcon}>✨</Text>
                  )}
                  <Text style={styles.actionButtonText}>
                    {state.isGeneratingGoal ? 'Gerando...' : 'Transformar em Meta Acionável'}
                  </Text>
                </TouchableOpacity>
              ) : (
                <View style={styles.structuredGoalContainer}>
                  <TextInput
                    style={styles.structuredGoalInput}
                    value={state.structuredGoal}
                    onChangeText={(text) => onUpdateState({ structuredGoal: text, step: 2 })}
                    multiline
                    textAlignVertical="top"
                  />
                  <TouchableOpacity
                    style={styles.regenerateButton}
                    onPress={onGenerateGoal}
                    disabled={state.isGeneratingGoal}
                  >
                    <MaterialIcons name="refresh" size={16} color={Colors.slate} />
                    <Text style={styles.regenerateText}>Regenerar</Text>
                  </TouchableOpacity>
                </View>
              )}
            </View>
          )}

          {/* Step 3: Weekly Plan */}
          {state.structuredGoal && (
            <View style={styles.stepContainer}>
              <View style={styles.stepHeader}>
                <View style={[styles.stepBadge, state.step >= 3 && styles.stepBadgeActive]}>
                  <Text style={[styles.stepBadgeText, state.step >= 3 && styles.stepBadgeTextActive]}>3</Text>
                </View>
                <Text style={styles.stepTitle}>Plano Semanal</Text>
              </View>

              {!state.weeklyPlan ? (
                // Generate Plan Button
                <TouchableOpacity
                  style={[styles.actionButton, styles.actionButtonSecondary, state.isGeneratingPlan && styles.actionButtonDisabled]}
                  onPress={onGeneratePlan}
                  disabled={state.isGeneratingPlan}
                >
                  {state.isGeneratingPlan ? (
                    <ActivityIndicator size="small" color={Colors.paperWhite} />
                  ) : (
                    <Text style={styles.actionButtonIcon}>📅</Text>
                  )}
                  <Text style={[styles.actionButtonText, styles.actionButtonTextSecondary]}>
                    {state.isGeneratingPlan ? 'Criando plano...' : 'Quebrar em entregas semanais'}
                  </Text>
                </TouchableOpacity>
              ) : !state.isComplete ? (
                // Plan Review UI - show when plan exists but not yet approved
                <View style={styles.planReviewContainer}>
                  <View style={styles.planReviewHeader}>
                    <MaterialIcons name="edit-note" size={24} color={Colors.goldenAmber} />
                    <Text style={styles.planReviewTitle}>Revise seu Plano</Text>
                  </View>
                  <Text style={styles.planReviewSubtitle}>
                    Confira as tarefas e faça ajustes se necessário antes de aprovar
                  </Text>

                  {/* Weeks Accordion List */}
                  <ScrollView
                    style={styles.reviewWeeksContainer}
                    nestedScrollEnabled
                    showsVerticalScrollIndicator={true}
                  >
                    {state.weeklyPlan.map((week) => {
                      const startDate = new Date();
                      startDate.setDate(startDate.getDate() - startDate.getDay() + 1);
                      return (
                        <OnboardingWeekAccordion
                          key={week.weekNumber}
                          week={week}
                          weekLabel={generateWeekLabel(week.weekNumber, startDate)}
                          isExpanded={state.expandedWeek === week.weekNumber}
                          onToggle={() => onUpdateState({
                            expandedWeek: state.expandedWeek === week.weekNumber ? null : week.weekNumber
                          })}
                          onUpdateTask={onUpdateTask}
                        />
                      );
                    })}
                  </ScrollView>

                  {/* Approve Button */}
                  <TouchableOpacity
                    style={[styles.approveButton, state.isSavingApproval && styles.approveButtonDisabled]}
                    onPress={onApprovePlan}
                    disabled={state.isSavingApproval}
                  >
                    {state.isSavingApproval ? (
                      <>
                        <ActivityIndicator size="small" color={Colors.paperWhite} />
                        <Text style={styles.approveButtonText}>Aprovando...</Text>
                      </>
                    ) : (
                      <>
                        <MaterialIcons name="check-circle" size={22} color={Colors.paperWhite} />
                        <Text style={styles.approveButtonText}>Aprovar Plano</Text>
                      </>
                    )}
                  </TouchableOpacity>
                  <Text style={styles.approveHint}>
                    Ao aprovar, as tarefas aparecerão na tela de Execução
                  </Text>
                </View>
              ) : (
                // Success state - after approval
                <View style={styles.successContainer}>
                  <MaterialIcons name="check-circle" size={48} color={Colors.sageGreen} />
                  <Text style={styles.successTitle}>✅ Planejado com sucesso!</Text>
                  <Text style={styles.successSubtitle}>
                    {state.weeklyPlan.length} semanas de tarefas criadas
                  </Text>
                </View>
              )}
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function OnboardingScreen() {
  const insets = useSafeAreaInsets();
  const [expandedPillar, setExpandedPillar] = useState<string | null>(null);
  const [pillarStates, setPillarStates] = useState<Record<string, PillarState>>({});
  const [customPillars, setCustomPillars] = useState<PillarInfo[]>([]);
  const [completedPlans, setCompletedPlans] = useState<number>(0);
  const [isCheckingPlans, setIsCheckingPlans] = useState(true);

  // Refs to track which pillar is being generated
  const currentGoalPillarRef = React.useRef<string | null>(null);
  const currentPlanPillarRef = React.useRef<string | null>(null);

  // AI hooks for goal generation
  const { generateText: generateGoalText } = useTextGeneration({
    onSuccess: (text) => {
      const pillarId = currentGoalPillarRef.current;
      if (pillarId) {
        // Track goal defined event (pillar name only, not content)
        const pillarInfo = PILLAR_DATA[pillarId] || customPillars.find((p) => p.id === pillarId);
        trackGoalDefined(pillarInfo?.name || pillarId);

        setPillarStates((prev) => ({
          ...prev,
          [pillarId]: {
            ...prev[pillarId],
            structuredGoal: text,
            step: 2,
            isGeneratingGoal: false,
          },
        }));
        currentGoalPillarRef.current = null;
      }
    },
    onError: () => {
      const pillarId = currentGoalPillarRef.current;
      if (pillarId) {
        Alert.alert('Erro', 'Não foi possível gerar a meta estruturada. Tente novamente.');
        setPillarStates((prev) => ({
          ...prev,
          [pillarId]: { ...prev[pillarId], isGeneratingGoal: false },
        }));
        currentGoalPillarRef.current = null;
      }
    },
  });

  // AI hooks for plan generation
  const { generateText: generatePlanText } = useTextGeneration({
    onSuccess: async (text) => {
      const pillarId = currentPlanPillarRef.current;
      if (!pillarId) return;

      const state = pillarStates[pillarId];
      const weeklyPlan = parseWeeklyPlan(text, pillarId);

      if (!weeklyPlan) {
        Alert.alert('Erro', 'Não foi possível processar o plano. Tente novamente.');
        setPillarStates((prev) => ({
          ...prev,
          [pillarId]: { ...prev[pillarId], isGeneratingPlan: false },
        }));
        currentPlanPillarRef.current = null;
        return;
      }

      try {
        // Create and save the 12-week plan (NOT approved yet - user must review and approve)
        const now = new Date();
        const startDate = new Date(now);
        startDate.setDate(startDate.getDate() - startDate.getDay() + 1);

        // Extract objective and key results from structured goal
        const goalLines = (state?.structuredGoal || '').split('\n').filter((l) => l.trim());
        const objectiveLine = goalLines.find((l) => l.includes('Objetivo Principal:'));
        const objective = objectiveLine?.replace('Objetivo Principal:', '').trim() || (state?.structuredGoal || '').substring(0, 100);

        const keyResults = goalLines
          .filter((l) => l.trim().startsWith('•') || l.trim().startsWith('-'))
          .map((l) => l.replace(/^[•-]\s*/, '').trim());

        const plan: TwelveWeekPlan = {
          pillarId: pillarId as PillarId,
          objective,
          keyResults: keyResults.length > 0 ? keyResults : [objective],
          weeks: weeklyPlan,
          startDate: startDate.toISOString(),
          createdAt: new Date().toISOString(),
          isApproved: false, // Plan requires explicit approval before syncing to dashboard
        };

        // Save the plan (but don't sync to weekly tasks - that happens on approval)
        await saveTwelveWeekPlan(plan);

        // Track plan generated event
        const pillarInfo = PILLAR_DATA[pillarId] || customPillars.find((p) => p.id === pillarId);
        trackPlanGenerated(pillarInfo?.name || pillarId, weeklyPlan.length);

        // Update state - show plan for review (NOT complete yet)
        setPillarStates((prev) => ({
          ...prev,
          [pillarId]: {
            ...prev[pillarId],
            weeklyPlan,
            step: 3,
            isGeneratingPlan: false,
            isComplete: false, // NOT complete - user must approve
            expandedWeek: 1, // Expand first week by default for review
          },
        }));

        LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
      } catch (error) {
        console.error('Error saving plan:', error);
        Alert.alert('Erro', 'Não foi possível salvar o plano. Tente novamente.');
        setPillarStates((prev) => ({
          ...prev,
          [pillarId]: { ...prev[pillarId], isGeneratingPlan: false },
        }));
      }
      currentPlanPillarRef.current = null;
    },
    onError: () => {
      const pillarId = currentPlanPillarRef.current;
      if (pillarId) {
        Alert.alert('Erro', 'Não foi possível gerar o plano. Tente novamente.');
        setPillarStates((prev) => ({
          ...prev,
          [pillarId]: { ...prev[pillarId], isGeneratingPlan: false },
        }));
        currentPlanPillarRef.current = null;
      }
    },
  });

  // Initialize pillar states and track onboarding start
  useEffect(() => {
    // Track onboarding screen view
    trackScreenView('onboarding');
    trackOnboardingStart();

    const initialStates: Record<string, PillarState> = {};
    Object.keys(PILLAR_DATA).forEach((id) => {
      initialStates[id] = {
        desire: '',
        structuredGoal: '',
        weeklyPlan: null,
        step: 1,
        isGeneratingGoal: false,
        isGeneratingPlan: false,
        isComplete: false,
        expandedWeek: null,
        isSavingApproval: false,
      };
    });
    setPillarStates(initialStates);
    checkExistingPlans();
  }, []);

  // Check for existing plans
  const checkExistingPlans = async () => {
    try {
      const plans = await getTwelveWeekPlans();
      // Count only approved plans as completed
      const planCount = Object.keys(plans).filter((key) => {
        const plan = plans[key as PillarId];
        // For backward compatibility, undefined isApproved is treated as approved
        return plan && (plan.isApproved === true || plan.isApproved === undefined);
      }).length;
      setCompletedPlans(planCount);

      // Mark pillars based on their plan status
      setPillarStates((prev) => {
        const updated = { ...prev };
        Object.keys(plans).forEach((pillarId) => {
          const plan = plans[pillarId as PillarId];
          if (plan && updated[pillarId]) {
            // For backward compatibility, undefined isApproved is treated as approved
            const isApproved = plan.isApproved === true || plan.isApproved === undefined;
            updated[pillarId] = {
              ...updated[pillarId],
              isComplete: isApproved, // Only mark complete if approved
              weeklyPlan: plan.weeks || null,
              expandedWeek: isApproved ? null : 1, // If not approved, expand first week for review
            };
          }
        });
        return updated;
      });
    } catch (error) {
      console.error('Error checking existing plans:', error);
    } finally {
      setIsCheckingPlans(false);
    }
  };

  const handleToggleExpand = useCallback((pillarId: string) => {
    LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    setExpandedPillar((prev) => (prev === pillarId ? null : pillarId));
  }, []);

  const handleUpdatePillarState = useCallback((pillarId: string, updates: Partial<PillarState>) => {
    setPillarStates((prev) => ({
      ...prev,
      [pillarId]: { ...prev[pillarId], ...updates },
    }));
  }, []);

  const handleGenerateGoal = useCallback((pillarId: string) => {
    const state = pillarStates[pillarId];
    if (!state || !state.desire.trim()) return;

    handleUpdatePillarState(pillarId, { isGeneratingGoal: true });
    currentGoalPillarRef.current = pillarId;

    const pillarInfo = PILLAR_DATA[pillarId] || customPillars.find((p) => p.id === pillarId);
    const pillarName = pillarInfo?.name || 'este pilar';

    const prompt = `Você é um especialista em definição de metas. Transforme este desejo bruto: "${state.desire}" em uma meta específica e mensurável para os próximos 12 semanas, na área de ${pillarName}.

Use linguagem natural e motivadora em português brasileiro. Estruture assim:

Objetivo Principal: [Uma frase clara e inspiradora]

Resultados Esperados:
• [Resultado mensurável 1]
• [Resultado mensurável 2]
• [Resultado mensurável 3]

NÃO use o termo "OKR". Seja específico e realista.`;

    generateGoalText(prompt, { maxTokens: 500 });
  }, [pillarStates, customPillars, generateGoalText, handleUpdatePillarState]);

  const handleGeneratePlan = useCallback((pillarId: string) => {
    const state = pillarStates[pillarId];
    if (!state || !state.structuredGoal.trim()) return;

    handleUpdatePillarState(pillarId, { isGeneratingPlan: true });
    currentPlanPillarRef.current = pillarId;

    const prompt = `Crie um plano de execução de 12 semanas para esta meta: "${state.structuredGoal}"

Divida em tarefas específicas semanais. Retorne APENAS um objeto JSON neste formato exato:

{
  "weeks": [
    { "weekNumber": 1, "tasks": ["Tarefa 1", "Tarefa 2", "Tarefa 3"] },
    { "weekNumber": 2, "tasks": ["Tarefa 1", "Tarefa 2"] },
    ...até a semana 12
  ]
}

Regras:
- 2-4 tarefas por semana
- Tarefas devem ser específicas e acionáveis
- Progressão lógica de dificuldade
- Use português brasileiro`;

    generatePlanText(prompt, { maxTokens: 2000 });
  }, [pillarStates, generatePlanText, handleUpdatePillarState]);

  // Update a task in the weekly plan (for editing during review)
  const handleUpdateTask = useCallback(async (pillarId: string, weekNumber: number, taskIndex: number, newText: string) => {
    const state = pillarStates[pillarId];
    if (!state?.weeklyPlan) return;

    try {
      // Update the task in pillarStates
      const updatedWeeklyPlan = state.weeklyPlan.map((week) => {
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
      });

      setPillarStates((prev) => ({
        ...prev,
        [pillarId]: {
          ...prev[pillarId],
          weeklyPlan: updatedWeeklyPlan,
        },
      }));

      // Also update the saved plan in storage
      const plans = await getTwelveWeekPlans();
      const existingPlan = plans[pillarId as PillarId];
      if (existingPlan) {
        const updatedPlan: TwelveWeekPlan = {
          ...existingPlan,
          weeks: updatedWeeklyPlan,
        };
        await saveTwelveWeekPlan(updatedPlan);
      }
    } catch (error) {
      console.error('Error updating task:', error);
    }
  }, [pillarStates]);

  // Approve a plan and sync to weekly tasks
  const handleApprovePlan = useCallback(async (pillarId: string) => {
    const state = pillarStates[pillarId];
    if (!state?.weeklyPlan) return;

    handleUpdatePillarState(pillarId, { isSavingApproval: true });

    try {
      // Get the existing plan from storage
      const plans = await getTwelveWeekPlans();
      const existingPlan = plans[pillarId as PillarId];

      if (!existingPlan) {
        Alert.alert('Erro', 'Plano não encontrado. Tente gerar novamente.');
        handleUpdatePillarState(pillarId, { isSavingApproval: false });
        return;
      }

      // Update plan with approval and latest task edits
      const approvedPlan: TwelveWeekPlan = {
        ...existingPlan,
        weeks: state.weeklyPlan, // Use the latest edited weeklyPlan from state
        isApproved: true,
      };

      // Save the approved plan
      await saveTwelveWeekPlan(approvedPlan);

      // Now sync to weekly tasks (this will add tasks to Dashboard)
      await syncPlanToWeeklyTasks(pillarId as PillarId, approvedPlan);

      // Track plan approved event
      const pillarInfo = PILLAR_DATA[pillarId] || customPillars.find((p) => p.id === pillarId);
      const totalTasks = state.weeklyPlan.reduce((sum, week) => sum + week.tasks.length, 0);
      trackPlanApproved(pillarInfo?.name || pillarId, totalTasks);

      // Update state to mark as complete
      setPillarStates((prev) => ({
        ...prev,
        [pillarId]: {
          ...prev[pillarId],
          isComplete: true,
          isSavingApproval: false,
        },
      }));

      setCompletedPlans((prev) => prev + 1);
      LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
    } catch (error) {
      console.error('Error approving plan:', error);
      Alert.alert('Erro', 'Não foi possível aprovar o plano. Tente novamente.');
      handleUpdatePillarState(pillarId, { isSavingApproval: false });
    }
  }, [pillarStates, handleUpdatePillarState, customPillars]);

  const handleAddCustomPillar = useCallback(() => {
    Alert.prompt(
      'Novo Pilar',
      'Digite o nome do seu pilar personalizado:',
      [
        { text: 'Cancelar', style: 'cancel' },
        {
          text: 'Adicionar',
          onPress: (name: string | undefined) => {
            if (!name?.trim()) return;
            const id = `custom-${Date.now()}`;
            const newPillar: PillarInfo = {
              id,
              name: name.trim(),
              icon: 'star',
              color: '#9E9E9E',
              examples: [
                'Defina sua primeira meta',
                'Estabeleça marcos de progresso',
                'Crie hábitos diários',
                'Meça seus resultados',
                'Celebre conquistas',
              ],
              isCustom: true,
            };
            setCustomPillars((prev) => [...prev, newPillar]);
            setPillarStates((prev) => ({
              ...prev,
              [id]: {
                desire: '',
                structuredGoal: '',
                weeklyPlan: null,
                step: 1,
                isGeneratingGoal: false,
                isGeneratingPlan: false,
                isComplete: false,
                expandedWeek: null,
                isSavingApproval: false,
              },
            }));
            LayoutAnimation.configureNext(LayoutAnimation.Presets.easeInEaseOut);
          },
        },
      ],
      'plain-text'
    );
  }, []);

  const handleGoToExecution = async () => {
    try {
      await setOnboardingCompleted(true);
      router.replace('/(tabs)');
    } catch (error) {
      console.error('Error completing onboarding:', error);
      Alert.alert('Erro', 'Não foi possível continuar. Tente novamente.');
    }
  };

  const allPillars = [...Object.values(PILLAR_DATA), ...customPillars];

  if (isCheckingPlans) {
    return (
      <View style={[styles.container, styles.loadingContainer, { paddingTop: insets.top }]}>
        <ActivityIndicator size="large" color={Colors.goldenAmber} />
        <Text style={styles.loadingText}>Carregando seus planos...</Text>
      </View>
    );
  }

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>CENTRAL DE PLANEJAMENTO</Text>
        <Text style={styles.subtitle}>Defina metas para cada área da sua vida</Text>
        {completedPlans > 0 && (
          <View style={styles.progressBadge}>
            <MaterialIcons name="check-circle" size={16} color={Colors.sageGreen} />
            <Text style={styles.progressText}>{completedPlans} {completedPlans === 1 ? 'pilar planejado' : 'pilares planejados'}</Text>
          </View>
        )}
      </View>

      {/* Pillars List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={[
          styles.scrollContent,
          { paddingBottom: insets.bottom + 100 },
        ]}
        showsVerticalScrollIndicator={false}
      >
        {allPillars.map((pillar) => (
          <ExpandablePillarCard
            key={pillar.id}
            pillarInfo={pillar}
            state={pillarStates[pillar.id] || {
              desire: '',
              structuredGoal: '',
              weeklyPlan: null,
              step: 1,
              isGeneratingGoal: false,
              isGeneratingPlan: false,
              isComplete: false,
              expandedWeek: null,
              isSavingApproval: false,
            }}
            isExpanded={expandedPillar === pillar.id}
            onToggleExpand={() => handleToggleExpand(pillar.id)}
            onUpdateState={(updates) => handleUpdatePillarState(pillar.id, updates)}
            onGenerateGoal={() => handleGenerateGoal(pillar.id)}
            onGeneratePlan={() => handleGeneratePlan(pillar.id)}
            onUpdateTask={(weekNumber, taskIndex, newText) => handleUpdateTask(pillar.id, weekNumber, taskIndex, newText)}
            onApprovePlan={() => handleApprovePlan(pillar.id)}
          />
        ))}

        {/* Add Custom Pillar Button */}
        <TouchableOpacity
          style={styles.addPillarButton}
          onPress={handleAddCustomPillar}
        >
          <MaterialIcons name="add-circle-outline" size={24} color={Colors.slate} />
          <Text style={styles.addPillarText}>Adicionar Pilar Personalizado</Text>
        </TouchableOpacity>
      </ScrollView>

      {/* Footer - Fixed CTA */}
      <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
        <TouchableOpacity
          style={[styles.ctaButton, completedPlans === 0 && styles.ctaButtonDisabled]}
          onPress={handleGoToExecution}
          disabled={completedPlans === 0}
        >
          <Text style={[styles.ctaButtonText, completedPlans === 0 && styles.ctaButtonTextDisabled]}>
            Ir para a Execução
          </Text>
          <MaterialIcons
            name="arrow-forward"
            size={24}
            color={completedPlans === 0 ? Colors.lightSlate : Colors.deepNavy}
          />
        </TouchableOpacity>
        {completedPlans === 0 && (
          <Text style={styles.ctaHint}>Complete pelo menos 1 pilar para continuar</Text>
        )}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    flex: 1,
    backgroundColor: Colors.deepNavy,
  },
  loadingContainer: {
    justifyContent: 'center',
    alignItems: 'center',
  },
  loadingText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.lightSlate,
    marginTop: Spacing.lg,
  },
  header: {
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    letterSpacing: 1,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.lightSlate,
    marginTop: Spacing.xs,
  },
  progressBadge: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sageGreen + '20',
    alignSelf: 'flex-start',
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.full,
    marginTop: Spacing.md,
    gap: Spacing.xs,
  },
  progressText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.sageGreen,
    fontWeight: Typography.weights.medium,
  },
  scrollView: {
    flex: 1,
    backgroundColor: Colors.paperWhite,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  scrollContent: {
    padding: Spacing.lg,
    gap: Spacing.md,
  },

  // Pillar Card
  pillarCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    overflow: 'hidden',
  },
  pillarCardComplete: {
    borderColor: Colors.sageGreen,
    borderWidth: 2,
  },
  pillarCardHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    padding: Spacing.md,
    gap: Spacing.md,
  },
  pillarIconContainer: {
    width: 48,
    height: 48,
    borderRadius: 24,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarHeaderText: {
    flex: 1,
  },
  pillarName: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  pillarCompleteLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.sageGreen,
    marginTop: 2,
  },

  // Expanded Content
  pillarExpandedContent: {
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    paddingHorizontal: Spacing.md,
    paddingBottom: Spacing.lg,
  },

  // Step Container
  stepContainer: {
    paddingTop: Spacing.lg,
  },
  stepHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.md,
  },
  stepBadge: {
    width: 24,
    height: 24,
    borderRadius: 12,
    backgroundColor: '#E2E8F0',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBadgeActive: {
    backgroundColor: Colors.goldenAmber,
  },
  stepBadgeText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.slate,
  },
  stepBadgeTextActive: {
    color: Colors.deepNavy,
  },
  stepTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },

  // Educational Box
  educationalBox: {
    backgroundColor: Colors.goldenAmber + '15',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  educationalHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  educationalTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  educationalText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    lineHeight: 20,
  },
  educationalExamples: {
    marginVertical: Spacing.sm,
    gap: Spacing.xs,
    backgroundColor: Colors.paperWhite,
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
  },
  educationalFormula: {
    backgroundColor: Colors.deepNavy + '10',
    padding: Spacing.sm,
    borderRadius: BorderRadius.sm,
    marginVertical: Spacing.xs,
    borderLeftWidth: 3,
    borderLeftColor: Colors.goldenAmber,
  },
  formulaTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    marginBottom: Spacing.xs,
  },
  formulaText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    lineHeight: 22,
  },
  formulaExample: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
  },
  educationalTip: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    lineHeight: 20,
    marginTop: Spacing.xs,
  },
  boldText: {
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  vagueText: {
    fontWeight: Typography.weights.medium,
    color: '#DC2626',
  },
  specificText: {
    fontWeight: Typography.weights.medium,
    color: Colors.sageGreen,
  },

  // Goal Input
  goalInput: {
    backgroundColor: Colors.paperWhite,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    padding: Spacing.md,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    minHeight: 100,
    marginBottom: Spacing.md,
  },

  // Examples
  examplesContainer: {
    backgroundColor: '#F1F5F9',
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
  },
  examplesLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    marginBottom: Spacing.xs,
  },
  exampleText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    fontStyle: 'italic',
  },

  // Action Button
  actionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldenAmber,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  actionButtonSecondary: {
    backgroundColor: Colors.deepNavy,
  },
  actionButtonDisabled: {
    opacity: 0.6,
  },
  actionButtonIcon: {
    fontSize: 20,
  },
  actionButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  actionButtonTextSecondary: {
    color: Colors.paperWhite,
  },

  // Structured Goal
  structuredGoalContainer: {
    backgroundColor: Colors.paperWhite,
    borderRadius: BorderRadius.sm,
    borderWidth: 1,
    borderColor: Colors.goldenAmber,
    padding: Spacing.md,
  },
  structuredGoalInput: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    minHeight: 120,
  },
  regenerateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.xs,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    marginTop: Spacing.md,
  },
  regenerateText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },

  // Success
  successContainer: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
  },
  successTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.sageGreen,
    marginTop: Spacing.md,
  },
  successSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginTop: Spacing.xs,
  },

  // Add Pillar Button
  addPillarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderRadius: BorderRadius.md,
    borderWidth: 2,
    borderStyle: 'dashed',
    borderColor: '#CBD5E1',
    gap: Spacing.sm,
    marginTop: Spacing.sm,
  },
  addPillarText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.slate,
  },

  // Footer
  footer: {
    position: 'absolute',
    bottom: 0,
    left: 0,
    right: 0,
    backgroundColor: Colors.paperWhite,
    paddingHorizontal: Spacing.lg,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    shadowColor: '#000',
    shadowOffset: { width: 0, height: -4 },
    shadowOpacity: 0.1,
    shadowRadius: 8,
    elevation: 8,
  },
  ctaButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldenAmber,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  ctaButtonDisabled: {
    backgroundColor: '#E2E8F0',
  },
  ctaButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  ctaButtonTextDisabled: {
    color: Colors.lightSlate,
  },
  ctaHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },

  // Plan Review Container
  planReviewContainer: {
    backgroundColor: Colors.paperWhite,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.goldenAmber,
  },
  planReviewHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
    marginBottom: Spacing.xs,
  },
  planReviewTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },
  planReviewSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginBottom: Spacing.md,
  },
  reviewWeeksContainer: {
    marginBottom: Spacing.md,
    maxHeight: 300,
  },

  // Review Week Accordion
  reviewWeekAccordion: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.sm,
    marginBottom: Spacing.xs,
    overflow: 'hidden',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  reviewWeekHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.sm,
    paddingHorizontal: Spacing.md,
  },
  reviewWeekHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  reviewWeekTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.deepNavy,
    marginLeft: Spacing.xs,
  },
  reviewWeekTaskCount: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
  },
  reviewWeekContent: {
    padding: Spacing.sm,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },

  // Review Task Item
  reviewTaskItem: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  reviewTaskCheckbox: {
    width: 16,
    height: 16,
    borderRadius: 3,
    borderWidth: 1.5,
    borderColor: Colors.lightSlate,
    marginRight: Spacing.sm,
    marginTop: 4,
  },
  reviewTaskInput: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    flex: 1,
    lineHeight: 18,
    padding: Spacing.xs,
    paddingTop: Spacing.xs,
    marginLeft: -Spacing.xs,
    borderRadius: BorderRadius.sm,
    backgroundColor: 'transparent',
    minHeight: 32,
  },
  reviewTaskInputFocused: {
    backgroundColor: '#F8FAFC',
    borderWidth: 1,
    borderColor: Colors.goldenAmber,
  },
  reviewEditHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
    fontStyle: 'italic',
    marginTop: Spacing.xs,
    textAlign: 'center',
  },
  reviewNoTasksText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    fontStyle: 'italic',
    paddingVertical: Spacing.xs,
  },

  // Approve Button
  approveButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.sageGreen,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
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
  approveHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
