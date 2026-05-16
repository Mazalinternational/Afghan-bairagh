import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  ShoppingCartIcon,
  EyeIcon,
  PlusIcon,
  ChevronDownIcon,
  ChevronRightIcon,
  ShoppingBagIcon,
  MagnifyingGlassIcon,
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';

const SalesList = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const { addToast } = useToast();
  
  const [sales, setSales] = useState([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState('all'); // all, confirmed, unpaid
  const [expandedRows, setExpandedRows] = useState(new Set());
  const [searchQuery, setSearchQuery] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchSales();
  }, [filter]);

  useEffect(() => {
    setCurrentPage(1);
  }, [filter, searchQuery]);

  const fetchSales = async () => {
    try {
      setLoading(true);
      let url = '/api/sales/';
      
      if (filter === 'confirmed') {
        url = '/api/sales/confirmed/';
      } else if (filter === 'unpaid') {
        url = '/api/sales/unpaid/';
      }
      
      const response = await api.get(url);
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.results ?? []);
      setSales(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching sales:', error);
      addToast(t('sales.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const getStatusBadge = (status) => {
    const statusConfig = {
      Draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', label: t('sales.draft') },
      Confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: t('sales.confirmed') },
      Cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: t('sales.cancelled') }
    };
    
    const config = statusConfig[status] || statusConfig.Draft;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const getPaymentStatusBadge = (status) => {
    const statusConfig = {
      Unpaid: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: t('sales.unpaid') },
      Partial: { bg: 'bg-yellow-100 dark:bg-yellow-900/30', text: 'text-yellow-800 dark:text-yellow-300', label: t('sales.partial') },
      Paid: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: t('sales.paid') }
    };
    
    const config = statusConfig[status] || statusConfig.Unpaid;
    return (
      <span className={`px-2 py-1 text-xs font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  const toggleRow = (saleId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(saleId)) {
        newSet.delete(saleId);
      } else {
        newSet.add(saleId);
      }
      return newSet;
    });
  };

  const filteredSales = sales.filter((sale) => {
    const q = searchQuery.trim().toLowerCase();
    if (!q) return true;
    const name = String(sale.customer_name || '').toLowerCase();
    const idStr = String(sale.id || '');
    return name.includes(q) || idStr.includes(q);
  });

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
    setCurrentPage((p) => Math.min(p, tp));
  }, [filteredSales.length, itemsPerPage]);

  const totalPages = Math.max(1, Math.ceil(filteredSales.length / itemsPerPage));
  const startIndex = (currentPage - 1) * itemsPerPage;
  const paginatedSales = filteredSales.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-2 p-2 sm:p-3">
        {/* Header */}
        <PageHeader
          title={t('sales.title')}
          subtitle={t('sales.subtitle')}
          icon={ShoppingCartIcon}
          actions={
            <>
              <button
                onClick={() => navigate('/sales/create')}
                className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {t('sales.newSale')}
              </button>
              <button
                onClick={() => navigate('/sales/direct')}
                className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              >
                <ShoppingBagIcon className="h-3.5 w-3.5" />
                {t('sales.createDirectSaleTitle')}
              </button>
            </>
          }
        />

        {/* Filters + search */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 space-y-2">
          <div className="flex flex-col sm:flex-row gap-2 sm:items-center sm:justify-between">
            <div className="flex gap-2 flex-wrap">
              <button
                type="button"
                onClick={() => setFilter('all')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'all'
                    ? 'bg-blue-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('common.all')}
              </button>
              <button
                type="button"
                onClick={() => setFilter('confirmed')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'confirmed'
                    ? 'bg-green-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('sales.confirmed')}
              </button>
              <button
                type="button"
                onClick={() => setFilter('unpaid')}
                className={`px-3 py-1.5 rounded-lg text-xs font-medium transition-colors ${
                  filter === 'unpaid'
                    ? 'bg-red-600 text-white'
                    : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 hover:bg-gray-200 dark:hover:bg-gray-600'
                }`}
              >
                {t('sales.unpaid')}
              </button>
            </div>
            <div className="relative flex-1 min-w-[180px] max-w-md">
              <MagnifyingGlassIcon className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-gray-400 pointer-events-none" />
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder={t('recordLookup.placeholder')}
                className="w-full pl-9 pr-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>
        </div>

        {/* Sales Table - same style as other list pages */}
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full text-[10px] sm:text-xs min-w-[600px]">
              <thead className="bg-blue-600">
                <tr>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('sales.saleId')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('sales.customerName')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('sales.saleDate')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('common.items')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('sales.netAmount')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('sales.status')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('sales.paymentStatus')}
                  </th>
                  <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left font-medium uppercase tracking-wider text-[10px] sm:text-xs text-white">
                    {t('common.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-300 bg-white dark:bg-gray-800">
                {loading ? (
                  <tr>
                    <td colSpan="8" className="px-2 sm:px-3 py-6 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      {t('common.loading')}
                    </td>
                  </tr>
                ) : filteredSales.length === 0 ? (
                  <tr>
                    <td colSpan="8" className="px-2 sm:px-3 py-6 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                      {sales.length === 0 ? t('common.noRecordsFound') : t('common.noData')}
                    </td>
                  </tr>
                ) : (
                  paginatedSales.map((sale) => (
                    <React.Fragment key={sale.id}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
                          #{sale.id}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-900 dark:text-white">
                          {sale.customer_name}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {sale.sale_date ? formatDate(sale.sale_date) : t('orders.billDateNotSet')}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {(sale.items && sale.items.length > 0) ? (
                            <button onClick={() => toggleRow(sale.id)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                              {expandedRows.has(sale.id) ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                              {sale.items.length} {sale.items.length === 1 ? 'item' : 'items'}
                            </button>
                          ) : (sale.item_count || 0)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">
                          AFN {parseFloat(sale.net_amount || 0).toFixed(2)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                          {getStatusBadge(sale.status)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap">
                          {getPaymentStatusBadge(sale.payment_status)}
                        </td>
                        <td className="px-2 sm:px-3 py-1.5 sm:py-2 whitespace-nowrap text-[10px] sm:text-xs">
                          <button
                            onClick={() => navigate(`/sales/${sale.id}`)}
                            className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300 font-medium flex items-center gap-1"
                          >
                            <EyeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4" />
                            {t('common.view')}
                          </button>
                        </td>
                      </tr>
                      {expandedRows.has(sale.id) && sale.items && sale.items.length > 0 && (
                        <tr className="bg-gray-50 dark:bg-gray-700/30">
                          <td colSpan="8" className="px-4 py-2">
                            <div className="text-[10px] sm:text-xs">
                              <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Items:</div>
                              <div className="space-y-1">
                                {sale.items.map((item, idx) => (
                                  <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-600 last:border-0">
                                    <span className="text-gray-900 dark:text-white">{item.item_name || item.item?.name || 'N/A'}</span>
                                    <span className="text-gray-600 dark:text-gray-400">Qty: {item.quantity} × AFN {parseFloat(item.price_per_unit || 0).toFixed(2)} = AFN {parseFloat(item.total || 0).toFixed(2)}</span>
                                  </div>
                                ))}
                              </div>
                            </div>
                          </td>
                        </tr>
                      )}
                    </React.Fragment>
                  ))
                )}
              </tbody>
            </table>
          </div>
          {filteredSales.length > 0 ? (
            <div className="px-2 sm:px-3 py-2 border-t border-gray-200 dark:border-gray-700 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">
              <span>
                {t('pagination.showing')} {startIndex + 1}–{Math.min(startIndex + itemsPerPage, filteredSales.length)}{' '}
                {t('pagination.of')} {filteredSales.length}
              </span>
              <div className="flex items-center gap-1 flex-wrap">
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.max(1, p - 1))}
                  disabled={currentPage <= 1}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-40"
                >
                  {t('pagination.previous')}
                </button>
                <span className="px-2">
                  {t('pagination.page')} {currentPage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))}
                  disabled={currentPage >= totalPages}
                  className="px-2 py-1 rounded bg-gray-200 dark:bg-gray-700 disabled:opacity-40"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          ) : null}
        </div>
        </div>
      </div>
    </div>
  );
};

export default SalesList;
