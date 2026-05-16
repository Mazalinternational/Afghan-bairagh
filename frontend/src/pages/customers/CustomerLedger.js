import React, { useState, useEffect, useMemo } from 'react';
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

const paymentEntriesInclude = (list, e) =>
  list.some((x) => x.kind === e.kind && x.id === e.id);

const CustomerLedger = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const [customer, setCustomer] = useState(null);
  const [orders, setOrders] = useState([]);
  const [payments, setPayments] = useState([]);
  const [sales, setSales] = useState([]);
  const [directSales, setDirectSales] = useState([]);
  const [salePayments, setSalePayments] = useState([]);
  const [directSalePayments, setDirectSalePayments] = useState([]);
  const [balancePayments, setBalancePayments] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;
  const [balancePaymentsPage, setBalancePaymentsPage] = useState(1);
  const balancePaymentsPerPage = 5;
  const [showPaymentForm, setShowPaymentForm] = useState(false);
  const [paymentData, setPaymentData] = useState({ 
    /** @type {{ kind: 'order' | 'sale' | 'direct_sale', id: number }[]} */
    selectedPaymentEntries: [],
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
    payment_method: 'cash',
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

      let fetchedSales = [];
      let fetchedDirectSales = [];
      try {
        const [salesRes, directRes] = await Promise.all([
          api.get(`/api/sales/?customer=${id}`),
          api.get(`/api/direct-sales/?customer=${id}`)
        ]);
        fetchedSales = Array.isArray(salesRes.data) ? salesRes.data : salesRes.data.results || [];
        fetchedDirectSales = Array.isArray(directRes.data) ? directRes.data : directRes.data.results || [];
      } catch (salesErr) {
        console.error('Error fetching sales for ledger:', salesErr);
      }
      setSales(fetchedSales);
      setDirectSales(fetchedDirectSales);

      const saleIds = fetchedSales.map((s) => s.id);
      const directSaleIds = fetchedDirectSales.map((d) => d.id);
      try {
        const [allSalePayRes, allDirectPayRes] = await Promise.all([
          api.get('/api/sale-payments/'),
          api.get('/api/direct-sale-payments/')
        ]);
        const allSalePayments = Array.isArray(allSalePayRes.data)
          ? allSalePayRes.data
          : allSalePayRes.data.results || [];
        const allDirectPayments = Array.isArray(allDirectPayRes.data)
          ? allDirectPayRes.data
          : allDirectPayRes.data.results || [];
        const custSalePayments = allSalePayments.filter((p) => {
          const sid =
            p.sale_id ??
            (p.sale && typeof p.sale === 'object' ? p.sale.id : null) ??
            (typeof p.sale === 'number' ? p.sale : null);
          return sid && saleIds.includes(sid);
        });
        const custDirectPayments = allDirectPayments.filter((p) => {
          const did =
            p.direct_sale_id ??
            (p.direct_sale && typeof p.direct_sale === 'object' ? p.direct_sale.id : null) ??
            (typeof p.direct_sale === 'number' ? p.direct_sale : null);
          return did && directSaleIds.includes(did);
        });
        setSalePayments(custSalePayments);
        setDirectSalePayments(custDirectPayments);
      } catch (payErr) {
        console.error('Error fetching sale payments for ledger:', payErr);
        setSalePayments([]);
        setDirectSalePayments([]);
      }

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
          setPayments([]);
        }
      } else {
        setPayments([]);
      }
    } catch (err) {
      console.error('Error fetching customer data:', err);
      addToast(t('customers.ledger.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const isCancelledStatus = (status) =>
    String(status || '').toLowerCase() === 'cancelled';

  const getOrderDue = (o) => parseFloat(o?.due_amount ?? o?.due ?? 0) || 0;
  const getSaleDue = (s) => parseFloat(s?.due ?? 0) || 0;
  /** Ledger list can lag `due`; net − paid matches invoice balance for payments */
  const getDirectSaleDue = (d) => {
    if (!d || isCancelledStatus(d.status)) return 0;
    const net = parseFloat(d?.net_amount ?? d?.total_amount) || 0;
    const paid = parseFloat(d?.total_paid ?? 0) || 0;
    return Math.max(0, net - paid);
  };

  const getDueForPaymentEntry = (entry) => {
    if (entry.kind === 'order') {
      const o = orders.find((x) => x.id === entry.id);
      return o ? getOrderDue(o) : 0;
    }
    if (entry.kind === 'sale') {
      const s = sales.find((x) => x.id === entry.id);
      return s ? getSaleDue(s) : 0;
    }
    if (entry.kind === 'direct_sale') {
      const d = directSales.find((x) => x.id === entry.id);
      return d ? getDirectSaleDue(d) : 0;
    }
    return 0;
  };

  const buildPayableRowsForPicker = () => {
    const ord = orders.filter((o) => !isCancelledStatus(o.status));
    const ordWithDue = ord.filter((o) => getOrderDue(o) > 0);
    const saleRows = sales.filter((s) => !isCancelledStatus(s.status));
    const saleWithDue = saleRows.filter((s) => getSaleDue(s) > 0);
    const dirRows = directSales.filter((d) => !isCancelledStatus(d.status));
    const dirWithDue = dirRows.filter((d) => getDirectSaleDue(d) > 0);

    const displayOrders = ordWithDue.length > 0 ? ordWithDue : ord;
    const displaySales = saleWithDue.length > 0 ? saleWithDue : saleRows;
    const displayDirect = dirWithDue.length > 0 ? dirWithDue : dirRows;
    return { displayOrders, displaySales, displayDirect };
  };

  const allSelectablePaymentEntries = () => {
    const { displayOrders, displaySales, displayDirect } = buildPayableRowsForPicker();
    const withDue = [];
    displayOrders.forEach((o) => {
      if (getOrderDue(o) > 0) withDue.push({ kind: 'order', id: o.id });
    });
    displaySales.forEach((s) => {
      if (getSaleDue(s) > 0) withDue.push({ kind: 'sale', id: s.id });
    });
    displayDirect.forEach((d) => {
      if (getDirectSaleDue(d) > 0) withDue.push({ kind: 'direct_sale', id: d.id });
    });
    if (withDue.length > 0) return withDue;
    const fallback = [];
    displayOrders.forEach((o) => fallback.push({ kind: 'order', id: o.id }));
    displaySales.forEach((s) => fallback.push({ kind: 'sale', id: s.id }));
    displayDirect.forEach((d) => fallback.push({ kind: 'direct_sale', id: d.id }));
    return fallback;
  };

  const orderPaymentMethod = (ledgerLabel) =>
    ledgerLabel.toLowerCase().replace(/\s+/g, '_');

  const saleDirectPaymentMethod = (ledgerLabel) => {
    const m = ledgerLabel.toLowerCase().replace(/\s+/g, '_');
    if (m === 'cash') return 'cash';
    return 'credit';
  };

  const handlePayment = async (e) => {
    e.preventDefault();
    
    if (paymentData.selectedPaymentEntries.length === 0) {
      addToast(t('customers.ledger.selectInvoiceEntry'), 'error');
      return;
    }

    if (paymentData.paymentMode === 'partial' && (!paymentData.amount || parseFloat(paymentData.amount) <= 0)) {
      addToast(t('customers.ledger.validAmount'), 'error');
      return;
    }

    setPaymentLoading(true);
    try {
      const orderPm = orderPaymentMethod(paymentData.payment_method);
      const salePm = saleDirectPaymentMethod(paymentData.payment_method);

      const selectedRows = paymentData.selectedPaymentEntries.map((entry) => ({
        ...entry,
        due: getDueForPaymentEntry(entry)
      }));

      const totalDue = selectedRows.reduce((sum, row) => sum + row.due, 0);

      const postOrderPayment = async (orderId, amount, notesSuffix) => {
        if (amount <= 0) return;
        await api.post('/api/order-payments/', {
          order: orderId,
          amount_paid: amount,
          payment_method: orderPm,
          notes:
            paymentData.reference ||
            `${notesSuffix} — ${paymentData.payment_method}`
        });
      };

      const postSalePayment = async (saleId, amount, notesSuffix) => {
        if (amount <= 0) return;
        await api.post(`/api/sales/${saleId}/add_payment/`, {
          amount_paid: amount,
          payment_method: salePm,
          notes:
            paymentData.reference ||
            `${notesSuffix} — ${paymentData.payment_method}`
        });
      };

      const postDirectSalePayment = async (directSaleId, amount, notesSuffix) => {
        if (amount <= 0) return;
        await api.post(`/api/direct-sales/${directSaleId}/add_payment/`, {
          amount_paid: amount,
          payment_method: salePm,
          notes:
            paymentData.reference ||
            `${notesSuffix} — ${paymentData.payment_method}`
        });
      };

      if (paymentData.paymentMode === 'full') {
        for (const row of selectedRows) {
          if (row.due <= 0) continue;
          if (row.kind === 'order') {
            await postOrderPayment(row.id, row.due, `Full payment for order #${row.id}`);
          } else if (row.kind === 'sale') {
            await postSalePayment(row.id, row.due, `Full payment for sale #${row.id}`);
          } else if (row.kind === 'direct_sale') {
            await postDirectSalePayment(row.id, row.due, `Full payment for direct sale #${row.id}`);
          }
        }
      } else {
        const paymentAmount = parseFloat(paymentData.amount);

        if (paymentAmount > totalDue) {
          addToast(
            t('customers.ledger.amountExceeds', {
              amount: paymentAmount.toFixed(2),
              total: totalDue.toFixed(2)
            }),
            'error'
          );
          setPaymentLoading(false);
          return;
        }

        const rowsWithDue = selectedRows.filter((r) => r.due > 0);
        const amountPerRow = rowsWithDue.length > 0 ? paymentAmount / rowsWithDue.length : 0;

        for (const row of rowsWithDue) {
          const payAmount = Math.min(amountPerRow, row.due);
          if (row.kind === 'order') {
            await postOrderPayment(row.id, payAmount, `Partial payment for order #${row.id}`);
          } else if (row.kind === 'sale') {
            await postSalePayment(row.id, payAmount, `Partial payment for sale #${row.id}`);
          } else if (row.kind === 'direct_sale') {
            await postDirectSalePayment(row.id, payAmount, `Partial payment for direct sale #${row.id}`);
          }
        }
      }
      
      await new Promise((resolve) => setTimeout(resolve, 800));
      
      await fetchCustomerData();
      
      addToast(
        t('customers.ledger.paymentSuccessInvoices', {
          count: paymentData.selectedPaymentEntries.length
        }),
        'success'
      );
      
      const entriesSnapshot = [...paymentData.selectedPaymentEntries];
      const snapshotRows = entriesSnapshot.map((entry) => ({
        ...entry,
        due: getDueForPaymentEntry(entry),
        total:
          entry.kind === 'order'
            ? parseFloat(orders.find((o) => o.id === entry.id)?.total_amount) || 0
            : entry.kind === 'sale'
              ? parseFloat(sales.find((s) => s.id === entry.id)?.net_amount ??
                  sales.find((s) => s.id === entry.id)?.total_amount) || 0
              : parseFloat(directSales.find((d) => d.id === entry.id)?.net_amount ??
                  directSales.find((d) => d.id === entry.id)?.total_amount) || 0
      }));

      const totalPaidAmount =
        paymentData.paymentMode === 'full'
          ? snapshotRows.reduce((sum, r) => sum + r.due, 0)
          : parseFloat(paymentData.amount);

      const receiptLabel =
        entriesSnapshot.length === 1
          ? entriesSnapshot[0].kind === 'order'
            ? `Order #${entriesSnapshot[0].id}`
            : entriesSnapshot[0].kind === 'sale'
              ? `${t('customers.ledger.typeSale')} #${entriesSnapshot[0].id}`
              : `${t('customers.ledger.typeDirectSale')} #${entriesSnapshot[0].id}`
          : t('customers.ledger.paymentReceiptMultiple', { count: entriesSnapshot.length });

      setReceiptData({
        id: `PAY-${Date.now()}`,
        type: 'customer',
        customer_name: customer.name,
        phone: customer.phone,
        payment_date: new Date().toISOString(),
        created_at: new Date().toISOString(),
        item_name: receiptLabel,
        payment_method: paymentData.payment_method,
        reference: paymentData.reference,
        total_amount: snapshotRows.reduce((sum, r) => sum + r.total, 0),
        previous_paid: snapshotRows.reduce((sum, r) => {
          const prev = Math.max(0, r.total - r.due);
          return sum + prev;
        }, 0),
        amount: totalPaidAmount,
        amount_paid: totalPaidAmount,
        remaining_amount:
          paymentData.paymentMode === 'full'
            ? 0
            : Math.max(0, snapshotRows.reduce((sum, r) => sum + r.due, 0) - totalPaidAmount),
        notes: paymentData.reference
      });
      setShowPaymentReceipt(true);
      
      setShowPaymentForm(false);
      setPaymentData({
        selectedPaymentEntries: [],
        paymentMode: 'full',
        amount: '',
        payment_method: 'Cash',
        reference: ''
      });
    } catch (err) {
      console.error('Error recording payment:', err);
      const errorMsg = err.response?.data?.detail || err.response?.data?.message || t('customers.ledger.paymentFailed');
      addToast(errorMsg, 'error');
    } finally {
      setPaymentLoading(false);
    }
  };

  const handlePaymentEntryToggle = (entry) => {
    setPaymentData((prev) => {
      const newSelected = paymentEntriesInclude(prev.selectedPaymentEntries, entry)
        ? prev.selectedPaymentEntries.filter(
            (x) => !(x.kind === entry.kind && x.id === entry.id)
          )
        : [...prev.selectedPaymentEntries, entry];

      let amount = prev.amount;
      if (prev.paymentMode === 'full') {
        const totalDueSel = newSelected.reduce(
          (sum, e) => sum + getDueForPaymentEntry(e),
          0
        );
        amount = totalDueSel.toFixed(2);
      }

      return { ...prev, selectedPaymentEntries: newSelected, amount };
    });
  };

  const handleSelectAllPayableEntries = () => {
    const allIds = allSelectablePaymentEntries();
    setPaymentData((prev) => {
      const isAllSelected =
        allIds.length > 0 &&
        allIds.every((e) => paymentEntriesInclude(prev.selectedPaymentEntries, e));
      const newSelected = isAllSelected ? [] : allIds;

      const totalDue = newSelected.reduce(
        (sum, e) => sum + getDueForPaymentEntry(e),
        0
      );

      return {
        ...prev,
        selectedPaymentEntries: newSelected,
        amount: prev.paymentMode === 'full' ? totalDue.toFixed(2) : prev.amount
      };
    });
  };

  const calculateTotal = () => {
    const totalOrders = orders.reduce((sum, o) => sum + (parseFloat(o.total_amount) || 0), 0);
    const totalSales = sales.reduce(
      (sum, s) => sum + (parseFloat(s.net_amount ?? s.total_amount) || 0),
      0
    );
    const totalDirectSales = directSales.reduce(
      (sum, d) => sum + (parseFloat(d.net_amount ?? d.total_amount) || 0),
      0
    );
    const totalBilled = totalOrders + totalSales + totalDirectSales;

    const orderPaid = payments.reduce((sum, p) => {
      const value = p.amount_paid ?? p.amount;
      return sum + (parseFloat(value) || 0);
    }, 0);
    const salePaid = salePayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount_paid ?? p.amount) || 0),
      0
    );
    const directPaid = directSalePayments.reduce(
      (sum, p) => sum + (parseFloat(p.amount_paid ?? p.amount) || 0),
      0
    );
    const totalPaid = orderPaid + salePaid + directPaid;
    const totalDue = Math.max(0, totalBilled - totalPaid);
    return { totalOrders, totalSales, totalDirectSales, totalBilled, totalPaid, totalDue };
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
    const normalizePm = (p) => {
      const m = String(p?.payment_method ?? 'cash').toLowerCase();
      return ['cash', 'credit', 'partial'].includes(m) ? m : 'cash';
    };
    let title = t('sales.editPaymentTitle');
    if (type === 'balance') {
      title = t('customers.ledger.editPrevBalancePaymentAmountLabel');
    } else if (type === 'order') {
      title = t('customers.ledger.editOrderPaymentTitle');
    } else if (type === 'sale') {
      title = t('customers.ledger.editSalePaymentTitle');
    } else if (type === 'direct_sale') {
      title = t('customers.ledger.editDirectSalePaymentTitle');
    }
    setPaymentEditDialog({
      open: true,
      type,
      payment,
      originalAmount: currentAmount,
      amount: Number.isFinite(currentAmount) ? currentAmount.toFixed(2) : '',
      payment_method: type === 'balance' ? 'cash' : normalizePm(payment),
      title
    });
  };

  const closeEditPaymentDialog = () => {
    setPaymentEditDialog({
      open: false,
      type: 'order',
      payment: null,
      amount: '',
      payment_method: 'cash',
      title: '',
      originalAmount: null
    });
  };

  const submitEditPaymentDialog = async () => {
    const amount = parseFloat(paymentEditDialog.amount);
    if (!Number.isFinite(amount) || amount <= 0) {
      addToast(t('customers.ledger.validAmount'), 'error');
      return;
    }
    try {
      const { payment, type } = paymentEditDialog;
      if (type === 'balance') {
        await api.patch(`/api/customer-balance-payments/${payment.id}/`, { amount });
        addToast(t('customers.ledger.balancePaymentUpdated'), 'success');
      } else if (type === 'order') {
        await api.patch(`/api/order-payments/${payment.id}/`, {
          amount_paid: amount,
          payment_method: paymentEditDialog.payment_method
        });
        addToast(t('customers.ledger.paymentUpdatedSuccess'), 'success');
      } else if (type === 'sale') {
        await api.patch(`/api/sale-payments/${payment.id}/`, {
          amount_paid: amount,
          payment_method: paymentEditDialog.payment_method
        });
        addToast(t('customers.ledger.paymentUpdatedSuccess'), 'success');
      } else if (type === 'direct_sale') {
        await api.patch(`/api/direct-sale-payments/${payment.id}/`, {
          amount_paid: amount,
          payment_method: paymentEditDialog.payment_method
        });
        addToast(t('customers.ledger.paymentUpdatedSuccess'), 'success');
      }
      closeEditPaymentDialog();
      fetchCustomerData();
    } catch (err) {
      console.error('Error updating payment:', err);
      addToast(
        paymentEditDialog.type === 'balance'
          ? t('customers.ledger.balancePaymentUpdateFailed')
          : t('customers.ledger.paymentUpdateFailed'),
        'error'
      );
    }
  };

  const openDeletePaymentDialog = (payment, type) => {
    const titles = {
      order: t('customers.ledger.deleteOrderPaymentConfirm'),
      sale: t('customers.ledger.deleteSalePaymentConfirm'),
      direct_sale: t('customers.ledger.deleteDirectSalePaymentConfirm'),
      balance: t('customers.ledger.deletePrevBalancePaymentConfirm')
    };
    setPaymentDeleteDialog({
      open: true,
      type,
      payment,
      title: titles[type] || titles.order
    });
  };

  const handleDeleteOrderPayment = (payment) => openDeletePaymentDialog(payment, 'order');

  const handleDeleteBalancePayment = (payment) => {
    openDeletePaymentDialog(payment, 'balance');
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
    const { payment, type } = paymentDeleteDialog;
    try {
      if (type === 'balance') {
        await api.delete(`/api/customer-balance-payments/${payment.id}/`);
        addToast(t('customers.prevBalancePaymentDeletedRestored'), 'success');
      } else if (type === 'sale') {
        await api.delete(`/api/sale-payments/${payment.id}/`);
        addToast(t('customers.ledger.paymentDeletedSuccess'), 'success');
      } else if (type === 'direct_sale') {
        await api.delete(`/api/direct-sale-payments/${payment.id}/`);
        addToast(t('customers.ledger.paymentDeletedSuccess'), 'success');
      } else {
        await api.delete(`/api/order-payments/${payment.id}/`);
        addToast(t('customers.ledger.paymentDeletedSuccess'), 'success');
      }
      closeDeletePaymentDialog();
      fetchCustomerData();
    } catch (err) {
      console.error('Error deleting payment:', err);
      addToast(
        type === 'balance'
          ? t('customers.ledger.balancePaymentDeleteFailed')
          : t('customers.ledger.paymentDeleteFailed'),
        'error'
      );
    }
  };

  const ledgerRows = useMemo(() => {
    const ts = (d) => {
      const x = new Date(d);
      return Number.isNaN(x.getTime()) ? 0 : x.getTime();
    };
    const rows = [];
    orders.forEach((o) =>
      rows.push({
        kind: 'order',
        key: `order-${o.id}`,
        sort: ts(o.created_at || o.order_date),
        entity: o
      })
    );
    sales.forEach((s) =>
      rows.push({
        kind: 'sale',
        key: `sale-${s.id}`,
        sort: ts(s.created_at || s.sale_date),
        entity: s
      })
    );
    directSales.forEach((d) =>
      rows.push({
        kind: 'direct_sale',
        key: `direct-${d.id}`,
        sort: ts(d.created_at || d.sale_date),
        entity: d
      })
    );
    rows.sort((a, b) => b.sort - a.sort);
    return rows;
  }, [orders, sales, directSales]);

  const totals = calculateTotal();
  const totalPages = Math.max(1, Math.ceil(ledgerRows.length / itemsPerPage));
  const paginatedLedgerRows = ledgerRows.slice(
    (currentPage - 1) * itemsPerPage,
    currentPage * itemsPerPage
  );
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
                  exportCustomerToPDF(customer, orders, payments, {
                    sales,
                    directSales,
                    salePayments,
                    directSalePayments
                  });
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
          <p className="text-[9px] font-semibold text-gray-900 dark:text-white mb-0.5 leading-tight">{t('customers.ledger.totalBilled')}</p>
          <div className="text-base font-bold text-blue-600 dark:text-blue-400 tabular-nums leading-tight">AFN {totals.totalBilled.toFixed(2)}</div>
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

      {/* Orders, sales & direct sales (ledger) */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border dark:border-gray-600">
        <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-700">
          <h2 className="text-base font-semibold text-gray-900 dark:text-white">{t('customers.ledger.activityHistory')}</h2>
        </div>
        <div className="overflow-x-auto">
          <table className="w-full text-xs">
            <thead className="bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100">
              <tr>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('customers.ledger.ref')}</th>
                <th className="px-3 py-2 text-left font-medium uppercase">{t('customers.ledger.entryType')}</th>
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
              {ledgerRows.length === 0 ? (
                <tr>
                  <td colSpan={10} className="px-3 py-6 text-center text-gray-500 dark:text-gray-400">
                    {t('customers.ledger.noActivity')}
                  </td>
                </tr>
              ) : null}
              {paginatedLedgerRows.map((row) => {
                if (row.kind === 'order') {
                  const order = row.entity;
                  const orderPayments = payments.filter((p) => {
                    const paymentOrderId =
                      p.order_id ||
                      (p.order && typeof p.order === 'object' ? p.order.id : null) ||
                      (typeof p.order === 'number' ? p.order : null);
                    return paymentOrderId === order.id;
                  });
                  const lastPayment =
                    orderPayments.length > 0
                      ? orderPayments.sort(
                          (a, b) =>
                            new Date(b.payment_date || b.created_at) -
                            new Date(a.payment_date || a.created_at)
                        )[0]
                      : null;

                  return (
                    <React.Fragment key={row.key}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                        <td className="px-3 py-2 font-medium">
                          <div>#{order.id}</div>
                          {(order.manual_serial_no || '').trim() !== '' && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                              {t('customers.manualSerialNo')}: {order.manual_serial_no}
                            </div>
                          )}
                        </td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-slate-100 text-slate-800 dark:bg-slate-700 dark:text-slate-200">
                            {t('customers.ledger.typeOrder')}
                          </span>
                        </td>
                        <td className="px-3 py-2">{formatDate(order.created_at || order.order_date)}</td>
                        <td className="px-3 py-2">
                          {order.flag_size || 'N/A'} x {order.quantity}
                        </td>
                        <td className="px-3 py-2">AFN {(parseFloat(order.total_amount) || 0).toFixed(2)}</td>
                        <td className="px-3 py-2 text-green-600 dark:text-green-400">
                          AFN{' '}
                          {(
                            parseFloat(order.paid_amount) ||
                            parseFloat(order.total_amount) -
                              parseFloat(order.due_amount || order.due || 0)
                          ).toFixed(2)}
                        </td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">
                          AFN {Math.max(0, parseFloat(order.due_amount || order.due) || 0).toFixed(2)}
                        </td>
                        <td className="px-3 py-2">
                          <span
                            className={`px-2 py-0.5 rounded-full text-xs font-medium ${
                              order.status === 'completed'
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : order.status === 'pending'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                            }`}
                          >
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
                              type="button"
                              onClick={() => handleViewOrder(order.id)}
                              className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                              title={t('customers.ledger.viewOrder')}
                            >
                              <EyeIcon className="h-4 w-4" />
                            </button>
                            <button
                              type="button"
                              onClick={() => handlePrintOrder(order.id)}
                              className="p-1.5 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                              title={t('customers.ledger.printBill')}
                            >
                              <PrinterIcon className="h-4 w-4" />
                            </button>
                            {(order.status || '').toLowerCase() === 'pending' && (
                              <button
                                type="button"
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
                        .sort(
                          (a, b) =>
                            new Date(b.payment_date || b.created_at) -
                            new Date(a.payment_date || a.created_at)
                        )
                        .map((payment, pIdx) => (
                          <tr key={`order-${order.id}-payment-${payment.id || pIdx}`} className="bg-blue-50 dark:bg-blue-900/10">
                            <td className="px-3 py-2 pl-8 text-xs text-blue-600 dark:text-blue-400" colSpan={4}>
                              {t('customers.ledger.paymentLine', { n: pIdx + 1 })}
                            </td>
                            <td className="px-3 py-2 text-xs">-</td>
                            <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
                              AFN {(parseFloat(payment.amount_paid ?? payment.amount) || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-xs">-</td>
                            <td className="px-3 py-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-blue-100 text-blue-800 dark:bg-blue-900/30 dark:text-blue-300">
                                {t('customers.ledger.paymentKind')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {formatDate(payment.payment_date || payment.created_at)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditPaymentDialog(payment, 'order')}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                  title={t('common.edit')}
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => handleDeleteOrderPayment(payment)}
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
                }

                if (row.kind === 'sale') {
                  const s = row.entity;
                  const sPayments = salePayments.filter((p) => {
                    const sid =
                      p.sale_id ??
                      (p.sale && typeof p.sale === 'object' ? p.sale.id : null) ??
                      (typeof p.sale === 'number' ? p.sale : null);
                    return sid === s.id;
                  });
                  const lastPayment =
                    sPayments.length > 0
                      ? sPayments.sort(
                          (a, b) =>
                            new Date(b.payment_date || b.created_at) -
                            new Date(a.payment_date || a.created_at)
                        )[0]
                      : null;
                  const net = parseFloat(s.net_amount ?? s.total_amount) || 0;
                  const paid = parseFloat(s.total_paid) || 0;
                  const due = Math.max(0, parseFloat(s.due) || 0);

                  return (
                    <React.Fragment key={row.key}>
                      <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-emerald-50/40 dark:bg-emerald-900/10">
                        <td className="px-3 py-2 font-medium">S-{s.id}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                            {t('customers.ledger.typeSale')}
                          </span>
                        </td>
                        <td className="px-3 py-2">{formatDate(s.created_at || s.sale_date)}</td>
                        <td className="px-3 py-2">
                          {s.item_count != null ? `${s.item_count} ${t('customers.ledger.itemsShort')}` : '—'}
                        </td>
                        <td className="px-3 py-2">AFN {net.toFixed(2)}</td>
                        <td className="px-3 py-2 text-green-600 dark:text-green-400">AFN {paid.toFixed(2)}</td>
                        <td className="px-3 py-2 text-red-600 dark:text-red-400">AFN {due.toFixed(2)}</td>
                        <td className="px-3 py-2">
                          <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                            {s.status || '—'}
                          </span>
                        </td>
                        <td className="px-3 py-2">
                          {lastPayment
                            ? `${formatDate(lastPayment.payment_date || lastPayment.created_at)} (AFN ${(parseFloat(lastPayment.amount_paid ?? lastPayment.amount) || 0).toFixed(2)})`
                            : '-'}
                        </td>
                        <td className="px-3 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(`/sales/${s.id}`)}
                            className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                            title={t('customers.ledger.viewSale')}
                          >
                            <EyeIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                      {sPayments
                        .slice()
                        .sort(
                          (a, b) =>
                            new Date(b.payment_date || b.created_at) -
                            new Date(a.payment_date || a.created_at)
                        )
                        .map((payment, pIdx) => (
                          <tr key={`sale-${s.id}-payment-${payment.id || pIdx}`} className="bg-emerald-50/80 dark:bg-emerald-900/15">
                            <td className="px-3 py-2 pl-8 text-xs text-emerald-700 dark:text-emerald-300" colSpan={4}>
                              {t('customers.ledger.paymentLine', { n: pIdx + 1 })}
                            </td>
                            <td className="px-3 py-2 text-xs">-</td>
                            <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
                              AFN {(parseFloat(payment.amount_paid ?? payment.amount) || 0).toFixed(2)}
                            </td>
                            <td className="px-3 py-2 text-xs">-</td>
                            <td className="px-3 py-2 text-xs">
                              <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800 dark:bg-emerald-900/40 dark:text-emerald-200">
                                {t('customers.ledger.paymentKind')}
                              </span>
                            </td>
                            <td className="px-3 py-2 text-xs">
                              {formatDate(payment.payment_date || payment.created_at)}
                            </td>
                            <td className="px-3 py-2 text-xs">
                              <div className="flex items-center gap-1">
                                <button
                                  type="button"
                                  onClick={() => openEditPaymentDialog(payment, 'sale')}
                                  className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                  title={t('common.edit')}
                                >
                                  <PencilIcon className="h-3.5 w-3.5" />
                                </button>
                                <button
                                  type="button"
                                  onClick={() => openDeletePaymentDialog(payment, 'sale')}
                                  className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
                }

                const d = row.entity;
                const dPayments = directSalePayments.filter((p) => {
                  const did =
                    p.direct_sale_id ??
                    (p.direct_sale && typeof p.direct_sale === 'object' ? p.direct_sale.id : null) ??
                    (typeof p.direct_sale === 'number' ? p.direct_sale : null);
                  return did === d.id;
                });
                const lastDPayment =
                  dPayments.length > 0
                    ? dPayments.sort(
                        (a, b) =>
                          new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at)
                      )[0]
                    : null;
                const netD = parseFloat(d.net_amount ?? d.total_amount) || 0;
                const paidD = parseFloat(d.total_paid) || 0;
                const dueD = getDirectSaleDue(d);

                return (
                  <React.Fragment key={row.key}>
                    <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 bg-amber-50/40 dark:bg-amber-900/10">
                      <td className="px-3 py-2 font-medium">
                        <div>DS-{d.id}</div>
                        {(d.manual_serial_no || '').trim() !== '' && (
                          <div className="text-[10px] text-gray-500 dark:text-gray-400 font-normal mt-0.5">
                            {t('customers.manualSerialNo')}: {d.manual_serial_no}
                          </div>
                        )}
                      </td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                          {t('customers.ledger.typeDirectSale')}
                        </span>
                      </td>
                      <td className="px-3 py-2">{formatDate(d.created_at || d.sale_date)}</td>
                      <td className="px-3 py-2">
                        {d.item_count != null ? `${d.item_count} ${t('customers.ledger.itemsShort')}` : '—'}
                      </td>
                      <td className="px-3 py-2">AFN {netD.toFixed(2)}</td>
                      <td className="px-3 py-2 text-green-600 dark:text-green-400">AFN {paidD.toFixed(2)}</td>
                      <td className="px-3 py-2 text-red-600 dark:text-red-400">AFN {dueD.toFixed(2)}</td>
                      <td className="px-3 py-2">
                        <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-200">
                          {d.status || '—'}
                        </span>
                      </td>
                      <td className="px-3 py-2">
                        {lastDPayment
                          ? `${formatDate(lastDPayment.payment_date || lastDPayment.created_at)} (AFN ${(parseFloat(lastDPayment.amount_paid ?? lastDPayment.amount) || 0).toFixed(2)})`
                          : '-'}
                      </td>
                      <td className="px-3 py-2">
                        <button
                          type="button"
                          onClick={() => navigate(`/sales/direct/${d.id}`)}
                          className="p-1.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                          title={t('customers.ledger.viewDirectSale')}
                        >
                          <EyeIcon className="h-4 w-4" />
                        </button>
                      </td>
                    </tr>
                    {dPayments
                      .slice()
                      .sort(
                        (a, b) =>
                          new Date(b.payment_date || b.created_at) - new Date(a.payment_date || a.created_at)
                      )
                      .map((payment, pIdx) => (
                        <tr key={`direct-${d.id}-payment-${payment.id || pIdx}`} className="bg-amber-50/80 dark:bg-amber-900/15">
                          <td className="px-3 py-2 pl-8 text-xs text-amber-800 dark:text-amber-200" colSpan={4}>
                            {t('customers.ledger.paymentLine', { n: pIdx + 1 })}
                          </td>
                          <td className="px-3 py-2 text-xs">-</td>
                          <td className="px-3 py-2 text-xs text-green-600 dark:text-green-400 font-medium">
                            AFN {(parseFloat(payment.amount_paid ?? payment.amount) || 0).toFixed(2)}
                          </td>
                          <td className="px-3 py-2 text-xs">-</td>
                          <td className="px-3 py-2 text-xs">
                            <span className="px-2 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-900 dark:bg-amber-900/40 dark:text-amber-100">
                              {t('customers.ledger.paymentKind')}
                            </span>
                          </td>
                          <td className="px-3 py-2 text-xs">
                            {formatDate(payment.payment_date || payment.created_at)}
                          </td>
                          <td className="px-3 py-2 text-xs">
                            <div className="flex items-center gap-1">
                              <button
                                type="button"
                                onClick={() => openEditPaymentDialog(payment, 'direct_sale')}
                                className="p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title={t('common.edit')}
                              >
                                <PencilIcon className="h-3.5 w-3.5" />
                              </button>
                              <button
                                type="button"
                                onClick={() => openDeletePaymentDialog(payment, 'direct_sale')}
                                className="p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded"
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
              })}
            </tbody>
          </table>
        </div>

        {ledgerRows.length > 0 && (
          <div className="px-4 py-3 border-t border-gray-200 dark:border-gray-700 flex justify-between items-center">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('customers.ledger.showing')}{' '}
              {(currentPage - 1) * itemsPerPage + 1} {t('customers.ledger.to')}{' '}
              {Math.min(currentPage * itemsPerPage, ledgerRows.length)} {t('customers.ledger.of')} {ledgerRows.length} (
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
                      onChange={() => {
                        const totalDue = paymentData.selectedPaymentEntries.reduce(
                          (sum, e) => sum + getDueForPaymentEntry(e),
                          0
                        );
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

              {/* Orders & sales with balance */}
              <div>
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300">{t('customers.ledger.selectInvoices')} *</label>
                  <button
                    type="button"
                    onClick={handleSelectAllPayableEntries}
                    className="text-xs text-blue-600 hover:text-blue-800 dark:text-blue-400"
                  >
                    {(() => {
                      const allSelectable = allSelectablePaymentEntries();
                      const isAllSelected =
                        allSelectable.length > 0 &&
                        allSelectable.every((e) =>
                          paymentEntriesInclude(paymentData.selectedPaymentEntries, e)
                        );
                      return isAllSelected ? t('customers.ledger.deselectAll') : t('customers.ledger.selectAll');
                    })()}
                  </button>
                </div>
                <div className="max-h-48 overflow-y-auto border border-gray-300 dark:border-gray-600 rounded-lg p-2 space-y-1.5">
                  {(() => {
                    const { displayOrders, displaySales, displayDirect } = buildPayableRowsForPicker();
                    const rows = [
                      ...displayOrders.map((o) => ({
                        kind: 'order',
                        id: o.id,
                        title: `${t('customers.ledger.typeOrder')} #${o.id}`,
                        total: parseFloat(o.total_amount) || 0,
                        due: getOrderDue(o)
                      })),
                      ...displaySales.map((s) => ({
                        kind: 'sale',
                        id: s.id,
                        title: `${t('customers.ledger.typeSale')} #${s.id}`,
                        total:
                          parseFloat(s.net_amount ?? s.total_amount) || 0,
                        due: getSaleDue(s)
                      })),
                      ...displayDirect.map((d) => ({
                        kind: 'direct_sale',
                        id: d.id,
                        title: `${t('customers.ledger.typeDirectSale')} #${d.id}`,
                        total:
                          parseFloat(d.net_amount ?? d.total_amount) || 0,
                        due: getDirectSaleDue(d)
                      }))
                    ];
                    const entryForRow = (r) => ({ kind: r.kind, id: r.id });
                    return rows.length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-2">
                        {t('customers.ledger.noOutstandingInvoices')}
                      </p>
                    ) : (
                      rows.map((row) => (
                        <label
                          key={`${row.kind}-${row.id}`}
                          className="flex items-center p-1.5 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                        >
                          <input
                            type="checkbox"
                            checked={paymentEntriesInclude(
                              paymentData.selectedPaymentEntries,
                              entryForRow(row)
                            )}
                            onChange={() => handlePaymentEntryToggle(entryForRow(row))}
                            className="mr-2 rounded border-gray-300 dark:border-gray-600"
                          />
                          <div className="flex-1 min-w-0">
                            <div className="text-xs font-medium text-gray-900 dark:text-white truncate">
                              {row.title}
                            </div>
                            <div className="text-[10px] text-gray-600 dark:text-gray-400">
                              {t('customers.ledger.total')}: AFN {row.total.toFixed(2)} |{' '}
                              {t('customers.ledger.totalDueLabel')}: AFN {row.due.toFixed(2)}
                            </div>
                          </div>
                        </label>
                      ))
                    );
                  })()}
                </div>
                {paymentData.selectedPaymentEntries.length > 0 && (
                  <p className="mt-1.5 text-[10px] text-gray-600 dark:text-gray-400">
                    {t('customers.ledger.invoicesSelected', {
                      count: paymentData.selectedPaymentEntries.length
                    })}
                    {paymentData.paymentMode === 'full' && (
                      <span className="ml-2 font-medium">
                        | {t('customers.ledger.totalDueLabel')}: AFN{' '}
                        {paymentData.selectedPaymentEntries
                          .reduce((sum, e) => sum + getDueForPaymentEntry(e), 0)
                          .toFixed(2)}
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
                    setPaymentData({
                      selectedPaymentEntries: [],
                      paymentMode: 'full',
                      amount: '',
                      payment_method: 'Cash',
                      reference: ''
                    });
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
            {paymentEditDialog.type !== 'balance' && (
              <div className="mt-3">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('customers.ledger.paymentMethod')}
                </label>
                <select
                  value={paymentEditDialog.payment_method}
                  onChange={(e) =>
                    setPaymentEditDialog((prev) => ({ ...prev, payment_method: e.target.value }))
                  }
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">{t('directSales.cash')}</option>
                  <option value="credit">{t('orders.payMethodCredit')}</option>
                  <option value="partial">{t('orders.payMethodPartial')}</option>
                </select>
              </div>
            )}
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

      {paymentDeleteDialog.open && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-6">
            <h3 className="text-base font-semibold mb-3 text-gray-900 dark:text-white">
              {t('customers.ledger.deletePaymentTitle')}
            </h3>
            <p className="text-sm text-gray-600 dark:text-gray-300 mb-5">{paymentDeleteDialog.title}</p>
            <div className="flex gap-3">
              <button
                type="button"
                onClick={closeDeletePaymentDialog}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={confirmDeletePaymentDialog}
                className="flex-1 px-4 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerLedger;
