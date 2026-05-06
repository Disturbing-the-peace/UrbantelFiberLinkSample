'use client';

import { useState, useEffect } from 'react';
import { Referrer } from '@/types';
import { referrersApi } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import LoadingSpinner from '@/components/common/LoadingSpinner';
import Pagination from '@/components/common/Pagination';

export default function ReferrersPage() {
  const [referrers, setReferrers] = useState<Referrer[]>([]);
  const [filteredReferrers, setFilteredReferrers] = useState<Referrer[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingReferrer, setEditingReferrer] = useState<Referrer | null>(null);
  const [copiedCode, setCopiedCode] = useState<string | null>(null);
  
  // Filter states
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState<'all' | 'active' | 'inactive'>('all');
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 10;
  
  const toast = useToast();
  const { user } = useAuth();

  useEffect(() => {
    fetchReferrers();
  }, []);

  // Apply filters
  useEffect(() => {
    let filtered = [...referrers];

    if (searchQuery.trim()) {
      const query = searchQuery.toLowerCase();
      filtered = filtered.filter(referrer => 
        referrer.name.toLowerCase().includes(query) ||
        referrer.email?.toLowerCase().includes(query) ||
        referrer.referral_code.toLowerCase().includes(query) ||
        referrer.contact_number?.toLowerCase().includes(query)
      );
    }

    if (statusFilter !== 'all') {
      filtered = filtered.filter(referrer => 
        statusFilter === 'active' ? referrer.is_active : !referrer.is_active
      );
    }

    setFilteredReferrers(filtered);
    setCurrentPage(1);
  }, [referrers, searchQuery, statusFilter]);
  
  const totalPages = Math.ceil(filteredReferrers.length / ITEMS_PER_PAGE);
  const paginatedReferrers = filteredReferrers.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  const fetchReferrers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await referrersApi.getAll();
      setReferrers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch referrers';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateReferrer = () => {
    setEditingReferrer(null);
    setShowCreateModal(true);
  };

  const handleEditReferrer = (referrer: Referrer) => {
    setEditingReferrer(referrer);
    setShowCreateModal(true);
  };

  const handleDeleteReferrer = async (referrerId: string, referrerName: string) => {
    if (!confirm(`Are you sure you want to delete ${referrerName}? This action cannot be undone.`)) {
      return;
    }

    const loadingToast = toast.loading('Deleting referrer...');
    try {
      await referrersApi.delete(referrerId);
      toast.dismiss(loadingToast);
      toast.success('Referrer deleted successfully');
      fetchReferrers();
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete referrer';
      toast.error(errorMessage);
    }
  };

  const copyReferralCode = (referralCode: string) => {
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralCode)
        .then(() => {
          setCopiedCode(referralCode);
          toast.success('Referral code copied');
          setTimeout(() => setCopiedCode(null), 2000);
        })
        .catch(() => fallbackCopy(referralCode));
    } else {
      fallbackCopy(referralCode);
    }
  };

  const copyReferralLink = (referralCode: string) => {
    const referralLink = `${window.location.origin}/apply-agent?ref=${referralCode}`;
    
    if (navigator.clipboard && navigator.clipboard.writeText) {
      navigator.clipboard.writeText(referralLink)
        .then(() => {
          setCopiedCode(referralCode);
          toast.success('Referral link copied');
          setTimeout(() => setCopiedCode(null), 2000);
        })
        .catch(() => fallbackCopy(referralLink));
    } else {
      fallbackCopy(referralLink);
    }
  };

  const fallbackCopy = (text: string) => {
    const textArea = document.createElement('textarea');
    textArea.value = text;
    textArea.style.position = 'fixed';
    textArea.style.left = '-999999px';
    document.body.appendChild(textArea);
    textArea.select();
    
    try {
      document.execCommand('copy');
      toast.success('Copied to clipboard');
    } catch (err) {
      toast.error('Failed to copy');
    } finally {
      document.body.removeChild(textArea);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">Referrer Management</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={fetchReferrers}
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
        <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">Referrer Management</h1>
        <button
          onClick={handleCreateReferrer}
          className="w-full sm:w-auto bg-[#00A191] text-white px-4 py-2 rounded hover:bg-[#008c7d] font-medium"
        >
          Create Referrer
        </button>
      </div>

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 shadow-md rounded-lg p-4 mb-4 transition-colors duration-300 border border-[#C9B8EC]">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Search
            </label>
            <div className="relative">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by name, email, code, or contact..."
                className="w-full px-4 py-2 pl-10 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              />
              <svg className="absolute left-3 top-2.5 h-5 w-5 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z" />
              </svg>
            </div>
          </div>

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
        </div>

        {(searchQuery || statusFilter !== 'all') && (
          <div className="mt-4 flex items-center justify-between">
            <span className="text-sm text-gray-600 dark:text-gray-400">
              Showing {filteredReferrers.length} of {referrers.length} referrers
            </span>
            <button
              onClick={() => {
                setSearchQuery('');
                setStatusFilter('all');
              }}
              className="text-sm text-[#00A191] hover:text-[#008c7d] font-medium"
            >
              Clear Filters
            </button>
          </div>
        )}
      </div>

      <div className="shadow-md rounded-lg overflow-hidden border border-[#C9B8EC]">
        <div className="bg-white dark:bg-gray-800 transition-colors duration-300 relative min-h-[400px]">
          {loading && (
            <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10">
              <div className="text-center">
                <LoadingSpinner size="md" />
                <div className="text-sm text-gray-900 dark:text-white mt-2">Loading referrers...</div>
              </div>
            </div>
          )}
        
          {/* Desktop Table */}
          <div className="hidden md:block overflow-x-auto">
            <table className="min-w-full divide-y divide-[#C9B8EC]">
              <thead className="bg-[#00A191]">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Referral Code</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Contact</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Status</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {paginatedReferrers.map((referrer) => (
                  <tr key={referrer.id} className="hover:bg-[#80CBC4]/5 dark:hover:bg-gray-700 transition-colors border-l-4 border-transparent hover:border-l-[#80CBC4]">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm font-medium text-gray-900 dark:text-white">{referrer.name}</div>
                      {referrer.email && <div className="text-sm text-gray-500 dark:text-gray-400">{referrer.email}</div>}
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => copyReferralCode(referrer.referral_code)}
                          className="text-left group"
                        >
                          <span className="text-sm font-mono text-gray-900 dark:text-white group-hover:text-[#00A191] underline decoration-dotted">
                            {referrer.referral_code}
                          </span>
                        </button>
                        <button onClick={() => copyReferralLink(referrer.referral_code)} className="group">
                          {copiedCode === referrer.referral_code ? (
                            <span className="text-green-600 text-xs">✓</span>
                          ) : (
                            <svg className="w-4 h-4 text-gray-400 group-hover:text-[#00A191]" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                            </svg>
                          )}
                        </button>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="text-sm text-gray-900 dark:text-white">{referrer.contact_number || 'N/A'}</div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                        referrer.is_active
                          ? 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200'
                          : 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
                      }`}>
                        {referrer.is_active ? 'Active' : 'Inactive'}
                      </span>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleEditReferrer(referrer)}
                          className="text-[#B39DDB] hover:text-[#9575CD] p-1 rounded hover:bg-[#B39DDB]/10"
                        >
                          <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                          </svg>
                        </button>
                        <button
                          onClick={() => handleDeleteReferrer(referrer.id, referrer.name)}
                          className="text-red-600 hover:text-red-900 p-1 rounded hover:bg-red-50"
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

          {/* Mobile Cards */}
          <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
            {paginatedReferrers.map((referrer) => (
              <div key={referrer.id} className="p-4 hover:bg-[#80CBC4]/5 dark:hover:bg-gray-700">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{referrer.name}</h3>
                    {referrer.email && <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{referrer.email}</p>}
                  </div>
                  <span className={`px-2 py-1 text-xs font-semibold rounded-full ${
                    referrer.is_active
                      ? 'bg-green-100 text-green-800'
                      : 'bg-red-100 text-red-800'
                  }`}>
                    {referrer.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="space-y-2 mb-3">
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20">Contact:</span>
                    <span className="text-sm text-gray-900 dark:text-white">{referrer.contact_number || 'N/A'}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className="text-xs text-gray-500 w-20">Code:</span>
                    <button onClick={() => copyReferralCode(referrer.referral_code)} className="group">
                      <span className="text-sm font-mono text-gray-900 dark:text-white group-hover:text-[#00A191] underline decoration-dotted">
                        {referrer.referral_code}
                      </span>
                    </button>
                  </div>
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEditReferrer(referrer)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-[#B39DDB] hover:text-[#9575CD] bg-[#B39DDB]/10 hover:bg-[#B39DDB]/20 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleDeleteReferrer(referrer.id, referrer.name)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                    Delete
                  </button>
                </div>
              </div>
            ))}
          </div>

          {filteredReferrers.length === 0 && !loading && (
            <div className="text-center py-8 text-gray-500 dark:text-gray-400">
              {referrers.length === 0 
                ? 'No referrers found. Create your first referrer.'
                : 'No referrers match your filters.'
              }
            </div>
          )}
        </div>
      
        {!loading && filteredReferrers.length > 0 && (
          <Pagination
            currentPage={currentPage}
            totalPages={totalPages}
            onPageChange={setCurrentPage}
            totalItems={filteredReferrers.length}
            itemsPerPage={ITEMS_PER_PAGE}
          />
        )}
      </div>

      {showCreateModal && (
        <ReferrerFormModal
          referrer={editingReferrer}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchReferrers();
          }}
        />
      )}
    </div>
  );
}

interface ReferrerFormModalProps {
  referrer: Referrer | null;
  onClose: () => void;
  onSuccess: () => void;
}

function ReferrerFormModal({ referrer, onClose, onSuccess }: ReferrerFormModalProps) {
  const [formData, setFormData] = useState({
    name: referrer?.name || '',
    contact_number: referrer?.contact_number || '',
    email: referrer?.email || '',
    is_active: referrer?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const toast = useToast();

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    const loadingToast = toast.loading(referrer ? 'Updating referrer...' : 'Creating referrer...');
    try {
      if (referrer) {
        await referrersApi.update(referrer.id, formData);
      } else {
        await referrersApi.create(formData);
      }
      
      toast.dismiss(loadingToast);
      toast.success(referrer ? 'Referrer updated' : 'Referrer created');
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
      <div className="bg-white dark:bg-gray-800 rounded-lg p-6 w-full max-w-md shadow-xl">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {referrer ? 'Edit Referrer' : 'Create Referrer'}
        </h2>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded mb-4">
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          {referrer && (
            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Referral Code
              </label>
              <input
                type="text"
                value={referrer.referral_code}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md bg-gray-100 dark:bg-gray-700 text-gray-500 dark:text-gray-400"
                disabled
              />
              <p className="text-xs text-gray-500 mt-1">Auto-generated, cannot be changed</p>
            </div>
          )}

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Contact Number
            </label>
            <input
              type="tel"
              value={formData.contact_number}
              onChange={(e) => setFormData({ ...formData, contact_number: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
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
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-[#00A191] bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
            />
          </div>

          {referrer && (
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
              className="px-4 py-2 border border-gray-300 rounded-md text-gray-700 dark:text-gray-300 hover:bg-gray-50 dark:hover:bg-gray-700 disabled:opacity-50"
              disabled={submitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="px-4 py-2 bg-[#00A191] text-white rounded-md hover:bg-[#008c7a] disabled:opacity-50 font-medium"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : referrer ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
