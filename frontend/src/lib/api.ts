import { getSupabaseClient, getCurrentSession } from './supabase';
import { cachedFetch, dataCache, getMillisecondsUntilMidnight } from './cache';
import { markRequestSuccess, resetIfStale } from './connectionHealth';

const API_URL = process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.56:5000';

interface RequestOptions extends RequestInit {
  requiresAuth?: boolean;
}

// Track failed requests to detect stale connections
let consecutiveFailures = 0;
const MAX_FAILURES_BEFORE_RESET = 2;

/**
 * Get the current Supabase access token (synchronous from memory)
 * Automatically refreshes if token is about to expire (within 5 minutes)
 */
export async function getAccessToken(): Promise<string | null> {
  try {
    // Check if connection is stale and reset if needed
    resetIfStale();
    
    const supabase = getSupabaseClient();
    
    // First, try to get from memory (instant)
    const session = getCurrentSession();
    
    // Check if token is about to expire (within 5 minutes)
    if (session?.access_token && session?.expires_at) {
      const expiresAt = session.expires_at * 1000; // Convert to milliseconds
      const now = Date.now();
      const fiveMinutes = 5 * 60 * 1000;
      
      // If token expires in less than 5 minutes, refresh it proactively
      if (expiresAt - now < fiveMinutes) {
        console.log('Token expiring soon, refreshing proactively...');
        const newToken = await refreshAccessToken();
        if (newToken) {
          consecutiveFailures = 0; // Reset failure counter on success
          return newToken;
        }
        // If refresh fails, try to use the current token anyway
        console.warn('Token refresh failed, using current token');
      }
      
      console.log('Using session from memory');
      return session.access_token;
    }

    // If not in memory, try to get from Supabase with timeout
    console.log('Session not in memory, fetching from Supabase...');
    
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Session fetch timeout')), 5000)
    );
    
    const sessionPromise = supabase.auth.getSession();
    
    const { data: { session: freshSession }, error } = await Promise.race([
      sessionPromise,
      timeoutPromise
    ]).catch((err) => {
      // Suppress refresh token errors (expected after logout)
      if (err?.message?.includes('Refresh Token') || err?.message?.includes('Invalid')) {
        console.log('getAccessToken: No valid refresh token (expected after logout)');
        return { data: { session: null }, error: null };
      }
      console.error('Session fetch timed out or failed:', err);
      consecutiveFailures++;
      return { data: { session: null }, error: err };
    }) as any;
    
    if (error) {
      // Suppress refresh token errors
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
        console.log('getAccessToken: Invalid refresh token (expected after logout)');
        return null;
      }
      console.error('Error getting session:', error);
      return null;
    }
    
    if (!freshSession) {
      console.log('getAccessToken: No session found');
      return null;
    }
    
    consecutiveFailures = 0; // Reset on success
    return freshSession.access_token;
  } catch (error: any) {
    // Suppress refresh token errors
    if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
      console.log('getAccessToken: Invalid token (expected after logout)');
      return null;
    }
    console.error('Error in getAccessToken:', error);
    consecutiveFailures++;
    return null;
  }
}

/**
 * Refresh the session and get a new token
 */
export async function refreshAccessToken(): Promise<string | null> {
  try {
    console.log('Refreshing session...');
    const supabase = getSupabaseClient();
    
    // Add timeout to refresh operation
    const timeoutPromise = new Promise<null>((_, reject) => 
      setTimeout(() => reject(new Error('Refresh timeout')), 10000)
    );
    
    const refreshPromise = supabase.auth.refreshSession();
    
    const { data: { session }, error } = await Promise.race([
      refreshPromise,
      timeoutPromise
    ]).catch((err) => {
      // Suppress refresh token errors (expected after logout)
      if (err?.message?.includes('Refresh Token') || err?.message?.includes('Invalid')) {
        console.log('refreshAccessToken: No valid refresh token (expected after logout)');
        return { data: { session: null }, error: null };
      }
      console.error('Refresh timed out:', err);
      consecutiveFailures++;
      return { data: { session: null }, error: err };
    }) as any;
    
    if (error) {
      // Suppress refresh token errors
      if (error.message?.includes('Refresh Token') || error.message?.includes('Invalid')) {
        console.log('refreshAccessToken: Invalid refresh token (expected after logout)');
        return null;
      }
      console.error('Error refreshing session:', error);
      consecutiveFailures++;
      return null;
    }
    
    if (!session) {
      console.log('refreshAccessToken: No session after refresh');
      return null;
    }
    
    console.log('Session refreshed successfully');
    consecutiveFailures = 0; // Reset on success
    return session.access_token;
  } catch (error: any) {
    // Suppress refresh token errors
    if (error?.message?.includes('Refresh Token') || error?.message?.includes('Invalid')) {
      console.log('refreshAccessToken: Invalid token (expected after logout)');
      return null;
    }
    console.error('Error in refreshAccessToken:', error);
    consecutiveFailures++;
    return null;
  }
}

/**
 * Clear the cached session (call this on logout)
 */
export function clearCachedSession() {
  // This is now handled by the auth state listener in supabase.ts
  console.log('Session will be cleared by auth state listener');
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

  // Add timeout to prevent hanging requests (30 seconds)
  const controller = new AbortController();
  const timeoutId = setTimeout(() => {
    console.warn(`Request to ${endpoint} timed out after 30s`);
    controller.abort();
  }, 30000); // 30 second timeout

  try {
    const response = await fetch(`${API_URL}${endpoint}`, {
      ...restOptions,
      headers: requestHeaders,
      signal: controller.signal,
    });

    clearTimeout(timeoutId);
    consecutiveFailures = 0; // Reset on successful request
    markRequestSuccess(); // Mark connection as healthy

    // If 401, try to refresh token and retry once
    if (response.status === 401 && requiresAuth) {
      console.log('Got 401, attempting to refresh token...');
      const newToken = await refreshAccessToken();
      
      if (newToken) {
        console.log('Token refreshed, retrying request...');
        requestHeaders['Authorization'] = `Bearer ${newToken}`;
        
        const retryController = new AbortController();
        const retryTimeoutId = setTimeout(() => retryController.abort(), 60000);
        
        try {
          const retryResponse = await fetch(`${API_URL}${endpoint}`, {
            ...restOptions,
            headers: requestHeaders,
            signal: retryController.signal,
          });
          
          clearTimeout(retryTimeoutId);
          
          if (!retryResponse.ok) {
            const error = await retryResponse.json().catch(() => ({ error: 'Request failed' }));
            throw new Error(error.error || `HTTP ${retryResponse.status}: ${retryResponse.statusText}`);
          }
          
          return retryResponse.json();
        } catch (retryError: any) {
          clearTimeout(retryTimeoutId);
          if (retryError.name === 'AbortError') {
            throw new Error('Request timeout - please check if the backend server is running');
          }
          throw retryError;
        }
      } else {
        throw new Error('Session expired. Please log in again.');
      }
    }

    if (!response.ok) {
      const error = await response.json().catch(() => ({ error: 'Request failed' }));
      throw new Error(error.error || `HTTP ${response.status}: ${response.statusText}`);
    }

    return response.json();
  } catch (error: any) {
    clearTimeout(timeoutId);
    consecutiveFailures++;
    
    if (error.name === 'AbortError') {
      throw new Error('Request timeout - please check your connection or try refreshing the page');
    }
    throw error;
  }
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
