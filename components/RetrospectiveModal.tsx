import React, { useState } from 'react';
import {
  View,
  Text,
  StyleSheet,
  Modal,
  TouchableOpacity,
  ScrollView,
  ActivityIndicator,
  Alert,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { MaterialIcons } from '@expo/vector-icons';
import { Colors, Typography, Spacing, BorderRadius, Shadows, PILLARS } from '@/constants/theme';
import {
  OverdueTask,
  moveTaskToCurrentWeek,
  completeOverdueTask,
  discardOverdueTask,
  moveAllOverdueToCurrentWeek,
  calculateCurrentWeek,
} from '@/services/storage';

interface RetrospectiveModalProps {
  visible: boolean;
  onClose: () => void;
  overdueTasks: OverdueTask[];
  onTasksUpdated: () => void;
}

type TaskAction = 'move' | 'complete' | 'discard';

interface TaskGroupProps {
  pillarId: string;
  tasks: OverdueTask[];
  onAction: (task: OverdueTask, action: TaskAction) => void;
  loadingTasks: Set<string>;
}

function TaskGroup({ pillarId, tasks, onAction, loadingTasks }: TaskGroupProps) {
  const pillar = PILLARS.find(p => p.id === pillarId);
  if (!pillar) return null;

  return (
    <View style={[styles.taskGroup, Shadows.sm]}>
      <View style={styles.taskGroupHeader}>
        <View style={[styles.pillarDot, { backgroundColor: pillar.color }]} />
        <Text style={styles.taskGroupTitle}>{pillar.name}</Text>
        <Text style={styles.taskGroupCount}>{tasks.length} pendente{tasks.length > 1 ? 's' : ''}</Text>
      </View>

      {tasks.map((overdueTask) => {
        const isLoading = loadingTasks.has(overdueTask.task.id);
        const currentWeek = calculateCurrentWeek(overdueTask.planStartDate);
        const weeksLate = currentWeek - overdueTask.weekNumber;

        return (
          <View key={overdueTask.task.id} style={styles.taskItem}>
            <View style={styles.taskInfo}>
              <Text style={styles.taskTitle} numberOfLines={2}>
                {overdueTask.task.title}
              </Text>
              <Text style={styles.taskMeta}>
                Semana {overdueTask.weekNumber} • {weeksLate} semana{weeksLate > 1 ? 's' : ''} atrás
              </Text>
            </View>

            {isLoading ? (
              <ActivityIndicator size="small" color={Colors.goldenAmber} />
            ) : (
              <View style={styles.taskActions}>
                <TouchableOpacity
                  style={[styles.actionButton, styles.moveButton]}
                  onPress={() => onAction(overdueTask, 'move')}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="arrow-forward" size={18} color={Colors.deepNavy} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.completeButton]}
                  onPress={() => onAction(overdueTask, 'complete')}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="check" size={18} color={Colors.paperWhite} />
                </TouchableOpacity>
                <TouchableOpacity
                  style={[styles.actionButton, styles.discardButton]}
                  onPress={() => onAction(overdueTask, 'discard')}
                  activeOpacity={0.7}
                >
                  <MaterialIcons name="delete-outline" size={18} color={Colors.error} />
                </TouchableOpacity>
              </View>
            )}
          </View>
        );
      })}
    </View>
  );
}

export default function RetrospectiveModal({
  visible,
  onClose,
  overdueTasks,
  onTasksUpdated,
}: RetrospectiveModalProps) {
  const insets = useSafeAreaInsets();
  const [loadingTasks, setLoadingTasks] = useState<Set<string>>(new Set());
  const [isMovingAll, setIsMovingAll] = useState(false);

  // Group tasks by pillar
  const tasksByPillar = overdueTasks.reduce((acc, task) => {
    const pillarId = task.pillarId;
    if (!acc[pillarId]) {
      acc[pillarId] = [];
    }
    acc[pillarId].push(task);
    return acc;
  }, {} as Record<string, OverdueTask[]>);

  const handleTaskAction = async (overdueTask: OverdueTask, action: TaskAction) => {
    const taskId = overdueTask.task.id;

    // Add to loading state
    setLoadingTasks(prev => new Set(prev).add(taskId));

    try {
      switch (action) {
        case 'move':
          await moveTaskToCurrentWeek(
            overdueTask.pillarId,
            taskId,
            overdueTask.weekNumber
          );
          break;
        case 'complete':
          await completeOverdueTask(
            overdueTask.pillarId,
            taskId,
            overdueTask.weekNumber
          );
          break;
        case 'discard':
          Alert.alert(
            'Descartar Tarefa',
            `Tem certeza que deseja descartar "${overdueTask.task.title}"?`,
            [
              { text: 'Cancelar', style: 'cancel' },
              {
                text: 'Descartar',
                style: 'destructive',
                onPress: async () => {
                  try {
                    await discardOverdueTask(
                      overdueTask.pillarId,
                      taskId,
                      overdueTask.weekNumber
                    );
                    onTasksUpdated();
                  } catch {
                    Alert.alert('Erro', 'Não foi possível descartar a tarefa.');
                  }
                },
              },
            ]
          );
          // Remove from loading since we're showing an alert
          setLoadingTasks(prev => {
            const newSet = new Set(prev);
            newSet.delete(taskId);
            return newSet;
          });
          return;
      }

      onTasksUpdated();
    } catch {
      Alert.alert('Erro', 'Não foi possível processar a tarefa.');
    } finally {
      // Remove from loading state
      setLoadingTasks(prev => {
        const newSet = new Set(prev);
        newSet.delete(taskId);
        return newSet;
      });
    }
  };

  const handleMoveAll = async () => {
    setIsMovingAll(true);
    try {
      const movedCount = await moveAllOverdueToCurrentWeek();
      Alert.alert(
        'Sucesso!',
        `${movedCount} tarefa${movedCount > 1 ? 's foram movidas' : ' foi movida'} para esta semana.`,
        [{ text: 'OK', onPress: onTasksUpdated }]
      );
    } catch {
      Alert.alert('Erro', 'Não foi possível mover as tarefas.');
    } finally {
      setIsMovingAll(false);
    }
  };

  const totalTasks = overdueTasks.length;

  return (
    <Modal visible={visible} animationType="slide" onRequestClose={onClose}>
      <View style={[styles.container, { paddingTop: insets.top }]}>
        {/* Header */}
        <View style={styles.header}>
          <View style={styles.headerContent}>
            <Text style={styles.headerTitle}>Retrospectiva</Text>
            <Text style={styles.headerSubtitle}>
              {totalTasks} tarefa{totalTasks > 1 ? 's' : ''} pendente{totalTasks > 1 ? 's' : ''}
            </Text>
          </View>
          <TouchableOpacity style={styles.closeButton} onPress={onClose}>
            <MaterialIcons name="close" size={24} color={Colors.paperWhite} />
          </TouchableOpacity>
        </View>

        {/* Legend */}
        <View style={styles.legendContainer}>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, styles.moveButton]}>
              <MaterialIcons name="arrow-forward" size={14} color={Colors.deepNavy} />
            </View>
            <Text style={styles.legendText}>Mover para hoje</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, styles.completeButton]}>
              <MaterialIcons name="check" size={14} color={Colors.paperWhite} />
            </View>
            <Text style={styles.legendText}>Concluir</Text>
          </View>
          <View style={styles.legendItem}>
            <View style={[styles.legendIcon, styles.discardButton]}>
              <MaterialIcons name="delete-outline" size={14} color={Colors.error} />
            </View>
            <Text style={styles.legendText}>Descartar</Text>
          </View>
        </View>

        <ScrollView
          style={styles.scrollView}
          contentContainerStyle={[styles.scrollContent, { paddingBottom: insets.bottom + 100 }]}
          showsVerticalScrollIndicator={false}
        >
          {/* Info Card */}
          <View style={styles.infoCard}>
            <MaterialIcons name="info-outline" size={20} color={Colors.slate} />
            <Text style={styles.infoText}>
              Estas tarefas ficaram pendentes em semanas anteriores. Resolva cada uma para manter seu plano em dia.
            </Text>
          </View>

          {/* Task Groups by Pillar */}
          {Object.entries(tasksByPillar).map(([pillarId, tasks]) => (
            <TaskGroup
              key={pillarId}
              pillarId={pillarId}
              tasks={tasks}
              onAction={handleTaskAction}
              loadingTasks={loadingTasks}
            />
          ))}
        </ScrollView>

        {/* Footer with Move All button */}
        <View style={[styles.footer, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.lg }]}>
          <TouchableOpacity
            style={[styles.moveAllButton, isMovingAll && styles.moveAllButtonDisabled]}
            onPress={handleMoveAll}
            disabled={isMovingAll}
          >
            {isMovingAll ? (
              <ActivityIndicator size="small" color={Colors.deepNavy} />
            ) : (
              <>
                <MaterialIcons name="fast-forward" size={20} color={Colors.deepNavy} />
                <Text style={styles.moveAllButtonText}>Mover Tudo para Esta Semana</Text>
              </>
            )}
          </TouchableOpacity>
          <Text style={styles.footerHint}>
            Ou resolva cada tarefa individualmente acima
          </Text>
        </View>
      </View>
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
    paddingBottom: Spacing.lg,
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
  legendContainer: {
    flexDirection: 'row',
    justifyContent: 'center',
    gap: Spacing.lg,
    paddingHorizontal: Spacing.xl,
    paddingBottom: Spacing.md,
  },
  legendItem: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
  },
  legendIcon: {
    width: 24,
    height: 24,
    borderRadius: 12,
    alignItems: 'center',
    justifyContent: 'center',
  },
  legendText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.lightSlate,
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
  infoCard: {
    flexDirection: 'row',
    alignItems: 'flex-start',
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.md,
    padding: Spacing.md,
    marginBottom: Spacing.md,
    gap: Spacing.sm,
  },
  infoText: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    lineHeight: 20,
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
    paddingBottom: Spacing.sm,
    marginBottom: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#E2E8F0',
  },
  pillarDot: {
    width: 10,
    height: 10,
    borderRadius: 5,
    marginRight: Spacing.sm,
  },
  taskGroupTitle: {
    flex: 1,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  taskGroupCount: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
  },
  taskItem: {
    flexDirection: 'row',
    alignItems: 'center',
    paddingVertical: Spacing.sm,
    borderBottomWidth: 1,
    borderBottomColor: '#F1F5F9',
  },
  taskInfo: {
    flex: 1,
    marginRight: Spacing.sm,
  },
  taskTitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    lineHeight: 20,
  },
  taskMeta: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.error,
    marginTop: 2,
  },
  taskActions: {
    flexDirection: 'row',
    gap: Spacing.xs,
  },
  actionButton: {
    width: 32,
    height: 32,
    borderRadius: 16,
    alignItems: 'center',
    justifyContent: 'center',
  },
  moveButton: {
    backgroundColor: Colors.goldenAmber,
  },
  completeButton: {
    backgroundColor: Colors.sageGreen,
  },
  discardButton: {
    backgroundColor: Colors.error + '15',
  },
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
  moveAllButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    backgroundColor: Colors.goldenAmber,
    paddingVertical: Spacing.md,
    borderRadius: BorderRadius.md,
    gap: Spacing.sm,
  },
  moveAllButtonDisabled: {
    opacity: 0.6,
  },
  moveAllButtonText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    fontWeight: Typography.weights.semibold,
    color: Colors.deepNavy,
  },
  footerHint: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    color: Colors.slate,
    textAlign: 'center',
    marginTop: Spacing.sm,
  },
});
