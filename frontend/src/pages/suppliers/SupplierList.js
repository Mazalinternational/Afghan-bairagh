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
  BuildingStorefrontIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';

const SupplierList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [suppliers, setSuppliers] = useState([]);
  const [allSuppliers, setAllSuppliers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);

  useEffect(() => {
    fetchSuppliers();
  }, []);

  useEffect(() => {
    paginateSuppliers();
  }, [allSuppliers, currentPage, itemsPerPage, searchQuery]);

  const fetchSuppliers = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/suppliers/');
      setAllSuppliers(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
      addToast(t('suppliers.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const paginateSuppliers = () => {
    let filteredSuppliers = Array.isArray(allSuppliers) ? allSuppliers : [];
    
    if (searchQuery.trim()) {
      filteredSuppliers = filteredSuppliers.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone_secondary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedSuppliers = filteredSuppliers.slice(startIndex, endIndex);
    
    setSuppliers(paginatedSuppliers);
  };

  const totalItems = (() => {
    let filtered = Array.isArray(allSuppliers) ? allSuppliers : [];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(supplier => 
        supplier.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.phone_secondary?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        supplier.email?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }
    
    return filtered.length;
  })();

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

  const handleDelete = (id, name) => {
    setDeleteModal({ id, name });
  };

  const confirmDelete = async () => {
    const { id, name } = deleteModal;
    try {
      await api.delete(`/api/suppliers/${id}/`);
      setAllSuppliers(allSuppliers.filter(s => s.id !== id));
      addToast(`${name} ${t('customers.deletedSuccess')}`, 'success');
    } catch (err) {
      console.error('Error deleting supplier:', err);
      addToast(t('suppliers.failedToDelete'), 'error');
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
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 space-y-2 p-2 sm:p-3">
        {deleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl max-w-sm w-full">
              <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('modals.confirmDelete')}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                {t('modals.deleteMessage')} <strong className="text-gray-900 dark:text-gray-100">{deleteModal.name}</strong>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-1 px-2.5 text-xs rounded hover:bg-red-700 transition-colors"
                >
                  {t('modals.yesDelete')}
                </button>
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-1 px-2.5 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        <PageHeader
          title={t('suppliers.title')}
          subtitle={t('suppliers.createNew')}
          icon={BuildingStorefrontIcon}
          actions={
            <button
              onClick={() => navigate('/suppliers/create')}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('suppliers.addSupplier')}
            </button>
          }
        />

        <div className="px-2 sm:px-3 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2">
            <div className="relative flex-1">
              <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-2 top-2 text-gray-400 dark:text-gray-500" />
              <input
                type="text"
                placeholder={t('suppliers.searchPlaceholder')}
                onChange={handleSearchChange}
                className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              />
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{t('customers.show')}:</label>
              <select
                value={itemsPerPage}
                onChange={handleItemsPerPageChange}
                className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="text-[10px] text-gray-700 dark:text-gray-300">{t('customers.perPage')}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-t border-gray-200 dark:border-gray-700">
        {suppliers.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('suppliers.noSuppliersFound')}
          </div>
        ) : (
          <>
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('suppliers.name')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('suppliers.contact')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('suppliers.phone')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('suppliers.email')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('dashboard.balance')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {suppliers.map((supplier) => (
                    <tr key={supplier.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-gray-100">
                        {supplier.name}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {supplier.contact_person || '-'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {supplier.phone || '-'}{supplier.phone_secondary ? ` / ${supplier.phone_secondary}` : ''}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {supplier.email || '-'}
                      </td>
                      <td className={`px-2 py-2 whitespace-nowrap text-[11px] font-semibold ${
                        parseFloat(supplier.calculated_balance || supplier.balance || 0) > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        AFN {(parseFloat(supplier.calculated_balance || supplier.balance || 0)).toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => navigate(`/suppliers/${supplier.id}/ledger`)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                            title="View Ledger"
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                            title="Edit"
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(supplier.id, supplier.name)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                            title="Delete"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>

            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {suppliers.map((supplier) => (
                <div key={supplier.id} className="p-2 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">{supplier.name}</h3>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{supplier.contact_person || 'No contact'}</p>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => navigate(`/suppliers/${supplier.id}/ledger`)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded transition-colors"
                        title="View Ledger"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/suppliers/${supplier.id}/edit`)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(supplier.id, supplier.name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Phone</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">
                        {supplier.phone || '-'}{supplier.phone_secondary ? ` / ${supplier.phone_secondary}` : ''}
                      </p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Email</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100 truncate">{supplier.email || '-'}</p>
                    </div>
                    <div className="col-span-2">
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Balance</p>
                      <p className={`font-medium text-[11px] ${
                        parseFloat(supplier.calculated_balance || supplier.balance || 0) > 0 
                          ? 'text-red-600 dark:text-red-400' 
                          : 'text-gray-600 dark:text-gray-400'
                      }`}>
                        AFN {(parseFloat(supplier.calculated_balance || supplier.balance || 0)).toLocaleString('en-US', { 
                          minimumFractionDigits: 2, 
                          maximumFractionDigits: 2 
                        })}
                      </p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </>
        )}
        </div>

        {totalPages > 1 && (
          <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="text-[10px] text-gray-700 dark:text-gray-300">
                Showing {startItem} to {endItem} of {totalItems} results
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                </button>
                
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        onClick={() => handlePageChange(page)}
                        className={`px-2 py-1 border rounded-lg transition-colors text-[11px] ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-1.5 text-gray-500 dark:text-gray-400 text-[10px]">...</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default SupplierList;
