'use client';

import { useState, useEffect } from 'react';
import { commissionsApi, agentsApi } from '@/lib/api';
import { Agent } from '@/types';
import LoadingSpinner from '@/components/LoadingSpinner';

interface Commission {
  id: string;
  agent_id: string;
  subscriber_id: string;
  amount: number;
  status: 'Pending' | 'Eligible' | 'Paid';
  date_activated: string;
  date_paid?: string;
  created_at: string;
  updated_at: string;
  agents?: Agent;
  applications?: {
    id: string;
    first_name: string;
    last_name: string;
    plans?: {
      id: string;
      name: string;
      category: string;
      speed: string;
      price: number;
    };
  };
}

export default function CommissionsPage() {
  const [commissions, setCommissions] = useState<Commission[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  
  // Edit/Delete modals
  const [editingCommission, setEditingCommission] = useState<Commission | null>(null);
  const [deletingCommission, setDeletingCommission] = useState<Commission | null>(null);

  // Filters
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [statusFilter, setStatusFilter] = useState<string>('');

  useEffect(() => {
    const loadData = async () => {
      await Promise.all([
        fetchAgents(),
        fetchCommissions()
      ]);
    };
    loadData();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only fetch when filters change, not on initial load
    if (agents.length > 0) {
      fetchCommissions();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [agentFilter, statusFilter]);

  // Lock body scroll when modals are open
  useEffect(() => {
    if (editingCommission || deletingCommission) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = 'unset';
    }

    return () => {
      document.body.style.overflow = 'unset';
    };
  }, [editingCommission, deletingCommission]);

  const fetchAgents = async () => {
    try {
      const data = await agentsApi.getAll();
      setAgents(data.filter((agent: Agent) => agent.is_active));
    } catch (err: any) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchCommissions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: { agent_id?: string; status?: string } = {};
      if (agentFilter) params.agent_id = agentFilter;
      if (statusFilter) params.status = statusFilter;

      const data = await commissionsApi.getAll(params);
      setCommissions(data);
    } catch (err: any) {
      console.error('[Commissions] Error:', err);
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const updateCommissionStatus = async (commissionId: string, newStatus: string) => {
    try {
      setUpdatingId(commissionId);
      await commissionsApi.updateStatus(commissionId, { status: newStatus });
      await fetchCommissions();
    } catch (err) {
      alert(err instanceof Error ? err.message : 'Failed to update commission status');
    } finally {
      setUpdatingId(null);
    }
  };

  const clearFilters = () => {
    setAgentFilter('');
    setStatusFilter('');
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Pending': 'bg-yellow-100 text-yellow-800',
      'Eligible': 'bg-blue-100 text-blue-800',
      'Paid': 'bg-green-100 text-green-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  const getNextStatus = (currentStatus: string): string | null => {
    const transitions: Record<string, string> = {
      'Pending': 'Eligible',
      'Eligible': 'Paid',
    };
    return transitions[currentStatus] || null;
  };

  const canUpdateStatus = (status: string): boolean => {
    return status === 'Pending' || status === 'Eligible';
  };

  // Calculate total commissions due (sum of Eligible commissions)
  const totalCommissionsDue = commissions
    .filter((c) => c.status === 'Eligible')
    .reduce((sum, c) => sum + c.amount, 0);

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="mb-6">
          <h1 className="text-3xl font-bold text-[#00A191] mb-4">Commission Tracker</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={() => fetchCommissions()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="mb-6">
        <h1 className="text-3xl font-bold text-[#00A191] mb-4">Commission Tracker</h1>

        {/* Total Commissions Due */}
        <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-4 mb-4 transition-colors duration-300">
          <div className="text-sm text-blue-600 dark:text-blue-400 font-medium">Total Commissions Due</div>
          <div className="text-3xl font-bold text-blue-900 dark:text-blue-100">
            ₱{totalCommissionsDue.toFixed(2)}
          </div>
          <div className="text-xs text-blue-600 dark:text-blue-400 mt-1">
            Sum of all Eligible commissions
          </div>
        </div>

        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg transition-colors duration-300 p-4 mb-4">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Agent
              </label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Agents</option>
                {agents.map((agent) => (
                  <option key={agent.id} value={agent.id}>
                    {agent.name}
                  </option>
                ))}
              </select>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">All Statuses</option>
                <option value="Pending">Pending</option>
                <option value="Eligible">Eligible</option>
                <option value="Paid">Paid</option>
              </select>
            </div>
          </div>

          {(agentFilter || statusFilter) && (
            <div className="mt-4">
              <button
                onClick={clearFilters}
                className="text-sm text-blue-600 hover:text-blue-800"
              >
                Clear all filters
              </button>
            </div>
          )}
        </div>
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg transition-colors duration-300 overflow-hidden relative min-h-[400px]">
        {loading && (
          <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading commissions...</div>
            </div>
          </div>
        )}
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[#C9B8EC]">
            <thead className="bg-[#00A191]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Subscriber Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Date Activated
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Commission Amount
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {commissions.map((commission) => (
                <tr key={commission.id} className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {commission.applications?.first_name} {commission.applications?.last_name}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{commission.agents?.name}</div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">{commission.agents?.referral_code}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">
                      {commission.applications?.plans?.name}
                    </div>
                    <div className="text-sm text-gray-500 dark:text-gray-400">
                      {commission.applications?.plans?.speed} - ₱
                      {commission.applications?.plans?.price}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(commission.date_activated).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      ₱{commission.amount.toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        commission.status
                      )}`}
                    >
                      {commission.status}
                    </span>
                    {commission.date_paid && (
                      <div className="text-xs text-gray-500 mt-1">
                        Paid: {new Date(commission.date_paid).toLocaleDateString()}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm">
                    <div className="flex items-center gap-2">
                      {canUpdateStatus(commission.status) && (
                        <button
                          onClick={() =>
                            updateCommissionStatus(
                              commission.id,
                              getNextStatus(commission.status)!
                            )
                          }
                          disabled={updatingId === commission.id}
                          className="text-blue-600 hover:text-blue-900 disabled:text-gray-400 disabled:cursor-not-allowed p-1 rounded hover:bg-blue-50 disabled:hover:bg-transparent"
                          title={`Mark as ${getNextStatus(commission.status)}`}
                        >
                          {updatingId === commission.id ? (
                            <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                              <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                              <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                            </svg>
                          ) : (
                            <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                          )}
                        </button>
                      )}
                      <button
                        onClick={() => setEditingCommission(commission)}
                        className="text-green-600 hover:text-green-900 p-1 rounded hover:bg-green-50"
                        title="Edit Commission"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => setDeletingCommission(commission)}
                        className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
                        title="Delete Commission"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                        </svg>
                      </button>
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {commissions.map((commission) => (
            <div key={commission.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
              <div className="space-y-3">
                {/* Subscriber Name */}
                <div className="flex items-start justify-between">
                  <div className="text-base font-semibold text-gray-900 dark:text-white">
                    {commission.applications?.first_name} {commission.applications?.last_name}
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${getStatusColor(
                      commission.status
                    )}`}
                  >
                    {commission.status}
                  </span>
                </div>

                {/* Commission Amount - Highlighted */}
                <div className="bg-[#00A191]/10 dark:bg-[#00A191]/20 rounded-lg p-3 border border-[#00A191]/30">
                  <div className="text-xs text-gray-600 dark:text-gray-400 mb-1">Commission Amount</div>
                  <div className="text-2xl font-bold text-[#00A191]">
                    ₱{commission.amount.toFixed(2)}
                  </div>
                </div>

                {/* Agent Info */}
                <div className="flex items-center gap-2 text-sm">
                  <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                  <div>
                    <span className="text-gray-700 dark:text-gray-300">{commission.agents?.name}</span>
                    <span className="text-gray-500 dark:text-gray-400 ml-2 font-mono text-xs">
                      {commission.agents?.referral_code}
                    </span>
                  </div>
                </div>

                {/* Plan Info */}
                <div className="bg-gray-50 dark:bg-gray-700/50 rounded-lg p-3">
                  <div className="text-sm font-medium text-gray-900 dark:text-white mb-1">
                    {commission.applications?.plans?.name}
                  </div>
                  <div className="flex items-center justify-between text-sm">
                    <span className="text-gray-600 dark:text-gray-400">
                      {commission.applications?.plans?.speed}
                    </span>
                    <span className="text-gray-700 dark:text-gray-300">
                      ₱{commission.applications?.plans?.price}/mo
                    </span>
                  </div>
                </div>

                {/* Dates */}
                <div className="flex items-center gap-2 text-sm text-gray-500 dark:text-gray-400">
                  <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                  <span>Activated: {new Date(commission.date_activated).toLocaleDateString()}</span>
                </div>

                {commission.date_paid && (
                  <div className="flex items-center gap-2 text-sm text-green-600 dark:text-green-400">
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>Paid: {new Date(commission.date_paid).toLocaleDateString()}</span>
                  </div>
                )}

                {/* Action Buttons */}
                <div className="flex gap-2 pt-2">
                  {canUpdateStatus(commission.status) && (
                    <button
                      onClick={() =>
                        updateCommissionStatus(
                          commission.id,
                          getNextStatus(commission.status)!
                        )
                      }
                      disabled={updatingId === commission.id}
                      className="flex-1 px-3 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors disabled:bg-gray-400 disabled:cursor-not-allowed flex items-center justify-center gap-2 text-sm"
                    >
                      {updatingId === commission.id ? (
                        <>
                          <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                          Updating...
                        </>
                      ) : (
                        <>
                          <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          Mark {getNextStatus(commission.status)}
                        </>
                      )}
                    </button>
                  )}
                  <button
                    onClick={() => setEditingCommission(commission)}
                    className="px-3 py-2 bg-green-600 hover:bg-green-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => setDeletingCommission(commission)}
                    className="px-3 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors flex items-center justify-center gap-2 text-sm"
                  >
                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>

        {commissions.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No commissions found. Try adjusting your filters.
          </div>
        )}
      </div>

      {commissions.length > 0 && (
        <div className="mt-4 text-sm text-gray-600 dark:text-gray-400">
          Showing {commissions.length} commission{commissions.length !== 1 ? 's' : ''}
        </div>
      )}

      {/* Edit Commission Modal */}
      {editingCommission && (
        <EditCommissionModal
          commission={editingCommission}
          onClose={() => setEditingCommission(null)}
          onSuccess={() => {
            setEditingCommission(null);
            fetchCommissions();
          }}
        />
      )}

      {/* Delete Commission Modal */}
      {deletingCommission && (
        <DeleteCommissionModal
          commission={deletingCommission}
          onClose={() => setDeletingCommission(null)}
          onSuccess={() => {
            setDeletingCommission(null);
            fetchCommissions();
          }}
        />
      )}
    </div>
  );
}

interface EditCommissionModalProps {
  commission: Commission;
  onClose: () => void;
  onSuccess: () => void;
}

function EditCommissionModal({ commission, onClose, onSuccess }: EditCommissionModalProps) {
  const [amount, setAmount] = useState(commission.amount.toString());
  const [dateActivated, setDateActivated] = useState(
    new Date(commission.date_activated).toISOString().split('T')[0]
  );
  const [datePaid, setDatePaid] = useState(
    commission.date_paid ? new Date(commission.date_paid).toISOString().split('T')[0] : ''
  );
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleSaveClick = (e: React.FormEvent) => {
    e.preventDefault();
    setShowPasswordPrompt(true);
  };

  const handleConfirm = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await commissionsApi.update(commission.id, {
        amount: parseFloat(amount),
        date_activated: new Date(dateActivated).toISOString(),
        date_paid: datePaid ? new Date(datePaid).toISOString() : null,
        password,
      });
      onSuccess();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to update commission');
    } finally {
      setSubmitting(false);
    }
  };

  if (showPasswordPrompt) {
    return (
      <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold">Confirm Changes</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <p className="text-gray-700 mb-4">
              Please enter your password to confirm these changes.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                placeholder="Enter your password"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300"
              >
                {submitting ? 'Confirming...' : 'Confirm'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold">Edit Commission</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <form onSubmit={handleSaveClick} className="p-6">
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Commission Amount (₱)
            </label>
            <input
              type="number"
              step="0.01"
              value={amount}
              onChange={(e) => setAmount(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Activated
            </label>
            <input
              type="date"
              value={dateActivated}
              onChange={(e) => setDateActivated(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="mb-6">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Date Paid (optional)
            </label>
            <input
              type="date"
              value={datePaid}
              onChange={(e) => setDatePaid(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="submit"
              className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700"
            >
              Save Changes
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

interface DeleteCommissionModalProps {
  commission: Commission;
  onClose: () => void;
  onSuccess: () => void;
}

function DeleteCommissionModal({ commission, onClose, onSuccess }: DeleteCommissionModalProps) {
  const [showPasswordPrompt, setShowPasswordPrompt] = useState(false);
  const [password, setPassword] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDeleteClick = () => {
    setShowPasswordPrompt(true);
  };

  const handleConfirm = async () => {
    if (!password) {
      setError('Password is required');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await commissionsApi.delete(commission.id, password);
      onSuccess();
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'Failed to delete commission');
    } finally {
      setSubmitting(false);
    }
  };

  if (showPasswordPrompt) {
    return (
      <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 w-full max-w-md">
          <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <h3 className="text-lg font-semibold text-red-600">Confirm Deletion</h3>
            <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
              ×
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            <p className="text-gray-700 mb-4">
              Please enter your password to confirm deletion.
            </p>

            <div className="mb-6">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-red-500"
                placeholder="Enter your password"
                autoFocus
              />
            </div>

            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setShowPasswordPrompt(false)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:bg-gray-50"
              >
                Back
              </button>
              <button
                type="button"
                onClick={handleConfirm}
                disabled={submitting}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700 disabled:bg-red-300"
              >
                {submitting ? 'Deleting...' : 'Confirm Delete'}
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="fixed inset-0 bg-gray-900/20 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 w-full max-w-md">
        <div className="px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
          <h3 className="text-lg font-semibold text-red-600">Delete Commission</h3>
          <button onClick={onClose} className="text-gray-500 hover:text-gray-700 text-2xl">
            ×
          </button>
        </div>

        <div className="p-6">
          <p className="text-gray-700 mb-4">
            Are you sure you want to delete this commission?
          </p>
          <div className="bg-gray-50 p-3 rounded text-sm mb-6">
            <div><span className="font-medium">Subscriber:</span> {commission.applications?.first_name} {commission.applications?.last_name}</div>
            <div><span className="font-medium">Agent:</span> {commission.agents?.name}</div>
            <div><span className="font-medium">Amount:</span> ₱{commission.amount.toFixed(2)}</div>
            <div><span className="font-medium">Status:</span> {commission.status}</div>
          </div>

          <div className="flex gap-3">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 hover:bg-gray-50"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={handleDeleteClick}
              className="flex-1 px-4 py-2 bg-red-600 text-white rounded-md hover:bg-red-700"
            >
              Delete Commission
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

