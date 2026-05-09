import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import { 
  ArrowLeftIcon, 
  PlusIcon, 
  ChevronLeftIcon, 
  ChevronRightIcon, 
  EyeIcon,
  PrinterIcon,
  TrashIcon,
  PencilIcon,
  ExclamationTriangleIcon,
  XMarkIcon,
  DocumentArrowDownIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PrintableBill from '../../components/orders/PrintableBill';
import PaymentReceipt from '../../components/PaymentReceipt';
// Import jspdf and autotable to ensure plugin is loaded
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportCustomerToPDF } from '../../utils/pdfExport';

const CustomerLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [balancePayments, setBalancePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [balancePaymentsPage, setBalancePaymentsPage] = useState(1);
  const balancePaymentsPerPage = 5;
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({ 
    selectedOrders: [],
    paymentMode: 'full', // 'full' or 'partial'
    amount: '', 
    payment_method: 'Cash', 
    reference: '' 
  });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [selectedOrderForPrint, setSelectedOrderForPrint] = useState(null);
  const [showPrintBill, setShowPrintBill] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [orderToDelete, setOrderToDelete] = useState(null);
  const [deleting, setDeleting] = useState(false);
  const [prevBalanceAmount, setPrevBalanceAmount] = useState('');
  const [prevBalanceReference, setPrevBalanceReference] = useState('');
  const [isPayingPrevBalance, setIsPayingPrevBalance] = useState(false);
  const [showPrevBalanceModal, setShowPrevBalanceModal] = useState(false);
  const [prevBalanceAction, setPrevBalanceAction] = useState('pay'); // 'pay' | 'add' | 'edit'
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [paymentEditDialog, setPaymentEditDialog] = useState({
    open: false,
    type: 'order',
    payment: null,
    amount: '',
    title: '',
    originalAmount: null
  });
  const [paymentDeleteDialog, setPaymentDeleteDialog] = useState({
    open: false,
    type: 'order',
    payment: null,
    title: ''
  });

  useEffect(() => {
    fetchCustomerData();
  }, [id]);

  useEffect(() => {
    setCurrentPage(1);
    setBalancePaymentsPage(1);
  }, [id]);

  const fetchCustomerData = async () => {
    setLoading(true);
    try {
      const customerRes = await api.get(`/api/customers/${id}/`);
      setCustomer(customerRes.data);
      
      // Fetch orders for this customer - try different endpoint variations
      let fetchedOrders = [];
      try {
        // Try with customer filter
        const ordersRes = await api.get(`/api/orders/?customer=${id}`);
        fetchedOrders = Array.isArray(ordersRes.data) ? ordersRes.data : ordersRes.data.results || [];
      } catch (err1) {
        try {
          // Try getting all orders and filter client-side
          const allOrdersRes = await api.get('/api/orders/');
          const allOrders = Array.isArray(allOrdersRes.data) ? allOrdersRes.data : allOrdersRes.data.results || [];
          fetchedOrders = allOrders.filter(o => 
            (o.customer === parseInt(id)) || 
            (o.customer && typeof o.customer === 'object' && o.customer.id === parseInt(id)) ||
            (o.customer_id === parseInt(id))
          );
        } catch (err2) {
          console.error('Error fetching orders:', err1, err2);
        }
      }
      setOrders(fetchedOrders);

      const balanceRes = await api.get(`/api/customer-balance-payments/?customer=${id}`);
      const fetchedBalancePayments = Array.isArray(balanceRes.data)
        ? balanceRes.data
        : balanceRes.data.results || [];
      setBalancePayments(fetchedBalancePayments);
      
      // Fetch payments for this customer's orders (order payments)
      if (fetchedOrders.length > 0) {
        try {
          // Get order IDs for this customer
          const orderIds = fetchedOrders.map(o => o.id);
          
          // Get all order payments and filter by order IDs
          const paymentsRes = await api.get('/api/order-payments/');
          const allPayments = Array.isArray(paymentsRes.data)
            ? paymentsRes.data
            : paymentsRes.data.results || [];
          
          // Filter payments by order IDs (handle both order_id and nested order object)
          const customerPayments = allPayments.filter(p => {
            const paymentOrderId = p.order_id || 
              (p.order && typeof p.order === 'object' ? p.order.id : null) ||
              (typeof p.order === 'number' ? p.order : null);
            return paymentOrderId && orderIds.includes(paymentOrderId);
          });
          
          setPayments(customerPayments);
        } catch (err) {
          console.error('Error fetching payments:', err);
        }
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      addToast(t('customers.ledger.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (paymentData.selectedOrders.length === 0) {
      addToast(t('customers.ledger.selectOrder'), 'error');
      return;
    }

    if (paymentData.paymentMode === 'partial' && (!paymentData.amount || parseFloat(paymentData.amount) <= 0)) {
      addToast(t('customers.ledger.validAmount'), 'error');
      return;
    }

    setPaymentLoading(true);
    try {
      // Convert payment method to lowercase to match backend choices
      const paymentMethod = paymentData.payment_method.toLowerCase().replace(/\s+/g, '_');
      
      // Get selected orders with their due amounts
      const selectedOrdersData = orders.filter(o => paymentData.selectedOrders.includes(o.id));
      const totalDue = selectedOrdersData.reduce((sum, o) => {
        return sum + (parseFloat(o.due_amount || o.due) || 0);
      }, 0);

      if (paymentData.paymentMode === 'full') {
        // Full payment for all selected orders
        for (const order of selectedOrdersData) {
          const dueAmount = parseFloat(order.due_amount || order.due) || 0;
          if (dueAmount > 0) {
            await api.post('/api/order-payments/', {
              order: order.id,
              amount_paid: dueAmount,
              payment_method: paymentMethod,
              notes: paymentData.reference || `Full payment for order #${order.id}`
            });
          }
        }
      } else {
        // Partial payment - distribute amount across selected orders
        const paymentAmount = parseFloat(paymentData.amount);
        
        if (paymentAmount > totalDue) {
          addToast(t('customers.ledger.amountExceeds', { amount: paymentAmount.toFixed(2), total: totalDue.toFixed(2) }), 'error');
          setPaymentLoading(false);
          return;
        }

        // Distribute payment proportionally or equally
        // For simplicity, distribute equally across orders with due amounts
        const ordersWithDue = selectedOrdersData.filter(o => parseFloat(o.due_amount || o.due) > 0);
        const amountPerOrder = paymentAmount / ordersWithDue.length;
        
        for (const order of ordersWithDue) {
          const dueAmount = parseFloat(order.due_amount || order.due) || 0;
          const payAmount = Math.min(amountPerOrder, dueAmount);
          
          if (payAmount > 0) {
            await api.post('/api/order-payments/', {
              order: order.id,
              amount_paid: payAmount,
              payment_method: paymentMethod,
              notes: paymentData.reference || `Partial payment for order #${order.id}`
            });
          }
        }
      }
      
      // Wait a moment for backend signals to process payment updates
      await new Promise(resolve => setTimeout(resolve, 800));
      
      // Refresh all customer data including orders and payments
      await fetchCustomerData();
      
      addToast(t('customers.ledger.paymentSuccess', { count: paymentData.selectedOrders.length }), 'success');
      
      // Show payment receipt
      const receiptOrdersData = orders.filter(o => paymentData.selectedOrders.includes(o.id));
      const totalPaidAmount = paymentData.paymentMode === 'full'
        ? receiptOrdersData.reduce((sum, o) => sum + (parseFloat(o.due_amount || o.due) || 0), 0)
        : parseFloat(paymentData.amount);
      
      setReceiptData({
        id: `PAY-${Date.now()}`,
        type: 'customer',
        customer_name: customer.name,
        phone: customer.phone,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        item_name: paymentData.selectedOrders.length > 1
          ? `Payment for ${paymentData.selectedOrders.length} orders`
          : `Order #${paymentData.selectedOrders[0]}`,
        payment_method: paymentData.payment_method,
        reference: paymentData.reference,
        total_amount: receiptOrdersData.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0),
        previous_paid: receiptOrdersData.reduce((sum, o) => {
          const total = parseFloat(o.total_amount) || 0;
          const due = parseFloat(o.due_amount || o.due) || 0;
          return sum + (total - due);
        }, 0),
        amount: totalPaidAmount,
        amount_paid: totalPaidAmount,
        remaining_amount: paymentData.paymentMode === 'full'
          ? 0
          : receiptOrdersData.reduce((sum, o) => sum + (parseFloat(o.due_amount || o.due) || 0), 0) - totalPaidAmount,
        notes: paymentData.reference
      });
      setShowPaymentReceipt(true);
      
      setShowPaymentForm(false);
      setPaymentData({ selectedOrders: [], paymentMode: 'full', amount: '', payment_method: 'Cash', reference: '' });
    } catch (err) {
      console.error('Error recording payment:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || t('customers.ledger.paymentFailed');
      addToast(errorMsg, 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handleOrderToggle = (orderId) => {
    setPaymentData(prev => {
      const newSelected = prev.selectedOrders.includes(orderId)
        ? prev.selectedOrders.filter(id => id !== orderId)
        : [...prev.selectedOrders, orderId];
      
      // If full payment mode, calculate total due for selected orders
      let amount = prev.amount;
      if (prev.paymentMode === 'full') {
        const selectedOrdersData = orders.filter(o => newSelected.includes(o.id));
        amount = selectedOrdersData.reduce((sum, o) => {
          return sum + (parseFloat(o.due_amount || o.due) || 0);
        }, 0).toFixed(2);
      }
      
      return { ...prev, selectedOrders: newSelected, amount };
    });
  };

  const handleSelectAllOrders = () => {
    const ordersWithDue = orders.filter(o => parseFloat(o.due_amount || o.due) > 0);
    const allOrderIds = ordersWithDue.length > 0 ? ordersWithDue.map(o => o.id) : orders.map(o => o.id);
    
    setPaymentData(prev => {
      const isAllSelected = allOrderIds.every(id => prev.selectedOrders.includes(id));
      const newSelected = isAllSelected ? [] : allOrderIds;
      
      // Calculate total due for selected orders
      const selectedOrdersData = orders.filter(o => newSelected.includes(o.id));
      const totalDue = selectedOrdersData.reduce((sum, o) => {
        return sum + (parseFloat(o.due_amount || o.due) || 0);
      }, 0);
      
      return {
        ...prev,
        selectedOrders: newSelected,
        amount: prev.paymentMode === 'full' ? totalDue.toFixed(2) : prev.amount
      };
    });
  };

  const calculateTotal = () => {
    const totalOrders = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    // For order payments, use amount_paid; fall back to amount for compatibility
    const totalPaid = payments.reduce((sum, p) => {
      const value = p.amount_paid ?? p.amount;
      return sum + (parseFloat(value) || 0);
    }, 0);
    // Prevent negative due amount - if overpaid, show 0
    const totalDue = Math.max(0, totalOrders - totalPaid);
    return { totalOrders, totalPaid, totalDue };
  };

  const handleViewOrder = (orderId) => {
    navigate(`/orders/${orderId}`);
  };

  const handlePrintOrder = async (orderId) => {
    try {
      const orderRes = await api.get(`/api/orders/${orderId}/`);
      setSelectedOrderForPrint(orderRes.data);
      setShowPrintBill(true);
    } catch (err) {
      console.error('Error fetching order for print:', err);
      addToast(t('customers.ledger.loadOrderError'), 'error');
    }
  };

  const handleDeleteOrder = (order) => {
    setOrderToDelete(order);
    setShowDeleteConfirm(true);
  };

  const confirmDeleteOrder = async () => {
    if (!orderToDelete) return;
    
    setDeleting(true);
    try {
      // Try to cancel the order first (if pending)
      const status = orderToDelete.status || '';
      if (status.toLowerCase() === 'pending') {
        await api.post(`/api/orders/${orderToDelete.id}/cancel/`);
      } else {
        // If already completed/cancelled, just update status
        await api.patch(`/api/orders/${orderToDelete.id}/`, { status: 'Cancelled' });
      }
      addToast(t('orders.orderCancelled'), 'success');
      setShowDeleteConfirm(false);
      setOrderToDelete(null);
      fetchCustomerData();
    } catch (err) {
      console.error('Error cancelling order:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || t('orders.cancelOrder');
      addToast(errorMsg, 'error');
      setDeleting(false);
    }
  };

  const handlePayPreviousBalance = async () => {
    if (!customer) return;
    const remaining = parseFloat(
      customer.previous_balance_remaining ??
      customer.previous_balance ??
      0
    );
    if (prevBalanceAction === 'pay' && (!remaining || remaining <= 0)) {
      addToast(t('customers.noPreviousBalance') || 'No previous balance remaining for this customer.', 'error');
      return;
    }
    const amountNum = parseFloat(prevBalanceAmount);
    if (prevBalanceAction === 'edit') {
      if (prevBalanceAmount === '' || Number.isNaN(amountNum) || amountNum < 0) {
        addToast(t('customers.enterValidAmount') || 'Please enter a valid amount (0 or more).', 'error');
        return;
      }
    } else if (!amountNum || amountNum <= 0) {
      addToast(t('customers.enterValidAmount') || 'Please enter a valid amount.', 'error');
      return;
    }
    setIsPayingPrevBalance(true);
    try {
      if (prevBalanceAction === 'pay') {
        const res = await api.post(`/api/customers/${customer.id}/pay_previous_balance/`, {
          amount: amountNum,
          reference: prevBalanceReference
        });
        const updated = res.data.customer || res.data;
        setCustomer(updated);
        
        // Show payment receipt
        setReceiptData({
          id: `prev-${Date.now()}`,
          type: 'customer',
          customer_name: customer.name,
          phone: customer.phone,
          payment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          item_name: 'Previous Balance Payment',
          payment_method: 'Cash',
          reference: '',
          total_amount: customer.previous_balance,
          previous_paid: parseFloat(customer.previous_balance_paid || 0),
          amount: amountNum,
          amount_paid: amountNum,
          remaining_amount: parseFloat(updated.previous_balance_remaining || 0),
          notes: 'Previous Balance Payment'
        });
        setShowPaymentReceipt(true);
        
        addToast(t('customers.previousBalancePaid') || 'Previous balance payment recorded successfully.', 'success');
      } else if (prevBalanceAction === 'add') {
        // Add to previous balance
        const newBalance = parseFloat(customer.previous_balance || 0) + amountNum;
        const res = await api.patch(`/api/customers/${customer.id}/`, {
          previous_balance: newBalance,
          previous_balance_reference: prevBalanceReference
        });
        setCustomer(res.data);
        addToast('Previous balance added successfully.', 'success');
      } else if (prevBalanceAction === 'edit') {
        /* User edits the REMAINING amount (big number), not the raw opening total */
        const paid = parseFloat(customer.previous_balance_paid || 0);
        const desiredRemaining = Math.max(0, amountNum);
        const newBalance = paid + desiredRemaining;
        const res = await api.patch(`/api/customers/${customer.id}/`, {
          previous_balance: newBalance,
          previous_balance_reference: prevBalanceReference
        });
        setCustomer(res.data);
        addToast(t('customers.prevBalanceRemainingUpdated') || 'Remaining balance updated.', 'success');
      }
      setPrevBalanceAmount('');
      setPrevBalanceReference('');
      setShowPrevBalanceModal(false);
      fetchCustomerData();
    } catch (err) {
      console.error('Error updating previous balance:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update previous balance.';
      addToast(msg, 'error');
    } finally {
      setIsPayingPrevBalance(false);
    }
  };

  const openEditPaymentDialog = (payment, type) => {
    const currentAmount = parseFloat(payment.amount_paid ?? payment.amount ?? 0);
    setPaymentEditDialog({
      open: true,
      type,
      payment,
      originalAmount: currentAmount,
      amount: Number.isFinite(currentAmount) ? currentAmount.toFixed(2) : '',
      title:
        type === 'balance'
          ? t('customers.ledger.editPrevBalancePaymentAmountLabel')
          : t('sales.editPaymentTitle')
    });
  };

  const closeEditPaymentDialog = () => {
    setPaymentEditDialog({
      open: false,
      type: 'order',
      payment: null,
      amount: '',
      title: '',
      originalAmount: null
    });
  };

  const submitEditPaymentDialog = async () => {
    const amount = parseFloat(paymentEditDialog.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast('Please enter a valid amount.', 'error');
      return;
    }
    try {
      if (paymentEditDialog.type === 'balance') {
        await api.patch(`/api/customer-balance-payments/${paymentEditDialog.payment.id}/`, { amount });
        addToast('Previous balance payment updated successfully.', 'success');
      } else {
        await api.patch(`/api/order-payments/${paymentEditDialog.payment.id}/`, { amount_paid: amount });
        addToast('Payment updated successfully.', 'success');
      }
      closeEditPaymentDialog();
      fetchCustomerData();
    } catch (err) {
      console.error('Error updating payment:', err);
      addToast(
        paymentEditDialog.type === 'balance'
          ? 'Failed to update previous balance payment.'
          : 'Failed to update payment.',
        'error'
      );
    }
  };

  const handleDeleteOrderPayment = async (payment) => {
    setPaymentDeleteDialog({
      open: true,
      type: 'order',
      payment,
      title: 'Are you sure you want to delete this payment?'
    });
  };

  const handleDeleteBalancePayment = async (payment) => {
    setPaymentDeleteDialog({
      open: true,
      type: 'balance',
      payment,
      title: 'Are you sure you want to delete this previous balance payment?'
    });
  };

  const closeDeletePaymentDialog = () => {
    setPaymentDeleteDialog({
      open: false,
      type: 'order',
      payment: null,
      title: ''
    });
  };

  const confirmDeletePaymentDialog = async () => {
    if (!paymentDeleteDialog.payment) return;
    try {
      if (paymentDeleteDialog.type === 'balance') {
        await api.delete(`/api/customer-balance-payments/${paymentDeleteDialog.payment.id}/`);
        addToast(t('customers.prevBalancePaymentDeletedRestored'), 'success');
      } else {
        await api.delete(`/api/order-payments/${paymentDeleteDialog.payment.id}/`);
        addToast('Payment deleted successfully.', 'success');
      }
      closeDeletePaymentDialog();
      fetchCustomerData();
    } catch (err) {
      console.error('Error deleting payment:', err);
      addToast(
        paymentDeleteDialog.type === 'balance'
          ? 'Failed to delete previous balance payment.'
          : 'Failed to delete payment.',
        'error'
      );
    }
  };

  const totals = calculateTotal();
  const totalPages = Math.max(1, Math.ceil(orders.length / itemsPerPage));
  const paginatedOrders = orders.slice((currentPage - 1) * itemsPerPage, currentPage * itemsPerPage);
  const balancePaymentsTotalPages = Math.max(
    1,
    Math.ceil(balancePayments.length / balancePaymentsPerPage)
  );
  const paginatedBalancePayments = balancePayments.slice(
    (balancePaymentsPage - 1) * balancePaymentsPerPage,
    balancePaymentsPage * balancePaymentsPerPage
  );

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!customer) {
    return (
      <div className="text-center py-8">
        <p className="text-gray-500 dark:text-gray-400">{t('customers.ledger.notFound')}</p>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl relative overflow-hidden mb-3">
        {/* Decorative shapes */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-50" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-30" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/customers')} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{customer.name}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">{customer.phone}</p>
              {(customer.manual_serial_no || '').trim() !== '' && (
                <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                  {t('customers.manualSerialNo')}: <span className="font-medium dark:text-gray-300">{customer.manual_serial_no}</span>
                </p>
              )}
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => {
                try {
                  if (typeof jsPDF.prototype.autoTable === 'undefined') {
                    addToast(t('customers.ledger.pdfPluginError'), 'error');
                    return;
                  }
                  exportCustomerToPDF(customer, orders, payments);
                } catch (error) {
                  console.error('Error exporting PDF:', error);
                  addToast(`Failed to export PDF: ${error.message}`, 'error');
                }
              }}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              title={t('customers.ledger.exportPdfTitle')}
            >
              <DocumentArrowDownIcon className="h-3.5 w-3.5" />
              {t('customers.ledger.exportPdf')}
            </button>
            <button
              onClick={() => setShowPaymentForm(true)}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />{t('customers.ledger.recordPayment')}
            </button>
          </div>
        </div>
      </div>

      {/* Summary Cards */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-2 md:gap-3">
        {/* Previous Balance Card */}
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-purple-500">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-purple-700/25 dark:bg-purple-400/20 rounded-full pointer-events-none" />
          <div className="flex justify-between items-start gap-1 mb-1">
            <div className="flex-1 min-w-0">
              <div className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">Previous Balance</div>
              <div className={`text-lg font-bold leading-tight tabular-nums ${
                parseFloat(customer.previous_balance_remaining || 0) > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                AFN {(parseFloat(customer.previous_balance_remaining || 0)).toFixed(2)}
              </div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400 mt-0.5 leading-snug">
                Original: AFN {(parseFloat(customer.previous_balance || 0)).toFixed(2)}
                {customer.previous_balance_reference && (
                  <span className="ml-2">| Ref: {customer.previous_balance_reference}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setPrevBalanceAction('edit');
                const rem = parseFloat(customer.previous_balance_remaining ?? 0);
                setPrevBalanceAmount(Number.isFinite(rem) ? rem.toFixed(2) : '0');
                setPrevBalanceReference(customer.previous_balance_reference || '');
                setShowPrevBalanceModal(true);
              }}
              className="p-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
              title="Edit Previous Balance"
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setPrevBalanceAction('add');
                setPrevBalanceAmount('');
                setPrevBalanceReference('');
                setShowPrevBalanceModal(true);
              }}
              className="p-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 shrink-0"
              title="Add Previous Balance"
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          {typeof customer.previous_balance_remaining !== 'undefined' && parseFloat(customer.previous_balance || 0) > 0 && (
            <div className="mt-1 pt-1 border-t border-purple-200 dark:border-purple-700">
              <div className="flex justify-between items-center text-[10px] leading-tight">
                <span className="text-purple-700 dark:text-purple-300">Paid:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  AFN {(parseFloat(customer.previous_balance_paid || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {parseFloat(customer.previous_balance_remaining || 0) > 0 && (
            <button
              onClick={() => {
                setPrevBalanceAction('pay');
                setPrevBalanceAmount('');
                setPrevBalanceReference('');
                setShowPrevBalanceModal(true);
              }}
              className="mt-1.5 w-full px-2 py-1 text-[10px] rounded-md bg-green-600 text-white hover:bg-green-700 leading-tight"
            >
              Pay Previous Balance
            </button>
          )}
        </div>
        
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-blue-500 flex flex-col justify-center min-h-0">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-blue-700/25 dark:bg-blue-400/20 rounded-full pointer-events-none" />
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('customers.ledger.totalOrders')}</p>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums leading-tight">AFN {totals.totalOrders.toFixed(2)}</div>
        </div>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-green-500 flex flex-col justify-center min-h-0">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-green-700/25 dark:bg-green-400/20 rounded-full pointer-events-none" />
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('customers.ledger.totalPaid')}</p>
          <div className="text-base font-bold text-green-600 dark:text-green-400 tabular-nums leading-tight">AFN {totals.totalPaid.toFixed(2)}</div>
        </div>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-red-500 flex flex-col justify-center min-h-0">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-red-700/25 dark:bg-red-400/20 rounded-full pointer-events-none" />
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('customers.ledger.totalDue')}</p>
          <div className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums leading-tight">AFN {totals.totalDue.toFixed(2)}</div>
        </div>
      </div>

      {/* Order History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('customers.ledger.orderHistory')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('customers.ledger.orderId')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.date')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('customers.ledger.items')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.total')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('customers.ledger.paid')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('orders.due')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.status')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('customers.ledger.lastPayment')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-300">
              {paginatedOrders.map((order) => {
                // Filter payments for this order - handle both object and ID formats
                const orderPayments = payments.filter(p => {
                  const paymentOrderId = p.order_id || 
                    (p.order && typeof p.order === 'object' ? p.order.id : null) ||
                    (typeof p.order === 'number' ? p.order : null);
                  return paymentOrderId === order.id;
                });
                const lastPayment = orderPayments.length > 0 
                  ? orderPayments.sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at))[0]
                  : null;
                
                return (
                  <React.Fragment key={order.id}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                      <td className="px-3 py-2 font-medium">#{order.id}</td>
                      <td className="px-3 py-2">{formatDate(order.created_at || order.order_date)}</td>
                      <td className="px-3 py-2">{order.flag_size || 'N/A'} x {order.quantity}</td>
                      <td className="px-3 py-2">AFN {(parseFloat(order.total_amount) || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-green-600 dark:text-green-400">
                        AFN {(parseFloat(order.paid_amount) || (parseFloat(order.total_amount) - parseFloat(order.due_amount || order.due || 0))).toFixed(2)}
                      </td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">
                        AFN {Math.max(0, parseFloat(order.due_amount || order.due) || 0).toFixed(2)}
                      </td>
                      <td className="px-3 py-2">
                        <span className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                          order.status === 'completed' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' :
                          order.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' :
                          'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                        }`}>
                          {order.status}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {lastPayment
                          ? `${formatDate(lastPayment.payment_date || lastPayment.created_at)} (AFN ${(parseFloat(lastPayment.amount_paid ?? lastPayment.amount) || 0).toFixed(2)})`
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleViewOrder(order.id)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title={t('customers.ledger.viewOrder')}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                          <button
                            onClick={() => handlePrintOrder(order.id)}
                            className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                            title={t('customers.ledger.printBill')}
                          >
                            <PrinterIcon className="h-4 w-4" />
                          </button>
                          {((order.status || '').toLowerCase() === 'pending') && (
                            <button
                              onClick={() => handleDeleteOrder(order)}
                              className="p-1.5 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                              title={t('customers.ledger.cancelOrder')}
                            >
                              <TrashIcon className="h-4 w-4" />
                            </button>
                          )}
                        </div>
                      </td>
                    </tr>
                    {orderPayments
                      .slice()
                      .sort((a, b) => new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at))
                      .map((payment, pIdx) => (
                        <tr key={`order-${order.id}-payment-${payment.id || pIdx}`} className="bg-blue-50 dark:bg-blue-900/10">
                          <td className="px-3 py-2 pl-8 text-xs text-blue-600 dark:text-blue-400" colSpan="3">
                            Payment #{pIdx + 1}
                          </td>
                          <td className="px-3 py-2 text-xs">-</td>
                          <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
                            AFN {(parseFloat(payment.amount_paid ?? payment.amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs">-</td>
                          <td className="px-3 py-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                              Payment
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {formatDate(payment.payment_date || payment.created_at)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                onClick={() => openEditPaymentDialog(payment, 'order')}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title="Edit payment"
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeleteOrderPayment(payment)}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                                title="Delete payment"
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                  </React.Fragment>
                );
              })}
            </tbody>
          </table>
        </div>

        {orders.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('customers.ledger.showing')}{' '}
              {(currentPage - 1) * itemsPerPage + 1} {t('customers.ledger.to')}{' '}
              {Math.min(currentPage * itemsPerPage, orders.length)} {t('customers.ledger.of')} {orders.length} (
              {itemsPerPage} {t('customers.ledger.perPage')})
            </div>
            <div className="flex items-center gap-2">
              <button
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded-lg disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-2 py-1 text-xs border rounded-lg ${
                    currentPage === i + 1 ? 'bg-blue-600 text-white border-blue-600' : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                onClick={() => setCurrentPage(Math.min(totalPages, currentPage + 1))}
                disabled={currentPage === totalPages}
                className="p-1.5 border rounded-lg disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Previous balance payments (paginated separately from orders) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">
            {t('customers.ledger.prevBalancePaymentsSection')}
          </h2>
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
            {t('customers.ledger.prevBalancePaymentsSectionHint')}
          </p>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-purple-900/90 dark:bg-purple-950 text-white">
              <tr>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.date')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.amount')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.notes')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
              {paginatedBalancePayments.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    {t('customers.ledger.noPrevBalancePayments')}
                  </td>
                </tr>
              ) : (
                paginatedBalancePayments.map((payment) => (
                  <tr
                    key={payment.id}
                    className="hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-purple-50/50 dark:bg-purple-900/10"
                  >
                    <td className="px-3 py-2">{formatDate(payment.payment_date || payment.created_at)}</td>
                    <td className="px-3 py-2 text-green-600 dark:text-green-400 font-medium">
                      AFN {(parseFloat(payment.amount_paid ?? payment.amount) || 0).toFixed(2)}
                    </td>
                    <td className="px-3 py-2 text-gray-600 dark:text-gray-400 max-w-xs truncate">
                      {payment.notes || '—'}
                    </td>
                    <td className="px-3 py-2">
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          onClick={() => openEditPaymentDialog(payment, 'balance')}
                          className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDeleteBalancePayment(payment)}
                          className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
        {balancePayments.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('customers.ledger.showing')}{' '}
              {(balancePaymentsPage - 1) * balancePaymentsPerPage + 1}{' '}
              {t('customers.ledger.to')}{' '}
              {Math.min(balancePaymentsPage * balancePaymentsPerPage, balancePayments.length)}{' '}
              {t('customers.ledger.of')} {balancePayments.length} ({balancePaymentsPerPage}{' '}
              {t('customers.ledger.perPage')})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setBalancePaymentsPage((p) => Math.max(1, p - 1))}
                disabled={balancePaymentsPage === 1}
                className="p-1.5 border rounded-lg disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {[...Array(balancePaymentsTotalPages)].map((_, i) => (
                <button
                  type="button"
                  key={i + 1}
                  onClick={() => setBalancePaymentsPage(i + 1)}
                  className={`px-2 py-1 text-xs border rounded-lg ${
                    balancePaymentsPage === i + 1
                      ? 'bg-purple-600 text-white border-purple-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
                onClick={() =>
                  setBalancePaymentsPage((p) => Math.min(balancePaymentsTotalPages, p + 1))
                }
                disabled={balancePaymentsPage === balancePaymentsTotalPages}
                className="p-1.5 border rounded-lg disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronRightIcon className="h-4 w-4" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Payment Form Modal */}
      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4 overflow-y-auto">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-xl w-full my-4">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">{t('customers.ledger.recordPayment')}</h3>
            <form onSubmit={handlePayment} className="space-y-3">
              {/* Payment Mode */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1.5">{t('customers.ledger.paymentMode')} *</label>
                <div className="flex gap-3">
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="full"
                      checked={paymentData.paymentMode === 'full'}
                      onChange={(e) => {
                        const selectedOrdersData = orders.filter(o => paymentData.selectedOrders.includes(o.id));
                        const totalDue = selectedOrdersData.reduce((sum, o) => {
                          return sum + (parseFloat(o.due_amount || o.due) || 0);
                        }, 0);
                        setPaymentData({
                          ...paymentData,
                          paymentMode: 'full',
                          amount: totalDue.toFixed(2)
                        });
                      }}
                      className="mr-1.5"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('customers.ledger.fullPayment')}</span>
                  </label>
                  <label className="flex items-center">
                    <input
                      type="radio"
                      value="partial"
                      checked={paymentData.paymentMode === 'partial'}
                      onChange={(e) => setPaymentData({...paymentData, paymentMode: 'partial', amount: ''})}
                      className="mr-1.5"
                    />
                    <span className="text-xs text-gray-700 dark:text-gray-300">{t('customers.ledger.partialPayment')}</span>
                  </label>
                </div>
              </div>

              {/* Order Selection */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t('customers.ledger.selectOrders')} *</label>
                  <button
                    type="button"
                    onClick={handleSelectAllOrders}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    {(() => {
                      const ordersWithDue = orders.filter(o => parseFloat(o.due_amount || o.due) > 0);
                      const allOrderIds = ordersWithDue.length > 0 ? ordersWithDue.map(o => o.id) : orders.map(o => o.id);
                      const isAllSelected = allOrderIds.length > 0 && allOrderIds.every(id => paymentData.selectedOrders.includes(id));
                      return isAllSelected ? t('customers.ledger.deselectAll') : t('customers.ledger.selectAll');
                    })()}
                  </button>
                </div>
                <div className="max-h-32 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1.5">
                  {(() => {
                    const ordersWithDue = orders.filter(o => parseFloat(o.due_amount || o.due) > 0);
                    const list = ordersWithDue.length > 0 ? ordersWithDue : orders;
                    return list.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">{t('customers.ledger.noOrdersAvailable')}</p>
                    ) : (
                      list.map(order => {
                        const dueAmount = parseFloat(order.due_amount || order.due) || 0;
                        return (
                          <label
                            key={order.id}
                            className="flex items-center p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={paymentData.selectedOrders.includes(order.id)}
                              onChange={() => handleOrderToggle(order.id)}
                              className="mr-2 rounded border-gray-300 dark:border-gray-600"
                            />
                            <div className="flex-1">
                              <div className="text-xs font-medium text-gray-900 dark:text-white">
                                Order #{order.id}
                              </div>
                              <div className="text-[10px] text-gray-600 dark:text-gray-400">
                                Total: AFN {(parseFloat(order.total_amount) || 0).toFixed(2)} | 
                                Due: AFN {dueAmount.toFixed(2)}
                              </div>
                            </div>
                          </label>
                        );
                      })
                    );
                  })()}
                </div>
                {paymentData.selectedOrders.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-gray-600 dark:text-gray-400">
                    {t('customers.ledger.ordersSelected', { count: paymentData.selectedOrders.length })}
                    {paymentData.paymentMode === 'full' && (
                      <span className="ml-2 font-medium">
                        | {t('customers.ledger.totalDueLabel')}: AFN {(() => {
                          const selectedOrdersData = orders.filter(o => paymentData.selectedOrders.includes(o.id));
                          return selectedOrdersData.reduce((sum, o) => {
                            return sum + (parseFloat(o.due_amount || o.due) || 0);
                          }, 0).toFixed(2);
                        })()}
                      </span>
                    )}
                  </p>
                )}
              </div>

              {/* Amount Input */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('customers.ledger.amountLabel')} {paymentData.paymentMode === 'full' ? t('customers.ledger.autoCalculated') : '*'}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={paymentData.amount}
                  onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})}
                  disabled={paymentData.paymentMode === 'full'}
                  className="w-full px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 disabled:opacity-50 disabled:cursor-not-allowed"
                  required={paymentData.paymentMode === 'partial'}
                />
              </div>

              <div className="grid grid-cols-2 gap-2">
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.ledger.paymentMethod')} *</label>
                  <select
                    value={paymentData.payment_method}
                    onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  >
                    <option value="Cash">Cash</option>
                    <option value="Bank Transfer">Bank Transfer</option>
                    <option value="Card">Card</option>
                    <option value="Check">Check</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.ledger.reference')}</label>
                  <input
                    type="text"
                    value={paymentData.reference}
                    onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})}
                    className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('customers.ledger.optional')}
                  />
                </div>
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentForm(false);
                    setPaymentData({ selectedOrders: [], paymentMode: 'full', amount: '', payment_method: 'Cash', reference: '' });
                  }}
                  className="btn-form-red flex-1"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={paymentLoading}
                  className="btn-form-green flex-1 disabled:opacity-50"
                >
                  {paymentLoading ? t('customers.ledger.processing') : t('customers.ledger.recordPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Print Bill Modal */}
      {showPrintBill && selectedOrderForPrint && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('customers.ledger.printBillTitle')}</h3>
              <button
                onClick={() => {
                  setShowPrintBill(false);
                  setSelectedOrderForPrint(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <PrintableBill order={selectedOrderForPrint} customer={customer} />
            </div>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {showDeleteConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-start justify-between mb-4">
              <div className="flex items-start gap-3">
                <div className="bg-red-100 p-2 rounded-full">
                  <ExclamationTriangleIcon className="h-6 w-6 text-red-600" />
                </div>
                <div className="flex-1">
                  <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('customers.ledger.cancelOrder')}</h3>
                </div>
              </div>
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
                disabled={deleting}
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            
            <p className="text-gray-600 dark:text-gray-400 mb-6 ml-11">
              {t('customers.ledger.cancelOrderConfirm', { id: orderToDelete?.id })}
            </p>
            
            <div className="flex gap-3 justify-end">
              <button
                onClick={() => {
                  setShowDeleteConfirm(false);
                  setOrderToDelete(null);
                }}
                disabled={deleting}
                className="px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700 transition-colors disabled:opacity-50"
              >
                {t('customers.ledger.keepOrder')}
              </button>
              <button
                onClick={confirmDeleteOrder}
                disabled={deleting}
                className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-lg transition-colors disabled:opacity-50"
              >
                {deleting ? t('customers.ledger.cancelling') : t('customers.ledger.cancelOrder')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Previous Balance Modal */}
      {showPrevBalanceModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {prevBalanceAction === 'pay'
                  ? t('customers.payPreviousBalance')
                  : prevBalanceAction === 'add'
                    ? t('customers.ledger.addPreviousBalanceShort')
                    : t('customers.editRemainingPrevBalanceTitle')}
              </h3>
              <button
                onClick={() => {
                  setShowPrevBalanceModal(false);
                  setPrevBalanceAmount('');
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>

            {prevBalanceAction === 'pay' && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Current Remaining Balance:</span> AFN {(parseFloat(customer.previous_balance_remaining || 0)).toFixed(2)}
                </p>
              </div>
            )}

            {prevBalanceAction === 'edit' && (
              <div className="mb-4 p-3 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800 text-xs text-gray-700 dark:text-gray-300 space-y-1">
                <p>
                  <span className="font-semibold">{t('customers.ledger.paidTowardPrevBalance')}:</span> AFN{' '}
                  {(parseFloat(customer.previous_balance_paid || 0)).toFixed(2)}
                </p>
                <p>
                  <span className="font-semibold">{t('customers.ledger.openingTotalOnFile')}:</span> AFN{' '}
                  {(parseFloat(customer.previous_balance || 0)).toFixed(2)}
                </p>
                <p className="text-blue-800 dark:text-blue-200">{t('customers.editRemainingPrevBalanceHelp')}</p>
              </div>
            )}

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                {prevBalanceAction === 'edit'
                  ? t('customers.editRemainingPrevBalanceLabel')
                  : 'Amount (AFN) *'}
              </label>
              <input
                type="number"
                step="0.01"
                min={prevBalanceAction === 'edit' ? '0' : '0'}
                value={prevBalanceAmount}
                onChange={(e) => setPrevBalanceAmount(e.target.value)}
                placeholder="Enter amount"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
                autoFocus
              />
            </div>

            <div className="mb-4">
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                Reference Number
              </label>
              <input
                type="text"
                value={prevBalanceReference}
                onChange={(e) => setPrevBalanceReference(e.target.value)}
                placeholder="Enter reference number (optional)"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-purple-500"
              />
            </div>

            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowPrevBalanceModal(false);
                  setPrevBalanceAmount('');
                  setPrevBalanceReference('');
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                onClick={handlePayPreviousBalance}
                disabled={isPayingPrevBalance}
                className={`flex-1 px-4 py-2 text-white rounded-lg disabled:opacity-50 ${
                  prevBalanceAction === 'pay'
                    ? 'bg-green-600 hover:bg-green-700'
                    : 'bg-purple-600 hover:bg-purple-700'
                }`}
              >
                {isPayingPrevBalance
                  ? 'Processing...'
                  : prevBalanceAction === 'pay'
                    ? 'Pay Balance'
                    : prevBalanceAction === 'add'
                      ? 'Add Balance'
                      : 'Update Balance'
                }
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Payment Receipt Modal */}
      {showPaymentReceipt && receiptData && (
        <PaymentReceipt
          payment={receiptData}
          onClose={() => {
            setShowPaymentReceipt(false);
            setReceiptData(null);
          }}
        />
      )}

      {paymentEditDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold mb-2 text-gray-900 dark:text-white">{paymentEditDialog.title}</h3>
            {paymentEditDialog.type === 'balance' && (
              <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
                {t('customers.ledger.editPrevBalancePaymentHint')}
              </p>
            )}
            <input
              type="number"
              step="0.01"
              min="0"
              value={paymentEditDialog.amount}
              onChange={(e) => setPaymentEditDialog((prev) => ({ ...prev, amount: e.target.value }))}
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              autoFocus
            />
            {paymentEditDialog.type === 'balance' &&
              customer &&
              paymentEditDialog.originalAmount != null &&
              (() => {
                const orig = Number(paymentEditDialog.originalAmount);
                const next = parseFloat(paymentEditDialog.amount);
                const rem = parseFloat(customer.previous_balance_remaining ?? 0);
                if (!Number.isFinite(next) || Number.isNaN(next)) return null;
                const projected = rem + (orig - next);
                return (
                  <p className="mt-2 text-xs text-gray-700 dark:text-gray-300">
                    <span className="font-medium">{t('customers.ledger.afterEditRemainingPrevBalance')}:</span>{' '}
                    AFN {Math.max(0, projected).toFixed(2)}
                  </p>
                );
              })()}
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={closeEditPaymentDialog}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={submitEditPaymentDialog}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                Update
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentDeleteDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">Delete Payment</h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{paymentDeleteDialog.title}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeletePaymentDialog}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                Cancel
              </button>
              <button
                type="button"
                onClick={confirmDeletePaymentDialog}
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

export default CustomerLedger;
