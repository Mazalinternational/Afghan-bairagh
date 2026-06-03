import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import {
  MagnifyingGlassIcon,
  CalendarIcon,
  FunnelIcon,
  PlusIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  CheckCircleIcon,
  XCircleIcon,
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ClipboardDocumentListIcon,
  ChevronDownIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const OrdersList = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(false);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [selectedOrders, setSelectedOrders] = useState(new Set());
  
  const [filters, setFilters] = useState({
    status: '',
    customer: '',
    item: '',
    startDate: '',
    endDate: ''
  });

  const [sortConfig, setSortConfig] = useState({
    key: 'id',
    direction: 'desc'
  });

  const [allOrders, setAllOrders] = useState([]);
  const [filteredOrders, setFilteredOrders] = useState([]);
  const [toast, setToast] = useState(null);
  const [confirmModal, setConfirmModal] = useState({ isOpen: false, action: null, data: null });
  const [expandedRows, setExpandedRows] = useState(new Set());

  const showToast = (message, type = 'success') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  // Helper function to safely format currency values
  const formatCurrency = (value) => {
    if (value === null || value === undefined || value === '') return '0.00';
    const num = typeof value === 'number' ? value : parseFloat(value);
    return (isNaN(num) ? 0 : num).toFixed(2);
  };

  useEffect(() => {
    fetchOrders();
  }, []);

  useEffect(() => {
    applyFilters();
  }, [filters, allOrders, sortConfig]);

  useEffect(() => {
    const tp = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
    setCurrentPage((p) => Math.min(p, tp));
  }, [filteredOrders.length]);

  const applyFilters = () => {
    let filtered = [...allOrders];

    // Apply filters
    if (filters.status) {
      const s = filters.status.toLowerCase();
      filtered = filtered.filter(order => (order.status || '').toLowerCase() === s);
    }
    if (filters.customer) {
      filtered = filtered.filter(order => 
        (order.customer?.name || order.customer_name || '').toLowerCase().includes(filters.customer.toLowerCase())
      );
    }
    if (filters.item) {
      const q = filters.item.toLowerCase().trim();
      filtered = filtered.filter((order) => {
        const items = order.order_items || [];
        if (items.length > 0) {
          return items.some((row) => {
            const name = (
              row.item_name ||
              row.manual_item_name ||
              row.item?.name ||
              ''
            ).toLowerCase();
            return name.includes(q);
          });
        }
        const legacy = (order.item_name || order.item?.name || '').toLowerCase();
        return legacy.includes(q);
      });
    }
    if (filters.startDate) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) >= new Date(filters.startDate)
      );
    }
    if (filters.endDate) {
      filtered = filtered.filter(order => 
        new Date(order.created_at) <= new Date(filters.endDate)
      );
    }

    // Apply sorting
    filtered.sort((a, b) => {
      let aValue = a[sortConfig.key];
      let bValue = b[sortConfig.key];
      
      if (sortConfig.key === 'customer') {
        aValue = a.customer?.name || a.customer_name || '';
        bValue = b.customer?.name || b.customer_name || '';
      }
      
      if (typeof aValue === 'string') {
        aValue = aValue.toLowerCase();
        bValue = bValue.toLowerCase();
      }
      
      if (aValue < bValue) return sortConfig.direction === 'asc' ? -1 : 1;
      if (aValue > bValue) return sortConfig.direction === 'asc' ? 1 : -1;
      return 0;
    });

    setFilteredOrders(filtered);
  };

  const fetchOrders = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.customer) params.append('customer__name__icontains', filters.customer);
      if (filters.startDate) params.append('created_at__gte', filters.startDate);
      if (filters.endDate) params.append('created_at__lte', filters.endDate);
      params.append('ordering', `${sortConfig.direction === 'asc' ? '' : '-'}${sortConfig.key}`);

      const response = await api.get(`/api/orders/?${params}`);
      const ordersData = response.data.results || response.data;
      setAllOrders(ordersData);
      setOrders(ordersData);
    } catch (error) {
      console.error('Error fetching orders:', error);
      setAllOrders([]);
      setOrders([]);
    } finally {
      setLoading(false);
    }
  };

  const handleSort = (key) => {
    setSortConfig(prev => ({
      key,
      direction: prev.key === key && prev.direction === 'asc' ? 'desc' : 'asc'
    }));
  };

  const handleFilterChange = (field, value) => {
    setFilters(prev => ({ ...prev, [field]: value }));
    setCurrentPage(1);
  };

  const handleSelectOrder = (orderId) => {
    setSelectedOrders(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const handleSelectAll = () => {
    if (selectedOrders.size === paginatedOrders.length) {
      setSelectedOrders(new Set());
    } else {
      setSelectedOrders(new Set(paginatedOrders.map(o => o.id)));
    }
  };

  const handleCancelOrder = (orderId) => {
    setConfirmModal({
      isOpen: true,
      action: 'cancel',
      data: { orderId }
    });
  };

  const handleDeleteOrder = (orderId) => {
    setConfirmModal({
      isOpen: true,
      action: 'delete',
      data: { orderId }
    });
  };

  const handleCompleteOrder = (orderId) => {
    setConfirmModal({
      isOpen: true,
      action: 'complete',
      data: { orderId }
    });
  };

  const handleBulkCancel = () => {
    if (selectedOrders.size === 0) return;
    setConfirmModal({
      isOpen: true,
      action: 'bulkCancel',
      data: { count: selectedOrders.size }
    });
  };

  const handleBulkDelete = () => {
    if (selectedOrders.size === 0) return;
    setConfirmModal({
      isOpen: true,
      action: 'bulkDelete',
      data: { count: selectedOrders.size }
    });
  };

  const executeConfirmAction = async () => {
    const { action, data } = confirmModal;
    try {
      if (action === 'cancel') {
        await api.post(`/api/orders/${data.orderId}/cancel/`);
        showToast(t('orders.orderCancelled'), 'success');
        fetchOrders();
      } else if (action === 'delete') {
        await api.delete(`/api/orders/${data.orderId}/`);
        showToast('Order deleted successfully', 'success');
        fetchOrders();
      } else if (action === 'complete') {
        await api.post(`/api/orders/${data.orderId}/complete/`);
        showToast(t('orders.orderCompleted'), 'success');
        fetchOrders();
      } else if (action === 'bulkCancel') {
        await Promise.all(
          Array.from(selectedOrders).map(id => api.post(`/api/orders/${id}/cancel/`))
        );
        showToast(t('orders.ordersCancelled'), 'success');
        fetchOrders();
        setSelectedOrders(new Set());
      } else if (action === 'bulkDelete') {
        await Promise.all(
          Array.from(selectedOrders).map(id => api.delete(`/api/orders/${id}/`))
        );
        showToast('Selected orders deleted successfully', 'success');
        fetchOrders();
        setSelectedOrders(new Set());
      }
    } catch (error) {
      console.error(`Error ${action}:`, error);
      const errorMsg = error.response?.data?.error || error.response?.data?.detail || error.response?.data?.message || `Failed to ${action === 'bulkCancel' ? 'cancel orders' : action === 'bulkDelete' ? 'delete orders' : action}`;
      showToast(errorMsg, 'error');
    } finally {
      setConfirmModal({ isOpen: false, action: null, data: null });
    }
  };

  const exportToCSV = () => {
    const headers = ['Order ID', 'Customer', 'Flag Size', 'Quantity', 'Total Amount', 'Status', 'Due Amount', 'Date'];
    const rows = filteredOrders.map(order => [
      order.id,
      order.customer?.name || order.customer_name || 'N/A',
      order.flag_size ?? 'N/A',
      order.quantity ?? '',
      order.total_amount ?? order.total_estimated_amount,
      order.status,
      order.due_amount ?? 0,
      formatDate(order.created_at)
    ]);

    const csv = [headers, ...rows].map(row => row.join(',')).join('\n');
    const blob = new Blob([csv], { type: 'text/csv' });
    const url = window.URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `orders-${new Date().toISOString().split('T')[0]}.csv`;
    a.click();
  };

  const getStatusColor = (status) => {
    const colors = {
      'pending': 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300',
      'in_production': 'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300',
      'ready': 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/30 dark:text-indigo-300',
      'partially_delivered': 'bg-orange-100 text-orange-800 dark:bg-orange-900/30 dark:text-orange-300',
      'delivered': 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300',
      'cancelled': 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300',
    };
    return colors[(status || '').toLowerCase().replace('-', '_')] || 'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300';
  };

  const toggleRow = (orderId) => {
    setExpandedRows(prev => {
      const newSet = new Set(prev);
      if (newSet.has(orderId)) {
        newSet.delete(orderId);
      } else {
        newSet.add(orderId);
      }
      return newSet;
    });
  };

  const totalPages = Math.max(1, Math.ceil(filteredOrders.length / itemsPerPage));
  const paginatedOrders = filteredOrders.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        {/* Header */}
        <div className="p-3 pb-0">
          <PageHeader
            title={t('orders.title')}
            subtitle={t('orders.subtitle')}
            icon={ClipboardDocumentListIcon}
            actions={
              <button
                onClick={() => navigate('/orders/create')}
                className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {t('orders.newOrder')}
              </button>
            }
          />
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
    <div className="space-y-2 p-2 sm:p-3">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-2 sm:top-4 right-2 sm:right-4 px-3 sm:px-4 py-1.5 sm:py-2 rounded-lg text-[10px] sm:text-xs text-white z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={confirmModal.isOpen}
        onClose={() => setConfirmModal({ isOpen: false, action: null, data: null })}
        onConfirm={executeConfirmAction}
        title={
          confirmModal.action === 'cancel' ? t('orders.cancelOrder') :
          confirmModal.action === 'delete' ? 'Delete Order' :
          confirmModal.action === 'complete' ? t('orders.completeOrder') :
          confirmModal.action === 'bulkDelete' ? 'Delete Multiple Orders' :
          t('orders.cancelMultiple')
        }
        message={
          confirmModal.action === 'cancel' ? t('orders.cancelConfirm') :
          confirmModal.action === 'delete' ? 'Are you sure you want to permanently delete this order? This action cannot be undone.' :
          confirmModal.action === 'complete' ? t('orders.completeConfirm') :
          confirmModal.action === 'bulkDelete' ? `Are you sure you want to permanently delete ${confirmModal.data?.count} selected orders? This action cannot be undone.` :
          t('orders.cancelSelectedConfirm')
        }
        confirmText={
          confirmModal.action === 'complete' ? t('dashboard.completed') :
          confirmModal.action === 'delete' || confirmModal.action === 'bulkDelete' ? 'Delete' :
          t('orders.cancelOrders')
        }
        cancelText={t('orders.keep')}
        type={confirmModal.action === 'complete' ? 'info' : 'danger'}
      />

      {/* Header and Filters */}
      <div className="bg-white dark:bg-gray-800 p-2 sm:p-3 rounded-lg shadow dark:shadow-gray-900/50">
        <div className="flex items-center gap-1.5 mb-1.5">
          <FunnelIcon className="h-3.5 w-3.5 text-gray-600 dark:text-gray-400" />
          <h3 className="text-[10px] font-semibold text-gray-900 dark:text-white">{t('orders.filters')}</h3>
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-2">
          <div>
            <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">{t('orders.status')}</label>
            <select
              value={filters.status}
              onChange={(e) => handleFilterChange('status', e.target.value)}
              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
            >
              <option value="">{t('orders.allStatus')}</option>
              <option value="Pending">Pending</option>
              <option value="In_Production">In Production</option>
              <option value="Ready">Ready</option>
              <option value="Delivered">Delivered</option>
              <option value="Cancelled">Cancelled</option>
            </select>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">{t('orders.customer')}</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('orders.searchCustomer')}
                value={filters.customer}
                onChange={(e) => handleFilterChange('customer', e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">{t('orders.searchItem')}</label>
            <div className="relative">
              <MagnifyingGlassIcon className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <input
                type="text"
                placeholder={t('orders.searchItem')}
                value={filters.item}
                onChange={(e) => handleFilterChange('item', e.target.value)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">{t('orders.startDate')}</label>
            <div className="relative">
              <CalendarIcon className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <LocalizedDateInput
                value={filters.startDate}
                onChange={(dateValue) => handleFilterChange('startDate', dateValue)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>

          <div>
            <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">{t('orders.endDate')}</label>
            <div className="relative">
              <CalendarIcon className="absolute left-2 top-2 h-3.5 w-3.5 text-gray-400" />
              <LocalizedDateInput
                value={filters.endDate}
                onChange={(dateValue) => handleFilterChange('endDate', dateValue)}
                className="w-full pl-7 pr-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              />
            </div>
          </div>
        </div>
      </div>

      {/* Bulk Actions */}
      {selectedOrders.size > 0 && (
        <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg shadow dark:shadow-gray-900/50 border border-blue-200 dark:border-blue-700 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-2">
          <span className="text-[10px] font-medium text-gray-700 dark:text-gray-300">
            {selectedOrders.size} {t('orders.bulkActions')}
          </span>
          <div className="flex gap-2 w-full sm:w-auto">
            <button
              onClick={handleBulkCancel}
              className="px-2.5 py-1 bg-orange-500 hover:bg-orange-600 text-white rounded-lg transition-colors text-xs flex-1 sm:flex-none"
            >
              {t('orders.cancelSelected')}
            </button>
            <button
              onClick={handleBulkDelete}
              className="px-2.5 py-1 bg-red-500 hover:bg-red-600 text-white rounded-lg transition-colors text-xs flex-1 sm:flex-none flex items-center gap-1 justify-center"
            >
              <TrashIcon className="h-3.5 w-3.5" />
              Delete Selected
            </button>
          </div>
        </div>
      )}

      {/* Table */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 overflow-hidden border border-gray-200 dark:border-gray-700">
        <div className="overflow-x-auto">
          <table className="w-full min-w-[800px]">
            <thead className="bg-blue-600 text-white">
              <tr>
                <th className="px-2 py-1.5 text-left">
                  <input
                    type="checkbox"
                    checked={selectedOrders.size === paginatedOrders.length && paginatedOrders.length > 0}
                    onChange={handleSelectAll}
                    className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-600 w-3 h-3"
                  />
                </th>
                <th
                  onClick={() => handleSort('id')}
                  className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors text-white"
                >
                  {t('orders.orderId')}
                </th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  {t('orders.customer')}
                </th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  {t('common.items')}
                </th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  {t('orders.flagSize')}
                </th>
                <th
                  onClick={() => handleSort('quantity')}
                  className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors text-white"
                >
                  {t('orders.qty')}
                </th>
                <th
                  onClick={() => handleSort('total_estimated_amount')}
                  className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider cursor-pointer hover:bg-blue-700 transition-colors text-white"
                >
                  {t('orders.total')}
                </th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  {t('orders.due')}
                </th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  {t('orders.status')}
                </th>
                <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                  {t('orders.actions')}
                </th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-300">
              {loading ? (
                <tr>
                  <td colSpan="9" className="px-2 py-2 text-[10px] text-center">
                    <div className="flex justify-center">
                      <ArrowPathIcon className="h-3.5 w-3.5 animate-spin text-gray-400" />
                    </div>
                  </td>
                </tr>
              ) : paginatedOrders.length === 0 ? (
                <tr>
                  <td colSpan="10" className="px-2 py-2 text-[10px] text-center text-gray-500 dark:text-gray-400">
                    {t('orders.noOrdersFound')}
                  </td>
                </tr>
              ) : (
                paginatedOrders.map(order => (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                      <td className="px-2 py-2">
                        <input
                          type="checkbox"
                          checked={selectedOrders.has(order.id)}
                          onChange={() => handleSelectOrder(order.id)}
                          className="rounded border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:checked:bg-blue-600 w-3 h-3"
                        />
                      </td>
                      <td className="px-2 py-2 text-[11px] font-medium">
                        <div className="flex items-center gap-1.5">
                          <span>#{order.id}</span>
                          {order.id === 4 && (
                            <span className="px-2 py-0.5 bg-yellow-400 text-yellow-900 rounded-full text-[9px] font-semibold">
                              23/02/2026
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-2 py-2 text-[11px]">{order.customer_name || order.customer?.name || 'N/A'}</td>
                      <td className="px-2 py-2 text-[11px]">
                        {(order.order_items && order.order_items.length > 0) ? (
                          <button onClick={() => toggleRow(order.id)} className="flex items-center gap-1 text-blue-600 hover:text-blue-800">
                            {expandedRows.has(order.id) ? <ChevronDownIcon className="h-3 w-3" /> : <ChevronRightIcon className="h-3 w-3" />}
                            {order.order_items.length} {order.order_items.length === 1 ? 'item' : 'items'}
                          </button>
                        ) : '—'}
                      </td>
                      <td className="px-2 py-2 text-[11px]">{order.flag_size ?? '—'}</td>
                      <td className="px-2 py-2 text-[11px]">{order.quantity ?? '—'}</td>
                      <td className="px-2 py-2 text-[11px] font-medium">AFN {formatCurrency(order.total_amount ?? order.total_estimated_amount)}</td>
                      <td className="px-2 py-2 text-[11px] font-medium text-red-600 dark:text-red-400">AFN {formatCurrency(order.due_amount ?? 0)}</td>
                      <td className="px-2 py-2 text-[11px]">
                        <span className={`px-1.5 py-0.5 rounded-full text-[10px] font-medium ${getStatusColor(order.status)}`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-2 py-2 text-[11px]">
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => navigate(`/orders/${order.id}`)}
                            className="p-0.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title={t('common.view')}
                          >
                            <EyeIcon className="h-3.5 w-3.5" />
                          </button>
                          <button
                            onClick={() => navigate(`/orders/${order.id}/edit`)}
                            className="p-0.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          {order.status === 'pending' && (
                            <>
                              <button
                                onClick={() => handleCompleteOrder(order.id)}
                                className="p-0.5 text-emerald-600 hover:bg-emerald-50 dark:hover:bg-emerald-900/20 rounded transition-colors"
                                title={t('orders.completeOrder')}
                              >
                                <CheckCircleIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleCancelOrder(order.id)}
                                className="p-0.5 text-orange-600 hover:bg-orange-50 dark:hover:bg-orange-900/20 rounded transition-colors"
                                title={t('orders.cancelOrder')}
                              >
                                <XCircleIcon className="h-3.5 w-3.5" />
                              </button>
                            </>
                          )}
                          <button
                            onClick={() => handleDeleteOrder(order.id)}
                            className="p-0.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                            title="Delete Order"
                          >
                            <TrashIcon className="h-3.5 w-3.5" />
                          </button>
                        </div>
                      </td>
                    </tr>
                    {expandedRows.has(order.id) && order.order_items && order.order_items.length > 0 && (
                      <tr className="bg-gray-50 dark:bg-gray-700/30">
                        <td colSpan="10" className="px-4 py-2">
                          <div className="text-[10px] sm:text-xs">
                            <div className="font-semibold mb-1 text-gray-700 dark:text-gray-300">Items:</div>
                            <div className="space-y-1">
                              {order.order_items.map((item, idx) => (
                                <div key={idx} className="flex justify-between items-center py-1 border-b border-gray-200 dark:border-gray-600 last:border-0">
                                  <span className="text-gray-900 dark:text-white">
                                    {item.manual_item_name || item.item_name || item.item?.name || 'N/A'}
                                  </span>
                                  <span className="text-gray-600 dark:text-gray-400 text-right">
                                    Qty: {item.quantity} × AFN {parseFloat(item.price_estimate || 0).toFixed(2)} = AFN{' '}
                                    {(item.quantity * parseFloat(item.price_estimate || 0)).toFixed(2)}
                                    {(item.effective_purchase_unit_cost ?? item.purchase_unit_cost) != null &&
                                    String(item.effective_purchase_unit_cost ?? item.purchase_unit_cost).trim() !== '' ? (
                                      <>
                                        {' '}
                                        · {t('orders.purchasePrice')}: AFN{' '}
                                        {parseFloat(item.effective_purchase_unit_cost ?? item.purchase_unit_cost).toFixed(2)}
                                      </>
                                    ) : null}
                                  </span>
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

        {/* Pagination & Controls */}
        <div className="bg-gray-50 dark:bg-gray-800 border-t border-gray-200 dark:border-gray-600 px-2 py-2 flex flex-col sm:flex-row items-center justify-between gap-2">
          <div className="text-[10px] text-gray-600 dark:text-gray-400 w-full sm:w-auto">
            {filteredOrders.length === 0 ? (
              <span>{t('pagination.showing')} 0 {t('pagination.of')} 0</span>
            ) : (
              <span>
                {t('pagination.showing')}{' '}
                {(currentPage - 1) * itemsPerPage + 1}–{Math.min(currentPage * itemsPerPage, filteredOrders.length)}{' '}
                {t('pagination.of')} {filteredOrders.length}
              </span>
            )}
          </div>

          <div className="flex items-center gap-1.5">
            <button
              onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
              disabled={currentPage === 1}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {t('orders.previous')}
            </button>
            <span className="text-[10px] text-gray-600 dark:text-gray-400">
              {t('orders.page')} {currentPage} {t('pagination.of')} {totalPages}
            </span>
            <button
              onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
              disabled={currentPage === totalPages}
              className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-600 disabled:opacity-50 transition-colors"
            >
              {t('orders.next')}
            </button>
          </div>

          <button
            onClick={exportToCSV}
            className="flex items-center gap-1 px-2.5 py-1 bg-emerald-600 hover:bg-emerald-700 text-white rounded-lg transition-colors text-xs w-full sm:w-auto justify-center"
          >
            <DocumentArrowDownIcon className="h-3.5 w-3.5" />
            {t('orders.exportCsv')}
          </button>
        </div>
      </div>
    </div>
        </div>
      </div>
    </div>
  );
};

export default OrdersList;
