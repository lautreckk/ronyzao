# Doze - QA Testing Guide

This guide provides step-by-step instructions for manually testing the Doze app before deployment.

## Prerequisites

- Expo Go app installed on your test device (iOS/Android)
- App running in development mode (`npx expo start`)
- Clear any previous app data for a fresh test (optional)

---

## Test Scenarios

### 1. Onboarding Flow

#### 1.1 Create a New Custom Pillar
1. Launch the app fresh (or clear data)
2. Tap "Começar" on the welcome screen
3. In Step 1, observe the 7 predefined pillars
4. Tap "Criar Pilar Personalizado"
5. Enter a custom pillar name (e.g., "Hobbies")
6. Verify the custom pillar appears in the list with a unique color
7. Select the custom pillar
8. Tap "Continuar"

**Expected:** Custom pillar is created and selectable.

#### 1.2 Define a Goal
1. In Step 2, enter a desire/goal in the text input
   - Example: "Quero aprender a tocar violão em 12 semanas"
2. Tap "Estruturar Meta com IA"
3. Wait for AI to generate a structured OKR

**Expected:** AI generates a structured goal with Objective and Key Results.

#### 1.3 Generate a 12-Week Plan
1. In Step 3, tap "Gerar Plano de 12 Semanas"
2. Wait for AI to generate weekly tasks (may take 10-30 seconds)
3. Observe the weekly breakdown appears with tasks for each week

**Expected:** 12 weeks of tasks are generated and displayed in accordion format.

#### 1.4 Review and Edit Tasks
1. Expand Week 1 by tapping on it
2. Tap the edit (pencil) icon on any task
3. Modify the task text
4. Tap the checkmark to save
5. Verify the task text is updated

**Expected:** Task edits are saved and reflected in the UI.

#### 1.5 Approve the Plan
1. Scroll to the bottom of the plan
2. Tap "Aprovar e Iniciar Plano"
3. Wait for approval process to complete
4. Verify you're redirected to the Dashboard

**Expected:** Plan is approved, onboarding completes, and Dashboard shows the current week's tasks.

---

### 2. Dashboard & Task Execution

#### 2.1 Verify Tasks on Dashboard
1. From the Dashboard, observe the "Tarefas da Semana" section
2. Verify tasks from your approved plan appear grouped by pillar

**Expected:** Tasks for the current week are displayed.

#### 2.2 Mark a Task as Done
1. Tap the checkbox next to any task
2. Observe the task gets a strikethrough and checkbox fills
3. Observe the "Weekly Score" in the header updates

**Expected:** Task completion is reflected immediately. Weekly Score percentage increases.

#### 2.3 Check Weekly Score Widget
1. Look at the header section of the Dashboard
2. Verify the Weekly Score shows (e.g., "67%")
3. Complete more tasks and verify the score updates

**Expected:** Score updates dynamically based on task completion.

#### 2.4 Set "Única Coisa" (One Thing)
1. Tap on the "Única Coisa" section
2. Enter your priority task for the day
3. Save the entry
4. Verify it persists after navigating away and back

**Expected:** One Thing is saved and displayed on Dashboard.

---

### 3. Project Status & Analytics

#### 3.1 View Project Progress Cards
1. On Dashboard, scroll to "Status dos Projetos" section
2. Swipe horizontally through the project cards (carousel)
3. Verify each pillar shows:
   - Pillar name and color
   - Progress percentage
   - 12-week visual blocks (green=done, red=overdue, amber=current, gray=future)

**Expected:** Carousel displays all active pillars with correct progress visualization.

#### 3.2 Open Analytics (Relatório)
1. Tap the chart icon in the Dashboard header to open Analytics
2. Verify the "Weekly Pulse" card shows current week execution score
3. Scroll to "Trajetória de 12 Semanas" burn-up chart
4. Scroll to "Evolução da Performance" trend chart
5. Check the "Ranking de Pilares" section

**Expected:** All analytics sections render with correct data.

#### 3.3 Check Performance Streak
1. In the Analytics modal, scroll to "Evolução da Performance"
2. Look for the consistency insight below the chart
3. If you have weeks with ≥80% completion, verify streak message shows

**Expected:** Streak insight displays correctly ("🔥 Você manteve a alta performance por X semanas seguidas!" or encouraging message).

---

### 4. Governance Rituals

#### 4.1 Access Governance Section
1. On Dashboard, scroll to "Rituais de Governança" section
2. Verify the three rituals are displayed:
   - "A Única Coisa do Dia" (Daily)
   - "Revisão Semanal do Plano" (Weekly)
   - "Retrospectiva do Trimestre" (Quarterly)

**Expected:** All rituals are visible with their checkboxes.

#### 4.2 Complete Weekly Review (Revisão Semanal)
1. Tap on "Revisão Semanal do Plano" checkbox
2. Verify the Weekly Review Wizard modal opens
3. **Step 1 (O Espelho):** Review your weekly score and AI motivation
4. Tap "Continuar"
5. **Step 2 (Reflexão):** Enter what worked well and obstacles
6. Wait for AI tactical tip (optional)
7. Tap "Continuar"
8. **Step 3 (Olhar Adiante):** Review next week's tasks preview
9. Tap "Finalizar Revisão"
10. Verify the checkbox is now checked

**Expected:** Wizard completes all 3 steps, ritual is marked as done.

#### 4.3 Open Retrospective Modal
1. Tap on "Retrospectiva do Trimestre"
2. Verify the Retrospective modal opens
3. Review the overall progress and pillar breakdown
4. Close the modal

**Expected:** Retrospective shows accumulated progress data.

---

### 5. Planning Tab

#### 5.1 View All Pillars
1. Navigate to "Planejamento" tab
2. Verify all 7 pillars are listed
3. Each pillar should show status (has goal, has plan, etc.)

**Expected:** All pillars displayed with correct status indicators.

#### 5.2 Access Pillar Detail
1. Tap on any pillar card
2. Verify the pillar detail screen opens
3. If plan exists, verify the 12-week breakdown is shown
4. If no plan, verify options to create goal/plan

**Expected:** Pillar detail loads with correct data.

---

### 6. Mentor (AI Chat)

#### 6.1 Start Conversation
1. Navigate to "Mentor" tab
2. Verify the proactive welcome message appears
3. Observe the quick action buttons

**Expected:** Mentor loads with contextual greeting based on your progress.

#### 6.2 Use Quick Actions
1. Tap "Meu progresso" quick action
2. Wait for AI response
3. Verify response includes your actual progress data

**Expected:** AI responds with personalized analysis.

#### 6.3 Send Custom Message
1. Type a question in the input field
2. Tap send button
3. Verify AI responds appropriately

**Expected:** AI chat works with custom prompts.

---

### 7. Data Persistence

#### 7.1 Test App Restart
1. Complete several tasks on Dashboard
2. Set a "Única Coisa"
3. Force close the app completely
4. Reopen the app
5. Navigate to Dashboard
6. Verify all data persists:
   - Completed tasks are still checked
   - "Única Coisa" is still set
   - Weekly Score is correct

**Expected:** All data persists after app restart.

#### 7.2 Test Tab Navigation
1. Complete a task on Dashboard
2. Navigate to Planning tab
3. Navigate back to Dashboard
4. Verify the task is still marked as complete

**Expected:** Data persists across tab navigation.

---

### 8. Notifications (Manual Verification)

#### 8.1 Permission Request
1. Fresh install the app
2. Verify notification permission is requested
3. Grant permission

**Expected:** Permission dialog appears and can be granted.

#### 8.2 Scheduled Notifications (Verification)
The app schedules the following notifications:
- **Morning Focus:** Daily at 08:00 AM
- **Weekly Review:** Sunday at 18:00
- **Mid-Week Alert:** Wednesday at 12:00 (only if overdue tasks exist)

**Note:** These can be verified by checking device notification settings or waiting for the scheduled times.

---

## Edge Cases to Test

1. **Empty State:** Delete all data and verify empty states show correctly
2. **Long Text:** Enter very long text in goals/tasks and verify UI handles overflow
3. **Network Error:** Test AI features with poor/no network connection
4. **Rapid Tapping:** Rapidly tap buttons to ensure no double-submissions
5. **Backward Compatibility:** If upgrading, verify existing data loads correctly

---

## Checklist Summary

- [ ] Onboarding: Custom pillar creation
- [ ] Onboarding: Goal structuring with AI
- [ ] Onboarding: 12-week plan generation
- [ ] Onboarding: Task editing
- [ ] Onboarding: Plan approval
- [ ] Dashboard: Task display
- [ ] Dashboard: Task completion
- [ ] Dashboard: Weekly Score update
- [ ] Dashboard: One Thing persistence
- [ ] Analytics: All sections render
- [ ] Analytics: Performance trend chart
- [ ] Governance: Weekly Review wizard
- [ ] Governance: Retrospective modal
- [ ] Planning: Pillar list and details
- [ ] Mentor: Proactive welcome
- [ ] Mentor: AI chat functionality
- [ ] Persistence: App restart
- [ ] Persistence: Tab navigation
- [ ] Notifications: Permission request

---

## Reporting Issues

When reporting issues, include:
1. Device model and OS version
2. Steps to reproduce
3. Expected vs actual behavior
4. Screenshots if applicable
5. Console logs from Metro bundler (if available)

---

*Last updated: QA Guide v1.0 - Doze*
