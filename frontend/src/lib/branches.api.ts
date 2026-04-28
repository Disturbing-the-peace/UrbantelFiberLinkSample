/**
 * Branches API Client
 * Handles all branch-related API calls
 */

import { apiRequest } from './api';

export interface Branch {
  id: string;
  name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  is_active: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateBranchData {
  name: string;
  address?: string;
  contact_number?: string;
  email?: string;
  is_active?: boolean;
}

export interface UpdateBranchData {
  name?: string;
  address?: string;
  contact_number?: string;
  email?: string;
  is_active?: boolean;
}

/**
 * Branch API methods
 */
export const branchesApi = {
  /**
   * Get all branches
   */
  getAll: () => apiRequest<Branch[]>('/api/branches'),

  /**
   * Get a single branch by ID
   */
  getById: (id: string) => apiRequest<Branch>(`/api/branches/${id}`),

  /**
   * Create a new branch (superadmin only)
   */
  create: (data: CreateBranchData) => apiRequest<Branch>('/api/branches', {
    method: 'POST',
    body: JSON.stringify(data),
  }),

  /**
   * Update an existing branch (superadmin only)
   */
  update: (id: string, data: UpdateBranchData) => apiRequest<Branch>(`/api/branches/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),

  /**
   * Delete a branch (superadmin only)
   */
  delete: (id: string) => apiRequest<{ message: string }>(`/api/branches/${id}`, {
    method: 'DELETE',
  }),
};
