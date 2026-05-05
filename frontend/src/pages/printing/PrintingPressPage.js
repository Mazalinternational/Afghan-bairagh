import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { PlusIcon, PrinterIcon, PencilIcon, TrashIcon, EyeIcon } from '@heroicons/react/24/outline';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import api from '../../services/api';
import PageHeader from '../../components/common/PageHeader';

const PrintingPressPage = () => {
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const { addToast } = useToast();
  const [allRecords, setAllRecords] = useState([]);
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [currentPage, setCurrentPage] = useState(1);
  const itemsPerPage = 5;

  useEffect(() => {
    fetchRecords();
  }, []);

  const fetchRecords = async () => {
    try {
      let url = '/api/printing-jobs/';
      const all = [];
      while (url) {
        const res = await api.get(url);
        const data = res.data;
        const rows = Array.isArray(data) ? data : data.results || [];
        all.push(...rows);
        url = Array.isArray(data) ? null : data.next;
      }
      setAllRecords(all);
    } catch (err) {
      console.error(err);
    }
  };

  const filteredRecords = useMemo(() => {
    const q = search.trim().toLowerCase();
    return allRecords.filter((r) => {
      const matchSearch = !q
        || String(r.bill_number || '').toLowerCase().includes(q)
        || String(r.printer_name || '').toLowerCase().includes(q)
        || String(r.job_title || '').toLowerCase().includes(q);
      const matchStatus = !statusFilter || r.payment_status === statusFilter;
      return matchSearch && matchStatus;
    });
  }, [allRecords, search, statusFilter]);

  const totalPages = Math.max(1, Math.ceil(filteredRecords.length / itemsPerPage));
  const paginatedRecords = useMemo(() => {
    const start = (currentPage - 1) * itemsPerPage;
    return filteredRecords.slice(start, start + itemsPerPage);
  }, [filteredRecords, currentPage]);

  const handleDeleteRecord = async (id) => {
    if (!window.confirm(t('modals.confirmDelete') || 'Delete this record?')) return;
    try {
      await api.delete(`/api/printing-jobs/${id}/`);
      addToast(t('common.deletedSuccess') || 'Deleted', 'success');
      fetchRecords();
    } catch (err) {
      console.error(err);
      addToast(t('printing.failedSave'), 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="mx-2 space-y-3">
        <PageHeader
          title={t('printing.title')}
          subtitle={t('printing.subtitle')}
          icon={PrinterIcon}
          actions={<button type="button" onClick={() => navigate('/printing/create')} className="btn-form-green text-xs flex items-center gap-1"><PlusIcon className="h-3.5 w-3.5" />{t('printing.createRecord')}</button>}
        />

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              value={search}
              onChange={(e) => { setSearch(e.target.value); setCurrentPage(1); }}
              placeholder={t('recordLookup.placeholder')}
              className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
            <select
              value={statusFilter}
              onChange={(e) => { setStatusFilter(e.target.value); setCurrentPage(1); }}
              className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('common.all') || 'All'}</option>
              <option value="paid">{t('purchases.paid')}</option>
              <option value="partial">{t('purchases.partial')}</option>
              <option value="due">{t('purchases.due')}</option>
            </select>
            <div className="text-xs text-gray-600 dark:text-gray-300 flex items-center">
              {(t('pagination.showing') || 'Showing')} {filteredRecords.length === 0 ? 0 : (currentPage - 1) * itemsPerPage + 1}
              {' '} {(t('pagination.to') || 'to')} {Math.min(currentPage * itemsPerPage, filteredRecords.length)}
              {' '} {(t('pagination.of') || 'of')} {filteredRecords.length}
            </div>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl p-3 shadow">
          <h3 className="text-sm font-semibold mb-2">{t('printing.records')}</h3>
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600 text-white">
                <tr>
                  <th className="px-2 py-1.5 text-left text-xs">{t('printing.billNumber')}</th>
                  <th className="px-2 py-1.5 text-left text-xs">{t('printing.printer')}</th>
                  <th className="px-2 py-1.5 text-left text-xs">{t('common.date')}</th>
                  <th className="px-2 py-1.5 text-left text-xs">{t('printing.totalPrice')}</th>
                  <th className="px-2 py-1.5 text-left text-xs">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody>
                {paginatedRecords.map((r) => (
                  <tr key={r.id} className="border-b border-gray-200 dark:border-gray-700">
                    <td className="px-2 py-1.5 text-xs">{r.bill_number || r.id}</td>
                    <td className="px-2 py-1.5 text-xs">{r.printer_name}</td>
                    <td className="px-2 py-1.5 text-xs">{formatDate(r.job_date)}</td>
                    <td className="px-2 py-1.5 text-xs">AFN {parseFloat(r.total_price || 0).toFixed(2)}</td>
                    <td className="px-2 py-1.5 text-xs">
                      <div className="flex items-center gap-1">
                        <button onClick={() => navigate(`/printing/${r.id}`)} className="p-1 rounded text-indigo-600 hover:bg-indigo-50 dark:hover:bg-indigo-900/30"><EyeIcon className="h-4 w-4" /></button>
                        <button onClick={() => navigate(`/printing/${r.id}/edit`)} className="p-1 rounded text-blue-600 hover:bg-blue-50 dark:hover:bg-blue-900/30"><PencilIcon className="h-4 w-4" /></button>
                        <button onClick={() => handleDeleteRecord(r.id)} className="p-1 rounded text-red-600 hover:bg-red-50 dark:hover:bg-red-900/30"><TrashIcon className="h-4 w-4" /></button>
                      </div>
                    </td>
                  </tr>
                ))}
                {paginatedRecords.length === 0 && (
                  <tr><td colSpan={5} className="px-2 py-3 text-xs text-gray-500">{t('common.noData')}</td></tr>
                )}
              </tbody>
            </table>
          </div>
          <div className="mt-3 flex items-center justify-between">
            <button type="button" disabled={currentPage <= 1} onClick={() => setCurrentPage((p) => Math.max(1, p - 1))} className="btn-form-red text-xs disabled:opacity-50">{t('pagination.previous') || t('common.prev') || 'Prev'}</button>
            <span className="text-xs text-gray-600 dark:text-gray-300">{t('pagination.page') || 'Page'} {currentPage} {t('pagination.of') || 'of'} {totalPages}</span>
            <button type="button" disabled={currentPage >= totalPages} onClick={() => setCurrentPage((p) => Math.min(totalPages, p + 1))} className="btn-form-green text-xs disabled:opacity-50">{t('pagination.next') || t('common.next') || 'Next'}</button>
          </div>
        </div>
      </div>
    </div>
  );
};

export default PrintingPressPage;

