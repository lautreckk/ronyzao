# Doze Deployment Guide

**App Name:** Doze
**Bundle ID (iOS):** `com.doze.planner`
**Package Name (Android):** `com.doze.planner`
**Version:** 1.0.0

---

## Prerequisites

1. Install EAS CLI globally:
   ```bash
   npm install -g eas-cli
   ```

2. Login to your Expo account:
   ```bash
   eas login
   ```

3. Link project to Expo (first time only):
   ```bash
   eas init
   ```

---

## Build Commands

### Production Builds (App Store / Play Store)

**Android (Google Play Store):**
```bash
npm run build:android
```

**iOS (Apple App Store):**
```bash
npm run build:ios
```

### Preview Builds (Internal Testing)

**Android APK:**
```bash
npm run build:preview:android
```

**iOS (TestFlight/Ad-hoc):**
```bash
npm run build:preview:ios
```

---

## Credentials

EAS Build automatically manages credentials:

- **iOS:** EAS will prompt to generate or use existing certificates and provisioning profiles. You'll need an Apple Developer account ($99/year).
- **Android:** EAS generates a keystore automatically. For Play Store, you can use Google Play App Signing.

To manage credentials manually:
```bash
eas credentials
```

---

## After Build Completes

1. **Find your builds:** Visit [expo.dev/accounts/[your-username]/projects/doze-planner/builds](https://expo.dev)

2. **Download binaries:**
   - Android: `.aab` file for Play Store, `.apk` for direct install
   - iOS: `.ipa` file for App Store Connect

3. **Submit to stores:**
   ```bash
   # Submit to Google Play
   eas submit -p android --profile production

   # Submit to Apple App Store
   eas submit -p ios --profile production
   ```

---

## Version Bumping

Before each new release, update in `app.json`:
- `expo.version` - User-facing version (e.g., "1.0.1")
- `expo.ios.buildNumber` - Increment for each iOS build
- `expo.android.versionCode` - Increment for each Android build

Or use auto-increment (already configured for iOS in `eas.json`).

---

## Web Deployment (PWA)

The app is fully compatible with web deployment. Native features like notifications are automatically disabled on web.

### Build for Web

```bash
npx expo export -p web
```

This generates a static build in the `dist/` folder.

### Deploy to Hosting Services

**Vercel:**
```bash
# Install Vercel CLI (if not installed)
npm install -g vercel

# Deploy from project root
vercel --prod
```

**Netlify:**
```bash
# Install Netlify CLI (if not installed)
npm install -g netlify-cli

# Build and deploy
npx expo export -p web
netlify deploy --prod --dir=dist
```

**Manual Upload:**
The `dist/` folder contains static files that can be uploaded to any static hosting service (GitHub Pages, Firebase Hosting, AWS S3, etc.).

### Web-Specific Notes

- **Notifications:** Gracefully disabled on web (no errors)
- **Storage:** Uses browser's localStorage (via AsyncStorage web implementation)
- **Output:** Single-page application (SPA) with client-side routing

---

## Checklist

### Initial Setup
- [ ] `eas login` - Logged into Expo account
- [ ] `eas init` - Project linked to Expo
- [ ] App icons verified in `assets/images/`
- [ ] Version numbers set in `app.json`

### Testing
- [ ] Run `npm run build:preview:android` for test APK
- [ ] Run `npm run build:preview:ios` for test build
- [ ] Test preview builds on physical devices

### Production (Mobile)
- [ ] Run `npm run build:android` for production
- [ ] Run `npm run build:ios` for production
- [ ] Submit to Google Play Store
- [ ] Submit to Apple App Store

### Production (Web)
- [ ] Run `npx expo export -p web` to build
- [ ] Deploy `dist/` folder to hosting service
