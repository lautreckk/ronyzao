# Doze

<div align="center">
  <h3>🎯 High-Performance Productivity Planner</h3>
  <p>Transform your goals into 12-week execution plans with AI-powered guidance</p>
</div>

---

## Overview

**Doze** is a mobile productivity application built with React Native and Expo, designed to help users achieve their most important goals using proven methodologies:

- **"The 12 Week Year"** by Brian P. Moran - Execute with quarterly urgency
- **"The One Thing"** by Gary Keller - Focus on what matters most

The app provides a complete goal-setting, planning, and execution framework with AI-powered assistance throughout the journey.

---

## Features

### 🚀 AI-Powered Onboarding
- **7 Life Pillars** - Business, Physical, Mental, Spiritual, Education, Finance, Family
- **Custom Pillar Creation** - Create personalized pillars with unique colors
- **AI Goal Structuring** - Transform desires into structured OKRs (Objectives & Key Results)
- **12-Week Plan Generation** - AI generates actionable weekly tasks for each pillar
- **Plan Review & Approval** - Edit tasks before activating your plan

### 📊 Dynamic Dashboard
- **Weekly Score Widget** - Real-time execution percentage with dynamic status indicators
- **Task Management** - View and complete current week tasks grouped by pillar
- **"Única Coisa" (One Thing)** - Set your daily priority focus
- **Overdue Task Alerts** - Visual indicators for tasks behind schedule
- **Project Status Carousel** - Horizontal swipeable cards showing pillar progress

### 📈 Analytics & Reporting
- **Weekly Pulse** - Current week execution score with status labels
- **12-Week Burn-up Chart** - Planned vs actual progress visualization
- **Performance Evolution Chart** - Historical weekly scores with color-coded bars
- **High Performance Streak** - Track consecutive weeks of ≥80% completion
- **Pillar Ranking** - Performance comparison across all active pillars

### 🔄 Governance Rituals
- **Daily Focus** - "Única Coisa" check-in
- **Weekly Review Wizard** - 3-step guided review with AI coaching:
  1. **O Espelho (Mirror)** - Score reflection with AI motivation
  2. **Reflexão (Reflection)** - What worked & obstacles with AI tactical tips
  3. **Olhar Adiante (Look Forward)** - Next week preview
- **Quarterly Retrospective** - Trimester progress summary

### 🤖 AI Mentor Chat
- **Contextual Welcome** - Proactive insights based on your current progress
- **Quick Actions** - Pre-built prompts for common coaching needs
- **Progress Analysis** - Detailed performance breakdowns
- **Obstacle Coaching** - Strategic advice for overcoming challenges

### 🔔 Strategic Notifications
- **Morning Focus** - Daily 8:00 AM reminder with your "One Thing"
- **Weekly Review** - Sunday 6:00 PM call to review
- **Mid-Week Alert** - Wednesday noon alert if overdue tasks exist

### 💾 Data Persistence
- **Local Storage** - All data stored securely on device via AsyncStorage
- **Offline Support** - Full functionality without internet connection
- **Backward Compatible** - Seamless upgrades preserving existing data

---

## Tech Stack

- **Framework:** React Native with Expo SDK 54
- **Navigation:** Expo Router (file-based routing)
- **State Management:** React hooks with AsyncStorage persistence
- **AI Integration:** Newell AI via @fastshot/ai package
- **Notifications:** expo-notifications
- **Language:** TypeScript with strict mode
- **Styling:** React Native StyleSheet with custom design system

---

## Getting Started

### Prerequisites

- Node.js 18+
- npm or yarn
- Expo Go app (for development testing)
- iOS Simulator / Android Emulator (optional)

### Installation

```bash
# Clone the repository
git clone <repository-url>
cd doze-planner

# Install dependencies
npm install

# Start development server
npx expo start
```

### Running the App

After starting the development server:

- **iOS Simulator:** Press `i` in the terminal
- **Android Emulator:** Press `a` in the terminal
- **Physical Device:** Scan the QR code with Expo Go app

---

## Building for Production

### Using EAS Build (Recommended)

First, install EAS CLI and configure:

```bash
# Install EAS CLI globally
npm install -g eas-cli

# Login to Expo account
eas login

# Configure EAS for your project (first time only)
eas build:configure
```

### Build Commands

```bash
# Build for Android (APK/AAB)
eas build -p android

# Build for iOS (IPA)
eas build -p ios

# Build for both platforms
eas build --platform all

# Preview build (internal testing)
eas build -p android --profile preview
eas build -p ios --profile preview
```

### Local Development Build

```bash
# Create development build for Android
npx expo run:android

# Create development build for iOS
npx expo run:ios
```

---

## Project Structure

```
doze-planner/
├── app/                    # Expo Router screens
│   ├── (tabs)/            # Tab navigator screens
│   │   ├── index.tsx      # Dashboard
│   │   ├── planning.tsx   # Planning view
│   │   └── mentor.tsx     # AI Mentor chat
│   ├── pillar/[id].tsx    # Pillar detail modal
│   ├── onboarding.tsx     # Onboarding flow
│   └── _layout.tsx        # Root layout
├── components/            # Reusable components
│   ├── AnalyticsModal.tsx
│   ├── GovernanceRituals.tsx
│   ├── ProjectProgress.tsx
│   ├── RetrospectiveModal.tsx
│   └── WeeklyReviewModal.tsx
├── services/              # Business logic
│   ├── storage.ts         # AsyncStorage service
│   └── notifications.ts   # Push notifications
├── constants/             # Theme and configuration
│   └── theme.ts           # Design system
├── lib/                   # External libraries
│   └── fastshot-ai/       # AI integration
└── assets/                # Images and fonts
```

---

## Design System

### Color Palette

| Color | Hex | Usage |
|-------|-----|-------|
| Deep Navy | `#0F172A` | Primary background, headers |
| Paper White | `#FAFAFA` | Card backgrounds, text |
| Golden Amber | `#FFD93D` | Accents, highlights |
| Sage Green | `#4ADE80` | Success states, ≥80% |
| Coral Red | `#EF4444` | Errors, <50% |

### Typography

- **Headings:** System font, bold weight
- **Body:** System font, regular weight
- **Sizes:** xs (12), sm (14), base (16), lg (18), xl (20), 2xl (24), 3xl (30)

---

## Testing

### Manual QA

See `QA_GUIDE.md` for comprehensive manual testing instructions.

### Code Quality

```bash
# TypeScript type checking
npx tsc --noEmit

# Linting
npm run lint

# Export bundle (production validation)
npx expo export
```

---

## Configuration

### Environment Variables

The app uses the following configuration (set in `app.json`):

- `name`: "Doze"
- `slug`: "doze-planner"
- `scheme`: "doze"
- `bundleIdentifier` (iOS): "com.doze.planner"
- `package` (Android): "com.doze.planner"

### Notification Setup

Notifications are automatically configured via `expo-notifications` plugin. Users will be prompted for permission on first launch.

---

## Contributing

1. Fork the repository
2. Create a feature branch (`git checkout -b feature/amazing-feature`)
3. Commit changes (`git commit -m 'Add amazing feature'`)
4. Push to branch (`git push origin feature/amazing-feature`)
5. Open a Pull Request

---

## License

This project is proprietary software. All rights reserved.

---

## Acknowledgments

- **Brian P. Moran** - "The 12 Week Year" methodology
- **Gary Keller** - "The One Thing" philosophy
- **Expo Team** - Amazing React Native framework
- **Newell AI** - AI-powered coaching capabilities

---

<div align="center">
  <p><strong>Doze</strong></p>
  <p>Built with ❤️ for high achievers</p>
</div>
