import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import { PencilIcon, TrashIcon, PlusIcon, XMarkIcon, UsersIcon, EyeIcon, MagnifyingGlassIcon, ChevronLeftIcon, ChevronRightIcon } from '@heroicons/react/24/outline';
import PageHeader from '../../components/common/PageHeader';

const UserManagement = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const { addToast } = useToast();
  const [users, setUsers] = useState([]);
  const [filteredUsers, setFilteredUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [showModal, setShowModal] = useState(false);
  const [showViewModal, setShowViewModal] = useState(false);
  const [viewingUser, setViewingUser] = useState(null);
  const [editingUser, setEditingUser] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const [usersPerPage] = useState(10);
  const [formData, setFormData] = useState({
    username: '',
    email: '',
    first_name: '',
    last_name: '',
    role: 'staff',
    password: '',
    confirmPassword: '',
    is_active: true,
    permissions: []
  });

  // Available system modules for permissions
  const availablePermissions = [
    { id: 'dashboard', label: 'Dashboard', icon: '📊' },
    { id: 'orders', label: 'Orders', icon: '📦' },
    { id: 'sales', label: 'Sales', icon: '💰' },
    { id: 'customers', label: 'Customers', icon: '👥' },
    { id: 'inventory', label: 'Inventory', icon: '📦' },
    { id: 'purchases', label: 'Purchases', icon: '🛒' },
    { id: 'suppliers', label: 'Suppliers', icon: '🏭' },
    { id: 'employees', label: 'Employees', icon: '👨‍💼' },
    { id: 'expenses', label: 'Expenses', icon: '💸' },
    { id: 'roznamcha', label: 'Roznamcha', icon: '📓' },
    { id: 'reports', label: 'Reports', icon: '📈' },
    { id: 'settings', label: 'Settings', icon: '⚙️' }
  ];

  useEffect(() => {
    fetchUsers();
  }, []);

  useEffect(() => {
    filterUsers();
  }, [users, searchQuery, currentPage]);

  const fetchUsers = async () => {
    try {
      const response = await api.get('/api/auth/users/');
      setUsers(response.data);
    } catch (error) {
      console.error('Error fetching users:', error);
      addToast(t('userManagement.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const filterUsers = () => {
    let filtered = users;

    if (searchQuery) {
      filtered = filtered.filter(user =>
        user.username.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.email.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.first_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        user.last_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    setFilteredUsers(filtered);
  };

  const indexOfLastUser = currentPage * usersPerPage;
  const indexOfFirstUser = indexOfLastUser - usersPerPage;
  const currentUsers = filteredUsers.slice(indexOfFirstUser, indexOfLastUser);
  const totalPages = Math.ceil(filteredUsers.length / usersPerPage);

  const handlePageChange = (pageNumber) => {
    setCurrentPage(pageNumber);
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : value
    }));
  };

  const handlePermissionChange = (permissionId) => {
    setFormData(prev => {
      const permissions = prev.permissions || [];
      if (permissions.includes(permissionId)) {
        return { ...prev, permissions: permissions.filter(p => p !== permissionId) };
      } else {
        return { ...prev, permissions: [...permissions, permissionId] };
      }
    });
  };

  const toggleAllPermissions = () => {
    setFormData(prev => {
      if (prev.permissions.length === availablePermissions.length) {
        return { ...prev, permissions: [] };
      } else {
        return { ...prev, permissions: availablePermissions.map(p => p.id) };
      }
    });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    // Validate passwords match when creating or changing password
    if ((!editingUser || formData.password) && formData.password !== formData.confirmPassword) {
      addToast(t('userManagement.passwordMismatch'), 'error');
      return;
    }

    try {
      const payload = {
        username: formData.username.trim(),
        email: formData.email.trim(),
        first_name: formData.first_name.trim(),
        last_name: formData.last_name.trim(),
        role: formData.role,
        is_active: formData.is_active,
        permissions: formData.role === 'staff' ? formData.permissions : []
      };

      // Only include password if it's provided
      if (formData.password) {
        payload.password = formData.password.trim();
      }

      if (editingUser) {
        await api.patch(`/api/auth/users/${editingUser.id}/`, payload);
        addToast(t('userManagement.userUpdated'), 'success');
      } else {
        await api.post('/api/auth/users/', payload);
        addToast(t('userManagement.userAdded'), 'success');
      }
      
      fetchUsers();
      closeModal();
    } catch (error) {
      console.error('Error saving user:', error);
      const serverMessage =
        error.response?.data?.password?.[0] ||
        error.response?.data?.detail ||
        error.response?.data?.message;
      const message = serverMessage || (editingUser ? t('userManagement.failedToUpdate') : t('userManagement.failedToAdd'));
      addToast(message, 'error');
    }
  };

  const handleView = (user) => {
    setViewingUser(user);
    setShowViewModal(true);
  };

  const handleEdit = (user) => {
    setEditingUser(user);
    setFormData({
      username: user.username,
      email: user.email,
      first_name: user.first_name,
      last_name: user.last_name,
      role: user.role,
      password: '',
      confirmPassword: '',
      is_active: user.is_active,
      permissions: user.permissions || []
    });
    setShowModal(true);
  };

  const handleDelete = async (userId) => {
    if (!window.confirm(t('userManagement.deleteConfirm'))) {
      return;
    }

    try {
      await api.delete(`/api/auth/users/${userId}/`);
      addToast(t('userManagement.userDeleted'), 'success');
      fetchUsers();
    } catch (error) {
      console.error('Error deleting user:', error);
      addToast(t('userManagement.failedToDelete'), 'error');
    }
  };

  const closeModal = () => {
    setShowModal(false);
    setEditingUser(null);
    setFormData({
      username: '',
      email: '',
      first_name: '',
      last_name: '',
      role: 'staff',
      password: '',
      confirmPassword: '',
      is_active: true,
      permissions: []
    });
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center h-screen bg-gray-50 dark:bg-gray-900">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-3 p-3">
        {/* Header */}
        <PageHeader
          title={t('userManagement.title')}
          subtitle={t('userManagement.subtitle')}
          icon={UsersIcon}
          actions={
            <button
              onClick={() => setShowModal(true)}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('userManagement.addUser')}
            </button>
          }
        />

        {/* Search Filter */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
          <div className="flex items-center gap-2">
            <MagnifyingGlassIcon className="h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              value={searchQuery}
              onChange={(e) => {
                setSearchQuery(e.target.value);
                setCurrentPage(1);
              }}
              className="flex-1 px-2 py-1.5 text-sm border-0 focus:ring-0 bg-transparent text-gray-900 dark:text-white placeholder-gray-400"
            />
          </div>
        </div>

        {/* Users Table */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
          <div className="overflow-x-auto">
          <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700">
            <thead className="bg-blue-600">
              <tr>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">
                  {t('userManagement.username')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">
                  {t('userManagement.email')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">
                  {t('userManagement.role')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">
                  {t('userManagement.isActive')}
                </th>
                <th className="px-3 py-2 text-left text-xs font-medium uppercase tracking-wider text-white">
                  {t('userManagement.createdAt')}
                </th>
                <th className="px-3 py-2 text-right text-xs font-medium uppercase tracking-wider text-white">
                  {t('userManagement.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {currentUsers.map((user) => (
                <tr key={user.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                  <td className="px-3 py-2 whitespace-nowrap text-xs font-medium text-gray-900 dark:text-white">
                    {user.username}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {user.email}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      user.role === 'admin' 
                        ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                        : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                    }`}>
                      {user.role === 'admin' ? t('userManagement.admin') : t('userManagement.staff')}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    <span className={`px-1.5 py-0.5 rounded-full text-[10px] ${
                      user.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                    }`}>
                      {user.is_active ? t('common.active') : t('common.inactive')}
                    </span>
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-xs text-gray-500 dark:text-gray-400">
                    {formatDate(user.created_at)}
                  </td>
                  <td className="px-3 py-2 whitespace-nowrap text-right text-xs font-medium">
                    <button
                      onClick={() => handleView(user)}
                      className="text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 mr-2"
                      title="View"
                    >
                      <EyeIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleEdit(user)}
                      className="text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 mr-2"
                      title="Edit"
                    >
                      <PencilIcon className="h-4 w-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(user.id)}
                      className="text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300"
                      title="Delete"
                    >
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
          </div>
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="flex items-center justify-between">
              <div className="text-xs text-gray-600 dark:text-gray-400">
                {t('pagination.showing')} {indexOfFirstUser + 1} {t('pagination.to')} {Math.min(indexOfLastUser, filteredUsers.length)} {t('pagination.of')} {filteredUsers.length} {t('pagination.results')}
              </div>
              <div className="flex gap-1">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-2 py-1 text-xs rounded ${
                          currentPage === page
                            ? 'bg-blue-600 text-white'
                            : 'hover:bg-gray-100 dark:hover:bg-gray-700 text-gray-600 dark:text-gray-400'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-1 text-xs">...</span>;
                  }
                  return null;
                })}
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1 rounded hover:bg-gray-100 dark:hover:bg-gray-700 disabled:opacity-50 disabled:cursor-not-allowed"
                >
                  <ChevronRightIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Add/Edit User Modal */}
        {showModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-md max-h-[90vh] overflow-y-auto">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {editingUser ? t('userManagement.editUser') : t('userManagement.addUser')}
                </h2>
                <button 
                  onClick={closeModal} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <form onSubmit={handleSubmit} className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('userManagement.username')}
                  </label>
                  <input
                    type="text"
                    name="username"
                    value={formData.username}
                    onChange={handleChange}
                    required
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('userManagement.email')}
                  </label>
                  <input
                    type="email"
                    name="email"
                    value={formData.email}
                    onChange={handleChange}
                    required
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('userManagement.firstName')}
                    </label>
                    <input
                      type="text"
                      name="first_name"
                      value={formData.first_name}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('userManagement.lastName')}
                    </label>
                    <input
                      type="text"
                      name="last_name"
                      value={formData.last_name}
                      onChange={handleChange}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('userManagement.role')}
                  </label>
                  <select
                    name="role"
                    value={formData.role}
                    onChange={handleChange}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  >
                    <option value="staff">{t('userManagement.staff')}</option>
                    <option value="admin">{t('userManagement.admin')}</option>
                  </select>
                </div>

                {/* Permissions Section - Only show for Staff */}
                {formData.role === 'staff' && (
                  <div className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                    <div className="flex items-center justify-between mb-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">
                        Access Permissions
                      </label>
                      <button
                        type="button"
                        onClick={toggleAllPermissions}
                        className="text-[10px] text-blue-600 dark:text-blue-400 hover:underline"
                      >
                        {formData.permissions.length === availablePermissions.length ? 'Deselect All' : 'Select All'}
                      </button>
                    </div>
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mb-2">
                      Select which modules this staff member can access
                    </p>
                    <div className="grid grid-cols-2 gap-2 max-h-48 overflow-y-auto">
                      {availablePermissions.map(permission => (
                        <label
                          key={permission.id}
                          className="flex items-center gap-2 p-2 rounded-md hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer transition"
                        >
                          <input
                            type="checkbox"
                            checked={formData.permissions.includes(permission.id)}
                            onChange={() => handlePermissionChange(permission.id)}
                            className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                          />
                          <span className="text-xs text-gray-700 dark:text-gray-300 flex items-center gap-1">
                            <span>{permission.icon}</span>
                            <span>{permission.label}</span>
                          </span>
                        </label>
                      ))}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('userManagement.password')} {editingUser && <span className="text-[10px]">(leave blank to keep)</span>}
                  </label>
                  <input
                    type="password"
                    name="password"
                    value={formData.password}
                    onChange={handleChange}
                    required={!editingUser}
                    className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                  />
                </div>

                {(!editingUser || formData.password) && (
                  <div>
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('userManagement.confirmPassword')}
                    </label>
                    <input
                      type="password"
                      name="confirmPassword"
                      value={formData.confirmPassword}
                      onChange={handleChange}
                      required={!editingUser}
                      className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                )}

                <div className="flex items-center">
                  <input
                    type="checkbox"
                    name="is_active"
                    checked={formData.is_active}
                    onChange={handleChange}
                    className="h-3.5 w-3.5 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label className="ml-2 block text-xs text-gray-900 dark:text-gray-300">
                    {t('userManagement.isActive')}
                  </label>
                </div>

                <div className="flex gap-2 pt-3">
                  <button
                    type="button"
                    onClick={closeModal}
                    className="btn-form-red flex-1 text-sm"
                  >
                    {t('userManagement.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-form-green flex-1 text-sm"
                  >
                    {t('userManagement.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
        )}

        {/* View User Modal */}
        {showViewModal && viewingUser && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-md">
              <div className="flex justify-between items-center mb-4">
                <h2 className="text-base font-bold text-gray-900 dark:text-white">
                  {t('common.view')} {t('userManagement.title')}
                </h2>
                <button 
                  onClick={() => setShowViewModal(false)} 
                  className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200 transition"
                >
                  <XMarkIcon className="h-5 w-5" />
                </button>
              </div>

              <div className="space-y-3">
                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('userManagement.username')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingUser.username}</p>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('userManagement.email')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{viewingUser.email}</p>
                </div>

                <div className="grid grid-cols-2 gap-3">
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('userManagement.firstName')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingUser.first_name || '-'}</p>
                  </div>
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                      {t('userManagement.lastName')}
                    </label>
                    <p className="text-sm text-gray-900 dark:text-white">{viewingUser.last_name || '-'}</p>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('userManagement.role')}
                  </label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    viewingUser.role === 'admin' 
                      ? 'bg-purple-100 text-purple-800 dark:bg-purple-900 dark:text-purple-200' 
                      : 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                  }`}>
                    {viewingUser.role === 'admin' ? t('userManagement.admin') : t('userManagement.staff')}
                  </span>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('userManagement.isActive')}
                  </label>
                  <span className={`inline-block px-2 py-1 rounded-full text-xs ${
                    viewingUser.is_active 
                      ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' 
                      : 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200'
                  }`}>
                    {viewingUser.is_active ? t('common.active') : t('common.inactive')}
                  </span>
                </div>

                {/* Show Permissions for Staff users */}
                {viewingUser.role === 'staff' && viewingUser.permissions && viewingUser.permissions.length > 0 && (
                  <div>
                    <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-2">
                      Access Permissions
                    </label>
                    <div className="flex flex-wrap gap-1.5">
                      {viewingUser.permissions.map(permId => {
                        const perm = availablePermissions.find(p => p.id === permId);
                        return perm ? (
                          <span
                            key={permId}
                            className="inline-flex items-center gap-1 px-2 py-0.5 bg-blue-100 dark:bg-blue-900 text-blue-800 dark:text-blue-200 rounded-full text-[10px]"
                          >
                            <span>{perm.icon}</span>
                            <span>{perm.label}</span>
                          </span>
                        ) : null;
                      })}
                    </div>
                  </div>
                )}

                <div>
                  <label className="block text-xs font-medium text-gray-500 dark:text-gray-400 mb-1">
                    {t('userManagement.createdAt')}
                  </label>
                  <p className="text-sm text-gray-900 dark:text-white">{formatDate(viewingUser.created_at)}</p>
                </div>

                <div className="flex justify-end pt-3">
                  <button
                    type="button"
                    onClick={() => setShowViewModal(false)}
                    className="btn-form-red text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}
        </div>
      </div>
    </div>
  );
};

export default UserManagement;
