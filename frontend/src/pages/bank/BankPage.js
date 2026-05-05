import React, { useEffect, useState } from 'react';
import { ArrowDownTrayIcon, ArrowUpTrayIcon, BuildingLibraryIcon, PencilSquareIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import { normalizeNumeralString, parseLocaleFloat } from '../../utils/numerals';
import PageHeader from '../../components/common/PageHeader';

const toAmount = (value) => Number.parseFloat(value || 0).toFixed(2);

const BankPage = () => {
  const { t, formatDate, formatTime } = useTranslation();
  const { addToast } = useToast();

  const [summary, setSummary] = useState({
    current_balance: '0',
    total_deposit: '0',
    total_withdraw: '0',
    income_total: '0',
    income_deposited: '0',
    income_available: '0',
  });
  const [transactions, setTransactions] = useState([]);
  const [currentPage, setCurrentPage] = useState(1);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    transaction_type: 'deposit',
    source: 'manual',
    amount: '',
    note: '',
  });
  const [editingId, setEditingId] = useState(null);

  const fetchData = async () => {
    try {
      const [summaryRes, txRes] = await Promise.all([
        api.get('/api/bank/transactions/summary/'),
        api.get('/api/bank/transactions/'),
      ]);
      setSummary(summaryRes.data || {});
      const list = Array.isArray(txRes.data) ? txRes.data : (txRes.data?.results || []);
      setTransactions(list);
      setCurrentPage(1);
    } catch (error) {
      addToast(t('bank.failedToLoad'), 'error');
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSubmit = async (e) => {
    e.preventDefault();
    const amount = parseLocaleFloat(formData.amount);
    if (!amount || amount <= 0) {
      addToast(t('bank.amountRequired'), 'error');
      return;
    }

    setLoading(true);
    try {
      if (editingId) {
        await api.patch(`/api/bank/transactions/${editingId}/`, {
          transaction_type: formData.transaction_type,
          source: formData.source,
          amount,
          note: formData.note,
        });
      } else {
        await api.post('/api/bank/transactions/', {
          transaction_type: formData.transaction_type,
          source: formData.source,
          amount,
          note: formData.note,
        });
      }
      addToast(
        editingId
          ? t('bank.updateSuccess')
          : (formData.transaction_type === 'deposit' ? t('bank.depositSuccess') : t('bank.withdrawSuccess')),
        'success'
      );
      resetForm();
      await fetchData();
    } catch (error) {
      addToast(error.response?.data?.amount?.[0] || error.response?.data?.error || t('bank.failedToSave'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleDepositIncome = async () => {
    setLoading(true);
    try {
      await api.post('/api/bank/transactions/deposit_income/', {});
      addToast(t('bank.incomeDepositSuccess'), 'success');
      await fetchData();
    } catch (error) {
      addToast(error.response?.data?.error || t('bank.noIncomeAvailable'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setEditingId(null);
    setFormData({
      transaction_type: 'deposit',
      source: 'manual',
      amount: '',
      note: '',
    });
  };

  const handleEdit = (tx) => {
    setEditingId(tx.id);
    setFormData({
      transaction_type: tx.transaction_type,
      source: tx.source,
      amount: String(tx.amount || ''),
      note: tx.note || '',
    });
  };

  const handleDelete = async (txId) => {
    setLoading(true);
    try {
      await api.delete(`/api/bank/transactions/${txId}/`);
      addToast(t('bank.deleteSuccess'), 'success');
      await fetchData();
    } catch (error) {
      addToast(error.response?.data?.error || t('bank.failedToDelete'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const itemsPerPage = 5;
  const totalPages = Math.max(1, Math.ceil(transactions.length / itemsPerPage));
  const safePage = Math.min(currentPage, totalPages);
  const startIndex = (safePage - 1) * itemsPerPage;
  const paginatedTransactions = transactions.slice(startIndex, startIndex + itemsPerPage);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 p-3 space-y-3">
        <PageHeader
          title={t('bank.title')}
          subtitle={t('bank.subtitle')}
          icon={BuildingLibraryIcon}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-3">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-blue-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('bank.currentBalance')}</p>
            <p className="text-lg font-bold text-blue-700 dark:text-blue-300">AFN {toAmount(summary.current_balance)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-green-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('bank.totalDeposits')}</p>
            <p className="text-lg font-bold text-green-700 dark:text-green-300">AFN {toAmount(summary.total_deposit)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-red-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('bank.totalWithdraws')}</p>
            <p className="text-lg font-bold text-red-700 dark:text-red-300">AFN {toAmount(summary.total_withdraw)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-3 border border-amber-100 dark:border-gray-700">
            <p className="text-xs text-gray-500 dark:text-gray-400">{t('bank.availableIncome')}</p>
            <p className="text-lg font-bold text-amber-700 dark:text-amber-300">AFN {toAmount(summary.income_available)}</p>
          </div>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-blue-100 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('bank.newTransaction')}</h2>
            <button
              type="button"
              onClick={handleDepositIncome}
              className="btn-form-green text-sm"
              disabled={loading}
            >
              {t('bank.depositIncome')}
            </button>
          </div>

          <form onSubmit={handleSubmit} className="grid grid-cols-1 md:grid-cols-4 gap-3">
            <select
              value={formData.transaction_type}
              onChange={(e) => setFormData((prev) => ({ ...prev, transaction_type: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="deposit">{t('bank.deposit')}</option>
              <option value="withdraw">{t('bank.withdraw')}</option>
            </select>
            <select
              value={formData.source}
              onChange={(e) => setFormData((prev) => ({ ...prev, source: e.target.value }))}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="manual">{t('bank.manual')}</option>
              <option value="income">{t('bank.income')}</option>
            </select>
            <input
              type="text"
              inputMode="decimal"
              value={formData.amount}
              onChange={(e) => setFormData((prev) => ({ ...prev, amount: normalizeNumeralString(e.target.value) }))}
              placeholder={t('bank.amount')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <input
              type="text"
              value={formData.note}
              onChange={(e) => setFormData((prev) => ({ ...prev, note: e.target.value }))}
              placeholder={t('bank.note')}
              className="px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <div className="md:col-span-4 flex justify-end">
              {editingId && (
                <button
                  type="button"
                  onClick={resetForm}
                  className="btn-form-red text-sm mr-2"
                  disabled={loading}
                >
                  {t('common.cancel')}
                </button>
              )}
              <button type="submit" className="btn-form-green text-sm" disabled={loading}>
                {editingId ? t('common.save') : (formData.transaction_type === 'deposit' ? t('bank.deposit') : t('bank.withdraw'))}
              </button>
            </div>
          </form>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4 border border-blue-100 dark:border-gray-700">
          <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('bank.transactions')}</h2>
          <div className="overflow-x-auto">
            {transactions.length === 0 && (
              <p className="text-sm text-gray-500 dark:text-gray-400">{t('bank.noTransactions')}</p>
            )}
            {transactions.length > 0 && (
              <table className="w-full min-w-[760px]">
                <thead className="bg-blue-600">
                  <tr>
                    <th className="text-left py-2 px-3 text-xs text-white">{t('common.date')}</th>
                    <th className="text-left py-2 px-3 text-xs text-white">{t('bank.type')}</th>
                    <th className="text-left py-2 px-3 text-xs text-white">{t('bank.source')}</th>
                    <th className="text-right py-2 px-3 text-xs text-white">{t('bank.amount')}</th>
                    <th className="text-left py-2 px-3 text-xs text-white">{t('bank.note')}</th>
                    <th className="text-left py-2 px-3 text-xs text-white">{t('common.actions')}</th>
                  </tr>
                </thead>
                <tbody>
                  {paginatedTransactions.map((tx) => (
                    <tr key={tx.id} className="border-b border-gray-200 dark:border-gray-700">
                      <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300">
                        {formatDate(tx.transaction_date)} {formatTime(tx.transaction_date)}
                      </td>
                      <td className="py-2 px-3 text-xs">
                        <span className={`inline-flex items-center gap-1 ${tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                          {tx.transaction_type === 'deposit' ? <ArrowDownTrayIcon className="h-3 w-3" /> : <ArrowUpTrayIcon className="h-3 w-3" />}
                          {tx.transaction_type === 'deposit' ? t('bank.credit') : t('bank.debit')}
                        </span>
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-700 dark:text-gray-300">
                        {tx.source === 'income' ? t('bank.income') : t('bank.manual')}
                      </td>
                      <td className={`py-2 px-3 text-xs text-right font-semibold ${tx.transaction_type === 'deposit' ? 'text-green-600' : 'text-red-600'}`}>
                        {tx.transaction_type === 'deposit' ? '+' : '-'}AFN {toAmount(tx.amount)}
                      </td>
                      <td className="py-2 px-3 text-xs text-gray-600 dark:text-gray-400">{tx.note || '-'}</td>
                      <td className="py-2 px-3 text-xs">
                        <div className="flex items-center gap-2">
                          <button
                            type="button"
                            onClick={() => handleEdit(tx)}
                            className="text-blue-600 hover:text-blue-800"
                            title={t('common.edit')}
                            aria-label={t('common.edit')}
                          >
                            <PencilSquareIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDelete(tx.id)}
                            className="text-red-600 hover:text-red-800"
                            title={t('common.delete')}
                            aria-label={t('common.delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
          {transactions.length > itemsPerPage && (
            <div className="mt-3 flex items-center justify-between text-xs text-gray-600 dark:text-gray-400">
              <span>
                {startIndex + 1}-{Math.min(startIndex + itemsPerPage, transactions.length)} / {transactions.length}
              </span>
              <div className="flex items-center gap-2">
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.max(1, prev - 1))}
                  disabled={safePage === 1}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  {t('pagination.previous')}
                </button>
                <span>
                  {safePage} / {totalPages}
                </span>
                <button
                  type="button"
                  onClick={() => setCurrentPage((prev) => Math.min(totalPages, prev + 1))}
                  disabled={safePage === totalPages}
                  className="px-2 py-1 rounded border border-gray-300 dark:border-gray-600 disabled:opacity-50"
                >
                  {t('pagination.next')}
                </button>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default BankPage;

