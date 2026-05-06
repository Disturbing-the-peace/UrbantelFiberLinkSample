'use client';

import { useState, useEffect } from 'react';
import { AgentApplication, Referrer } from '@/types';
import { agentApplicationsApi, referrersApi } from '@/lib/api';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';
import { useAuth } from '@/contexts/AuthContext';
import { useToast } from '@/contexts/ToastContext';
import { Download, Eye, Trash2, UserPlus } from 'lucide-react';

export default function AgentApplicationsPage() {
  const [applications, setApplications] = useState<AgentApplication[]>([]);
  const [referrers, setReferrers] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selectedApplication, setSelectedApplication] = useState<AgentApplication | null>(null);
  const { user } = useAuth();
  const toast = useToast();
  
  // Filters
  const [referrerFilter, setReferrerFilter] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;

  useEffect(() => {
    let isMounted = true;

    const loadData = async () => {
      if (isMounted) {
        await Promise.all([
          fetchReferrers(),
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
    if (referrers.length > 0) {
      fetchApplications();
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [referrerFilter, startDate, endDate]);

  const fetchReferrers = async () => {
    try {
      const data = await referrersApi.getAll();
      setReferrers(data);
    } catch (err: any) {
      console.error('Error fetching referrers:', err);
    }
  };

  const fetchApplications = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const params: {
        referred_by_referrer_id?: string;
        start_date?: string;
        end_date?: string;
      } = {};
      
      if (referrerFilter) params.referred_by_referrer_id = referrerFilter;
      if (startDate) params.start_date = startDate;
      if (endDate) params.end_date = endDate;

      const data = await agentApplicationsApi.getAll(params);
      setApplications(data);
    } catch (err: any) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setLoading(false);
    }
  };

  const handleViewDetails = async (applicationId: string) => {
    try {
      const data = await agentApplicationsApi.getById(applicationId);
      setSelectedApplication(data);
    } catch (err: any) {
      toast.error(err instanceof Error ? err.message : 'Failed to load application details');
    }
  };

  const handleDeleteApplication = async (applicationId: string, applicationName: string) => {
    if (!confirm(`Are you sure you want to delete the application from ${applicationName}? This action cannot be undone.`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting application...');
    try {
      await agentApplicationsApi.delete(applicationId);
      toast.dismiss(loadingToast);
      toast.success('Application deleted successfully');
      fetchApplications();
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete application';
      toast.error(errorMessage);
    }
  };

  const handleDownloadDocument = async (url: string, filename: string) => {
    try {
      const response = await fetch(url);
      const blob = await response.blob();
      const downloadUrl = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = downloadUrl;
      a.download = filename;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(downloadUrl);
      document.body.removeChild(a);
    } catch (err) {
      toast.error('Failed to download document');
    }
  };

  const clearFilters = () => {
    setReferrerFilter('');
    setStartDate('');
    setEndDate('');
    setCurrentPage(1);
  };
  
  useEffect(() => {
    setCurrentPage(1);
  }, [referrerFilter, startDate, endDate]);
  
  const filteredApplications = applications;
  const totalPages = Math.ceil(filteredApplications.length / ITEMS_PER_PAGE);
  const paginatedApplications = filteredApplications.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 transition-colors duration-300">
        <div className="container mx-auto px-4 py-8">
          <div className="mb-6">
            <h1 className="text-3xl font-bold text-[#00A191] mb-4">Agent Applications</h1>
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
          <h1 className="text-2xl md:text-3xl font-bold text-[#00A191] mb-4">Agent Applications</h1>
          
          {/* Filters */}
          <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg transition-colors duration-300 p-3 md:p-4 mb-4">
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3 md:gap-4">
              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
                  Referrer
                </label>
                <select
                  value={referrerFilter}
                  onChange={(e) => setReferrerFilter(e.target.value)}
                  className="w-full px-2 md:px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-md bg-white dark:bg-gray-700 text-gray-900 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="">All Referrers</option>
                  <option value="none">No Referrer (Direct)</option>
                  {referrers.filter(r => r.is_active).map((referrer) => (
                    <option key={referrer.id} value={referrer.id}>
                      {referrer.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
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
                <label className="block text-xs md:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1 md:mb-2">
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

            {(referrerFilter || startDate || endDate) && (
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

        <div className="shadow-md rounded-lg overflow-hidden">
          <div className="bg-white dark:bg-gray-800 transition-colors duration-300 relative min-h-[400px]">
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
                      Applicant
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                      Contact
                    </th>
                    <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider whitespace-nowrap">
                      Referrer
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
                  {paginatedApplications.length === 0 && !loading ? (
                    <tr>
                      <td colSpan={5} className="px-6 py-8 text-center text-gray-500 text-sm">
                        No applications found. Try adjusting your filters.
                      </td>
                    </tr>
                  ) : (
                    paginatedApplications.map((application) => (
                      <tr 
                        key={application.id} 
                        className="hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors cursor-pointer border-l-4 border-transparent hover:border-l-[#00A191]"
                        onClick={() => handleViewDetails(application.id)}
                      >
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm font-medium text-gray-900 dark:text-white">
                            {application.first_name} {application.last_name}
                          </div>
                          <div className="text-xs text-gray-500 dark:text-gray-400">{application.email}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">{application.contact_number}</div>
                        </td>
                        <td className="px-6 py-4 whitespace-nowrap">
                          <div className="text-sm text-gray-900 dark:text-white">
                            {application.referrer?.name || <span className="text-gray-500 italic">Direct</span>}
                          </div>
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
                              <Eye size={20} />
                            </button>
                            <button
                              onClick={() => handleDeleteApplication(application.id, `${application.first_name} ${application.last_name}`)}
                              className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                              title="Delete Application"
                            >
                              <Trash2 size={20} />
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
              {paginatedApplications.length === 0 && !loading ? (
                <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
                  No applications found. Try adjusting your filters.
                </div>
              ) : (
                paginatedApplications.map((application) => (
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
                    </div>

                    <div className="space-y-2 mb-3">
                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Referrer:</span>
                        <span className="text-sm text-gray-900 dark:text-white">
                          {application.referrer?.name || <span className="text-gray-500 italic">Direct</span>}
                        </span>
                      </div>

                      <div className="flex items-center gap-2">
                        <span className="text-xs text-gray-500 dark:text-gray-400 w-20">Date:</span>
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
                        <Eye size={16} />
                        View
                      </button>
                      <button
                        onClick={() => handleDeleteApplication(application.id, `${application.first_name} ${application.last_name}`)}
                        className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                        title="Delete"
                      >
                        <Trash2 size={16} />
                      </button>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
          
          {/* Pagination */}
          {!loading && filteredApplications.length > 0 && (
            <Pagination
              currentPage={currentPage}
              totalPages={totalPages}
              onPageChange={setCurrentPage}
              totalItems={filteredApplications.length}
            />
          )}
        </div>
      </div>

      {/* Details Modal */}
      {selectedApplication && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4" onClick={() => setSelectedApplication(null)}>
          <div className="bg-white dark:bg-gray-800 rounded-lg max-w-2xl w-full max-h-[90vh] overflow-y-auto" onClick={(e) => e.stopPropagation()}>
            <div className="p-6">
              <div className="flex justify-between items-start mb-6">
                <h2 className="text-2xl font-bold text-gray-900 dark:text-white">Application Details</h2>
                <button
                  onClick={() => setSelectedApplication(null)}
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                >
                  <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>

              <div className="space-y-4">
                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Personal Information</h3>
                  <div className="mt-2 grid grid-cols-2 gap-4">
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Full Name</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {selectedApplication.first_name} {selectedApplication.middle_name} {selectedApplication.last_name}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Birthday</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">
                        {new Date(selectedApplication.birthday).toLocaleDateString()}
                      </p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Contact Number</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedApplication.contact_number}</p>
                    </div>
                    <div>
                      <p className="text-xs text-gray-500 dark:text-gray-400">Email</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedApplication.email || 'N/A'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-xs text-gray-500 dark:text-gray-400">Address</p>
                      <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedApplication.address}</p>
                    </div>
                  </div>
                </div>

                {selectedApplication.referrer && (
                  <div>
                    <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400">Referrer Information</h3>
                    <div className="mt-2 grid grid-cols-2 gap-4">
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Name</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedApplication.referrer.name}</p>
                      </div>
                      <div>
                        <p className="text-xs text-gray-500 dark:text-gray-400">Referral Code</p>
                        <p className="text-sm font-medium text-gray-900 dark:text-white">{selectedApplication.referrer.referral_code}</p>
                      </div>
                    </div>
                  </div>
                )}

                <div>
                  <h3 className="text-sm font-medium text-gray-500 dark:text-gray-400 mb-2">Documents</h3>
                  <div className="space-y-2">
                    {selectedApplication.resume_url && (
                      <button
                        onClick={() => handleDownloadDocument(selectedApplication.resume_url!, 'resume.pdf')}
                        className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">Resume</span>
                        <Download size={16} />
                      </button>
                    )}
                    {selectedApplication.valid_id_url && (
                      <button
                        onClick={() => handleDownloadDocument(selectedApplication.valid_id_url!, 'valid-id.jpg')}
                        className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">Valid ID with 3 Signatures</span>
                        <Download size={16} />
                      </button>
                    )}
                    {selectedApplication.barangay_clearance_url && (
                      <button
                        onClick={() => handleDownloadDocument(selectedApplication.barangay_clearance_url!, 'barangay-clearance.jpg')}
                        className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">Barangay Clearance</span>
                        <Download size={16} />
                      </button>
                    )}
                    {selectedApplication.gcash_screenshot_url && (
                      <button
                        onClick={() => handleDownloadDocument(selectedApplication.gcash_screenshot_url!, 'gcash-verified.jpg')}
                        className="w-full flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-700 rounded hover:bg-gray-200 dark:hover:bg-gray-600"
                      >
                        <span className="text-sm text-gray-900 dark:text-white">GCash Verified Screenshot</span>
                        <Download size={16} />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
