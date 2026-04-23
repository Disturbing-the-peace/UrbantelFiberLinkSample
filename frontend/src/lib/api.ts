import { getSupabaseClient } from './supabase';
import { cachedFetch, dataCache, getMillisecondsUntilMidnight } from './cache';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.56:5000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

/**
 * Get the current Supabase access token
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    const supabase = getSupabaseClient();
    const { data: { session } } = await supabase.auth.getSession();
    return session?.access_token || null;
  } catch (error) {
    return null;
  }
}

/**
 * Clear the cached session (call this on logout)
 */
export function clearCachedSession() {
  console.log('Clearing cached session');
}
/**
 * Make an authenticated API request
 */
export async function apiRequest<T>(
  endpoint: string,
  options: RequestOptions = {}
): Promise<T> {
  const { requiresAuth = true, headers = {}, ...restOptions } = options;

  const requestHeaders: Record<string, string> = {
    'Content-Type': 'application/json',
    ...(headers as Record<string, string>),
  };

  // Add authorization header if required
  if (requiresAuth) {
    const token = await getAccessToken();
    if (token) {
      requestHeaders['Authorization'] = `Bearer ${token}`;
    } else {
      throw new Error('No access token available. Please log in again.');
    }
  }

  const response = await fetch(`${API_URL}${endpoint}`, {
    ...restOptions,
    headers: requestHeaders,
  });

  if (!response.ok) {
    const error = await response.json().catch(() => ({ error: 'Request failed' }));
    throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
  }

  return response.json();
}

/**
 * Agent API methods
 */
export const agentsApi = {
  getAll: () => cachedFetch(
    'agents:all',
    () => apiRequest<any[]>('/api/agents'),
    5 * 60 * 1000 // Cache for 5 minutes
  ),
  getById: (id: string) => apiRequest<any>(`/api/agents/${id}`),
  getTeamMembers: async (teamLeaderId: string) => {
    const response = await fetch(`${API_URL}/api/agents/team-members/${teamLeaderId}`);
    if (!response.ok) {
      throw new Error('Failed to fetch team members');
    }
    return response.json();
  },
  create: async (data: any) => {
    const result = await apiRequest<any>('/api/agents', {
      method: 'POST',
      body: JSON.stringify(data),
    });
    // Invalidate cache after creating
    dataCache.clear('agents:all');
    return result;
  },
  update: async (id: string, data: any) => {
    const result = await apiRequest<any>(`/api/agents/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    // Invalidate cache after updating
    dataCache.clear('agents:all');
    return result;
  },
  delete: async (id: string) => {
    const result = await apiRequest<any>(`/api/agents/${id}`, {
      method: 'DELETE',
    });
    // Invalidate cache after deleting
    dataCache.clear('agents:all');
    return result;
  },
  deletePermanent: async (id: string) => {
    const result = await apiRequest<any>(`/api/agents/${id}/permanent`, {
      method: 'DELETE',
    });
    // Invalidate cache after deleting
    dataCache.clear('agents:all');
    return result;
  },
};

/**
 * Application API methods
 * No caching - applications change frequently
 */
export const applicationsApi = {
  getAll: (params?: {
    status?: string;
    agent_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.status) queryParams.append('status', params.status);
    if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    
    const query = queryParams.toString();
    return apiRequest<any[]>(`/api/applications${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<any>(`/api/applications/${id}`),
  updateStatus: async (id: string, data: { status: string; status_reason?: string }) => {
    const result = await apiRequest<any>(`/api/applications/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result;
  },
  delete: (id: string) => apiRequest<any>(`/api/applications/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Subscriber API methods
 * No caching - subscribers change frequently
 */
export const subscribersApi = {
  getAll: (params?: {
    agent_id?: string;
    plan_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
    if (params?.plan_id) queryParams.append('plan_id', params.plan_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    
    const query = queryParams.toString();
    return apiRequest<any[]>(`/api/subscribers${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<any>(`/api/subscribers/${id}`),
  delete: (id: string) => apiRequest<any>(`/api/subscribers/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Commission API methods
 * No caching - commissions change frequently
 */
export const commissionsApi = {
  getAll: (params?: {
    agent_id?: string;
    status?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
    if (params?.status) queryParams.append('status', params.status);
    
    const query = queryParams.toString();
    return apiRequest<any[]>(`/api/commissions${query ? `?${query}` : ''}`);
  },
  updateStatus: async (id: string, data: { status: string }) => {
    const result = await apiRequest<any>(`/api/commissions/${id}/status`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result;
  },
  update: async (id: string, data: { 
    amount?: number; 
    date_activated?: string; 
    date_paid?: string | null;
    password: string;
  }) => {
    const result = await apiRequest<any>(`/api/commissions/${id}`, {
      method: 'PUT',
      body: JSON.stringify(data),
    });
    return result;
  },
  delete: async (id: string, password: string) => {
    const result = await apiRequest<any>(`/api/commissions/${id}`, {
      method: 'DELETE',
      body: JSON.stringify({ password }),
    });
    return result;
  },
};

/**
 * Audit Log API methods
 */
export const auditLogsApi = {
  getAll: (params?: {
    action?: string;
    entity_type?: string;
    limit?: number;
    offset?: number;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.action) queryParams.append('action', params.action);
    if (params?.entity_type) queryParams.append('entity_type', params.entity_type);
    if (params?.limit) queryParams.append('limit', params.limit.toString());
    if (params?.offset) queryParams.append('offset', params.offset.toString());
    
    const query = queryParams.toString();
    return apiRequest<any>(`/api/audit-logs${query ? `?${query}` : ''}`);
  },
  getById: (id: string) => apiRequest<any>(`/api/audit-logs/${id}`),
};

/**
 * User API methods
 */
export const usersApi = {
  getAll: () => apiRequest<any[]>('/api/users'),
  getById: (id: string) => apiRequest<any>(`/api/users/${id}`),
  create: (data: any) => apiRequest<any>('/api/users', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: any) => apiRequest<any>(`/api/users/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  deactivate: (id: string) => apiRequest<any>(`/api/users/${id}`, {
    method: 'DELETE',
  }),
  deletePermanent: (id: string) => apiRequest<any>(`/api/users/${id}/permanent`, {
    method: 'DELETE',
  }),
  resetPassword: (id: string) => apiRequest<any>(`/api/users/${id}/reset-password`, {
    method: 'POST',
  }),
};

/**
 * Analytics API methods
 * All analytics data is cached until midnight for performance
 */
export const analyticsApi = {
  subscribersMonthly: () => cachedFetch(
    'analytics:subscribers-monthly',
    () => apiRequest<{ count: number }>('/api/analytics/subscribers-monthly'),
    getMillisecondsUntilMidnight()
  ),
  subscribersPerAgent: () => cachedFetch(
    'analytics:subscribers-per-agent',
    () => apiRequest<any[]>('/api/analytics/subscribers-per-agent'),
    getMillisecondsUntilMidnight()
  ),
  subscribersPerPlan: () => cachedFetch(
    'analytics:subscribers-per-plan',
    () => apiRequest<any[]>('/api/analytics/subscribers-per-plan'),
    getMillisecondsUntilMidnight()
  ),
  subscriptionTrends: () => cachedFetch(
    'analytics:subscription-trends',
    () => apiRequest<any[]>('/api/analytics/subscription-trends'),
    getMillisecondsUntilMidnight()
  ),
  conversionRate: () => cachedFetch(
    'analytics:conversion-rate',
    () => apiRequest<any>('/api/analytics/conversion-rate'),
    getMillisecondsUntilMidnight()
  ),
  pendingApplications: () => cachedFetch(
    'analytics:pending-applications',
    () => apiRequest<{ count: number }>('/api/analytics/pending-applications'),
    getMillisecondsUntilMidnight()
  ),
  totalCommissionsDue: () => cachedFetch(
    'analytics:total-commissions-due',
    () => apiRequest<any>('/api/analytics/total-commissions-due'),
    getMillisecondsUntilMidnight()
  ),
  // Phase 1 - New endpoints
  pipelineSnapshot: () => cachedFetch(
    'analytics:pipeline-snapshot',
    () => apiRequest<any[]>('/api/analytics/pipeline-snapshot'),
    getMillisecondsUntilMidnight()
  ),
  agentRankings: (period: 'monthly' | 'quarterly' = 'monthly') => cachedFetch(
    `analytics:agent-rankings:${period}`,
    () => apiRequest<any>(`/api/analytics/agent-rankings?period=${period}`),
    getMillisecondsUntilMidnight()
  ),
  agentActivationsByStatus: () => cachedFetch(
    'analytics:agent-activations-by-status',
    () => apiRequest<any[]>('/api/analytics/agent-activations-by-status'),
    getMillisecondsUntilMidnight()
  ),
  stuckApplications: () => cachedFetch(
    'analytics:stuck-applications',
    () => apiRequest<any[]>('/api/analytics/stuck-applications'),
    getMillisecondsUntilMidnight()
  ),
  // Phase 2 - Additional endpoints
  agentCommissionsBreakdown: () => cachedFetch(
    'analytics:agent-commissions-breakdown',
    () => apiRequest<any[]>('/api/analytics/agent-commissions-breakdown'),
    getMillisecondsUntilMidnight()
  ),
  pipelineDuration: () => cachedFetch(
    'analytics:pipeline-duration',
    () => apiRequest<{ average_days: number; count: number }>('/api/analytics/pipeline-duration'),
    getMillisecondsUntilMidnight()
  ),
  planCategoryDistribution: () => cachedFetch(
    'analytics:plan-category-distribution',
    () => apiRequest<any[]>('/api/analytics/plan-category-distribution'),
    getMillisecondsUntilMidnight()
  ),
  revenueEstimates: () => cachedFetch(
    'analytics:revenue-estimates',
    () => apiRequest<any>('/api/analytics/revenue-estimates'),
    getMillisecondsUntilMidnight()
  ),
  denialReasons: () => cachedFetch(
    'analytics:denial-reasons',
    () => apiRequest<any[]>('/api/analytics/denial-reasons'),
    getMillisecondsUntilMidnight()
  ),
  // Phase 3 - Geographic & Advanced endpoints
  subscriberLocations: () => cachedFetch(
    'analytics:subscriber-locations',
    () => apiRequest<any[]>('/api/analytics/subscriber-locations'),
    getMillisecondsUntilMidnight()
  ),
  agentConversionRates: () => cachedFetch(
    'analytics:agent-conversion-rates',
    () => apiRequest<any[]>('/api/analytics/agent-conversion-rates'),
    getMillisecondsUntilMidnight()
  ),
  planConversionRates: () => cachedFetch(
    'analytics:plan-conversion-rates',
    () => apiRequest<any[]>('/api/analytics/plan-conversion-rates'),
    getMillisecondsUntilMidnight()
  ),
  growthComparison: () => cachedFetch(
    'analytics:growth-comparison',
    () => apiRequest<any[]>('/api/analytics/growth-comparison'),
    getMillisecondsUntilMidnight()
  ),
  voidRate: () => cachedFetch(
    'analytics:void-rate',
    () => apiRequest<{ total_applications: number; voided_applications: number; void_rate: number }>('/api/analytics/void-rate'),
    getMillisecondsUntilMidnight()
  ),
};

/**
 * Export API methods
 */
export const exportApi = {
  subscribers: async (params?: {
    agent_id?: string;
    plan_id?: string;
    start_date?: string;
    end_date?: string;
  }) => {
    const queryParams = new URLSearchParams();
    if (params?.agent_id) queryParams.append('agent_id', params.agent_id);
    if (params?.plan_id) queryParams.append('plan_id', params.plan_id);
    if (params?.start_date) queryParams.append('start_date', params.start_date);
    if (params?.end_date) queryParams.append('end_date', params.end_date);
    
    const query = queryParams.toString();
    const token = await getAccessToken();
    return fetch(`${API_URL}/api/export/subscribers${query ? `?${query}` : ''}`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
  subscriberDocuments: async (subscriberId: string) => {
    const token = await getAccessToken();
    return fetch(`${API_URL}/api/export/subscribers/${subscriberId}/documents`, {
      headers: {
        Authorization: `Bearer ${token}`,
      },
    });
  },
};

/**
 * Plans API methods
 */
export const plansApi = {
  getAll: () => cachedFetch(
    'plans:all',
    () => apiRequest<any[]>('/api/plans', { requiresAuth: false }),
    10 * 60 * 1000 // Cache for 10 minutes (plans rarely change)
  ),
  getById: (id: string) => apiRequest<any>(`/api/plans/${id}`, { requiresAuth: false }),
};

/**
 * Generic API helper for backward compatibility
 */
export const api = {
  get: <T>(endpoint: string) => apiRequest<T>(endpoint),
  post: <T>(endpoint: string, data: any) => apiRequest<T>(endpoint, {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  put: <T>(endpoint: string, data: any) => apiRequest<T>(endpoint, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: <T>(endpoint: string) => apiRequest<T>(endpoint, {
    method: 'DELETE',
  }),
};

/**
 * Events API methods
 */
export const eventsApi = {
  getAll: () => apiRequest<any[]>('/api/events'),
  getByRange: (start: string, end: string) => 
    apiRequest<any[]>(`/api/events/range?start=${start}&end=${end}`),
  getById: (id: string) => apiRequest<any>(`/api/events/${id}`),
  create: (data: {
    title: string;
    description?: string;
    start_date: string;
    end_date: string;
    all_day?: boolean;
    color?: string;
  }) => apiRequest<any>('/api/events', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  update: (id: string, data: {
    title?: string;
    description?: string;
    start_date?: string;
    end_date?: string;
    all_day?: boolean;
    color?: string;
  }) => apiRequest<any>(`/api/events/${id}`, {
    method: 'PUT',
    body: JSON.stringify(data),
  }),
  delete: (id: string) => apiRequest<any>(`/api/events/${id}`, {
    method: 'DELETE',
  }),
};

/**
 * Auth API methods for first login and onboarding
 */
export const authApi = {
  completeFirstLogin: (data: {
    new_password: string;
    profile_picture_url?: string;
  }) => apiRequest<any>('/api/auth/complete-first-login', {
    method: 'POST',
    body: JSON.stringify(data),
  }),
  completeOnboarding: () => apiRequest<any>('/api/auth/complete-onboarding', {
    method: 'POST',
  }),
  resetOnboarding: () => apiRequest<any>('/api/auth/reset-onboarding', {
    method: 'POST',
  }),
  updateLastLogin: () => apiRequest<any>('/api/auth/update-last-login', {
    method: 'POST',
  }),
};
