# NetHub Setup Guide

## Prerequisites

Install these first:

1. **Node.js 18+**
   - Download: https://nodejs.org/
   - Verify: `node --version`

2. **npm** (comes with Node.js)
   - Verify: `npm --version`

3. **Supabase Account**
   - Sign up: https://supabase.com/
   - Create new project
   - Get project URL and anon key

## Installation

### 1. Clone Repository
```bash
git clone <repository-url>
cd nethub
```

### 2. Install Dependencies

**Backend:**
```bash
cd backend
npm install
```

**Frontend:**
```bash
cd frontend
npm install
```

### 3. Environment Configuration

**Backend** - Create `backend/.env`:
```env
SUPABASE_URL=your_supabase_project_url
SUPABASE_ANON_KEY=your_supabase_anon_key
SUPABASE_SERVICE_ROLE_KEY=your_supabase_service_role_key
PORT=3001
JWT_SECRET=your_jwt_secret_key
```

**Frontend** - Create `frontend/.env.local`:
```env
NEXT_PUBLIC_SUPABASE_URL=your_supabase_project_url
NEXT_PUBLIC_SUPABASE_ANON_KEY=your_supabase_anon_key
NEXT_PUBLIC_API_URL=http://localhost:3001
```

### 4. Database Setup

Run migrations:

**Windows:**
```bash
cd backend/src/migrations
./run-migrations.ps1
```

**Linux/Mac:**
```bash
cd backend/src/migrations
chmod +x run-migrations.sh
./run-migrations.sh
```

### 5. Start Development Servers

**Backend** (Terminal 1):
```bash
cd backend
npm run dev
```
Runs on: http://localhost:3001

**Frontend** (Terminal 2):
```bash
cd frontend
npm run dev
```
Runs on: http://localhost:3000

## Default Login

- **Email:** `admin@example.com`
- **Password:** `Admin123!`

## Common Issues

### Port Already in Use
- Backend: Change `PORT` in `backend/.env`
- Frontend: Use `npm run dev -- -p 3002`

### Migration Errors
- Check Supabase credentials in `.env`
- Verify database connection
- Check migration logs

### Module Not Found
```bash
# Delete node_modules and reinstall
rm -rf node_modules package-lock.json
npm install
```

### Build Cache Issues
```bash
# Frontend: Delete .next folder
rm -rf frontend/.next
```

## Production Build

**Backend:**
```bash
cd backend
npm run build
npm start
```

**Frontend:**
```bash
cd frontend
npm run build
npm start
```

## Tech Stack

- **Frontend:** Next.js 15, React 19, TypeScript, Tailwind CSS
- **Backend:** Node.js, Express, TypeScript
- **Database:** Supabase (PostgreSQL)
- **Auth:** JWT

## Documentation

- User Manual: `USER_MANUAL.html`
- QR Setup: `Markdown/SYSTEM_QR_CODE_SETUP.md`
