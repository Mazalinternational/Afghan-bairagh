import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';

const EmployeesList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const [employees, setEmployees] = useState([]);
  const [allEmployees, setAllEmployees] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchEmployees();
  }, []);

  useEffect(() => {
    paginateEmployees();
  }, [allEmployees, currentPage, itemsPerPage, searchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchEmployees = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/employees/');
      // Handle both paginated and non-paginated responses
      const employeesData = res.data.results || (Array.isArray(res.data) ? res.data : []);
      setAllEmployees(employeesData);
    } catch (err) {
      console.error('Error fetching employees:', err);
      showToast(t('employees.failedToFetch'), 'error');
      setAllEmployees([]);
    } finally {
      setLoading(false);
    }
  };

  const paginateEmployees = () => {
    let filteredEmployees = Array.isArray(allEmployees) ? allEmployees : [];
    
    if (searchQuery.trim()) {
      filteredEmployees = filteredEmployees.filter(employee => 
        employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.nid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEmployees = filteredEmployees.slice(startIndex, endIndex);
    
    setEmployees(paginatedEmployees);
  };

  const totalItems = searchQuery.trim() 
    ? (Array.isArray(allEmployees) ? allEmployees : []).filter(employee => 
        employee.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.nid?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        employee.phone?.toLowerCase().includes(searchQuery.toLowerCase())
      ).length
    : (Array.isArray(allEmployees) ? allEmployees : []).length;

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleDelete = async (id, name) => {
    setDeleteModal({ id, name });
  };

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    try {
      await api.delete(`/api/employees/${id}/`);
      setAllEmployees(allEmployees.filter(e => e.id !== id));
      showToast(`${name} ${t('customers.deletedSuccess')}`);
    } catch (err) {
      console.error('Error deleting employee:', err);
      showToast(t('employees.failedToDelete'), 'error');
    }
    setDeleteModal(null);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 md:p-4">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-2 sm:top-4 right-2 sm:right-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs text-white z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-3 text-gray-900 dark:text-white">{t('modals.confirmDelete')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-4">
              {t('modals.deleteMessage')} <strong>{deleteModal.name}</strong>?
            </p>
            <div className="flex gap-2">
              <button
                onClick={confirmDelete}
                className="flex-1 bg-red-600 text-white py-1.5 px-3 rounded text-xs hover:bg-red-700"
              >
                {t('modals.yesDelete')}
              </button>
              <button
                onClick={() => setDeleteModal(null)}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-1.5 px-3 rounded text-xs hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Header */}
      <PageHeader
        title={t('employees.title')}
        subtitle={t('employees.addEmployeePageSubtitle')}
        icon={UserGroupIcon}
        actions={
          <button
            onClick={() => navigate('/employees/create')}
            className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('employees.addEmployee')}
          </button>
        }
      />

      {/* Search and Filters */}
      <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow space-y-2 sm:space-y-3">
        <div className="flex flex-col sm:flex-row gap-2 sm:gap-3">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 absolute left-2 top-2 sm:top-2.5 text-gray-400" />
            <input
              type="text"
              placeholder={t('employees.searchPlaceholder')}
              onChange={handleSearchChange}
              className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center gap-1.5 sm:gap-2">
            <label className="text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300">{t('customers.show')}:</label>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">{t('customers.perPage')}</span>
          </div>
        </div>
      </div>

      {/* Employees Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        {employees.length === 0 ? (
          <div className="p-6 text-center text-sm text-gray-500 dark:text-gray-400">
            {t('employees.noEmployeesFound')}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-[10px] sm:text-xs min-w-[600px]">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('employees.name')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('employees.nid')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('employees.phone')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('employees.salary')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('common.status')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                  {employees.map((employee) => (
                    <tr key={employee.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
                        {employee.name}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {employee.nid}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {employee.phone}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        AFN {employee.salary}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                        <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs ${
                          employee.is_active 
                            ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                            : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {employee.is_active ? t('dashboard.active') : t('employees.inactive')}
                        </span>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button
                            onClick={() => navigate(`/employees/${employee.id}`)}
                            className="p-0.5 sm:p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded transition-colors"
                            title={t('common.view')}
                          >
                            <EyeIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/employees/${employee.id}/edit`)}
                            className="p-0.5 sm:p-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 rounded transition-colors"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(employee.id, employee.name)}
                            className="p-0.5 sm:p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
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
              {employees.map((employee) => (
                <div key={employee.id} className="p-2 sm:p-4 space-y-2 sm:space-y-3">
                  <div className="flex justify-between items-start">
                    <div>
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{employee.name}</h3>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">NID: {employee.nid}</p>
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{employee.phone}</p>
                    </div>
                    <div className="flex space-x-1 sm:space-x-2">
                      <button
                        onClick={() => navigate(`/employees/${employee.id}`)}
                        className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded transition-colors"
                      >
                        <EyeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => navigate(`/employees/${employee.id}/edit`)}
                        className="p-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 rounded transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                      <button
                        onClick={() => handleDelete(employee.id, employee.name)}
                        className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                      </button>
                    </div>
                  </div>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
                    <span>Salary: AFN {employee.salary}</span>
                    <span className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[9px] sm:text-xs rounded-full ${
                      employee.is_active 
                        ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                        : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                    }`}>
                      {employee.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3 md:gap-4">
            <div className="text-[10px] sm:text-xs md:text-sm text-gray-700 dark:text-gray-300">
              Showing {startItem} to {endItem} of {totalItems} results
            </div>
            <div className="flex items-center gap-1 sm:gap-2">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeftIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-1.5 sm:px-2 md:px-3 py-1 sm:py-1.5 md:py-2 text-[10px] sm:text-xs border rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 dark:text-gray-300'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-0.5 sm:px-1 md:px-2 text-[10px] sm:text-xs">...</span>;
                }
                return null;
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 sm:p-2 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRightIcon className="h-3 w-3 sm:h-4 sm:w-4" />
              </button>
            </div>
          </div>
        </div>
      )}
        </div>
      </div>
    </div>
  );
};

export default EmployeesList;
