# Railway Deployment Guide for UrbanConnect ISP System

## Project Structure
This is a monorepo with:
- **Backend**: Express.js API (Node.js/TypeScript)
- **Frontend**: Next.js application (React/TypeScript)
- **Database**: Supabase (PostgreSQL)

## Deployment Steps

### 1. Create Railway Account
- Go to [railway.app](https://railway.app)
- Sign up with GitHub (recommended for easier deployment)

### 2. Deploy Backend Service

1. Create a new project in Railway
2. Click "New" → "GitHub Repo" → Select your repository
3. Railway will detect the monorepo structure
4. Configure the backend service:
   - **Root Directory**: `backend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

5. Add environment variables in Railway dashboard:
   ```
   PORT=5000
   SUPABASE_URL=https://znnimbdzzpxlxrkzmahl.supabase.co
   SUPABASE_ANON_KEY=sb_publishable_ORFsvup4vqQ0k8Ewl2upFA_FEm2J9Oj
   SUPABASE_SERVICE_ROLE_KEY=sb_secret_-VtqAzTBc6d9FRfIkqqPRw_CNSwxMD1
   JWT_SECRET=WBx2Hyf5XHuCvHwHF/e6++vzzI5EAABIGX7+cfZldGrNe3DGf2hQ1+vN4aJ/3NPXLVL1l82OZykw7JKEySstFg==
   SMS_API_KEY=your_sms_api_key
   SMS_API_URL=your_sms_api_url
   MESSENGER_PAGE_ACCESS_TOKEN=your_messenger_page_access_token
   MESSENGER_VERIFY_TOKEN=your_messenger_verify_token
   NODE_ENV=production
   ```

6. Railway will automatically generate a public URL (e.g., `https://your-backend.railway.app`)

### 3. Deploy Frontend Service

1. In the same Railway project, add a new service
2. Click "New" → "GitHub Repo" → Select the same repository
3. Configure the frontend service:
   - **Root Directory**: `frontend`
   - **Build Command**: `npm install && npm run build`
   - **Start Command**: `npm start`

4. Add environment variables:
   ```
   NEXT_PUBLIC_SUPABASE_URL=https://znnimbdzzpxlxrkzmahl.supabase.co
   NEXT_PUBLIC_SUPABASE_ANON_KEY=sb_publishable_ORFsvup4vqQ0k8Ewl2upFA_FEm2J9Oj
   NEXT_PUBLIC_API_URL=https://your-backend.railway.app
   NODE_ENV=production
   ```
   
   **Important**: Replace `https://your-backend.railway.app` with the actual backend URL from step 2.6

5. Railway will generate a public URL for your frontend (e.g., `https://your-frontend.railway.app`)

### 4. Update CORS Configuration

After deployment, update the backend CORS settings to allow your Railway frontend URL:

1. Go to `backend/src/index.ts`
2. Update the CORS origin array to include your Railway frontend URL:
   ```typescript
   app.use(cors({
     origin: [
       'http://localhost:3000',
       'https://your-frontend.railway.app'  // Add this
     ],
     credentials: true
   }));
   ```
3. Commit and push the changes - Railway will auto-redeploy

### 5. Database Migrations

Your Supabase database is already configured. If you need to run migrations:

1. Use the Supabase dashboard SQL editor
2. Or run migrations from your local machine using the Supabase CLI
3. Migration files are in `backend/src/migrations/`

### 6. Custom Domains (Optional)

To use custom domains:
1. Go to each service settings in Railway
2. Click "Settings" → "Domains"
3. Add your custom domain
4. Update DNS records as instructed by Railway

## Environment Variables Checklist

### Backend Service
- [ ] PORT
- [ ] SUPABASE_URL
- [ ] SUPABASE_ANON_KEY
- [ ] SUPABASE_SERVICE_ROLE_KEY
- [ ] JWT_SECRET
- [ ] NODE_ENV
- [ ] SMS_API_KEY (optional)
- [ ] SMS_API_URL (optional)
- [ ] MESSENGER_PAGE_ACCESS_TOKEN (optional)
- [ ] MESSENGER_VERIFY_TOKEN (optional)

### Frontend Service
- [ ] NEXT_PUBLIC_SUPABASE_URL
- [ ] NEXT_PUBLIC_SUPABASE_ANON_KEY
- [ ] NEXT_PUBLIC_API_URL (must point to backend Railway URL)
- [ ] NODE_ENV

## Monitoring & Logs

- View logs in Railway dashboard for each service
- Set up health check monitoring using the `/health` endpoint
- Railway provides automatic metrics and monitoring

## Troubleshooting

### Build Fails
- Check build logs in Railway dashboard
- Ensure all dependencies are in package.json
- Verify Node.js version compatibility

### Backend Can't Connect to Frontend
- Verify CORS settings include Railway frontend URL
- Check NEXT_PUBLIC_API_URL points to correct backend URL

### Environment Variables Not Working
- Ensure variables are set in Railway dashboard (not just in .env files)
- Restart services after adding new variables
- Check variable names match exactly (case-sensitive)

## Cost Optimization

Railway offers:
- $5/month free credit (Hobby plan)
- Pay-as-you-go pricing
- Sleep inactive services to save costs

## Security Notes

⚠️ **Important**: The credentials in this guide are from your .env files. For production:
1. Rotate all secrets and API keys
2. Use Railway's secret management
3. Never commit .env files to git
4. Enable Supabase RLS policies
5. Use strong JWT secrets

## Continuous Deployment

Railway automatically deploys when you push to your main branch:
1. Push code to GitHub
2. Railway detects changes
3. Automatically builds and deploys
4. Zero-downtime deployment

## Support

- Railway Docs: https://docs.railway.app
- Railway Discord: https://discord.gg/railway
- Supabase Docs: https://supabase.com/docs
