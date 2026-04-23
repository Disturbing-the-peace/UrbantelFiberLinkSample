'use client';

import { useState, useEffect } from 'react';
import { Application, Agent } from '@/types';
import { applicationsApi, agentsApi, exportApi } from '@/lib/api';
import LoadingSpinner from '@/components/LoadingSpinner';

interface ApplicationWithRelations extends Application {
  agents?: Agent;
  plans?: {
    id: string;
    name: string;
    category: string;
    speed: string;
    price: number;
  };
}

export default function ApplicationsPage() {
  const [applications, setApplications] = useState<ApplicationWithRelations[]>([]);
  const [agents, setAgents] = useState<Agent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<ApplicationWithRelations | null>(null);
  const [downloadingDocs, setDownloadingDocs] = useState<Record<string, boolean>>({});
  const [showErrorModal, setShowErrorModal] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string>('');
  
  // Filters
  const [statusFilter, setStatusFilter] = useState<string>('');
  const [agentFilter, setAgentFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await Promise.all([
          fetchAgents(),
          fetchApplications()
        ]);
      }
    };

    loadData();

    return () => {
      isMounted = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    // Only fetch when filters change, not on initial load
    if (agents.length > 0) {
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [statusFilter, agentFilter, startDate, endDate]);

  const fetchAgents = async () => {
    try {
      const data = await agentsApi.getAll();
      setAgents(data);
    } catch (err: any) {
      console.error('Error fetching agents:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: {
        status?: string;
        agent_id?: string;
        start_date?: string;
        end_date?: string;
      } = {};
      
      if (statusFilter) params.status = statusFilter;
      if (agentFilter) params.agent_id = agentFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await applicationsApi.getAll(params);
      
      // Filter out activated applications - they should only appear in Subscriber Management
      const filteredData = data.filter((app: ApplicationWithRelations) => app.status !== 'Activated');
      
      setApplications(filteredData);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (applicationId: string) => {
    try {
      const data = await applicationsApi.getById(applicationId);
      setSelectedApplication(data);
    } catch (err: any) {
      alert(err instanceof Error ? err.message : 'Failed to load application details');
    }
  };

  const clearFilters = () => {
    setStatusFilter('');
    setAgentFilter('');
    setStartDate('');
    setEndDate('');
  };

  const handleDownloadDocuments = async (applicationId: string) => {
    try {
      setDownloadingDocs((prev) => ({ ...prev, [applicationId]: true }));

      const response = await exportApi.subscriberDocuments(applicationId);

      console.log('Download response status:', response.status);
      console.log('Download response headers:', response.headers);

      if (!response.ok) {
        // Try to get error message from response
        let errorMessage = 'Failed to download documents';
        try {
          const errorData = await response.json();
          errorMessage = errorData.error || errorMessage;
        } catch (e) {
          // Response might not be JSON
        }

        // Check if it's a 404 (no documents found)
        if (response.status === 404) {
          setErrorMessage('No documents available for this application. Documents may not have been uploaded yet.');
          setShowErrorModal(true);
          return;
        }
        
        setErrorMessage(errorMessage);
        setShowErrorModal(true);
        return;
      }

      // Get the filename from Content-Disposition header or use default
      const contentDisposition = response.headers.get('Content-Disposition');
      console.log('Content-Disposition header:', contentDisposition);
      
      let filename = `application-${applicationId}-documents.zip`;
      if (contentDisposition) {
        // Match filename with or without quotes, handle both formats
        const filenameMatch = contentDisposition.match(/filename[^;=\n]*=((['"]).*?\2|[^;\n]*)/);
        if (filenameMatch && filenameMatch[1]) {
          filename = filenameMatch[1].replace(/['"]/g, '');
          console.log('Extracted filename:', filename);
        }
      }
      
      console.log('Final filename:', filename);

      // Download the file
      const blob = await response.blob();
      console.log('Blob size:', blob.size, 'type:', blob.type);
      
      if (blob.size === 0) {
        setErrorMessage('Downloaded file is empty. The documents may not be available.');
        setShowErrorModal(true);
        return;
      }

      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch (err) {
      console.error('Error downloading documents:', err);
      setErrorMessage(`Failed to download documents: ${err instanceof Error ? err.message : 'Unknown error'}. Please try again or contact support if the issue persists.`);
      setShowErrorModal(true);
    } finally {
      setDownloadingDocs((prev) => ({ ...prev, [applicationId]: false }));
    }
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Submitted': 'bg-blue-100 text-blue-800',
      'Under Review': 'bg-yellow-100 text-yellow-800',
      'Approved': 'bg-green-100 text-green-800',
      'Scheduled for Installation': 'bg-teal-100 text-teal-800',
      'Activated': 'bg-emerald-100 text-emerald-800',
      'Denied': 'bg-red-100 text-red-800',
      'Voided': 'bg-gray-100 text-gray-800',
    };
    return colors[status] || 'bg-gray-100 text-gray-800';
  };

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#00A191] mb-4">Application Management</h1>
          </div>
          <div className="bg-red-50 border border-red-400 rounded-lg p-6 text-center">
            <div className="text-red-600 mb-4">Error: {error}</div>
            <button
              onClick={() => fetchApplications()}
              className="px-4 py-2 bg-[#00A191] text-white rounded hover:bg-[#008c7d] font-medium"
            >
              Retry
            </button>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
      <div className="container mx-auto px-4 py-4 md:py-8">
      <div className="mb-4 md:mb-6">
        <h1 className="text-2xl md:text-3xl font-bold text-[#00A191] mb-4">Application Management</h1>
        
        {/* Filters */}
        <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg transition-colors duration-300 p-3 md:p-4 mb-4">
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3 md:gap-4">
            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Status
              </label>
              <select
                value={statusFilter}
                onChange={(e) => setStatusFilter(e.target.value)}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value="">All Statuses</option>
                <option value="Submitted">Submitted</option>
                <option value="Under Review">Under Review</option>
                <option value="Approved">Approved</option>
                <option value="Scheduled for Installation">Scheduled for Installation</option>
                <option value="Denied">Denied</option>
                <option value="Voided">Voided</option>
              </select>
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Agent
              </label>
              <select
                value={agentFilter}
                onChange={(e) => setAgentFilter(e.target.value)}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
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
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                Start Date
              </label>
              <input
                type="date"
                value={startDate}
                onChange={(e) => setStartDate(e.target.value)}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>

            <div>
              <label className="block text-xs md:text-sm font-medium text-gray-700 mb-1 md:mb-2">
                End Date
              </label>
              <input
                type="date"
                value={endDate}
                onChange={(e) => setEndDate(e.target.value)}
                className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          {(statusFilter || agentFilter || startDate || endDate) && (
            <div className="mt-3 md:mt-4">
              <button
                onClick={clearFilters}
                className="text-xs md:text-sm text-[#00A191] hover:text-[#008c7d]"
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
              <div className="text-sm text-gray-600 dark:text-gray-400 mt-2">Loading applications...</div>
            </div>
          </div>
        )}
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[#C9B8EC]">
            <thead className="bg-[#00A191]">
              <tr>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Customer
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Plan
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Agent
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Status
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Submitted
                </th>
                <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                  Actions
                </th>
              </tr>
            </thead>
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {applications.length === 0 && !loading ? (
                <tr>
                  <td colSpan={6} className="px-6 py-8 text-center text-gray-500 text-sm">
                    No applications found. Try adjusting your filters.
                  </td>
                </tr>
              ) : (
                applications.map((application) => (
                <tr 
                  key={application.id} 
                  className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border-l-4 border-transparent hover:border-l-[#00A191]"
                  onClick={() => handleViewDetails(application.id)}
                >
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm font-medium text-gray-900 dark:text-white">
                      {application.first_name} {application.last_name}
                    </div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{application.contact_number}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{application.plans?.name}</div>
                    <div className="text-xs text-gray-500 dark:text-gray-400">{application.plans?.speed}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <div className="text-sm text-gray-900 dark:text-white">{application.agents?.name}</div>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap">
                    <span
                      className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${getStatusColor(
                        application.status
                      )}`}
                    >
                      {application.status}
                    </span>
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500 dark:text-gray-400">
                    {new Date(application.created_at).toLocaleDateString()}
                  </td>
                  <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                    <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => handleViewDetails(application.id)}
                        className="text-[#00A191] hover:text-[#008c7a] p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600"
                        title="View Details"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                        </svg>
                      </button>
                      <button
                        onClick={() => handleDownloadDocuments(application.id)}
                        disabled={downloadingDocs[application.id]}
                        className="text-[#00A191] hover:text-[#008c7d] disabled:text-gray-400 disabled:cursor-not-allowed p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-600 disabled:hover:bg-transparent"
                        title="Download Documents"
                      >
                        {downloadingDocs[application.id] ? (
                          <svg className="animate-spin h-5 w-5" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                            <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                            <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                          </svg>
                        ) : (
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                          </svg>
                        )}
                      </button>
                    </div>
                  </td>
                </tr>
              ))
              )}
            </tbody>
          </table>
        </div>

        {/* Mobile Card View */}
        <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
          {applications.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              No applications found. Try adjusting your filters.
            </div>
          ) : (
            applications.map((application) => (
              <div 
                key={application.id} 
                className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
                onClick={() => handleViewDetails(application.id)}
              >
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">
                      {application.first_name} {application.last_name}
                    </h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{application.contact_number}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${getStatusColor(
                      application.status
                    )}`}
                  >
                    {application.status}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Plan:</span>
                    <div>
                      <span className="text-sm text-gray-900 dark:text-white">{application.plans?.name}</span>
                      <span className="text-xs text-gray-500 dark:text-gray-400 ml-2">({application.plans?.speed})</span>
                    </div>
                  </div>
                  
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Agent:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{application.agents?.name}</span>
                  </div>

                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 dark:text-gray-400 w-16">Date:</span>
                    <span className="text-sm text-gray-900 dark:text-white">
                      {new Date(application.created_at).toLocaleDateString()}
                    </span>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700" onClick={(e) => e.stopPropagation()}>
                  <button
                    onClick={() => handleViewDetails(application.id)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#00A191] hover:text-[#008c7a] bg-[#00A191]/10 hover:bg-[#00A191]/20 rounded transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
                    </svg>
                    View
                  </button>
                  <button
                    onClick={() => handleDownloadDocuments(application.id)}
                    disabled={downloadingDocs[application.id]}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#00A191] hover:text-[#008c7a] bg-[#00A191]/10 hover:bg-[#00A191]/20 rounded transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {downloadingDocs[application.id] ? (
                      <>
                        <svg className="animate-spin h-4 w-4" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                          <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                          <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                        </svg>
                        Downloading...
                      </>
                    ) : (
                      <>
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M9 19l3 3m0 0l3-3m-3 3V10" />
                        </svg>
                        Docs
                      </>
                    )}
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>

      {selectedApplication && (
        <ApplicationDetailModal
          application={selectedApplication}
          onClose={() => setSelectedApplication(null)}
          onUpdate={() => {
            setSelectedApplication(null);
            fetchApplications();
          }}
        />
      )}

      {/* Error Modal for Document Download */}
      {showErrorModal && (
        <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full">
            <div className="p-6">
              <div className="flex items-center justify-center w-12 h-12 mx-auto bg-red-100 dark:bg-red-900/30 rounded-full mb-4">
                <svg className="w-6 h-6 text-red-600 dark:text-red-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <h3 className="text-lg font-semibold text-center text-gray-900 dark:text-white mb-2">
                No Documents Available
              </h3>
              <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-6">
                {errorMessage}
              </p>
              <button
                onClick={() => setShowErrorModal(false)}
                className="w-full px-4 py-2 bg-[#00A191] text-white rounded-md hover:bg-[#008c7a] transition-colors font-medium"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  );
}


interface ApplicationDetailModalProps {
  application: ApplicationWithRelations;
  onClose: () => void;
  onUpdate: () => void;
}

function ApplicationDetailModal({ application, onClose, onUpdate }: ApplicationDetailModalProps) {
  const [selectedStatus, setSelectedStatus] = useState(application.status);
  const [statusReason, setStatusReason] = useState(application.status_reason || '');
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [selectedImage, setSelectedImage] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<'customer' | 'plan' | 'agent' | 'documents'>('customer');

  // Lock body scroll when modal is open
  useEffect(() => {
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = 'unset';
    };
  }, []);

  const statusRequiresReason = ['Denied', 'Voided'].includes(selectedStatus);

  const handleStatusUpdate = async () => {
    if (statusRequiresReason && !statusReason.trim()) {
      setError('A reason is required for this status');
      return;
    }

    setSubmitting(true);
    setError(null);

    try {
      await applicationsApi.updateStatus(application.id, {
        status: selectedStatus,
        status_reason: statusReason.trim() || undefined,
      });
      onUpdate();
    } catch (err) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setSubmitting(false);
    }
  };

  const getAvailableStatuses = () => {
    const transitions: Record<string, string[]> = {
      'Submitted': ['Under Review', 'Denied', 'Voided'],
      'Under Review': ['Approved', 'Denied', 'Voided'],
      'Approved': ['Scheduled for Installation', 'Denied', 'Voided'],
      'Scheduled for Installation': ['Activated', 'Voided'],
      'Activated': [],
      'Denied': [],
      'Voided': [],
    };
    return transitions[application.status] || [];
  };

  const getStatusColor = (status: string) => {
    const colors: Record<string, string> = {
      'Submitted': 'bg-[#00A191]/10 text-[#00A191] border-[#00A191]/20',
      'Under Review': 'bg-yellow-100 text-yellow-800 border-yellow-200',
      'Approved': 'bg-green-100 text-green-800 border-green-200',
      'Scheduled for Installation': 'bg-teal-100 text-teal-800 border-teal-200',
      'Activated': 'bg-emerald-100 text-emerald-800 border-emerald-200',
      'Denied': 'bg-red-100 text-red-800 border-red-200',
      'Voided': 'bg-gray-100 text-gray-800 border-gray-200',
    };
    return colors[status] || 'bg-gray-100 text-gray-800 border-gray-200';
  };

  const availableStatuses = getAvailableStatuses();
  const canUpdateStatus = availableStatuses.length > 0;

  return (
    <>
      <div className="fixed inset-0 bg-gray-900/20 dark:bg-black/40 flex items-center justify-center z-50 p-4">
        <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 w-full max-w-4xl max-h-[90vh] overflow-y-auto">
          <div className="sticky top-0 bg-white dark:bg-gray-800 border-b border-gray-200 dark:border-gray-700 px-6 py-4 flex justify-between items-center z-10">
            <h2 className="text-2xl font-bold">Application Details</h2>
            <button
              onClick={onClose}
              className="text-gray-500 hover:text-gray-700 text-2xl"
            >
              ×
            </button>
          </div>

          <div className="p-6">
            {error && (
              <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
                {error}
              </div>
            )}

            {/* Status Card with Management */}
            <div className={`mb-6 p-4 rounded-lg border-2 ${getStatusColor(application.status)}`}>
              <div className="flex items-start justify-between mb-3 gap-4">
                <div className="flex-1 min-w-0">
                  <div className="text-sm font-medium opacity-75">Current Status</div>
                  <div className="text-2xl font-bold break-words">{application.status}</div>
                </div>
                <div className="text-right text-sm flex-shrink-0">
                  <div className="opacity-75">Application ID</div>
                  <div className="font-mono text-xs">{application.id.slice(0, 8)}...</div>
                </div>
              </div>
              
              {application.status_reason && (
                <div className="mb-3 pb-3 border-b border-current opacity-75">
                  <span className="font-medium">Reason:</span> {application.status_reason}
                </div>
              )}

              {/* Status Management */}
              {canUpdateStatus && (
                <div className="mt-3 pt-3 border-t border-current">
                  <div className="mb-3">
                    <label className="block text-sm font-medium opacity-90 mb-2">
                      Update Status
                    </label>
                    <select
                      value={selectedStatus}
                      onChange={(e) => setSelectedStatus(e.target.value as typeof selectedStatus)}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:text-white"
                    >
                      <option value={application.status}>{application.status}</option>
                      {availableStatuses.map((status) => (
                        <option key={status} value={status}>
                          {status}
                        </option>
                      ))}
                    </select>
                  </div>

                  {statusRequiresReason && (
                    <div className="mb-3">
                      <label className="block text-sm font-medium opacity-90 mb-2">
                        Reason * (required for {selectedStatus})
                      </label>
                      <textarea
                        value={statusReason}
                        onChange={(e) => setStatusReason(e.target.value)}
                        className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white text-gray-900 dark:text-white"
                        rows={3}
                        placeholder="Please provide a reason..."
                      />
                    </div>
                  )}

                  {selectedStatus !== application.status && (
                    <button
                      onClick={handleStatusUpdate}
                      disabled={submitting}
                      className="w-full bg-[#00A191] text-white px-4 py-2 rounded-md hover:bg-[#008c7d] disabled:bg-[#00A191]/50 font-medium"
                    >
                      {submitting ? 'Updating...' : `Update to ${selectedStatus}`}
                    </button>
                  )}
                </div>
              )}

              {!canUpdateStatus && (
                <div className="mt-3 pt-3 border-t border-current opacity-75 text-sm">
                  This application is in a terminal state and cannot be updated.
                </div>
              )}

              <div className="mt-3 pt-3 border-t border-current opacity-75 text-xs">
                <div>Submitted: {new Date(application.created_at).toLocaleString()}</div>
                <div>Last Updated: {new Date(application.updated_at).toLocaleString()}</div>
                {application.activated_at && (
                  <div>Activated: {new Date(application.activated_at).toLocaleString()}</div>
                )}
              </div>
            </div>

            {/* Tabs */}
            <div className="mb-6">
              <div className="border-b border-gray-200 dark:border-gray-700">
                <nav className="-mb-px flex space-x-8">
                  <button
                    onClick={() => setActiveTab('customer')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'customer'
                        ? 'border-[#00A191] text-[#00A191]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Customer Information
                  </button>
                  <button
                    onClick={() => setActiveTab('plan')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'plan'
                        ? 'border-[#00A191] text-[#00A191]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Plan Information
                  </button>
                  <button
                    onClick={() => setActiveTab('agent')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'agent'
                        ? 'border-[#00A191] text-[#00A191]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Agent Information
                  </button>
                  <button
                    onClick={() => setActiveTab('documents')}
                    className={`py-2 px-1 border-b-2 font-medium text-sm ${
                      activeTab === 'documents'
                        ? 'border-[#00A191] text-[#00A191]'
                        : 'border-transparent text-gray-500 dark:text-gray-400 hover:text-gray-700 dark:hover:text-gray-300 hover:border-gray-300 dark:hover:border-gray-600'
                    }`}
                  >
                    Documents
                  </button>
                </nav>
              </div>

              {/* Tab Content */}
              <div className="mt-4">
                {activeTab === 'customer' && (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 bg-gray-50 dark:bg-gray-700/50 p-4 rounded">
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Full Name</label>
                      <p className="text-gray-900 dark:text-white">
                        {application.first_name} {application.middle_name} {application.last_name}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Birthday</label>
                      <p className="text-gray-900 dark:text-white">
                        {application.birthday ? new Date(application.birthday).toLocaleDateString() : (
                          <span className="text-gray-500 italic">Purged</span>
                        )}
                      </p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contact Number</label>
                      <p className="text-gray-900 dark:text-white">{application.contact_number}</p>
                    </div>
                    <div>
                      <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                      <p className="text-gray-900 dark:text-white">{application.email || 'N/A'}</p>
                    </div>
                    
                    {/* Location Section - Table Format */}
                    <div className="md:col-span-2">
                      <label className="text-sm font-medium text-gray-600 mb-2 block">Location</label>
                      <div className="bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                        <table className="min-w-full divide-y divide-gray-200">
                          <tbody className="divide-y divide-gray-200">
                            <tr>
                              <td className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50 w-32">Address</td>
                              <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">{application.address}</td>
                            </tr>
                            {application.latitude && application.longitude && (
                              <tr>
                                <td className="px-4 py-2 text-sm font-medium text-gray-600 bg-gray-50">Coordinates</td>
                                <td className="px-4 py-2 text-sm text-gray-900 dark:text-white">
                                  {application.latitude}, {application.longitude}
                                </td>
                              </tr>
                            )}
                          </tbody>
                        </table>
                      </div>
                      
                      {/* Map Snapshot */}
                      {application.latitude && application.longitude && (
                        <div className="mt-3 border border-gray-200 rounded-lg overflow-hidden">
                          <iframe
                            width="100%"
                            height="300"
                            frameBorder="0"
                            style={{ border: 0 }}
                            src={`https://www.openstreetmap.org/export/embed.html?bbox=${application.longitude - 0.01},${application.latitude - 0.01},${application.longitude + 0.01},${application.latitude + 0.01}&layer=mapnik&marker=${application.latitude},${application.longitude}`}
                            allowFullScreen
                          ></iframe>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'plan' && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Plan Name</label>
                        <p className="text-gray-900 dark:text-white">{application.plans?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Category</label>
                        <p className="text-gray-900 dark:text-white">{application.plans?.category}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Speed</label>
                        <p className="text-gray-900 dark:text-white">{application.plans?.speed}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Price</label>
                        <p className="text-gray-900 dark:text-white">₱{application.plans?.price}</p>
                      </div>
                    </div>
                  </div>
                )}

                {activeTab === 'agent' && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Agent Name</label>
                        <p className="text-gray-900 dark:text-white">{application.agents?.name}</p>
                      </div>
                      <div>
                        <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Referral Code</label>
                        <p className="text-gray-900 dark:text-white">{application.agents?.referral_code}</p>
                      </div>
                      {application.agents?.contact_number && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Contact</label>
                          <p className="text-gray-900 dark:text-white">{application.agents.contact_number}</p>
                        </div>
                      )}
                      {application.agents?.email && (
                        <div>
                          <label className="text-sm font-medium text-gray-600 dark:text-gray-400">Email</label>
                          <p className="text-gray-900 dark:text-white">{application.agents.email}</p>
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {activeTab === 'documents' && (
                  <div className="bg-gray-50 dark:bg-gray-700/50 p-4 rounded">
                    {application.data_purged ? (
                      <div className="text-center py-8">
                        <div className="text-gray-400 mb-2">
                          <svg className="mx-auto h-12 w-12" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m5.618-4.016A11.955 11.955 0 0112 2.944a11.955 11.955 0 01-8.618 3.04A12.02 12.02 0 003 9c0 5.591 3.824 10.29 9 11.622 5.176-1.332 9-6.03 9-11.622 0-1.042-.133-2.052-.382-3.016z" />
                          </svg>
                        </div>
                        <p className="text-gray-600 font-medium">Documents have been purged</p>
                        <p className="text-sm text-gray-500 mt-1">
                          Sensitive documents were automatically deleted after 3 days of activation
                        </p>
                        {application.data_purged_at && (
                          <p className="text-xs text-gray-400 mt-2">
                            Purged on: {new Date(application.data_purged_at).toLocaleString()}
                          </p>
                        )}
                      </div>
                    ) : (
                      <>
                        {!application.house_photo_url && !application.government_id_url && 
                         !application.id_selfie_url && !application.signature_url ? (
                          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                            No documents uploaded
                          </div>
                        ) : (
                          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
                            {application.house_photo_url && (
                              <DocumentThumbnail
                                label="House Photo"
                                url={application.house_photo_url}
                                onClick={() => setSelectedImage(application.house_photo_url!)}
                              />
                            )}
                            {application.government_id_url && (
                              <DocumentThumbnail
                                label="Government ID"
                                url={application.government_id_url}
                                onClick={() => setSelectedImage(application.government_id_url!)}
                              />
                            )}
                            {application.id_selfie_url && (
                              <DocumentThumbnail
                                label="ID Selfie"
                                url={application.id_selfie_url}
                                onClick={() => setSelectedImage(application.id_selfie_url!)}
                              />
                            )}
                            {application.signature_url && (
                              <DocumentThumbnail
                                label="Signature"
                                url={application.signature_url}
                                onClick={() => setSelectedImage(application.signature_url!)}
                              />
                            )}
                          </div>
                        )}
                      </>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      </div>

      {/* Image Viewer Modal */}
      {selectedImage && (
        <ImageViewerModal
          imageUrl={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </>
  );
}

interface DocumentThumbnailProps {
  label: string;
  url: string;
  onClick: () => void;
}

function DocumentThumbnail({ label, url, onClick }: DocumentThumbnailProps) {
  const [imageUrl, setImageUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(false);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { getAccessToken } = await import('@/lib/api');
        const token = await getAccessToken();
        
        if (!token) {
          throw new Error('No access token available');
        }
        
        const response = await fetch(`${apiUrl}/api/documents/${url}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) {
          const errorData = await response.json().catch(() => ({ error: 'Unknown error' }));
          console.error('Failed to fetch image:', response.status, errorData);
          throw new Error(`Failed to fetch image: ${errorData.error || response.statusText}`);
        }
        
        const data = await response.json();
        setImageUrl(data.url);
      } catch (err) {
        console.error('Error loading image:', err);
        setError(true);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [url]);
  
  return (
    <div className="border border-gray-300 rounded-lg overflow-hidden cursor-pointer hover:shadow-lg transition-shadow">
      <div
        onClick={onClick}
        className="aspect-square bg-gray-100 flex items-center justify-center overflow-hidden"
      >
        {loading ? (
          <LoadingSpinner size="md" />
        ) : error ? (
          <div className="text-red-500 text-xs text-center p-2">Failed to load</div>
        ) : (
          <img
            src={imageUrl}
            alt={label}
            className="w-full h-full object-cover"
          />
        )}
      </div>
      <div className="p-2 bg-white">
        <p className="text-xs font-medium text-gray-700 text-center">{label}</p>
      </div>
    </div>
  );
}

interface ImageViewerModalProps {
  imageUrl: string;
  onClose: () => void;
}

function ImageViewerModal({ imageUrl, onClose }: ImageViewerModalProps) {
  const [signedUrl, setSignedUrl] = useState<string>('');
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchSignedUrl = async () => {
      try {
        // If it's already a full URL (signed URL), use it directly
        if (imageUrl.startsWith('http')) {
          setSignedUrl(imageUrl);
          setLoading(false);
          return;
        }

        // Otherwise, fetch the signed URL from the API
        const apiUrl = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:5000';
        const { getAccessToken } = await import('@/lib/api');
        const token = await getAccessToken();
        
        if (!token) {
          throw new Error('No access token available');
        }
        
        const response = await fetch(`${apiUrl}/api/documents/${imageUrl}`, {
          headers: {
            'Authorization': `Bearer ${token}`
          }
        });
        
        if (!response.ok) throw new Error('Failed to fetch image');
        
        const data = await response.json();
        setSignedUrl(data.url);
      } catch (err) {
        console.error('Error loading image:', err);
      } finally {
        setLoading(false);
      }
    };

    fetchSignedUrl();
  }, [imageUrl]);
  
  return (
    <div
      className="fixed inset-0 bg-black bg-opacity-90 flex items-center justify-center z-[60] p-4"
      onClick={onClose}
    >
      <div className="relative max-w-7xl max-h-full">
        <button
          onClick={onClose}
          className="absolute top-4 right-4 text-white text-4xl hover:text-gray-300 z-10"
        >
          ×
        </button>
        {loading ? (
          <div className="flex items-center justify-center p-20">
            <LoadingSpinner size="lg" />
          </div>
        ) : (
          <img
            src={signedUrl}
            alt="Document"
            className="max-w-full max-h-[90vh] object-contain"
            onClick={(e) => e.stopPropagation()}
          />
        )}
      </div>
    </div>
  );
}

