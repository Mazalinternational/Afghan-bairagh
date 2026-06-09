import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  DocumentArrowDownIcon,
  ArrowPathIcon,
  ChartBarIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  TruckIcon,
  ExclamationTriangleIcon,
  UserGroupIcon,
  CalendarIcon,
  FunnelIcon,
  ClipboardDocumentIcon
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer, AreaChart, Area
} from 'recharts';
import jsPDF from 'jspdf';
// Import autotable plugin - must be imported after jsPDF
import 'jspdf-autotable';
import * as XLSX from 'xlsx';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';
import { formatDate } from '../../i18n/dateUtils';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import './Reports.css';

const Reports = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [activeTab, setActiveTab] = useState('detailed');
  const [loading, setLoading] = useState(false);
  const [period, setPeriod] = useState('monthly');
  const [startDate, setStartDate] = useState('');
  const [endDate, setEndDate] = useState('');
  
  // Report data states
  const [detailedReport, setDetailedReport] = useState(null);
  const [ordersWithDues, setOrdersWithDues] = useState(null);
  const [suppliersWithBalance, setSuppliersWithBalance] = useState(null);
  const [lowStock, setLowStock] = useState(null);
  const [pendingAdvances, setPendingAdvances] = useState(null);
  const [monthlyExpenses, setMonthlyExpenses] = useState(null);
  const [employeeSalary, setEmployeeSalary] = useState(null);
  const [purchasePaymentStatus, setPurchasePaymentStatus] = useState(null);
  const [roznamchaReport, setRoznamchaReport] = useState(null);
  const [printingReport, setPrintingReport] = useState({ jobs: [], count: 0, total_cost: 0 });

  // Filters
  const [filters, setFilters] = useState({
    customer_id: '',
    min_due: '',
    max_due: '',
    min_balance: '',
    max_balance: '',
    item_type: '',
    critical_only: false,
    employee_id: '',
    status: '',
    supplier_id: ''
  });

  useEffect(() => {
    if (activeTab === 'detailed') {
      fetchDetailedReport();
      fetchPrintingReport();
    }
  }, [activeTab, period, startDate, endDate]);

  const isWithinDateRange = (dateValue) => {
    if (!dateValue) return true;
    const itemDate = new Date(dateValue);
    if (Number.isNaN(itemDate.getTime())) return true;
    if (period !== 'custom' || !startDate || !endDate) return true;
    const from = new Date(startDate);
    const to = new Date(endDate);
    to.setHours(23, 59, 59, 999);
    return itemDate >= from && itemDate <= to;
  };

  const fetchPrintingReport = async () => {
    try {
      let url = '/api/printing-jobs/';
      const allRows = [];
      // Read all paginated pages so report numbers are accurate.
      while (url) {
        const response = await api.get(url);
        const payload = response.data;
        const rows = Array.isArray(payload) ? payload : payload?.results || [];
        allRows.push(...rows);
        url = Array.isArray(payload) ? null : payload?.next || null;
      }

      const jobs = allRows.filter((row) => isWithinDateRange(row.job_date));
      const total_cost = jobs.reduce((sum, row) => sum + parseFloat(row.total_price || 0), 0);
      setPrintingReport({ jobs, count: jobs.length, total_cost });
    } catch (err) {
      console.error('Error fetching printing report:', err);
      setPrintingReport({ jobs: [], count: 0, total_cost: 0 });
    }
  };

  const fetchDetailedReport = async () => {
    setLoading(true);
    try {
      let url = `/api/reports/detailed/?period=${period}`;
      if (period === 'custom' && startDate && endDate) {
        url += `&start_date=${startDate}&end_date=${endDate}`;
      }
      const response = await api.get(url);
      setDetailedReport(response.data);
    } catch (err) {
      console.error('Error fetching detailed report:', err);
      addToast('Failed to fetch detailed report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchOrdersWithDues = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.customer_id) params.append('customer_id', filters.customer_id);
      if (filters.min_due) params.append('min_due', filters.min_due);
      if (filters.max_due) params.append('max_due', filters.max_due);
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/api/reports/orders-with-dues/?${params}`);
      setOrdersWithDues(response.data);
    } catch (err) {
      console.error('Error fetching orders with dues:', err);
      addToast('Failed to fetch orders with dues', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchSuppliersWithBalance = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.min_balance) params.append('min_balance', filters.min_balance);
      if (filters.max_balance) params.append('max_balance', filters.max_balance);
      
      const response = await api.get(`/api/reports/suppliers-with-balance/?${params}`);
      setSuppliersWithBalance(response.data);
    } catch (err) {
      console.error('Error fetching suppliers with balance:', err);
      addToast('Failed to fetch suppliers with balance', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchLowStock = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.item_type) params.append('item_type', filters.item_type);
      if (filters.critical_only) params.append('critical_only', 'true');
      
      const response = await api.get(`/api/reports/low-stock/?${params}`);
      setLowStock(response.data);
    } catch (err) {
      console.error('Error fetching low stock:', err);
      addToast('Failed to fetch low stock items', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPendingAdvances = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      if (filters.min_due) params.append('min_amount', filters.min_due);
      if (filters.max_due) params.append('max_amount', filters.max_due);
      
      const response = await api.get(`/api/reports/pending-advances/?${params}`);
      setPendingAdvances(response.data);
    } catch (err) {
      console.error('Error fetching pending advances:', err);
      addToast('Failed to fetch pending advances', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchMonthlyExpenses = async () => {
    setLoading(true);
    try {
      const date = startDate ? new Date(startDate) : new Date();
      const month = date.getMonth() + 1;
      const year = date.getFullYear();
      
      const response = await api.get(`/api/reports/monthly-expenses/?month=${month}&year=${year}`);
      setMonthlyExpenses(response.data);
    } catch (err) {
      console.error('Error fetching monthly expenses:', err);
      addToast('Failed to fetch monthly expenses', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchEmployeeSalary = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.employee_id) params.append('employee_id', filters.employee_id);
      
      const response = await api.get(`/api/reports/employee-salary/?${params}`);
      setEmployeeSalary(response.data);
    } catch (err) {
      console.error('Error fetching employee salary:', err);
      addToast('Failed to fetch employee salary report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchPurchasePaymentStatus = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (filters.status) params.append('status', filters.status);
      if (filters.supplier_id) params.append('supplier_id', filters.supplier_id);
      
      const response = await api.get(`/api/reports/purchase-payment-status/?${params}`);
      setPurchasePaymentStatus(response.data);
    } catch (err) {
      console.error('Error fetching purchase payment status:', err);
      addToast('Failed to fetch purchase payment status', 'error');
    } finally {
      setLoading(false);
    }
  };

  const fetchRoznamchaReport = async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (startDate) params.append('start_date', startDate);
      if (endDate) params.append('end_date', endDate);
      
      const response = await api.get(`/api/roznamcha/?${params}`);
      const entries = response.data.results || response.data || [];
      
      const totalCost = entries.reduce((sum, entry) => sum + parseFloat(entry.cost_price || 0), 0);
      
      setRoznamchaReport({
        entries,
        total_cost: totalCost,
        count: entries.length
      });
    } catch (err) {
      console.error('Error fetching roznamcha report:', err);
      addToast('Failed to fetch Roz Namcha report', 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleTabChange = (tab) => {
    setActiveTab(tab);
    setLoading(true);
    
    // Fetch data based on tab
    switch(tab) {
      case 'detailed':
        fetchDetailedReport();
        fetchPrintingReport();
        break;
      case 'orders-dues':
        fetchOrdersWithDues();
        break;
      case 'suppliers-balance':
        fetchSuppliersWithBalance();
        break;
      case 'low-stock':
        fetchLowStock();
        break;
      case 'pending-advances':
        fetchPendingAdvances();
        break;
      case 'monthly-expenses':
        fetchMonthlyExpenses();
        break;
      case 'employee-salary':
        fetchEmployeeSalary();
        break;
      case 'purchase-payment':
        fetchPurchasePaymentStatus();
        break;
      case 'roznamcha':
        fetchRoznamchaReport();
        break;
      default:
        setLoading(false);
    }
  };

  const handleFilterChange = (key, value) => {
    setFilters(prev => ({ ...prev, [key]: value }));
  };

  const handleRefresh = () => {
    handleTabChange(activeTab);
  };

  // Helper function to safely call autoTable
  const safeAutoTable = (doc, options) => {
    if (typeof doc.autoTable === 'function') {
      doc.autoTable(options);
      return doc.lastAutoTable ? doc.lastAutoTable.finalY : null;
    } else {
      // Fallback: create simple text table
      const { startY, head, body } = options;
      let currentY = startY || 20;
      doc.setFontSize(10);
      
      // Print header
      if (head && head.length > 0) {
        doc.setFont('helvetica', 'bold');
        head[0].forEach((col, idx) => {
          doc.text(col, 14 + (idx * 40), currentY);
        });
        currentY += 6;
      }
      
      // Print body
      if (body && body.length > 0) {
        doc.setFont('helvetica', 'normal');
        body.forEach(row => {
          row.forEach((col, idx) => {
            doc.text(String(col), 14 + (idx * 40), currentY);
          });
          currentY += 5;
        });
      }
      
      return currentY;
    }
  };

  // Export functions
  const exportToPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      const pageHeight = doc.internal.pageSize.getHeight();
      let startY = 15;
      
      // Title
      doc.setFontSize(16);
      doc.setFont('helvetica', 'bold');
      doc.setTextColor(31, 41, 55);
      const reportTitle = tabs.find(t => t.id === activeTab)?.name || 'Report';
      doc.text(reportTitle, pageWidth / 2, startY, { align: 'center' });
      startY += 8;
      
      // Date
      doc.setFontSize(10);
      doc.setFont('helvetica', 'normal');
      doc.setTextColor(75, 85, 99);
      doc.text(`Generated: ${formatDate(new Date())}`, pageWidth / 2, startY, { align: 'center' });
      startY += 10;
      
      if (activeTab === 'detailed' && detailedReport) {
        // Period
        doc.setFontSize(11);
        doc.setTextColor(31, 41, 55);
        const periodText = period === 'custom' && startDate && endDate 
          ? `${startDate} to ${endDate}`
          : period.charAt(0).toUpperCase() + period.slice(1);
        doc.text(`Period: ${periodText}`, 14, startY);
        startY += 8;
        
        // Financial Summary Table
        if (detailedReport.financial_summary) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Financial Summary', 14, startY);
          startY += 5;
          
          const finalY = safeAutoTable(doc, {
            startY: startY,
            head: [['Metric', 'Amount (AFN)']],
            body: [
              ['Revenue', (detailedReport.financial_summary.revenue || 0).toFixed(2)],
              ['Costs', (detailedReport.financial_summary.costs || 0).toFixed(2)],
              ['Expenses', (detailedReport.financial_summary.expenses || 0).toFixed(2)],
              ['Profit', (detailedReport.financial_summary.profit || 0).toFixed(2)],
              ['Receivables', (detailedReport.financial_summary.receivables || 0).toFixed(2)],
              ['Payables', (detailedReport.financial_summary.payables || 0).toFixed(2)]
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
          startY = finalY ? finalY + 8 : startY + 50;
        }
        
        // Summary Cards Data
        if (detailedReport.orders) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Orders Summary', 14, startY);
          startY += 5;
          
          const finalYOrders = safeAutoTable(doc, {
            startY: startY,
            head: [['Metric', 'Value']],
            body: [
              ['Total Orders', detailedReport.orders.total_orders || 0],
              ['Total Revenue', `AFN ${(detailedReport.orders.total_revenue || 0).toFixed(2)}`],
              ['Total Due', `AFN ${(detailedReport.orders.total_due || 0).toFixed(2)}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
          startY = finalYOrders ? finalYOrders + 8 : startY + 30;
        }
        
        if (detailedReport.purchases) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Purchases Summary', 14, startY);
          startY += 5;
          
          const finalY2 = safeAutoTable(doc, {
            startY: startY,
            head: [['Metric', 'Value']],
            body: [
              ['Total Purchases', detailedReport.purchases.total_purchases || 0],
              ['Total Cost', `AFN ${(detailedReport.purchases.total_cost || 0).toFixed(2)}`],
              ['Remaining', `AFN ${(detailedReport.purchases.total_remaining || 0).toFixed(2)}`]
            ],
            theme: 'striped',
            headStyles: { fillColor: [139, 92, 246], textColor: [255, 255, 255] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
          startY = finalY2 ? finalY2 + 8 : startY + 30;
        }
        
        if (detailedReport.expenses) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Expenses Summary', 14, startY);
          startY += 5;
          
          const finalYExpenses = safeAutoTable(doc, {
            startY: startY,
            head: [['Metric', 'Value']],
            body: [
              ['Total Expenses', `AFN ${(detailedReport.expenses.total_expenses || 0).toFixed(2)}`],
              ['Count', detailedReport.expenses.count || 0]
            ],
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
          if (finalYExpenses) startY = finalYExpenses + 8;
        }
        
      } else if (activeTab === 'orders-dues' && ordersWithDues) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Outstanding: AFN ${(ordersWithDues.total_outstanding || 0).toFixed(2)}`, 14, startY);
        startY += 5;
        doc.text(`Orders Count: ${ordersWithDues.count || 0}`, 14, startY);
        startY += 8;
        
        if (ordersWithDues.orders && ordersWithDues.orders.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Orders with Outstanding Dues', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Order ID', 'Customer', 'Phone', 'Total', 'Paid', 'Due', 'Date', 'Status']],
            body: ordersWithDues.orders.map(o => [
              `#${o.order_id || 'N/A'}`,
              o.customer_name || 'N/A',
              o.customer_phone || 'N/A',
              `AFN ${(o.total_amount || 0).toFixed(2)}`,
              `AFN ${(o.total_paid || 0).toFixed(2)}`,
              `AFN ${(o.due_amount || 0).toFixed(2)}`,
              o.order_date ? formatDate(o.order_date) : 'N/A',
              (o.status || 'N/A').charAt(0).toUpperCase() + (o.status || 'N/A').slice(1)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
          });
        }
        
      } else if (activeTab === 'suppliers-balance' && suppliersWithBalance) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Outstanding: AFN ${(suppliersWithBalance.total_outstanding || 0).toFixed(2)}`, 14, startY);
        startY += 5;
        doc.text(`Suppliers Count: ${suppliersWithBalance.count || 0}`, 14, startY);
        startY += 8;
        
        if (suppliersWithBalance.suppliers && suppliersWithBalance.suppliers.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Suppliers with Balance', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Supplier ID', 'Name', 'Contact', 'Phone', 'Balance', 'Created']],
            body: suppliersWithBalance.suppliers.map(s => [
              `#${s.supplier_id || 'N/A'}`,
              s.name || 'N/A',
              s.contact_person || '-',
              s.phone || 'N/A',
              `AFN ${(parseFloat(s.balance || 0)).toFixed(2)}`,
              s.created_at ? formatDate(s.created_at) : 'N/A'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [245, 158, 11], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
          });
        }
        
      } else if (activeTab === 'low-stock' && lowStock) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Low Stock Items: ${lowStock.count || 0}`, 14, startY);
        startY += 8;
        
        if (lowStock.items && lowStock.items.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Low Stock Items', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Item ID', 'Name', 'SKU', 'Type', 'Current Stock', 'Minimum', 'Unit Price', 'Stock Value']],
            body: lowStock.items.map(item => [
              `#${item.item_id || 'N/A'}`,
              item.name || 'N/A',
              item.sku || 'N/A',
              (item.item_type || 'N/A').replace('_', ' '),
              item.current_stock || 0,
              item.minimum_stock || 0,
              `AFN ${(item.unit_price || 0).toFixed(2)}`,
              `AFN ${(item.stock_value || 0).toFixed(2)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [234, 179, 8], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
          });
        }
        
      } else if (activeTab === 'pending-advances' && pendingAdvances) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Pending: AFN ${(pendingAdvances.total_pending || 0).toFixed(2)}`, 14, startY);
        startY += 5;
        doc.text(`Advances Count: ${pendingAdvances.count || 0}`, 14, startY);
        startY += 8;
        
        if (pendingAdvances.advances && pendingAdvances.advances.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Pending Advances', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Advance ID', 'Employee', 'Amount', 'Date Given', 'Return Plan', 'Status', 'Notes']],
            body: pendingAdvances.advances.map(a => [
              `#${a.advance_id || 'N/A'}`,
              a.employee_name || 'N/A',
              `AFN ${(a.amount || 0).toFixed(2)}`,
              a.date_given ? formatDate(a.date_given) : 'N/A',
              (a.return_plan || '-').substring(0, 30),
              (a.status || 'N/A').charAt(0).toUpperCase() + (a.status || 'N/A').slice(1),
              (a.notes || '-').substring(0, 20)
            ]),
            theme: 'striped',
            headStyles: { fillColor: [147, 51, 234], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
          });
        }
        
      } else if (activeTab === 'monthly-expenses' && monthlyExpenses) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Period: ${monthlyExpenses.period || 'N/A'}`, 14, startY);
        startY += 5;
        doc.text(`Total Expenses: AFN ${(monthlyExpenses.total_expenses || 0).toFixed(2)}`, 14, startY);
        startY += 5;
        doc.text(`Count: ${monthlyExpenses.count || 0}`, 14, startY);
        startY += 8;
        
        if (monthlyExpenses.by_category && monthlyExpenses.by_category.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Expenses by Category', 14, startY);
          startY += 5;
          
          doc.autoTable({
            startY: startY,
            head: [['Category', 'Total Amount', 'Count']],
            body: monthlyExpenses.by_category.map(item => [
              item.category || 'Uncategorized',
              `AFN ${(item.total || 0).toFixed(2)}`,
              item.count || 0
            ]),
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
        }
        
      } else if (activeTab === 'employee-salary' && employeeSalary) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Active Employees: ${employeeSalary.count || 0}`, 14, startY);
        startY += 8;
        
        if (employeeSalary.employees && employeeSalary.employees.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Employee Salary Report', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Employee ID', 'Name', 'Salary', 'Pending Advances', 'Net Salary', 'Join Date']],
            body: employeeSalary.employees.map(emp => [
              `#${emp.employee_id || 'N/A'}`,
              emp.name || 'N/A',
              `AFN ${(emp.salary || 0).toFixed(2)}`,
              `AFN ${(emp.pending_advances || 0).toFixed(2)}`,
              `AFN ${(emp.net_salary || 0).toFixed(2)}`,
              emp.join_date ? formatDate(emp.join_date) : 'N/A'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 8, cellPadding: 2 },
            margin: { left: 14, right: 14 }
          });
        }
        
      } else if (activeTab === 'purchase-payment' && purchasePaymentStatus) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Purchases: ${purchasePaymentStatus.count || 0}`, 14, startY);
        startY += 8;
        
        if (purchasePaymentStatus.by_status && purchasePaymentStatus.by_status.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Payment Status Summary', 14, startY);
          startY += 5;
          
          const finalY3 = safeAutoTable(doc, {
            startY: startY,
            head: [['Status', 'Total Cost', 'Count']],
            body: purchasePaymentStatus.by_status.map(status => [
              (status.payment_status || 'Unknown').charAt(0).toUpperCase() + (status.payment_status || 'Unknown').slice(1),
              `AFN ${(status.total_cost || 0).toFixed(2)}`,
              status.count || 0
            ]),
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
          startY = finalY3 ? finalY3 + 8 : startY + 30;
        }
        
        if (purchasePaymentStatus.purchases && purchasePaymentStatus.purchases.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Purchase Details', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Purchase ID', 'Supplier', 'Item', 'Quantity', 'Cost', 'Paid', 'Remaining', 'Status', 'Date']],
            body: purchasePaymentStatus.purchases.map(p => [
              `#${p.purchase_id || 'N/A'}`,
              p.supplier_name || 'N/A',
              (p.item_name || 'N/A').substring(0, 20),
              p.quantity || 0,
              `AFN ${(p.cost || 0).toFixed(2)}`,
              `AFN ${(p.total_paid || 0).toFixed(2)}`,
              `AFN ${(p.remaining || 0).toFixed(2)}`,
              (p.payment_status || 'N/A').charAt(0).toUpperCase() + (p.payment_status || 'N/A').slice(1),
              p.purchase_date ? formatDate(p.purchase_date) : 'N/A'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [99, 102, 241], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 7, cellPadding: 2 },
            margin: { left: 14, right: 14 }
          });
        }
      } else if (activeTab === 'roznamcha' && roznamchaReport) {
        doc.setFontSize(12);
        doc.setFont('helvetica', 'bold');
        doc.text('Summary', 14, startY);
        startY += 5;
        
        doc.setFontSize(10);
        doc.setFont('helvetica', 'normal');
        doc.text(`Total Cost: AFN ${roznamchaReport.total_cost.toFixed(2)}`, 14, startY);
        startY += 5;
        doc.text(`Total Entries: ${roznamchaReport.count || 0}`, 14, startY);
        startY += 8;
        
        if (roznamchaReport.entries && roznamchaReport.entries.length > 0) {
          doc.setFontSize(12);
          doc.setFont('helvetica', 'bold');
          doc.text('Roz Namcha Entries', 14, startY);
          startY += 5;
          
          safeAutoTable(doc, {
            startY: startY,
            head: [['Item Name', 'Date', 'Description', 'Cost/Price']],
            body: roznamchaReport.entries.map(e => [
              (e.item_name || 'N/A').substring(0, 25),
              formatDate(e.date),
              (e.description || 'N/A').substring(0, 30),
              `AFN ${(e.cost_price || 0).toFixed(2)}`
            ]),
            theme: 'striped',
            headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255], fontStyle: 'bold' },
            styles: { fontSize: 9, cellPadding: 3 },
            margin: { left: 14, right: 14 }
          });
        }
      } else {
        doc.setFontSize(11);
        doc.setTextColor(107, 114, 128);
        doc.text('No data available for export', pageWidth / 2, startY, { align: 'center' });
      }
      
      // Footer
      const totalPages = doc.internal.getNumberOfPages();
      for (let i = 1; i <= totalPages; i++) {
        doc.setPage(i);
        doc.setFontSize(8);
        doc.setTextColor(107, 114, 128);
        doc.text(`Page ${i} of ${totalPages}`, pageWidth / 2, pageHeight - 10, { align: 'center' });
      }
      
      doc.save(`report_${activeTab}_${new Date().toISOString().split('T')[0]}.pdf`);
      addToast('PDF exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting PDF:', error);
      addToast(`Failed to export PDF: ${error.message}`, 'error');
    }
  };

  const exportToExcel = () => {
    try {
      let data = [];
      let filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}`;
      
      if (activeTab === 'detailed' && detailedReport) {
        data = [
          ['Financial Summary'],
          ['Metric', 'Amount (AFN)'],
          ['Revenue', detailedReport.financial_summary?.revenue || 0],
          ['Costs', detailedReport.financial_summary?.costs || 0],
          ['Expenses', detailedReport.financial_summary?.expenses || 0],
          ['Profit', detailedReport.financial_summary?.profit || 0],
          ['Receivables', detailedReport.financial_summary?.receivables || 0],
          ['Payables', detailedReport.financial_summary?.payables || 0],
          [],
          ['Orders Summary'],
          ['Total Orders', detailedReport.orders?.total_orders || 0],
          ['Total Revenue', detailedReport.orders?.total_revenue || 0],
          ['Total Due', detailedReport.orders?.total_due || 0],
          [],
          ['Purchases Summary'],
          ['Total Purchases', detailedReport.purchases?.total_purchases || 0],
          ['Total Cost', detailedReport.purchases?.total_cost || 0],
          ['Remaining', detailedReport.purchases?.total_remaining || 0],
          [],
          ['Expenses Summary'],
          ['Total Expenses', detailedReport.expenses?.total_expenses || 0],
          ['Count', detailedReport.expenses?.count || 0],
          [],
          ['Inventory Summary'],
          ['Total Items', detailedReport.inventory?.total_items || 0],
          ['Stock Value', detailedReport.inventory?.total_stock_value || 0],
          ['Low Stock Items', detailedReport.inventory?.low_stock_items || 0]
        ];
      } else if (activeTab === 'orders-dues' && ordersWithDues) {
        data = [
          ['Orders with Outstanding Dues'],
          ['Total Outstanding', ordersWithDues.total_outstanding],
          ['Count', ordersWithDues.count],
          [],
          ['Order ID', 'Customer', 'Phone', 'Total Amount', 'Paid', 'Due', 'Date', 'Status'],
          ...(ordersWithDues.orders || []).map(o => [
            o.order_id, o.customer_name, o.customer_phone, o.total_amount, o.total_paid, o.due_amount, o.order_date, o.status
          ])
        ];
      } else if (activeTab === 'suppliers-balance' && suppliersWithBalance) {
        data = [
          ['Suppliers with Balance'],
          ['Total Outstanding', suppliersWithBalance.total_outstanding],
          ['Count', suppliersWithBalance.count],
          [],
          ['Supplier ID', 'Name', 'Contact', 'Phone', 'Balance', 'Created'],
          ...(suppliersWithBalance.suppliers || []).map(s => [
            s.supplier_id, s.name, s.contact_person || '-', s.phone, s.balance, s.created_at
          ])
        ];
      } else if (activeTab === 'low-stock' && lowStock) {
        data = [
          ['Low Stock Items'],
          ['Count', lowStock.count],
          [],
          ['Item ID', 'Name', 'SKU', 'Type', 'Current Stock', 'Minimum', 'Unit Price', 'Stock Value'],
          ...(lowStock.items || []).map(item => [
            item.item_id, item.name, item.sku, item.item_type, item.current_stock, item.minimum_stock, item.unit_price, item.stock_value
          ])
        ];
      } else if (activeTab === 'pending-advances' && pendingAdvances) {
        data = [
          ['Pending Advances'],
          ['Total Pending', pendingAdvances.total_pending],
          ['Count', pendingAdvances.count],
          [],
          ['Advance ID', 'Employee', 'Amount', 'Date Given', 'Return Plan', 'Status', 'Notes'],
          ...(pendingAdvances.advances || []).map(a => [
            a.advance_id, a.employee_name, a.amount, a.date_given, a.return_plan || '-', a.status, a.notes || '-'
          ])
        ];
      } else if (activeTab === 'monthly-expenses' && monthlyExpenses) {
        data = [
          ['Monthly Expenses'],
          ['Period', monthlyExpenses.period],
          ['Total Expenses', monthlyExpenses.total_expenses],
          ['Count', monthlyExpenses.count],
          [],
          ['Category', 'Total Amount', 'Count'],
          ...(monthlyExpenses.by_category || []).map(item => [
            item.category || 'Uncategorized', item.total, item.count
          ])
        ];
      } else if (activeTab === 'employee-salary' && employeeSalary) {
        data = [
          ['Employee Salary Report'],
          ['Active Employees', employeeSalary.count],
          [],
          ['Employee ID', 'Name', 'Salary', 'Pending Advances', 'Net Salary', 'Join Date'],
          ...(employeeSalary.employees || []).map(emp => [
            emp.employee_id, emp.name, emp.salary, emp.pending_advances, emp.net_salary, emp.join_date
          ])
        ];
      } else if (activeTab === 'purchase-payment' && purchasePaymentStatus) {
        data = [
          ['Purchase Payment Status'],
          ['Total Purchases', purchasePaymentStatus.count],
          [],
          ['Purchase ID', 'Supplier', 'Item', 'Quantity', 'Cost', 'Paid', 'Remaining', 'Status', 'Date'],
          ...(purchasePaymentStatus.purchases || []).map(p => [
            p.purchase_id, p.supplier_name, p.item_name, p.quantity, p.cost, p.total_paid, p.remaining, p.payment_status, p.purchase_date
          ])
        ];
      } else if (activeTab === 'roznamcha' && roznamchaReport) {
        data = [
          ['Roz Namcha Report'],
          ['Total Cost', roznamchaReport.total_cost],
          ['Total Entries', roznamchaReport.count],
          [],
          ['Item Name', 'Date', 'Description', 'Cost/Price'],
          ...(roznamchaReport.entries || []).map(e => [
            e.item_name, e.date, e.description || 'N/A', e.cost_price
          ])
        ];
      } else {
        addToast('No data available for export', 'error');
        return;
      }
      
      const ws = XLSX.utils.aoa_to_sheet(data);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, 'Report');
      XLSX.writeFile(wb, `${filename}.xlsx`);
      addToast('Excel file exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting Excel:', error);
      addToast(`Failed to export Excel: ${error.message}`, 'error');
    }
  };

  const exportToCSV = () => {
    try {
      let csv = '';
      const filename = `report_${activeTab}_${new Date().toISOString().split('T')[0]}.csv`;
      
      if (activeTab === 'detailed' && detailedReport) {
        csv = 'Financial Summary\n';
        csv += `Period,${period}\n\n`;
        csv += 'Metric,Amount (AFN)\n';
        csv += `Revenue,${detailedReport.financial_summary?.revenue || 0}\n`;
        csv += `Costs,${detailedReport.financial_summary?.costs || 0}\n`;
        csv += `Expenses,${detailedReport.financial_summary?.expenses || 0}\n`;
        csv += `Profit,${detailedReport.financial_summary?.profit || 0}\n`;
        csv += `Receivables,${detailedReport.financial_summary?.receivables || 0}\n`;
        csv += `Payables,${detailedReport.financial_summary?.payables || 0}\n\n`;
        csv += 'Orders Summary\n';
        csv += `Total Orders,${detailedReport.orders?.total_orders || 0}\n`;
        csv += `Total Revenue,${detailedReport.orders?.total_revenue || 0}\n`;
        csv += `Total Due,${detailedReport.orders?.total_due || 0}\n`;
      } else if (activeTab === 'orders-dues' && ordersWithDues) {
        csv = 'Orders with Outstanding Dues\n';
        csv += `Total Outstanding,${ordersWithDues.total_outstanding}\n`;
        csv += `Count,${ordersWithDues.count}\n\n`;
        csv += 'Order ID,Customer,Phone,Total Amount,Paid,Due,Date,Status\n';
        (ordersWithDues.orders || []).forEach(o => {
          csv += `${o.order_id},${o.customer_name},${o.customer_phone},${o.total_amount},${o.total_paid},${o.due_amount},${o.order_date},${o.status}\n`;
        });
      } else if (activeTab === 'suppliers-balance' && suppliersWithBalance) {
        csv = 'Suppliers with Balance\n';
        csv += `Total Outstanding,${suppliersWithBalance.total_outstanding}\n`;
        csv += `Count,${suppliersWithBalance.count}\n\n`;
        csv += 'Supplier ID,Name,Contact,Phone,Balance,Created\n';
        (suppliersWithBalance.suppliers || []).forEach(s => {
          csv += `${s.supplier_id},${s.name},${s.contact_person || '-'},${s.phone},${s.balance},${s.created_at}\n`;
        });
      } else if (activeTab === 'low-stock' && lowStock) {
        csv = 'Low Stock Items\n';
        csv += `Count,${lowStock.count}\n\n`;
        csv += 'Item ID,Name,SKU,Type,Current Stock,Minimum,Unit Price,Stock Value\n';
        (lowStock.items || []).forEach(item => {
          csv += `${item.item_id},${item.name},${item.sku},${item.item_type},${item.current_stock},${item.minimum_stock},${item.unit_price},${item.stock_value}\n`;
        });
      } else if (activeTab === 'pending-advances' && pendingAdvances) {
        csv = 'Pending Advances\n';
        csv += `Total Pending,${pendingAdvances.total_pending}\n`;
        csv += `Count,${pendingAdvances.count}\n\n`;
        csv += 'Advance ID,Employee,Amount,Date Given,Return Plan,Status,Notes\n';
        (pendingAdvances.advances || []).forEach(a => {
          csv += `${a.advance_id},${a.employee_name},${a.amount},${a.date_given},${a.return_plan || '-'},${a.status},${a.notes || '-'}\n`;
        });
      } else if (activeTab === 'monthly-expenses' && monthlyExpenses) {
        csv = 'Monthly Expenses\n';
        csv += `Period,${monthlyExpenses.period}\n`;
        csv += `Total Expenses,${monthlyExpenses.total_expenses}\n`;
        csv += `Count,${monthlyExpenses.count}\n\n`;
        csv += 'Category,Total Amount,Count\n';
        (monthlyExpenses.by_category || []).forEach(item => {
          csv += `${item.category || 'Uncategorized'},${item.total},${item.count}\n`;
        });
      } else if (activeTab === 'employee-salary' && employeeSalary) {
        csv = 'Employee Salary Report\n';
        csv += `Active Employees,${employeeSalary.count}\n\n`;
        csv += 'Employee ID,Name,Salary,Pending Advances,Net Salary,Join Date\n';
        (employeeSalary.employees || []).forEach(emp => {
          csv += `${emp.employee_id},${emp.name},${emp.salary},${emp.pending_advances},${emp.net_salary},${emp.join_date}\n`;
        });
      } else if (activeTab === 'purchase-payment' && purchasePaymentStatus) {
        csv = 'Purchase Payment Status\n';
        csv += `Total Purchases,${purchasePaymentStatus.count}\n\n`;
        csv += 'Purchase ID,Supplier,Item,Quantity,Cost,Paid,Remaining,Status,Date\n';
        (purchasePaymentStatus.purchases || []).forEach(p => {
          csv += `${p.purchase_id},${p.supplier_name},${p.item_name},${p.quantity},${p.cost},${p.total_paid},${p.remaining},${p.payment_status},${p.purchase_date}\n`;
        });
      } else if (activeTab === 'roznamcha' && roznamchaReport) {
        csv = 'Roz Namcha Report\n';
        csv += `Total Cost,${roznamchaReport.total_cost}\n`;
        csv += `Total Entries,${roznamchaReport.count}\n\n`;
        csv += 'Item Name,Date,Description,Cost/Price\n';
        (roznamchaReport.entries || []).forEach(e => {
          csv += `${e.item_name},${e.date},${e.description || 'N/A'},${e.cost_price}\n`;
        });
      } else {
        addToast('No data available for export', 'error');
        return;
      }
      
      const blob = new Blob([csv], { type: 'text/csv' });
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = filename;
      a.click();
      window.URL.revokeObjectURL(url);
      addToast('CSV exported successfully', 'success');
    } catch (error) {
      console.error('Error exporting CSV:', error);
      addToast(`Failed to export CSV: ${error.message}`, 'error');
    }
  };

  // Chart data preparation
  const getFinancialChartData = () => {
    const financial_summary = detailedReport?.financial_summary;
    if (!financial_summary) return [];
    return [
      { name: 'Revenue', value: financial_summary.revenue ?? 0, color: '#3b82f6' },
      { name: 'Costs', value: financial_summary.costs ?? 0, color: '#ef4444' },
      { name: 'Expenses', value: financial_summary.expenses ?? 0, color: '#f59e0b' },
      { name: 'Profit', value: financial_summary.profit ?? 0, color: '#10b981' }
    ];
  };

  const getOrdersByStatusData = () => {
    if (!detailedReport?.orders?.by_status) return [];
    return detailedReport.orders.by_status.map(item => ({
      name: item.status || 'Unknown',
      count: item.count,
      total: item.total
    }));
  };

  const getExpensesByCategoryData = () => {
    if (!detailedReport?.expenses?.by_category) return [];
    return detailedReport.expenses.by_category.map(item => ({
      name: item.category || 'Uncategorized',
      total: item.total,
      count: item.count
    }));
  };

  const COLORS = ['#3b82f6', '#ef4444', '#f59e0b', '#10b981', '#8b5cf6', '#ec4899'];

  const tabs = [
    { id: 'detailed', name: t('reportsPage.detailed'), icon: ChartBarIcon },
    { id: 'orders-dues', name: t('reportsPage.ordersWithDues'), icon: ShoppingCartIcon },
    { id: 'suppliers-balance', name: t('reportsPage.suppliersBalance'), icon: TruckIcon },
    { id: 'low-stock', name: t('reportsPage.lowStock'), icon: ExclamationTriangleIcon },
    { id: 'pending-advances', name: t('reportsPage.pendingAdvances'), icon: UserGroupIcon },
    { id: 'monthly-expenses', name: t('reportsPage.monthlyExpenses'), icon: CurrencyDollarIcon },
    { id: 'employee-salary', name: t('reportsPage.employeeSalary'), icon: UserGroupIcon },
    { id: 'purchase-payment', name: t('reportsPage.purchasePayments'), icon: TruckIcon },
    { id: 'roznamcha', name: t('reportsPage.roznamcha'), icon: ClipboardDocumentIcon }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-3 p-3">
      {/* Header */}
      <PageHeader
        title={t('reportsPage.title')}
        subtitle={t('reportsPage.subtitle')}
        icon={ChartBarIcon}
        actions={
          <button
            onClick={handleRefresh}
            disabled={loading}
            className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1 disabled:opacity-50"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('reportsPage.refresh')}
          </button>
        }
      />

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden">
        <div className="border-b border-gray-200 dark:border-gray-700">
          <div className="flex overflow-x-auto scrollbar-hide">
            {tabs.map((tab) => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => handleTabChange(tab.id)}
                  className={`px-2 py-1.5 flex items-center gap-1 whitespace-nowrap border-b-2 transition-colors text-xs ${
                    activeTab === tab.id
                      ? 'border-blue-600 text-blue-600 font-semibold bg-blue-50 dark:bg-blue-900/20'
                      : 'border-transparent text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-white hover:bg-gray-50 dark:hover:bg-gray-700'
                  }`}
                >
                  <Icon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{tab.name}</span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Filters and Controls */}
        <div className="p-3 bg-gray-50 dark:bg-gray-700/50 border-b border-gray-200 dark:border-gray-700">
          <div className="flex flex-wrap gap-2 sm:gap-3 items-end">
            <div className="flex items-center gap-1 text-gray-700 dark:text-gray-300">
              <FunnelIcon className="h-3.5 w-3.5" />
              <span className="text-xs font-medium">{t('reportsPage.filters')}:</span>
            </div>
            
            {activeTab === 'detailed' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.period')}</label>
                  <select
                    value={period}
                    onChange={(e) => setPeriod(e.target.value)}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  >
              <option value="daily">{t('reportsPage.daily')}</option>
              <option value="weekly">{t('reportsPage.weekly')}</option>
              <option value="monthly">{t('reportsPage.monthly')}</option>
              <option value="yearly">{t('reportsPage.yearly')}</option>
              <option value="custom">{t('reportsPage.customRange')}</option>
            </select>
          </div>
          
          {period === 'custom' && (
            <>
              <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.startDate')}</label>
                      <LocalizedDateInput
                        value={startDate}
                        onChange={(dateValue) => setStartDate(dateValue)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.endDate')}</label>
                      <LocalizedDateInput
                        value={endDate}
                        onChange={(dateValue) => setEndDate(dateValue)}
                        className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      />
                    </div>
                  </>
                )}
              </>
            )}

            {activeTab === 'orders-dues' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.minDue')}</label>
                  <input
                    type="number"
                    value={filters.min_due}
                    onChange={(e) => handleFilterChange('min_due', e.target.value)}
                    placeholder={t('reportsPage.minAmount')}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-28"
                  />
              </div>
              <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.maxDue')}</label>
                  <input
                    type="number"
                    value={filters.max_due}
                    onChange={(e) => handleFilterChange('max_due', e.target.value)}
                    placeholder={t('reportsPage.maxAmount')}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 w-28"
                  />
              </div>
            </>
          )}
          
            {activeTab === 'low-stock' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.itemType')}</label>
                  <select
                    value={filters.item_type}
                    onChange={(e) => handleFilterChange('item_type', e.target.value)}
                    className="px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="">{t('reportsPage.allTypes')}</option>
                    <option value="raw_material">{t('reportsPage.rawMaterial')}</option>
                    <option value="finished_product">{t('reportsPage.finishedProduct')}</option>
                  </select>
                </div>
                <div className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    id="critical_only"
                    checked={filters.critical_only}
                    onChange={(e) => handleFilterChange('critical_only', e.target.checked)}
                    className="rounded border-gray-300 dark:border-gray-600"
                  />
                  <label htmlFor="critical_only" className="text-xs font-medium text-gray-700 dark:text-gray-300">
                    {t('reportsPage.criticalOnly')}
                  </label>
                </div>
            </>
          )}

            {activeTab === 'roznamcha' && (
              <>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.startDate')}</label>
                  <LocalizedDateInput
                    value={startDate}
                    onChange={(dateValue) => setStartDate(dateValue)}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('reportsPage.endDate')}</label>
                  <LocalizedDateInput
                    value={endDate}
                    onChange={(dateValue) => setEndDate(dateValue)}
                    className="px-2 py-1 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  />
                </div>
              </>
            )}

            <button
              onClick={() => handleTabChange(activeTab)}
              className="px-3 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 transition-colors flex items-center gap-1"
            >
              <CalendarIcon className="h-3.5 w-3.5" />
              {t('reportsPage.applyFilters')}
            </button>

            {/* Export Buttons */}
            {((activeTab === 'detailed' && detailedReport) || 
              (activeTab === 'orders-dues' && ordersWithDues) ||
              (activeTab === 'suppliers-balance' && suppliersWithBalance) ||
              (activeTab === 'low-stock' && lowStock) ||
              (activeTab === 'pending-advances' && pendingAdvances) ||
              (activeTab === 'monthly-expenses' && monthlyExpenses) ||
              (activeTab === 'employee-salary' && employeeSalary) ||
              (activeTab === 'purchase-payment' && purchasePaymentStatus) ||
              (activeTab === 'roznamcha' && roznamchaReport)) && (
              <div className="flex gap-1.5 ml-auto">
                <button
                  onClick={exportToPDF}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
                  title="Export to PDF"
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('reportsPage.exportPdf')}</span>
                </button>
                <button
                  onClick={exportToExcel}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
                  title={t('reportsPage.exportToExcel')}
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('reportsPage.exportExcel')}</span>
                </button>
                <button
                  onClick={exportToCSV}
                  className="px-2 py-1 text-xs bg-blue-600 text-white rounded hover:bg-blue-700 flex items-center gap-1 transition-colors"
                  title={t('reportsPage.exportToCsv')}
                >
                  <DocumentArrowDownIcon className="h-3.5 w-3.5" />
                  <span className="hidden sm:inline">{t('reportsPage.exportCsv')}</span>
                </button>
              </div>
            )}
          </div>
        </div>

        {/* Content */}
        <div className="p-3">
          {loading ? (
            <div className="flex justify-center items-center py-8">
              <div className="h-8 w-8 animate-spin border-3 border-blue-600 border-t-transparent rounded-full" />
            </div>
          ) : (
            <>
              {/* Detailed Report */}
              {activeTab === 'detailed' && detailedReport && (
                <div className="space-y-3">
                  {/* Financial Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-2">
                    <div className="p-3 bg-sky-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-0.5">{t('reportsPage.revenue')}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-blue-400">
                        AFN {(detailedReport.financial_summary?.revenue ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-sky-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-0.5">{t('reportsPage.costs')}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-red-400">
                        AFN {(detailedReport.financial_summary?.costs ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-sky-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-0.5">{t('reportsPage.expenses')}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-orange-400">
                        AFN {(detailedReport.financial_summary?.expenses ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-sky-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-0.5">{t('reportsPage.profit')}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-green-400">
                        AFN {(detailedReport.financial_summary?.profit ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-sky-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-0.5">{t('reportsPage.receivables')}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-yellow-400">
                        AFN {(detailedReport.financial_summary?.receivables ?? 0).toFixed(2)}
                      </div>
                    </div>
                    <div className="p-3 bg-sky-100 dark:bg-gray-800 rounded-lg border-l-4 border-green-500">
                      <div className="text-xs font-medium text-gray-700 dark:text-gray-400 mb-0.5">{t('reportsPage.payables')}</div>
                      <div className="text-sm font-bold text-gray-900 dark:text-purple-400">
                        AFN {(detailedReport.financial_summary?.payables ?? 0).toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {/* Direct Sales Profit Summary */}
                  {detailedReport.direct_sales && (
                    <div className="mt-2 p-3 bg-emerald-50 dark:bg-gray-800 rounded-lg border border-emerald-200 dark:border-emerald-700">
                      <h3 className="text-xs font-semibold text-emerald-800 dark:text-emerald-300 mb-1 flex items-center gap-1">
                        <CurrencyDollarIcon className="h-3.5 w-3.5" />
                        {t('reportsPage.directSalesSection')}
                      </h3>
                      <div className="grid grid-cols-2 md:grid-cols-4 gap-2 text-[11px]">
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">{t('reportsPage.directSalesCount')}</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            {detailedReport.direct_sales.total_direct_sales || 0}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">{t('reportsPage.directSalesRevenue')}</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            AFN {(detailedReport.direct_sales.total_revenue ?? 0).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">{t('reportsPage.directSalesCost')}</div>
                          <div className="font-semibold text-gray-900 dark:text-gray-100">
                            AFN {(detailedReport.direct_sales.total_cost ?? 0).toFixed(2)}
                          </div>
                        </div>
                        <div>
                          <div className="text-gray-500 dark:text-gray-400">{t('reportsPage.directSalesProfit')}</div>
                          <div className="font-semibold text-emerald-700 dark:text-emerald-300">
                            AFN {(detailedReport.direct_sales.total_profit ?? 0).toFixed(2)}
                          </div>
                        </div>
                      </div>
                    </div>
                  )}

                  {/* Charts */}
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-gray-100">{t('reportsPage.financialOverview')}</h3>
                      <ResponsiveContainer width="100%" height={140}>
                        <PieChart>
                          <Pie
                            data={getFinancialChartData()}
                            cx="50%"
                            cy="40%"
                            labelLine={false}
                            label={false}
                            outerRadius={42}
                            innerRadius={10}
                            fill="#8884d8"
                            dataKey="value"
                            paddingAngle={2}
                          >
                            {getFinancialChartData().map((entry, index) => (
                              <Cell key={`cell-${index}`} fill={entry.color} />
                            ))}
                          </Pie>
                          <Tooltip 
                            formatter={(value) => `AFN ${value.toFixed(2)}`}
                            contentStyle={{ fontSize: '10px', padding: '3px' }}
                          />
                          <Legend 
                            verticalAlign="bottom"
                            height={50}
                            wrapperStyle={{ fontSize: '9px', lineHeight: '12px', paddingTop: '5px' }}
                            iconSize={7}
                            formatter={(value) => value}
                            layout="horizontal"
                          />
                        </PieChart>
                      </ResponsiveContainer>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-gray-100">{t('reportsPage.ordersByStatus')}</h3>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={getOrdersByStatusData()}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="name" tick={{ fontSize: 10 }} />
                          <YAxis tick={{ fontSize: 10 }} />
                          <Tooltip />
                          <Bar dataKey="count" fill="#3b82f6" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  </div>

                  {/* Direct Sales Detailed Table */}
                  {detailedReport.direct_sales && detailedReport.direct_sales.sales && detailedReport.direct_sales.sales.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-gray-100">
                        {t('reportsPage.directSalesDetails')}
                      </h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-[11px]">
                          <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.saleId')}</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.customer')}</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.date')}</th>
                              <th className="px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.total')}</th>
                              <th className="px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.cost')}</th>
                              <th className="px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.netAmount')}</th>
                              <th className="px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.profit')}</th>
                              <th className="px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.due')}</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.paymentStatus')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                            {detailedReport.direct_sales.sales.map((s) => (
                              <tr key={s.id}>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">#{s.id}</td>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">{s.customer}</td>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">
                                  {s.date ? formatDate(s.date) : ''}
                                </td>
                                <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">
                                  AFN {s.total_amount.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">
                                  AFN {s.cost_amount.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">
                                  AFN {s.net_amount.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-right font-semibold text-emerald-700 dark:text-emerald-300">
                                  AFN {s.profit.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">
                                  AFN {s.due.toFixed(2)}
                                </td>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">
                                  {s.payment_status}
                                </td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}

                  {/* Summary Cards */}
                  <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-5 gap-2">
                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('reportsPage.ordersSummary')}</h3>
                      <div className="text-sm font-bold text-blue-600 dark:text-blue-400 mb-0.5">
                        {detailedReport.orders?.total_orders ?? 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('reportsPage.totalRevenue')}: AFN {(detailedReport.orders?.total_revenue ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-red-600 dark:text-red-400 mt-0.5">
                        {t('reportsPage.totalDue')}: AFN {(detailedReport.orders?.total_due ?? 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('reportsPage.purchasesSummary')}</h3>
                      <div className="text-sm font-bold text-purple-600 dark:text-purple-400 mb-0.5">
                        {detailedReport.purchases?.total_purchases ?? 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('reportsPage.totalCost')}: AFN {(detailedReport.purchases?.total_cost ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                        {t('reportsPage.remaining')}: AFN {(detailedReport.purchases?.total_remaining ?? 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('reportsPage.expensesSummary')}</h3>
                      <div className="text-sm font-bold text-red-600 dark:text-red-400 mb-0.5">
                        {detailedReport.expenses?.count ?? 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('reportsPage.totalExpenses')}: AFN {(detailedReport.expenses?.total_expenses ?? 0).toFixed(2)}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('reportsPage.inventorySummary')}</h3>
                      <div className="text-sm font-bold text-green-600 dark:text-green-400 mb-0.5">
                        {detailedReport.inventory?.total_items ?? 0}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('reportsPage.stockValue')}: AFN {(detailedReport.inventory?.total_stock_value ?? 0).toFixed(2)}
                      </div>
                      <div className="text-xs text-yellow-600 dark:text-yellow-400 mt-0.5">
                        {t('reportsPage.lowStockItems')}: {detailedReport.inventory?.low_stock_items ?? 0}
                      </div>
                    </div>

                    <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1 text-gray-900 dark:text-gray-100">{t('reportsPage.printingSummary')}</h3>
                      <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                        {printingReport.count}
                      </div>
                      <div className="text-xs text-gray-600 dark:text-gray-400">
                        {t('reportsPage.totalPrintingCost')}: AFN {printingReport.total_cost.toFixed(2)}
                      </div>
                    </div>
                  </div>

                  {printingReport.jobs.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-gray-100">{t('reportsPage.printingDetails')}</h3>
                      <div className="overflow-x-auto">
                        <table className="min-w-full divide-y divide-gray-200 dark:divide-gray-700 text-[11px]">
                          <thead className="bg-gray-50 dark:bg-gray-900/40">
                            <tr>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.purchaseId')}</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.supplier')}</th>
                              <th className="px-2 py-1 text-left font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.date')}</th>
                              <th className="px-2 py-1 text-right font-medium text-gray-700 dark:text-gray-300">{t('reportsPage.totalCost')}</th>
                            </tr>
                          </thead>
                          <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-100 dark:divide-gray-700">
                            {printingReport.jobs.slice(0, 15).map((job) => (
                              <tr key={job.id}>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">#{job.id}</td>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">{job.printer_name || '-'}</td>
                                <td className="px-2 py-1 text-gray-700 dark:text-gray-200">{job.job_date ? formatDate(job.job_date) : '-'}</td>
                                <td className="px-2 py-1 text-right text-gray-700 dark:text-gray-200">AFN {parseFloat(job.total_price || 0).toFixed(2)}</td>
                              </tr>
                            ))}
                          </tbody>
                        </table>
                      </div>
                    </div>
                  )}
                </div>
              )}

              {/* Orders with Dues */}
              {activeTab === 'orders-dues' && ordersWithDues && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-red-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.totalOutstanding')}</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">
                      AFN {ordersWithDues.total_outstanding.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {ordersWithDues.count} {t('reportsPage.ordersWithOutstandingDues')}
                    </div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full text-xs min-w-[640px]">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.orderId')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.customer')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.phone')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.total')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.paid')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.due')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.date')}</th>
                            <th className="px-2 py-1.5 text-left font-semibold text-xs text-gray-700 dark:text-gray-300">{t('reportsPage.status')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {ordersWithDues.orders.map((order) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={order.order_id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">#{order.order_id}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">{order.customer_name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{order.customer_phone}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">AFN {order.total_amount.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-xs text-green-600 dark:text-green-400">AFN {order.total_paid.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-xs font-semibold text-red-600 dark:text-red-400">AFN {order.due_amount.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(order.order_date)}
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  order.status === 'completed' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                  order.status === 'pending' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                  'bg-gray-100 dark:bg-gray-700 text-gray-800 dark:text-gray-300'
                                }`}>
                                  {order.status}
                                </span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Suppliers with Balance */}
              {activeTab === 'suppliers-balance' && suppliersWithBalance && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-orange-50 to-orange-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-orange-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.totalOutstandingBalance')}</div>
                    <div className="text-sm font-bold text-orange-600 dark:text-orange-400">
                      AFN {suppliersWithBalance.total_outstanding.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {suppliersWithBalance.count} {t('reportsPage.suppliersWithOutstandingBalance')}
                    </div>
      </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[640px]">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.supplierId')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.name')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.contact')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.phone')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.balance')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.created')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {suppliersWithBalance.suppliers.map((supplier) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={supplier.supplier_id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">#{supplier.supplier_id}</td>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{supplier.name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{supplier.contact_person || '-'}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{supplier.phone}</td>
                              <td className="px-2 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                AFN {(parseFloat(supplier.balance || 0)).toLocaleString('en-US', { 
                                  minimumFractionDigits: 2, 
                                  maximumFractionDigits: 2 
                                })}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(supplier.created_at)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Low Stock Items */}
              {activeTab === 'low-stock' && lowStock && (
                <div className="space-y-4">
                  <div className="bg-gradient-to-r from-yellow-50 to-yellow-100 dark:from-gray-800 dark:to-gray-700 p-4 rounded-lg border-l-4 border-yellow-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.lowStock')}</div>
                    <div className="text-xl font-bold text-yellow-600 dark:text-yellow-400">{lowStock.count}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('reportsPage.itemsBelowMinimum')}</div>
          </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-600 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.itemId')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.name')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.sku')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.type')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.currentStock')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.minimum')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.unitPrice')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.stockValueItem')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {lowStock.items.map((item) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={item.item_id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">#{item.item_id}</td>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{item.name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{item.sku}</td>
                              <td className="px-2 py-1.5 text-xs">
                                <span className="px-1.5 py-0.5 rounded-full text-xs bg-blue-100 dark:bg-blue-900/30 text-blue-800 dark:text-blue-300">
                                  {item.item_type}
                                </span>
                              </td>
                              <td className={`px-2 py-1.5 text-xs font-semibold ${
                                item.current_stock === 0 ? 'text-red-600 dark:text-red-400' : 'text-yellow-600 dark:text-yellow-400'
                              }`}>
                                {item.current_stock}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{item.minimum_stock}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">AFN {item.unit_price.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">AFN {item.stock_value.toFixed(2)}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Pending Advances */}
              {activeTab === 'pending-advances' && pendingAdvances && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-purple-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.totalPendingAdvances')}</div>
                    <div className="text-sm font-bold text-purple-600 dark:text-purple-400">
                      AFN {pendingAdvances.total_pending.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {pendingAdvances.count} {t('reportsPage.pendingAdvance')}
            </div>
          </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[700px]">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.advanceId')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.employee')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.amount')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.dateGiven')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.returnPlan')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.status')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.notes')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {pendingAdvances.advances.map((advance) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={advance.advance_id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">#{advance.advance_id}</td>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{advance.employee_name}</td>
                              <td className="px-2 py-1.5 text-xs font-semibold text-purple-600 dark:text-purple-400">
                                AFN {advance.amount.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(advance.date_given)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{advance.return_plan || '-'}</td>
                              <td className="px-2 py-1.5 text-xs">
                                <span className="px-1.5 py-0.5 rounded-full text-xs font-medium bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300">
                                  {advance.status}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{advance.notes || '-'}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Monthly Expenses */}
              {activeTab === 'monthly-expenses' && monthlyExpenses && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-red-50 to-red-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-red-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.totalMonthlyExpenses')}</div>
                    <div className="text-sm font-bold text-red-600 dark:text-red-400">
                      AFN {monthlyExpenses.total_expenses.toFixed(2)}
                    </div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">
                      {t('reportsPage.periodLabel')}: {monthlyExpenses.period} | {monthlyExpenses.count} {t('reportsPage.expense')}
                    </div>
            </div>
            
                  {monthlyExpenses.by_category && monthlyExpenses.by_category.length > 0 && (
                    <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border dark:border-gray-600">
                      <h3 className="text-xs font-semibold mb-1.5 text-gray-900 dark:text-gray-100">Expenses by Category</h3>
                      <ResponsiveContainer width="100%" height={140}>
                        <BarChart data={monthlyExpenses.by_category}>
                          <CartesianGrid strokeDasharray="3 3" />
                          <XAxis dataKey="category" />
                          <YAxis />
                          <Tooltip formatter={(value) => `AFN ${value.toFixed(2)}`} />
                          <Bar dataKey="total" fill="#ef4444" />
                        </BarChart>
                      </ResponsiveContainer>
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-600 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.category')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.totalAmount')}</th>
                            <th className="px-2 py-1.5 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.count')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {monthlyExpenses.by_category?.map((item, index) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={index}>
                              <td className="px-3 py-2 text-xs font-medium text-gray-900 dark:text-gray-100">{item.category || 'Uncategorized'}</td>
                              <td className="px-3 py-2 text-xs font-semibold text-red-600 dark:text-red-400">
                                AFN {item.total.toFixed(2)}
                              </td>
                              <td className="px-3 py-2 text-xs text-gray-600 dark:text-gray-400">{item.count}</td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Employee Salary */}
              {activeTab === 'employee-salary' && employeeSalary && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-blue-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.employeeSalary')}</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">{employeeSalary.count}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('reportsPage.activeEmployees')}</div>
            </div>
            
                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.employeeId')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.name')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.salary')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.pendingAdvances')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.netSalary')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.joinDate')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {employeeSalary.employees.map((employee) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={employee.employee_id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">#{employee.employee_id}</td>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{employee.name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">AFN {employee.salary.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-xs text-orange-600 dark:text-orange-400">
                                AFN {employee.pending_advances.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-xs font-semibold text-green-600 dark:text-green-400">
                                AFN {employee.net_salary.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(employee.join_date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Purchase Payment Status */}
              {activeTab === 'purchase-payment' && purchasePaymentStatus && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-indigo-50 to-indigo-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-indigo-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.purchasePaymentStatus')}</div>
                    <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400">{purchasePaymentStatus.count}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{t('reportsPage.totalPurchasesLabel')}</div>
            </div>
            
                  {purchasePaymentStatus.by_status && purchasePaymentStatus.by_status.length > 0 && (
                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      {purchasePaymentStatus.by_status.map((status, index) => (
                        <div key={index} className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow border dark:border-gray-600">
                          <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-1">
                            {status.payment_status || 'Unknown'}
                          </div>
                          <div className="text-sm font-bold text-indigo-600 dark:text-indigo-400 mb-0.5">
                            AFN {status.total_cost.toFixed(2)}
                          </div>
                          <div className="text-xs text-gray-600 dark:text-gray-400">{status.count} purchase(s)</div>
                        </div>
                      ))}
                    </div>
                  )}

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[900px]">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.purchaseId')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.supplier')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.item')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.quantity')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.cost')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.paid')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.remaining')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.status')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.date')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {purchasePaymentStatus.purchases.map((purchase) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={purchase.purchase_id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">#{purchase.purchase_id}</td>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{purchase.supplier_name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{purchase.item_name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">{purchase.quantity}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-900 dark:text-gray-100">AFN {purchase.cost.toFixed(2)}</td>
                              <td className="px-2 py-1.5 text-xs text-green-600 dark:text-green-400">
                                AFN {purchase.total_paid.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-xs font-semibold text-orange-600 dark:text-orange-400">
                                AFN {purchase.remaining.toFixed(2)}
                              </td>
                              <td className="px-2 py-1.5 text-xs">
                                <span className={`px-1.5 py-0.5 rounded-full text-xs font-medium ${
                                  purchase.payment_status === 'paid' ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300' :
                                  purchase.payment_status === 'partial' ? 'bg-yellow-100 dark:bg-yellow-900/30 text-yellow-800 dark:text-yellow-300' :
                                  'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300'
                                }`}>
                                  {purchase.payment_status}
                                </span>
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(purchase.purchase_date)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
            </div>
          </div>
              )}

              {activeTab === 'roznamcha' && roznamchaReport && (
                <div className="space-y-3">
                  <div className="bg-gradient-to-r from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 p-3 rounded-lg border-l-4 border-blue-600">
                    <div className="text-xs font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('reportsPage.roznamchaReport')}</div>
                    <div className="text-sm font-bold text-blue-600 dark:text-blue-400">AFN {roznamchaReport.total_cost.toFixed(2)}</div>
                    <div className="text-xs text-gray-600 dark:text-gray-400 mt-1">{roznamchaReport.count} {t('reportsPage.entries')}</div>
                  </div>

                  <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 border border-gray-200 dark:border-gray-700 overflow-hidden">
                    <div className="overflow-x-auto">
                      <table className="w-full min-w-[600px]">
                        <thead className="bg-gray-50 dark:bg-gray-700">
                          <tr>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.itemName')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.date')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.description')}</th>
                            <th className="px-3 py-2 text-left text-xs font-semibold text-gray-700 dark:text-gray-300">{t('reportsPage.costPrice')}</th>
                          </tr>
                        </thead>
                        <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                          {roznamchaReport.entries.map((entry) => (
                            <tr className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors" key={entry.id}>
                              <td className="px-2 py-1.5 text-xs font-medium text-gray-900 dark:text-gray-100">{entry.item_name}</td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400">
                                {formatDate(entry.date)}
                              </td>
                              <td className="px-2 py-1.5 text-xs text-gray-600 dark:text-gray-400 max-w-xs truncate">
                                {entry.description || 'N/A'}
                              </td>
                              <td className="px-2 py-1.5 text-xs font-semibold text-blue-600 dark:text-blue-400">
                                AFN {parseFloat(entry.cost_price).toFixed(2)}
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* Empty State */}
              {!detailedReport && activeTab === 'detailed' && !loading && (
                <div className="text-center py-6">
                  <ChartBarIcon className="h-8 w-8 text-gray-400 dark:text-gray-500 mx-auto mb-2" />
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('reportsPage.noDataAvailable')}</p>
                </div>
              )}
        </>
      )}
        </div>
      </div>
        </div>
      </div>
    </div>
  );
};

export default Reports;
