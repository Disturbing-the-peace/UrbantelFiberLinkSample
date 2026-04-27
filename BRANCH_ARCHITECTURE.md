# Branch-Based Access Control Architecture

## System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         FRONTEND                                 │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────┐         ┌──────────────────┐             │
│  │  Superadmin UI   │         │    Admin UI      │             │
│  ├──────────────────┤         ├──────────────────┤             │
│  │ • Branch Switcher│         │ • No Switcher    │             │
│  │ • All Branches   │         │ • Fixed Branch   │             │
│  │ • Filter by      │         │ • Auto-filtered  │             │
│  │   Branch         │         │                  │             │
│  └────────┬─────────┘         └────────┬─────────┘             │
│           │                            │                        │
│           └────────────┬───────────────┘                        │
│                        │                                        │
│              ┌─────────▼──────────┐                            │
│              │  BranchContext     │                            │
│              │  • Current Branch  │                            │
│              │  • Branch List     │                            │
│              │  • Switch Handler  │                            │
│              └─────────┬──────────┘                            │
│                        │                                        │
└────────────────────────┼────────────────────────────────────────┘
                         │
                         │ API Calls with ?branch_id=<uuid>
                         │
┌────────────────────────▼────────────────────────────────────────┐
│                         BACKEND                                  │
├─────────────────────────────────────────────────────────────────┤
│                                                                   │
│  ┌──────────────────────────────────────────────────────────┐  │
│  │                    Auth Middleware                        │  │
│  │  • Verify JWT Token                                       │  │
│  │  • Extract user.branch_id                                 │  │
│  │  • Attach to req.user                                     │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │                 Branch Filter Helper                      │  │
│  │  • If admin: filter by user.branch_id                     │  │
│  │  • If superadmin: use query param or show all             │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
│  ┌────────────────────────▼─────────────────────────────────┐  │
│  │                    Route Handlers                         │  │
│  │  /api/branches    - Branch CRUD (superadmin only)         │  │
│  │  /api/agents      - Filtered by branch                    │  │
│  │  /api/applications- Filtered by branch                    │  │
│  │  /api/commissions - Filtered by branch                    │  │
│  │  /api/analytics/* - Filtered by branch                    │  │
│  └────────────────────────┬─────────────────────────────────┘  │
│                            │                                     │
└────────────────────────────┼─────────────────────────────────────┘
                             │
                             │ SQL Queries with branch_id filter
                             │
┌────────────────────────────▼─────────────────────────────────────┐
│                         DATABASE                                  │
├──────────────────────────────────────────────────────────────────┤
│                                                                    │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │                  Row Level Security (RLS)                 │   │
│  │  • Superadmin: Bypass branch filter                       │   │
│  │  • Admin: Enforce branch_id = user.branch_id              │   │
│  │  • Public: No branch filter (for agent portal)            │   │
│  └────────────────────────┬─────────────────────────────────┘   │
│                            │                                      │
│  ┌────────────────────────▼─────────────────────────────────┐   │
│  │                      Tables                               │   │
│  │  ┌──────────┐  ┌──────────┐  ┌──────────┐               │   │
│  │  │ branches │  │  users   │  │  agents  │               │   │
│  │  ├──────────┤  ├──────────┤  ├──────────┤               │   │
│  │  │ id       │  │ id       │  │ id       │               │   │
│  │  │ name     │  │ email    │  │ name     │               │   │
│  │  │ is_active│  │ role     │  │ branch_id│◄──┐           │   │
│  │  └──────────┘  │ branch_id│◄─┘          │   │           │   │
│  │                └──────────┘              │   │           │   │
│  │                                          │   │           │   │
│  │  ┌──────────────┐  ┌──────────────┐    │   │           │   │
│  │  │ applications │  │ commissions  │    │   │           │   │
│  │  ├──────────────┤  ├──────────────┤    │   │           │   │
│  │  │ id           │  │ id           │    │   │           │   │
│  │  │ agent_id     │  │ agent_id     │    │   │           │   │
│  │  │ branch_id    │◄─┤ branch_id    │◄───┘   │           │   │
│  │  └──────────────┘  └──────────────┘        │           │   │
│  │                                             │           │   │
│  │  ┌──────────┐  ┌──────────┐                │           │   │
│  │  │  plans   │  │  events  │                │           │   │
│  │  ├──────────┤  ├──────────┤                │           │   │
│  │  │ id       │  │ id       │                │           │   │
│  │  │ name     │  │ title    │                │           │   │
│  │  │ branch_id│◄─┤ branch_id│◄───────────────┘           │   │
│  │  └──────────┘  └──────────┘                            │   │
│  └──────────────────────────────────────────────────────────┘   │
│                                                                   │
└───────────────────────────────────────────────────────────────────┘
```

## Data Flow

### 1. Superadmin Viewing Data

```
┌──────────────┐
│ Superadmin   │
│ Selects      │
│ "Davao de Oro"│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Frontend: BranchContext              │
│ • currentBranch = "uuid-davao-oro"   │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ API Call:                            │
│ GET /api/agents?branch_id=uuid       │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Backend: Branch Filter               │
│ • User is superadmin                 │
│ • Apply branch_id filter from query  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Database: RLS Policy                 │
│ • Superadmin: Allow all              │
│ • Query: WHERE branch_id = uuid      │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Result: Agents from Davao de Oro    │
└──────────────────────────────────────┘
```

### 2. Admin Viewing Data

```
┌──────────────┐
│ Admin        │
│ (Assigned to │
│ Davao Del Sur)│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Frontend: No Branch Switcher         │
│ • Uses user.branch_id automatically  │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ API Call:                            │
│ GET /api/agents                      │
│ (no branch_id param)                 │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Backend: Branch Filter               │
│ • User is admin                      │
│ • Apply user.branch_id filter        │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Database: RLS Policy                 │
│ • Admin: WHERE branch_id = user.id   │
│ • Enforced at database level         │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Result: Agents from Davao Del Sur   │
│ (Admin cannot see other branches)    │
└──────────────────────────────────────┘
```

### 3. Creating New Agent

```
┌──────────────┐
│ User         │
│ Creates Agent│
└──────┬───────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Frontend: Agent Form                 │
│ • Superadmin: Select branch dropdown │
│ • Admin: Hidden, uses user.branch_id │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ API Call:                            │
│ POST /api/agents                     │
│ Body: { name, branch_id }            │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Backend: Validation                  │
│ • branch_id is required              │
│ • Admin: must match user.branch_id   │
│ • Superadmin: can use any branch     │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Database: Insert                     │
│ INSERT INTO agents                   │
│ (name, branch_id, ...)               │
└──────┬───────────────────────────────┘
       │
       ▼
┌──────────────────────────────────────┐
│ Result: Agent created in branch      │
└──────────────────────────────────────┘
```

## Security Layers

```
┌─────────────────────────────────────────────────────────────┐
│                    Security Layer 1                          │
│                   Frontend Validation                        │
│  • Hide branch switcher for admins                          │
│  • Validate branch selection in forms                       │
│  • Show only relevant data in UI                            │
│  ⚠️  NOT TRUSTED - Can be bypassed                          │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Security Layer 2                          │
│                  Backend Validation                          │
│  • Verify user role and branch_id                           │
│  • Apply branch filters to all queries                      │
│  • Validate branch_id in request body                       │
│  ✅ TRUSTED - Server-side enforcement                       │
└────────────────────────┬────────────────────────────────────┘
                         │
┌────────────────────────▼────────────────────────────────────┐
│                    Security Layer 3                          │
│              Row Level Security (RLS)                        │
│  • Database-level access control                            │
│  • Enforced on every query                                  │
│  • Cannot be bypassed by application                        │
│  ✅✅ MOST TRUSTED - Database enforcement                   │
└─────────────────────────────────────────────────────────────┘
```

## Branch Relationships

```
┌─────────────────────────────────────────────────────────────┐
│                         Branches                             │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐     │
│  │ Davao Del Sur│  │ Davao de Oro │  │Davao Oriental│     │
│  └──────┬───────┘  └──────┬───────┘  └──────┬───────┘     │
│         │                 │                  │              │
└─────────┼─────────────────┼──────────────────┼──────────────┘
          │                 │                  │
          │                 │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │  Users    │     │  Users    │     │  Users    │
    │  • Admin1 │     │  • Admin2 │     │  • Admin3 │
    │  • Admin4 │     │           │     │           │
    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
          │                 │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │  Agents   │     │  Agents   │     │  Agents   │
    │  • 50     │     │  • 30     │     │  • 20     │
    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
          │                 │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │Applications│    │Applications│    │Applications│
    │  • 200    │     │  • 150    │     │  • 100    │
    └─────┬─────┘     └─────┬─────┘     └─────┬─────┘
          │                 │                  │
    ┌─────▼─────┐     ┌─────▼─────┐     ┌─────▼─────┐
    │Commissions│     │Commissions│     │Commissions│
    │  • 120    │     │  • 90     │     │  • 60     │
    └───────────┘     └───────────┘     └───────────┘

    Superadmin can see ALL branches
    Admin can see ONLY their branch
```

## Migration Flow

```
┌─────────────────────────────────────────────────────────────┐
│                    Before Migration                          │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐             │
│  │  users   │  │  agents  │  │ applications │             │
│  ├──────────┤  ├──────────┤  ├──────────────┤             │
│  │ id       │  │ id       │  │ id           │             │
│  │ email    │  │ name     │  │ agent_id     │             │
│  │ role     │  │ ...      │  │ ...          │             │
│  └──────────┘  └──────────┘  └──────────────┘             │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Run Migration 019
                         ▼
┌─────────────────────────────────────────────────────────────┐
│              After Migration 019 (Add Columns)               │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐             │
│  │  users   │  │  agents  │  │ applications │             │
│  ├──────────┤  ├──────────┤  ├──────────────┤             │
│  │ id       │  │ id       │  │ id           │             │
│  │ email    │  │ name     │  │ agent_id     │             │
│  │ role     │  │ branch_id│  │ branch_id    │             │
│  │ branch_id│  │ (NULL)   │  │ (NULL)       │             │
│  │ (NULL)   │  │ ...      │  │ ...          │             │
│  └──────────┘  └──────────┘  └──────────────┘             │
│                                                              │
│  ┌──────────┐                                               │
│  │ branches │  ← NEW TABLE                                  │
│  ├──────────┤                                               │
│  │ Davao Del Sur                                            │
│  │ Davao de Oro                                             │
│  │ Davao Oriental                                           │
│  └──────────┘                                               │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Run Migration 020
                         ▼
┌─────────────────────────────────────────────────────────────┐
│          After Migration 020 (Assign Default Branch)         │
│  ┌──────────┐  ┌──────────┐  ┌──────────────┐             │
│  │  users   │  │  agents  │  │ applications │             │
│  ├──────────┤  ├──────────┤  ├──────────────┤             │
│  │ id       │  │ id       │  │ id           │             │
│  │ email    │  │ name     │  │ agent_id     │             │
│  │ role     │  │ branch_id│  │ branch_id    │             │
│  │ branch_id│  │ (Davao   │  │ (Davao       │             │
│  │ (Davao   │  │  Del Sur)│  │  Del Sur)    │             │
│  │  Del Sur)│  │ ...      │  │ ...          │             │
│  └──────────┘  └──────────┘  └──────────────┘             │
│                                                              │
│  All existing data now has branch_id = "Davao Del Sur"      │
└─────────────────────────────────────────────────────────────┘
                         │
                         │ Run Migration 021
                         ▼
┌─────────────────────────────────────────────────────────────┐
│            After Migration 021 (Update RLS)                  │
│  • RLS policies updated for branch filtering                │
│  • Superadmins can see all branches                         │
│  • Admins can only see their branch                         │
│  • branch_id is now NOT NULL                                │
└─────────────────────────────────────────────────────────────┘
```

## Complete!

The architecture ensures:
- ✅ Data isolation between branches
- ✅ Role-based access control
- ✅ Database-level security
- ✅ Scalable to many branches
- ✅ Backward compatible with existing data
