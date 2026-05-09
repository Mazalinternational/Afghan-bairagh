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
  DocumentTextIcon,
  ArrowLeftIcon,
  UserGroupIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';

const CustomersList = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const [customers, setCustomers] = useState([]);
  const [allCustomers, setAllCustomers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [toast, setToast] = useState(null);
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  useEffect(() => {
    fetchCustomers();
  }, []);

  useEffect(() => {
    paginateCustomers();
  }, [allCustomers, currentPage, itemsPerPage, searchQuery]);

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/customers/');
      setAllCustomers(res.data);
    } catch (err) {
      console.error('Error fetching customers:', err);
    } finally {
      setLoading(false);
    }
  };

  const paginateCustomers = () => {
    let filteredCustomers = allCustomers;
    
    // Apply search filter
    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      filteredCustomers = allCustomers.filter(customer =>
        customer.name.toLowerCase().includes(q) ||
        customer.phone.toLowerCase().includes(q) ||
        (customer.phone_secondary || '').toLowerCase().includes(q) ||
        (customer.manual_serial_no || '').toLowerCase().includes(q)
      );
    }
    
    // Apply pagination
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedCustomers = filteredCustomers.slice(startIndex, endIndex);
    
    setCustomers(paginatedCustomers);
  };

  const totalItems = searchQuery.trim() 
    ? (() => {
        const q = searchQuery.toLowerCase();
        return allCustomers.filter(customer =>
          customer.name.toLowerCase().includes(q) ||
          customer.phone.toLowerCase().includes(q) ||
          (customer.phone_secondary || '').toLowerCase().includes(q) ||
          (customer.manual_serial_no || '').toLowerCase().includes(q)
        ).length;
      })()
    : allCustomers.length;

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
      const response = await api.delete(`/api/customers/${id}/`);
      setAllCustomers(allCustomers.filter(c => c.id !== id));
      showToast(response.data?.message || `${name} ${t('common.deletedSuccess')}`);
    } catch (err) {
      console.error('Error deleting customer:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete customer';
      showToast(errorMessage || t('customers.failedToDelete'), 'error');
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

  const handleViewCustomer = async (customerId) => {
    try {
      const res = await api.get(`/api/customers/${customerId}/`);
      setSelectedCustomer(res.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching customer:', err);
      showToast('Failed to load customer details', 'error');
    }
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
        title={t('customers.title')}
        subtitle={t('customers.subtitle')}
        icon={UserGroupIcon}
        actions={
          <button
            onClick={() => navigate('/customers/create')}
            className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('customers.addCustomer')}
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
              placeholder={t('customers.searchPlaceholderSerial')}
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

      {/* Customers Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        {customers.length === 0 ? (
          <div className="p-4 sm:p-6 text-center text-xs sm:text-sm text-gray-500 dark:text-gray-400">
            {t('customers.noCustomersFound')}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto -mx-2 sm:mx-0">
              <table className="w-full text-[10px] sm:text-xs min-w-[680px]">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.name')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.manualSerialNo')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.phone')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.address')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.email')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.date')}</th>
                    <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">{t('customers.actions')}</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-300">
                  {customers.map((customer) => (
                    <tr key={customer.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
                        <div className="flex items-center gap-1">
                          <span>{customer.name}</span>
                          {customer.has_due && (
                            <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-700">
                              {t('customers.hasDue') || 'Due'}
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {customer.manual_serial_no || '—'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {customer.phone}
                        {customer.phone_secondary ? ` / ${customer.phone_secondary}` : ''}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 max-w-xs truncate">
                        {customer.address}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {customer.email || '-'}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {formatDate(customer.registration_date)}
                      </td>
                      <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium">
                        <div className="flex space-x-1 sm:space-x-2">
                          <button
                            onClick={() => handleViewCustomer(customer.id)}
                            className="p-0.5 sm:p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 dark:hover:text-blue-300 rounded transition-colors"
                            title={t('customers.view')}
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/customers/${customer.id}/ledger`)}
                            className="p-0.5 sm:p-1 text-purple-600 hover:text-purple-900 dark:text-purple-400 dark:hover:text-purple-300 rounded transition-colors"
                            title={t('customers.ledgerLabel')}
                          >
                            <DocumentTextIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/customers/${customer.id}/edit`)}
                            className="p-0.5 sm:p-1 text-green-600 hover:text-green-900 dark:text-green-400 dark:hover:text-green-300 rounded transition-colors"
                            title={t('customers.edit')}
                          >
                            <PencilIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(customer.id, customer.name)}
                            className="p-0.5 sm:p-1 text-red-600 hover:text-red-900 dark:text-red-400 dark:hover:text-red-300 rounded transition-colors"
                            title={t('customers.delete')}
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
            {customers.map((customer) => (
              <div key={customer.id} className="p-2 sm:p-3 space-y-2">
                <div className="flex justify-between items-start">
                  <div>
                    <div className="flex items-center gap-1">
                      <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{customer.name}</h3>
                      {customer.has_due && (
                        <span className="inline-flex items-center px-1.5 py-0.5 rounded-full text-[9px] font-semibold bg-red-100 text-red-700">
                          {t('customers.hasDue') || 'Due'}
                        </span>
                      )}
                    </div>
                      {(customer.manual_serial_no || '').trim() !== '' && (
                        <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-300">
                          {t('customers.manualSerialNo')}: <span className="font-medium">{customer.manual_serial_no}</span>
                        </p>
                      )}
                      <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                        {customer.phone}
                        {customer.phone_secondary ? ` / ${customer.phone_secondary}` : ''}
                      </p>
                    </div>
                    <div className="flex space-x-1">
                      <button
                        onClick={() => handleViewCustomer(customer.id)}
                        className="p-1 text-blue-600 hover:text-blue-900 dark:text-blue-400 rounded transition-colors"
                        title={t('customers.view')}
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${customer.id}/ledger`)}
                        className="p-1 text-purple-600 hover:text-purple-900 dark:text-purple-400 rounded transition-colors"
                        title={t('customers.ledgerLabel')}
                      >
                        <DocumentTextIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/customers/${customer.id}/edit`)}
                        className="p-1 text-green-600 hover:text-green-900 dark:text-green-400 rounded transition-colors"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(customer.id, customer.name)}
                        className="p-1 text-red-600 hover:text-red-900 dark:text-red-400 rounded transition-colors"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <p className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400 truncate">{customer.address}</p>
                  <div className="flex justify-between text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    <span>{customer.email || t('customers.noEmail')}</span>
                    <span>{formatDate(customer.registration_date)}</span>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
            <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
              {t('pagination.showing')} {startItem} {t('pagination.to')} {endItem} {t('pagination.of')} {totalItems} {t('pagination.results')}
            </div>
            <div className="flex items-center gap-1 sm:gap-1.5">
              <button
                onClick={() => handlePageChange(currentPage - 1)}
                disabled={currentPage === 1}
                className="p-1 sm:p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronLeftIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
              
              {[...Array(totalPages)].map((_, index) => {
                const page = index + 1;
                if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                  return (
                    <button
                      key={page}
                      onClick={() => handlePageChange(page)}
                      className={`px-1.5 sm:px-2 py-0.5 sm:py-1 text-[10px] sm:text-xs border rounded-lg ${
                        currentPage === page
                          ? 'bg-blue-600 text-white border-blue-600'
                          : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700'
                      }`}
                    >
                      {page}
                    </button>
                  );
                } else if (page === currentPage - 2 || page === currentPage + 2) {
                  return <span key={page} className="px-0.5 sm:px-1 text-[10px] sm:text-xs">...</span>;
                }
                return null;
              })}
              
              <button
                onClick={() => handlePageChange(currentPage + 1)}
                disabled={currentPage === totalPages}
                className="p-1 sm:p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                <ChevronRightIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Customer Details Modal */}
      {showDetailsModal && selectedCustomer && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-semibold text-white">{selectedCustomer.name}</h3>
              <button onClick={() => setShowDetailsModal(false)} className="text-white hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              {/* Previous Balance Info */}
              {(parseFloat(selectedCustomer.previous_balance || 0) > 0 || parseFloat(selectedCustomer.previous_balance_remaining || 0) > 0) && (
                <div className="mb-4 p-3 rounded-lg bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-700">
                  <div className="text-xs text-gray-800 dark:text-gray-200">
                    <span className="font-semibold">{t('customers.previousBalance') || 'Previous Balance'}: </span>
                    <span>AFN {(parseFloat(selectedCustomer.previous_balance || 0)).toFixed(2)}</span>
                    {typeof selectedCustomer.previous_balance_remaining !== 'undefined' && (
                      <>
                        <span className="mx-1">|</span>
                        <span className="font-semibold">{t('customers.previousBalanceRemaining') || 'Remaining'}: </span>
                        <span className={parseFloat(selectedCustomer.previous_balance_remaining || 0) > 0 ? 'text-red-600 font-semibold' : 'text-green-600 font-semibold'}>
                          AFN {(parseFloat(selectedCustomer.previous_balance_remaining || 0)).toFixed(2)}
                        </span>
                      </>
                    )}
                  </div>
                  <p className="text-xs text-purple-700 dark:text-purple-300 mt-2">
                    💡 {t('customers.viewLedgerForPayment')}
                  </p>
                </div>
              )}

              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {(selectedCustomer.manual_serial_no || '').trim() !== '' && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('customers.manualSerialNo')}</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedCustomer.manual_serial_no}</p>
                  </div>
                )}
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('customers.phone')}</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">
                    {selectedCustomer.phone}
                    {selectedCustomer.phone_secondary ? ` / ${selectedCustomer.phone_secondary}` : ''}
                  </p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('customers.email')}</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedCustomer.email || '-'}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('customers.date')}</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedCustomer.registration_date)}</p>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('customers.address')}</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedCustomer.address}</p>
                </div>
                {selectedCustomer.notes && (
                  <div className="md:col-span-2">
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">{t('common.notes')}</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedCustomer.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate(`/customers/${selectedCustomer.id}/edit`);
                  }}
                  className="flex-1 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 text-sm"
                >
                  {t('common.edit')}
                </button>
                <button
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate(`/customers/${selectedCustomer.id}/ledger`);
                  }}
                  className="flex-1 bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700 text-sm"
                >
                  {t('customers.ledgerLabel')}
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

export default CustomersList;
