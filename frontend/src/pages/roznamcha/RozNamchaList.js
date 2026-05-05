import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import {
  PlusIcon,
  MagnifyingGlassIcon,
  EyeIcon,
  PencilIcon,
  TrashIcon,
  ChevronLeftIcon,
  ChevronRightIcon,
  PrinterIcon,
  ClipboardDocumentListIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const RozNamchaList = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate, formatDateLong } = useTranslation();
  const [entries, setEntries] = useState([]);
  const [allEntries, setAllEntries] = useState([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [deleteModal, setDeleteModal] = useState(null);
  const [currentPage, setCurrentPage] = useState(1);
  const [itemsPerPage, setItemsPerPage] = useState(10);
  const [dateFilter, setDateFilter] = useState('');

  useEffect(() => {
    fetchEntries();
  }, []);

  useEffect(() => {
    paginateEntries();
  }, [allEntries, currentPage, itemsPerPage, searchQuery, dateFilter]);

  const fetchEntries = async () => {
    setLoading(true);
    try {
      const res = await api.get('/api/roznamcha/');
      setAllEntries(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching roznamcha entries:', err);
      addToast(t('rozNamcha.failedToFetch'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const paginateEntries = () => {
    let filteredEntries = Array.isArray(allEntries) ? allEntries : [];
    
    if (searchQuery.trim()) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFilter) {
      filteredEntries = filteredEntries.filter(entry => 
        entry.date === dateFilter
      );
    }
    
    const startIndex = (currentPage - 1) * itemsPerPage;
    const endIndex = startIndex + itemsPerPage;
    const paginatedEntries = filteredEntries.slice(startIndex, endIndex);
    
    setEntries(paginatedEntries);
  };

  const totalItems = (() => {
    let filtered = Array.isArray(allEntries) ? allEntries : [];
    
    if (searchQuery.trim()) {
      filtered = filtered.filter(entry => 
        entry.item_name?.toLowerCase().includes(searchQuery.toLowerCase()) ||
        entry.description?.toLowerCase().includes(searchQuery.toLowerCase())
      );
    }

    if (dateFilter) {
      filtered = filtered.filter(entry => entry.date === dateFilter);
    }
    
    return filtered.length;
  })();

  const handleSearch = (query) => {
    setSearchQuery(query);
    setCurrentPage(1);
  };

  const handleSearchChange = (e) => {
    const query = e.target.value;
    clearTimeout(window.searchTimeout);
    window.searchTimeout = setTimeout(() => {
      handleSearch(query);
    }, 300);
  };

  const handleDelete = (id, itemName) => {
    setDeleteModal({ id, itemName });
  };

  const confirmDelete = async () => {
    const { id, itemName } = deleteModal;
    try {
      await api.delete(`/api/roznamcha/${id}/`);
      setAllEntries(allEntries.filter(e => e.id !== id));
      addToast(`${itemName} ${t('common.deletedSuccess')}`, 'success');
    } catch (err) {
      console.error('Error deleting entry:', err);
      addToast(t('rozNamcha.failedToDelete'), 'error');
    }
    setDeleteModal(null);
  };

  const totalPages = Math.ceil(totalItems / itemsPerPage);
  const startItem = (currentPage - 1) * itemsPerPage + 1;
  const endItem = Math.min(currentPage * itemsPerPage, totalItems);
  
  // Calculate totals for credit and debit
  const totalCredit = entries.reduce((sum, entry) => 
    entry.transaction_type === 'credit' ? sum + parseFloat(entry.cost_price || 0) : sum, 0);
  const totalDebit = entries.reduce((sum, entry) => 
    entry.transaction_type === 'debit' ? sum + parseFloat(entry.cost_price || 0) : sum, 0);
  const currentBalance = totalCredit - totalDebit;

  // Calculate daily, weekly, and monthly totals
  const calculateTotals = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay()); // Start of week (Sunday)
    startOfWeek.setHours(0, 0, 0, 0);
    
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    
    const endOfToday = new Date(today);
    endOfToday.setHours(23, 59, 59, 999);
    
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    let dailyTotal = 0;
    let weeklyTotal = 0;
    let monthlyTotal = 0;
    
    allEntries.forEach(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      const cost = parseFloat(entry.cost_price || 0);
      
      // Daily total
      if (entryDate.getTime() === today.getTime()) {
        dailyTotal += cost;
      }
      
      // Weekly total
      if (entryDate >= startOfWeek && entryDate <= endOfWeek) {
        weeklyTotal += cost;
      }
      
      // Monthly total
      if (entryDate >= startOfMonth && entryDate <= endOfMonth) {
        monthlyTotal += cost;
      }
    });
    
    return { dailyTotal, weeklyTotal, monthlyTotal };
  };

  const { dailyTotal, weeklyTotal, monthlyTotal } = calculateTotals();

  // Get filtered entries for each period
  const getDailyEntries = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate.getTime() === today.getTime();
    });
  };

  const getWeeklyEntries = () => {
    const today = new Date();
    today.setHours(0, 0, 0, 0);
    const startOfWeek = new Date(today);
    startOfWeek.setDate(today.getDate() - today.getDay());
    startOfWeek.setHours(0, 0, 0, 0);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(startOfWeek.getDate() + 6);
    endOfWeek.setHours(23, 59, 59, 999);
    
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= startOfWeek && entryDate <= endOfWeek;
    });
  };

  const getMonthlyEntries = () => {
    const today = new Date();
    const startOfMonth = new Date(today.getFullYear(), today.getMonth(), 1);
    startOfMonth.setHours(0, 0, 0, 0);
    const endOfMonth = new Date(today.getFullYear(), today.getMonth() + 1, 0);
    endOfMonth.setHours(23, 59, 59, 999);
    
    return allEntries.filter(entry => {
      const entryDate = new Date(entry.date);
      entryDate.setHours(0, 0, 0, 0);
      return entryDate >= startOfMonth && entryDate <= endOfMonth;
    });
  };

  const handlePrint = (type) => {
    let entriesToPrint = [];
    let title = '';
    let period = '';
    
    if (type === 'daily') {
      entriesToPrint = getDailyEntries();
      title = t('rozNamcha.dailyReport');
      period = `${t('common.date')}: ${formatDate(new Date())}`;
    } else if (type === 'weekly') {
      entriesToPrint = getWeeklyEntries();
      title = t('rozNamcha.weeklyReport');
      const today = new Date();
      const startOfWeek = new Date(today);
      startOfWeek.setDate(today.getDate() - today.getDay());
      const endOfWeek = new Date(startOfWeek);
      endOfWeek.setDate(startOfWeek.getDate() + 6);
      period = `${t('reports.startDate')} - ${t('reports.endDate')}: ${formatDate(startOfWeek)} - ${formatDate(endOfWeek)}`;
    } else if (type === 'monthly') {
      entriesToPrint = getMonthlyEntries();
      title = t('rozNamcha.monthlyReport');
      const today = new Date();
      period = `${t('common.date')}: ${formatDateLong(today)}`;
    }
    
    const total = entriesToPrint.reduce((sum, entry) => sum + parseFloat(entry.cost_price || 0), 0);
    
    const printWindow = window.open('', '_blank');
    printWindow.document.write(`
      <html>
        <head>
          <title>${title}</title>
          <style>
            body { font-family: Arial, sans-serif; padding: 20px; font-size: 12px; }
            h1 { font-size: 18px; margin-bottom: 10px; }
            h2 { font-size: 14px; margin-bottom: 8px; color: #666; }
            table { width: 100%; border-collapse: collapse; margin-top: 15px; }
            th, td { border: 1px solid #ddd; padding: 6px; text-align: left; font-size: 11px; }
            th { background-color: #f2f2f2; font-weight: bold; }
            .total { font-weight: bold; font-size: 13px; margin-top: 10px; }
            @media print {
              body { padding: 10px; }
            }
          </style>
        </head>
        <body>
          <h1>${title}</h1>
          <h2>${period}</h2>
          <table>
            <thead>
              <tr>
                <th>${t('rozNamcha.itemName')}</th>
                <th>${t('common.date')}</th>
                <th>${t('common.description')}</th>
                <th>${t('rozNamcha.costPrice')}</th>
              </tr>
            </thead>
            <tbody>
              ${entriesToPrint.map(entry => `
                <tr>
                  <td>${entry.item_name || 'N/A'}</td>
                  <td>${formatDate(entry.date)}</td>
                  <td>${entry.description || 'N/A'}</td>
                  <td>AFN ${(parseFloat(entry.cost_price) || 0).toFixed(2)}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
          <div class="total">${t('common.total')}: AFN ${total.toFixed(2)}</div>
          <div style="margin-top: 5px; font-size: 10px; color: #666;">${t('rozNamcha.totalEntries')}: ${entriesToPrint.length}</div>
        </body>
      </html>
    `);
    printWindow.document.close();
    printWindow.print();
  };

  const handlePageChange = (page) => {
    setCurrentPage(page);
  };

  const handleItemsPerPageChange = (e) => {
    setItemsPerPage(Number(e.target.value));
    setCurrentPage(1);
  };

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 space-y-2 p-2 sm:p-3">
        {/* Delete Confirmation Modal */}
        {deleteModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 p-3 rounded-lg shadow-xl max-w-sm w-full">
              <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-gray-100">{t('modals.confirmDelete')}</h3>
              <p className="text-xs text-gray-600 dark:text-gray-300 mb-3">
                {t('modals.deleteMessage')} <strong className="text-gray-900 dark:text-gray-100">{deleteModal.itemName}</strong>?
              </p>
              <div className="flex gap-2">
                <button
                  onClick={confirmDelete}
                  className="flex-1 bg-red-600 text-white py-1 px-2.5 text-xs rounded hover:bg-red-700 transition-colors"
                >
                  {t('modals.yesDelete')}
                </button>
                <button
                  onClick={() => setDeleteModal(null)}
                  className="flex-1 bg-gray-300 dark:bg-gray-600 text-gray-700 dark:text-gray-200 py-1 px-2.5 text-xs rounded hover:bg-gray-400 dark:hover:bg-gray-500 transition-colors"
                >
                  {t('common.cancel')}
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Header */}
        <PageHeader
          title={t('rozNamcha.title')}
          subtitle={t('rozNamcha.addEntry')}
          icon={ClipboardDocumentListIcon}
          actions={
            <button
              onClick={() => navigate('/roznamcha/create')}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
            >
              <PlusIcon className="h-3.5 w-3.5" />
              {t('rozNamcha.addEntry')}
            </button>
          }
        />

        {/* Totals Summary */}
        <div className="px-2 sm:px-3">
          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2">
        <div className="bg-gradient-to-br from-blue-50 to-blue-100 dark:from-gray-800 dark:to-gray-700 p-2 rounded-lg border-l-4 border-blue-600">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('rozNamcha.dailyTotal')}</div>
              <div className="text-sm font-bold text-blue-600 dark:text-blue-400">AFN {dailyTotal.toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('rozNamcha.today')}</div>
            </div>
            <button
              onClick={() => handlePrint('daily')}
              className="text-blue-600 dark:text-blue-400 hover:text-blue-800 dark:hover:text-blue-300 p-1 rounded transition-colors"
              title={t('rozNamcha.dailyReport')}
            >
              <PrinterIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-br from-green-50 to-green-100 dark:from-gray-800 dark:to-gray-700 p-2 rounded-lg border-l-4 border-green-600">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('rozNamcha.weeklyTotal')}</div>
              <div className="text-sm font-bold text-green-600 dark:text-green-400">AFN {weeklyTotal.toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('rozNamcha.thisWeek')}</div>
            </div>
            <button
              onClick={() => handlePrint('weekly')}
              className="text-green-600 dark:text-green-400 hover:text-green-800 dark:hover:text-green-300 p-1 rounded transition-colors"
              title={t('rozNamcha.weeklyReport')}
            >
              <PrinterIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
        <div className="bg-gradient-to-br from-purple-50 to-purple-100 dark:from-gray-800 dark:to-gray-700 p-2 rounded-lg border-l-4 border-purple-600">
          <div className="flex justify-between items-start mb-1">
            <div>
              <div className="text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-0.5">{t('rozNamcha.monthlyTotal')}</div>
              <div className="text-sm font-bold text-purple-600 dark:text-purple-400">AFN {monthlyTotal.toFixed(2)}</div>
              <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('rozNamcha.thisMonth')}</div>
            </div>
            <button
              onClick={() => handlePrint('monthly')}
              className="text-purple-600 dark:text-purple-400 hover:text-purple-800 dark:hover:text-purple-300 p-1 rounded transition-colors"
              title={t('rozNamcha.monthlyReport')}
            >
              <PrinterIcon className="h-3.5 w-3.5" />
            </button>
          </div>
        </div>
          </div>
        </div>

        {/* Search and Filters */}
        <div className="px-2 sm:px-3 space-y-2">
        <div className="flex flex-col sm:flex-row gap-2">
          <div className="relative flex-1">
            <MagnifyingGlassIcon className="h-3.5 w-3.5 absolute left-2 top-2 text-gray-400 dark:text-gray-500" />
            <input
              type="text"
              placeholder={t('common.search') + '...'}
              onChange={handleSearchChange}
              className="w-full pl-7 pr-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 placeholder-gray-500 dark:placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            />
          </div>
          <LocalizedDateInput
            value={dateFilter}
            onChange={(dateValue) => {
              setDateFilter(dateValue);
              setCurrentPage(1);
            }}
            className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
          />
          <div className="flex items-center gap-1.5">
            <label className="text-[10px] font-medium text-gray-700 dark:text-gray-300">{t('common.show')}:</label>
            <select
              value={itemsPerPage}
              onChange={handleItemsPerPageChange}
              className="border border-gray-300 dark:border-gray-600 rounded-lg px-2 py-1.5 text-xs bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100 focus:outline-none focus:ring-2 focus:ring-blue-500 dark:focus:ring-blue-400"
            >
              <option value={5}>5</option>
              <option value={10}>10</option>
              <option value={20}>20</option>
            </select>
            <span className="text-[10px] text-gray-700 dark:text-gray-300">{t('pagination.perPage')}</span>
          </div>
        </div>
          <div className="flex gap-4 text-[10px] text-gray-600 dark:text-gray-400">
            <div>
              {t('common.total')} {t('rozNamcha.credit') || 'Credit'}: <span className="font-bold text-sm text-green-600 dark:text-green-400">AFN {totalCredit.toFixed(2)}</span>
            </div>
            <div>
              {t('common.total')} {t('rozNamcha.debit') || 'Debit'}: <span className="font-bold text-sm text-red-600 dark:text-red-400">AFN {totalDebit.toFixed(2)}</span>
            </div>
            <div>
              {t('rozNamcha.balance') || 'Balance'}: <span className="font-bold text-sm text-blue-600 dark:text-blue-400">AFN {currentBalance.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Entries Table */}
        <div className="overflow-hidden border-t border-gray-200 dark:border-gray-700">
        {entries.length === 0 ? (
          <div className="p-6 text-center text-xs text-gray-500 dark:text-gray-400">
            {t('rozNamcha.noEntriesFound')}
          </div>
        ) : (
          <>
            {/* Desktop Table */}
            <div className="hidden md:block overflow-x-auto">
              <table className="w-full">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('rozNamcha.itemName')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('common.date')}</th>
                    <th className="px-2 py-1.5 text-left text-[10px] font-semibold uppercase tracking-wider text-white">{t('common.description')}</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white">{t('rozNamcha.credit') || 'Credit'}</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white">{t('rozNamcha.debit') || 'Debit'}</th>
                    <th className="px-2 py-1.5 text-right text-[10px] font-semibold uppercase tracking-wider text-white">{t('rozNamcha.balance') || 'Balance'}</th>
                  </tr>
                </thead>
                <tbody className="bg-white dark:bg-gray-800 divide-y divide-gray-200 dark:divide-gray-700">
                  {(() => {
                    let runningBalance = 0;
                    return entries.map((entry) => {
                      const amount = parseFloat(entry.cost_price || 0);
                      if (entry.transaction_type === 'credit') {
                        runningBalance += amount;
                      } else {
                        runningBalance -= amount;
                      }
                      return (
                        <tr key={entry.id} className="hover:bg-gray-50 dark:hover:bg-gray-700/50 transition-colors">
                          <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-gray-900 dark:text-gray-100">
                            {entry.item_name}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-[11px] text-gray-600 dark:text-gray-300">
                            {formatDate(entry.date)}
                          </td>
                          <td className="px-2 py-2 text-[11px] text-gray-600 dark:text-gray-300 max-w-xs truncate">
                            {entry.description || 'N/A'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-right text-green-600 dark:text-green-400">
                            {entry.transaction_type === 'credit' ? `AFN ${amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-[11px] font-medium text-right text-red-600 dark:text-red-400">
                            {entry.transaction_type === 'debit' ? `AFN ${amount.toFixed(2)}` : '-'}
                          </td>
                          <td className="px-2 py-2 whitespace-nowrap text-[11px] font-bold text-right text-blue-600 dark:text-blue-400">
                            AFN {runningBalance.toFixed(2)}
                          </td>
                        </tr>
                      );
                    });
                  })()}
                </tbody>
              </table>
            </div>

            {/* Mobile Cards */}
            <div className="md:hidden divide-y divide-gray-200 dark:divide-gray-700">
              {(() => {
                let runningBalance = 0;
                return entries.map((entry) => {
                  const amount = parseFloat(entry.cost_price || 0);
                  if (entry.transaction_type === 'credit') {
                    runningBalance += amount;
                  } else {
                    runningBalance -= amount;
                  }
                  return (
                    <div key={entry.id} className="p-2 space-y-2">
                      <div className="flex justify-between items-start gap-2">
                        <div className="flex-1 min-w-0">
                          <h3 className="font-semibold text-gray-900 dark:text-gray-100 text-xs truncate">{entry.item_name}</h3>
                          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{formatDate(entry.date)}</p>
                        </div>
                      </div>
                      <div className="space-y-1">
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('common.description')}</p>
                          <p className="text-[11px] text-gray-900 dark:text-gray-100">{entry.description || 'N/A'}</p>
                        </div>
                        <div className="grid grid-cols-2 gap-2">
                          <div>
                          <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('rozNamcha.credit') || 'Credit'}</p>
                            <p className="font-medium text-green-600 dark:text-green-400 text-xs">
                              {entry.transaction_type === 'credit' ? `AFN ${amount.toFixed(2)}` : '-'}
                            </p>
                          </div>
                          <div>
                          <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('rozNamcha.debit') || 'Debit'}</p>
                            <p className="font-medium text-red-600 dark:text-red-400 text-xs">
                              {entry.transaction_type === 'debit' ? `AFN ${amount.toFixed(2)}` : '-'}
                            </p>
                          </div>
                        </div>
                        <div>
                          <p className="text-gray-500 dark:text-gray-400 text-[10px] mb-0.5">{t('rozNamcha.balance') || 'Balance'}</p>
                          <p className="font-bold text-blue-600 dark:text-blue-400 text-xs">AFN {runningBalance.toFixed(2)}</p>
                        </div>
                      </div>
                    </div>
                  );
                });
              })()}
            </div>
          </>
        )}
        </div>

        {/* Pagination */}
        {totalPages > 1 && (
          <div className="p-2 sm:p-3 border-t border-gray-200 dark:border-gray-700">
            <div className="flex flex-col sm:flex-row justify-between items-center gap-2">
              <div className="text-[10px] text-gray-700 dark:text-gray-300">
                {t('pagination.showing')} {startItem} {t('pagination.to')} {endItem} {t('pagination.of')} {totalItems} {t('pagination.results')}
              </div>
              <div className="flex items-center gap-1.5 flex-wrap justify-center">
                <button
                  onClick={() => handlePageChange(currentPage - 1)}
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
                        onClick={() => handlePageChange(page)}
                        className={`px-2 py-1 border rounded-lg transition-colors text-[11px] ${
                          currentPage === page
                            ? 'bg-blue-600 text-white border-blue-600'
                            : 'border-gray-300 dark:border-gray-600 hover:bg-gray-50 dark:hover:bg-gray-700 text-gray-700 dark:text-gray-300'
                        }`}
                      >
                        {page}
                      </button>
                    );
                  } else if (page === currentPage - 2 || page === currentPage + 2) {
                    return <span key={page} className="px-1.5 text-gray-500 dark:text-gray-400 text-[10px]">...</span>;
                  }
                  return null;
                })}
                
                <button
                  onClick={() => handlePageChange(currentPage + 1)}
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
    </div>
  );
};

export default RozNamchaList;
