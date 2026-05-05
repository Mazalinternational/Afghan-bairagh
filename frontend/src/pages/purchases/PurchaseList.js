import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  PrinterIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  ArrowLeftIcon,
  XMarkIcon,
  ShoppingBagIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';

const PurchaseList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const [purchases, setPurchases] = useState([]);
  const [allPurchases, setAllPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [detailsModal, setDetailsModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [filterStatus, setFilterStatus] = useState('');

  useEffect(() => {
    fetchPurchases();
  }, []);

  useEffect(() => {
    paginatePurchases();
  }, [allPurchases, currentPage, itemsPerPage, searchQuery, filterStatus]);

  const fetchPurchases = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/purchases/');
      setAllPurchases(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching purchases:', err);
      addToast(t('purchases.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const paginatePurchases = () => {
    let filteredPurchases = Array.isArray(allPurchases) ? allPurchases : [];
    
    if (searchQuery.trim()) {
      filteredPurchases = filteredPurchases.filter(purchase => 
        purchase.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus) {
      filteredPurchases = filteredPurchases.filter(purchase => purchase.payment_status === filterStatus);
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedPurchases = filteredPurchases.slice(startIndex, endIndex);
    
    setPurchases(paginatedPurchases);
  };

  const totalItems = (() => {
    let filtered = Array.isArray(allPurchases) ? allPurchases : [];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(purchase => 
        purchase.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        purchase.supplier_name?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (filterStatus) {
      filtered = filtered.filter(purchase => purchase.payment_status === filterStatus);
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

  const handleDelete = (id, itemName) => {
    setDeleteModal({ id, itemName });
  };

  const confirmDelete = async () => {
    const { id, itemName } = deleteModal;
    try {
      await api.delete(`/api/purchases/${id}/`);
      setAllPurchases(allPurchases.filter(p => p.id !== id));
      addToast(`${itemName} ${t('common.deletedSuccess')}`, 'success');
    } catch (err) {
      console.error('Error deleting purchase:', err);
      addToast(t('purchases.failedToDelete'), 'error');
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

  const getStatusColor = (status) => {
    const colors = {
      'paid': 'bg-green-100 dark:bg-green-900 text-green-800 dark:text-green-200',
      'partial': 'bg-yellow-100 dark:bg-yellow-900 text-yellow-800 dark:text-yellow-200',
      'due': 'bg-red-100 dark:bg-red-900 text-red-800 dark:text-red-200'
    };
    return colors[status] || 'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-200';
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
      {/* Details Modal */}
      {detailsModal && (
        <div className="fixed inset-0 bg-black/60 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-2xl max-w-md w-full">
            <div className="bg-blue-600 p-2 rounded-t-lg flex justify-between items-center">
              <div>
                <h1 className="text-sm font-bold text-white">{detailsModal.item_name}</h1>
                <p className="text-[9px] text-blue-100">Purchase Details</p>
              </div>
              <button 
                onClick={() => setDetailsModal(null)} 
                className="p-0.5 bg-white/20 hover:bg-white/30 rounded transition-all text-white"
                title="Close"
              >
                <XMarkIcon className="h-3.5 w-3.5" />
              </button>
            </div>
            <div className="p-3 space-y-2">
              <div className="grid grid-cols-2 gap-1.5 text-[11px]">
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block">Bill Number</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{detailsModal.bill_number || '-'}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block">Supplier</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{detailsModal.supplier_name}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block">Quantity</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">{detailsModal.quantity}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block">Cost</span>
                  <span className="font-semibold text-gray-900 dark:text-gray-100">AFN {detailsModal.cost}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block">Paid</span>
                  <span className="font-semibold text-green-600 dark:text-green-400">AFN {detailsModal.total_paid}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block">Remaining</span>
                  <span className="font-semibold text-red-600 dark:text-red-400">AFN {detailsModal.remaining_amount}</span>
                </div>
                <div className="bg-gray-50 dark:bg-gray-700/50 p-1.5 rounded col-span-2">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block mb-0.5">Status</span>
                  <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] font-medium ${getStatusColor(detailsModal.payment_status)}`}>
                    {detailsModal.payment_status.charAt(0).toUpperCase() + detailsModal.payment_status.slice(1)}
                  </span>
                </div>
              </div>
              {detailsModal.description && (
                <div className="bg-gray-50 dark:bg-gray-700/50 p-2 rounded">
                  <span className="text-gray-500 dark:text-gray-400 text-[9px] block mb-0.5">Description</span>
                  <p className="text-[11px] text-gray-900 dark:text-gray-100">{detailsModal.description}</p>
                </div>
              )}
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deleteModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('modals.confirmDelete')}</h3>
            <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
              {t('modals.deleteMessage')} <strong className="text-gray-900 dark:text-gray-100">{deleteModal.itemName}</strong>?
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

      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        {/* Header */}
        <PageHeader
          title={t('purchases.title')}
          subtitle="Manage all purchases and payments"
          icon={ShoppingBagIcon}
          actions={
            <button
              onClick={() => navigate('/purchases/create')}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('purchases.addPurchase')}
            </button>
          }
        />

        {/* Content */}
        <div className="p-3 space-y-3">
      <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow dark:shadow-gray-900/50 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-2 top-2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={t('purchases.searchPlaceholder')}
              onChange={handleSearchChange}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          <select
            value={filterStatus}
            onChange={(e) => {
              setFilterStatus(e.target.value);
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          >
            <option value="">{t('purchases.allStatus')}</option>
            <option value="paid">{t('purchases.paid')}</option>
            <option value="partial">{t('purchases.partial')}</option>
            <option value="due">{t('purchases.due')}</option>
          </select>
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

      {/* Purchases Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden border border-gray-200 dark:border-gray-700">
        {purchases.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('purchases.noPurchasesFound')}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.itemName')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">Bill #</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.supplier')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.quantity')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.cost')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.paidAmount')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.remaining')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.date')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('purchases.paymentStatus')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {purchases.map((purchase) => (
                    <tr key={purchase.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-gray-100">
                        {purchase.item_name}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {purchase.bill_number || '-'}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {purchase.supplier_name}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {purchase.quantity}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        AFN {purchase.cost}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        AFN {purchase.total_paid}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        AFN {purchase.remaining_amount}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                        {formatDate(purchase.purchase_date)}
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap">
                        <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(purchase.payment_status)}`}>
                          {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
                        </span>
                      </td>
                      <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium">
                        <div className="flex items-center space-x-1.5">
                          <button
                            onClick={() => setDetailsModal(purchase)}
                            className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                            title={t('common.view')}
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/purchases/${purchase.id}/edit`)}
                            className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/purchases/${purchase.id}`)}
                            className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 transition-colors"
                            title={t('purchases.printBill')}
                          >
                            <PrinterIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => handleDelete(purchase.id, purchase.item_name)}
                            className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                            title={t('common.delete')}
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

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {purchases.map((purchase) => (
                <div key={purchase.id} className="p-2 space-y-2">
                  <div className="flex justify-between items-start gap-2">
                    <div className="flex-1 min-w-0">
                      <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">{purchase.item_name}</h3>
                      <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{purchase.supplier_name}</p>
                    </div>
                    <div className="flex items-center space-x-1 flex-shrink-0">
                      <button
                        onClick={() => setDetailsModal(purchase)}
                        className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 p-1 rounded transition-colors"
                        title="View"
                      >
                        <EyeIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/purchases/${purchase.id}/edit`)}
                        className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 p-1 rounded transition-colors"
                        title="Edit"
                      >
                        <PencilIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => navigate(`/purchases/${purchase.id}`)}
                        className="text-indigo-600 dark:text-indigo-400 hover:text-indigo-900 dark:hover:text-indigo-300 p-1 rounded transition-colors"
                        title={t('purchases.printBill')}
                      >
                        <PrinterIcon className="h-3.5 w-3.5" />
                      </button>
                      <button
                        onClick={() => handleDelete(purchase.id, purchase.item_name)}
                        className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 p-1 rounded transition-colors"
                        title="Delete"
                      >
                        <TrashIcon className="h-3.5 w-3.5" />
                      </button>
                    </div>
                  </div>
                  <div className="grid grid-cols-2 gap-2 text-[11px]">
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Quantity</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">{purchase.quantity}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Cost</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">AFN {purchase.cost}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Paid</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">AFN {purchase.total_paid}</p>
                    </div>
                    <div>
                      <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">Remaining</p>
                      <p className="font-medium text-gray-900 dark:text-gray-100">AFN {purchase.remaining_amount}</p>
                    </div>
                  </div>
                  <div className="flex justify-between items-center pt-1.5 border-t border-gray-200 dark:border-gray-700">
                    <span className="text-[10px] text-gray-600 dark:text-gray-400">{formatDate(purchase.purchase_date)}</span>
                    <span className={`px-2 py-0.5 text-[10px] font-medium rounded-full ${getStatusColor(purchase.payment_status)}`}>
                      {purchase.payment_status.charAt(0).toUpperCase() + purchase.payment_status.slice(1)}
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
        <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow dark:shadow-gray-900/50">
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
    </div>
  );
};

export default PurchaseList;

