  NetHub

 NetHub  is a comprehensive network operations management system designed for ISPs and telecommunications providers. It streamlines agent networks, customer applications, subscriber management, and commission tracking across multiple branch locations.

  Features

-  Multi-Branch Management  - Manage operations across multiple branch locations with role-based access control
-  Agent Network System  - Track agents, team leaders, and referral networks with unique referral codes
-  Application Processing  - Handle customer applications from submission to activation with document verification
-  Subscriber Management  - Manage active subscribers with plan details and service history
-  Commission Tracking  - Automated commission calculation with pending, eligible, and paid status tracking
-  Real-Time Analytics  - Dashboard with key metrics, conversion rates, and performance reports
-  Events Calendar  - Schedule and track important dates and activities
-  Agent Portal  - Public-facing portal where agents can track their applications, subscribers, and commissions
-  Dark Mode Support  - Modern UI with light and dark theme options

  Tech Stack

   Frontend
- Next.js 15, TypeScript, Tailwind CSS, Shadcn/ui, Recharts

   Backend
- Node.js, Express, TypeScript, Supabase (PostgreSQL), JWT

  Getting Started

   Prerequisites
- Node.js 18+ and npm
- Supabase account and project

   Installation

1. Clone and install dependencies
```bash
cd backend && npm install
cd ../frontend && npm install
```

2. Configure environment variables (see `.env` files in backend and frontend)

3. Run database migrations
```bash
cd backend/src/migrations
./run-migrations.ps1  # Windows
./run-migrations.sh   # Linux/Mac
```

4. Start development servers
```bash
  Backend (port 3001)
cd backend && npm run dev

  Frontend (port 3000)
cd frontend && npm run dev
```

   Default Admin
- Email: `admin@example.com`
- Password: `Admin123!`

  Documentation

See `USER_MANUAL.html` for comprehensive user guide.

  License

© 2026 UrbanTel. All rights reserved.
