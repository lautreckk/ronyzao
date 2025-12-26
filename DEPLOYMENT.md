# 🚀 Doze - Production Deployment Guide

## ✅ Pre-Deployment Checklist (Completed)

- ✅ Branding aligned to "Doze" in `app.json`
- ✅ TypeScript compilation passed (no errors)
- ✅ ESLint checks passed (code quality verified)
- ✅ Web export completed successfully
- ✅ Environment variables embedded in build:
  - `EXPO_PUBLIC_NEWELL_API_URL=https://newell.fastshot.ai`
  - `EXPO_PUBLIC_PROJECT_ID=1de1f56f-4590-4e79-aa09-7ae09e21021a`
  - `EXPO_PUBLIC_POSTHOG_API_KEY=phc_yrRNNlvsUNi3opSHLQ80ATQhRstPWGeELiCihGMewCj`
  - `EXPO_PUBLIC_POSTHOG_HOST=https://app.posthog.com`

---

## 🌐 Web Deployment (Simplified - Ready to Share!)

Your web app is ready in the `dist/` folder. Choose one of these hosting options:

### Option 1: Vercel (Recommended - Easiest)

1. Install Vercel CLI (one-time):
   ```bash
   npm install -g vercel
   ```

2. Deploy (from project root):
   ```bash
   vercel --prod
   ```

3. Follow the prompts:
   - Set up and deploy: **Yes**
   - Scope: Choose your account
   - Link to existing project: **No**
   - Project name: **doze** (or press Enter)
   - Directory with code: **./** (press Enter)
   - Override settings: **No**

4. Your app will be live at: `https://doze.vercel.app` (or custom domain)

**Environment Variables (Optional but Recommended):**
If you want to change environment variables without rebuilding:
```bash
vercel env add EXPO_PUBLIC_NEWELL_API_URL
vercel env add EXPO_PUBLIC_PROJECT_ID
vercel env add EXPO_PUBLIC_POSTHOG_API_KEY
vercel env add EXPO_PUBLIC_POSTHOG_HOST
```

### Option 2: Netlify

1. Install Netlify CLI:
   ```bash
   npm install -g netlify-cli
   ```

2. Deploy:
   ```bash
   netlify deploy --prod --dir=dist
   ```

3. Follow prompts to create/link site

### Option 3: GitHub Pages (Free)

1. Install `gh-pages`:
   ```bash
   npm install -g gh-pages
   ```

2. Deploy:
   ```bash
   gh-pages -d dist
   ```

3. Enable GitHub Pages in repository settings

### Option 4: Any Static Host

Simply upload the entire `dist/` folder to:
- Firebase Hosting
- AWS S3 + CloudFront
- Cloudflare Pages
- Render
- Railway

---

## 📱 Mobile App Builds (iOS & Android)

### Prerequisites

1. **Install EAS CLI** (one-time):
   ```bash
   npm install -g eas-cli
   ```

2. **Login to Expo**:
   ```bash
   eas login
   ```

3. **Configure Project** (if not done):
   ```bash
   eas build:configure
   ```

### Android Build

**Production (Google Play Store):**
```bash
npm run build:android
```
or
```bash
eas build --platform android --profile production
```

**Preview (Internal Testing APK):**
```bash
npm run build:preview:android
```

### iOS Build

**Production (App Store):**
```bash
npm run build:ios
```
or
```bash
eas build --platform ios --profile production
```

**Preview (Internal Testing):**
```bash
npm run build:preview:ios
```

### Build Both Platforms Simultaneously
```bash
eas build --platform all --profile production
```

---

## 🔐 Production Environment Variables

Your current `.env` has the correct production values embedded. If you need to update them:

1. **For Web Rebuilds:**
   - Update `.env` file
   - Run: `npx expo export --platform web`
   - Redeploy the `dist/` folder

2. **For Mobile Rebuilds:**
   - Update `.env` file
   - Run: `eas build --platform [android|ios] --profile production`

3. **For Vercel/Netlify (without rebuild):**
   - Set environment variables in their dashboard
   - Redeploy (Vercel will use the new env vars)

---

## 📊 Post-Deployment Verification

### Web App
1. Visit your deployed URL
2. Check browser console for errors
3. Verify PostHog analytics is tracking events
4. Test all main features (planner, AI assistant, notifications)

### Mobile Apps
1. Download from EAS build
2. Test on physical devices (iOS and Android)
3. Verify push notifications work
4. Check deep linking with scheme: `fastshot://`

---

## 🔄 Quick Reference Commands

```bash
# Web
npx expo export --platform web    # Rebuild web
vercel --prod                     # Deploy to Vercel

# Mobile
npm run build:android             # Android production
npm run build:ios                 # iOS production
eas build --platform all          # Build both platforms

# Quality Checks
npx tsc --noEmit                  # TypeScript check
npm run lint                      # ESLint check
```

---

## 🎉 Share with Friends!

Your web app is ready to share! Just send them the Vercel/Netlify URL.

For mobile apps:
- **Android**: Share the APK link from EAS build
- **iOS**: Add testers via TestFlight (requires Apple Developer account)

---

## ⚠️ Important Notes

1. **Bundle Identifiers:**
   - iOS: `com.doze.planner`
   - Android: `com.doze.planner`

2. **App Name:** Doze

3. **Version:** 1.0.0 (increment for updates)

4. **Deep Linking Scheme:** `fastshot://`

5. **Environment Variables are embedded** in the current build. No runtime configuration needed unless you update them.

---

## 🆘 Troubleshooting

**Web build shows white screen:**
- Check browser console for errors
- Ensure environment variables are correct
- Clear browser cache and reload

**Mobile build fails:**
- Run `eas build:configure` again
- Check `app.json` and `eas.json` are valid JSON
- Ensure all dependencies are installed: `npm install`

**Environment variables not working:**
- Ensure they start with `EXPO_PUBLIC_`
- Rebuild the app after changing `.env`
- For web, redeploy the `dist/` folder

---

**Your Doze app is production-ready! 🎉**
