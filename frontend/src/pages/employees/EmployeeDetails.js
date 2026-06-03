import React, { useState, useEffect, useRef } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  PencilIcon,
  TrashIcon,
  PlusIcon,
  PrinterIcon,
  CurrencyDollarIcon,
  CalendarIcon,
  UserIcon,
  DocumentTextIcon,
  XMarkIcon,
  BanknotesIcon,
  BuildingLibraryIcon,
  DocumentArrowDownIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import { formatDate } from '../../i18n/dateUtils';
// Import jspdf and autotable here to ensure plugin is loaded
import jsPDF from 'jspdf';
import 'jspdf-autotable';

const EmployeeDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, i18n } = useTranslation();
  const dateLocale = i18n.language === 'prs' ? 'fa-AF-u-ca-persian' : 'en-US';
  const printRef = useRef();
  
  const [employee, setEmployee] = useState(null);
  const [advances, setAdvances] = useState([]);
  const [salaryPayments, setSalaryPayments] = useState([]);
  const [loans, setLoans] = useState([]);
  const [tips, setTips] = useState([]);
  const [salaryDepositEntries, setSalaryDepositEntries] = useState([]);
  const [depositHold, setDepositHold] = useState({ amount: '', notes: '' });
  const [depositPayout, setDepositPayout] = useState({ amount: '', notes: '' });
  const [editingDepositEntry, setEditingDepositEntry] = useState(null);
  const [depositEditForm, setDepositEditForm] = useState({ amount: '', notes: '' });
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('details'); // 'details', 'advances', 'salary', 'loans'
  
  // CRUD modals
  const [showAdvanceForm, setShowAdvanceForm] = useState(false);
  const [showLoanForm, setShowLoanForm] = useState(false);
  const [showSalaryForm, setShowSalaryForm] = useState(false);
  const [showTipForm, setShowTipForm] = useState(false);
  const [editingTip, setEditingTip] = useState(null);
  const [editingAdvance, setEditingAdvance] = useState(null);
  const [editingLoan, setEditingLoan] = useState(null);
  const [editingSalary, setEditingSalary] = useState(null);
  const [showEditSalaryModal, setShowEditSalaryModal] = useState(false);
  const [editSalaryData, setEditSalaryData] = useState({ base_salary: '', payment_date: '' });
  const [deletingItem, setDeletingItem] = useState(null);
  const [deleteSalaryDialog, setDeleteSalaryDialog] = useState(null);
  const [deleteSalaryNote, setDeleteSalaryNote] = useState('');
  const [showLoanPaymentForm, setShowLoanPaymentForm] = useState(false);
  const [selectedLoanForPayment, setSelectedLoanForPayment] = useState(null);
  const [loanPaymentAmount, setLoanPaymentAmount] = useState('');
  const [loanPaymentNotes, setLoanPaymentNotes] = useState('');

  const formatAFN = (value) => `AFN ${(parseFloat(value) || 0).toLocaleString('en-US', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  
  // Form data
  const [advanceData, setAdvanceData] = useState({
    amount: '',
    return_plan: '',
    notes: '',
    date_given: new Date().toISOString().split('T')[0]
  });
  
  const [loanData, setLoanData] = useState({
    amount: '',
    loan_date: new Date().toISOString().split('T')[0],
    repayment_plan: '',
    interest_rate: '',
    notes: ''
  });
  
  const [salaryData, setSalaryData] = useState({
    month: new Date().toISOString().slice(0, 7) + '-01',
    base_salary: '',
    notes: '',
    period_type: 'monthly', // 'monthly' or 'weekly'
    week_start: new Date().toISOString().slice(0, 10),
    weekly_payment_date: new Date().toISOString().slice(0, 10),
  });
  const [selectedMonths, setSelectedMonths] = useState([]);
  const [payAllMonths, setPayAllMonths] = useState(false);

  const [tipData, setTipData] = useState({
    amount: '',
    date: new Date().toISOString().split('T')[0],
    reason: ''
  });

  useEffect(() => {
    fetchEmployeeData();
  }, [id]);

  const fetchEmployeeData = async () => {
    setLoading(true);
    try {
      // Fetch employee
      const empRes = await api.get(`/api/employees/${id}/`);
      setEmployee(empRes.data);
      
      // Fetch advances
      const advancesRes = await api.get(`/api/advances/?employee=${id}`);
      setAdvances(Array.isArray(advancesRes.data) ? advancesRes.data : advancesRes.data.results || []);
      
      // Fetch salary payments
      const salaryRes = await api.get(`/api/salary-payments/?employee=${id}`);
      setSalaryPayments(Array.isArray(salaryRes.data) ? salaryRes.data : salaryRes.data.results || []);
      
      // Fetch loans (if loan API exists, otherwise use empty array)
      try {
        const loansRes = await api.get(`/api/loans/?employee=${id}`);
        setLoans(Array.isArray(loansRes.data) ? loansRes.data : loansRes.data.results || []);
      } catch (err) {
        setLoans([]);
      }

      // Fetch tips
      try {
        const tipsRes = await api.get(`/api/tips/?employee=${id}`);
        setTips(Array.isArray(tipsRes.data) ? tipsRes.data : tipsRes.data.results || []);
      } catch (err) {
        setTips([]);
      }

      try {
        const depRes = await api.get(`/api/salary-deposit-entries/?employee=${id}`);
        setSalaryDepositEntries(Array.isArray(depRes.data) ? depRes.data : depRes.data.results || []);
      } catch (err) {
        setSalaryDepositEntries([]);
      }
    } catch (err) {
      console.error('Error fetching employee data:', err);
      addToast(t('employees.toast.fetchFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateAdvance = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/advances/', {
        employee: id,
        ...advanceData,
        amount: parseFloat(advanceData.amount)
      });
      addToast(t('employees.toast.advanceCreated'), 'success');
      setShowAdvanceForm(false);
      setAdvanceData({ amount: '', return_plan: '', notes: '', date_given: new Date().toISOString().split('T')[0] });
      fetchEmployeeData();
    } catch (err) {
      console.error('Error creating advance:', err);
      addToast(t('employees.toast.advanceCreateFailed'), 'error');
    }
  };

  const handleUpdateAdvance = async (e) => {
    e.preventDefault();
    try {
      await api.patch(`/api/advances/${editingAdvance.id}/`, {
        ...advanceData,
        amount: parseFloat(advanceData.amount)
      });
      addToast(t('employees.toast.advanceUpdated'), 'success');
      setShowAdvanceForm(false);
      setEditingAdvance(null);
      setAdvanceData({ amount: '', return_plan: '', notes: '', date_given: new Date().toISOString().split('T')[0] });
      fetchEmployeeData();
    } catch (err) {
      console.error('Error updating advance:', err);
      addToast(t('employees.toast.advanceUpdateFailed'), 'error');
    }
  };

  const handleDepositHoldSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositHold.amount);
    if (!amt || amt <= 0) {
      addToast(t('employees.depositAmountRequired'), 'error');
      return;
    }
    try {
      await api.post('/api/salary-deposit-entries/', {
        employee: parseInt(id, 10),
        entry_type: 'hold',
        amount: amt,
        notes: depositHold.notes || ''
      });
      addToast(t('employees.depositHoldSaved'), 'success');
      setDepositHold({ amount: '', notes: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.amount?.[0] || err.response?.data?.detail || t('employees.depositSaveFailed'), 'error');
    }
  };

  const handleDepositPayoutSubmit = async (e) => {
    e.preventDefault();
    const amt = parseFloat(depositPayout.amount);
    if (!amt || amt <= 0) {
      addToast(t('employees.depositAmountRequired'), 'error');
      return;
    }
    try {
      await api.post('/api/salary-deposit-entries/', {
        employee: parseInt(id, 10),
        entry_type: 'payout',
        amount: amt,
        notes: depositPayout.notes || ''
      });
      addToast(t('employees.depositPayoutSaved'), 'success');
      setDepositPayout({ amount: '', notes: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.amount?.[0] || err.response?.data?.detail || t('employees.depositSaveFailed'), 'error');
    }
  };

  const printDepositSlip = (row) => {
    const w = window.open('', '_blank');
    const isRtl = i18n.language === 'prs';
    const typeLabel = row.entry_type === 'hold' ? t('employees.entryTypeHold') : t('employees.entryTypePayout');
    const when = row.created_at ? new Date(row.created_at).toLocaleString(dateLocale) : '—';
    const amt = (parseFloat(row.amount) || 0).toFixed(2);
    w.document.write(`
      <html dir="${isRtl ? 'rtl' : 'ltr'}">
      <head>
        <meta charset="utf-8"/>
        <title>${t('employees.printDepositSlip')}</title>
        <style>
          @page { size: 80mm auto; margin: 4mm; }
          body { font-family: Tahoma, Arial, sans-serif; font-size: 11px; width: 72mm; margin: 0 auto; padding: 6px; }
          h1 { font-size: 13px; margin: 0 0 6px; text-align: center; }
          .muted { color: #555; font-size: 9px; text-align: center; }
          .row { display: flex; justify-content: space-between; margin: 4px 0; border-bottom: 1px dashed #ccc; padding-bottom: 4px; }
          .tag { display: inline-block; padding: 2px 6px; border-radius: 4px; font-size: 9px; font-weight: 600;
            background: ${row.entry_type === 'hold' ? '#ccfbf1' : '#e0e7ff'}; }
        </style>
      </head>
      <body>
        <h1>${t('employees.deposit')}</h1>
        <p class="muted">Afghan Flag — ${when}</p>
        <div class="row"><span>${t('common.name')}</span><span>${employee?.name || ''}</span></div>
        <div class="row"><span>${t('employees.nid')}</span><span>${employee?.nid || ''}</span></div>
        <div class="row"><span>${t('common.type')}</span><span><span class="tag">${typeLabel}</span></span></div>
        <div class="row"><span>${t('employees.amount')}</span><span><strong>AFN ${amt}</strong></span></div>
        ${row.notes ? `<div class="row"><span>${t('employees.notes')}</span><span>${String(row.notes).replace(/</g, '&lt;')}</span></div>` : ''}
        <p class="muted" style="margin-top:10px;">#${row.id}</p>
      </body></html>
    `);
    w.document.close();
    w.focus();
    w.print();
  };

  const openDepositEdit = (row) => {
    setEditingDepositEntry(row);
    setDepositEditForm({
      amount: row.amount != null ? String(row.amount) : '',
      notes: row.notes || ''
    });
  };

  const saveDepositEdit = async (e) => {
    e.preventDefault();
    if (!editingDepositEntry) return;
    const amt = parseFloat(depositEditForm.amount);
    if (!Number.isFinite(amt) || amt <= 0) {
      addToast(t('employees.depositAmountRequired'), 'error');
      return;
    }
    try {
      await api.patch(`/api/salary-deposit-entries/${editingDepositEntry.id}/`, {
        amount: amt,
        notes: depositEditForm.notes || ''
      });
      addToast(t('employees.depositEntryUpdated'), 'success');
      setEditingDepositEntry(null);
      setDepositEditForm({ amount: '', notes: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error(err);
      addToast(err.response?.data?.amount?.[0] || err.response?.data?.detail || t('employees.depositSaveFailed'), 'error');
    }
  };

  const handleDeleteAdvance = async () => {
    if (!deletingItem) return;
    try {
      if (deletingItem.type === 'advance') {
        await api.delete(`/api/advances/${deletingItem.id}/`);
        addToast(t('employees.toast.advanceDeleted'), 'success');
      } else if (deletingItem.type === 'loan') {
        await api.delete(`/api/loans/${deletingItem.id}/`);
        addToast(t('employees.toast.loanDeleted'), 'success');
      }
      setDeletingItem(null);
      fetchEmployeeData();
    } catch (err) {
      console.error('Error deleting:', err);
      addToast(t('employees.toast.deleteFailed'), 'error');
    }
  };

  const handleCreateLoan = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/loans/', {
        employee: id,
        amount: parseFloat(loanData.amount),
        loan_date: loanData.loan_date,
        interest_rate: loanData.interest_rate ? parseFloat(loanData.interest_rate) : 0,
        repayment_plan: loanData.repayment_plan,
        notes: loanData.notes,
        status: 'Active'
      });
      addToast(t('employees.toast.loanCreated'), 'success');
      setShowLoanForm(false);
      setLoanData({ amount: '', loan_date: new Date().toISOString().split('T')[0], repayment_plan: '', interest_rate: '', notes: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error('Error creating loan:', err);
      addToast(t('employees.toast.loanCreateFailed'), 'error');
    }
  };

  const handleUpdateLoan = async (e) => {
    e.preventDefault();
    if (!editingLoan) return;
    try {
      await api.patch(`/api/loans/${editingLoan.id}/`, {
        amount: parseFloat(loanData.amount),
        loan_date: loanData.loan_date,
        interest_rate: loanData.interest_rate ? parseFloat(loanData.interest_rate) : 0,
        repayment_plan: loanData.repayment_plan,
        notes: loanData.notes
      });
      addToast(t('employees.toast.loanUpdated'), 'success');
      setShowLoanForm(false);
      setEditingLoan(null);
      setLoanData({ amount: '', loan_date: new Date().toISOString().split('T')[0], repayment_plan: '', interest_rate: '', notes: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error('Error updating loan:', err);
      addToast(t('employees.toast.loanUpdateFailed'), 'error');
    }
  };

  const handleDeleteLoan = async () => {
    if (!deletingItem) return;
    try {
      await api.delete(`/api/loans/${deletingItem.id}/`);
      addToast(t('employees.toast.loanDeletedSingle'), 'success');
      setDeletingItem(null);
      fetchEmployeeData();
    } catch (err) {
      console.error('Error deleting loan:', err);
      addToast(t('employees.toast.loanDeleteFailed'), 'error');
    }
  };

  const handleCreateTip = async (e) => {
    e.preventDefault();
    try {
      await api.post('/api/tips/', {
        employee: id,
        amount: parseFloat(tipData.amount),
        date: tipData.date,
        reason: tipData.reason
      });
      addToast(t('employees.toast.tipCreated'), 'success');
      setShowTipForm(false);
      setTipData({ amount: '', date: new Date().toISOString().split('T')[0], reason: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error('Error creating tip:', err);
      addToast(t('employees.toast.tipCreateFailed'), 'error');
    }
  };

  const handleUpdateTip = async (e) => {
    e.preventDefault();
    if (!editingTip?.id) return;
    try {
      await api.patch(`/api/tips/${editingTip.id}/`, {
        amount: parseFloat(tipData.amount),
        date: tipData.date,
        reason: tipData.reason
      });
      addToast(t('employees.toast.tipCreated'), 'success');
      setShowTipForm(false);
      setEditingTip(null);
      setTipData({ amount: '', date: new Date().toISOString().split('T')[0], reason: '' });
      fetchEmployeeData();
    } catch (err) {
      console.error('Error updating tip:', err);
      addToast(t('employees.toast.tipCreateFailed'), 'error');
    }
  };

  const handleEditTip = (tip) => {
    setEditingTip(tip);
    setTipData({
      amount: tip.amount || '',
      date: tip.date || new Date().toISOString().split('T')[0],
      reason: tip.reason || ''
    });
    setShowTipForm(true);
  };

  const handleCreateSalary = async (e) => {
    e.preventDefault();
    try {
      const monthlySalary = parseFloat(employee.salary) || 0;
      const weeklySalary = monthlySalary / 4; // simple 4-weeks approximation
      
      if (salaryData.period_type === 'weekly') {
        const base = weeklySalary;
        await api.post('/api/salary-payments/', {
          employee: id,
          month: salaryData.week_start,
          base_salary: base,
          notes: salaryData.notes || t('employees.weeklySalaryNotesDefault'),
          period_type: 'weekly',
          payment_date: salaryData.weekly_payment_date || undefined,
        });
        addToast(t('employees.toast.weeklySalaryRecorded'), 'success');
      } else {
        // Determine which months to pay
        let monthsToPay = [];
        if (payAllMonths) {
          monthsToPay = getUnpaidMonths();
        } else if (selectedMonths.length > 0) {
          monthsToPay = getUnpaidMonths().filter(m => selectedMonths.includes(m.monthKey));
        } else {
          addToast(t('employees.toast.selectMonthError'), 'error');
          return;
        }
        
        if (monthsToPay.length === 0) {
          addToast(t('employees.toast.noMonthsSelected'), 'error');
          return;
        }
        
        // Sort months chronologically to ensure advances are deducted in order
        monthsToPay.sort((a, b) => a.date - b.date);
        
        // Create salary payments for each selected month sequentially
        // (Sequential to ensure advances are deducted in order by the backend)
        for (const monthData of monthsToPay) {
          const monthDate = `${monthData.year}-${String(monthData.month).padStart(2, '0')}-01`;
          await api.post('/api/salary-payments/', {
            employee: id,
            month: monthDate,
            base_salary: getSalaryForMonth(monthData.year, monthData.month),
            notes: salaryData.notes || (monthsToPay.length > 1 ? t('employees.bulkPaymentMonthsNote', { count: monthsToPay.length }) : ''),
            period_type: 'monthly',
          });
        }
        
        addToast(t('employees.toast.salaryRecordedMonths', { count: monthsToPay.length }), 'success');
      }
      setShowSalaryForm(false);
      setSalaryData({
        month: new Date().toISOString().slice(0, 7) + '-01',
        base_salary: '',
        notes: '',
        period_type: 'monthly',
        week_start: new Date().toISOString().slice(0, 10),
        weekly_payment_date: new Date().toISOString().slice(0, 10),
      });
      setSelectedMonths([]);
      setPayAllMonths(false);
      fetchEmployeeData();
    } catch (err) {
      console.error('Error creating salary payment:', err);
      addToast(t('employees.toast.salaryCreateFailed'), 'error');
    }
  };

  const handleEditAdvance = (advance) => {
    setEditingAdvance(advance);
    setAdvanceData({
      amount: advance.amount,
      return_plan: advance.return_plan || '',
      notes: advance.notes || '',
      date_given: advance.date_given || new Date().toISOString().split('T')[0]
    });
    setShowAdvanceForm(true);
  };

  const handleEditSalary = async (e) => {
    e.preventDefault();
    if (!editSalaryData.base_salary || parseFloat(editSalaryData.base_salary) <= 0) {
      addToast(t('employees.toast.invalidSalaryAmount'), 'error');
      return;
    }
    if (!editSalaryData.payment_date?.trim()) {
      addToast(t('employees.toast.salaryPaymentDateRequired'), 'error');
      return;
    }
    try {
      await api.patch(`/api/salary-payments/${editingSalary.id}/`, {
        base_salary: parseFloat(editSalaryData.base_salary),
        payment_date: editSalaryData.payment_date.trim(),
      });
      addToast(t('employees.toast.salaryUpdated'), 'success');
      setShowEditSalaryModal(false);
      setEditingSalary(null);
      fetchEmployeeData();
    } catch (err) {
      console.error('Error updating salary payment:', err);
      addToast(t('employees.toast.salaryUpdateFailed'), 'error');
    }
  };

  const handleDeleteSalary = async () => {
    if (!deleteSalaryDialog?.id) return;
    try {
      await api.delete(`/api/salary-payments/${deleteSalaryDialog.id}/`, {
        data: {
          delete_note: deleteSalaryNote || ''
        }
      });
      addToast(t('employees.toast.salaryDeleted'), 'success');
      setDeleteSalaryDialog(null);
      setDeleteSalaryNote('');
      fetchEmployeeData();
    } catch (err) {
      console.error('Error deleting salary payment:', err);
      addToast(t('employees.toast.salaryDeleteFailed'), 'error');
    }
  };

  const handlePrint = () => {
    const printWindow = window.open('', '_blank');
    const isRtl = i18n.language === 'prs';
    const statusLabel = employee.is_active ? t('employees.active') : t('employees.inactive');
    printWindow.document.write(`
      <html dir="${isRtl ? 'rtl' : 'ltr'}">
        <head>
          <meta charset="utf-8" />
          <title>${t('employees.printDocumentTitle', { name: employee.name })}</title>
          <style>
            body { font-family: Tahoma, Arial, sans-serif; padding: 20px; }
            h1 { color: #1f2937; }
            table { width: 100%; border-collapse: collapse; margin: 20px 0; }
            th, td { border: 1px solid #ddd; padding: 8px; text-align: ${isRtl ? 'right' : 'left'}; }
            th { background-color: #1f2937; color: white; }
            .summary { display: grid; grid-template-columns: repeat(4, 1fr); gap: 15px; margin: 20px 0; }
            .summary-card { border: 1px solid #ddd; padding: 15px; border-radius: 5px; }
            @media print {
              .no-print { display: none; }
            }
          </style>
        </head>
        <body>
          <h1>${t('employees.printReportTitle')}</h1>
          <div class="summary">
            <div class="summary-card">
              <strong>${t('common.name')}:</strong> ${employee.name}<br>
              <strong>${t('employees.nid')}:</strong> ${employee.nid}<br>
              <strong>${t('common.phone')}:</strong> ${employee.phone}
            </div>
            <div class="summary-card">
              <strong>${t('employees.monthlySalary')}:</strong> AFN ${(parseFloat(employee.salary) || 0).toFixed(2)}<br>
              <strong>${t('employees.pendingAdvances')}:</strong> AFN ${totals.pendingAdvances.toFixed(2)}<br>
              <strong>${t('employees.netSalary')}:</strong> AFN ${(parseFloat(employee.net_salary) || parseFloat(employee.salary) - totals.pendingAdvances).toFixed(2)}
            </div>
            <div class="summary-card">
              <strong>${t('employees.totalAdvancesLabel')}:</strong> AFN ${totals.totalAdvances.toFixed(2)}<br>
              <strong>${t('employees.totalSalaryPaidLabel')}:</strong> AFN ${totals.totalSalaryPaid.toFixed(2)}<br>
              <strong>${t('employees.totalLoans')}:</strong> AFN ${totals.totalLoans.toFixed(2)}
            </div>
            <div class="summary-card">
              <strong>${t('employees.joinDate')}:</strong> ${new Date(employee.join_date).toLocaleDateString(dateLocale)}<br>
              <strong>${t('common.status')}:</strong> ${statusLabel}
            </div>
          </div>
          ${printRef.current ? printRef.current.innerHTML : ''}
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handleExportPDF = () => {
    try {
      const doc = new jsPDF();
      const pageWidth = doc.internal.pageSize.getWidth();
      let startY = 20;

      // Title
      doc.setFontSize(18);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Details Report', pageWidth / 2, startY, { align: 'center' });
      startY += 10;

      doc.setFontSize(12);
      doc.setTextColor(75, 85, 99);
      doc.setFont('helvetica', 'normal');
      doc.text(`Report Date: ${new Date().toLocaleDateString(dateLocale)}`, pageWidth - 20, startY, { align: 'right' });
      startY += 10;

      // Employee Information
      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Employee Information', 14, startY);
      startY += 8;

      doc.setFontSize(10);
      doc.setTextColor(75, 85, 99);
      doc.setFont('helvetica', 'normal');
      
      // Helper function to safely encode text
      const safeText = (text) => {
        if (!text) return 'N/A';
        return String(text).replace(/[^\x00-\x7F]/g, ''); // Remove non-ASCII characters for compatibility
      };

      const employeeInfo = [
        ['Name:', safeText(employee.name)],
        ['Father Name:', safeText(employee.father_name)],
        ['NID:', safeText(employee.nid)],
        ['Phone:', safeText(employee.phone)],
        ['Address:', safeText(employee.address)],
        ['Monthly Salary:', `AFN ${(parseFloat(employee.salary) || 0).toFixed(2)}`],
        ['Join Date:', employee.join_date ? new Date(employee.join_date).toLocaleDateString(dateLocale) : 'N/A'],
        ['Status:', employee.is_active ? 'Active' : 'Inactive']
      ];

      employeeInfo.forEach(([label, value]) => {
        doc.setFont('helvetica', 'bold');
        doc.text(label, 14, startY);
        doc.setFont('helvetica', 'normal');
        doc.text(value, 50, startY);
        startY += 6;
      });

      startY += 5;

      // Financial Summary
      const totalAdvances = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      const pendingAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
      const totalSalaryPaid = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.net_paid) || 0), 0);
      const totalAdvanceDeducted = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.advance_deducted) || 0), 0);
      // Use remaining_amount so total loans decrease as employee repays
      const totalLoans = loans.reduce(
        (sum, l) => sum + (parseFloat(l.remaining_amount ?? l.amount) || 0),
        0
      );

      doc.setFontSize(14);
      doc.setTextColor(31, 41, 55);
      doc.setFont('helvetica', 'bold');
      doc.text('Financial Summary', 14, startY);
      startY += 8;

      // Use autoTable directly - plugin should be loaded
      try {
        doc.autoTable({
          startY: startY,
          head: [['Metric', 'Amount (AFN)']],
          body: [
            ['Monthly Salary', (parseFloat(employee.salary) || 0).toFixed(2)],
            ['Pending Advances', pendingAdvances.toFixed(2)],
            ['Net Salary', (parseFloat(employee.net_salary) || parseFloat(employee.salary) - pendingAdvances).toFixed(2)],
            ['Total Advances', totalAdvances.toFixed(2)],
            ['Total Salary Paid', totalSalaryPaid.toFixed(2)],
            ['Total Advances Deducted', totalAdvanceDeducted.toFixed(2)],
            ['Total Loans', totalLoans.toFixed(2)]
          ],
          theme: 'striped',
          headStyles: { fillColor: [59, 130, 246], textColor: [255, 255, 255] },
          styles: { fontSize: 10, font: 'helvetica' }
        });

        startY = doc.lastAutoTable.finalY + 15;

        // Advances Table
        if (advances.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(31, 41, 55);
          doc.text('Advances', 14, startY);
          startY += 8;

          doc.autoTable({
            startY: startY,
            head: [['Date', 'Amount (AFN)', 'Status', 'Deduction Date', 'Return Plan']],
            body: advances.map(advance => [
              advance.date_given ? new Date(advance.date_given).toLocaleDateString(dateLocale) : 'N/A',
              (parseFloat(advance.amount) || 0).toFixed(2),
              advance.is_deducted ? 'Deducted' : 'Pending',
              advance.deduction_date ? new Date(advance.deduction_date).toLocaleDateString(dateLocale) : '-',
              safeText(advance.return_plan || '').substring(0, 40) || '-'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [251, 191, 36], textColor: [255, 255, 255] },
            styles: { fontSize: 8, font: 'helvetica' }
          });

          startY = doc.lastAutoTable.finalY + 15;
        }

        // Salary Payments Table
        if (salaryPayments.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(31, 41, 55);
          doc.text('Salary Payments', 14, startY);
          startY += 8;

          doc.autoTable({
            startY: startY,
            head: [['Month', 'Base Salary', 'Advance Deducted', 'Net Paid', 'Payment Date']],
            body: salaryPayments.map(payment => [
              payment.month ? new Date(payment.month).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }) : 'N/A',
              (parseFloat(payment.base_salary) || 0).toFixed(2),
              (parseFloat(payment.advance_deducted) || 0).toFixed(2),
              (parseFloat(payment.net_paid) || 0).toFixed(2),
              payment.payment_date ? formatDate(payment.payment_date) : 'N/A'
            ]),
            theme: 'striped',
            headStyles: { fillColor: [34, 197, 94], textColor: [255, 255, 255] },
            styles: { fontSize: 9, font: 'helvetica' }
          });

          startY = doc.lastAutoTable.finalY + 15;
        }

        // Loans Table
        if (loans.length > 0) {
          doc.setFontSize(14);
          doc.setTextColor(31, 41, 55);
          doc.text('Loans', 14, startY);
          startY += 8;

          doc.autoTable({
            startY: startY,
            head: [['Date', 'Amount (AFN)', 'Paid', 'Remaining', 'Interest Rate', 'Status']],
            body: loans.map(loan => {
              const remaining = parseFloat(loan.remaining_amount || (loan.amount - (loan.amount_paid || 0))) || 0;
              return [
                loan.loan_date ? new Date(loan.loan_date).toLocaleDateString(dateLocale) : 'N/A',
                (parseFloat(loan.amount) || 0).toFixed(2),
                (parseFloat(loan.amount_paid) || 0).toFixed(2),
                remaining.toFixed(2),
                loan.interest_rate ? `${loan.interest_rate}%` : '0%',
                loan.status || 'Active'
              ];
            }),
            theme: 'striped',
            headStyles: { fillColor: [239, 68, 68], textColor: [255, 255, 255] },
            styles: { fontSize: 8, font: 'helvetica' }
          });
        }
      } catch (tableError) {
        console.error('Error creating table:', tableError);
        // Fallback: create PDF without tables if plugin not loaded
        doc.setFontSize(12);
        doc.setFont('helvetica', 'normal');
        doc.text('Financial Summary:', 14, startY);
        startY += 8;
        doc.text(`Monthly Salary: AFN ${(parseFloat(employee.salary) || 0).toFixed(2)}`, 14, startY);
        startY += 6;
        doc.text(`Pending Advances: AFN ${pendingAdvances.toFixed(2)}`, 14, startY);
        startY += 6;
        doc.text(`Net Salary: AFN ${(parseFloat(employee.net_salary) || parseFloat(employee.salary) - pendingAdvances).toFixed(2)}`, 14, startY);
        startY += 6;
        doc.text(`Total Loans: AFN ${totalLoans.toFixed(2)}`, 14, startY);
        addToast(t('employees.toast.pdfTableWarning'), 'warning');
      }

      doc.save(`Employee_${employee.name}_${new Date().toISOString().split('T')[0]}.pdf`);
    } catch (error) {
      console.error('Error exporting PDF:', error);
      addToast(t('employees.toast.pdfExportFailed', { message: error.message }), 'error');
    }
  };

  const handleLoanPayment = async (loan) => {
    setSelectedLoanForPayment(loan);
    const remaining = parseFloat(loan.remaining_amount || (loan.amount - (loan.amount_paid || 0))) || 0;
    setLoanPaymentAmount(remaining.toFixed(2));
    setLoanPaymentNotes('');
    setShowLoanPaymentForm(true);
  };

  const handleSubmitLoanPayment = async (e) => {
    e.preventDefault();
    if (!selectedLoanForPayment) return;
    
    try {
      await api.post(`/api/loans/${selectedLoanForPayment.id}/record_payment/`, {
        amount: parseFloat(loanPaymentAmount),
        notes: loanPaymentNotes.trim(),
      });
      addToast(t('employees.toast.loanPaymentRecorded'), 'success');
      setShowLoanPaymentForm(false);
      setSelectedLoanForPayment(null);
      setLoanPaymentAmount('');
      setLoanPaymentNotes('');
      fetchEmployeeData();
    } catch (err) {
      console.error('Error recording loan payment:', err);
      addToast(t('employees.toast.loanPaymentFailed'), 'error');
    }
  };

  const getSalaryForMonth = (year, month) => {
    if (!employee) return 0;
    const effective = new Date(employee.salary_effective_date || employee.join_date);
    const effectiveMonth = new Date(effective.getFullYear(), effective.getMonth(), 1);
    const targetMonth = new Date(year, month - 1, 1);
    if (targetMonth < effectiveMonth) {
      return parseFloat(employee.previous_salary ?? employee.salary) || 0;
    }
    return parseFloat(employee.salary) || 0;
  };

  const sumSalaryForMonths = (months) =>
    months.reduce((sum, m) => sum + getSalaryForMonth(m.year, m.month), 0);

  const getUnpaidMonths = () => {
    if (!employee || !employee.join_date) return [];
    
    const joinDate = new Date(employee.join_date);
    const today = new Date();
    const unpaidMonths = [];
    
    // Get all paid months
    const paidMonths = new Set(
      salaryPayments.map(p => {
        const month = new Date(p.month);
        return `${month.getFullYear()}-${String(month.getMonth() + 1).padStart(2, '0')}`;
      })
    );
    
    // Generate all months from join_date to today
    let currentDate = new Date(joinDate.getFullYear(), joinDate.getMonth(), 1);
    const endDate = new Date(today.getFullYear(), today.getMonth(), 1);
    
    while (currentDate <= endDate) {
      const monthKey = `${currentDate.getFullYear()}-${String(currentDate.getMonth() + 1).padStart(2, '0')}`;
      if (!paidMonths.has(monthKey)) {
        unpaidMonths.push({
          year: currentDate.getFullYear(),
          month: currentDate.getMonth() + 1,
          monthKey: monthKey,
          label: currentDate.toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' }),
          date: new Date(currentDate)
        });
      }
      // Move to next month
      currentDate = new Date(currentDate.getFullYear(), currentDate.getMonth() + 1, 1);
    }
    
    return unpaidMonths;
  };

  const calculateBalance = () => {
    if (!employee || !employee.join_date) return 0;
    return sumSalaryForMonths(getUnpaidMonths());
  };

  const calculateTotals = () => {
    const totalAdvances = advances.reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const pendingAdvances = advances.filter(a => !a.is_deducted).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const deductedAdvances = advances.filter(a => a.is_deducted).reduce((sum, a) => sum + (parseFloat(a.amount) || 0), 0);
    const totalSalaryPaid = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.net_paid) || 0), 0);
    const totalAdvanceDeducted = salaryPayments.reduce((sum, s) => sum + (parseFloat(s.advance_deducted) || 0), 0);
    // Use remaining_amount if available so loans decrease as they are repaid
    const totalLoans = loans.reduce(
      (sum, l) => sum + (parseFloat(l.remaining_amount ?? l.amount) || 0),
      0
    );
    const totalTips = tips.reduce((sum, t) => sum + (parseFloat(t.amount) || 0), 0);
    const balance = calculateBalance();
    
    return {
      totalAdvances,
      pendingAdvances,
      deductedAdvances,
      totalSalaryPaid,
      totalAdvanceDeducted,
      totalLoans,
      totalTips,
      balance
    };
  };

  const totals = calculateTotals();

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!employee) {
    return (
      <div className="text-center py-8 bg-gray-50 dark:bg-gray-900 min-h-screen">
        <p className="text-gray-500 dark:text-gray-400">{t('employees.notFound')}</p>
        <button
          onClick={() => navigate('/employees')}
          className="mt-4 text-blue-600 dark:text-blue-400 hover:underline"
        >
          {t('employees.backToEmployees')}
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-2 sm:space-y-3 pb-2 sm:pb-3 w-full">
      <PageHeader
        title={employee.name}
        subtitle={`${t('employees.employeeIdLabel')}: ${employee.id} | ${t('employees.nid')}: ${employee.nid}`}
        icon={UserIcon}
        actions={
          <div className="flex gap-2 flex-wrap">
            <button
              onClick={() => navigate('/employees')}
              className="px-3 py-2 bg-gray-500/80 hover:bg-gray-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <ArrowLeftIcon className="h-3.5 w-3.5" />
              {t('employees.backToEmployees')}
            </button>
            <button
              onClick={handleExportPDF}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
              title={t('employees.exportPdf')}
            >
              <DocumentArrowDownIcon className="h-3.5 w-3.5" />
              {t('employees.exportPdf')}
            </button>
            <button
              onClick={handlePrint}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PrinterIcon className="h-3.5 w-3.5" />
              {t('common.print')}
            </button>
            <button
              onClick={() => navigate(`/employees/${id}/edit`)}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PencilIcon className="h-3.5 w-3.5" />
              {t('common.edit')}
            </button>
          </div>
        }
      />

      {/* Summary Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-2">
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-blue-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('employees.monthlySalary')}</p>
              <p className="text-xs font-bold text-blue-600 dark:text-blue-400 truncate">
                {formatAFN(employee.salary)}
              </p>
            </div>
            <CurrencyDollarIcon className="h-3.5 w-3.5 text-blue-600 dark:text-blue-400 flex-shrink-0 ml-1" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-purple-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('employees.balanceOwed')}</p>
              <p className="text-xs font-bold text-purple-600 dark:text-purple-400 truncate">
                {formatAFN(totals.balance)}
              </p>
            </div>
            <BanknotesIcon className="h-3.5 w-3.5 text-purple-600 dark:text-purple-400 flex-shrink-0 ml-1" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-orange-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('employees.pendingAdvances')}</p>
              <p className="text-xs font-bold text-orange-600 dark:text-orange-400 truncate">
                {formatAFN(totals.pendingAdvances)}
              </p>
            </div>
            <ExclamationTriangleIcon className="h-3.5 w-3.5 text-orange-600 dark:text-orange-400 flex-shrink-0 ml-1" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-green-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('employees.netSalary')}</p>
              <p className="text-xs font-bold text-green-600 dark:text-green-400 truncate">
                {formatAFN(parseFloat(employee.net_salary) || parseFloat(employee.salary) - totals.pendingAdvances)}
              </p>
            </div>
            <CheckCircleIcon className="h-3.5 w-3.5 text-green-600 dark:text-green-400 flex-shrink-0 ml-1" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-red-500 sm:col-span-2 lg:col-span-1">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('employees.totalLoans')}</p>
              <p className="text-xs font-bold text-red-600 dark:text-red-400 truncate">
                {formatAFN(totals.totalLoans)}
              </p>
            </div>
            <DocumentTextIcon className="h-3.5 w-3.5 text-red-600 dark:text-red-400 flex-shrink-0 ml-1" />
          </div>
        </div>
        
        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-yellow-500">
          <div className="flex items-center justify-between">
            <div className="flex-1 min-w-0">
              <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-0.5">{t('employees.totalTips')}</p>
              <p className="text-xs font-bold text-yellow-600 dark:text-yellow-400 truncate">
                {formatAFN(totals.totalTips)}
              </p>
            </div>
            <BanknotesIcon className="h-3.5 w-3.5 text-yellow-600 dark:text-yellow-400 flex-shrink-0 ml-1" />
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 p-2 rounded-lg shadow border-l-4 border-indigo-500 sm:col-span-2 lg:col-span-2">
          <div className="flex items-center justify-between mb-1">
            <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400">{t('employees.totalMoneyReceived') || 'Total Money Received'}</p>
            <BanknotesIcon className="h-3.5 w-3.5 text-indigo-600 dark:text-indigo-400" />
          </div>
          <div className="space-y-0.5">
            <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('employees.totalSalaryPaidLabel')}: <span className="font-semibold text-gray-900 dark:text-white">{formatAFN(totals.totalSalaryPaid)}</span></p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('employees.totalTipsReceived')}: <span className="font-semibold text-gray-900 dark:text-white">{formatAFN(totals.totalTips)}</span></p>
            <p className="text-[10px] text-gray-600 dark:text-gray-400">{t('employees.totalLoans')}: <span className="font-semibold text-gray-900 dark:text-white">{formatAFN(totals.totalLoans)}</span></p>
            <p className="text-[11px] font-bold text-indigo-600 dark:text-indigo-400 pt-1 border-t border-gray-200 dark:border-gray-700">
              {t('employees.grandTotal') || 'Grand Total'}: {formatAFN(totals.totalSalaryPaid + totals.totalTips + totals.totalLoans)}
            </p>
          </div>
        </div>
      </div>

      {/* Tabs */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow border dark:border-gray-700 overflow-hidden">
        <div className="bg-gray-50 dark:bg-gray-700 border-b border-gray-200 dark:border-gray-600">
          <nav className="flex -mb-px px-0.5 sm:px-1 overflow-x-auto">
            {[
              { id: 'details', label: t('employees.details'), short: t('employees.tabMobileDetails'), icon: UserIcon },
              { id: 'advances', label: t('employees.advances'), short: t('employees.tabMobileAdvances'), icon: CurrencyDollarIcon },
              { id: 'salary', label: t('employees.salaryPayments'), short: t('employees.tabMobileSalary'), icon: CalendarIcon },
              { id: 'loans', label: t('employees.loans'), short: t('employees.tabMobileLoans'), icon: DocumentTextIcon },
              { id: 'deposit', label: t('employees.deposit'), short: t('employees.tabMobileDeposit'), icon: BuildingLibraryIcon }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`relative flex items-center gap-1 sm:gap-1.5 px-2 sm:px-3 md:px-4 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium transition-all whitespace-nowrap ${
                  activeTab === tab.id
                    ? 'bg-blue-600 text-white'
                    : 'text-gray-600 hover:text-gray-800 dark:text-gray-400 dark:hover:text-gray-200'
                }`}
              >
                <tab.icon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                <span className="hidden sm:inline">{tab.label}</span>
                <span className="sm:hidden">{tab.short}</span>
              </button>
            ))}
          </nav>
        </div>

        <div className="p-2 sm:p-3 md:p-4">
          {/* Employee Details Tab */}
          {activeTab === 'details' && (
            <div ref={printRef} className="space-y-3 sm:space-y-4">
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 sm:gap-4">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">{t('employees.personalInformation')}</h3>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('common.name')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white">{employee.name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.fatherName')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white">{employee.father_name}</p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.nid')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white">{employee.nid}</p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('common.phone')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white">{employee.phone}</p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('common.address')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white break-words">{employee.address}</p>
                    </div>
                  </div>
                </div>
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white mb-2 sm:mb-3">{t('employees.employmentInformation')}</h3>
                  <div className="space-y-1.5 sm:space-y-2">
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.monthlySalary')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white">{formatAFN(employee.salary)}</p>
                      {employee.salary_effective_date && (
                        <p className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                          {t('employees.salaryEffectiveFrom', {
                            date: new Date(employee.salary_effective_date).toLocaleDateString(dateLocale),
                          })}
                        </p>
                      )}
                    </div>
                    {employee.salary_notes && String(employee.salary_notes).trim() && (
                      <div className="md:col-span-2">
                        <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">
                          {t('employees.salaryHistory')}
                        </label>
                        <p className="text-[10px] sm:text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap mt-0.5 bg-gray-50 dark:bg-gray-900/40 rounded p-2 border border-gray-200 dark:border-gray-700">
                          {employee.salary_notes}
                        </p>
                      </div>
                    )}
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.joinDate')}</label>
                      <p className="text-[10px] sm:text-xs text-gray-900 dark:text-white">
                        {new Date(employee.join_date).toLocaleDateString(dateLocale)}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('common.status')}</label>
                      <span className={`inline-block px-1.5 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                        employee.is_active 
                          ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300' 
                          : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                      }`}>
                        {employee.is_active ? t('employees.active') : t('employees.inactive')}
                      </span>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.balanceOwed')}</label>
                      <p className="text-[10px] sm:text-xs text-purple-600 dark:text-purple-400 font-medium">
                        {formatAFN(totals.balance)}
                      </p>
                      <p className="text-[9px] sm:text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                        {t('employees.fromToToday', { date: new Date(employee.join_date).toLocaleDateString(dateLocale) })}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.pendingAdvances')}</label>
                      <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 font-medium">
                        {formatAFN(totals.pendingAdvances)}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.netSalary')}</label>
                      <p className="text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">
                        {formatAFN(parseFloat(employee.net_salary) || parseFloat(employee.salary) - totals.pendingAdvances)}
                      </p>
                    </div>
                    <div>
                      <label className="text-[10px] sm:text-xs font-medium text-gray-600 dark:text-gray-400">{t('employees.totalTipsReceived')}</label>
                      <p className="text-[10px] sm:text-xs text-yellow-600 dark:text-yellow-400 font-medium">
                        {formatAFN(totals.totalTips)}
                      </p>
                      <button
                        onClick={() => {
                          setEditingTip(null);
                          setTipData({ amount: '', date: new Date().toISOString().split('T')[0], reason: '' });
                          setShowTipForm(true);
                        }}
                        className="mt-1 px-2 py-0.5 bg-yellow-600 text-white rounded text-[9px] hover:bg-yellow-700 flex items-center gap-1"
                      >
                        <PlusIcon className="h-2.5 w-2.5" />
                        {t('employees.addTip')}
                      </button>
                      {tips.length > 0 && (
                        <div className="mt-1.5 space-y-1 max-h-28 overflow-y-auto border border-gray-200 dark:border-gray-700 rounded p-1.5">
                          {tips.slice(0, 5).map((tip) => (
                            <div key={tip.id} className="flex items-center justify-between gap-1">
                              <div className="text-[9px] text-gray-700 dark:text-gray-300 truncate">
                                {new Date(tip.date).toLocaleDateString(dateLocale)} - {formatAFN(tip.amount)}
                              </div>
                              <button
                                type="button"
                                onClick={() => handleEditTip(tip)}
                                className="p-0.5 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                                title={t('common.edit')}
                              >
                                <PencilIcon className="h-3 w-3" />
                              </button>
                            </div>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Advances Tab */}
          {activeTab === 'advances' && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{t('employees.advances')}</h3>
                  <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 mt-0.5">
                    {t('employees.advancesAutoDeducted')}
                  </p>
                </div>
                <button
                  onClick={() => {
                    setEditingAdvance(null);
                    setAdvanceData({ amount: '', return_plan: '', notes: '', date_given: new Date().toISOString().split('T')[0] });
                    setShowAdvanceForm(true);
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 hover:bg-blue-700 w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {t('employees.addAdvance')}
                </button>
              </div>
              
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-[10px] sm:text-xs min-w-[600px]">
                  <thead className="bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.date')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.amount')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.status')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.deductionDate')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.returnPlan')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {advances.length === 0 ? (
                      <tr>
                        <td colSpan="6" className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {t('employees.noAdvancesRecorded')}
                        </td>
                      </tr>
                    ) : (
                      advances.map(advance => (
                        <tr key={advance.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">{new Date(advance.date_given).toLocaleDateString(dateLocale)}</td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">{formatAFN(advance.amount)}</td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs">
                            <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                              advance.is_deducted 
                                ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                : 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                            }`}>
                              {advance.is_deducted ? t('employees.deducted') : t('employees.pending')}
                            </span>
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">
                            {advance.deduction_date ? new Date(advance.deduction_date).toLocaleDateString(dateLocale) : '-'}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs max-w-xs">
                            <div className="truncate" title={advance.return_plan || ''}>
                              {advance.return_plan || '-'}
                            </div>
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs">
                            <div className="flex gap-1">
                              {!advance.is_deducted && (
                                <>
                                  <button
                                    onClick={() => handleEditAdvance(advance)}
                                    className="p-0.5 sm:p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                    title={t('common.edit')}
                                  >
                                    <PencilIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  </button>
                                  <button
                                    onClick={() => setDeletingItem({ id: advance.id, type: 'advance' })}
                                    className="p-0.5 sm:p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                    title={t('common.delete')}
                                  >
                                    <TrashIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  </button>
                                </>
                              )}
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Salary Payments Tab */}
          {activeTab === 'salary' && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <div>
                  <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{t('employees.salaryPayments')}</h3>
                  {getUnpaidMonths().length > 0 && (
                    <p className="text-[10px] sm:text-xs text-orange-600 dark:text-orange-400 mt-0.5">
                      {t('employees.unpaidMonths', { count: getUnpaidMonths().length, balance: formatAFN(calculateBalance()) })}
                    </p>
                  )}
                </div>
                <button
                  onClick={() => {
                    setSalaryData({ 
                      month: new Date().toISOString().slice(0, 7) + '-01', 
                      base_salary: employee.salary || '', 
                      notes: '',
                      period_type: 'monthly',
                      week_start: new Date().toISOString().slice(0, 10),
                      weekly_payment_date: new Date().toISOString().slice(0, 10),
                    });
                    setSelectedMonths([]);
                    setPayAllMonths(false);
                    setShowSalaryForm(true);
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 hover:bg-blue-700 w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {t('employees.paySalary')}
                </button>
              </div>
              
              <div className="overflow-x-auto -mx-2 sm:mx-0 rounded-lg border border-gray-200 dark:border-gray-700 shadow-sm">
                <table className="w-full text-[10px] sm:text-xs min-w-[600px]">
                  <thead className="bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-200">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.month')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.baseSalary')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.advanceDeducted')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.netPaid')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.paymentDate')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.notes')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {salaryPayments.length === 0 ? (
                      <tr>
                        <td colSpan="7" className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {t('employees.noSalaryPaymentsRecorded')}
                        </td>
                      </tr>
                    ) : (
                      salaryPayments.map(payment => (
                        <tr key={payment.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">
                            {new Date(payment.month).toLocaleDateString(dateLocale, { month: 'long', year: 'numeric' })}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">{formatAFN(payment.base_salary)}</td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-orange-600 dark:text-orange-400">
                            {formatAFN(payment.advance_deducted)}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-green-600 dark:text-green-400 font-medium">
                            {formatAFN(payment.net_paid)}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">
                            <div>{formatDate(payment.payment_date)}</div>
                            {(i18n.language === 'prs' || i18n.language === 'ps') && payment.payment_date && (
                              <div className="text-[9px] text-gray-500 dark:text-gray-400 mt-0.5">
                                {t('employees.paymentDateGregorianHint')}:{' '}
                                {new Date(`${payment.payment_date}T12:00:00`).toLocaleDateString('en-CA')}
                              </div>
                            )}
                          </td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">{payment.notes || '-'}</td>
                          <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs">
                            <div className="flex gap-1">
                              <button onClick={() => { setEditingSalary(payment); setEditSalaryData({ base_salary: payment.base_salary, payment_date: (payment.payment_date || '').toString().slice(0, 10) }); setShowEditSalaryModal(true); }} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={t('employees.editPaymentTitle')}><PencilIcon className="h-4 w-4" /></button>
                              <button
                                onClick={() => {
                                  setDeleteSalaryDialog(payment);
                                  setDeleteSalaryNote('');
                                }}
                                className="p-1 text-red-600 hover:bg-red-50 rounded"
                                title={t('employees.deletePaymentTitle')}
                              >
                                <TrashIcon className="h-4 w-4" />
                              </button>
                            </div>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {/* Loans Tab */}
          {activeTab === 'loans' && (
            <div className="space-y-2 sm:space-y-3">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{t('employees.loans')}</h3>
                <button
                  onClick={() => {
                    setEditingLoan(null);
                    setLoanData({ 
                      amount: '', 
                      loan_date: new Date().toISOString().split('T')[0], 
                      repayment_plan: '', 
                      interest_rate: '', 
                      notes: '' 
                    });
                    setShowLoanForm(true);
                  }}
                  className="px-2 sm:px-3 py-1 sm:py-1.5 bg-blue-600 text-white rounded-lg text-[10px] sm:text-xs flex items-center gap-1 sm:gap-1.5 hover:bg-blue-700 w-full sm:w-auto justify-center"
                >
                  <PlusIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                  {t('employees.addLoan')}
                </button>
              </div>
              
              <div className="bg-yellow-50 dark:bg-yellow-900/20 border border-yellow-200 dark:border-yellow-800 rounded-lg p-2 mb-2 sm:mb-3">
                <p className="text-[10px] sm:text-xs text-yellow-800 dark:text-yellow-300">
                  <strong>{t('employees.loansNoteTitle')}</strong> {t('employees.loansNote')}
                </p>
              </div>
              
              <div className="overflow-x-auto -mx-2 sm:mx-0">
                <table className="w-full text-[10px] sm:text-xs min-w-[700px]">
                  <thead className="bg-gray-800 dark:bg-gray-700 text-white dark:text-gray-100">
                    <tr>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.date')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.amount')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.paid')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.remaining')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.interestRate')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('employees.repaymentPlan')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs min-w-[120px]">{t('employees.notes')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.status')}</th>
                      <th className="px-2 sm:px-3 py-1.5 sm:py-2 text-left text-[10px] sm:text-xs">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700 bg-white dark:bg-gray-800">
                    {loans.length === 0 ? (
                      <tr>
                        <td colSpan="9" className="px-2 sm:px-3 py-2 sm:py-3 text-center text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {t('employees.noLoansRecorded')}
                        </td>
                      </tr>
                    ) : (
                      loans.map(loan => {
                        const remaining = parseFloat(loan.remaining_amount || (loan.amount - (loan.amount_paid || 0))) || 0;
                        return (
                          <tr key={loan.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50">
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">{new Date(loan.loan_date).toLocaleDateString(dateLocale)}</td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs font-medium text-gray-900 dark:text-white">{formatAFN(loan.amount)}</td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-green-600 dark:text-green-400">
                              {formatAFN(loan.amount_paid)}
                            </td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-red-600 dark:text-red-400 font-medium">
                              {formatAFN(remaining)}
                            </td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white">{loan.interest_rate ? `${loan.interest_rate}%` : '0%'}</td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-900 dark:text-white max-w-xs truncate">{loan.repayment_plan || '-'}</td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs text-gray-700 dark:text-gray-300 max-w-[200px]">
                              <span className="whitespace-pre-wrap break-words block">{loan.notes?.trim() ? loan.notes : '—'}</span>
                            </td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs">
                              <span className={`px-1.5 sm:px-2 py-0.5 rounded-full text-[9px] sm:text-xs font-medium ${
                                loan.status === 'Paid' 
                                  ? 'bg-green-100 text-green-800 dark:bg-green-900/30 dark:text-green-300'
                                  : loan.status === 'Partial'
                                  ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900/30 dark:text-yellow-300'
                                  : 'bg-red-100 text-red-800 dark:bg-red-900/30 dark:text-red-300'
                              }`}>
                                {loan.status === 'Paid'
                                  ? t('employees.loanStatusPaid')
                                  : loan.status === 'Partial'
                                    ? t('employees.loanStatusPartial')
                                    : loan.status
                                      ? loan.status
                                      : t('employees.loanStatusActive')}
                              </span>
                            </td>
                            <td className="px-2 sm:px-3 py-1.5 sm:py-2 text-[10px] sm:text-xs">
                              <div className="flex gap-1">
                                {remaining > 0 && (
                                  <button
                                    onClick={() => handleLoanPayment(loan)}
                                    className="p-0.5 sm:p-1 text-green-600 hover:bg-green-50 dark:hover:bg-green-900/20 rounded transition-colors"
                                    title={t('employees.recordPaymentActionTitle')}
                                  >
                                    <CurrencyDollarIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                  </button>
                                )}
                                <button
                                  onClick={() => {
                                    setEditingLoan(loan);
                                    setLoanData({
                                      amount: loan.amount,
                                      loan_date: loan.loan_date,
                                      repayment_plan: loan.repayment_plan || '',
                                      interest_rate: loan.interest_rate || '',
                                      notes: loan.notes || ''
                                    });
                                    setShowLoanForm(true);
                                  }}
                                  className="p-0.5 sm:p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded transition-colors"
                                  title={t('common.edit')}
                                >
                                  <PencilIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </button>
                                <button
                                  onClick={() => setDeletingItem({ id: loan.id, type: 'loan' })}
                                  className="p-0.5 sm:p-1 text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 rounded transition-colors"
                                  title={t('common.delete')}
                                >
                                  <TrashIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5" />
                                </button>
                              </div>
                            </td>
                          </tr>
                        );
                      })
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}

          {activeTab === 'deposit' && (
            <div className="space-y-3 sm:space-y-4">
              <div className="bg-teal-50 dark:bg-teal-900/20 border border-teal-200 dark:border-teal-800 rounded-lg p-3">
                <p className="text-[10px] font-semibold text-gray-700 dark:text-gray-300">{t('employees.depositBalance')}</p>
                <p className="text-lg font-bold text-teal-700 dark:text-teal-400">
                  {formatAFN(employee?.salary_deposit_balance ?? 0)}
                </p>
                <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-1">{t('employees.depositHelp')}</p>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                <form onSubmit={handleDepositHoldSubmit} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-800">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{t('employees.depositHoldTitle')}</h4>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositHold.amount}
                    onChange={(e) => setDepositHold((p) => ({ ...p, amount: e.target.value }))}
                    placeholder={t('employees.amountAfnRequired')}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <textarea
                    value={depositHold.notes}
                    onChange={(e) => setDepositHold((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder={t('employees.notes')}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button type="submit" className="w-full py-1.5 bg-teal-600 text-white rounded-lg text-xs hover:bg-teal-700">
                    {t('employees.recordHold')}
                  </button>
                </form>

                <form onSubmit={handleDepositPayoutSubmit} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 space-y-2 bg-white dark:bg-gray-800">
                  <h4 className="text-xs font-semibold text-gray-900 dark:text-white">{t('employees.depositPayoutTitle')}</h4>
                  <input
                    type="number"
                    step="0.01"
                    min="0"
                    value={depositPayout.amount}
                    onChange={(e) => setDepositPayout((p) => ({ ...p, amount: e.target.value }))}
                    placeholder={t('employees.amountAfnRequired')}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <textarea
                    value={depositPayout.notes}
                    onChange={(e) => setDepositPayout((p) => ({ ...p, notes: e.target.value }))}
                    rows={2}
                    placeholder={t('employees.notes')}
                    className="w-full px-2 py-1.5 text-xs border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  />
                  <button type="submit" className="w-full py-1.5 bg-indigo-600 text-white rounded-lg text-xs hover:bg-indigo-700">
                    {t('employees.recordPayout')}
                  </button>
                </form>
              </div>

              <div className="overflow-x-auto">
                <table className="w-full text-[10px] sm:text-xs min-w-[560px]">
                  <thead className="bg-gray-800 dark:bg-gray-700 text-white">
                    <tr>
                      <th className="px-2 py-2 text-left">{t('common.date')}</th>
                      <th className="px-2 py-2 text-left">{t('common.type')}</th>
                      <th className="px-2 py-2 text-left">{t('employees.amount')}</th>
                      <th className="px-2 py-2 text-left">{t('employees.notes')}</th>
                      <th className="px-2 py-2 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {salaryDepositEntries.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-2 py-3 text-center text-gray-500">
                          {t('employees.noDepositEntries')}
                        </td>
                      </tr>
                    ) : (
                      salaryDepositEntries.map((row) => (
                        <tr key={row.id} className="bg-white dark:bg-gray-800">
                          <td className="px-2 py-1.5">
                            {row.created_at ? new Date(row.created_at).toLocaleString(dateLocale) : '—'}
                          </td>
                          <td className="px-2 py-1.5">
                            <span
                              className={`px-1.5 py-0.5 rounded text-[9px] font-medium ${
                                row.entry_type === 'hold'
                                  ? 'bg-teal-100 text-teal-800 dark:bg-teal-900/40 dark:text-teal-300'
                                  : 'bg-indigo-100 text-indigo-800 dark:bg-indigo-900/40 dark:text-indigo-300'
                              }`}
                            >
                              {row.entry_type === 'hold' ? t('employees.entryTypeHold') : t('employees.entryTypePayout')}
                            </span>
                          </td>
                          <td className="px-2 py-1.5 font-medium">{formatAFN(row.amount)}</td>
                          <td className="px-2 py-1.5 text-gray-600 dark:text-gray-400">{row.notes || '—'}</td>
                          <td className="px-2 py-1.5 text-right whitespace-nowrap">
                            <button
                              type="button"
                              onClick={() => printDepositSlip(row)}
                              className="p-0.5 sm:p-1 text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-700 rounded mr-1"
                              title={t('employees.printDepositSlip')}
                            >
                              <PrinterIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline" />
                            </button>
                            <button
                              type="button"
                              onClick={() => openDepositEdit(row)}
                              className="p-0.5 sm:p-1 text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/20 rounded"
                              title={t('common.edit')}
                            >
                              <PencilIcon className="h-3 w-3 sm:h-3.5 sm:w-3.5 inline" />
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      </div>

      {editingDepositEntry && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{t('employees.depositEditTitle')}</h3>
              <button
                type="button"
                onClick={() => {
                  setEditingDepositEntry(null);
                  setDepositEditForm({ amount: '', notes: '' });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={saveDepositEdit} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.amountAfnRequired')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={depositEditForm.amount}
                  onChange={(e) => setDepositEditForm((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.notes')}</label>
                <textarea
                  value={depositEditForm.notes}
                  onChange={(e) => setDepositEditForm((p) => ({ ...p, notes: e.target.value }))}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg"
                />
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400">
                {editingDepositEntry.entry_type === 'hold' ? t('employees.entryTypeHold') : t('employees.entryTypePayout')}
              </p>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setEditingDepositEntry(null);
                    setDepositEditForm({ amount: '', notes: '' });
                  }}
                  className="flex-1 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 py-1.5 text-xs bg-teal-600 text-white rounded-lg hover:bg-teal-700">
                  {t('common.save')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Advance Form Modal */}
      {showAdvanceForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                {editingAdvance ? t('employees.editAdvance') : t('employees.addAdvance')}
              </h3>
              <button
                onClick={() => {
                  setShowAdvanceForm(false);
                  setEditingAdvance(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>
            <form onSubmit={editingAdvance ? handleUpdateAdvance : handleCreateAdvance} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.amountAfnRequired')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={advanceData.amount}
                  onChange={(e) => setAdvanceData({...advanceData, amount: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.dateGiven')} *</label>
                <LocalizedDateInput
                  value={advanceData.date_given}
                  onChange={(dateValue) => setAdvanceData({...advanceData, date_given: dateValue})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('employees.returnPlan')}
                  <span className="text-xs text-gray-500 dark:text-gray-400 ml-1">
                    {t('employees.returnPlanNote')}
                  </span>
                </label>
                <textarea
                  value={advanceData.return_plan}
                  onChange={(e) => setAdvanceData({...advanceData, return_plan: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.returnPlanPlaceholder')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.notes')}</label>
                <textarea
                  value={advanceData.notes}
                  onChange={(e) => setAdvanceData({...advanceData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.additionalNotes')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowAdvanceForm(false);
                    setEditingAdvance(null);
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {editingAdvance ? t('employees.updateAdvance') : t('employees.createAdvance')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Salary Form Modal */}
      {showSalaryForm && employee && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-xl max-w-2xl w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{t('employees.recordSalaryPayment')}</h3>
              <button
                onClick={() => {
                  setShowSalaryForm(false);
                  setSelectedMonths([]);
                  setPayAllMonths(false);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <form onSubmit={handleCreateSalary} className="space-y-2 sm:space-y-3">
              <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 border border-gray-200 dark:border-gray-600">
                <p className="text-xs text-gray-700 dark:text-gray-300">
                  <strong>{t('employees.monthlySalaryLabel')}</strong> {formatAFN(employee.salary)}
                  {employee.salary_effective_date && (
                    <>
                      <br />
                      <span className="text-[10px] text-gray-500 dark:text-gray-400">
                        {t('employees.salaryEffectiveFrom', {
                          date: new Date(employee.salary_effective_date).toLocaleDateString(dateLocale),
                        })}
                      </span>
                    </>
                  )}
                </p>
                {employee.salary_notes && String(employee.salary_notes).trim() && (
                  <div className="mt-2 pt-2 border-t border-gray-200 dark:border-gray-600">
                    <p className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 mb-1">
                      {t('employees.salaryHistory')}
                    </p>
                    <p className="text-[10px] sm:text-xs text-gray-800 dark:text-gray-200 whitespace-pre-wrap">
                      {employee.salary_notes}
                    </p>
                  </div>
                )}
              </div>

              {/* Period Type Toggle */}
              <div className="flex items-center gap-3 mb-2">
                <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('employees.salaryType')}:</span>
                <button
                  type="button"
                  onClick={() => setSalaryData(prev => ({ ...prev, period_type: 'monthly' }))}
                  className={`px-2 py-1 text-xs rounded border ${
                    salaryData.period_type === 'monthly'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {t('employees.monthly')}
                </button>
                <button
                  type="button"
                  onClick={() => setSalaryData(prev => ({ ...prev, period_type: 'weekly' }))}
                  className={`px-2 py-1 text-xs rounded border ${
                    salaryData.period_type === 'weekly'
                      ? 'bg-blue-600 text-white border-blue-600'
                      : 'bg-gray-100 dark:bg-gray-700 text-gray-700 dark:text-gray-300 border-gray-300 dark:border-gray-600'
                  }`}
                >
                  {t('employees.weekly')}
                </button>
              </div>
              {/* Weekly salary simple form */}
              {salaryData.period_type === 'weekly' && (
                <>
                  <div className="bg-gray-50 dark:bg-gray-700 rounded p-2 mb-2">
                    <p className="text-xs text-gray-700 dark:text-gray-300">
                      <strong>{t('employees.weeklySalaryApprox')}:</strong>{' '}
                      {(parseFloat(employee.salary || 0) / 4).toFixed(2)}
                    </p>
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('employees.weekStartDate')}
                    </label>
                    <LocalizedDateInput
                      value={salaryData.week_start}
                      onChange={(dateValue) =>
                        setSalaryData(prev => ({ ...prev, week_start: dateValue }))
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                  </div>
                  <div className="mb-2">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('employees.weeklyPaidDateLabel')}
                    </label>
                    <LocalizedDateInput
                      value={salaryData.weekly_payment_date}
                      onChange={(dateValue) =>
                        setSalaryData(prev => ({ ...prev, weekly_payment_date: dateValue }))
                      }
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">
                      {t('employees.weeklyPaidDateHelp')}
                    </p>
                  </div>
                </>
              )}

              {/* Monthly options */}
              {salaryData.period_type === 'monthly' && getUnpaidMonths().length > 0 && (
                <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded p-3">
                  <label className="flex items-center gap-2 cursor-pointer">
                    <input
                      type="checkbox"
                      checked={payAllMonths}
                      onChange={(e) => {
                        setPayAllMonths(e.target.checked);
                        if (e.target.checked) {
                          setSelectedMonths([]);
                        }
                      }}
                      className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                    />
                    <span className="text-xs font-medium text-gray-900 dark:text-white">
                      {t('employees.payAllDueBalance', { count: getUnpaidMonths().length })}
                    </span>
                  </label>
                  <p className="text-xs text-gray-600 dark:text-gray-400 mt-1 ml-6">
                    {t('employees.totalGross', { amount: formatAFN(sumSalaryForMonths(getUnpaidMonths())) })}
                    {totals.pendingAdvances > 0 && (
                      <>
                        <br />
                        <span className="text-orange-600 dark:text-orange-400">
                              {t('employees.pendingAdvancesWillDeduct', { amount: formatAFN(Math.min(totals.pendingAdvances, sumSalaryForMonths(getUnpaidMonths()))) })}
                        </span>
                        <br />
                        <span className="text-green-600 dark:text-green-400 font-medium">
                              {t('employees.netAmount', { amount: formatAFN(Math.max(0, sumSalaryForMonths(getUnpaidMonths()) - Math.min(totals.pendingAdvances, sumSalaryForMonths(getUnpaidMonths())))) })}
                        </span>
                      </>
                    )}
                  </p>
                </div>
              )}

              {/* Month Selection */}
              {salaryData.period_type === 'monthly' && !payAllMonths && (
                <div>
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">
                    {t('employees.selectMonthsToPay')}
                  </label>
                  <div className="border border-gray-300 dark:border-gray-600 rounded p-2 max-h-48 overflow-y-auto">
                    {getUnpaidMonths().length === 0 ? (
                      <p className="text-xs text-gray-500 dark:text-gray-400 text-center py-4">
                        {t('employees.noUnpaidMonthsFound')}
                      </p>
                    ) : (
                      <div className="space-y-2">
                        {getUnpaidMonths().map((monthData) => (
                          <label
                            key={monthData.monthKey}
                            className="flex items-center gap-2 p-2 hover:bg-gray-50 dark:hover:bg-gray-700 rounded cursor-pointer"
                          >
                            <input
                              type="checkbox"
                              checked={selectedMonths.includes(monthData.monthKey)}
                              onChange={(e) => {
                                if (e.target.checked) {
                                  setSelectedMonths([...selectedMonths, monthData.monthKey]);
                                } else {
                                  setSelectedMonths(selectedMonths.filter(m => m !== monthData.monthKey));
                                }
                              }}
                              className="w-4 h-4 text-blue-600 rounded focus:ring-blue-500"
                            />
                            <span className="text-xs text-gray-900 dark:text-white flex-1">
                              {monthData.label}
                            </span>
                            <span className="text-xs font-medium text-gray-600 dark:text-gray-400">
                              {formatAFN(getSalaryForMonth(monthData.year, monthData.month))}
                            </span>
                          </label>
                        ))}
                      </div>
                    )}
                  </div>
                  {selectedMonths.length > 0 && (
                    <div className="mt-2 p-2 bg-gray-50 dark:bg-gray-700 rounded">
                      <p className="text-xs text-gray-700 dark:text-gray-300">
                        {t('employees.selectedMonths', { count: selectedMonths.length })}
                        <br />
                        <span>{t('employees.grossAmount', { amount: formatAFN(sumSalaryForMonths(getUnpaidMonths().filter(m => selectedMonths.includes(m.monthKey)))) })}</span>
                        {totals.pendingAdvances > 0 && (
                          <>
                            <br />
                            <span className="text-orange-600 dark:text-orange-400">
                              {t('employees.pendingAdvancesWillDeduct', { amount: formatAFN(Math.min(totals.pendingAdvances, sumSalaryForMonths(getUnpaidMonths().filter(m => selectedMonths.includes(m.monthKey))))) })}
                            </span>
                            <br />
                            <span className="text-green-600 dark:text-green-400 font-medium">
                              {t('employees.netAmount', { amount: formatAFN(Math.max(0, sumSalaryForMonths(getUnpaidMonths().filter(m => selectedMonths.includes(m.monthKey))) - Math.min(totals.pendingAdvances, sumSalaryForMonths(getUnpaidMonths().filter(m => selectedMonths.includes(m.monthKey)))))) })}
                            </span>
                          </>
                        )}
                      </p>
                    </div>
                  )}
                </div>
              )}

              {/* Pending Advances Info */}
              {totals.pendingAdvances > 0 && (
                <div className="bg-orange-50 dark:bg-orange-900/20 border border-orange-200 dark:border-orange-800 rounded p-2">
                  <p className="text-xs text-orange-800 dark:text-orange-300">
                    {t('employees.pendingAdvancesInfo', { amount: formatAFN(totals.pendingAdvances) })}
                  </p>
                </div>
              )}

              {salaryData.period_type === 'weekly' && (
                <div className="bg-gray-50 dark:bg-gray-700 rounded p-2">
                  <p className="text-xs text-gray-700 dark:text-gray-300">
                    <strong>{t('employees.weeklyApproxLabel')}</strong>{' '}
                    {formatAFN(parseFloat(employee.salary || 0) / 4)}
                  </p>
                </div>
              )}

              {/* Notes */}
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.notes')}</label>
                <textarea
                  value={salaryData.notes}
                  onChange={(e) => setSalaryData({...salaryData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.notesOptionalPlaceholder')}
                />
              </div>

              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowSalaryForm(false);
                    setSelectedMonths([]);
                    setPayAllMonths(false);
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  disabled={
                    salaryData.period_type === 'monthly' &&
                    !payAllMonths &&
                    selectedMonths.length === 0
                  }
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700 disabled:bg-gray-400 disabled:cursor-not-allowed"
                >
                  {salaryData.period_type === 'weekly'
                    ? t('employees.payWeeklySalary')
                    : payAllMonths
                      ? t('employees.payAllMonths', { count: getUnpaidMonths().length })
                      : selectedMonths.length > 0
                        ? t('employees.paySelectedMonths', { count: selectedMonths.length })
                        : t('employees.selectMonthsToPayButton')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Form Modal */}
      {showLoanForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                {editingLoan ? t('employees.editLoan') : t('employees.addLoan')}
              </h3>
              <button
                onClick={() => {
                  setShowLoanForm(false);
                  setEditingLoan(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <form onSubmit={editingLoan ? handleUpdateLoan : handleCreateLoan} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.loanAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={loanData.amount}
                  onChange={(e) => setLoanData({...loanData, amount: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.loanDate')}</label>
                <LocalizedDateInput
                  value={loanData.loan_date}
                  onChange={(dateValue) => setLoanData({...loanData, loan_date: dateValue})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.interestRatePercent')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={loanData.interest_rate}
                  onChange={(e) => setLoanData({...loanData, interest_rate: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.repaymentPlan')}</label>
                <textarea
                  value={loanData.repayment_plan}
                  onChange={(e) => setLoanData({...loanData, repayment_plan: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.howWillLoanBeRepaid')}
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.notes')}</label>
                <textarea
                  value={loanData.notes}
                  onChange={(e) => setLoanData({...loanData, notes: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.additionalNotes')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoanForm(false);
                    setEditingLoan(null);
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {editingLoan ? t('employees.updateLoan') : t('employees.createLoan')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Loan Payment Modal */}
      {showLoanPaymentForm && selectedLoanForPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-xl max-w-md w-full max-h-[90vh] overflow-y-auto">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">{t('employees.recordLoanPayment')}</h3>
              <button
                onClick={() => {
                  setShowLoanPaymentForm(false);
                  setSelectedLoanForPayment(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-4 w-4 sm:h-5 sm:w-5" />
              </button>
            </div>
            <form onSubmit={handleSubmitLoanPayment} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('employees.loanPrincipalLabel')}
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatAFN(selectedLoanForPayment.amount)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('employees.alreadyPaid')}
                </label>
                <p className="text-xs text-gray-600 dark:text-gray-400">
                  {formatAFN(selectedLoanForPayment.amount_paid)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('employees.remainingAmount')}
                </label>
                <p className="text-xs font-semibold text-red-600 dark:text-red-400">
                  {formatAFN(parseFloat(selectedLoanForPayment.remaining_amount || (selectedLoanForPayment.amount - (selectedLoanForPayment.amount_paid || 0))) || 0)}
                </p>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('employees.paymentAmount')}
                </label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={parseFloat(selectedLoanForPayment.remaining_amount || (selectedLoanForPayment.amount - (selectedLoanForPayment.amount_paid || 0))) || 0}
                  value={loanPaymentAmount}
                  onChange={(e) => setLoanPaymentAmount(e.target.value)}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.notes')}</label>
                <textarea
                  value={loanPaymentNotes}
                  onChange={(e) => setLoanPaymentNotes(e.target.value)}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.additionalNotes')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowLoanPaymentForm(false);
                    setSelectedLoanForPayment(null);
                    setLoanPaymentNotes('');
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="submit"
                  className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700"
                >
                  {t('employees.recordPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Tip Form Modal */}
      {showTipForm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow-xl max-w-md w-full">
            <div className="flex justify-between items-center mb-2 sm:mb-3">
              <h3 className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-white">
                {editingTip ? t('common.edit') : t('employees.addTipTitle')}
              </h3>
              <button
                onClick={() => {
                  setShowTipForm(false);
                  setEditingTip(null);
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5" />
              </button>
            </div>
            <form onSubmit={editingTip ? handleUpdateTip : handleCreateTip} className="space-y-2 sm:space-y-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.tipAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  value={tipData.amount}
                  onChange={(e) => setTipData({...tipData, amount: e.target.value})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.dateRequired')}</label>
                <LocalizedDateInput
                  value={tipData.date}
                  onChange={(dateValue) => setTipData({...tipData, date: dateValue})}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.reason')}</label>
                <textarea
                  value={tipData.reason}
                  onChange={(e) => setTipData({...tipData, reason: e.target.value})}
                  rows={2}
                  className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
                  placeholder={t('employees.reasonPlaceholder')}
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowTipForm(false);
                    setEditingTip(null);
                  }}
                  className="flex-1 px-3 py-1.5 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded text-xs hover:bg-gray-50 dark:hover:bg-gray-700"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 px-3 py-1.5 bg-blue-600 text-white rounded text-xs hover:bg-blue-700">
                  {editingTip ? t('common.edit') : t('employees.addTip')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Delete Confirmation Modal */}
      {deletingItem && (
        <ConfirmationModal
          isOpen={!!deletingItem}
          onClose={() => setDeletingItem(null)}
          onConfirm={handleDeleteAdvance}
          title={deletingItem.type === 'advance' ? t('employees.deleteAdvance') : t('employees.deleteLoan')}
          message={t('employees.deleteConfirmMessage', {
            type: deletingItem.type === 'advance' ? t('employees.advanceNoun') : t('employees.loanNoun')
          })}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          type="danger"
        />
      )}

      {/* Delete Salary Confirmation Dialog */}
      {deleteSalaryDialog && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-md w-full">
            <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">
              {t('employees.confirmDeleteSalaryPayment') || 'Confirm Delete Salary Payment'}
            </h3>
            <p className="text-xs text-gray-600 dark:text-gray-400 mb-3">
              {t('employees.deleteSalaryWarning') || 'This action will permanently delete the salary payment record.'}
            </p>
            <div className="mb-3 rounded-md bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 px-3 py-2">
              <p className="text-xs text-blue-700 dark:text-blue-300">
                {t('employees.salaryPayment') || 'Salary Payment'}: <strong>{formatAFN(deleteSalaryDialog.net_paid || deleteSalaryDialog.base_salary)}</strong>
              </p>
            </div>
            <div className="mb-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('employees.deletionNoteLabel') || 'Deletion note (optional)'}
              </label>
              <textarea
                value={deleteSalaryNote}
                onChange={(e) => setDeleteSalaryNote(e.target.value)}
                rows={3}
                placeholder={t('employees.deletionNotePlaceholder') || 'Add reason for deleting this salary record'}
                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded focus:ring-2 focus:ring-blue-500"
              />
            </div>
            <div className="flex gap-2">
              <button
                onClick={handleDeleteSalary}
                className="flex-1 bg-red-600 text-white py-1.5 px-3 rounded text-xs hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
              <button
                onClick={() => {
                  setDeleteSalaryDialog(null);
                  setDeleteSalaryNote('');
                }}
                className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-300 py-1.5 px-3 rounded text-xs hover:bg-gray-400 dark:hover:bg-gray-500"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Edit Salary Payment Modal */}
      {showEditSalaryModal && editingSalary && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full border border-gray-200 dark:border-gray-700">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('employees.editSalaryPayment')}</h3>
            <form onSubmit={handleEditSalary} className="space-y-4">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.paymentDate')} *</label>
                <LocalizedDateInput
                  value={editSalaryData.payment_date}
                  onChange={(dateValue) => setEditSalaryData((prev) => ({ ...prev, payment_date: dateValue || '' }))}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('employees.baseSalary')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={editSalaryData.base_salary}
                  onChange={(e) => setEditSalaryData({ ...editSalaryData, base_salary: e.target.value })}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="submit" className="flex-1 bg-blue-600 text-white py-2 px-4 rounded hover:bg-blue-700 text-sm">{t('employees.updatePayment')}</button>
                <button type="button" onClick={() => { setShowEditSalaryModal(false); setEditingSalary(null); }} className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-2 px-4 rounded hover:bg-gray-400 dark:hover:bg-gray-500 text-sm">{t('common.cancel')}</button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default EmployeeDetails;
