import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon, ChevronLeftIcon, ChevronRightIcon, DocumentArrowDownIcon, PrinterIcon, PencilIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PaymentReceipt from '../../components/PaymentReceipt';
import { formatDate } from '../../i18n/dateUtils';
import { useTranslation } from '../../i18n/fallback';
// Import jspdf and autotable to ensure plugin is loaded
import jsPDF from 'jspdf';
import 'jspdf-autotable';
import { exportSupplierToPDF } from '../../utils/pdfExport';

const SupplierLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [supplier, setSupplier] = useState(null);
  const [purchases, setPurchases] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [balancePaymentsPage, setBalancePaymentsPage] = useState(1);
  const balancePaymentsPerPage = 5;
  const [filterStatus, setFilterStatus] = useState('');
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentType, setPaymentType] = useState('specific');
  const [selectedPurchases, setSelectedPurchases] = useState(new Set());
  const [paymentData, setPaymentData] = useState({ amount: '', payment_method: 'cash', reference: '', paymentMode: 'full' });
  const [paymentLoading, setPaymentLoading] = useState(false);
  const [showPdfFilter, setShowPdfFilter] = useState(false);
  const [pdfFilters, setPdfFilters] = useState({ paid: true, partial: true, due: true });
  const [pdfLoading, setPdfLoading] = useState(false);
  const [showBalancePaymentModal, setShowBalancePaymentModal] = useState(false);
  const [balancePaymentData, setBalancePaymentData] = useState({ amount: '', notes: '', reference: '' });
  const [balancePayments, setBalancePayments] = useState([]);
  const [isPayingPrevBalance, setIsPayingPrevBalance] = useState(false);
  const [prevBalanceAction, setPrevBalanceAction] = useState('pay'); // 'pay' or 'add'
  const [showPaymentReceipt, setShowPaymentReceipt] = useState(false);
  const [receiptData, setReceiptData] = useState(null);
  const [deleteBalanceDialog, setDeleteBalanceDialog] = useState({ open: false, payment: null });
  const [deletePaymentDialog, setDeletePaymentDialog] = useState({ open: false, payment: null });
  const [paymentEditDialog, setPaymentEditDialog] = useState({
    open: false,
    type: 'purchase',
    payment: null,
    amount: '',
    notes: '',
    title: ''
  });

  useEffect(() => {
    setCurrentPage(1);
    setBalancePaymentsPage(1);
    fetchSupplierData();
    fetchBalancePayments();
  }, [id]);

  const fetchSupplierData = async () => {
    setLoading(true);
    try {
      const supplierRes = await api.get(`/api/suppliers/${id}/`);
      setSupplier(supplierRes.data);
      // Use 'supplier' parameter (not 'supplier_id') to match the backend filter field name
      const purchasesRes = await api.get(`/api/purchases/?supplier=${id}`);
      const purchasesData = Array.isArray(purchasesRes.data) ? purchasesRes.data : purchasesRes.data.results || [];
      
      // Ensure we only get purchases for this specific supplier (safety check)
      const filteredPurchases = purchasesData.filter(p => {
        const purchaseSupplierId = typeof p.supplier === 'object' ? p.supplier?.id : p.supplier;
        return purchaseSupplierId == id; // Use == for loose comparison in case of string/number mismatch
      });
      
      setPurchases(filteredPurchases);
    } catch (err) {
      console.error('Error fetching supplier data:', err);
      addToast(t('suppliers.failedToFetchDetails') || 'Failed to fetch supplier data', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchBalancePayments = async () => {
    try {
      const res = await api.get(`/api/supplier-balance-payments/?supplier=${id}`);
      const payments = Array.isArray(res.data) ? res.data : res.data.results || [];
      setBalancePayments(payments);
    } catch (err) {
      console.error('Error fetching balance payments:', err);
    }
  };

  const handleDownloadPDF = async () => {
    const selectedStatuses = Object.keys(pdfFilters).filter(key => pdfFilters[key]).join(',');
    if (!selectedStatuses) {
        addToast(t('common.select') || 'Please select at least one status', 'error');
      return;
    }

    setPdfLoading(true);
    try {
      const response = await api.get(`/api/suppliers/${id}/ledger_pdf/?statuses=${selectedStatuses}`, { responseType: 'blob' });
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `Ledger_${supplier.name}_${new Date().toISOString().split('T')[0]}.pdf`);
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      addToast(t('common.savedSuccess') || 'PDF downloaded successfully', 'success');
      setShowPdfFilter(false);
    } catch (err) {
      console.error('Error downloading PDF:', err);
      addToast(t('common.unknownError') || 'Failed to download PDF', 'error');
    } finally {
      setPdfLoading(false);
    }
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    let purchaseIds = [];
    let totalDue = 0;

    if (paymentType === 'specific') {
      if (selectedPurchases.size === 0) {
        addToast(t('suppliers.selectBillRequired') || 'Please select at least one bill', 'error');
        return;
      }
      purchaseIds = Array.from(selectedPurchases);
      totalDue = purchaseIds.reduce((sum, id) => {
        const p = filteredPurchases.find(p => p.id === id);
        if (!p) return sum;
        const cost = parseFloat(p.cost || 0);
        const paid = parseFloat(p.total_paid || 0);
        const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null 
          ? parseFloat(p.remaining_amount) 
          : (cost - paid);
        return sum + Math.max(0, remaining);
      }, 0);
    } else if (paymentType === 'all') {
      const unpaidPurchases = filteredPurchases.filter((p) => {
        const cost = parseFloat(p.cost || 0);
        const paid = parseFloat(
          p.total_paid ||
          (p.payments && Array.isArray(p.payments)
            ? p.payments.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0)
            : 0)
        );
        const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null
          ? parseFloat(p.remaining_amount)
          : (cost - paid);
        return Math.max(0, remaining) > 0;
      });
      purchaseIds = unpaidPurchases.map(p => p.id);
      totalDue = unpaidPurchases.reduce((sum, p) => {
        const cost = parseFloat(p.cost || 0);
        const paid = parseFloat(p.total_paid || 0);
        const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null 
          ? parseFloat(p.remaining_amount) 
          : (cost - paid);
        return sum + Math.max(0, remaining);
      }, 0);
    }

    if (paymentData.paymentMode === 'fixed') {
      if (!paymentData.amount || parseFloat(paymentData.amount) <= 0) {
        addToast(t('customers.enterValidAmount') || 'Please enter a valid amount', 'error');
        return;
      }
    }

    setPaymentLoading(true);
    try {
      if (paymentData.paymentMode === 'full') {
        for (const purchaseId of purchaseIds) {
          const purchase = filteredPurchases.find(p => p.id === purchaseId);
          await api.post('/api/payments/', {
            purchase: purchaseId,
            amount: parseFloat(purchase.remaining_amount),
            payment_method: paymentData.payment_method,
            reference: paymentData.reference
          });
        }
      } else {
        const amountPerBill = parseFloat(paymentData.amount) / purchaseIds.length;
        for (const purchaseId of purchaseIds) {
          const purchase = filteredPurchases.find(p => p.id === purchaseId);
          const payAmount = Math.min(amountPerBill, parseFloat(purchase.remaining_amount));
          await api.post('/api/payments/', {
            purchase: purchaseId,
            amount: payAmount,
            payment_method: paymentData.payment_method,
            reference: paymentData.reference
          });
        }
      }
      addToast(t('sales.paymentAdded') || 'Payment recorded successfully', 'success');
      
      // Show payment receipt for the last payment made
      if (purchaseIds.length > 0) {
        const lastPurchaseId = purchaseIds[purchaseIds.length - 1];
        const lastPurchase = filteredPurchases.find(p => p.id === lastPurchaseId);
        const paymentAmount = paymentData.paymentMode === 'full' 
          ? parseFloat(lastPurchase.remaining_amount)
          : parseFloat(paymentData.amount) / purchaseIds.length;
        
        // Get payment history for this purchase (excluding the current payment)
        const paymentHistory = lastPurchase.payments && lastPurchase.payments.length > 0
          ? lastPurchase.payments.map(p => ({
              date: p.payment_date,
              amount: p.amount
            }))
          : [];
        
        setReceiptData({
          id: `PAY-${Date.now()}`,
          type: 'supplier',
          supplier_name: supplier.name,
          phone: supplier.phone,
          payment_date: new Date().toISOString(),
          created_at: new Date().toISOString(),
          item_name: purchaseIds.length > 1 
            ? `پرداخت برای ${purchaseIds.length} خرید` 
            : lastPurchase.item_name,
          payment_method: paymentData.payment_method,
          reference: paymentData.reference,
          total_amount: filteredPurchases
            .filter(p => purchaseIds.includes(p.id))
            .reduce((sum, p) => sum + parseFloat(p.cost || 0), 0),
          previous_paid: filteredPurchases
            .filter(p => purchaseIds.includes(p.id))
            .reduce((sum, p) => sum + parseFloat(p.total_paid || 0), 0),
          payment_history: paymentHistory,
          amount: paymentData.paymentMode === 'full'
            ? filteredPurchases
                .filter(p => purchaseIds.includes(p.id))
                .reduce((sum, p) => sum + parseFloat(p.remaining_amount || 0), 0)
            : parseFloat(paymentData.amount),
          amount_paid: paymentData.paymentMode === 'full'
            ? filteredPurchases
                .filter(p => purchaseIds.includes(p.id))
                .reduce((sum, p) => sum + parseFloat(p.remaining_amount || 0), 0)
            : parseFloat(paymentData.amount),
          remaining_amount: paymentData.paymentMode === 'full'
            ? 0
            : filteredPurchases
                .filter(p => purchaseIds.includes(p.id))
                .reduce((sum, p) => sum + parseFloat(p.remaining_amount || 0), 0) - parseFloat(paymentData.amount),
          notes: paymentData.reference
        });
        setShowPaymentReceipt(true);
      }
      
      setShowPaymentForm(false);
      setPaymentData({ amount: '', payment_method: 'cash', reference: '', paymentMode: 'full' });
      setSelectedPurchases(new Set());
      setPaymentType('specific');
      fetchSupplierData();
    } catch (err) {
      console.error('Error recording payment:', err);
      addToast(t('sales.failedToAddPayment') || 'Failed to record payment', 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const filteredPurchases = purchases.filter(p => !filterStatus || p.payment_status === filterStatus);
  
  const openEditPaymentDialog = (payment, type) => {
    const currentAmount = parseFloat(payment.amount || 0);
    setPaymentEditDialog({
      open: true,
      type,
      payment,
      amount: currentAmount.toFixed(2),
      notes: payment.notes || '',
      title: type === 'balance' ? (t('suppliers.updatePrevBalancePayment') || 'Enter updated previous balance payment amount') : (t('suppliers.updatePaymentAmount') || 'Enter updated payment amount')
    });
  };

  const closeEditPaymentDialog = () => {
    setPaymentEditDialog({
      open: false,
      type: 'purchase',
      payment: null,
      amount: '',
      notes: '',
      title: ''
    });
  };

  const submitEditPaymentDialog = async () => {
    const amount = parseFloat(paymentEditDialog.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast(t('customers.enterValidAmount') || 'Please enter a valid amount', 'error');
      return;
    }
    try {
      if (paymentEditDialog.type === 'balance') {
        await api.patch(`/api/supplier-balance-payments/${paymentEditDialog.payment.id}/`, {
          amount,
          notes: paymentEditDialog.notes || ''
        });
        addToast(t('suppliers.prevBalancePaymentUpdated') || 'Previous balance payment updated successfully', 'success');
      } else {
        await api.patch(`/api/payments/${paymentEditDialog.payment.id}/`, {
          amount,
          notes: paymentEditDialog.notes || ''
        });
        addToast(t('sales.paymentUpdatedSuccess') || 'Payment updated successfully', 'success');
      }
      closeEditPaymentDialog();
      fetchSupplierData();
      if (paymentEditDialog.type === 'balance') {
        fetchBalancePayments();
      }
    } catch (err) {
      console.error('Error updating payment:', err);
      addToast(
        paymentEditDialog.type === 'balance'
          ? (t('suppliers.prevBalancePaymentUpdateFailed') || 'Failed to update previous balance payment')
          : (t('sales.paymentUpdateFailed') || 'Failed to update payment'),
        'error'
      );
    }
  };

  const handleDeletePurchasePayment = async (payment) => {
    setDeletePaymentDialog({ open: true, payment });
  };

  const confirmDeletePurchasePayment = async () => {
    if (!deletePaymentDialog.payment) return;
    try {
      await api.delete(`/api/payments/${deletePaymentDialog.payment.id}/`);
      addToast(t('common.deletedSuccess') || 'Payment deleted successfully', 'success');
      fetchSupplierData();
      setDeletePaymentDialog({ open: false, payment: null });
    } catch (err) {
      console.error('Error deleting purchase payment:', err);
      addToast(t('sales.paymentCancelFailed') || 'Failed to delete payment', 'error');
    }
  };

  const handleDeleteBalancePayment = async (payment) => {
    setDeleteBalanceDialog({ open: true, payment });
  };

  const confirmDeleteBalancePayment = async () => {
    if (!deleteBalanceDialog.payment) return;
    try {
      await api.delete(`/api/supplier-balance-payments/${deleteBalanceDialog.payment.id}/`);
      addToast(t('suppliers.prevBalancePaymentDeleted') || 'Previous balance payment deleted successfully', 'success');
      fetchSupplierData();
      fetchBalancePayments();
      setDeleteBalanceDialog({ open: false, payment: null });
    } catch (err) {
      console.error('Error deleting balance payment:', err);
      addToast(t('suppliers.prevBalancePaymentDeleteFailed') || 'Failed to delete previous balance payment', 'error');
    }
  };
  
  const sortedFilteredPurchases = [...filteredPurchases].sort(
    (a, b) => new Date(b.purchase_date || 0) - new Date(a.purchase_date || 0)
  );
  const totalPages = Math.max(1, Math.ceil(sortedFilteredPurchases.length / itemsPerPage));
  const paginatedPurchases = sortedFilteredPurchases.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );

  const sortedBalancePayments = [...balancePayments].sort(
    (a, b) =>
      new Date(b.payment_date || b.created_at || 0) - new Date(a.payment_date || a.created_at || 0)
  );
  const balancePaymentsTotalPages = Math.max(
    1,
    Math.ceil(sortedBalancePayments.length / balancePaymentsPerPage)
  );
  const paginatedBalancePayments = sortedBalancePayments.slice(
    (balancePaymentsPage - 1) * balancePaymentsPerPage,
    balancePaymentsPage * balancePaymentsPerPage
  );

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" /></div>;
  if (!supplier) return <div className="text-center py-8"><p className="text-gray-500">{t('suppliers.noSuppliersFound')}</p></div>;

  const getTotalDue = () => {
    return purchases.reduce((sum, p) => {
      const cost = parseFloat(p.cost || 0);
      const paid = parseFloat(p.total_paid || (p.payments && Array.isArray(p.payments) ? p.payments.reduce((s, pay) => s + parseFloat(pay.amount || 0), 0) : 0));
      const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null 
        ? parseFloat(p.remaining_amount) 
        : (cost - paid);
      return sum + Math.max(0, remaining);
    }, 0).toFixed(2);
  };
  
  const getTotalPaid = () => {
    return purchases.reduce((sum, p) => {
      return sum + parseFloat(p.total_paid || (p.payments && Array.isArray(p.payments) ? p.payments.reduce((s, pay) => s + parseFloat(pay.amount || 0), 0) : 0));
    }, 0).toFixed(2);
  };

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl relative overflow-hidden mb-3">
        {/* Decorative shapes */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-50" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-30" />
        
        <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-3 relative z-10">
          <div className="flex items-center gap-3">
            <button onClick={() => navigate('/suppliers')} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white transition-colors">
              <ArrowLeftIcon className="h-5 w-5" />
            </button>
            <div>
              <h1 className="text-lg font-bold text-gray-900 dark:text-white">{supplier.name}</h1>
              <p className="text-xs text-gray-600 dark:text-gray-400">{supplier.phone || t('common.notAvailable')}</p>
            </div>
          </div>
          <div className="flex gap-2 flex-wrap">
            <button 
              onClick={() => {
                try {
                  api.get(`/api/payments/?purchase__supplier=${id}`).then(res => {
                    const payments = Array.isArray(res.data) ? res.data : res.data.results || [];
                    exportSupplierToPDF(supplier, purchases, payments);
                  }).catch(() => {
                    exportSupplierToPDF(supplier, purchases, []);
                  });
                } catch (error) {
                  console.error('Error exporting PDF:', error);
                  addToast(`Failed to export PDF: ${error.message}`, 'error');
                }
              }} 
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              title={t('reportsPage.exportToPdf')}
            >
              <DocumentArrowDownIcon className="h-3.5 w-3.5" />{t('reportsPage.exportPdf')}
            </button>
            <button 
              onClick={() => setShowPaymentForm(true)} 
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />{t('sales.addPayment')}
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
              <div className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('customers.previousBalance')}</div>
              <div className={`text-lg font-bold leading-tight tabular-nums ${
                parseFloat(supplier.previous_balance_remaining || 0) > 0
                  ? 'text-red-600 dark:text-red-400'
                  : 'text-green-600 dark:text-green-400'
              }`}>
                AFN {(parseFloat(supplier.previous_balance_remaining || 0)).toFixed(2)}
              </div>
              <div className="text-[9px] text-purple-600 dark:text-purple-400 mt-0.5 leading-snug">
                {t('common.total')}: AFN {(parseFloat(supplier.previous_balance || 0)).toFixed(2)}
                {supplier.previous_balance_reference && (
                  <span className="ml-2">| Ref: {supplier.previous_balance_reference}</span>
                )}
              </div>
            </div>
            <button
              onClick={() => {
                setPrevBalanceAction('edit');
                setBalancePaymentData({
                  amount: String(parseFloat(supplier.previous_balance || 0)),
                  notes: '',
                  reference: supplier.previous_balance_reference || ''
                });
                setShowBalancePaymentModal(true);
              }}
              className="p-1 text-[10px] bg-blue-600 text-white rounded hover:bg-blue-700 shrink-0"
              title={t('common.edit')}
            >
              <PencilIcon className="h-3.5 w-3.5" />
            </button>
            <button
              onClick={() => {
                setPrevBalanceAction('add');
                setBalancePaymentData({ amount: '', notes: '', reference: '' });
                setShowBalancePaymentModal(true);
              }}
              className="p-1 text-[10px] bg-purple-600 text-white rounded hover:bg-purple-700 shrink-0"
              title={t('common.add')}
            >
              <PlusIcon className="h-3.5 w-3.5" />
            </button>
          </div>
          {typeof supplier.previous_balance_remaining !== 'undefined' && parseFloat(supplier.previous_balance || 0) > 0 && (
            <div className="mt-1 pt-1 border-t border-purple-200 dark:border-purple-700">
              <div className="flex justify-between items-center text-[10px] leading-tight">
                <span className="text-purple-700 dark:text-purple-300">{t('reportsPage.paid')}:</span>
                <span className="font-semibold text-green-600 dark:text-green-400">
                  AFN {(parseFloat(supplier.previous_balance_paid || 0)).toFixed(2)}
                </span>
              </div>
            </div>
          )}
          {parseFloat(supplier.previous_balance_remaining || 0) > 0 && (
            <button
              onClick={() => {
                setPrevBalanceAction('pay');
                setBalancePaymentData({ amount: '', notes: '', reference: '' });
                setShowBalancePaymentModal(true);
              }}
              className="mt-1.5 w-full px-2 py-1 text-[10px] rounded-md bg-green-600 text-white hover:bg-green-700 leading-tight"
            >
              {t('customers.payPreviousBalance')}
            </button>
          )}
        </div>

        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-blue-500 flex flex-col justify-center min-h-0">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-blue-700/25 dark:bg-blue-400/20 rounded-full pointer-events-none" />
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('reportsPage.totalPurchases')}</p>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums leading-tight">AFN {purchases.reduce((sum, p) => sum + parseFloat(p.cost || 0), 0).toFixed(2)}</div>
        </div>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-green-500 flex flex-col justify-center min-h-0">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-green-700/25 dark:bg-green-400/20 rounded-full pointer-events-none" />
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('reportsPage.paid')}</p>
          <div className="text-base font-bold text-green-600 dark:text-green-400 tabular-nums leading-tight">AFN {getTotalPaid()}</div>
        </div>
        <div className="relative overflow-hidden bg-white dark:bg-gray-800 px-2.5 py-2 rounded-lg shadow-sm border-l-4 border-red-500 flex flex-col justify-center min-h-0">
          <div className="absolute -top-4 -right-4 w-14 h-14 bg-red-700/25 dark:bg-red-400/20 rounded-full pointer-events-none" />
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('reportsPage.due')}</p>
          <div className="text-base font-bold text-red-600 dark:text-red-400 tabular-nums leading-tight">AFN {getTotalDue()}</div>
        </div>
      </div>

      <div className="bg-white p-4 rounded-xl shadow space-y-4">
        <div className="flex flex-col sm:flex-row gap-4 items-center justify-between">
          <select value={filterStatus} onChange={(e) => { setFilterStatus(e.target.value); setCurrentPage(1); }} className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg px-3 py-2 focus:outline-none focus:ring-2 focus:ring-blue-500">
            <option value="">{t('common.all')}</option>
            <option value="paid">{t('purchases.paid')}</option>
            <option value="partial">{t('purchases.partial')}</option>
            <option value="due">{t('purchases.due')}</option>
          </select>
        </div>
      </div>

      {/* Purchase History */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700"><h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('suppliers.billHistory') || 'Bill History'}</h2></div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('purchases.billNumber')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('purchases.item')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('sales.quantity')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.cost')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('reportsPage.paid')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('reportsPage.due')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('purchases.purchaseDate')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.status')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('common.actions')}</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-200 dark:divide-gray-700 text-gray-900 dark:text-gray-300">
              {sortedFilteredPurchases.length === 0 ? (
                <tr>
                  <td colSpan={9} className="px-3 py-4 text-center text-gray-500 dark:text-gray-400">
                    {t('purchases.noPurchasesFound')}
                  </td>
                </tr>
              ) : (
              paginatedPurchases.map((purchase) => {
                  const billNumber = purchase.bill_number || `AF-${String(purchase.id || 0).padStart(2, '0')}`;
                  
                  const totalCost = parseFloat(purchase.cost || 0);
                  const totalPaid = parseFloat(purchase.total_paid || 
                    (purchase.payments && Array.isArray(purchase.payments) 
                      ? purchase.payments.reduce((sum, p) => sum + parseFloat(p.amount || 0), 0)
                      : 0));
                  const remainingAmount = purchase.remaining_amount !== undefined && purchase.remaining_amount !== null
                    ? parseFloat(purchase.remaining_amount)
                    : (totalCost - totalPaid);
                  
                  const hasPayments = purchase.payments && purchase.payments.length > 0;
                  
                  return (
                    <React.Fragment key={`purchase-${purchase.id}`}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2">
                          <button
                            onClick={() => navigate(`/purchases/${purchase.id}`)}
                            className="px-2 py-1 rounded-full text-xs font-semibold bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300 hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                            title={t('common.view')}
                          >
                            {billNumber}
                          </button>
                          <button
                            onClick={() => navigate(`/purchases/${purchase.id}/edit`)}
                            className="ml-2 px-2 py-1 rounded-full text-xs font-semibold bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300 hover:bg-blue-200 dark:hover:bg-blue-900/50 transition-colors"
                            title={t('common.edit')}
                          >
                            {t('common.edit')}
                          </button>
                        </td>
                        <td className="px-3 py-2">{purchase.item_name || t('common.notAvailable')}</td>
                        <td className="px-3 py-2">{purchase.quantity || t('common.notAvailable')}</td>
                        <td className="px-3 py-2">AFN {totalCost.toFixed(2)}</td>
                        <td className="px-3 py-2 text-green-600 dark:text-green-400">AFN {totalPaid.toFixed(2)}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">AFN {Math.max(0, remainingAmount).toFixed(2)}</td>
                        <td className="px-3 py-2">{purchase.purchase_date ? formatDate(purchase.purchase_date) : '-'}</td>
                        <td className="px-3 py-2"><span className={`px-2 py-0.5 rounded-full text-xs font-medium ${purchase.payment_status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' : purchase.payment_status === 'partial' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300' : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'}`}>{purchase.payment_status === 'paid' ? t('purchases.paid') : purchase.payment_status === 'partial' ? t('purchases.partial') : t('purchases.due')}</span></td>
                        <td className="px-3 py-2">
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => {
                                // Get payment history for this purchase
                                const paymentHistory = purchase.payments && purchase.payments.length > 0
                                  ? purchase.payments.map(p => ({
                                      date: p.payment_date,
                                      amount: p.amount
                                    }))
                                  : [];
                                
                                setReceiptData({
                                  id: `PUR-${purchase.id}`,
                                  type: 'supplier',
                                  supplier_name: supplier.name,
                                  phone: supplier.phone,
                                  payment_date: purchase.purchase_date,
                                  created_at: purchase.purchase_date,
                                  item_name: purchase.item_name,
                                  payment_method: 'Cash',
                                  reference: billNumber,
                                  total_amount: totalCost,
                                  previous_paid: 0,
                                  payment_history: paymentHistory,
                                  amount: totalPaid,
                                  amount_paid: totalPaid,
                                  remaining_amount: Math.max(0, remainingAmount),
                                  notes: purchase.description || ''
                                });
                                setShowPaymentReceipt(true);
                              }}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title={t('common.print')}
                            >
                              <PrinterIcon className="h-4 w-4" />
                            </button>
                          </div>
                        </td>
                      </tr>
                      
                      {/* Payment History Rows */}
                      {hasPayments && purchase.payments.map((payment, idx) => (
                        <tr key={`payment-${purchase.id}-${idx}`} className="bg-blue-50 dark:bg-blue-900/10">
                          <td className="px-3 py-2 pl-8 text-xs text-gray-500 dark:text-gray-400" colSpan="3">
                            <span className="text-blue-600 dark:text-blue-400">↳ {t('common.payment')} #{idx + 1}</span>
                          </td>
                          <td className="px-3 py-2 text-xs">-</td>
                          <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
                            AFN {parseFloat(payment.amount || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs">-</td>
                          <td className="px-3 py-2 text-xs">
                            {payment.payment_date ? formatDate(payment.payment_date) : '-'}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <span className="text-gray-500 dark:text-gray-400">{payment.payment_method || t('printing.cash')}</span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <div className="flex items-center gap-1">
                              {payment.reference && (
                                <span className="text-gray-500 dark:text-gray-400" title={payment.reference}>
                                  {payment.reference.length > 10 ? payment.reference.substring(0, 10) + '...' : payment.reference}
                                </span>
                              )}
                              {payment.notes && (
                                <span className="text-gray-500 dark:text-gray-400" title={payment.notes}>
                                  {payment.notes.length > 12 ? payment.notes.substring(0, 12) + '...' : payment.notes}
                                </span>
                              )}
                              <button
                                onClick={() => openEditPaymentDialog(payment, 'purchase')}
                                className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                                title={t('common.edit')}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                onClick={() => handleDeletePurchasePayment(payment)}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title={t('common.delete')}
                              >
                                <TrashIcon className="h-3.5 w-3.5" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))}
                    </React.Fragment>
                  );
              }))}
            </tbody>
          </table>
        </div>
        {sortedFilteredPurchases.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('customers.ledger.showing')}{' '}
              {(currentPage - 1) * itemsPerPage + 1} {t('customers.ledger.to')}{' '}
              {Math.min(currentPage * itemsPerPage, sortedFilteredPurchases.length)} {t('customers.ledger.of')}{' '}
              {sortedFilteredPurchases.length} ({itemsPerPage} {t('customers.ledger.perPage')})
            </div>
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => setCurrentPage(Math.max(1, currentPage - 1))}
                disabled={currentPage === 1}
                className="p-1.5 border rounded-lg disabled:opacity-50 dark:border-gray-600"
              >
                <ChevronLeftIcon className="h-4 w-4" />
              </button>
              {[...Array(totalPages)].map((_, i) => (
                <button
                  type="button"
                  key={i + 1}
                  onClick={() => setCurrentPage(i + 1)}
                  className={`px-2 py-1 text-xs border rounded-lg ${
                    currentPage === i + 1
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'hover:bg-gray-50 dark:hover:bg-gray-700 dark:border-gray-600'
                  }`}
                >
                  {i + 1}
                </button>
              ))}
              <button
                type="button"
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

      {/* Previous balance payments (paginated separately from bills) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600 mt-4">
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
                      AFN {(parseFloat(payment.amount || 0)).toFixed(2)}
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

      {showPdfFilter && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-lg font-semibold mb-4">{t('reportsPage.filters')}</h3>
            <div className="space-y-3 mb-6">
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <input type="checkbox" checked={pdfFilters.paid} onChange={(e) => setPdfFilters({...pdfFilters, paid: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm font-medium">Paid</span>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <input type="checkbox" checked={pdfFilters.partial} onChange={(e) => setPdfFilters({...pdfFilters, partial: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm font-medium">Partial</span>
              </label>
              <label className="flex items-center gap-3 p-3 border rounded-lg hover:bg-gray-50">
                <input type="checkbox" checked={pdfFilters.due} onChange={(e) => setPdfFilters({...pdfFilters, due: e.target.checked})} className="w-4 h-4" />
                <span className="text-sm font-medium">Unpaid</span>
              </label>
            </div>
            <div className="flex gap-3"><button onClick={handleDownloadPDF} disabled={pdfLoading} className="flex-1 bg-green-600 text-white py-2 px-4 rounded hover:bg-green-700 disabled:opacity-50">{pdfLoading ? (t('common.loading') || 'Generating...') : (t('reportsPage.exportPdf') || 'Download PDF')}</button><button onClick={() => setShowPdfFilter(false)} className="flex-1 bg-gray-300 text-gray-700 py-2 px-4 rounded hover:bg-gray-400">{t('common.cancel')}</button></div>
          </div>
        </div>
      )}

      {showPaymentForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white p-6 rounded-lg shadow-xl max-w-2xl w-full">
            <h3 className="text-lg font-semibold mb-4">{t('sales.addPayment')}</h3>
            <form onSubmit={handlePayment} className="space-y-4">
              <div className="grid grid-cols-4 gap-3">
                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('common.type')}</label>
                  <select value={paymentType} onChange={(e) => { setPaymentType(e.target.value); setSelectedPurchases(new Set()); }} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="specific">{t('suppliers.paySpecificBills') || 'Pay Specific Bills'}</option>
                    <option value="all">{t('suppliers.payAllDue') || 'Pay All Due'}</option>
                  </select>
                </div>

                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('customers.ledger.paymentMode')}</label>
                  <select value={paymentData.paymentMode} onChange={(e) => setPaymentData({...paymentData, paymentMode: e.target.value})} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500">
                    <option value="full">{t('customers.ledger.fullPayment')}</option>
                    <option value="fixed">{t('suppliers.fixedAmount') || 'Pay Fixed Amount'}</option>
                  </select>
                </div>

                {paymentData.paymentMode === 'fixed' && (
                  <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('common.amount')}</label><input type="number" step="0.01" value={paymentData.amount} onChange={(e) => setPaymentData({...paymentData, amount: e.target.value})} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('customers.amountPlaceholder')} /></div>
                )}

                <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('sales.paymentMethod')}</label><select value={paymentData.payment_method} onChange={(e) => setPaymentData({...paymentData, payment_method: e.target.value})} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"><option value="cash">{t('printing.cash')}</option><option value="card">{t('suppliers.card') || 'Card'}</option><option value="bank_transfer">{t('suppliers.bankTransfer') || 'Bank Transfer'}</option><option value="check">{t('suppliers.check') || 'Check'}</option></select></div>
              </div>

              {paymentType === 'specific' && (
                <div><label className="block text-xs font-medium text-gray-700 mb-2">{t('suppliers.selectBills') || 'Select Bills'}</label>
                  <div className="max-h-24 overflow-y-auto border rounded-lg p-2 bg-gray-50">
                    <div className="grid grid-cols-2 gap-2">
                      {filteredPurchases.filter((p) => {
                        const cost = parseFloat(p.cost || 0);
                        const paid = parseFloat(
                          p.total_paid ||
                          (p.payments && Array.isArray(p.payments)
                            ? p.payments.reduce((sum, pay) => sum + parseFloat(pay.amount || 0), 0)
                            : 0)
                        );
                        const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null
                          ? parseFloat(p.remaining_amount)
                          : (cost - paid);
                        return Math.max(0, remaining) > 0;
                      }).map(p => {
                        const cost = parseFloat(p.cost || 0);
                        const paid = parseFloat(p.total_paid || 0);
                        const remaining = p.remaining_amount !== undefined && p.remaining_amount !== null 
                          ? parseFloat(p.remaining_amount) 
                          : (cost - paid);
                        return (
                          <label key={p.id} className="flex items-center gap-2 p-1 hover:bg-white rounded text-sm">
                            <input type="checkbox" checked={selectedPurchases.has(p.id)} onChange={(e) => { const newSet = new Set(selectedPurchases); e.target.checked ? newSet.add(p.id) : newSet.delete(p.id); setSelectedPurchases(newSet); }} />
                            <span>{p.item_name} - AFN {Math.max(0, remaining).toFixed(2)}</span>
                          </label>
                        );
                      })}
                    </div>
                  </div>
                </div>
              )}

              <div><label className="block text-xs font-medium text-gray-700 mb-1">{t('purchases.reference')}</label><input type="text" value={paymentData.reference} onChange={(e) => setPaymentData({...paymentData, reference: e.target.value})} className="w-full px-2 py-2 text-sm border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('customers.ledger.optional')} /></div>

              <div className="flex gap-3 pt-2">
                <button type="submit" disabled={paymentLoading} className="btn-form-green flex-1 text-sm disabled:opacity-50">{paymentLoading ? t('customers.ledger.processing') : t('sales.addPayment')}</button>
                <button type="button" onClick={() => { setShowPaymentForm(false); setPaymentData({ amount: '', payment_method: 'cash', reference: '', paymentMode: 'full' }); setSelectedPurchases(new Set()); setPaymentType('specific'); }} className="btn-form-red flex-1 text-sm">{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {showBalancePaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <div className="flex items-center justify-between mb-4">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">
                {prevBalanceAction === 'pay'
                  ? t('customers.payPreviousBalance')
                  : prevBalanceAction === 'add'
                    ? (t('suppliers.addPreviousBalance') || 'Add Previous Balance')
                    : (t('suppliers.editPreviousBalance') || 'Edit Previous Balance')}
              </h3>
            </div>

            {prevBalanceAction === 'pay' && (
              <div className="mb-4 p-3 bg-purple-50 dark:bg-purple-900/20 rounded-lg border border-purple-200 dark:border-purple-700">
                <p className="text-sm text-gray-700 dark:text-gray-300">
                  <span className="font-semibold">Current Remaining Balance:</span> AFN {(parseFloat(supplier.previous_balance_remaining || 0)).toFixed(2)}
                </p>
              </div>
            )}

            <form onSubmit={async (e) => {
              e.preventDefault();
              const amount = parseFloat(balancePaymentData.amount);
              
              if (!amount || amount <= 0) {
                addToast('Please enter a valid amount', 'error');
                return;
              }

              if (prevBalanceAction === 'pay') {
                const remaining = parseFloat(supplier.previous_balance_remaining || 0);
                if (amount > remaining) {
                  addToast(`Amount cannot exceed remaining balance (AFN ${remaining.toFixed(2)})`, 'error');
                  return;
                }
              }

              setIsPayingPrevBalance(true);
              try {
                if (prevBalanceAction === 'pay') {
                  // Use the same endpoint pattern as customer
                  const res = await api.post(`/api/suppliers/${id}/pay_previous_balance/`, {
                    amount: amount,
                    notes: balancePaymentData.notes,
                    reference: balancePaymentData.reference
                  });
                  const updated = res.data.supplier || res.data;
                  setSupplier(updated);
                  
                  // Add a payment record to the balance payments list for display
                  const newPayment = {
                    id: Date.now(),
                    supplier: parseInt(id),
                    amount: amount,
                    payment_date: new Date().toISOString(),
                    notes: balancePaymentData.notes || 'پرداخت باقی‌مانده قبلی'
                  };
                  console.log('Adding new balance payment:', newPayment);
                  setBalancePayments(prev => {
                    const updated = [newPayment, ...prev];
                    console.log('Updated balance payments:', updated);
                    return updated;
                  });
                  
                  // Show payment receipt
                  setReceiptData({
                    id: newPayment.id,
                    type: 'supplier',
                    supplier_name: supplier.name,
                    phone: supplier.phone,
                    payment_date: newPayment.payment_date,
                    created_at: newPayment.payment_date,
                    item_name: 'پرداخت باقی‌مانده قبلی',
                    payment_method: 'Cash',
                    reference: balancePaymentData.notes,
                    total_amount: supplier.previous_balance,
                    previous_paid: parseFloat(supplier.previous_balance_paid || 0),
                    payment_history: balancePayments.map(p => ({
                      date: p.payment_date,
                      amount: p.amount
                    })),
                    amount: amount,
                    amount_paid: amount,
                    remaining_amount: parseFloat(updated.previous_balance_remaining || 0),
                    notes: balancePaymentData.notes
                  });
                  setShowPaymentReceipt(true);
                  
                  addToast('Previous balance payment recorded successfully', 'success');
                } else if (prevBalanceAction === 'add') {
                  // Add to previous balance
                  const newBalance = parseFloat(supplier.previous_balance || 0) + amount;
                  const res = await api.patch(`/api/suppliers/${id}/`, {
                    previous_balance: newBalance,
                    previous_balance_reference: balancePaymentData.reference
                  });
                  setSupplier(res.data);
                  addToast('Previous balance added successfully', 'success');
                } else {
                  const res = await api.patch(`/api/suppliers/${id}/`, {
                    previous_balance: amount,
                    previous_balance_reference: balancePaymentData.reference
                  });
                  setSupplier(res.data);
                  addToast('Previous balance updated successfully', 'success');
                }
                setShowBalancePaymentModal(false);
                setBalancePaymentData({ amount: '', notes: '', reference: '' });
                // Wait a moment for backend to process
                await new Promise(resolve => setTimeout(resolve, 500));
                fetchSupplierData();
                fetchBalancePayments();
              } catch (err) {
                console.error('Error updating previous balance:', err);
                const msg = err.response?.data?.error || err.response?.data?.detail || 'Failed to update previous balance';
                addToast(msg, 'error');
              } finally {
                setIsPayingPrevBalance(false);
              }
            }} className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                  Amount (AFN) *
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={balancePaymentData.amount}
                  onChange={(e) => setBalancePaymentData({...balancePaymentData, amount: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter amount"
                  required
                  autoFocus
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('purchases.reference')}</label>
                <input
                  type="text"
                  value={balancePaymentData.reference}
                  onChange={(e) => setBalancePaymentData({...balancePaymentData, reference: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  placeholder="Enter reference number (optional)"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.notes')}</label>
                <textarea
                  value={balancePaymentData.notes}
                  onChange={(e) => setBalancePaymentData({...balancePaymentData, notes: e.target.value})}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-purple-500"
                  rows="2"
                  placeholder="Optional notes"
                />
              </div>
              <div className="flex gap-3">
                <button
                  type="button"
                  onClick={() => {
                    setShowBalancePaymentModal(false);
                    setBalancePaymentData({ amount: '', notes: '', reference: '' });
                  }}
                  className="btn-form-red flex-1 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={isPayingPrevBalance}
                  className="btn-form-green flex-1 text-sm disabled:opacity-50"
                >
                  {isPayingPrevBalance
                    ? t('customers.ledger.processing')
                    : prevBalanceAction === 'pay'
                      ? 'Pay Balance'
                      : prevBalanceAction === 'add'
                        ? 'Add Balance'
                        : (t('common.save') || 'Update Balance')
                  }
                </button>
              </div>
            </form>
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

      {deleteBalanceDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('suppliers.deletePrevBalancePayment') || 'Delete Previous Balance Payment'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              {t('suppliers.confirmDeletePrevBalancePayment') || 'Are you sure you want to delete this previous balance payment?'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeleteBalanceDialog({ open: false, payment: null })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeleteBalancePayment}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {deletePaymentDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-base font-semibold text-gray-900 dark:text-white mb-3">
              {t('suppliers.deletePayment') || 'Delete Payment'}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">
              {t('suppliers.confirmDeletePayment') || 'Are you sure you want to delete this payment?'}
            </p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={() => setDeletePaymentDialog({ open: false, payment: null })}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeletePurchasePayment}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {paymentEditDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold mb-4 text-gray-900 dark:text-white">{paymentEditDialog.title}</h3>
            <div className="space-y-3">
              <input
                type="number"
                step="0.01"
                min="0"
                value={paymentEditDialog.amount}
                onChange={(e) => setPaymentEditDialog((prev) => ({ ...prev, amount: e.target.value }))}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                autoFocus
              />
              <textarea
                value={paymentEditDialog.notes}
                onChange={(e) => setPaymentEditDialog((prev) => ({ ...prev, notes: e.target.value }))}
                rows="2"
                placeholder={t('common.notesPlaceholder')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-3 mt-5">
              <button
                type="button"
                onClick={closeEditPaymentDialog}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={submitEditPaymentDialog}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default SupplierLedger;
