import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ShoppingBagIcon, PlusIcon, PrinterIcon, TrashIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PrintableDirectSaleBill from '../../components/sales/PrintableDirectSaleBill';
import { useTranslation } from '../../i18n/fallback';

const DirectSaleDetails = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const [sale, setSale] = useState(null);
  const [loading, setLoading] = useState(true);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [showPrintBill, setShowPrintBill] = useState(false);
  const [paymentAmount, setPaymentAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState('cash');
  const [paymentNotes, setPaymentNotes] = useState('');
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentForm, setEditPaymentForm] = useState({ amount: '', method: '' });
  const [showDeleteSaleConfirm, setShowDeleteSaleConfirm] = useState(false);

  useEffect(() => {
    fetchSaleDetails();
  }, [id]);

  const fetchSaleDetails = async () => {
    try {
      const response = await api.get(`/api/direct-sales/${id}/`);
      setSale(response.data);
    } catch (error) {
      console.error('Error fetching sale details:', error);
      addToast(t('directSales.failedToLoad'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleAddPayment = async () => {
    try {
      await api.post(`/api/direct-sales/${id}/add_payment/`, {
        amount_paid: parseFloat(paymentAmount),
        payment_method: paymentMethod,
        notes: paymentNotes
      });
      addToast(t('directSales.paymentAdded'), 'success');
      setShowPaymentModal(false);
      setPaymentAmount('');
      setPaymentNotes('');
      fetchSaleDetails();
    } catch (error) {
      addToast(t('directSales.failedToAddPayment'), 'error');
    }
  };

  const handlePrint = () => {
    setShowPrintBill(true);
  };

  const handleEditPayment = (payment) => {
    setEditingPayment(payment);
    setEditPaymentForm({
      amount: String(payment.amount_paid),
      method: payment.payment_method || 'cash'
    });
  };

  const handleUpdatePayment = async () => {
    const amount = parseFloat(editPaymentForm.amount);
    if (!amount || amount <= 0) {
      addToast(t('sales.invalidPaymentAmount'), 'error');
      return;
    }
    try {
      await api.patch(`/api/direct-sale-payments/${editingPayment.id}/`, {
        amount_paid: amount,
        payment_method: editPaymentForm.method
      });
      addToast(t('sales.paymentUpdatedSuccess'), 'success');
      setEditingPayment(null);
      setEditPaymentForm({ amount: '', method: '' });
      fetchSaleDetails();
    } catch (err) {
      console.error('Error updating direct sale payment:', err);
      addToast(t('sales.paymentUpdateFailed'), 'error');
    }
  };

  const handleDeletePayment = async (paymentId) => {
    try {
      await api.delete(`/api/direct-sale-payments/${paymentId}/`);
      addToast(t('sales.paymentCancelledSuccess'), 'success');
      fetchSaleDetails();
    } catch (err) {
      console.error('Error deleting direct sale payment:', err);
      addToast(t('sales.paymentCancelFailed'), 'error');
    }
  };

  const handleDeleteDirectSale = async () => {
    try {
      await api.delete(`/api/direct-sales/${id}/`);
      addToast(t('directSales.deletedSuccess'), 'success');
      navigate('/sales/direct');
    } catch (err) {
      console.error('Error deleting direct sale:', err);
      const msg = err.response?.data?.error || err.response?.data?.detail || t('directSales.deleteFailed');
      addToast(msg, 'error');
    } finally {
      setShowDeleteSaleConfirm(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2 flex items-center justify-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
      </div>
    );
  }

  if (!sale) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
        <div className="text-center py-8">
          <p className="text-gray-600 dark:text-gray-400">{t('directSales.saleNotFound')}</p>
          <button onClick={() => navigate('/sales/direct')} className="mt-4 text-blue-600 hover:text-blue-800">
            {t('directSales.backToDirectSales')}
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-3 p-3">
          <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md border border-blue-100 dark:border-gray-700 flex items-center justify-between">
            <div className="flex items-center gap-2">
              <button onClick={() => navigate('/sales/direct')} className="p-1.5 text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white rounded-lg transition-colors">
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <ShoppingBagIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
              <div>
                <h1 className="text-lg font-bold text-gray-900 dark:text-white">{t('directSales.directSale')} #{sale.id}</h1>
                <p className="text-xs text-gray-600 dark:text-gray-400">{sale.customer_name_display}</p>
              </div>
            </div>
            <div className="flex gap-2 flex-wrap">
              <button onClick={handlePrint} className="px-3 py-1.5 bg-blue-600 hover:bg-blue-700 text-white rounded-lg text-xs flex items-center gap-1">
                <PrinterIcon className="h-4 w-4" />
                {t('directSales.print')}
              </button>
              <button onClick={() => navigate(`/sales/direct/${id}/edit`)} className="px-3 py-1.5 bg-green-600 hover:bg-green-700 text-white rounded-lg text-xs flex items-center gap-1">
                <PlusIcon className="h-4 w-4" />
                {t('directSales.editAndAddItems')}
              </button>
              <button
                type="button"
                onClick={() => setShowDeleteSaleConfirm(true)}
                className="px-3 py-1.5 bg-red-600 hover:bg-red-700 text-white rounded-lg text-xs flex items-center gap-1"
              >
                <TrashIcon className="h-4 w-4" />
                {t('common.delete')}
              </button>
              {sale.payment_status !== 'Paid' && (
                <button onClick={() => setShowPaymentModal(true)} className="px-3 py-1.5 bg-purple-600 hover:bg-purple-700 text-white rounded-lg text-xs flex items-center gap-1">
                  <PlusIcon className="h-4 w-4" />
                  {t('directSales.addPayment')}
                </button>
              )}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('directSales.saleInformation')}</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('directSales.status')}:</span>
                  <span className="font-medium">{sale.status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('directSales.paymentStatus')}:</span>
                  <span className="font-medium">{sale.payment_status}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('directSales.date')}:</span>
                  <span className="font-medium">{formatDate(sale.sale_date)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('directSales.financialSummary')}</h2>
              <div className="space-y-2 text-xs">
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('directSales.totalAmount')}:</span>
                  <span className="font-medium">AFN {parseFloat(sale.total_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('directSales.cost')}:</span>
                  <span className="font-medium text-orange-600">AFN {parseFloat(sale.cost_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('directSales.discount')}:</span>
                  <span className="font-medium text-red-600">AFN {parseFloat(sale.discount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between border-t pt-2">
                  <span className="font-semibold">{t('directSales.netAmount')}:</span>
                  <span className="font-bold text-blue-600">AFN {parseFloat(sale.net_amount).toFixed(2)}</span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.totalsPaid')}:</span>
                  <span className="font-medium text-green-700 dark:text-green-400">
                    AFN {parseFloat(sale.total_paid ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between">
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.totalsDue')}:</span>
                  <span className="font-medium text-red-600 dark:text-red-400">
                    AFN {parseFloat(sale.due ?? 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between bg-green-50 dark:bg-green-900/20 p-2 rounded">
                  <span className="font-semibold text-green-700 dark:text-green-400">{t('directSales.profit')}:</span>
                  <span className="font-bold text-green-700 dark:text-green-400">AFN {parseFloat(sale.profit).toFixed(2)}</span>
                </div>
              </div>
            </div>
          </div>

          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('directSales.items')}</h2>
            <div className="space-y-2">
              {sale.items && sale.items.map((item, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-2 bg-gray-50 dark:bg-gray-700/50">
                  <div className="flex justify-between items-start">
                    <div>
                      <p className="font-medium text-sm">{item.item_name}</p>
                      {(item.flag_size || item.quality_design_type) && (
                        <p className="text-xs text-gray-500">
                          {item.flag_size ? `${t('directSales.size')}: ${item.flag_size}` : ''} {item.quality_design_type ? `| ${t('directSales.design')}: ${item.quality_design_type}` : ''}
                        </p>
                      )}
                      {item.supplier_name && (
                        <p className="text-xs text-gray-500">{t('directSales.supplier')}: {item.supplier_name}</p>
                      )}
                    </div>
                    <div className="text-right text-xs">
                      <p>{t('directSales.qty')}: {item.quantity}</p>
                      <p>{t('directSales.price')}: AFN {parseFloat(item.price_per_unit).toFixed(2)}</p>
                      <p>{t('directSales.cost')}: AFN {parseFloat(item.cost_per_unit).toFixed(2)}</p>
                      <p className="font-semibold text-blue-600">{t('directSales.total')}: AFN {parseFloat(item.total).toFixed(2)}</p>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {sale.notes && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('directSales.notes')}</h2>
              <p className="text-xs text-gray-600 dark:text-gray-400">{sale.notes}</p>
            </div>
          )}

          {sale.payments && sale.payments.length > 0 && (
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('directSales.payments')}</h2>
              <div className="space-y-2">
                {sale.payments.map((payment, index) => (
                  <div key={payment.id || index} className="flex justify-between items-center border-b pb-2 text-xs gap-2">
                    <div className="flex-1 min-w-0">
                      <p className="font-medium">AFN {parseFloat(payment.amount_paid).toFixed(2)}</p>
                      <p className="text-gray-500">{payment.payment_method} - {formatDate(payment.payment_date)}</p>
                      {payment.notes && <p className="text-gray-500">{payment.notes}</p>}
                    </div>
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        onClick={() => handleEditPayment(payment)}
                        className="text-blue-600 hover:text-blue-800 text-xs"
                      >
                        {t('common.edit')}
                      </button>
                      <button
                        type="button"
                        onClick={() => handleDeletePayment(payment.id)}
                        className="text-red-600 hover:text-red-800 text-xs"
                      >
                        {t('common.remove')}
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      </div>

      {showDeleteSaleConfirm && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-md w-full p-4">
            <h3 className="text-lg font-semibold text-gray-900 dark:text-white mb-2">{t('directSales.deleteDirectSaleTitle')}</h3>
            <p className="text-sm text-gray-600 dark:text-gray-400 mb-4">{t('directSales.deleteDirectSaleMessage')}</p>
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => setShowDeleteSaleConfirm(false)}
                className="px-4 py-2 bg-gray-200 dark:bg-gray-600 rounded-lg text-sm"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleDeleteDirectSale}
                className="px-4 py-2 bg-red-600 text-white rounded-lg text-sm hover:bg-red-700"
              >
                {t('common.delete')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 rounded-lg p-4 max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-3">{t('directSales.addPayment')}</h3>
            <div className="space-y-3">
              <div>
                <label className="block text-xs font-medium mb-1">{t('directSales.amount')} *</label>
                <input
                  type="number"
                  step="0.01"
                  value={paymentAmount}
                  onChange={(e) => setPaymentAmount(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('directSales.paymentMethod')}</label>
                <select
                  value={paymentMethod}
                  onChange={(e) => setPaymentMethod(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                >
                  <option value="cash">{t('orders.payMethodCash')}</option>
                  <option value="credit">{t('orders.payMethodCredit')}</option>
                  <option value="partial">{t('orders.payMethodPartial')}</option>
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium mb-1">{t('directSales.notes')}</label>
                <textarea
                  value={paymentNotes}
                  onChange={(e) => setPaymentNotes(e.target.value)}
                  className="w-full px-3 py-2 border rounded-lg"
                  rows="2"
                />
              </div>
              <div className="flex gap-2 justify-end">
                <button
                  onClick={() => setShowPaymentModal(false)}
                  className="px-4 py-2 bg-gray-200 rounded-lg text-sm"
                >
                  {t('directSales.cancel')}
                </button>
                <button
                  onClick={handleAddPayment}
                  className="px-4 py-2 bg-blue-600 text-white rounded-lg text-sm"
                >
                  {t('directSales.addPayment')}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {editingPayment && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
          <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
            <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('sales.editPaymentTitle')}</h3>
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sales.editPaymentAmountLabel')}</label>
                <input
                  type="number"
                  step="0.01"
                  value={editPaymentForm.amount}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, amount: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('sales.paymentMethod')}</label>
                <select
                  value={editPaymentForm.method}
                  onChange={(e) => setEditPaymentForm({ ...editPaymentForm, method: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                >
                  <option value="cash">{t('orders.payMethodCash')}</option>
                  <option value="credit">{t('orders.payMethodCredit')}</option>
                  <option value="partial">{t('orders.payMethodPartial')}</option>
                </select>
              </div>
            </div>
            <div className="flex gap-3 mt-6">
              <button
                type="button"
                onClick={() => {
                  setEditingPayment(null);
                  setEditPaymentForm({ amount: '', method: '' });
                }}
                className="flex-1 px-4 py-2 border border-gray-300 dark:border-gray-600 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                {t('common.cancel')}
              </button>
              <button
                type="button"
                onClick={handleUpdatePayment}
                className="flex-1 px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
              >
                {t('common.save')}
              </button>
            </div>
          </div>
        </div>
      )}

      {showPrintBill && sale && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-4xl w-full max-h-[90vh] overflow-y-auto">
            <div className="sticky top-0 bg-white dark:bg-gray-800 px-6 py-4 border-b border-gray-200 dark:border-gray-700 flex justify-between items-center">
              <h3 className="text-lg font-semibold text-gray-900 dark:text-white">{t('directSales.printDirectSaleBill')}</h3>
              <button
                onClick={() => setShowPrintBill(false)}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <ArrowLeftIcon className="h-6 w-6" />
              </button>
            </div>
            <div className="p-6">
              <PrintableDirectSaleBill sale={sale} />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default DirectSaleDetails;
