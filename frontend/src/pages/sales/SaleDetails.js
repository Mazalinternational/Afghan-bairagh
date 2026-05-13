import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  ShoppingCartIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  PrinterIcon,
  PencilIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { formatDateForInput } from '../../i18n/dateUtils';
import { useToast } from '../../context/ToastContext';
import PrintableBill from '../../components/orders/PrintableBill';
import { formatCurrency } from '../../utils/currency';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import { translateSaleApiError } from '../../utils/saleApiErrors';

const SaleDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatDate, formatTime } = useTranslation();
  const { addToast } = useToast();
  
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', method: '' });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [confirmAction, setConfirmAction] = useState(null);
  const [paymentData, setPaymentData] = useState({
    amount_paid: '',
    payment_method: 'cash',
    notes: ''
  });
  const [saleDateInput, setSaleDateInput] = useState('');
  const [saleDateSaving, setSaleDateSaving] = useState(false);

  useEffect(() => {
    fetchSaleDetails();
  }, [id]);

  useEffect(() => {
    if (sale) {
      setSaleDateInput(formatDateForInput(sale.sale_date));
    }
  }, [sale]);

  const paymentMethodLabel = (method) => {
    const m = String(method || '').toLowerCase();
    if (m === 'cash') return t('orders.payMethodCash');
    if (m === 'credit') return t('orders.payMethodCredit');
    if (m === 'partial') return t('orders.payMethodPartial');
    return method || '—';
  };

  const handleSaveSaleDate = async () => {
    if (!sale) return;
    setSaleDateSaving(true);
    try {
      const saleDatePayload = saleDateInput
        ? new Date(`${saleDateInput}T12:00:00`).toISOString()
        : null;
      await api.patch(`/api/sales/${id}/`, { sale_date: saleDatePayload });
      addToast(t('sales.saleDateUpdated'), 'success');
      await fetchSaleDetails();
    } catch (error) {
      console.error('Error updating sale date:', error);
      addToast(translateSaleApiError(error, t, 'sales.saleDateUpdateFailed'), 'error');
    } finally {
      setSaleDateSaving(false);
    }
  };

  const fetchSaleDetails = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/sales/${id}/`);
      setSale(response.data);
    } catch (error) {
      console.error('Error fetching sale:', error);
      addToast(t('sales.failedToLoad'), 'error');
      navigate('/sales');
    } finally {
      setLoading(false);
    }
  };

  const handleConfirmSale = () => {
    setConfirmAction('confirm');
    setShowConfirmModal(true);
  };

  const handleCancelSale = () => {
    setConfirmAction('cancel');
    setShowConfirmModal(true);
  };

  const executeConfirmAction = async () => {
    setShowConfirmModal(false);
    
    if (confirmAction === 'confirm') {
      try {
        await api.post(`/api/sales/${id}/confirm/`);
        addToast(t('sales.saleConfirmed'), 'success');
        fetchSaleDetails();
      } catch (error) {
        console.error('Error confirming sale:', error);
        addToast(translateSaleApiError(error, t, 'sales.failedToConfirm'), 'error');
      }
    } else if (confirmAction === 'cancel') {
      try {
        await api.post(`/api/sales/${id}/cancel/`);
        addToast(t('sales.saleCancelled'), 'success');
        fetchSaleDetails();
      } catch (error) {
        console.error('Error cancelling sale:', error);
        addToast(translateSaleApiError(error, t, 'sales.failedToCancel'), 'error');
      }
    }
    
    setConfirmAction(null);
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    
    try {
      await api.post(`/api/sales/${id}/add_payment/`, paymentData);
      addToast(t('sales.paymentAdded'), 'success');
      setShowPaymentModal(false);
      setPaymentData({ amount_paid: '', payment_method: 'cash', notes: '' });
      fetchSaleDetails();
    } catch (error) {
      console.error('Error adding payment:', error);
      addToast(translateSaleApiError(error, t, 'sales.failedToAddPayment'), 'error');
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: payment.amount_paid,
      method: payment.payment_method
    });
  };

  const handleUpdatePayment = async () => {
    const amount = parseFloat(editPaymentForm.amount);
    if (!amount || amount <= 0) {
      addToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }

    try {
      await api.patch(`/api/sale-payments/${editingPayment.id}/`, {
        amount_paid: amount,
        payment_method: editPaymentForm.method
      });
      
      await fetchSaleDetails();
      setEditingPayment(null);
      setEditPaymentForm({ amount: '', method: '' });
      addToast(t('sales.paymentUpdatedSuccess'), 'success');
    } catch (err) {
      console.error('Error updating payment:', err);
      addToast(t('sales.paymentUpdateFailed'), 'error');
    }
  };

  const handleCancelPayment = async (paymentId) => {
    try {
      await api.delete(`/api/sale-payments/${paymentId}/`);
      await fetchSaleDetails();
      addToast(t('sales.paymentCancelledSuccess'), 'success');
    } catch (err) {
      console.error('Error cancelling payment:', err);
      addToast(t('sales.paymentCancelFailed'), 'error');
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 dark:bg-gray-900 flex items-center justify-center">
        <div className="text-gray-600 dark:text-gray-400">{t('common.loading')}</div>
      </div>
    );
  }

  if (!sale) return null;

  const getStatusBadge = (status) => {
    const statusConfig = {
      Draft: { bg: 'bg-gray-100 dark:bg-gray-700', text: 'text-gray-800 dark:text-gray-300', label: t('sales.draft') },
      Confirmed: { bg: 'bg-green-100 dark:bg-green-900/30', text: 'text-green-800 dark:text-green-300', label: t('sales.confirmed') },
      Cancelled: { bg: 'bg-red-100 dark:bg-red-900/30', text: 'text-red-800 dark:text-red-300', label: t('sales.cancelled') }
    };
    
    const config = statusConfig[status] || statusConfig.Draft;
    return (
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
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
      <span className={`px-3 py-1 text-sm font-medium rounded-full ${config.bg} ${config.text}`}>
        {config.label}
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        {/* Header */}
        <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md border border-blue-100 dark:border-gray-700 flex justify-between items-center">
          <button
            onClick={() => navigate(-1)}
            className="p-1 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-md transition-all"
          >
            <ArrowLeftIcon className="h-4 w-4 text-gray-600 dark:text-gray-400" />
          </button>
        </div>

        {/* Content */}
        <div className="p-3 space-y-3">
          {/* All Information in One Table */}
          <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
            <div className="px-4 py-3 bg-sky-500 flex justify-between items-center">
              <div>
                <h2 className="text-base font-semibold text-white">{t('sales.detailsTitle', { id: sale.id })}</h2>
                <div className="flex flex-wrap items-center gap-3 mt-1">
                  <span className="text-sm text-white">
                    {sale.sale_date ? (
                      <>
                        {formatDate(sale.sale_date)} {formatTime(sale.sale_date)}
                      </>
                    ) : (
                      <span className="text-white/90">{t('orders.billDateNotSet')}</span>
                    )}
                  </span>
                  <span className="text-sm text-white">{getStatusBadge(sale.status)}</span>
                  <span className="text-sm text-white">{getPaymentStatusBadge(sale.payment_status)}</span>
                </div>
                <div className="mt-2 flex flex-wrap items-end gap-2">
                  <div>
                    <label className="block text-[10px] text-white/90 mb-0.5" htmlFor="sale-date-input">
                      {t('sales.saleDate')}
                    </label>
                    <LocalizedDateInput
                      id="sale-date-input"
                      value={saleDateInput}
                      onChange={(dateValue) => setSaleDateInput(dateValue)}
                      className="rounded px-2 py-1 text-xs text-gray-900 dark:text-gray-100 dark:bg-gray-700 border border-white/30"
                    />
                  </div>
                  <button
                    type="button"
                    onClick={handleSaveSaleDate}
                    disabled={saleDateSaving}
                    className="bg-white/20 hover:bg-white/30 disabled:opacity-60 text-white px-3 py-1.5 rounded-lg text-xs font-medium border border-white/30"
                  >
                    {saleDateSaving ? t('common.saving') : t('sales.saveSaleDate')}
                  </button>
                </div>
                <p className="text-[10px] text-white/80 mt-1 max-w-xl">{t('sales.saleDateHelp')}</p>
              </div>
              <div className="flex gap-2">
                {sale.status === 'Draft' && (
                  <>
                    <button
                      onClick={() => navigate(`/sales/${id}/edit`)}
                      className="bg-gray-600 hover:bg-gray-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                      title={t('sales.editBillTooltipDraft')}
                    >
                      <PencilIcon className="h-3 w-3" />
                      {t('sales.editBill')}
                    </button>
                    <button
                      onClick={handleConfirmSale}
                      className="bg-green-600 hover:bg-green-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <CheckCircleIcon className="h-3 w-3" />
                      {t('sales.confirmSale')}
                    </button>
                  </>
                )}
                {sale.status === 'Confirmed' && (
                  <>
                    <button
                      onClick={() => navigate(`/sales/${id}/edit`)}
                      className="bg-blue-600 hover:bg-blue-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                      title={t('sales.editBillTooltipConfirmed')}
                    >
                      <PencilIcon className="h-3 w-3" />
                      {t('sales.editBill')}
                    </button>
                    <button
                      onClick={handleCancelSale}
                      className="bg-red-600 hover:bg-red-700 text-white px-3 py-1.5 rounded-lg text-xs font-medium flex items-center gap-1"
                    >
                      <XCircleIcon className="h-3 w-3" />
                      {t('common.cancel')}
                    </button>
                  </>
                )}
              </div>
            </div>
            <div className="overflow-x-auto">
              <table className="w-full">
                <thead className="bg-sky-500">
                  <tr>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.item')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.itemSizeColumn')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.quantity')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.pricePerUnit')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.stockType')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.total')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.customerColumn')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.phoneColumn')}</th>
                    <th className="px-3 py-2 text-left text-xs font-medium text-white uppercase tracking-wider">{t('sales.paymentColumn')}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {sale.items.map((item, idx) => {
                    const sizeDisplay = item.flag_size && item.flag_stand_size ? `${item.flag_size} / ${item.flag_stand_size}` : item.flag_size || item.flag_stand_size || '-';
                    return (
                    <tr key={item.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{item.item_name}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{sizeDisplay}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{item.quantity}</td>
                      <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(item.price_per_unit)}</td>
                      <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">
                        {item.stock_type === 'press_stock' ? t('sales.pressStock') : t('sales.homeStock')}
                      </td>
                      <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">{formatCurrency(item.total)}</td>
                      {idx === 0 && (
                        <>
                          <td rowSpan={sale.items.length} className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                            {sale.customer_name}
                          </td>
                          <td rowSpan={sale.items.length} className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                            {sale.customer_phone && sale.customer_phone !== 'N/A' ? sale.customer_phone : '-'}
                          </td>
                          <td rowSpan={sale.items.length} className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                            {sale.payments && sale.payments.length > 0 ? (
                              <div className="space-y-1">
                                {sale.payments.map(p => (
                                  <div key={p.id} className="flex items-center gap-1">
                                    <span>
                                      {t('sales.paymentLine', {
                                        id: p.id,
                                        amount: formatCurrency(p.amount_paid),
                                        method: paymentMethodLabel(p.payment_method)
                                      })}
                                    </span>
                                    <button
                                      onClick={() => handleEditPayment(p)}
                                      className="text-blue-600 hover:text-blue-800 text-xs"
                                      title={t('common.edit')}
                                    >
                                      {t('common.edit')}
                                    </button>
                                    <button
                                      onClick={() => handleCancelPayment(p.id)}
                                      className="text-red-600 hover:text-red-800 text-xs"
                                      title={t('common.remove')}
                                    >
                                      {t('common.remove')}
                                    </button>
                                  </div>
                                ))}
                              </div>
                            ) : t('sales.noPaymentsYet')}
                          </td>
                        </>
                      )}
                    </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
            <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
              <div className="flex gap-4 text-xs">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('sales.totalsSubtotal')}:{' '}
                  <strong className="text-gray-900 dark:text-white">{formatCurrency(sale.total_amount)}</strong>
                </span>
                <span className="text-red-600 dark:text-red-400">
                  {t('sales.totalsDiscount')}: -{formatCurrency(sale.discount)}
                </span>
                <span className="text-gray-600 dark:text-gray-400">
                  {t('sales.totalsTax')}: +{formatCurrency(sale.tax)}
                </span>
                <span className="text-blue-600 dark:text-blue-400 font-bold">
                  {t('sales.totalsNet')}: {formatCurrency(sale.net_amount)}
                </span>
                {sale.status === 'Confirmed' && (
                  <>
                    <span className="text-green-600 dark:text-green-400">
                      {t('sales.totalsPaid')}: {formatCurrency(sale.total_paid || 0)}
                    </span>
                    <span className="text-red-600 dark:text-red-400">
                      {t('sales.totalsDue')}: {formatCurrency(sale.balance_due || 0)}
                    </span>
                  </>
                )}
              </div>
              {sale.status === 'Confirmed' && sale.payment_status !== 'Paid' && (
                <button
                  onClick={() => setShowPaymentModal(true)}
                  className="bg-green-600 hover:bg-green-700 text-white px-3 py-1 rounded-lg text-xs font-medium flex items-center gap-1"
                >
                  <CurrencyDollarIcon className="h-3 w-3" />
                  {t('sales.addPayment')}
                </button>
              )}
            </div>
          </div>

          {/* Notes */}
          {sale.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-3">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('sales.notes')}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-400">{sale.notes}</p>
            </div>
          )}

          {/* Print Bill - Full Width Section */}
          <div className="mt-4">
            <PrintableBill
              order={{
                id: sale.id,
                bill_date: sale.sale_date,
                notes: sale.notes || '',
                customer_name: sale.customer_name,
                customer_phone: sale.customer_phone || '',
                customer_address: sale.customer_address || '',
                order_items: (sale.items || []).map((i) => ({
                  id: i.id,
                  item_name: i.item_name,
                  flag_size: i.flag_size,
                  flag_stand_size: i.flag_stand_size,
                  quality_design_type: i.quality_design_type,
                  quantity: i.quantity,
                  price_estimate: i.price_per_unit,
                  total: i.total,
                })),
                total_estimated_amount: sale.net_amount,
                payments: sale.payments || [],
              }}
              customer={{ 
                name: sale.customer_name,
                phone: sale.customer_phone || '',
                address: sale.customer_address || ''
              }}
            />
          </div>
        </div>
      </div>

      {/* Confirmation Modal */}
      {showConfirmModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">
              {confirmAction === 'confirm' ? t('sales.modalConfirmSaleTitle') : t('sales.modalCancelSaleTitle')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-6">
              {confirmAction === 'confirm' ? t('sales.confirmSaleMessage') : t('sales.saleCancelConfirmBody')}
            </p>
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowConfirmModal(false);
                  setConfirmAction(null);
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={executeConfirmAction}
                className={`flex-1 px-4 py-2 text-white rounded-lg ${
                  confirmAction === 'confirm' 
                    ? 'bg-green-600 hover:bg-green-700' 
                    : 'bg-red-600 hover:bg-red-700'
                }`}
              >
                {confirmAction === 'confirm' ? t('common.confirm') : t('sales.cancelSaleAction')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('sales.editPaymentTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sales.editPaymentAmountLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPaymentForm.amount}
                  onChange={(e) => setEditPaymentForm({...editPaymentForm, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sales.paymentMethod')}</label>
                <select
                  value={editPaymentForm.method}
                  onChange={(e) => setEditPaymentForm({...editPaymentForm, method: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">{t('orders.payMethodCash')}</option>
                  <option value="credit">{t('orders.payMethodCredit')}</option>
                  <option value="partial">{t('orders.payMethodPartial')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                onClick={() => {
                  setEditingPayment(null);
                  setEditPaymentForm({ amount: '', method: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdatePayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('sales.editPaymentUpdateButton')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      {showPaymentModal && (() => {
          const netAmount = parseFloat(sale.net_amount || 0);
          const totalPaid = parseFloat(sale.total_paid || 0);
          const amountToPay = Math.max(0, netAmount - totalPaid);
          return (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full mx-4">
              <div className="p-4 border-b dark:border-gray-700">
                <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('sales.addPayment')}</h3>
              </div>
              <form onSubmit={handleAddPayment} className="p-4 space-y-3">
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-700 rounded-lg p-3 mb-2">
                  <p className="text-sm font-semibold text-blue-800 dark:text-blue-200">
                    {t('sales.paymentModalAmountToPay', { amount: formatCurrency(amountToPay) })}
                  </p>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                    {t('sales.paymentModalBreakdown', {
                      net: formatCurrency(netAmount),
                      paid: formatCurrency(totalPaid),
                      due: formatCurrency(amountToPay)
                    })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('sales.amountPaid')}
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={amountToPay}
                    placeholder={t('sales.paymentModalMaxPlaceholder', { amount: formatCurrency(amountToPay) })}
                    value={paymentData.amount_paid}
                    onChange={(e) => setPaymentData({ ...paymentData, amount_paid: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                    {t('sales.paymentModalBalanceDue', { amount: formatCurrency(amountToPay) })}
                  </p>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('sales.paymentMethod')}
                  </label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({ ...paymentData, payment_method: e.target.value })}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="cash">{t('orders.payMethodCash')}</option>
                    <option value="credit">{t('orders.payMethodCredit')}</option>
                    <option value="partial">{t('orders.payMethodPartial')}</option>
                  </select>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('sales.notes')}
                  </label>
                  <textarea
                    value={paymentData.notes}
                    onChange={(e) => setPaymentData({ ...paymentData, notes: e.target.value })}
                    rows="2"
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="flex gap-2 pt-2">
                  <button
                    type="button"
                    onClick={() => setShowPaymentModal(false)}
                    className="btn-form-red flex-1 text-sm"
                  >
                    {t('common.cancel')}
                  </button>
                  <button
                    type="submit"
                    className="btn-form-green flex-1 text-sm"
                  >
                    {t('common.save')}
                  </button>
                </div>
              </form>
            </div>
          </div>
          );
      })()}
    </div>
  );
};

export default SaleDetails;
