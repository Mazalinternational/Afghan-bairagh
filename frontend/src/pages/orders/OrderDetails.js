import React, { useState, useEffect } from 'react';
import { useParams, useNavigate, useLocation } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PrinterIcon,
  PencilIcon,
  CheckCircleIcon,
  XCircleIcon,
  CurrencyDollarIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  ClockIcon,
  DocumentTextIcon,
  DocumentDuplicateIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import PaymentModal from '../../components/orders/PaymentModal';
import PrintableBill from '../../components/orders/PrintableBill';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import { formatDate } from '../../i18n/dateUtils';
import { useTranslation } from '../../i18n/fallback';

const OrderDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();

  const [order, setOrder] = useState(null);
  const [customer, setCustomer] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showReturnModal, setShowReturnModal] = useState(false);
  const [toast, setToast] = useState(null);
  const [paymentForm, setPaymentForm] = useState({ amount: '', method: 'Cash' });
  const [showEditPaymentModal, setShowEditPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [returnForm, setReturnForm] = useState({ 
    return_type: 'full', // full or partial
    amount: '', 
    reason: '',
    refund_method: 'Cash'
  });
  const [showConfirmModal, setShowConfirmModal] = useState(false);
  const [pendingAction, setPendingAction] = useState(null);
  const [confirmCancelPaymentId, setConfirmCancelPaymentId] = useState(null);
  const location = useLocation();

  useEffect(() => {
    fetchOrderDetails();
    // Show toast if redirected from order creation
    if (location.state?.message) {
      showToast(location.state.message, 'success');
    }
  }, [id, location.state]);

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

  const fetchOrderDetails = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/orders/${id}/`);
      const orderData = res.data;
      setOrder(orderData);
      
      // Fetch customer details if customer is just an ID
      if (orderData.customer) {
        if (typeof orderData.customer === 'number' || typeof orderData.customer === 'string') {
          // Customer is an ID, fetch customer details
          try {
            const customerRes = await api.get(`/api/customers/${orderData.customer}/`);
            setCustomer(customerRes.data);
          } catch (customerErr) {
            console.error('Error fetching customer:', customerErr);
          }
        } else if (typeof orderData.customer === 'object' && orderData.customer.name) {
          // Customer is already an object with details
          setCustomer(orderData.customer);
        }
      }
      
      // Fetch payments if not included in order response (order-payments endpoint)
      if (!orderData.payments || orderData.payments.length === 0) {
        try {
          const paymentsRes = await api.get(`/api/order-payments/?order=${id}`);
          const paymentsList = paymentsRes.data.results || paymentsRes.data || [];
          setOrder(prev => ({
            ...prev,
            payments: Array.isArray(paymentsList) ? paymentsList : []
          }));
        } catch (paymentsErr) {
          console.error('Error fetching payments:', paymentsErr);
        }
      }
    } catch (err) {
      console.error(err);
      setOrder(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    const amount = parseFloat(paymentForm.amount);
    const orderTotal = parseFloat(order.total_estimated_amount ?? order.total_amount ?? 0);
    const totalPaid = (order.payments || []).reduce((s, p) => s + parseFloat(p.amount_paid ?? p.amount ?? 0), 0);
    const dueAmount = Math.max(0, orderTotal - totalPaid);
    
    if (!amount || amount <= 0 || amount > dueAmount) {
      showToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }

    try {
      // Convert payment method to lowercase to match backend choices
      const paymentMethod = paymentForm.method.toLowerCase().replace(/\s+/g, '_');
      
      // Call API to record payment (order payments)
      const response = await api.post('/api/order-payments/', {
        order: order.id,
        amount_paid: amount,
        payment_method: paymentMethod
      });

      // Refresh order details to get updated data from backend
      await fetchOrderDetails();
      
      setShowPaymentModal(false);
      setPaymentForm({ amount: '', method: 'Cash' });
      showToast(t('sales.paymentAdded'), 'success');
    } catch (err) {
      console.error('Error recording payment:', err);
      showToast(t('sales.failedToAddPayment'), 'error');
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setShowEditPaymentModal(true);
  };

  const handleUpdatePayment = async () => {
    if (!editingPayment) return;
    
    const amount = parseFloat(editingPayment.amount_paid ?? editingPayment.amount);
    if (!amount || amount <= 0) {
      showToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }

    try {
      const paymentMethod = editingPayment.payment_method.toLowerCase().replace(/\s+/g, '_');
      
      await api.put(`/api/order-payments/${editingPayment.id}/`, {
        order: order.id,
        amount_paid: amount,
        payment_method: paymentMethod
      });

      await fetchOrderDetails();
      setShowEditPaymentModal(false);
      setEditingPayment(null);
      showToast(t('sales.paymentUpdatedSuccess'), 'success');
    } catch (err) {
      console.error('Error updating payment:', err);
      showToast(t('sales.paymentUpdateFailed'), 'error');
    }
  };

  const handleCancelPaymentRequest = (paymentId) => {
    setConfirmCancelPaymentId(paymentId);
  };

  const handleCancelPaymentConfirm = async () => {
    if (!confirmCancelPaymentId) return;
    const paymentId = confirmCancelPaymentId;
    setConfirmCancelPaymentId(null);
    try {
      await api.delete(`/api/order-payments/${paymentId}/`);
      await fetchOrderDetails();
      showToast(t('sales.paymentCancelledSuccess'), 'success');
    } catch (err) {
      console.error('Error cancelling payment:', err);
      showToast(t('sales.paymentCancelFailed'), 'error');
    }
  };

  const handleReturnRefund = async () => {
    if (!returnForm.reason.trim()) {
      showToast('Please provide a reason for return/refund', 'error');
      return;
    }

    const orderTotalForRefund = parseFloat(order.total_estimated_amount ?? order.total_amount ?? 0);
    const refundAmount = returnForm.return_type === 'full'
      ? orderTotalForRefund
      : parseFloat(returnForm.amount);

    if (refundAmount <= 0 || (returnForm.return_type === 'partial' && refundAmount > orderTotalForRefund)) {
      showToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }

    try {
      // Call API to process return/refund
      await api.post('/api/orders/return/', {
        order: order.id,
        return_type: returnForm.return_type,
        refund_amount: refundAmount,
        reason: returnForm.reason,
        refund_method: returnForm.refund_method
      });

      // Refresh order details
      await fetchOrderDetails();
      
      setShowReturnModal(false);
      setReturnForm({ return_type: 'full', amount: '', reason: '', refund_method: 'Cash' });
      showToast('Return/Refund processed successfully!', 'success');
    } catch (err) {
      console.error('Error processing return/refund:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || 'Failed to process return/refund';
      showToast(errorMsg, 'error');
    }
  };

  const handleStatusChange = (action) => {
    setPendingAction(action);
    setShowConfirmModal(true);
  };

  const handleStatusChangeConfirm = async () => {
    if (!pendingAction) return;
    try {
      if (pendingAction === 'complete') {
        await api.post(`/api/orders/${id}/complete/`);
      } else if (pendingAction === 'cancel') {
        // Try POST first, if fails try PATCH
        try {
          await api.post(`/api/orders/${id}/cancel/`);
        } catch (postErr) {
          // If POST fails, try PATCH with status update
          await api.patch(`/api/orders/${id}/`, { status: 'cancelled' });
        }
      }
      const updatedOrder = { ...order, status: pendingAction === 'complete' ? 'Completed' : 'Cancelled' };
      setOrder(updatedOrder);
      showToast(pendingAction === 'complete' ? t('orders.orderCompleted') : t('orders.orderCancelled'), 'success');
      fetchOrderDetails(); // Refresh order data
      setPendingAction(null);
    } catch (err) {
      console.error('Error updating order:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || err.message || 'Failed to update order status';
      showToast(errorMsg, 'error');
      setPendingAction(null);
    }
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!order) {
    return (
      <div className="flex flex-col items-center justify-center min-h-[50vh] gap-4">
        <p className="text-center text-gray-500 dark:text-gray-400">{t('common.noData')}</p>
        <button
          onClick={() => navigate('/orders')}
          className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
        >
          {t('common.back')}
        </button>
      </div>
    );
  }

  const orderTotal = parseFloat(order.total_estimated_amount ?? order.total_amount ?? 0);
  const totalPaid = (order.payments || []).reduce((sum, p) => sum + parseFloat(p.amount_paid ?? p.amount ?? 0), 0);
  const dueAmount = Math.max(0, orderTotal - totalPaid);
  const hasOrderItems = order.order_items && order.order_items.length > 0;

  return (
    <div className="space-y-3 sm:space-y-4 p-2 sm:p-3">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}
      {/* Header */}
      <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md border border-blue-100 dark:border-gray-700 flex justify-between">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/orders')} className="text-gray-700 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeftIcon className="h-5 w-5" />
          </button>
          <div>
            <h1 className="font-bold text-gray-900 dark:text-white text-lg">{t('orders.orderId') || 'Order'} #{order.id}</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {formatDate(order.order_date || order.created_at)}
            </p>
          </div>
        </div>
      </div>

      {/* Combined Order, Customer, and Payment Information */}
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-md overflow-hidden">
        <div className="px-4 py-3 bg-blue-600 dark:bg-blue-700">
          <h2 className="text-base font-semibold text-white">{t('orders.title')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full">
            <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
              {/* Order Items */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <td colSpan="5" className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white">{t('orders.orderItemsSection')}</td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('sales.item')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('orders.flagSize')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('orders.qty')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.price')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.total')}</th>
              </tr>
              {hasOrderItems ? (
                order.order_items.map((oi) => (
                  <tr key={oi.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{oi.item_name || oi.item?.name || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{oi.flag_size || '-'}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{oi.quantity}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(oi.price_estimate)}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(oi.total)}</td>
                  </tr>
                ))
              ) : (
                <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{order.item_name || order.item?.name || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{order.flag_size || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{order.quantity || '-'}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(order.price_per_unit)}</td>
                  <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{formatCurrency(order.total_amount)}</td>
                </tr>
              )}
              
              {/* Customer Information */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <td colSpan="5" className="px-3 py-2 text-xs font-semibold text-gray-900 dark:text-white">{t('orders.customer')}</td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.name')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.phone')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" colSpan="3">{t('common.address')}</th>
              </tr>
              <tr className="hover:bg-gray-50 dark:hover:bg-gray-700">
                <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                  {customer?.name || (order.customer && typeof order.customer === 'object' ? order.customer.name : order.customer_name || 'N/A')}
                </td>
                <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">
                  {customer?.phone || (order.customer && typeof order.customer === 'object' ? order.customer.phone : order.customer_phone || 'N/A')}
                </td>
                <td className="px-3 py-2 text-xs text-gray-900 dark:text-white" colSpan="3">
                  {customer?.address || (order.customer && typeof order.customer === 'object' ? order.customer.address : order.customer_address || 'N/A')}
                </td>
              </tr>

              {/* Payments */}
              <tr className="bg-gray-100 dark:bg-gray-700">
                <td colSpan="5" className="px-3 py-2">
                  <div className="flex justify-between items-center">
                    <span className="text-xs font-semibold text-gray-900 dark:text-white">{t('common.payment')}</span>
                    {dueAmount > 0 && (
                      <button
                        onClick={() => setShowPaymentModal(true)}
                        className="bg-blue-600 text-white px-2 py-1 rounded text-xs font-medium hover:bg-blue-700"
                      >
                        <CurrencyDollarIcon className="h-3.5 w-3.5 inline" /> {t('sales.addPayment')}
                      </button>
                    )}
                  </div>
                </td>
              </tr>
              <tr className="bg-gray-50 dark:bg-gray-800">
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('orders.orderId')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('common.amount')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300">{t('sales.paymentMethod')}</th>
                <th className="px-3 py-2 text-left text-xs font-medium text-gray-700 dark:text-gray-300" colSpan="2">{t('common.actions')}</th>
              </tr>
              {order.payments?.length ? (
                order.payments.map(p => (
                  <tr key={p.id} className="hover:bg-gray-50 dark:hover:bg-gray-700">
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">#{p.id}</td>
                    <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-white">AFN {formatCurrency(p.amount_paid ?? p.amount)}</td>
                    <td className="px-3 py-2 text-xs text-gray-900 dark:text-white">{p.payment_method}</td>
                    <td className="px-3 py-2 text-xs" colSpan="2">
                      <div className="flex gap-2">
                        <button
                          onClick={() => handleEditPayment(p)}
                          className="text-blue-600 hover:text-blue-800 dark:text-blue-400 dark:hover:text-blue-300"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-4 w-4" />
                        </button>
                        <button
                          onClick={() => handleCancelPaymentRequest(p.id)}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300"
                          title={t('common.cancel')}
                        >
                          <XCircleIcon className="h-4 w-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan="5" className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">{t('common.noData')}</td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
        
        {/* Summary Footer */}
        <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center flex-wrap gap-2">
          <span className={`inline-block px-2 py-1 rounded-full text-xs font-medium ${
            order.status === 'Delivered' || order.status === 'Completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
            order.status === 'Pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
            order.status === 'Cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300' :
            'bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300'
          }`}>
            {order.status}
          </span>
          <div className="flex gap-4 text-xs">
            <span className="text-gray-600 dark:text-gray-400">{t('common.total')}: <strong className="text-gray-900 dark:text-white">AFN {formatCurrency(orderTotal)}</strong></span>
            <span className="text-green-600 dark:text-green-400">{t('reportsPage.paid')}: AFN {formatCurrency(totalPaid)}</span>
            <span className="text-red-600 dark:text-red-400">{t('reportsPage.due')}: AFN {formatCurrency(dueAmount)}</span>
          </div>
        </div>
      </div>

      {/* Actions */}
      <div className="bg-white dark:bg-gray-800 p-3 rounded-xl shadow-md">
        <div className="flex gap-2 flex-wrap">
          <button
            onClick={() => navigate(`/orders/${id}/edit`)}
            className="px-3 py-1.5 bg-gray-600 text-white text-sm rounded-lg hover:bg-gray-700 flex items-center gap-1 transition-colors"
          >
            <PencilIcon className="h-3.5 w-3.5" /> {t('orders.updateOrderButton')}
          </button>

          <button
            onClick={() => navigate(`/orders/${id}/quotation`)}
            className="px-3 py-1.5 bg-purple-600 text-white text-sm rounded-lg hover:bg-purple-700 flex items-center gap-1 transition-colors"
          >
            <DocumentDuplicateIcon className="h-3.5 w-3.5" /> {t('nav.quotations')}
          </button>

          {(order.status === 'Pending' || order.status === 'Ready') && (
            <button
              onClick={() => handleStatusChange('complete')}
              className="px-3 py-1.5 bg-green-600 text-white text-sm rounded-lg hover:bg-green-700 flex items-center gap-1 transition-colors"
            >
              <CheckCircleIcon className="h-3.5 w-3.5" /> {t('orders.completeOrder')}
            </button>
          )}

          {order.status !== 'Cancelled' && order.status !== 'Delivered' && (
            <button
              onClick={() => handleStatusChange('cancel')}
              className="px-3 py-1.5 bg-red-600 text-white text-sm rounded-lg hover:bg-red-700 flex items-center gap-1 transition-colors"
            >
              <XCircleIcon className="h-3.5 w-3.5" /> {t('common.cancel')}
            </button>
          )}
          {(order.status === 'Delivered' || order.status === 'Completed') && (
            <button
              onClick={() => setShowReturnModal(true)}
              className="px-3 py-1.5 bg-orange-600 text-white text-sm rounded-lg hover:bg-orange-700 flex items-center gap-1 transition-colors"
            >
              <DocumentTextIcon className="h-3.5 w-3.5" /> {t('orders.returnRefund')}
            </button>
          )}
        </div>
      </div>

      {/* Printable Bill Component */}
      {order && <PrintableBill order={order} customer={customer || (order.customer && typeof order.customer === 'object' ? order.customer : null)} />}

      {/* Confirmation Modal */}
      <ConfirmationModal
        isOpen={showConfirmModal}
        onClose={() => {
          setShowConfirmModal(false);
          setPendingAction(null);
        }}
        onConfirm={handleStatusChangeConfirm}
        title={pendingAction === 'complete' ? t('orders.completeOrder') : t('orders.cancelOrder')}
        message={pendingAction === 'complete' 
          ? t('orders.completeConfirm') 
          : t('orders.cancelConfirm')}
        confirmText={pendingAction === 'complete' ? t('orders.completeOrder') : t('orders.cancelOrder')}
        cancelText={t('common.cancel')}
        type={pendingAction === 'complete' ? 'info' : 'danger'}
      />

      <ConfirmationModal
        isOpen={Boolean(confirmCancelPaymentId)}
        onClose={() => setConfirmCancelPaymentId(null)}
        onConfirm={handleCancelPaymentConfirm}
        title={t('sales.cancelPaymentTitle')}
        message={t('orders.cancelPaymentConfirm')}
        confirmText={t('common.confirm')}
        cancelText={t('common.cancel')}
        type="danger"
      />

      {/* Simple Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('sales.addPayment')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.amount')} *</label>
                <input
                  type="number"
                  step="0.01"
                  max={dueAmount}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({...paymentForm, amount: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={`Max: AFN ${formatCurrency(dueAmount)}`}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('sales.paymentMethod')}</label>
                <select
                  value={paymentForm.method}
                  onChange={(e) => setPaymentForm({...paymentForm, method: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => setShowPaymentModal(false)}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleAddPayment}
                className="flex-1 px-4 py-2 text-sm bg-green-600 text-white rounded-lg hover:bg-green-700 transition-colors"
              >
                {t('sales.addPayment')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Payment Modal */}
      {showEditPaymentModal && editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('sales.editPaymentTitle')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.amount')} *</label>
                <input
                  type="number"
                  step="0.01"
                  value={editingPayment.amount_paid ?? editingPayment.amount}
                  onChange={(e) => setEditingPayment({...editingPayment, amount_paid: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder={t('sales.editPaymentAmountLabel')}
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('sales.paymentMethod')}</label>
                <select
                  value={editingPayment.payment_method}
                  onChange={(e) => setEditingPayment({...editingPayment, payment_method: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">Cash</option>
                  <option value="credit">Credit</option>
                  <option value="partial">Partial</option>
                </select>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowEditPaymentModal(false);
                  setEditingPayment(null);
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleUpdatePayment}
                className="flex-1 px-4 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition-colors"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Return/Refund Modal */}
      {showReturnModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-5 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-3 text-gray-900 dark:text-white">{t('orders.returnRefund')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('orders.returnType')} *</label>
                <select
                  value={returnForm.return_type}
                  onChange={(e) => {
                    setReturnForm({
                      ...returnForm,
                      return_type: e.target.value,
                      amount: e.target.value === 'full' ? '' : returnForm.amount
                    });
                  }}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="full">{t('orders.fullReturn')}</option>
                  <option value="partial">{t('orders.partialReturn')}</option>
                </select>
              </div>

              {returnForm.return_type === 'partial' && (
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.amount')} *</label>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    max={orderTotal}
                    value={returnForm.amount}
                    onChange={(e) => setReturnForm({...returnForm, amount: e.target.value})}
                    className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={`Max: AFN ${formatCurrency(orderTotal)}`}
                  />
                </div>
              )}

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('common.description')} *</label>
                <textarea
                  value={returnForm.reason}
                  onChange={(e) => setReturnForm({...returnForm, reason: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  rows="2"
                  placeholder={t('orders.returnReasonPlaceholder')}
                  required
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('sales.paymentMethod')} *</label>
                <select
                  value={returnForm.refund_method}
                  onChange={(e) => setReturnForm({...returnForm, refund_method: e.target.value})}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="Cash">{t('printing.cash') || 'Cash'}</option>
                  <option value="Credit">{t('printing.credit') || 'Credit'}</option>
                  <option value="Partial">{t('printing.partial') || 'Partial'}</option>
                </select>
              </div>

              <div className="bg-yellow-50 dark:bg-yellow-900/20 p-2.5 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-300">
                  <strong>{t('common.amount')}:</strong> AFN {returnForm.return_type === 'full' 
                    ? formatCurrency(orderTotal)
                    : formatCurrency(returnForm.amount)
                  }
                </p>
              </div>
            </div>
            <div className="flex gap-2 mt-5">
              <button
                onClick={() => {
                  setShowReturnModal(false);
                  setReturnForm({ return_type: 'full', amount: '', reason: '', refund_method: 'Cash' });
                }}
                className="flex-1 px-4 py-2 text-sm border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors"
              >
                {t('common.cancel')}
              </button>
              <button
                onClick={handleReturnRefund}
                className="flex-1 px-4 py-2 text-sm bg-orange-600 text-white rounded-lg hover:bg-orange-700 transition-colors"
              >
                {t('orders.processReturnRefund')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default OrderDetails;
