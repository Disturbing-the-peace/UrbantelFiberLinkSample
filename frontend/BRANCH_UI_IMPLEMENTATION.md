# Frontend Branch Access Control Implementation Guide

## Overview
This guide describes the frontend changes needed to support branch-based access control.

## Key Concepts

### User Roles
- **Superadmin**: Can view/manage all branches, has branch switcher
- **Admin**: Can only view/manage their assigned branch, no branch switcher

### Branch Context
- Current branch is determined by:
  - Superadmin: Selected branch from switcher (or "All Branches")
  - Admin: Their assigned branch (from user profile)

## Required Changes

### 1. Auth Context Updates

Update `frontend/src/contexts/AuthContext.tsx` to include branch information:

```typescript
interface User {
  id: string;
  email: string;
  role: 'admin' | 'superadmin';
  full_name: string;
  branch_id: string;  // NEW
  branch?: {          // NEW - populated from API
    id: string;
    name: string;
  };
}

interface AuthContextType {
  user: User | null;
  // ... existing fields
  currentBranch: string | null;  // NEW - selected branch for superadmin
  setCurrentBranch: (branchId: string | null) => void;  // NEW
}
```

### 2. Branch Context Provider

Create `frontend/src/contexts/BranchContext.tsx`:

```typescript
import { createContext, useContext, useState, useEffect } from 'react';
import { useAuth } from './AuthContext';

interface Branch {
  id: string;
  name: string;
  is_active: boolean;
}

interface BranchContextType {
  branches: Branch[];
  currentBranch: string | null;
  setCurrentBranch: (branchId: string | null) => void;
  isLoading: boolean;
}

export const BranchContext = createContext<BranchContextType | undefined>(undefined);

export function BranchProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [branches, setBranches] = useState<Branch[]>([]);
  const [currentBranch, setCurrentBranch] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    if (user) {
      fetchBranches();
      
      // Set initial branch
      if (user.role === 'admin') {
        setCurrentBranch(user.branch_id);
      } else {
        // Superadmin: default to "All Branches" (null)
        setCurrentBranch(null);
      }
    }
  }, [user]);

  const fetchBranches = async () => {
    try {
      const response = await fetch('/api/branches', {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setBranches(data);
    } catch (error) {
      console.error('Error fetching branches:', error);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <BranchContext.Provider value={{ branches, currentBranch, setCurrentBranch, isLoading }}>
      {children}
    </BranchContext.Provider>
  );
}

export function useBranch() {
  const context = useContext(BranchContext);
  if (!context) {
    throw new Error('useBranch must be used within BranchProvider');
  }
  return context;
}
```

### 3. Branch Switcher Component

Create `frontend/src/components/BranchSwitcher.tsx`:

```typescript
'use client';

import { useBranch } from '@/contexts/BranchContext';
import { useAuth } from '@/contexts/AuthContext';

export default function BranchSwitcher() {
  const { user } = useAuth();
  const { branches, currentBranch, setCurrentBranch, isLoading } = useBranch();

  // Only show for superadmins
  if (user?.role !== 'superadmin') {
    return null;
  }

  if (isLoading) {
    return <div className="text-sm text-gray-500">Loading branches...</div>;
  }

  return (
    <div className="flex items-center gap-2">
      <label htmlFor="branch-select" className="text-sm font-medium text-gray-700">
        Branch:
      </label>
      <select
        id="branch-select"
        value={currentBranch || ''}
        onChange={(e) => setCurrentBranch(e.target.value || null)}
        className="block w-48 rounded-md border-gray-300 shadow-sm focus:border-blue-500 focus:ring-blue-500 sm:text-sm"
      >
        <option value="">All Branches</option>
        {branches.map((branch) => (
          <option key={branch.id} value={branch.id}>
            {branch.name}
          </option>
        ))}
      </select>
    </div>
  );
}
```

### 4. Update Dashboard Layout

Update `frontend/src/app/dashboard/layout.tsx` to include branch switcher:

```typescript
import BranchSwitcher from '@/components/BranchSwitcher';
import { BranchProvider } from '@/contexts/BranchContext';

export default function DashboardLayout({ children }: { children: React.ReactNode }) {
  return (
    <BranchProvider>
      <div className="min-h-screen bg-gray-100">
        <nav className="bg-white shadow-sm">
          <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
            <div className="flex h-16 justify-between items-center">
              <div className="flex items-center">
                {/* Logo and navigation */}
              </div>
              
              {/* Branch Switcher */}
              <BranchSwitcher />
              
              <div className="flex items-center">
                {/* User menu */}
              </div>
            </div>
          </div>
        </nav>
        
        <main>{children}</main>
      </div>
    </BranchProvider>
  );
}
```

### 5. Update API Calls

Create a helper to add branch parameter to API calls:

```typescript
// frontend/src/lib/api.ts
import { useBranch } from '@/contexts/BranchContext';

export function useApiWithBranch() {
  const { currentBranch } = useBranch();

  const buildUrl = (endpoint: string, params?: Record<string, string>) => {
    const url = new URL(endpoint, process.env.NEXT_PUBLIC_API_URL);
    
    // Add branch parameter if set
    if (currentBranch) {
      url.searchParams.set('branch_id', currentBranch);
    }
    
    // Add other parameters
    if (params) {
      Object.entries(params).forEach(([key, value]) => {
        url.searchParams.set(key, value);
      });
    }
    
    return url.toString();
  };

  return { buildUrl, currentBranch };
}
```

### 6. Update Data Fetching

Example: Update agents list to use branch filtering:

```typescript
'use client';

import { useEffect, useState } from 'react';
import { useApiWithBranch } from '@/lib/api';

export default function AgentsPage() {
  const [agents, setAgents] = useState([]);
  const { buildUrl, currentBranch } = useApiWithBranch();

  useEffect(() => {
    fetchAgents();
  }, [currentBranch]); // Refetch when branch changes

  const fetchAgents = async () => {
    try {
      const url = buildUrl('/api/agents');
      const response = await fetch(url, {
        headers: {
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
      });
      const data = await response.json();
      setAgents(data);
    } catch (error) {
      console.error('Error fetching agents:', error);
    }
  };

  return (
    <div>
      {/* Agent list UI */}
    </div>
  );
}
```

### 7. Update Forms

#### Agent Creation Form

```typescript
'use client';

import { useState, useEffect } from 'react';
import { useAuth } from '@/contexts/AuthContext';
import { useBranch } from '@/contexts/BranchContext';

export default function CreateAgentForm() {
  const { user } = useAuth();
  const { branches } = useBranch();
  const [formData, setFormData] = useState({
    name: '',
    contact_number: '',
    email: '',
    branch_id: user?.role === 'admin' ? user.branch_id : '',
  });

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    
    try {
      const response = await fetch('/api/agents', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${localStorage.getItem('token')}`,
        },
        body: JSON.stringify(formData),
      });
      
      if (response.ok) {
        // Success
      }
    } catch (error) {
      console.error('Error creating agent:', error);
    }
  };

  return (
    <form onSubmit={handleSubmit}>
      <div>
        <label>Name</label>
        <input
          type="text"
          value={formData.name}
          onChange={(e) => setFormData({ ...formData, name: e.target.value })}
          required
        />
      </div>

      {/* Branch selector - only for superadmin */}
      {user?.role === 'superadmin' && (
        <div>
          <label>Branch</label>
          <select
            value={formData.branch_id}
            onChange={(e) => setFormData({ ...formData, branch_id: e.target.value })}
            required
          >
            <option value="">Select Branch</option>
            {branches.map((branch) => (
              <option key={branch.id} value={branch.id}>
                {branch.name}
              </option>
            ))}
          </select>
        </div>
      )}

      {/* Other fields */}
      
      <button type="submit">Create Agent</button>
    </form>
  );
}
```

### 8. Update Data Tables

Add branch column to tables:

```typescript
const columns = [
  { key: 'name', label: 'Name' },
  { key: 'email', label: 'Email' },
  { key: 'branch', label: 'Branch', render: (row) => row.branches?.name || 'N/A' },
  // ... other columns
];
```

### 9. Dashboard Stats

Update dashboard to show branch context:

```typescript
export default function DashboardPage() {
  const { user } = useAuth();
  const { currentBranch, branches } = useBranch();

  const branchName = currentBranch
    ? branches.find((b) => b.id === currentBranch)?.name
    : 'All Branches';

  return (
    <div>
      <div className="mb-4">
        <h1 className="text-2xl font-bold">Dashboard</h1>
        {user?.role === 'superadmin' && (
          <p className="text-sm text-gray-600">Viewing: {branchName}</p>
        )}
        {user?.role === 'admin' && (
          <p className="text-sm text-gray-600">Branch: {user.branch?.name}</p>
        )}
      </div>
      
      {/* Dashboard content */}
    </div>
  );
}
```

## Testing Checklist

### Superadmin Testing
- [ ] Branch switcher appears in header
- [ ] Can select "All Branches"
- [ ] Can select specific branch
- [ ] Data updates when branch changes
- [ ] Can create agents in any branch
- [ ] Can create users in any branch
- [ ] Analytics show correct branch data

### Admin Testing
- [ ] No branch switcher visible
- [ ] Only sees data from assigned branch
- [ ] Cannot create agents in other branches
- [ ] Cannot see other branches in dropdowns
- [ ] Dashboard shows only their branch data

### General Testing
- [ ] Branch context persists across page navigation
- [ ] Forms validate branch_id requirement
- [ ] Tables show branch column
- [ ] Filters work correctly with branch
- [ ] No data leakage between branches

## Performance Considerations

1. **Caching**: Cache branch list in context
2. **Debouncing**: Debounce branch switcher changes
3. **Optimistic Updates**: Update UI immediately when switching branches
4. **Loading States**: Show loading indicators during branch switch

## Security Notes

1. **Never trust frontend**: All branch filtering is enforced on backend
2. **RLS Policies**: Database-level security prevents data leakage
3. **API Validation**: Backend validates branch access on every request
4. **Token Security**: Branch info in JWT token is read-only
