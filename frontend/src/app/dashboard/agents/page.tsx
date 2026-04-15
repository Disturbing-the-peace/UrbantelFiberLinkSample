'use client';

import { useState, useEffect } from 'react';
import { Agent } from '@/types';
import { agentsApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import LoadingSpinner from '@/components/LoadingSpinner';

export default function AgentsPage() {
  const [agents, setAgents] = useState<Agent[]>([]);
  const [filteredAgents, setFilteredAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingAgent, setEditingAgent] = useState<Agent | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  const [roleFilter, setRoleFilter] = useState<'all' | 'Team Leader' | 'Agent'>('all');
  const [teamLeaderFilter, setTeamLeaderFilter] = useState<string>('all');
  
  const toast = useToast();

  useEffect(() => {
    fetchAgents();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Apply filters whenever agents or filter states change
  useEffect(() => {
    let filtered = [...agents];

    // Search filter
    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(agent => 
        agent.name.toLowerCase().includes(query) ||
        agent.email?.toLowerCase().includes(query) ||
        agent.referral_code.toLowerCase().includes(query) ||
        agent.contact_number?.toLowerCase().includes(query)
      );
    }

    // Status filter
    if (statusFilter !== 'all') {
      filtered = filtered.filter(agent => 
        statusFilter === 'active' ? agent.is_active : !agent.is_active
      );
    }

    // Role filter
    if (roleFilter !== 'all') {
      if (roleFilter === 'Agent') {
        filtered = filtered.filter(agent => !agent.role);
      } else {
        filtered = filtered.filter(agent => agent.role === roleFilter);
      }
    }

    // Team Leader filter
    if (teamLeaderFilter !== 'all') {
      if (teamLeaderFilter === 'no-leader') {
        filtered = filtered.filter(agent => !agent.team_leader_id);
      } else {
        filtered = filtered.filter(agent => agent.team_leader_id === teamLeaderFilter);
      }
    }

    setFilteredAgents(filtered);
  }, [agents, searchQuery, statusFilter, roleFilter, teamLeaderFilter]);

  const fetchAgents = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await agentsApi.getAll();
      setAgents(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch agents';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAgent = () => {
    setEditingAgent(null);
    setShowCreateModal(true);
  };

  const handleEditAgent = (agent: Agent) => {
    setEditingAgent(agent);
    setShowCreateModal(true);
  };

  const handleDeleteAgent = async (agentId: string) => {
    if (!confirm('Are you sure you want to deactivate this agent?')) {
      return;
    }

    const loadingToast = toast.loading('Deactivating agent...');
    try {
      await agentsApi.delete(agentId);
      toast.dismiss(loadingToast);
      toast.success('Agent deactivated successfully');
      fetchAgents();
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete agent';
      toast.error(errorMessage);
    }
  };

  const copyReferralLink = (referralCode: string) => {
    const referralLink = `${window.location.origin}/apply?ref=${referralCode}`;
    
    // Try modern clipboard API first (requires HTTPS)
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralLink)
        .then(() => {
          setCopiedCode(referralCode);
          toast.success('Referral link copied to clipboard');
          setTimeout(() => setCopiedCode(null), 2000);
        })
        .catch(() => {
          // Fallback if clipboard API fails
          fallbackCopy(referralLink, referralCode);
        });
    } else {
      // Fallback for HTTP or older browsers
      fallbackCopy(referralLink, referralCode);
    }
  };

  const fallbackCopy = (text: string, referralCode: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    textArea.style.top = '-999999px';
    document.body.appendChild(textArea);
    textArea.focus();
    textArea.select();
    
    try {
      document.execCommand('copy');
      setCopiedCode(referralCode);
      toast.success('Referral link copied to clipboard');
      setTimeout(() => setCopiedCode(null), 2000);
    } catch (err) {
      toast.error('Failed to copy. Please copy manually: ' + text);
    } finally {
      document.body.removeChild(textArea);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">Agent Management</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={fetchAgents}
            className="px-4 py-2 bg-[#00A191] text-white rounded hover:bg-[#008c7d] font-medium"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="container mx-auto px-4 py-8">
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">Agent Management</h1>
        <button
          onClick={handleCreateAgent}
          className="w-full sm:w-auto bg-[#00A191] text-white px-4 py-2 rounded hover:bg-[#008c7d] font-medium"
        >
          Create Agent
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-4 transition-colors duration-300 border border-[#C9B8EC]">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-4">
          {/* Search */}
          <div className="lg:col-span-2">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, code, or contact..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white placeholder:text-gray-500 dark:placeholder:text-gray-400"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

          {/* Status Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Status
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as 'all' | 'active' | 'inactive')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Status</option>
              <option value="active">Active</option>
              <option value="inactive">Inactive</option>
            </select>
          </div>

          {/* Role Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={roleFilter}
              onChange={(e) => setRoleFilter(e.target.value as 'all' | 'Team Leader' | 'Agent')}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All Roles</option>
              <option value="Team Leader">Team Leader</option>
              <option value="Agent">Agent</option>
            </select>
          </div>

          {/* Team Leader Filter */}
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Team Leader
            </label>
            <select
              value={teamLeaderFilter}
              onChange={(e) => setTeamLeaderFilter(e.target.value)}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="all">All</option>
              <option value="no-leader">No Team Leader</option>
              {agents
                .filter(agent => agent.role === 'Team Leader' && agent.is_active)
                .map(leader => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name}
                  </option>
                ))}
            </select>
          </div>
        </div>

        {/* Clear Filters */}
        {(searchQuery || statusFilter !== 'all' || roleFilter !== 'all' || teamLeaderFilter !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredAgents.length} of {agents.length} agents
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
                setRoleFilter('all');
                setTeamLeaderFilter('all');
              }}
              className="text-sm text-[#00A191] hover:text-[#008c7d] font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg transition-colors duration-300 overflow-hidden relative min-h-[400px] border border-[#C9B8EC]">
        {loading && (
          <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10">
            <div className="text-center">
              <LoadingSpinner size="md" />
              <div className="text-sm text-gray-900 dark:text-white mt-2">Loading agents...</div>
            </div>
          </div>
        )}
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[#C9B8EC]">
            <thead className="bg-[#00A191]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Name
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Role
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Referral Code
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Contact
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {filteredAgents.map((agent) => (
                <tr key={agent.id} className="hover:bg-[#80CBC4]/5 dark:hover:bg-gray-700 transition-colors border-l-4 border-transparent hover:border-l-[#80CBC4]">
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">{agent.name}</div>
                    {agent.email && <div className="text-sm text-gray-500 dark:text-gray-400">{agent.email}</div>}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    {agent.role ? (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                        {agent.role}
                      </span>
                    ) : (
                      <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        Agent
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <button
                      onClick={() => copyReferralLink(agent.referral_code)}
                      className="text-left group flex items-center gap-2"
                      title="Click to copy referral link"
                    >
                      <span className="text-sm font-mono text-gray-900 dark:text-white group-hover:text-[#00A191] transition-colors cursor-pointer underline decoration-dotted underline-offset-2">
                        {agent.referral_code}
                      </span>
                      {copiedCode === agent.referral_code ? (
                        <span className="text-green-600 dark:text-green-400 text-xs font-medium">✓ Copied!</span>
                      ) : (
                        <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-[#00A191] transition-colors" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                        </svg>
                      )}
                    </button>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{agent.contact_number || 'N/A'}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        agent.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}
                    >
                      {agent.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => handleEditAgent(agent)}
                        className="text-[#B39DDB] hover:text-[#9575CD] p-1 rounded hover:bg-[#B39DDB]/10"
                        title="Edit Agent"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                        </svg>
                      </button>
                      {agent.is_active && (
                        <button
                          onClick={() => handleDeleteAgent(agent.id)}
                          className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                          title="Deactivate Agent"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                          </svg>
                        </button>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {filteredAgents.map((agent) => (
            <div key={agent.id} className="p-4 hover:bg-[#80CBC4]/5 dark:hover:bg-gray-700 transition-colors">
              <div className="flex justify-between items-start mb-3">
                <div className="flex-1">
                  <h3 className="text-base font-semibold text-gray-900 dark:text-white">{agent.name}</h3>
                  {agent.email && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{agent.email}</p>}
                </div>
                <span
                  className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    agent.is_active
                      ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                      : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                  }`}
                >
                  {agent.is_active ? 'Active' : 'Inactive'}
                </span>
              </div>

              <div className="space-y-2 mb-3">
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Role:</span>
                  {agent.role ? (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-teal-100 dark:bg-teal-900 text-teal-800 dark:text-teal-200">
                      {agent.role}
                    </span>
                  ) : (
                    <span className="px-2 py-1 text-xs font-semibold rounded-full bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                      Agent
                    </span>
                  )}
                </div>
                
                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Contact:</span>
                  <span className="text-sm text-gray-900 dark:text-white">{agent.contact_number || 'N/A'}</span>
                </div>

                <div className="flex items-center gap-2">
                  <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Code:</span>
                  <button
                    onClick={() => copyReferralLink(agent.referral_code)}
                    className="flex items-center gap-2 group"
                    title="Click to copy referral link"
                  >
                    <span className="text-sm font-mono text-gray-900 dark:text-white group-hover:text-[#00A191] transition-colors underline decoration-dotted">
                      {agent.referral_code}
                    </span>
                    {copiedCode === agent.referral_code ? (
                      <span className="text-green-600 dark:text-green-400 text-xs font-medium">✓</span>
                    ) : (
                      <svg className="w-4 h-4 text-gray-400 dark:text-gray-500 group-hover:text-[#00A191]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                      </svg>
                    )}
                  </button>
                </div>
              </div>

              <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                <button
                  onClick={() => handleEditAgent(agent)}
                  className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#B39DDB] hover:text-[#9575CD] bg-[#B39DDB]/10 hover:bg-[#B39DDB]/20 rounded transition-colors"
                >
                  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                  </svg>
                  Edit
                </button>
                {agent.is_active && (
                  <button
                    onClick={() => handleDeleteAgent(agent.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-300 bg-red-50 dark:bg-red-900/20 hover:bg-red-100 dark:hover:bg-red-900/30 rounded transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                    </svg>
                    Deactivate
                  </button>
                )}
              </div>
            </div>
          ))}
        </div>

        {filteredAgents.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            {agents.length === 0 
              ? 'No agents found. Create your first agent to get started.'
              : 'No agents match your filters. Try adjusting your search criteria.'
            }
          </div>
        )}
      </div>

      {showCreateModal && (
        <AgentFormModal
          agent={editingAgent}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchAgents();
          }}
        />
      )}
    </div>
  );
}

interface AgentFormModalProps {
  agent: Agent | null;
  onClose: () => void;
  onSuccess: () => void;
}

function AgentFormModal({ agent, onClose, onSuccess }: AgentFormModalProps) {
  const [formData, setFormData] = useState({
    name: agent?.name || '',
    contact_number: agent?.contact_number || '',
    email: agent?.email || '',
    role: agent?.role || '',
    team_leader_id: agent?.team_leader_id || '',
    is_active: agent?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [teamLeaders, setTeamLeaders] = useState<Agent[]>([]);
  const toast = useToast();

  useEffect(() => {
    // Fetch team leaders for the dropdown
    const fetchTeamLeaders = async () => {
      try {
        const data = await agentsApi.getAll();
        const leaders = data.filter((a: Agent) => a.role === 'Team Leader' && a.is_active);
        setTeamLeaders(leaders);
      } catch (err) {
        console.error('Error fetching team leaders:', err);
      }
    };
    fetchTeamLeaders();
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const loadingToast = toast.loading(agent ? 'Updating agent...' : 'Creating agent...');
    try {
      if (agent) {
        await agentsApi.update(agent.id, formData);
      } else {
        await agentsApi.create(formData);
      }
      
      toast.dismiss(loadingToast);
      toast.success(agent ? 'Agent updated successfully' : 'Agent created successfully');
      onSuccess();
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'An error occurred';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {agent ? 'Edit Agent' : 'Create Agent'}
        </h2>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Name *
            </label>
            <input
              type="text"
              value={formData.name}
              onChange={(e) => setFormData({ ...formData, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#80CBC4] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Number
            </label>
            <input
              type="tel"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#80CBC4] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Email
            </label>
            <input
              type="email"
              value={formData.email}
              onChange={(e) => setFormData({ ...formData, email: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#80CBC4] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role
            </label>
            <select
              value={formData.role}
              onChange={(e) => {
                const newRole = e.target.value;
                setFormData({ 
                  ...formData, 
                  role: newRole,
                  // Clear team_leader_id if role is Team Leader
                  team_leader_id: newRole === 'Team Leader' ? '' : formData.team_leader_id
                });
              }}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#80CBC4] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            >
              <option value="">Agent</option>
              <option value="Team Leader">Team Leader</option>
            </select>
            <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Select a role for this agent</p>
          </div>

          {/* Only show team leader dropdown if agent is not a team leader */}
          {formData.role !== 'Team Leader' && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Team Leader (Optional)
              </label>
              <select
                value={formData.team_leader_id}
                onChange={(e) => setFormData({ ...formData, team_leader_id: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#80CBC4] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              >
                <option value="">No Team Leader</option>
                {teamLeaders.map((leader) => (
                  <option key={leader.id} value={leader.id}>
                    {leader.name} ({leader.referral_code})
                  </option>
                ))}
              </select>
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Assign this agent to a team leader
              </p>
            </div>
          )}

          {agent && (
            <div className="mb-4">
              <label className="flex items-center">
                <input
                  type="checkbox"
                  checked={formData.is_active}
                  onChange={(e) => setFormData({ ...formData, is_active: e.target.checked })}
                  className="mr-2"
                />
                <span className="text-sm font-medium text-gray-700 dark:text-gray-300">Active</span>
              </label>
            </div>
          )}

          <div className="flex justify-end gap-2">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 border border-gray-300 dark:border-gray-600 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#80CBC4] text-white rounded-md hover:bg-[#6BB8B0] disabled:bg-[#80CBC4]/50 font-medium"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : agent ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

