import React, { useEffect, useState, useCallback, useMemo } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, CurrencyDollarIcon, PencilIcon, TrashIcon, PrinterIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';

const PAYMENTS_PER_PAGE = 5;

const PrintingRecordDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [record, setRecord] = useState(null);
  const [loading, setLoading] = useState(true);
  const [paymentPage, setPaymentPage] = useState(1);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [editingPayment, setEditingPayment] = useState(null);
  const [paymentForm, setPaymentForm] = useState({
    amount: '',
    payment_method: 'cash',
    reference: '',
    notes: '',
  });

  const fetchRecord = useCallback(async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/printing-jobs/${id}/`);
      setRecord(res.data);
    } catch (err) {
      console.error(err);
      setRecord(null);
    } finally {
      setLoading(false);
    }
  }, [id]);

  useEffect(() => {
    fetchRecord();
  }, [fetchRecord]);

  const paymentMethodLabel = (method) => {
    const m = String(method || '').toLowerCase();
    if (m === 'cash') return t('printing.cash');
    if (m === 'credit') return t('printing.credit');
    if (m === 'partial') return t('printing.partial');
    return method || '—';
  };

  const remaining = parseFloat(record?.remaining_amount || 0);

  const resetPaymentForm = () => {
    setPaymentForm({ amount: '', payment_method: 'cash', reference: '', notes: '' });
  };

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      addToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }
    if (amount > remaining + 0.01) {
      addToast(t('printing.paymentExceedsDue') || 'Payment exceeds remaining balance', 'error');
      return;
    }
    try {
      await api.post('/api/printing-payments/', {
        job: record.id,
        amount,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      addToast(t('sales.paymentAdded'), 'success');
      setShowPaymentModal(false);
      resetPaymentForm();
      fetchRecord();
    } catch (err) {
      console.error(err);
      addToast(t('sales.failedToAddPayment'), 'error');
    }
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setPaymentForm({
      amount: payment.amount,
      payment_method: payment.payment_method || 'cash',
      reference: payment.reference || '',
      notes: payment.notes || '',
    });
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    const amount = parseFloat(paymentForm.amount);
    if (!amount || amount <= 0) {
      addToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }
    try {
      await api.patch(`/api/printing-payments/${editingPayment.id}/`, {
        amount,
        payment_method: paymentForm.payment_method,
        reference: paymentForm.reference,
        notes: paymentForm.notes,
      });
      addToast(t('sales.paymentUpdatedSuccess'), 'success');
      setEditingPayment(null);
      resetPaymentForm();
      fetchRecord();
    } catch (err) {
      console.error(err);
      addToast(t('sales.paymentUpdateFailed'), 'error');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await api.delete(`/api/printing-payments/${paymentId}/`);
      addToast(t('sales.paymentCancelledSuccess'), 'success');
      fetchRecord();
    } catch (err) {
      console.error(err);
      addToast(t('sales.paymentCancelFailed'), 'error');
    }
  };

  const payments = useMemo(() => {
    const list = Array.isArray(record?.payments) ? [...record.payments] : [];
    return list.sort((a, b) => {
      const dateA = a.payment_date ? new Date(a.payment_date).getTime() : 0;
      const dateB = b.payment_date ? new Date(b.payment_date).getTime() : 0;
      return dateB - dateA;
    });
  }, [record?.payments]);

  const totalPaymentPages = Math.max(1, Math.ceil(payments.length / PAYMENTS_PER_PAGE));
  const paymentStartIndex = (paymentPage - 1) * PAYMENTS_PER_PAGE;
  const paginatedPayments = payments.slice(paymentStartIndex, paymentStartIndex + PAYMENTS_PER_PAGE);

  useEffect(() => {
    if (paymentPage > totalPaymentPages) {
      setPaymentPage(totalPaymentPages);
    }
  }, [paymentPage, totalPaymentPages]);

  if (loading) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  if (!record) {
    return (
      <div className="p-4">
        <button onClick={() => navigate('/printing')} className="btn-form-red text-xs flex items-center gap-1">
          <ArrowLeftIcon className="h-4 w-4" /> {t('common.back')}
        </button>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="mx-auto max-w-4xl space-y-3 p-2">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <button onClick={() => navigate('/printing')} className="btn-form-red text-xs flex items-center gap-1">
            <ArrowLeftIcon className="h-4 w-4" /> {t('common.back')}
          </button>
          <button
            type="button"
            onClick={() => navigate(`/printing/${id}/bill`)}
            className="btn-form-green text-xs flex items-center gap-1"
          >
            <PrinterIcon className="h-4 w-4" />
            {t('printing.printBill')}
          </button>
        </div>

        <div className="bg-white dark:bg-gray-800 rounded-xl shadow p-4 space-y-4">
          <div className="flex flex-wrap items-center justify-between gap-2 border-b border-gray-200 dark:border-gray-700 pb-3">
            <div>
              <h1 className="text-base font-semibold text-gray-900 dark:text-white">
                {t('printing.payments')} — #{record.id}
              </h1>
              <p className="text-xs text-gray-600 dark:text-gray-400 mt-0.5">
                {record.printer_name} · {t('printing.billNumber')}: {record.bill_number || record.id}
              </p>
            </div>
            <button
              type="button"
              onClick={() => {
                resetPaymentForm();
                setShowPaymentModal(true);
              }}
              className="flex items-center gap-1 px-3 py-2 bg-green-600 text-white rounded-lg text-xs hover:bg-green-700"
            >
              <CurrencyDollarIcon className="h-4 w-4" />
              {t('sales.addPayment')}
            </button>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 text-xs">
            <div className="rounded-lg bg-gray-50 dark:bg-gray-700/50 p-2">
              <div className="text-gray-500">{t('printing.totalPrice')}</div>
              <div className="font-bold text-gray-900 dark:text-white">AFN {parseFloat(record.total_price || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-green-50 dark:bg-green-900/20 p-2">
              <div className="text-gray-500">{t('purchases.paid')}</div>
              <div className="font-bold text-green-700 dark:text-green-300">AFN {parseFloat(record.total_paid || 0).toFixed(2)}</div>
            </div>
            <div className="rounded-lg bg-red-50 dark:bg-red-900/20 p-2">
              <div className="text-gray-500">{t('purchases.remaining')}</div>
              <div className="font-bold text-red-700 dark:text-red-300">AFN {remaining.toFixed(2)}</div>
            </div>
          </div>

          <div>
            <h3 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">{t('sales.paymentHistory')}</h3>
            {payments.length === 0 ? (
              <p className="text-xs text-gray-500">{t('sales.noPaymentsYet')}</p>
            ) : (
              <div className="space-y-2">
                <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead>
                    <tr className="bg-blue-600 text-white">
                      <th className="px-2 py-1 text-left">{t('common.date')}</th>
                      <th className="px-2 py-1 text-left">{t('sales.paymentMethod')}</th>
                      <th className="px-2 py-1 text-right">{t('sales.amount')}</th>
                      <th className="px-2 py-1 text-left">{t('printing.reference')}</th>
                      <th className="px-2 py-1 text-right">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody>
                    {paginatedPayments.map((payment) => (
                      <tr key={payment.id} className="border-b border-gray-200 dark:border-gray-700">
                        <td className="px-2 py-1">{payment.payment_date ? new Date(payment.payment_date).toLocaleDateString() : '—'}</td>
                        <td className="px-2 py-1">{paymentMethodLabel(payment.payment_method)}</td>
                        <td className="px-2 py-1 text-right font-medium">AFN {parseFloat(payment.amount || 0).toFixed(2)}</td>
                        <td className="px-2 py-1">{payment.reference || '—'}</td>
                        <td className="px-2 py-1 text-right">
                          <button
                            type="button"
                            onClick={() => handleEditPayment(payment)}
                            className="p-1 text-blue-600 hover:bg-blue-50 rounded"
                            title={t('common.edit')}
                          >
                            <PencilIcon className="h-4 w-4" />
                          </button>
                          <button
                            type="button"
                            onClick={() => handleDeletePayment(payment.id)}
                            className="p-1 text-red-600 hover:bg-red-50 rounded ml-1"
                            title={t('common.delete')}
                          >
                            <TrashIcon className="h-4 w-4" />
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
                </div>
                {payments.length > PAYMENTS_PER_PAGE && (
                  <div className="flex flex-wrap items-center justify-between gap-2 pt-1 text-xs text-gray-600 dark:text-gray-400">
                    <span>
                      {t('pagination.showing')} {paymentStartIndex + 1}-{Math.min(paymentStartIndex + PAYMENTS_PER_PAGE, payments.length)} {t('pagination.of')} {payments.length}
                    </span>
                    <div className="flex gap-1">
                      <button
                        type="button"
                        onClick={() => setPaymentPage((p) => Math.max(1, p - 1))}
                        disabled={paymentPage === 1}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                      >
                        {t('common.prev')}
                      </button>
                      {[...Array(totalPaymentPages)].map((_, i) => (
                        <button
                          key={i}
                          type="button"
                          onClick={() => setPaymentPage(i + 1)}
                          className={`px-2 py-1 rounded ${paymentPage === i + 1 ? 'bg-blue-600 text-white' : 'bg-gray-200 dark:bg-gray-700'}`}
                        >
                          {i + 1}
                        </button>
                      ))}
                      <button
                        type="button"
                        onClick={() => setPaymentPage((p) => Math.min(totalPaymentPages, p + 1))}
                        disabled={paymentPage === totalPaymentPages}
                        className="px-2 py-1 bg-gray-200 dark:bg-gray-700 rounded disabled:opacity-50"
                      >
                        {t('common.next')}
                      </button>
                    </div>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>

      {(showPaymentModal || editingPayment) && (
        <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-4">
            <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">
              {editingPayment ? t('sales.editPaymentTitle') : t('sales.addPayment')}
            </h3>
            <form onSubmit={editingPayment ? handleUpdatePayment : handleAddPayment} className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('sales.paymentMethod')}</label>
                <select
                  value={paymentForm.payment_method}
                  onChange={(e) => setPaymentForm({ ...paymentForm, payment_method: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                >
                  <option value="cash">{t('printing.cash')}</option>
                  <option value="partial">{t('printing.partial')}</option>
                  <option value="credit">{t('printing.credit')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('printing.paymentAmount')}</label>
                <input
                  type="number"
                  step="0.01"
                  min="0"
                  max={remaining > 0 ? remaining : undefined}
                  value={paymentForm.amount}
                  onChange={(e) => setPaymentForm({ ...paymentForm, amount: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                  required
                />
                {!editingPayment && remaining > 0 && (
                  <p className="text-[10px] text-gray-500 mt-1">
                    {t('purchases.remaining')}: AFN {remaining.toFixed(2)}
                  </p>
                )}
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('printing.reference')}</label>
                <input
                  type="text"
                  value={paymentForm.reference}
                  onChange={(e) => setPaymentForm({ ...paymentForm, reference: e.target.value })}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('common.notes')}</label>
                <textarea
                  value={paymentForm.notes}
                  onChange={(e) => setPaymentForm({ ...paymentForm, notes: e.target.value })}
                  rows={2}
                  className="w-full px-2 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600"
                />
              </div>
              <div className="flex gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setShowPaymentModal(false);
                    setEditingPayment(null);
                    resetPaymentForm();
                  }}
                  className="flex-1 px-3 py-2 text-sm border rounded-lg"
                >
                  {t('common.cancel')}
                </button>
                <button type="submit" className="flex-1 px-3 py-2 text-sm bg-blue-600 text-white rounded-lg hover:bg-blue-700">
                  {editingPayment ? t('common.save') : t('sales.addPayment')}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
};

export default PrintingRecordDetails;
