import React, { useState, useMemo, useEffect } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  TextInput,
  ActivityIndicator,
  KeyboardAvoidingView,
  Platform,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS } from '@/constants/theme';
import {
  TwelveWeekPlan,
  calculateCurrentWeek,
  toggleGovernanceRitual,
  WeeklyTask,
} from '@/services/storage';
import { trackWeeklyReviewCompleted } from '@/services/analytics';

interface WeeklyReviewModalProps {
  visible: boolean;
  onClose: () => void;
  plans: TwelveWeekPlan[];
  onComplete: () => void;
}

type Step = 1 | 2 | 3;

// Get score color and label based on percentage
function getScoreInfo(percentage: number): { color: string; emoji: string; label: string } {
  if (percentage >= 80) return { color: Colors.sageGreen, emoji: '🔥', label: 'Excelente!' };
  if (percentage >= 60) return { color: Colors.goldenAmber, emoji: '💪', label: 'Bom trabalho!' };
  if (percentage >= 40) return { color: '#F59E0B', emoji: '⚠️', label: 'Pode melhorar' };
  return { color: Colors.error, emoji: '🚨', label: 'Atenção!' };
}

export default function WeeklyReviewModal({
  visible,
  onClose,
  plans,
  onComplete,
}: WeeklyReviewModalProps) {
  const insets = useSafeAreaInsets();
  const [currentStep, setCurrentStep] = useState<Step>(1);
  const [whatWorked, setWhatWorked] = useState('');
  const [obstacles, setObstacles] = useState('');
  const [aiMotivation, setAiMotivation] = useState('');
  const [aiTip, setAiTip] = useState('');
  const [isFinishing, setIsFinishing] = useState(false);

  // Calculate current week based on earliest plan start date
  const currentWeek = useMemo(() => {
    if (plans.length === 0) return 1;
    const earliestStart = plans.reduce((earliest, plan) => {
      const planStart = new Date(plan.startDate);
      return planStart < earliest ? planStart : earliest;
    }, new Date(plans[0].startDate));
    return calculateCurrentWeek(earliestStart.toISOString());
  }, [plans]);

  // Calculate Weekly Score
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

  // Get tasks for next week
  const nextWeekTasks = useMemo(() => {
    const nextWeek = currentWeek + 1;
    const tasks: { pillarId: string; pillarName: string; pillarColor: string; tasks: WeeklyTask[] }[] = [];

    plans.forEach(plan => {
      const weekPlan = plan.weeks.find(w => w.weekNumber === nextWeek);
      if (weekPlan && weekPlan.tasks.length > 0) {
        const pillar = PILLARS.find(p => p.id === plan.pillarId);
        tasks.push({
          pillarId: plan.pillarId,
          pillarName: pillar?.name || plan.pillarId,
          pillarColor: pillar?.color || Colors.slate,
          tasks: weekPlan.tasks,
        });
      }
    });

    return tasks;
  }, [plans, currentWeek]);

  const scoreInfo = getScoreInfo(weeklyScore.percentage);

  // AI for motivational comment
  const { generateText: generateMotivation, isLoading: isLoadingMotivation } = useTextGeneration({
    onSuccess: (text) => {
      setAiMotivation(text.trim());
    },
    onError: () => {
      setAiMotivation('Continue focado nos seus objetivos!');
    },
  });

  // AI for tactical tip
  const { generateText: generateTip, isLoading: isLoadingTip } = useTextGeneration({
    onSuccess: (text) => {
      setAiTip(text.trim());
    },
    onError: () => {
      setAiTip('Tente dividir as tarefas em partes menores e mais gerenciáveis.');
    },
  });

  // Generate motivational comment when step 1 loads
  useEffect(() => {
    if (visible && currentStep === 1 && !aiMotivation && plans.length > 0) {
      const prompt = `Baseado em um score de execução semanal de ${weeklyScore.percentage}%, gere UMA frase curta e motivacional em português brasileiro (máximo 15 palavras). Seja encorajador mas realista. Não use emojis. Não repita o percentual.`;
      generateMotivation(prompt, { maxTokens: 50 });
    }
  }, [visible, currentStep, aiMotivation, weeklyScore.percentage, plans.length, generateMotivation]);

  // Generate tip when user fills obstacles
  const handleGenerateTip = () => {
    if (obstacles.trim().length > 10) {
      const prompt = `O usuário disse que os obstáculos da semana foram: "${obstacles}".
Gere UMA dica tática específica e acionável em português brasileiro para superar esse obstáculo na próxima semana. Máximo 25 palavras. Seja direto e prático. Não use emojis.`;
      generateTip(prompt, { maxTokens: 80 });
    }
  };

  const handleNext = () => {
    if (currentStep === 2 && obstacles.trim().length > 10 && !aiTip) {
      handleGenerateTip();
    }
    if (currentStep < 3) {
      setCurrentStep((prev) => (prev + 1) as Step);
    }
  };

  const handleBack = () => {
    if (currentStep > 1) {
      setCurrentStep((prev) => (prev - 1) as Step);
    }
  };

  const handleFinish = async () => {
    setIsFinishing(true);
    try {
      // Mark the weekly review ritual as done
      await toggleGovernanceRitual('weeklyReview');

      // Track weekly review completion with week number and score
      trackWeeklyReviewCompleted(currentWeek, weeklyScore.percentage);

      onComplete();
      // Reset state for next time
      setTimeout(() => {
        setCurrentStep(1);
        setWhatWorked('');
        setObstacles('');
        setAiMotivation('');
        setAiTip('');
        setIsFinishing(false);
      }, 300);
    } catch (error) {
      console.error('Error completing weekly review:', error);
      setIsFinishing(false);
    }
  };

  const handleClose = () => {
    onClose();
    // Reset after animation
    setTimeout(() => {
      setCurrentStep(1);
      setWhatWorked('');
      setObstacles('');
      setAiMotivation('');
      setAiTip('');
    }, 300);
  };

  const renderStepIndicator = () => (
    <View style={styles.stepIndicator}>
      {[1, 2, 3].map((step) => (
        <View key={step} style={styles.stepDotContainer}>
          <View
            style={[
              styles.stepDot,
              currentStep >= step && styles.stepDotActive,
              currentStep === step && styles.stepDotCurrent,
            ]}
          >
            {currentStep > step && (
              <MaterialIcons name="check" size={12} color={Colors.paperWhite} />
            )}
          </View>
          {step < 3 && (
            <View style={[styles.stepLine, currentStep > step && styles.stepLineActive]} />
          )}
        </View>
      ))}
    </View>
  );

  const renderStep1 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="analytics" size={32} color={scoreInfo.color} />
        <Text style={styles.stepTitle}>O Espelho</Text>
        <Text style={styles.stepSubtitle}>Seu desempenho na Semana {currentWeek}</Text>
      </View>

      {/* Score Display */}
      <View style={[styles.scoreCard, { borderColor: scoreInfo.color }]}>
        <Text style={styles.scoreEmoji}>{scoreInfo.emoji}</Text>
        <Text style={[styles.scorePercentage, { color: scoreInfo.color }]}>
          {weeklyScore.percentage}%
        </Text>
        <Text style={[styles.scoreLabel, { color: scoreInfo.color }]}>{scoreInfo.label}</Text>
        <Text style={styles.scoreDetail}>
          {weeklyScore.completed} de {weeklyScore.total} tarefas concluídas
        </Text>
      </View>

      {/* AI Motivation */}
      <View style={styles.aiCommentContainer}>
        {isLoadingMotivation ? (
          <View style={styles.aiLoading}>
            <ActivityIndicator size="small" color={Colors.goldenAmber} />
            <Text style={styles.aiLoadingText}>Gerando insight...</Text>
          </View>
        ) : aiMotivation ? (
          <View style={styles.aiComment}>
            <MaterialIcons name="auto-awesome" size={18} color={Colors.goldenAmber} />
            <Text style={styles.aiCommentText}>&ldquo;{aiMotivation}&rdquo;</Text>
          </View>
        ) : null}
      </View>

      {/* Pillar Breakdown */}
      <View style={styles.pillarBreakdown}>
        <Text style={styles.pillarBreakdownTitle}>Por Pilar:</Text>
        {plans.map((plan) => {
          const pillar = PILLARS.find(p => p.id === plan.pillarId);
          const weekPlan = plan.weeks.find(w => w.weekNumber === currentWeek);
          const completed = weekPlan?.tasks.filter(t => t.completed).length || 0;
          const total = weekPlan?.tasks.length || 0;
          const pct = total > 0 ? Math.round((completed / total) * 100) : 0;

          return (
            <View key={plan.pillarId} style={styles.pillarRow}>
              <View style={[styles.pillarDot, { backgroundColor: pillar?.color }]} />
              <Text style={styles.pillarName}>{pillar?.name}</Text>
              <Text style={styles.pillarScore}>{pct}%</Text>
            </View>
          );
        })}
      </View>
    </View>
  );

  const renderStep2 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="edit-note" size={32} color={Colors.goldenAmber} />
        <Text style={styles.stepTitle}>Reflexão</Text>
        <Text style={styles.stepSubtitle}>O que você aprendeu esta semana?</Text>
      </View>

      {/* What Worked */}
      <View style={styles.reflectionSection}>
        <Text style={styles.reflectionLabel}>
          <MaterialIcons name="thumb-up" size={16} color={Colors.sageGreen} /> O que funcionou bem?
        </Text>
        <TextInput
          style={styles.reflectionInput}
          placeholder="Ex: Acordar mais cedo me deu mais tempo para as tarefas..."
          placeholderTextColor={Colors.lightSlate}
          value={whatWorked}
          onChangeText={setWhatWorked}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* Obstacles */}
      <View style={styles.reflectionSection}>
        <Text style={styles.reflectionLabel}>
          <MaterialIcons name="warning" size={16} color={Colors.error} /> O que atrapalhou?
        </Text>
        <TextInput
          style={styles.reflectionInput}
          placeholder="Ex: Reuniões inesperadas consumiram meu tempo..."
          placeholderTextColor={Colors.lightSlate}
          value={obstacles}
          onChangeText={setObstacles}
          onBlur={() => {
            if (obstacles.trim().length > 10 && !aiTip) {
              handleGenerateTip();
            }
          }}
          multiline
          textAlignVertical="top"
        />
      </View>

      {/* AI Tip */}
      {(isLoadingTip || aiTip) && (
        <View style={styles.aiTipContainer}>
          {isLoadingTip ? (
            <View style={styles.aiLoading}>
              <ActivityIndicator size="small" color={Colors.goldenAmber} />
              <Text style={styles.aiLoadingText}>Gerando dica...</Text>
            </View>
          ) : (
            <View style={styles.aiTip}>
              <View style={styles.aiTipHeader}>
                <MaterialIcons name="lightbulb" size={18} color={Colors.goldenAmber} />
                <Text style={styles.aiTipTitle}>Dica para a próxima semana:</Text>
              </View>
              <Text style={styles.aiTipText}>{aiTip}</Text>
            </View>
          )}
        </View>
      )}
    </View>
  );

  const renderStep3 = () => (
    <View style={styles.stepContent}>
      <View style={styles.stepHeader}>
        <MaterialIcons name="event" size={32} color={Colors.deepNavy} />
        <Text style={styles.stepTitle}>Olhar Adiante</Text>
        <Text style={styles.stepSubtitle}>Prévia da Semana {currentWeek + 1}</Text>
      </View>

      {nextWeekTasks.length > 0 ? (
        <ScrollView style={styles.nextWeekScroll} nestedScrollEnabled>
          {nextWeekTasks.map((pillarGroup) => (
            <View key={pillarGroup.pillarId} style={styles.nextWeekPillar}>
              <View style={styles.nextWeekPillarHeader}>
                <View style={[styles.pillarDot, { backgroundColor: pillarGroup.pillarColor }]} />
                <Text style={styles.nextWeekPillarName}>{pillarGroup.pillarName}</Text>
                <Text style={styles.nextWeekTaskCount}>
                  {pillarGroup.tasks.length} tarefa{pillarGroup.tasks.length > 1 ? 's' : ''}
                </Text>
              </View>
              {pillarGroup.tasks.map((task) => (
                <View key={task.id} style={styles.nextWeekTask}>
                  <View style={styles.nextWeekTaskBullet} />
                  <Text style={styles.nextWeekTaskText} numberOfLines={2}>
                    {task.title}
                  </Text>
                </View>
              ))}
            </View>
          ))}
        </ScrollView>
      ) : (
        <View style={styles.emptyNextWeek}>
          <MaterialIcons name="event-busy" size={48} color={Colors.lightSlate} />
          <Text style={styles.emptyNextWeekTitle}>Semana {currentWeek + 1} sem tarefas</Text>
          <Text style={styles.emptyNextWeekText}>
            Vá para a aba Planejamento para definir suas tarefas da próxima semana.
          </Text>
        </View>
      )}

      {/* Finish Summary */}
      <View style={styles.finishSummary}>
        <MaterialIcons name="check-circle" size={20} color={Colors.sageGreen} />
        <Text style={styles.finishSummaryText}>
          Ao finalizar, a revisão semanal será marcada como concluída.
        </Text>
      </View>
    </View>
  );

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={handleClose}>
      <KeyboardAvoidingView
        style={styles.container}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
      >
        <View style={[styles.container, { paddingTop: insets.top }]}>
          {/* Header */}
          <View style={styles.header}>
            <View style={styles.headerContent}>
              <Text style={styles.headerTitle}>Revisão Semanal</Text>
              <Text style={styles.headerSubtitle}>Passo {currentStep} de 3</Text>
            </View>
            <TouchableOpacity style={styles.closeButton} onPress={handleClose}>
              <MaterialIcons name="close" size={24} color={Colors.paperWhite} />
            </TouchableOpacity>
          </View>

          {/* Step Indicator */}
          {renderStepIndicator()}

          {/* Content */}
          <ScrollView
            style={styles.scrollView}
            contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
            showsVerticalScrollIndicator={false}
            keyboardShouldPersistTaps="handled"
          >
            {currentStep === 1 && renderStep1()}
            {currentStep === 2 && renderStep2()}
            {currentStep === 3 && renderStep3()}
          </ScrollView>

          {/* Footer Navigation */}
          <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
            <View style={styles.footerButtons}>
              {currentStep > 1 && (
                <TouchableOpacity style={styles.backButton} onPress={handleBack}>
                  <MaterialIcons name="arrow-back" size={20} color={Colors.slate} />
                  <Text style={styles.backButtonText}>Voltar</Text>
                </TouchableOpacity>
              )}
              <View style={{ flex: 1 }} />
              {currentStep < 3 ? (
                <TouchableOpacity style={styles.nextButton} onPress={handleNext}>
                  <Text style={styles.nextButtonText}>Próximo</Text>
                  <MaterialIcons name="arrow-forward" size={20} color={Colors.deepNavy} />
                </TouchableOpacity>
              ) : (
                <TouchableOpacity
                  style={[styles.finishButton, isFinishing && styles.finishButtonDisabled]}
                  onPress={handleFinish}
                  disabled={isFinishing}
                >
                  {isFinishing ? (
                    <ActivityIndicator size="small" color={Colors.paperWhite} />
                  ) : (
                    <>
                      <MaterialIcons name="celebration" size={20} color={Colors.paperWhite} />
                      <Text style={styles.finishButtonText}>Finalizar Semana</Text>
                    </>
                  )}
                </TouchableOpacity>
              )}
            </View>
          </View>
        </View>
      </KeyboardAvoidingView>
    </Modal>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.md,
    paddingBottom: Spacing.md,
  },
  headerContent: {
    flex: 1,
  },
  headerTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['2xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    fontStyle: 'italic',
  },
  headerSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.lightSlate,
    marginTop: Spacing.xs,
  },
  closeButton: {
    width: 40,
    height: 40,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },

  // Step Indicator
  stepIndicator: {
    flexDirection: 'row',
    justifyContent: 'center',
    alignItems: 'center',
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.lg,
  },
  stepDotContainer: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  stepDot: {
    width: 28,
    height: 28,
    borderRadius: 14,
    backgroundColor: 'rgba(255,255,255,0.2)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepDotActive: {
    backgroundColor: Colors.sageGreen,
  },
  stepDotCurrent: {
    backgroundColor: Colors.goldenAmber,
  },
  stepLine: {
    width: 40,
    height: 3,
    backgroundColor: 'rgba(255,255,255,0.2)',
    marginHorizontal: Spacing.xs,
  },
  stepLineActive: {
    backgroundColor: Colors.sageGreen,
  },

  // Scroll View
  scrollView: {
    flex: 1,
    backgroundColor: Colors.paperWhite,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  scrollContent: {
    padding: Spacing.lg,
  },

  // Step Content
  stepContent: {
    flex: 1,
  },
  stepHeader: {
    alignItems: 'center',
    marginBottom: Spacing.xl,
  },
  stepTitle: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes.xl,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
    marginTop: Spacing.sm,
  },
  stepSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginTop: Spacing.xs,
  },

  // Score Card (Step 1)
  scoreCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.lg,
    padding: Spacing.xl,
    alignItems: 'center',
    borderWidth: 3,
    marginBottom: Spacing.lg,
    ...Shadows.md,
  },
  scoreEmoji: {
    fontSize: 48,
    marginBottom: Spacing.sm,
  },
  scorePercentage: {
    fontFamily: Typography.heading,
    fontSize: 64,
    fontWeight: Typography.weights.bold,
  },
  scoreLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
  },
  scoreDetail: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginTop: Spacing.sm,
  },

  // AI Comment
  aiCommentContainer: {
    marginBottom: Spacing.lg,
    minHeight: 50,
  },
  aiLoading: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: Spacing.sm,
    paddingVertical: Spacing.md,
  },
  aiLoadingText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
  },
  aiComment: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.goldenAmber + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  aiCommentText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    fontStyle: 'italic',
    lineHeight: 22,
  },

  // Pillar Breakdown
  pillarBreakdown: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
  },
  pillarBreakdownTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.slate,
    marginBottom: Spacing.sm,
  },
  pillarRow: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.xs,
  },
  pillarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  pillarName: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
  },
  pillarScore: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.deepNavy,
  },

  // Reflection (Step 2)
  reflectionSection: {
    marginBottom: Spacing.lg,
  },
  reflectionLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
    marginBottom: Spacing.sm,
  },
  reflectionInput: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    minHeight: 100,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },

  // AI Tip
  aiTipContainer: {
    marginBottom: Spacing.lg,
  },
  aiTip: {
    backgroundColor: Colors.goldenAmber + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    borderLeftWidth: 4,
    borderLeftColor: Colors.goldenAmber,
  },
  aiTipHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    marginBottom: Spacing.xs,
  },
  aiTipTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  aiTipText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    lineHeight: 22,
  },

  // Next Week (Step 3)
  nextWeekScroll: {
    maxHeight: 300,
    marginBottom: Spacing.lg,
  },
  nextWeekPillar: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.sm,
  },
  nextWeekPillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    marginBottom: Spacing.sm,
    paddingBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  nextWeekPillarName: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
    marginLeft: Spacing.sm,
  },
  nextWeekTaskCount: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
  },
  nextWeekTask: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    paddingVertical: Spacing.xs,
  },
  nextWeekTaskBullet: {
    width: 6,
    height: 6,
    borderRadius: 3,
    backgroundColor: Colors.lightSlate,
    marginTop: 6,
    marginRight: Spacing.sm,
  },
  nextWeekTaskText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    lineHeight: 20,
  },

  // Empty Next Week
  emptyNextWeek: {
    alignItems: 'center',
    paddingVertical: Spacing.xl,
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.lg,
  },
  emptyNextWeekTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
    marginTop: Spacing.md,
  },
  emptyNextWeekText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.xs,
    paddingHorizontal: Spacing.lg,
    lineHeight: 20,
  },

  // Finish Summary
  finishSummary: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sageGreen + '15',
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    gap: Spacing.sm,
  },
  finishSummaryText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.sageGreen,
    lineHeight: 20,
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
    ...Shadows.lg,
  },
  footerButtons: {
    flexDirection: 'row',
    alignItems: 'center',
  },
  backButton: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.md,
    gap: Spacing.xs,
  },
  backButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.slate,
  },
  nextButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.goldenAmber,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  nextButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  finishButton: {
    flexDirection: 'row',
    alignItems: 'center',
    backgroundColor: Colors.sageGreen,
    paddingVertical: Spacing.md,
    paddingHorizontal: Spacing.xl,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  finishButtonDisabled: {
    opacity: 0.7,
  },
  finishButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.paperWhite,
  },
});
