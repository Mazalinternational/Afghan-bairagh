import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ShoppingBagIcon,
  EyeIcon,
  CheckCircleIcon,
  XCircleIcon,
  MagnifyingGlassIcon,
  PencilIcon,
  TrashIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import { formatDate } from '../../i18n/dateUtils';

const DirectSalesList = () => {
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [directSales, setDirectSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchDirectSales();
  }, []);

  const fetchDirectSales = async () => {
    try {
      setLoading(true);
      const response = await api.get('/api/direct-sales/');
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.results ?? []);
      setDirectSales(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching direct sales:', error);
      addToast(t('sales.failedToLoadDirectSales'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = async () => {
    if (!showDeleteConfirm) return;

    try {
      await api.delete(`/api/direct-sales/${showDeleteConfirm}/`);
      addToast(t('directSales.deletedSuccess'), 'success');
      setShowDeleteConfirm(null);
      fetchDirectSales();
    } catch (error) {
      console.error('Error deleting direct sale:', error);
      addToast(t('directSales.deleteFailed'), 'error');
    }
  };

  const getStatusBadge = (status) => {
    const badges = {
      Draft: 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300',
      Confirmed: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300',
      Cancelled: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300'
    };
    return badges[status] || badges.Draft;
  };

  const getPaymentStatusBadge = (status) => {
    const badges = {
      Unpaid: 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-300',
      Partial: 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-300',
      Paid: 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-300'
    };
    return badges[status] || badges.Unpaid;
  };

  const filteredSales = directSales.filter(sale => {
    const matchesFilter = filter === 'all' || (filter === 'unpaid' && sale.payment_status !== 'Paid');
    const matchesSearch = !searchQuery || 
      sale.customer_name_display?.toLowerCase().includes(searchQuery.toLowerCase()) ||
      (sale.manual_serial_no || '').toLowerCase().includes(searchQuery.toLowerCase()) ||
      sale.id.toString().includes(searchQuery);
    return matchesFilter && matchesSearch;
  });

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
    setCurrentPage((p) => Math.min(p, tp));
  }, [filteredSales.length]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 relative overflow-hidden">
        <div className="absolute -top-10 -right-8 w-32 h-32 bg-blue-300/30 dark:bg-blue-500/20 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -left-6 w-28 h-28 bg-indigo-300/30 dark:bg-indigo-500/20 rounded-full blur-xl" />
        <div className="space-y-3 p-3">
          {/* Header */}
          <PageHeader
            title={t('sales.directSalesTitle')}
            subtitle={t('sales.directSalesSubtitle')}
            icon={ShoppingBagIcon}
            actions={
              <button
                onClick={() => navigate('/sales/direct/create')}
                className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {t('sales.newDirectSale')}
              </button>
            }
          />

          {/* Filters and Search */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
            <div className="flex flex-col md:flex-row gap-2">
              <div className="flex gap-2 flex-wrap">
                <button
                  onClick={() => setFilter('all')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter === 'all'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('common.all')}
                </button>
                <button
                  onClick={() => setFilter('unpaid')}
                  className={`px-3 py-1 rounded-lg text-xs font-medium transition-colors ${
                    filter === 'unpaid'
                      ? 'bg-blue-600 text-white'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                  }`}
                >
                  {t('sales.unpaid')}
                </button>
              </div>
              <div className="flex-1 relative">
                <MagnifyingGlassIcon className="absolute left-2 top-1.5 h-4 w-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search by customer name or ID..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="w-full pl-8 pr-3 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>
          </div>

          {/* Sales List */}
          {loading ? (
            <div className="text-center py-8">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-purple-600 mx-auto"></div>
              <p className="mt-2 text-sm text-gray-600 dark:text-gray-400">{t('common.loading')}</p>
            </div>
          ) : filteredSales.length === 0 ? (
            <div className="text-center py-8">
              <ShoppingBagIcon className="h-12 w-12 text-gray-400 mx-auto mb-2" />
              <p className="text-gray-600 dark:text-gray-400">{t('sales.noDirectSalesFound')}</p>
              <button
                onClick={() => navigate('/sales/direct/create')}
                className="mt-4 bg-purple-600 hover:bg-purple-700 text-white px-4 py-2 rounded-lg text-sm font-medium"
              >
                {t('sales.createFirstDirectSale')}
              </button>
            </div>
          ) : (
            <div className="space-y-2">
              {paginatedSales.map((sale) => (
                <div key={sale.id} className="bg-white dark:bg-gray-800 rounded-lg shadow p-2 hover:shadow-md transition-shadow border border-gray-200 dark:border-gray-700">
                  <div className="flex items-start justify-between">
                    <div className="flex-1">
                      <div className="flex items-center gap-2 mb-1 flex-wrap">
                        <h3 className="text-xs font-semibold text-gray-900 dark:text-white">#{sale.id} - {sale.customer_name_display}</h3>
                        {(sale.manual_serial_no || '').trim() !== '' && (
                          <span className="text-[10px] text-gray-500 dark:text-gray-400">
                            {t('customers.manualSerialNo')}: <span className="font-medium">{sale.manual_serial_no}</span>
                          </span>
                        )}
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getPaymentStatusBadge(sale.payment_status)}`}>
                          {sale.payment_status === 'Paid' ? t('sales.paid') : sale.payment_status === 'Partial' ? t('sales.partial') : t('sales.unpaid')}
                        </span>
                      </div>
                      <div className="grid grid-cols-2 md:grid-cols-5 gap-1 text-[10px] text-gray-600 dark:text-gray-400">
                        <div><span className="font-medium">{t('common.date')}:</span><p>{formatDate(sale.sale_date)}</p></div>
                        <div><span className="font-medium">{t('common.items')}:</span><p>{sale.item_count}</p></div>
                        <div><span className="font-medium">{t('sales.totalAmount')}:</span><p className="text-blue-600 dark:text-blue-400 font-semibold">AFN {parseFloat(sale.net_amount).toFixed(2)}</p></div>
                        <div><span className="font-medium">{t('common.cost')}:</span><p className="text-orange-600 dark:text-orange-400">AFN {parseFloat(sale.cost_amount).toFixed(2)}</p></div>
                        <div><span className="font-medium">{t('sales.profit')}:</span><p className="text-green-600 dark:text-green-400 font-semibold">AFN {parseFloat(sale.profit).toFixed(2)}</p></div>
                      </div>
                    </div>
                    <div className="flex gap-1">
                      <button onClick={() => navigate(`/sales/direct/${sale.id}`)} className="p-1 bg-blue-100 dark:bg-blue-900 text-blue-600 dark:text-blue-300 rounded-lg hover:bg-blue-200 dark:hover:bg-blue-800 transition-colors" title="View Details"><EyeIcon className="h-3.5 w-3.5" /></button>
                      <button onClick={() => navigate(`/sales/direct/${sale.id}/edit`)} className="p-1 bg-green-100 dark:bg-green-900 text-green-600 dark:text-green-300 rounded-lg hover:bg-green-200 dark:hover:bg-green-800 transition-colors" title="Edit & Add Items"><PencilIcon className="h-3.5 w-3.5" /></button>
                      {sale.status === 'Draft' && (
                        <button onClick={() => setShowDeleteConfirm(sale.id)} className="p-1 bg-red-100 dark:bg-red-900 text-red-600 dark:text-red-300 rounded-lg hover:bg-red-200 dark:hover:bg-red-800 transition-colors" title="Delete"><TrashIcon className="h-3.5 w-3.5" /></button>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {filteredSales.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2">
              <div className="flex items-center justify-between text-xs">
                <div className="text-gray-600 dark:text-gray-400">
                  {t('pagination.showing')} {startIndex + 1}-{Math.min(startIndex + itemsPerPage, filteredSales.length)} {t('pagination.of')} {filteredSales.length}
                </div>
                <div className="flex gap-1">
                  <button onClick={() => setCurrentPage(p => Math.max(1, p - 1))} disabled={currentPage === 1} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">
                    {t('common.prev')}
                  </button>
                  {[...Array(totalPages)].map((_, i) => (
                    <button key={i} onClick={() => setCurrentPage(i + 1)} className={`px-2 py-1 rounded ${currentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}>{i + 1}</button>
                  ))}
                  <button onClick={() => setCurrentPage(p => Math.min(totalPages, p + 1))} disabled={currentPage === totalPages} className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50">
                    {t('common.next')}
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">Delete Direct Sale</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              Are you sure you want to delete this direct sale? This action cannot be undone.
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => setShowDeleteConfirm(null)}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handleDelete}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                Delete
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectSalesList;
