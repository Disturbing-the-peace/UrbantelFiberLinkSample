'use client';

import { useState, useEffect } from 'react';
import { User } from '@/types';
import ProtectedRoute from '@/components/ProtectedRoute';
import { usersApi, getAccessToken } from '@/lib/api';
import { useToast } from '@/contexts/ToastContext';
import { useAuth } from '@/contexts/AuthContext';
import DeleteUserModal from '@/components/DeleteUserModal';
import Pagination from '@/components/Pagination';

export default function UsersPage() {
  return (
    <ProtectedRoute requiredRole="superadmin">
      <UsersPageContent />
    </ProtectedRoute>
  );
}

function UsersPageContent() {
  const [users, setUsers] = useState<User[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [showCreateModal, setShowCreateModal] = useState(false);
  const [editingUser, setEditingUser] = useState<User | null>(null);
  const [deletingUser, setDeletingUser] = useState<{ id: string; email: string } | null>(null);
  const [deleteLoading, setDeleteLoading] = useState(false);
  const [resettingPassword, setResettingPassword] = useState<{ id: string; email: string; name: string } | null>(null);
  const [resetLoading, setResetLoading] = useState(false);
  const { user } = useAuth();
  const toast = useToast();
  
  // Pagination
  const [currentPage, setCurrentPage] = useState(1);
  const ITEMS_PER_PAGE = 5;
  
  // Calculate pagination
  const totalPages = Math.ceil(users.length / ITEMS_PER_PAGE);
  const paginatedUsers = users.slice(
    (currentPage - 1) * ITEMS_PER_PAGE,
    currentPage * ITEMS_PER_PAGE
  );

  useEffect(() => {
    fetchUsers();
  }, []);

  const fetchUsers = async () => {
    try {
      setLoading(true);
      setError(null);
      const data = await usersApi.getAll();
      setUsers(data);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to fetch users';
      setError(errorMessage);
      toast.error(errorMessage);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateUser = () => {
    setEditingUser(null);
    setShowCreateModal(true);
  };

  const handleEditUser = (user: User) => {
    setEditingUser(user);
    setShowCreateModal(true);
  };

  const handleDeactivateUser = async (userId: string) => {
    if (!confirm('Are you sure you want to deactivate this user? They will not be able to log in, but their data will be preserved.')) {
      return;
    }

    const loadingToast = toast.loading('Deactivating user...');
    try {
      await usersApi.deactivate(userId);
      toast.dismiss(loadingToast);
      toast.success('User deactivated successfully');
      fetchUsers();
    } catch (err) {
      toast.dismiss(loadingToast);
      const errorMessage = err instanceof Error ? err.message : 'Failed to deactivate user';
      toast.error(errorMessage);
    }
  };

  const handleDeleteUser = async (userId: string, userEmail: string) => {
    // Prevent deleting yourself
    if (user?.id === userId) {
      toast.error('You cannot delete your own account');
      return;
    }

    // Open the delete modal
    setDeletingUser({ id: userId, email: userEmail });
  };

  const confirmDeleteUser = async () => {
    if (!deletingUser) return;

    setDeleteLoading(true);
    try {
      await usersApi.deletePermanent(deletingUser.id);
      toast.success('User permanently deleted');
      setDeletingUser(null);
      fetchUsers();
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to delete user';
      toast.error(errorMessage);
    } finally {
      setDeleteLoading(false);
    }
  };

  const handleResetPassword = (userId: string, userEmail: string, userName: string) => {
    setResettingPassword({ id: userId, email: userEmail, name: userName });
  };

  const confirmResetPassword = async () => {
    if (!resettingPassword) return;

    setResetLoading(true);
    try {
      const response = await usersApi.resetPassword(resettingPassword.id);
      toast.success(`Password reset successfully! New password: ${response.default_password}`);
      setResettingPassword(null);
    } catch (err) {
      const errorMessage = err instanceof Error ? err.message : 'Failed to reset password';
      toast.error(errorMessage);
    } finally {
      setResetLoading(false);
    }
  };

  if (error) {
    return (
      <div className="container mx-auto px-4 py-8">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
          <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">User Management</h1>
        </div>
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <div className="text-red-600 mb-4">Error: {error}</div>
          <button
            onClick={fetchUsers}
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
      <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-4 mb-6">
        <h1 className="text-2xl sm:text-3xl font-bold text-[#00A191]">User Management</h1>
        <button
          onClick={handleCreateUser}
          className="w-full sm:w-auto bg-blue-600 text-white px-4 py-2 rounded hover:bg-blue-700"
        >
          Create User
        </button>
      </div>

      <div className="shadow-md rounded-lg overflow-hidden">
        <div className="bg-white dark:bg-gray-800 transition-colors duration-300 relative min-h-[400px]">
          {loading && (
          <div className="absolute inset-0 bg-white/75 dark:bg-gray-800/75 flex items-center justify-center z-10">
            <div className="text-center">
              <div className="inline-block animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mb-2"></div>
              <div className="text-sm text-gray-600 dark:text-gray-400">Loading users...</div>
            </div>
          </div>
        )}
        
        {/* Desktop Table View */}
        <div className="hidden md:block overflow-x-auto">
          <table className="min-w-full divide-y divide-[#C9B8EC]">
          <thead className="bg-[#00A191]">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Name
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Email
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Role
              </th>
              <th className="px-6 py-3 text-left text-xs font-medium text-white uppercase tracking-wider">
                Branches
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
            {paginatedUsers.map((user) => (
              <tr key={user.id}>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm font-medium text-gray-900 dark:text-white">{user.full_name}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="text-sm text-gray-900 dark:text-white">{user.email}</div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.role === 'superadmin'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <div className="text-sm text-gray-900 dark:text-white">
                    {user.branches && user.branches.length > 0 ? (
                      <div className="flex flex-wrap gap-1">
                        {user.branches.map((branch: any) => (
                          <span
                            key={branch.id}
                            className={`px-2 py-1 text-xs rounded-full ${
                              branch.id === user.primary_branch_id
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 font-semibold'
                                : 'bg-gray-100 text-gray-700 dark:bg-gray-700 dark:text-gray-300'
                            }`}
                            title={branch.id === user.primary_branch_id ? 'Primary Branch' : ''}
                          >
                            {branch.name}
                            {branch.id === user.primary_branch_id && ' ★'}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="text-xs text-gray-500 dark:text-gray-400">No branches</span>
                    )}
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span
                    className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleEditUser(user)}
                      className="text-indigo-600 hover:text-indigo-900 dark:text-indigo-400 dark:hover:text-indigo-300 p-1 rounded hover:bg-indigo-50 dark:hover:bg-indigo-900/20"
                      title="Edit User"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                      </svg>
                    </button>
                    <button
                      onClick={() => handleResetPassword(user.id, user.email, user.full_name)}
                      className="text-yellow-600 hover:text-yellow-900 dark:text-yellow-400 dark:hover:text-yellow-300 p-1 rounded hover:bg-yellow-50 dark:hover:bg-yellow-900/20"
                      title="Reset Password"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z" />
                      </svg>
                    </button>
                    {user.is_active && (
                      <button
                        onClick={() => handleDeactivateUser(user.id)}
                        className="text-orange-600 hover:text-orange-900 dark:text-orange-400 dark:hover:text-orange-300 p-1 rounded hover:bg-orange-50 dark:hover:bg-orange-900/20"
                        title="Deactivate User"
                      >
                        <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                        </svg>
                      </button>
                    )}
                    <button
                      onClick={() => handleDeleteUser(user.id, user.email)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 p-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                      title="Permanently Delete User"
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
          {paginatedUsers.length === 0 && !loading ? (
            <div className="p-8 text-center text-gray-500 dark:text-gray-400 text-sm">
              No users found. Create your first user to get started.
            </div>
          ) : (
            paginatedUsers.map((user) => (
              <div key={user.id} className="p-4 hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors">
                <div className="flex justify-between items-start mb-3">
                  <div className="flex-1">
                    <h3 className="text-base font-semibold text-gray-900 dark:text-white">{user.full_name}</h3>
                    <p className="text-sm text-gray-500 dark:text-gray-400 mt-1">{user.email}</p>
                  </div>
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full whitespace-nowrap ${
                      user.is_active
                        ? 'bg-green-100 text-green-800'
                        : 'bg-red-100 text-red-800'
                    }`}
                  >
                    {user.is_active ? 'Active' : 'Inactive'}
                  </span>
                </div>

                <div className="mb-3 flex flex-wrap gap-2">
                  <span
                    className={`px-2 py-1 text-xs font-semibold rounded-full ${
                      user.role === 'superadmin'
                        ? 'bg-teal-100 text-teal-800'
                        : 'bg-blue-100 text-blue-800'
                    }`}
                  >
                    {user.role}
                  </span>
                  {user.branches && user.branches.length > 0 && (
                    <div className="flex flex-wrap gap-1">
                      {user.branches.map((branch: any) => (
                        <span
                          key={branch.id}
                          className={`px-2 py-1 text-xs rounded-full ${
                            branch.id === user.primary_branch_id
                              ? 'bg-green-100 text-green-800 font-semibold'
                              : 'bg-gray-100 text-gray-700'
                          }`}
                        >
                          {branch.name}
                          {branch.id === user.primary_branch_id && ' ★'}
                        </span>
                      ))}
                    </div>
                  )}
                </div>

                <div className="flex gap-2 pt-2 border-t border-gray-200 dark:border-gray-700">
                  <button
                    onClick={() => handleEditUser(user)}
                    className="flex-1 flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-indigo-600 hover:text-indigo-700 bg-indigo-50 hover:bg-indigo-100 rounded transition-colors"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
                    </svg>
                    Edit
                  </button>
                  <button
                    onClick={() => handleResetPassword(user.id, user.email, user.full_name)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-yellow-600 hover:text-yellow-700 bg-yellow-50 hover:bg-yellow-100 rounded transition-colors"
                    title="Reset Password"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1721 9z" />
                    </svg>
                  </button>
                  {user.is_active && (
                    <button
                      onClick={() => handleDeactivateUser(user.id)}
                      className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-orange-600 hover:text-orange-700 bg-orange-50 hover:bg-orange-100 rounded transition-colors"
                      title="Deactivate"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                      </svg>
                    </button>
                  )}
                  <button
                    onClick={() => handleDeleteUser(user.id, user.email)}
                    className="flex items-center justify-center gap-2 px-3 py-2 text-sm font-medium text-red-600 hover:text-red-700 bg-red-50 hover:bg-red-100 rounded transition-colors"
                    title="Delete"
                  >
                    <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                    </svg>
                  </button>
                </div>
              </div>
            ))
          )}
        </div>

        {users.length === 0 && !loading && (
          <div className="text-center py-8 text-gray-500 dark:text-gray-400">
            No users found. Create your first user to get started.
          </div>
        )}
      </div>
      
      {/* Pagination */}
      {!loading && users.length > 0 && (
        <Pagination
          currentPage={currentPage}
          totalPages={totalPages}
          onPageChange={setCurrentPage}
          totalItems={users.length}
          itemsPerPage={ITEMS_PER_PAGE}
        />
      )}
      </div>

      {showCreateModal && (
        <UserFormModal
          user={editingUser}
          onClose={() => setShowCreateModal(false)}
          onSuccess={() => {
            setShowCreateModal(false);
            fetchUsers();
          }}
        />
      )}

      <DeleteUserModal
        isOpen={!!deletingUser}
        onClose={() => setDeletingUser(null)}
        onConfirm={confirmDeleteUser}
        userEmail={deletingUser?.email || ''}
        loading={deleteLoading}
      />

      <ResetPasswordModal
        isOpen={!!resettingPassword}
        onClose={() => setResettingPassword(null)}
        onConfirm={confirmResetPassword}
        userName={resettingPassword?.name || ''}
        userEmail={resettingPassword?.email || ''}
        loading={resetLoading}
      />
    </div>
  );
}

interface UserFormModalProps {
  user: User | null;
  onClose: () => void;
  onSuccess: () => void;
}

function UserFormModal({ user, onClose, onSuccess }: UserFormModalProps) {
  const [formData, setFormData] = useState({
    email: user?.email || '',
    full_name: user?.full_name || '',
    role: user?.role || 'admin',
    primary_branch_id: user?.primary_branch_id || user?.branch_id || '',
    branch_ids: user?.branches?.map(b => b.id) || (user?.branch_id ? [user.branch_id] : []),
    password: '',
    is_active: user?.is_active ?? true,
  });
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [branches, setBranches] = useState<any[]>([]);
  const [loadingBranches, setLoadingBranches] = useState(true);
  const toast = useToast();

  // Fetch branches for dropdown
  useEffect(() => {
    const fetchBranches = async () => {
      try {
        setLoadingBranches(true);
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || 'http://192.168.1.56:5000'}/api/branches`, {
          headers: {
            'Authorization': `Bearer ${await getAccessToken()}`,
          },
        });
        if (response.ok) {
          const data = await response.json();
          setBranches(data);
        }
      } catch (err) {
        console.error('Error fetching branches:', err);
      } finally {
        setLoadingBranches(false);
      }
    };
    fetchBranches();
  }, []);

  // Handle branch selection toggle
  const toggleBranch = (branchId: string) => {
    setFormData(prev => {
      const isSelected = prev.branch_ids.includes(branchId);
      const newBranchIds = isSelected
        ? prev.branch_ids.filter(id => id !== branchId)
        : [...prev.branch_ids, branchId];
      
      // If removing the primary branch, clear it
      let newPrimaryBranchId = prev.primary_branch_id;
      if (isSelected && prev.primary_branch_id === branchId) {
        newPrimaryBranchId = newBranchIds.length > 0 ? newBranchIds[0] : '';
      }
      
      return {
        ...prev,
        branch_ids: newBranchIds,
        primary_branch_id: newPrimaryBranchId,
      };
    });
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setError(null);

    // Validation
    if (formData.branch_ids.length === 0) {
      setError('At least one branch must be selected');
      setSubmitting(false);
      return;
    }

    if (!formData.primary_branch_id) {
      setError('Primary branch must be selected');
      setSubmitting(false);
      return;
    }

    if (!formData.branch_ids.includes(formData.primary_branch_id)) {
      setError('Primary branch must be one of the selected branches');
      setSubmitting(false);
      return;
    }

    const loadingToast = toast.loading(user ? 'Updating user...' : 'Creating user...');
    try {
      const body = user
        ? { 
            full_name: formData.full_name, 
            role: formData.role, 
            primary_branch_id: formData.primary_branch_id,
            branch_ids: formData.branch_ids,
            is_active: formData.is_active 
          }
        : {
            email: formData.email,
            full_name: formData.full_name,
            role: formData.role,
            primary_branch_id: formData.primary_branch_id,
            branch_ids: formData.branch_ids,
            password: formData.password,
          };

      if (user) {
        await usersApi.update(user.id, body);
      } else {
        await usersApi.create(body);
      }

      toast.dismiss(loadingToast);
      toast.success(user ? 'User updated successfully' : 'User created successfully');
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
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg transition-colors duration-300 p-6 w-full max-w-md max-h-[90vh] overflow-y-auto">
        <h2 className="text-2xl font-bold mb-4 text-gray-900 dark:text-white">
          {user ? 'Edit User' : 'Create User'}
        </h2>

        {error && (
          <div className="bg-red-100 dark:bg-red-900/30 border border-red-400 dark:border-red-700 text-red-700 dark:text-red-300 px-4 py-3 rounded mb-4">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit}>
          {!user && (
            <div className="mb-4">
              <label htmlFor="email" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Email *
              </label>
              <input
                id="email"
                type="email"
                value={formData.email}
                onChange={(e) => setFormData({ ...formData, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                required
              />
            </div>
          )}

          <div className="mb-4">
            <label htmlFor="full_name" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Full Name *
            </label>
            <input
              id="full_name"
              type="text"
              value={formData.full_name}
              onChange={(e) => setFormData({ ...formData, full_name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            />
          </div>

          <div className="mb-4">
            <label htmlFor="role" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Role *
            </label>
            <select
              id="role"
              value={formData.role}
              onChange={(e) => setFormData({ ...formData, role: e.target.value as 'admin' | 'superadmin' })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
            >
              <option value="admin">Admin</option>
              <option value="superadmin">Superadmin</option>
            </select>
          </div>

          <div className="mb-4">
            <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Assigned Branches * <span className="text-xs text-gray-500">(Select at least one)</span>
            </label>
            <div className="border border-gray-300 dark:border-gray-600 rounded-md p-3 max-h-48 overflow-y-auto bg-white dark:bg-gray-700">
              {loadingBranches ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">Loading branches...</p>
              ) : branches.length === 0 ? (
                <p className="text-sm text-gray-500 dark:text-gray-400">No branches available</p>
              ) : (
                <div className="space-y-2">
                  {branches.map((branch) => (
                    <label
                      key={branch.id}
                      className="flex items-center p-2 hover:bg-gray-50 dark:hover:bg-gray-600 rounded cursor-pointer"
                    >
                      <input
                        type="checkbox"
                        checked={formData.branch_ids.includes(branch.id)}
                        onChange={() => toggleBranch(branch.id)}
                        className="mr-3 h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                      />
                      <span className="text-sm text-gray-900 dark:text-white">{branch.name}</span>
                    </label>
                  ))}
                </div>
              )}
            </div>
            {formData.branch_ids.length > 0 && (
              <p className="text-xs text-green-600 dark:text-green-400 mt-1">
                {formData.branch_ids.length} branch{formData.branch_ids.length !== 1 ? 'es' : ''} selected
              </p>
            )}
          </div>

          <div className="mb-4">
            <label htmlFor="primary_branch_id" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
              Primary Branch * <span className="text-xs text-gray-500">(Main branch for this user)</span>
            </label>
            <select
              id="primary_branch_id"
              value={formData.primary_branch_id}
              onChange={(e) => setFormData({ ...formData, primary_branch_id: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
              required
              disabled={loadingBranches || formData.branch_ids.length === 0}
            >
              <option value="">Select primary branch</option>
              {branches
                .filter(branch => formData.branch_ids.includes(branch.id))
                .map((branch) => (
                  <option key={branch.id} value={branch.id}>
                    {branch.name}
                  </option>
                ))}
            </select>
            {formData.branch_ids.length === 0 && (
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                Select at least one branch first
              </p>
            )}
          </div>

          {!user && (
            <div className="mb-4">
              <label htmlFor="password" className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Password *
              </label>
              <input
                id="password"
                type="password"
                value={formData.password}
                onChange={(e) => setFormData({ ...formData, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 bg-white dark:bg-gray-700 text-gray-900 dark:text-white"
                minLength={8}
                required
              />
              <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">Minimum 8 characters</p>
            </div>
          )}

          {user && (
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
              className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 disabled:bg-blue-300 dark:disabled:bg-blue-800"
              disabled={submitting}
            >
              {submitting ? 'Saving...' : user ? 'Update' : 'Create'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}


interface ResetPasswordModalProps {
  isOpen: boolean;
  onClose: () => void;
  onConfirm: () => void;
  userName: string;
  userEmail: string;
  loading: boolean;
}

function ResetPasswordModal({ isOpen, onClose, onConfirm, userName, userEmail, loading }: ResetPasswordModalProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 bg-gray-900/50 dark:bg-gray-900/70 flex items-center justify-center z-50 p-4">
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6 transition-colors duration-300">
        <div className="flex items-center justify-center w-12 h-12 mx-auto bg-yellow-100 dark:bg-yellow-900/30 rounded-full mb-4">
          <svg
            xmlns="http://www.w3.org/2000/svg"
            className="h-6 w-6 text-yellow-600 dark:text-yellow-400"
            fill="none"
            viewBox="0 0 24 24"
            stroke="currentColor"
          >
            <path
              strokeLinecap="round"
              strokeLinejoin="round"
              strokeWidth={2}
              d="M15 7a2 2 0 012 2m4 0a6 6 0 01-7.743 5.743L11 17H9v2H7v2H4a1 1 0 01-1-1v-2.586a1 1 0 01.293-.707l5.964-5.964A6 6 0 1121 9z"
            />
          </svg>
        </div>

        <h3 className="text-lg font-semibold text-gray-900 dark:text-white text-center mb-2">
          Reset Password
        </h3>

        <div className="mb-6">
          <p className="text-sm text-gray-600 dark:text-gray-400 text-center mb-4">
            Are you sure you want to reset the password for:
          </p>
          <div className="bg-gray-50 dark:bg-gray-700 rounded-lg p-4 mb-4">
            <p className="text-sm font-semibold text-gray-900 dark:text-white mb-1">{userName}</p>
            <p className="text-sm text-gray-600 dark:text-gray-400">{userEmail}</p>
          </div>
          <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-3">
            <p className="text-sm text-yellow-800 dark:text-yellow-300 font-medium mb-1">
              ⚠️ Default Password
            </p>
            <p className="text-sm text-yellow-700 dark:text-yellow-400">
              The password will be reset to: <span className="font-mono font-bold">123123123</span>
            </p>
            <p className="text-xs text-yellow-600 dark:text-yellow-500 mt-2">
              The user will be required to change this password on their next login.
            </p>
          </div>
        </div>

        <div className="flex gap-3">
          <button
            onClick={onClose}
            disabled={loading}
            className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
          >
            Cancel
          </button>
          <button
            onClick={onConfirm}
            disabled={loading}
            className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
          >
            {loading ? (
              <>
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                Resetting...
              </>
            ) : (
              'Reset Password'
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
