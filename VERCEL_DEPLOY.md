# 🚀 Doze - Vercel Deployment Instructions

## ✅ Pre-Deployment Verification (COMPLETED)

- ✅ Web export rebuilt with "Doze" branding
- ✅ `dist/` folder: 7.3MB, ready for deployment
- ✅ `vercel.json` created for SPA routing (handles client-side navigation)
- ✅ Environment variables embedded in build
- ✅ Bundle optimized: 3.21MB JavaScript

---

## 🌐 Deploy to Vercel (3 Simple Steps)

### Step 1: Install Vercel CLI (if not already installed)

```bash
npm install -g vercel
```

**Note:** If you get a permission error, use `sudo`:
```bash
sudo npm install -g vercel
```

---

### Step 2: Login to Vercel

```bash
vercel login
```

This will open your browser. Choose your preferred login method:
- GitHub
- GitLab
- Bitbucket
- Email

---

### Step 3: Deploy!

```bash
vercel --prod
```

**Follow the prompts:**

1. **"Set up and deploy?"** → Press **Enter** (Yes)
2. **"Which scope?"** → Choose your account → Press **Enter**
3. **"Link to existing project?"** → Press **N** (No) → Press **Enter**
4. **"What's your project's name?"** → Type `doze` → Press **Enter**
5. **"In which directory is your code located?"** → Press **Enter** (uses `./`)
6. **"Want to override settings?"** → Press **N** (No) → Press **Enter**

**🎉 Deployment will start!**

You'll see:
```
🔗  Linked to username/doze (created .vercel)
🔍  Inspect: https://vercel.com/username/doze/xxxxx
✅  Production: https://doze-xxxxx.vercel.app [3s]
```

---

## 🎊 Success! Your App is Live

Your Doze app will be available at:
```
https://doze-[random].vercel.app
```

**Or set up a custom domain:**
```bash
vercel domains add yourdomain.com
```

---

## 🔄 Future Updates

When you make changes and want to redeploy:

```bash
# Rebuild the web export
npx expo export --platform web

# Deploy
vercel --prod
```

That's it! Vercel will automatically update your live site.

---

## 📱 Share with Friends

Send them the Vercel URL:
```
https://doze-xxxxx.vercel.app
```

They can:
- Use it immediately in their browser (mobile or desktop)
- Add to home screen on iOS/Android for app-like experience

---

## 🛠️ Vercel Features You Get

- ✅ **Instant global CDN** - Fast loading worldwide
- ✅ **Auto HTTPS** - Secure by default
- ✅ **Automatic scaling** - Handles traffic spikes
- ✅ **Zero config** - Everything just works
- ✅ **Free tier** - Perfect for sharing with friends

---

## 🔐 Environment Variables (Optional)

If you want to change environment variables without rebuilding:

1. Go to: https://vercel.com/dashboard
2. Select your `doze` project
3. Go to **Settings** → **Environment Variables**
4. Add:
   - `EXPO_PUBLIC_NEWELL_API_URL`
   - `EXPO_PUBLIC_PROJECT_ID`
   - `EXPO_PUBLIC_POSTHOG_API_KEY`
   - `EXPO_PUBLIC_POSTHOG_HOST`

5. Redeploy: `vercel --prod`

---

## ⚠️ Troubleshooting

**"Command 'vercel' not found"**
- Run: `npm install -g vercel`
- Or try: `npx vercel --prod`

**"Need to login"**
- Run: `vercel login`

**"Build failed"**
- The build command is already set in `vercel.json`
- If issues persist, just upload the `dist/` folder manually via Vercel dashboard

**"Page not found on refresh"**
- This is handled by `vercel.json` rewrites
- Make sure `vercel.json` is in the project root

---

## 🎯 What's Configured

Your `vercel.json` handles:
- **SPA Routing**: All routes redirect to `index.html` for client-side navigation
- **Asset Caching**: Static files cached for 1 year (optimal performance)
- **Build Command**: `npx expo export --platform web`
- **Output Directory**: `dist/`

---

## 🚀 You're Ready!

Run this command to deploy:
```bash
vercel --prod
```

**Your Doze app will be live in ~30 seconds!** 🎉
