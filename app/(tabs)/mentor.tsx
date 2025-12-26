import React, { useState, useEffect, useRef, useCallback } from 'react';
import {
  View,
  Text,
  StyleSheet,
  ScrollView,
  TextInput,
  TouchableOpacity,
  KeyboardAvoidingView,
  Platform,
  ActivityIndicator,
} from 'react-native';
import { useSafeAreaInsets } from 'react-native-safe-area-context';
import { useFocusEffect } from 'expo-router';
import { MaterialIcons } from '@expo/vector-icons';
import { useTextGeneration } from '@fastshot/ai';
import { Colors, Typography, Spacing, BorderRadius } from '@/constants/theme';
import {
  getChatHistory,
  saveChatMessage,
  clearChatHistory,
  getMentorContextString,
  getMentorInsights,
  ChatMessage,
  MentorContextData,
  getMentorContext,
} from '@/services/storage';
import {
  trackMentorMessageSent,
  trackMentorQuickAction,
  trackScreenView,
} from '@/services/analytics';

interface MessageBubbleProps {
  message: ChatMessage;
}

function MessageBubble({ message }: MessageBubbleProps) {
  const isUser = message.role === 'user';

  return (
    <View style={[styles.messageBubble, isUser ? styles.userBubble : styles.assistantBubble]}>
      {!isUser && (
        <Text style={styles.assistantLabel}>Newell AI</Text>
      )}
      <Text style={[styles.messageText, isUser ? styles.userText : styles.assistantText]}>
        {message.content}
      </Text>
    </View>
  );
}

// Quick action suggestions
interface QuickAction {
  id: string;
  label: string;
  icon: keyof typeof MaterialIcons.glyphMap;
  prompt: string;
}

const QUICK_ACTIONS: QuickAction[] = [
  {
    id: 'progress',
    label: 'Meu progresso',
    icon: 'trending-up',
    prompt: 'Como está meu progresso geral no plano de 12 semanas? Me dê uma análise detalhada.',
  },
  {
    id: 'obstacles',
    label: 'Superar obstáculos',
    icon: 'psychology',
    prompt: 'Estou enfrentando dificuldades para manter o foco. Quais estratégias posso usar para superar obstáculos e voltar aos trilhos?',
  },
  {
    id: 'priorities',
    label: 'Prioridades da semana',
    icon: 'priority-high',
    prompt: 'Com base no meu contexto atual, quais devem ser minhas principais prioridades para esta semana?',
  },
  {
    id: 'review',
    label: 'Fazer revisão',
    icon: 'rate-review',
    prompt: 'Vamos fazer minha revisão semanal. Analise meu progresso e me ajude a identificar o que funcionou e o que precisa melhorar.',
  },
];

export default function MentorScreen() {
  const insets = useSafeAreaInsets();
  const scrollViewRef = useRef<ScrollView>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [contextData, setContextData] = useState<MentorContextData | null>(null);
  const [showQuickActions, setShowQuickActions] = useState(true);

  const { generateText, isLoading } = useTextGeneration({
    onSuccess: async (text) => {
      const assistantMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: text,
        timestamp: new Date().toISOString(),
      };
      await saveChatMessage(assistantMessage);
      setMessages(prev => [...prev, assistantMessage]);
      setShowQuickActions(true);
    },
    onError: (_error) => {
      const errorMessage: ChatMessage = {
        id: Date.now().toString(),
        role: 'assistant',
        content: 'Desculpe, houve um erro ao processar sua mensagem. Tente novamente.',
        timestamp: new Date().toISOString(),
      };
      setMessages(prev => [...prev, errorMessage]);
      setShowQuickActions(true);
    },
  });

  // Reload context when screen gains focus
  useFocusEffect(
    useCallback(() => {
      trackScreenView('mentor');
      loadContext();
    }, [])
  );

  useEffect(() => {
    loadChatHistory();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Scroll to bottom when new messages arrive
    setTimeout(() => {
      scrollViewRef.current?.scrollToEnd({ animated: true });
    }, 100);
  }, [messages]);

  const loadContext = async () => {
    try {
      const ctx = await getMentorContext();
      setContextData(ctx);
    } catch (error) {
      console.error('[Mentor] Error loading context:', error);
    }
  };

  const loadChatHistory = async () => {
    try {
      const history = await getChatHistory();
      if (history.length === 0) {
        // Generate proactive welcome message based on current state
        const proactiveMessage = await generateProactiveWelcome();
        const welcomeMessage: ChatMessage = {
          id: 'welcome',
          role: 'assistant',
          content: proactiveMessage,
          timestamp: new Date().toISOString(),
        };
        setMessages([welcomeMessage]);
        await saveChatMessage(welcomeMessage);
      } else {
        setMessages(history);
      }
    } catch (error) {
      console.error('[Mentor] Error loading chat history:', error);
      // Show default welcome message on error
      const defaultMessage: ChatMessage = {
        id: 'welcome',
        role: 'assistant',
        content: 'Olá! Sou seu mentor virtual. Como posso ajudá-lo hoje?',
        timestamp: new Date().toISOString(),
      };
      setMessages([defaultMessage]);
    }
  };

  const generateProactiveWelcome = async (): Promise<string> => {
    try {
      const insights = await getMentorInsights();
      const ctx = await getMentorContext();

    let message = `Olá! Sou seu mentor virtual baseado na metodologia "12 Week Year".\n\n`;

    // Add context-aware greeting
    if (ctx.activePlans.length > 0) {
      message += `📊 **Seu Status Atual:**\n`;
      message += `Você está na semana ${ctx.activePlans[0]?.currentWeek || 1} de 12, com ${ctx.overallProgress}% de progresso geral.\n\n`;
    }

    // Add urgent issues
    if (insights.urgentIssues.length > 0) {
      message += `⚠️ **Atenção Necessária:**\n`;
      insights.urgentIssues.forEach(issue => {
        message += `• ${issue}\n`;
      });
      message += '\n';
    }

    // Add celebrations
    if (insights.celebrations.length > 0) {
      message += `🎉 **Celebrações:**\n`;
      insights.celebrations.forEach(celebration => {
        message += `• ${celebration}\n`;
      });
      message += '\n';
    }

    // Add suggestions
    if (insights.suggestions.length > 0) {
      message += `💡 **Sugestões:**\n`;
      insights.suggestions.forEach(suggestion => {
        message += `• ${suggestion}\n`;
      });
      message += '\n';
    }

    message += `Como posso ajudá-lo hoje? Use os botões abaixo para ações rápidas ou digite sua pergunta.`;

      return message;
    } catch (error) {
      console.error('[Mentor] Error generating welcome message:', error);
      return 'Olá! Sou seu mentor virtual. Como posso ajudá-lo hoje?';
    }
  };

  const handleSendMessage = async (customPrompt?: string) => {
    const messageText = customPrompt || inputText.trim();
    if (!messageText || isLoading) return;

    // Track mentor message sent (NOT the content for privacy)
    trackMentorMessageSent();

    setShowQuickActions(false);

    // Refresh user context before sending
    const freshContext = await getMentorContextString();

    // Add user message
    const userMessage: ChatMessage = {
      id: Date.now().toString(),
      role: 'user',
      content: messageText,
      timestamp: new Date().toISOString(),
    };
    await saveChatMessage(userMessage);
    setMessages(prev => [...prev, userMessage]);
    setInputText('');

    // Generate AI response with enhanced context
    const systemPrompt = `Você é um mentor especializado na metodologia "12 Week Year" de Brian P. Moran e na filosofia "The One Thing" de Gary Keller.

Seu papel é:
1. Ajudar o usuário a manter o foco em suas metas de 12 semanas
2. Revisar o progresso semanal e identificar obstáculos
3. Sugerir ajustes táticos quando necessário
4. Motivar e responsabilizar o usuário
5. Aplicar os princípios de execução com excelência
6. Ser proativo em identificar problemas e oportunidades

IMPORTANTE: Use os dados do contexto abaixo para personalizar suas respostas. Faça referência a números específicos, pilares, e progresso real do usuário.

${freshContext}

Responda sempre em português brasileiro. Seja conciso, prático e encorajador. Quando apropriado:
- Faça perguntas de reflexão
- Sugira ações específicas baseadas nos dados
- Celebre conquistas
- Aponte áreas que precisam de atenção

Mensagem do usuário: ${messageText}`;

    await generateText(systemPrompt, { maxTokens: 1000 });
  };

  const handleQuickAction = (action: QuickAction) => {
    // Track quick action usage (action ID only, not prompt content)
    trackMentorQuickAction(action.id);
    handleSendMessage(action.prompt);
  };

  const handleClearHistory = async () => {
    await clearChatHistory();
    const proactiveMessage = await generateProactiveWelcome();
    const welcomeMessage: ChatMessage = {
      id: 'welcome-new',
      role: 'assistant',
      content: proactiveMessage,
      timestamp: new Date().toISOString(),
    };
    setMessages([welcomeMessage]);
    await saveChatMessage(welcomeMessage);
  };

  // Get status indicator color
  const getStatusColor = () => {
    if (!contextData) return Colors.lightSlate;
    if (contextData.overdueTasks.count > 0) return Colors.error;
    if (contextData.currentWeekTasks.completionRate >= 80) return Colors.sageGreen;
    if (contextData.currentWeekTasks.completionRate >= 50) return Colors.goldenAmber;
    return Colors.lightSlate;
  };

  return (
    <View style={[styles.container, { paddingTop: insets.top }]}>
      {/* Header */}
      <View style={styles.header}>
        <View style={styles.headerLeft}>
          <Text style={styles.title}>Mentor IA</Text>
          <View style={styles.statusRow}>
            <View style={[styles.statusDot, { backgroundColor: getStatusColor() }]} />
            <Text style={styles.subtitle}>
              {contextData
                ? `Semana ${contextData.calendarWeekNumber} • ${contextData.overallProgress}% progresso`
                : 'Carregando...'}
            </Text>
          </View>
        </View>
        <TouchableOpacity style={styles.clearButton} onPress={handleClearHistory}>
          <MaterialIcons name="refresh" size={24} color={Colors.paperWhite} />
        </TouchableOpacity>
      </View>

      <KeyboardAvoidingView
        style={styles.keyboardAvoid}
        behavior={Platform.OS === 'ios' ? 'padding' : undefined}
        keyboardVerticalOffset={0}
      >
        {/* Messages */}
        <ScrollView
          ref={scrollViewRef}
          style={styles.messagesContainer}
          contentContainerStyle={styles.messagesContent}
          showsVerticalScrollIndicator={false}
        >
          {messages.map(message => (
            <MessageBubble key={message.id} message={message} />
          ))}

          {isLoading && (
            <View style={[styles.messageBubble, styles.assistantBubble, styles.loadingBubble]}>
              <ActivityIndicator color={Colors.deepNavy} size="small" />
              <Text style={styles.loadingText}>Analisando seu contexto...</Text>
            </View>
          )}

          {/* Quick Actions */}
          {showQuickActions && !isLoading && messages.length > 0 && (
            <View style={styles.quickActionsContainer}>
              <Text style={styles.quickActionsLabel}>Ações Rápidas:</Text>
              <View style={styles.quickActionsGrid}>
                {QUICK_ACTIONS.map(action => (
                  <TouchableOpacity
                    key={action.id}
                    style={styles.quickActionButton}
                    onPress={() => handleQuickAction(action)}
                    activeOpacity={0.7}
                  >
                    <MaterialIcons name={action.icon} size={18} color={Colors.goldenAmber} />
                    <Text style={styles.quickActionText}>{action.label}</Text>
                  </TouchableOpacity>
                ))}
              </View>
            </View>
          )}
        </ScrollView>

        {/* Input Area */}
        <View style={[styles.inputContainer, { paddingBottom: insets.bottom > 0 ? insets.bottom : Spacing.base }]}>
          <TextInput
            style={styles.input}
            placeholder="Digite sua pergunta..."
            placeholderTextColor={Colors.lightSlate}
            value={inputText}
            onChangeText={setInputText}
            multiline
            maxLength={1000}
            editable={!isLoading}
          />
          <TouchableOpacity
            style={[styles.sendButton, (!inputText.trim() || isLoading) && styles.sendButtonDisabled]}
            onPress={() => handleSendMessage()}
            disabled={!inputText.trim() || isLoading}
          >
            <MaterialIcons
              name="send"
              size={24}
              color={inputText.trim() && !isLoading ? Colors.deepNavy : Colors.lightSlate}
            />
          </TouchableOpacity>
        </View>
      </KeyboardAvoidingView>
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
    justifyContent: 'space-between',
    paddingHorizontal: Spacing.xl,
    paddingTop: Spacing.lg,
    paddingBottom: Spacing.xl,
  },
  headerLeft: {
    flex: 1,
  },
  title: {
    fontFamily: Typography.heading,
    fontSize: Typography.sizes['3xl'],
    fontWeight: Typography.weights.bold,
    color: Colors.paperWhite,
    fontStyle: 'italic',
  },
  statusRow: {
    flexDirection: 'row',
    alignItems: 'center',
    marginTop: Spacing.xs,
  },
  statusDot: {
    width: 8,
    height: 8,
    borderRadius: 4,
    marginRight: Spacing.xs,
  },
  subtitle: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.lightSlate,
  },
  clearButton: {
    width: 44,
    height: 44,
    borderRadius: BorderRadius.full,
    backgroundColor: 'rgba(255,255,255,0.1)',
    alignItems: 'center',
    justifyContent: 'center',
  },
  keyboardAvoid: {
    flex: 1,
    backgroundColor: Colors.paperWhite,
    borderTopLeftRadius: BorderRadius.xl,
    borderTopRightRadius: BorderRadius.xl,
  },
  messagesContainer: {
    flex: 1,
  },
  messagesContent: {
    padding: Spacing.base,
    paddingBottom: Spacing.xl,
  },
  messageBubble: {
    maxWidth: '85%',
    padding: Spacing.md,
    borderRadius: BorderRadius.md,
    marginBottom: Spacing.md,
  },
  userBubble: {
    alignSelf: 'flex-end',
    backgroundColor: Colors.goldenAmber,
    borderBottomRightRadius: 4,
  },
  assistantBubble: {
    alignSelf: 'flex-start',
    backgroundColor: Colors.sageGreen + '30',
    borderBottomLeftRadius: 4,
  },
  assistantLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.bold,
    color: Colors.sageGreen,
    marginBottom: Spacing.xs,
  },
  messageText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    lineHeight: 22,
  },
  userText: {
    color: Colors.deepNavy,
  },
  assistantText: {
    color: Colors.deepNavy,
  },
  loadingBubble: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.sm,
  },
  loadingText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.slate,
    fontStyle: 'italic',
  },
  quickActionsContainer: {
    marginTop: Spacing.md,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
  },
  quickActionsLabel: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.xs,
    fontWeight: Typography.weights.medium,
    color: Colors.slate,
    marginBottom: Spacing.sm,
  },
  quickActionsGrid: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: Spacing.sm,
  },
  quickActionButton: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: Spacing.xs,
    paddingVertical: Spacing.sm,
    paddingHorizontal: Spacing.md,
    backgroundColor: Colors.goldenAmber + '15',
    borderRadius: BorderRadius.full,
    borderWidth: 1,
    borderColor: Colors.goldenAmber + '30',
  },
  quickActionText: {
    fontFamily: Typography.body,
    fontSize: Typography.sizes.sm,
    color: Colors.deepNavy,
    fontWeight: Typography.weights.medium,
  },
  inputContainer: {
    flexDirection: 'row',
    alignItems: 'flex-end',
    paddingHorizontal: Spacing.base,
    paddingTop: Spacing.md,
    borderTopWidth: 1,
    borderTopColor: '#E2E8F0',
    backgroundColor: Colors.paperWhite,
  },
  input: {
    flex: 1,
    backgroundColor: Colors.ivory,
    borderRadius: BorderRadius.lg,
    paddingHorizontal: Spacing.md,
    paddingVertical: Spacing.md,
    fontFamily: Typography.body,
    fontSize: Typography.sizes.base,
    color: Colors.deepNavy,
    maxHeight: 100,
    marginRight: Spacing.sm,
    borderWidth: 1,
    borderColor: '#E2E8F0',
  },
  sendButton: {
    width: 48,
    height: 48,
    borderRadius: BorderRadius.full,
    backgroundColor: Colors.goldenAmber,
    alignItems: 'center',
    justifyContent: 'center',
  },
  sendButtonDisabled: {
    backgroundColor: Colors.ivory,
  },
});
