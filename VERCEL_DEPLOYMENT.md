    # Vercel Deployment Guide

## Quick Deploy Steps

### 1. Push to GitHub
```bash
git add .
git commit -m "Prepare for Vercel deployment"
git push origin main
```

### 2. Deploy to Vercel

1. Go to [vercel.com](https://vercel.com)
2. Sign in with GitHub
3. Click **"Add New Project"**
4. Import your `ULConnect` repository
5. **IMPORTANT**: Click "Edit" next to Root Directory
6. Set **Root Directory**: `frontend` (click the folder icon and select it)
7. Framework Preset: Next.js (auto-detected)
8. Leave Build/Output settings as default

### 3. Add Environment Variables

In Vercel project settings → Environment Variables, add:

```
NEXT_PUBLIC_SUPABASE_URL=https://znnimbdzzpxlxrkzmahl.supabase.co
NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ORFsvup4vqQ0k8Ewl2upFA_FEm2J9Oj
```

### 4. Deploy

Click **"Deploy"** - takes ~2 minutes.

You'll get a URL like: `https://ulconnect.vercel.app`

### 5. Configure Supabase (REQUIRED for auth to work)

1. Go to [Supabase Dashboard](https://supabase.com/dashboard)
2. Select your project: `znnimbdzzpxlxrkzmahl`
3. Go to **Authentication** → **URL Configuration**
4. Add your Vercel URL to **Site URL**: `https://your-project.vercel.app`
5. Add to **Redirect URLs**:
   - `https://your-project.vercel.app/login`
   - `https://your-project.vercel.app/dashboard`
   - `https://your-project.vercel.app/**` (wildcard for all routes)
6. Save changes

**Without this step, login will fail with authentication error.**

## What Works

✅ Landing page  
✅ Login page  
✅ All frontend UI  
✅ Supabase authentication  
✅ Database queries  
✅ Full application functionality

## What Doesn't Work

❌ Backend API endpoints (localhost:5000) - not needed for demo  
❌ File uploads to local backend - uses Supabase Storage instead

## Auto-Deploy

Every `git push` auto-deploys to Vercel.

## Custom Domain (Optional)

Vercel Settings → Domains → Add your domain

## Notes

- Free tier = 100GB bandwidth/month
- No time limit - stays live forever
- HTTPS enabled automatically
- Global CDN included
