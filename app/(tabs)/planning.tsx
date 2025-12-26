import React, { useState, useCallback, useEffect } from 'react';
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
import { MaterialIcons } from '@expo/vector-icons';
import { router, useFocusEffect } from 'expo-router';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS, PillarId } from '@/constants/theme';
import { getPillarGoals, savePillarGoal, getTwelveWeekPlans, PillarGoal, TwelveWeekPlan } from '@/services/storage';
import { trackScreenView, trackGoalDefined } from '@/services/analytics';

interface PillarCardProps {
  pillar: typeof PILLARS[number];
  goal: PillarGoal | null;
  hasPlan: boolean;
  isExpanded: boolean;
  onToggle: () => void;
  onGenerateOKR: (pillarId: PillarId, desire: string) => void;
  onSaveOKR: (pillarId: PillarId, okr: string) => Promise<void>;
  isGenerating: boolean;
}

function PillarCard({
  pillar,
  goal,
  hasPlan,
  isExpanded,
  onToggle,
  onGenerateOKR,
  onSaveOKR,
  isGenerating,
}: PillarCardProps) {
  const [desire, setDesire] = useState(goal?.desire || '');
  const [editedOkr, setEditedOkr] = useState(goal?.okr || '');
  const [isSavingOkr, setIsSavingOkr] = useState(false);
  const hasOkr = goal?.okr && goal.okr.length > 0;

  // Update local state when goal changes (e.g., after AI generation)
  useEffect(() => {
    if (goal?.okr) {
      setEditedOkr(goal.okr);
    }
  }, [goal?.okr]);

  // Save OKR on blur
  const handleOkrBlur = async () => {
    if (editedOkr.trim() && editedOkr !== goal?.okr) {
      setIsSavingOkr(true);
      await onSaveOKR(pillar.id, editedOkr.trim());
      setIsSavingOkr(false);
    }
  };

  // Handle "Generate 12 Week Plan" - save first, then navigate
  const handleGeneratePlan = async () => {
    // Save any pending OKR changes before navigating
    if (editedOkr.trim() && editedOkr !== goal?.okr) {
      setIsSavingOkr(true);
      await onSaveOKR(pillar.id, editedOkr.trim());
      setIsSavingOkr(false);
    }
    router.push(`/pillar/${pillar.id}`);
  };

  const handleGenerateOKR = () => {
    if (!desire.trim()) {
      Alert.alert('Atenção', 'Digite seu desejo/objetivo primeiro.');
      return;
    }
    onGenerateOKR(pillar.id, desire);
  };

  const getIconName = (): keyof typeof MaterialIcons.glyphMap => {
    switch (pillar.id) {
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
    <View style={[styles.pillarCard, Shadows.sm]}>
      <TouchableOpacity style={styles.pillarHeader} onPress={onToggle} activeOpacity={0.7}>
        <View style={styles.pillarHeaderLeft}>
          <View style={[styles.pillarIcon, { backgroundColor: pillar.color + '20' }]}>
            <MaterialIcons name={getIconName()} size={24} color={pillar.color} />
          </View>
          <View style={styles.pillarInfo}>
            <Text style={styles.pillarName}>{pillar.name}</Text>
            {hasOkr && !isExpanded && (
              <Text style={styles.pillarSubtitle} numberOfLines={1}>
                {goal?.okr?.split('\n')[0]}
              </Text>
            )}
          </View>
        </View>
        <View style={styles.pillarHeaderRight}>
          {hasOkr && (
            <View style={styles.okrBadge}>
              <Text style={styles.okrBadgeText}>OKR</Text>
            </View>
          )}
          <MaterialIcons
            name={isExpanded ? 'expand-less' : 'expand-more'}
            size={24}
            color={Colors.slate}
          />
        </View>
      </TouchableOpacity>

      {isExpanded && (
        <View style={styles.pillarContent}>
          <Text style={styles.inputLabel}>Seu Desejo/Objetivo:</Text>
          <TextInput
            style={styles.desireInput}
            placeholder="Ex: Atingir R$ 100k de receita anual, Perder 10kg..."
            placeholderTextColor={Colors.lightSlate}
            value={desire}
            onChangeText={setDesire}
            multiline
            numberOfLines={3}
          />

          <TouchableOpacity
            style={[styles.generateButton, isGenerating && styles.generateButtonDisabled]}
            onPress={handleGenerateOKR}
            disabled={isGenerating}
          >
            {isGenerating ? (
              <ActivityIndicator color={Colors.deepNavy} size="small" />
            ) : (
              <>
                <MaterialIcons name="auto-awesome" size={20} color={Colors.deepNavy} />
                <Text style={styles.generateButtonText}>Gerar OKR com IA</Text>
              </>
            )}
          </TouchableOpacity>

          {hasOkr && (
            <View style={styles.okrResult}>
              <View style={styles.okrResultHeader}>
                <Text style={styles.okrResultTitle}>OKR Definido:</Text>
                {isSavingOkr && (
                  <View style={styles.savingIndicator}>
                    <ActivityIndicator size="small" color={Colors.sageGreen} />
                    <Text style={styles.savingText}>Salvando...</Text>
                  </View>
                )}
              </View>
              <TextInput
                style={styles.okrEditInput}
                value={editedOkr}
                onChangeText={setEditedOkr}
                onBlur={handleOkrBlur}
                multiline
                textAlignVertical="top"
                placeholder="Digite seu OKR..."
                placeholderTextColor={Colors.lightSlate}
              />
              <Text style={styles.editHint}>Toque para editar o OKR</Text>

              <TouchableOpacity
                style={[
                  styles.planButton,
                  hasPlan && styles.planButtonExisting,
                  isSavingOkr && styles.planButtonDisabled,
                ]}
                onPress={handleGeneratePlan}
                disabled={isSavingOkr}
              >
                {isSavingOkr ? (
                  <ActivityIndicator size="small" color={Colors.paperWhite} />
                ) : hasPlan ? (
                  <>
                    <MaterialIcons name="edit" size={18} color={Colors.paperWhite} />
                    <Text style={styles.planButtonText}>Ver/Editar Plano de 12 Semanas</Text>
                  </>
                ) : (
                  <>
                    <MaterialIcons name="auto-awesome" size={18} color={Colors.paperWhite} />
                    <Text style={styles.planButtonText}>Gerar Plano de 12 Semanas</Text>
                  </>
                )}
              </TouchableOpacity>
            </View>
          )}
        </View>
      )}
    </View>
  );
}

export default function PlanningScreen() {
  const insets = useSafeAreaInsets();
  const [expandedPillar, setExpandedPillar] = useState<PillarId | null>(null);
  const [goals, setGoals] = useState<Record<string, PillarGoal | null>>({});
  const [plans, setPlans] = useState<Partial<Record<PillarId, TwelveWeekPlan | null>>>({});
  const [generatingPillar, setGeneratingPillar] = useState<PillarId | null>(null);

  const { generateText, isLoading } = useTextGeneration({
    onSuccess: async (text) => {
      if (generatingPillar) {
        const existingGoal = goals[generatingPillar];
        const newGoal: PillarGoal = {
          pillarId: generatingPillar,
          desire: existingGoal?.desire || '',
          okr: text,
          createdAt: existingGoal?.createdAt || new Date().toISOString(),
          updatedAt: new Date().toISOString(),
        };
        await savePillarGoal(newGoal);

        // Track goal defined event (pillar name only, not content)
        const pillar = PILLARS.find(p => p.id === generatingPillar);
        trackGoalDefined(pillar?.name || generatingPillar);

        setGoals(prev => ({ ...prev, [generatingPillar]: newGoal }));
        setGeneratingPillar(null);
      }
    },
    onError: (_error) => {
      Alert.alert('Erro', 'Não foi possível gerar o OKR. Tente novamente.');
      setGeneratingPillar(null);
    },
  });

  // Load data function - fetches both goals and plans
  const loadData = useCallback(async () => {
    try {
      const [savedGoals, savedPlans] = await Promise.all([
        getPillarGoals(),
        getTwelveWeekPlans(),
      ]);
      setGoals(savedGoals);
      setPlans(savedPlans);
    } catch (error) {
      console.error('[Planning] Error loading data:', error);
    }
  }, []);

  // Use useFocusEffect to reload data every time the screen becomes active
  // This ensures the button state updates when returning from pillar detail screen
  useFocusEffect(
    useCallback(() => {
      trackScreenView('planning');
      loadData();
    }, [loadData])
  );

  const handleTogglePillar = useCallback((pillarId: PillarId) => {
    setExpandedPillar(prev => prev === pillarId ? null : pillarId);
  }, []);

  const handleGenerateOKR = async (pillarId: PillarId, desire: string) => {
    // Save the desire first
    const existingGoal = goals[pillarId];
    const updatedGoal: PillarGoal = {
      pillarId,
      desire,
      okr: existingGoal?.okr || null,
      createdAt: existingGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await savePillarGoal(updatedGoal);
    setGoals(prev => ({ ...prev, [pillarId]: updatedGoal }));

    // Generate OKR
    setGeneratingPillar(pillarId);
    const pillar = PILLARS.find(p => p.id === pillarId);

    const prompt = `Você é um consultor especializado na metodologia "12 Week Year" e OKRs (Objectives and Key Results).

O usuário quer definir um objetivo para o pilar "${pillar?.name}".
Desejo do usuário: "${desire}"

Crie um OKR claro e acionável em português brasileiro.
Formato:
O: [Objetivo inspirador e mensurável]
KR1: [Resultado-chave 1 - específico e quantificável]
KR2: [Resultado-chave 2 - específico e quantificável]
KR3: [Resultado-chave 3 - específico e quantificável]

Seja conciso e direto. Use métricas quando possível.`;

    await generateText(prompt, { maxTokens: 500 });
  };

  const handleSaveOKR = async (pillarId: PillarId, okr: string) => {
    const existingGoal = goals[pillarId];
    const updatedGoal: PillarGoal = {
      pillarId,
      desire: existingGoal?.desire || '',
      okr,
      createdAt: existingGoal?.createdAt || new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };
    await savePillarGoal(updatedGoal);
    setGoals(prev => ({ ...prev, [pillarId]: updatedGoal }));
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <Text style={styles.title}>Doze</Text>
        <Text style={styles.subtitle}>{"Defina sua \"Única Coisa\""}</Text>
      </View>

      {/* Pillars List */}
      <ScrollView
        style={styles.scrollView}
        contentContainerStyle={styles.scrollContent}
        showsVerticalScrollIndicator={false}
      >
        {PILLARS.map(pillar => {
          // Check if a plan exists for this pillar (must have weeks with content)
          const existingPlan = plans[pillar.id];
          const hasPlan = !!(existingPlan && existingPlan.weeks && existingPlan.weeks.length > 0);

          return (
            <PillarCard
              key={pillar.id}
              pillar={pillar}
              goal={goals[pillar.id] || null}
              hasPlan={hasPlan}
              isExpanded={expandedPillar === pillar.id}
              onToggle={() => handleTogglePillar(pillar.id)}
              onGenerateOKR={handleGenerateOKR}
              onSaveOKR={handleSaveOKR}
              isGenerating={isLoading && generatingPillar === pillar.id}
            />
          );
        })}

        {/* Add Custom Pillar Button */}
        <TouchableOpacity style={styles.addPillarButton}>
          <MaterialIcons name="add-circle-outline" size={24} color={Colors.goldenAmber} />
          <Text style={styles.addPillarText}>Adicionar Pilar Personalizado</Text>
        </TouchableOpacity>
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
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
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
  pillarCard: {
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
    overflow: 'hidden',
  },
  pillarHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    padding: Spacing.base,
  },
  pillarHeaderLeft: {
    flexDirection: 'row',
    alignItems: 'center',
    flex: 1,
  },
  pillarIcon: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.md,
    alignItems: 'center',
    justifyContent: 'center',
  },
  pillarInfo: {
    marginLeft: Spacing.md,
    flex: 1,
  },
  pillarName: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.lg,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  pillarSubtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    marginTop: 2,
  },
  pillarHeaderRight: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  okrBadge: {
    backgroundColor: Colors.sageGreen,
    paddingHorizontal: Spacing.sm,
    paddingVertical: Spacing.xs,
    borderRadius: BorderRadius.sm,
  },
  okrBadgeText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
  },
  pillarContent: {
    padding: Spacing.base,
    paddingTop: 0,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  inputLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.medium,
    color: Colors.slate,
    marginTop: Spacing.md,
    marginBottom: Spacing.sm,
  },
  desireInput: {
    backgroundColor: Colors.paperWhite,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    minHeight: 80,
    textAlignVertical: 'top',
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  generateButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldenAmber,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  generateButtonDisabled: {
    opacity: 0.7,
  },
  generateButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  okrResult: {
    marginTop: Spacing.lg,
    backgroundColor: Colors.paperWhite,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: Colors.sageGreen + '50',
  },
  okrResultHeader: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'space-between',
    marginBottom: Spacing.sm,
  },
  okrResultTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    fontWeight: Typography.weights.bold,
    color: Colors.sageGreen,
  },
  savingIndicator: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  savingText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.sageGreen,
  },
  okrEditInput: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    lineHeight: 24,
    minHeight: 100,
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    borderWidth: 1,
    borderColor: '#E2E8F0',
    textAlignVertical: 'top',
  },
  editHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
    marginTop: Spacing.xs,
    fontStyle: 'italic',
  },
  planButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.deepNavy,
    borderRadius: BorderRadius.sm,
    padding: Spacing.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  planButtonDisabled: {
    opacity: 0.7,
  },
  planButtonExisting: {
    backgroundColor: Colors.sageGreen,
  },
  planButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.paperWhite,
  },
  addPillarButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    padding: Spacing.lg,
    borderWidth: 2,
    borderColor: Colors.goldenAmber + '50',
    borderStyle: 'dashed',
    borderRadius: BorderRadius.md,
    marginTop: Spacing.md,
    gap: Spacing.sm,
  },
  addPillarText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.medium,
    color: Colors.goldenAmber,
  },
});
