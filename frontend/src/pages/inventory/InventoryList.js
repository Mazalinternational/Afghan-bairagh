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
  ExclamationTriangleIcon,
  CubeIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';

const InventoryList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [items, setItems] = useState([]);
  const [allItems, setAllItems] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterType, setFilterType] = useState('');

  useEffect(() => {
    fetchItems();
  }, []);

  useEffect(() => {
    paginateItems();
  }, [allItems, currentPage, itemsPerPage, searchQuery, filterType]);

  const fetchItems = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/inventory/items/');
      setAllItems(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching items:', err);
      addToast(t('inventory.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const paginateItems = () => {
    let filteredItems = Array.isArray(allItems) ? allItems : [];
    
    if (searchQuery.trim()) {
      filteredItems = filteredItems.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType) {
      filteredItems = filteredItems.filter(item => item.item_type === filterType);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedItems = filteredItems.slice(startIndex, endIndex);
    
    setItems(paginatedItems);
  };

  const totalItems = (() => {
    let filtered = Array.isArray(allItems) ? allItems : [];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(item => 
        item.name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        item.sku?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterType) {
      filtered = filtered.filter(item => item.item_type === filterType);
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
      await api.delete(`/api/inventory/items/${id}/`);
      setAllItems(allItems.filter(i => i.id !== id));
      addToast(`${name} ${t('common.deletedSuccess')}`, 'success');
    } catch (err) {
      console.error('Error deleting item:', err);
      const errorMessage = err.response?.data?.error || err.response?.data?.detail || 'Failed to delete item';
      addToast(errorMessage || t('inventory.failedToDelete'), 'error');
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

  const getStockStatus = (item) => {
    if (item.is_low_stock) {
      return { color: 'bg-red-100 text-red-800', label: t('inventory.lowStock') };
    }
    return { color: 'bg-green-100 text-green-800', label: t('inventory.inStock') };
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
        title={t('inventory.title')}
        subtitle="Add Item — New inventory record"
        icon={CubeIcon}
        actions={
          <button
            onClick={() => navigate('/inventory/create')}
            className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <PlusIcon className="h-3.5 w-3.5" />
            {t('inventory.addItem')}
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
              placeholder={t('inventory.searchPlaceholder')}
              onChange={handleSearchChange}
              className="w-full pl-8 sm:pl-9 pr-2 sm:pr-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <select
            value={filterType}
            onChange={(e) => {
              setFilterType(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          >
            <option value="">{t('inventory.allTypes')}</option>
            <option value="raw_material">{t('inventory.rawMaterial')}</option>
            <option value="finished_product">{t('inventory.finishedProduct')}</option>
          </select>
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

      {/* Items Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        {items.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('inventory.noItemsFound')}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.name')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.sku')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.type')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.stock')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.minStock')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.price')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.status')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('inventory.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {items.map((item) => {
                    const status = getStockStatus(item);
                    return (
                      <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-gray-100">
                          {item.name}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                          {item.sku}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                          {item.item_type === 'raw_material' ? t('inventory.rawMaterial') : t('inventory.finishedProduct')}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-gray-100">
                          {item.current_stock}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                          {item.minimum_stock}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                          AFN {item.unit_price}
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap">
                          <span className={`px-2 py-0.5 text-[10px] rounded-full flex items-center gap-1 w-fit ${status.color}`}>
                            {item.is_low_stock && <ExclamationTriangleIcon className="h-3 w-3" />}
                            {status.label}
                          </span>
                        </td>
                        <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium">
                          <div className="flex space-x-1.5">
                            <button
                              onClick={() => navigate(`/inventory/${item.id}`)}
                              className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                              title={t('common.view')}
                            >
                              <EyeIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => navigate(`/inventory/${item.id}/edit`)}
                              className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                              title={t('common.edit')}
                            >
                              <PencilIcon className="h-3.5 w-3.5" />
                            </button>
                            <button
                              onClick={() => handleDelete(item.id, item.name)}
                              className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                              title={t('common.delete')}
                            >
                              <TrashIcon className="h-3.5 w-3.5" />
                            </button>
                          </div>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {items.map((item) => {
                const status = getStockStatus(item);
                return (
                  <div key={item.id} className="p-2 space-y-2">
                    <div className="flex justify-between items-start">
                      <div>
                        <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs">{item.name}</h3>
                        <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">SKU: {item.sku}</p>
                      </div>
                      <div className="flex space-x-1">
                        <button
                          onClick={() => navigate(`/inventory/${item.id}`)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => navigate(`/inventory/${item.id}/edit`)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          onClick={() => handleDelete(item.id, item.name)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </div>
                    <div className="grid grid-cols-2 gap-2 text-[11px]">
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('inventory.type')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.item_type === 'raw_material' ? 'Raw Material' : 'Finished Product'}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('inventory.stock')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.current_stock}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('inventory.minStock')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">{item.minimum_stock}</p>
                      </div>
                      <div>
                        <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('inventory.price')}</p>
                        <p className="font-medium text-gray-900 dark:text-gray-100">AFN {item.unit_price}</p>
                      </div>
                    </div>
                    <span className={`px-2 py-0.5 text-[10px] rounded-full flex items-center gap-1 w-fit ${status.color}`}>
                      {item.is_low_stock && <ExclamationTriangleIcon className="h-3 w-3" />}
                      {status.label}
                    </span>
                  </div>
                );
              })}
            </div>
          </>
        )}
      </div>

      {/* Pagination */}
      {totalPages > 1 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 sm:p-3">
          <div className="flex flex-col sm:flex-row justify-between items-center gap-2 sm:gap-3">
            <div className="text-[10px] sm:text-xs text-gray-700 dark:text-gray-300">
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

export default InventoryList;
