import React, { useState, useEffect, useCallback, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  PlusIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  BanknotesIcon,
  PrinterIcon,
  HomeModernIcon,
  BuildingOffice2Icon
} from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import ConfirmationModal from '../../components/common/ConfirmationModal';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import { normalizeNumeralString } from '../../utils/numerals';

function toYMD(d) {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

function getRangeForPreset(preset) {
  const now = new Date();
  if (preset === 'daily') {
    const d = toYMD(now);
    return { from: d, to: d };
  }
  if (preset === 'weekly') {
    const wd = now.getDay();
    const diffToMonday = wd === 0 ? 6 : wd - 1;
    const monday = new Date(now);
    monday.setDate(now.getDate() - diffToMonday);
    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    return { from: toYMD(monday), to: toYMD(sunday) };
  }
  if (preset === 'monthly') {
    const first = new Date(now.getFullYear(), now.getMonth(), 1);
    const last = new Date(now.getFullYear(), now.getMonth() + 1, 0);
    return { from: toYMD(first), to: toYMD(last) };
  }
  if (preset === 'yearly') {
    const first = new Date(now.getFullYear(), 0, 1);
    const last = new Date(now.getFullYear(), 11, 31);
    return { from: toYMD(first), to: toYMD(last) };
  }
  return { from: '', to: '' };
}

async function fetchAllExpensesForPrint(baseParams) {
  const pageSize = 100;
  let page = 1;
  const all = [];
  let totalCount = Infinity;
  while (all.length < totalCount) {
    const params = new URLSearchParams();
    Object.entries(baseParams).forEach(([k, v]) => {
      if (v !== undefined && v !== null && v !== '') params.append(k, String(v));
    });
    params.append('page', String(page));
    params.append('page_size', String(pageSize));
    const response = await api.get(`/api/expenses/?${params.toString()}`);
    const results = response.data.results || [];
    totalCount = response.data.count ?? results.length;
    all.push(...results);
    if (results.length < pageSize) break;
    page += 1;
    if (page > 50) break;
  }
  return all;
}

function openExpensePrintWindow({ title, rows, dateFrom, dateTo, formatDate, t }) {
  const head = `
    <thead><tr>
      <th>${t('expenses.description')}</th>
      <th>${t('expenses.category')}</th>
      <th>${t('expenses.amount')}</th>
      <th>${t('expenses.date')}</th>
      <th>${t('expenses.location')}</th>
    </tr></thead>`;

  const grouped = rows.reduce((acc, row) => {
    const key = row.expense_date || '';
    if (!acc[key]) acc[key] = [];
    acc[key].push(row);
    return acc;
  }, {});

  const sortedDates = Object.keys(grouped).sort((a, b) => (a < b ? 1 : -1));
  const body = sortedDates.map((dateKey) => {
    const dayRows = grouped[dateKey];
    const dayTotal = dayRows.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
    const rowsHtml = dayRows.map((e) => `<tr>
        <td>${(e.description || '').replace(/</g, '&lt;')}</td>
        <td>${(e.category_display || '').replace(/</g, '&lt;')}</td>
        <td style="text-align:right">AFN ${parseFloat(e.amount || 0).toFixed(2)}</td>
        <td>${formatDate(e.expense_date)}</td>
        <td>${e.is_for_press ? t('expenses.locationPress') : t('expenses.locationHome')}</td>
      </tr>`).join('');
    return `
      <tr><td colspan="5" style="background:#e5edff;font-weight:bold">${t('common.date')}: ${formatDate(dateKey)}</td></tr>
      ${rowsHtml}
      <tr><td colspan="2" style="font-weight:bold">${t('expenses.dailyTotal')}</td><td colspan="3" style="font-weight:bold">AFN ${dayTotal.toFixed(2)}</td></tr>
    `;
  }).join('');

  const sum = rows.reduce((s, e) => s + parseFloat(e.amount || 0), 0);
  const html = `<!DOCTYPE html><html><head><meta charset="utf-8"/><title>${title}</title>
    <style>
      body{font-family:system-ui,sans-serif;padding:16px;color:#111}
      h1{font-size:18px;margin:0 0 8px}
      .meta{font-size:12px;color:#444;margin-bottom:16px}
      table{width:100%;border-collapse:collapse;font-size:12px}
      th,td{border:1px solid #ccc;padding:6px 8px;text-align:left}
      th{background:#1d4ed8;color:#fff}
      tfoot td{font-weight:bold}
    </style></head><body>
    <h1>${title}</h1>
    <div class="meta">${dateFrom || '…'} — ${dateTo || '…'}</div>
    <table>${head}<tbody>${body}</tbody>
    <tfoot><tr><td colspan="2">${t('expenses.total')}</td><td colspan="3">AFN ${sum.toFixed(2)}</td></tr></tfoot>
    </table>
    <script>window.onload=function(){window.print();}</script>
    </body></html>`;
  const w = window.open('', '_blank');
  if (w) {
    w.document.write(html);
    w.document.close();
  }
}

const ExpenseList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const initialMonthly = useMemo(() => getRangeForPreset('monthly'), []);
  const [expenses, setExpenses] = useState([]);
  const [loading, setLoading] = useState(true);
  const [currentPage, setCurrentPage] = useState(1);
  const [totalCount, setTotalCount] = useState(0);
  const [itemsPerPage, setItemsPerPage] = useState(5);
  const [searchTerm, setSearchTerm] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('');
  const [locationFilter, setLocationFilter] = useState('');
  const [dateFrom, setDateFrom] = useState(initialMonthly.from);
  const [dateTo, setDateTo] = useState(initialMonthly.to);
  const [minAmount, setMinAmount] = useState('');
  const [maxAmount, setMaxAmount] = useState('');
  const [periodPreset, setPeriodPreset] = useState('monthly');
  const [locationTotals, setLocationTotals] = useState({
    home: { total: '0', count: 0 },
    press: { total: '0', count: 0 }
  });
  const [deleteModal, setDeleteModal] = useState(null);
  const [selectedExpense, setSelectedExpense] = useState(null);
  const [showDetailsModal, setShowDetailsModal] = useState(false);

  const categories = [
    { value: 'office', labelKey: 'expenses.officeSupplies' },
    { value: 'utilities', labelKey: 'expenses.utilities' },
    { value: 'transport', labelKey: 'expenses.transport' },
    { value: 'marketing', labelKey: 'expenses.marketing' },
    { value: 'maintenance', labelKey: 'expenses.maintenance' },
    { value: 'other', labelKey: 'expenses.other' }
  ];

  const applyPeriodPreset = (preset) => {
    setPeriodPreset(preset);
    const r = getRangeForPreset(preset);
    setDateFrom(r.from);
    setDateTo(r.to);
    setCurrentPage(1);
  };

  const fetchLocationTotals = useCallback(async () => {
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (minAmount) params.min_amount = minAmount;
      if (maxAmount) params.max_amount = maxAmount;
      const res = await api.get('/api/expenses/location-totals/', { params });
      setLocationTotals(res.data);
    } catch (e) {
      console.error('location-totals', e);
    }
  }, [dateFrom, dateTo, minAmount, maxAmount]);

  useEffect(() => {
    fetchLocationTotals();
  }, [fetchLocationTotals]);

  const fetchExpenses = useCallback(async () => {
    setLoading(true);
    try {
      const params = new URLSearchParams();
      if (categoryFilter) params.append('category', categoryFilter);
      if (dateFrom) params.append('date_from', dateFrom);
      if (dateTo) params.append('date_to', dateTo);
      if (minAmount) params.append('min_amount', minAmount);
      if (maxAmount) params.append('max_amount', maxAmount);
      if (searchTerm) params.append('search', searchTerm);
      if (locationFilter === 'home') params.append('is_for_press', 'false');
      if (locationFilter === 'press') params.append('is_for_press', 'true');
      params.append('page', currentPage);
      params.append('page_size', itemsPerPage);
      const url = `/api/expenses/?${params.toString()}`;
      const response = await api.get(url);
      setExpenses(response.data.results || []);
      setTotalCount(response.data.count || 0);
    } catch (err) {
      console.error('Error fetching expenses:', err);
      addToast(t('expenses.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  }, [categoryFilter, dateFrom, dateTo, minAmount, maxAmount, searchTerm, currentPage, itemsPerPage, locationFilter, addToast, t]);

  useEffect(() => {
    fetchExpenses();
  }, [fetchExpenses]);

  const handleDelete = (id) => {
    setDeleteModal(id);
  };

  const confirmDelete = async () => {
    if (!deleteModal) return;
    try {
      await api.delete(`/api/expenses/${deleteModal}/`);
      addToast(t('expenses.deletedSuccess'), 'success');
      setDeleteModal(null);
      fetchExpenses();
      fetchLocationTotals();
    } catch (err) {
      console.error('Error deleting expense:', err);
      addToast(t('expenses.failedToDelete'), 'error');
      setDeleteModal(null);
    }
  };

  const handleViewExpense = async (expenseId) => {
    try {
      const response = await api.get(`/api/expenses/${expenseId}/`);
      setSelectedExpense(response.data);
      setShowDetailsModal(true);
    } catch (err) {
      console.error('Error fetching expense:', err);
      addToast('Failed to load expense details', 'error');
    }
  };

  const handlePrint = async (forPress) => {
    try {
      const params = {};
      if (dateFrom) params.date_from = dateFrom;
      if (dateTo) params.date_to = dateTo;
      if (minAmount) params.min_amount = minAmount;
      if (maxAmount) params.max_amount = maxAmount;
      params.is_for_press = forPress ? 'true' : 'false';
      const rows = await fetchAllExpensesForPrint(params);
      if (!rows.length) {
        addToast(t('common.noRecordsFound'), 'error');
        return;
      }
      const title = forPress ? t('expenses.pressExpensesCard') : t('expenses.homeExpensesCard');
      openExpensePrintWindow({
        title,
        rows,
        dateFrom,
        dateTo,
        formatDate,
        t
      });
    } catch (e) {
      console.error(e);
      addToast(t('expenses.failedToFetch'), 'error');
    }
  };

  const totalAmount = expenses.reduce((sum, e) => sum + parseFloat(e.amount || 0), 0);
  const totalPages = Math.ceil(totalCount / itemsPerPage) || 1;

  const periodChips = [
    { key: 'daily', label: t('reportsPage.daily') },
    { key: 'weekly', label: t('reportsPage.weekly') },
    { key: 'monthly', label: t('reportsPage.monthly') },
    { key: 'yearly', label: t('reportsPage.yearly') }
  ];

  if (loading && expenses.length === 0 && totalCount === 0) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 space-y-2 p-2 sm:p-3">
        <ConfirmationModal
          isOpen={deleteModal !== null}
          onClose={() => setDeleteModal(null)}
          onConfirm={confirmDelete}
          title={t('expenses.deleteExpense')}
          message={t('expenses.deleteConfirm')}
          confirmText={t('common.delete')}
          cancelText={t('common.cancel')}
          type="danger"
        />

        <PageHeader
          title={t('expenses.title')}
          subtitle={t('expenses.addExpenseForm')}
          icon={BanknotesIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/expenses/new')}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('expenses.addExpense')}
            </button>
          }
        />

        <div className="space-y-2">
          <p className="text-[11px] text-gray-600 dark:text-gray-400 px-0.5">{t('expenses.periodFilterHint')}</p>
          <div className="flex flex-wrap gap-1.5">
            {periodChips.map(({ key, label }) => (
              <button
                key={key}
                type="button"
                onClick={() => applyPeriodPreset(key)}
                className={`px-2.5 py-1 rounded-full text-[11px] font-medium border transition-colors ${
                  periodPreset === key
                    ? 'bg-blue-600 text-white border-blue-600'
                    : 'bg-white dark:bg-gray-700 text-gray-700 dark:text-gray-200 border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-600'
                }`}
              >
                {label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div
              className={`rounded-xl border-2 p-3 shadow-sm transition-colors cursor-pointer ${
                locationFilter === 'home'
                  ? 'border-emerald-500 bg-emerald-50/80 dark:bg-emerald-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-emerald-300'
              }`}
              onClick={() => {
                setLocationFilter('home');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLocationFilter('home');
                  setCurrentPage(1);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <HomeModernIcon className="h-8 w-8 text-emerald-600 dark:text-emerald-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('expenses.homeExpensesCard')}</h3>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {t('expenses.entriesInPeriod', { count: locationTotals.home?.count ?? 0 })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-form-green p-1.5 shrink-0"
                  title={t('expenses.printHomeReport')}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(false);
                  }}
                >
                  <PrinterIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-lg font-bold text-emerald-700 dark:text-emerald-300">
                AFN {parseFloat(locationTotals.home?.total || 0).toFixed(2)}
              </p>
            </div>

            <div
              className={`rounded-xl border-2 p-3 shadow-sm transition-colors cursor-pointer ${
                locationFilter === 'press'
                  ? 'border-indigo-500 bg-indigo-50/80 dark:bg-indigo-900/20'
                  : 'border-gray-200 dark:border-gray-600 bg-white dark:bg-gray-800 hover:border-indigo-300'
              }`}
              onClick={() => {
                setLocationFilter('press');
                setCurrentPage(1);
              }}
              role="button"
              tabIndex={0}
              onKeyDown={(e) => {
                if (e.key === 'Enter' || e.key === ' ') {
                  e.preventDefault();
                  setLocationFilter('press');
                  setCurrentPage(1);
                }
              }}
            >
              <div className="flex items-start justify-between gap-2">
                <div className="flex items-center gap-2">
                  <BuildingOffice2Icon className="h-8 w-8 text-indigo-600 dark:text-indigo-400 shrink-0" />
                  <div>
                    <h3 className="text-sm font-bold text-gray-900 dark:text-white">{t('expenses.pressExpensesCard')}</h3>
                    <p className="text-[11px] text-gray-600 dark:text-gray-400">
                      {t('expenses.entriesInPeriod', { count: locationTotals.press?.count ?? 0 })}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  className="btn-form-green p-1.5 shrink-0"
                  title={t('expenses.printPressReport')}
                  onClick={(e) => {
                    e.stopPropagation();
                    handlePrint(true);
                  }}
                >
                  <PrinterIcon className="h-4 w-4" />
                </button>
              </div>
              <p className="mt-2 text-lg font-bold text-indigo-700 dark:text-indigo-300">
                AFN {parseFloat(locationTotals.press?.total || 0).toFixed(2)}
              </p>
            </div>
          </div>

          <div className="flex flex-wrap gap-1.5 items-center">
            <span className="text-[11px] text-gray-600 dark:text-gray-400 w-full sm:w-auto">{t('expenses.tableFilterLabel')}</span>
            <button
              type="button"
              onClick={() => {
                setLocationFilter('');
                setCurrentPage(1);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                locationFilter === '' ? 'bg-gray-800 text-white border-gray-800' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {t('expenses.showAllLocations')}
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationFilter('home');
                setCurrentPage(1);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                locationFilter === 'home' ? 'bg-emerald-600 text-white border-emerald-600' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {t('expenses.filterHomeOnly')}
            </button>
            <button
              type="button"
              onClick={() => {
                setLocationFilter('press');
                setCurrentPage(1);
              }}
              className={`px-2 py-1 rounded-lg text-[11px] border ${
                locationFilter === 'press' ? 'bg-indigo-600 text-white border-indigo-600' : 'border-gray-300 dark:border-gray-600'
              }`}
            >
              {t('expenses.filterPressOnly')}
            </button>
          </div>
        </div>

        <div className="px-2 sm:px-3 space-y-2">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-6 gap-2">
            <input
              type="text"
              placeholder={t('expenses.searchPlaceholder')}
              value={searchTerm}
              onChange={(e) => {
                setSearchTerm(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={categoryFilter}
              onChange={(e) => {
                setCategoryFilter(e.target.value);
                setCurrentPage(1);
              }}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('expenses.allCategories')}</option>
              {categories.map((cat) => (
                <option key={cat.value} value={cat.value}>
                  {t(cat.labelKey)}
                </option>
              ))}
            </select>
            <LocalizedDateInput
              value={dateFrom}
              onChange={(dateValue) => {
                setDateFrom(dateValue);
                setPeriodPreset('custom');
                setCurrentPage(1);
              }}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <LocalizedDateInput
              value={dateTo}
              onChange={(dateValue) => {
                setDateTo(dateValue);
                setPeriodPreset('custom');
                setCurrentPage(1);
              }}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              inputMode="decimal"
              value={minAmount}
              onChange={(e) => {
                setMinAmount(normalizeNumeralString(e.target.value));
                setCurrentPage(1);
              }}
              placeholder={t('expenses.minAmount')}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <input
              type="text"
              inputMode="decimal"
              value={maxAmount}
              onChange={(e) => {
                setMaxAmount(normalizeNumeralString(e.target.value));
                setCurrentPage(1);
              }}
              placeholder={t('expenses.maxAmount')}
              className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="text-xs text-gray-600 dark:text-gray-400">
              {t('expenses.total')}:{' '}
              <span className="font-bold text-sm text-blue-600 dark:text-blue-400">AFN {totalAmount.toFixed(2)}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <label className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{t('customers.show')}:</label>
              <select
                value={itemsPerPage}
                onChange={(e) => {
                  setItemsPerPage(Number(e.target.value));
                  setCurrentPage(1);
                }}
                className="border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-2 py-1.5 text-xs focus:outline-none focus:ring-2 focus:ring-blue-500"
              >
                <option value={5}>5</option>
                <option value={10}>10</option>
                <option value={20}>20</option>
              </select>
              <span className="text-[10px] text-gray-700 dark:text-gray-300">{t('customers.perPage')}</span>
            </div>
          </div>
        </div>

        <div className="overflow-hidden border-t border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600">
                <tr>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t('expenses.description')}
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t('expenses.category')}
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t('expenses.location')}
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t('expenses.amount')}
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t('expenses.date')}
                  </th>
                  <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">
                    {t('expenses.actions')}
                  </th>
                </tr>
              </thead>
              <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                {expenses.map((expense) => (
                  <tr key={expense.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                    <td className="px-2 py-2 text-[11px] text-gray-900 dark:text-gray-100">{expense.description}</td>
                    <td className="px-2 py-2 text-[11px] text-gray-600 dark:text-gray-300">{expense.category_display}</td>
                    <td className="px-2 py-2 text-[11px] text-gray-600 dark:text-gray-300">
                      {expense.is_for_press ? t('expenses.locationPress') : t('expenses.locationHome')}
                    </td>
                    <td className="px-2 py-2 text-[11px] font-medium text-blue-600 dark:text-blue-400">
                      AFN {parseFloat(expense.amount).toFixed(2)}
                    </td>
                    <td className="px-2 py-2 text-[11px] text-gray-600 dark:text-gray-300">{formatDate(expense.expense_date)}</td>
                    <td className="px-2 py-2 text-[11px]">
                      <div className="flex items-center gap-1.5">
                        <button
                          type="button"
                          onClick={() => handleViewExpense(expense.id)}
                          className="text-blue-600 dark:text-blue-400 hover:text-blue-900 dark:hover:text-blue-300 transition-colors"
                          title={t('common.view')}
                        >
                          <EyeIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => navigate(`/expenses/${expense.id}/edit`)}
                          className="text-green-600 dark:text-green-400 hover:text-green-900 dark:hover:text-green-300 transition-colors"
                          title={t('common.edit')}
                        >
                          <PencilIcon className="h-3.5 w-3.5" />
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(expense.id)}
                          className="text-red-600 dark:text-red-400 hover:text-red-900 dark:hover:text-red-300 transition-colors"
                          title={t('common.delete')}
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {totalPages > 1 && (
          <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="text-[10px] text-gray-700 dark:text-gray-300">
                {t('pagination.showing')} {(currentPage - 1) * itemsPerPage + 1} {t('pagination.to')}{' '}
                {Math.min(currentPage * itemsPerPage, totalCount)} {t('pagination.of')} {totalCount} {t('pagination.results')}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  type="button"
                  onClick={() => setCurrentPage(currentPage - 1)}
                  disabled={currentPage === 1}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronLeftIcon className="h-3.5 w-3.5" />
                </button>
                {[...Array(totalPages)].map((_, index) => {
                  const page = index + 1;
                  if (page === 1 || page === totalPages || (page >= currentPage - 1 && page <= currentPage + 1)) {
                    return (
                      <button
                        key={page}
                        type="button"
                        onClick={() => setCurrentPage(page)}
                        className={`px-2 py-1 border rounded-lg transition-colors text-[11px] ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  }
                  if (page === currentPage - 2 || page === currentPage + 2) {
                    return (
                      <span key={page} className="px-1.5 text-gray-500 dark:text-gray-400 text-[10px]">
                        ...
                      </span>
                    );
                  }
                  return null;
                })}
                <button
                  type="button"
                  onClick={() => setCurrentPage(currentPage + 1)}
                  disabled={currentPage === totalPages}
                  className="p-1.5 border border-gray-300 dark:border-gray-600 rounded-lg disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300 transition-colors"
                >
                  <ChevronRightIcon className="h-3.5 w-3.5" />
                </button>
              </div>
            </div>
          </div>
        )}
      </div>

      {showDetailsModal && selectedExpense && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-2xl w-full">
            <div className="bg-gradient-to-r from-blue-600 to-indigo-600 px-6 py-4 flex justify-between items-center rounded-t-lg">
              <h3 className="text-lg font-semibold text-white">Expense Details</h3>
              <button type="button" onClick={() => setShowDetailsModal(false)} className="text-white hover:text-gray-200">
                <svg className="h-6 w-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>
            <div className="p-6">
              <div className="space-y-4">
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Description</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedExpense.description}</p>
                </div>
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Amount</label>
                    <p className="text-sm font-bold text-blue-600 dark:text-blue-400 mt-1">
                      AFN {parseFloat(selectedExpense.amount).toFixed(2)}
                    </p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Category</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedExpense.category_display}</p>
                  </div>
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Location</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">
                      {selectedExpense.is_for_press ? 'Press' : 'Home'}
                    </p>
                  </div>
                </div>
                <div>
                  <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Date</label>
                  <p className="text-sm text-gray-900 dark:text-white mt-1">{formatDate(selectedExpense.expense_date)}</p>
                </div>
                {selectedExpense.notes && (
                  <div>
                    <label className="text-xs font-medium text-gray-600 dark:text-gray-400">Notes</label>
                    <p className="text-sm text-gray-900 dark:text-white mt-1">{selectedExpense.notes}</p>
                  </div>
                )}
              </div>
              <div className="flex gap-2 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    navigate(`/expenses/${selectedExpense.id}/edit`);
                  }}
                  className="flex-1 bg-green-600 text-white px-4 py-2 rounded-lg hover:bg-green-700 text-sm"
                >
                  Edit
                </button>
                <button
                  type="button"
                  onClick={() => {
                    setShowDetailsModal(false);
                    handleDelete(selectedExpense.id);
                  }}
                  className="flex-1 bg-red-600 text-white px-4 py-2 rounded-lg hover:bg-red-700 text-sm"
                >
                  Delete
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ExpenseList;
