import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, BuildingStorefrontIcon, PencilSquareIcon, PencilIcon, TrashIcon, PrinterIcon } from '@heroicons/react/24/outline';
import PageHeader from '../../components/common/PageHeader';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const RentDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t, formatDate } = useTranslation();
  const { addToast } = useToast();
  const [shop, setShop] = useState(null);
  const [payment, setPayment] = useState({
    amount: '',
    payment_date: new Date().toISOString().split('T')[0],
    note: ''
  });
  const [editingPayment, setEditingPayment] = useState(null);
  const [editPaymentData, setEditPaymentData] = useState({ amount: '', payment_date: '', note: '' });

  const fetchShop = async () => {
    const response = await api.get(`/api/shops/${id}/`);
    setShop(response.data);
  };

  useEffect(() => {
    fetchShop();
  }, [id]);

  const handleAddPayment = async (e) => {
    e.preventDefault();
    const payload = {
      amount: String(payment.amount).trim(),
      payment_date: payment.payment_date,
      note: (payment.note || '').trim()
    };
    try {
      const { data } = await api.post(`/api/shops/${id}/add_payment/`, payload);
      if (data?.shop) {
        setShop(data.shop);
      } else {
        await fetchShop();
      }
      setPayment({
        amount: '',
        payment_date: new Date().toISOString().split('T')[0],
        note: ''
      });
      addToast(t('rent.paymentAdded') || 'Payment recorded', 'success');
    } catch (error) {
      console.error('Add payment failed:', error);
      addToast(t('rent.paymentAddError') || 'Could not add payment', 'error');
    }
  };

  if (!shop) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  const paymentRows = shop.payments || [];

  const startEditPayment = (row) => {
    setEditingPayment(row);
    setEditPaymentData({
      amount: String(row.amount || ''),
      payment_date: row.payment_date || new Date().toISOString().split('T')[0],
      note: (row.note ?? row.notes ?? '').toString()
    });
  };

  const handleUpdatePayment = async (e) => {
    e.preventDefault();
    if (!editingPayment?.id) return;
    try {
      const payload = {
        amount: String(editPaymentData.amount).trim(),
        payment_date: editPaymentData.payment_date,
        note: (editPaymentData.note || '').trim()
      };
      const { data } = await api.patch(`/api/shops/${id}/payments/${editingPayment.id}/`, payload);
      if (data?.shop) setShop(data.shop);
      else await fetchShop();
      setEditingPayment(null);
      addToast(t('rent.paymentUpdated'), 'success');
    } catch (error) {
      console.error('Update payment failed:', error);
      addToast(t('rent.paymentUpdateError'), 'error');
    }
  };

  const handleDeletePayment = async (row) => {
    if (!window.confirm(t('rent.deletePaymentConfirm'))) return;
    try {
      const { data } = await api.delete(`/api/shops/${id}/payments/${row.id}/`);
      if (data?.shop) setShop(data.shop);
      else await fetchShop();
      addToast(t('rent.paymentDeleted'), 'success');
    } catch (error) {
      console.error('Delete payment failed:', error);
      addToast(t('rent.paymentDeleteError'), 'error');
    }
  };

  const printBill = () => {
    const getPaymentMonthLabel = (dateValue) => {
      if (!dateValue) return '-';
      try {
        return new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
          year: 'numeric',
          month: 'long',
        }).format(new Date(dateValue));
      } catch {
        return formatDate(dateValue);
      }
    };
    const totalDurationLabel = `${shop.duration_count} ${shop.period_type === 'weekly' ? t('rent.weekly') : t('rent.monthly')}`;
    const billDate = formatDate(new Date());
    const rows = (shop.payments || []).map((row, idx) => `
      <tr>
        <td>${idx + 1}</td>
        <td>${row.payment_date ? formatDate(row.payment_date) : '-'}</td>
        <td>${getPaymentMonthLabel(row.payment_date)}</td>
        <td>AFN ${parseFloat(row.amount || 0).toFixed(2)}</td>
        <td>${(row.note ?? row.notes ?? '').toString() || '-'}</td>
      </tr>
    `).join('');
    const html = `
      <html>
      <head><title>${t('rent.billTitle')}</title>
      <style>
      body{font-family:Arial,sans-serif;margin:0;background:#fff}
      .bill{width:210mm;min-height:297mm;margin:0 auto}
      .header{display:flex;height:100px}
      .b{background:#0047AB;color:#fff}
      .y{background:#FFD700}
      .w{background:#fff;position:relative}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#0047AB;color:#fff}
      .sec{padding:15px 20px}
      .foot{background:#FFD700;padding:10px 20px;margin-top:20px;display:flex;justify-content:space-between;align-items:center}
      </style></head>
      <body>
        <div class="bill">
          <div class="header">
            <div class="b" style="width:35%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold">${t('rent.billTitle')}</div>
            <div class="y" style="width:40%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:bold" dir="rtl">بیرق سازی افغان</div>
            <div class="w" style="width:25%;display:flex;align-items:center;justify-content:center">
              <div style="position:absolute;left:0;top:30%;transform:translateY(-50%);background:#0047AB;color:#fff;padding:8px 16px;font-weight:bold;clip-path:polygon(0 0,100% 0,85% 50%,100% 100%,0 100%)">${t('rent.shopNo')}</div>
              <div style="position:absolute;bottom:10px;right:10px;color:#0047AB;font-weight:bold">#${shop.shop_no}</div>
            </div>
          </div>
          <div class="sec" dir="rtl">
            <div style="border-bottom:1px dotted #999;padding-bottom:4px;margin-bottom:6px"><strong>${t('common.date')}:</strong> ${billDate || '-'}</div>
            <div style="border-bottom:1px dotted #999;padding-bottom:4px;margin-bottom:6px"><strong>${t('rent.tenant')}:</strong> ${shop.tenant_name}</div>
            <div style="border-bottom:1px dotted #999;padding-bottom:4px;margin-bottom:6px"><strong>${t('rent.ownerName')}:</strong> ${shop.owner_name || '-'}</div>
            <div style="display:flex;gap:24px">
              <div><strong>${t('rent.rentAmount')}:</strong> AFN ${parseFloat(shop.rent_amount || 0).toFixed(2)}</div>
              <div><strong>${t('rent.duration')}:</strong> ${totalDurationLabel}</div>
              <div><strong>${t('rent.totalPaid')}:</strong> AFN ${parseFloat(shop.total_paid || 0).toFixed(2)}</div>
              <div><strong>${t('rent.totalDue')}:</strong> AFN ${parseFloat(shop.total_due || 0).toFixed(2)}</div>
            </div>
          </div>
          <div class="sec">
            <h4 style="margin:0 0 8px 0">${t('rent.paymentHistory')}</h4>
            <table>
              <thead><tr><th>#</th><th>${t('rent.paymentDate')}</th><th>${t('reportsPage.month') || 'Month'}</th><th>${t('rent.amountPaid')}</th><th>${t('common.notes')}</th></tr></thead>
              <tbody>${rows || '<tr><td colspan="5">-</td></tr>'}</tbody>
            </table>
          </div>
          <div class="foot">
            <div style="font-size:12px">📞 0744841167, 0704737305, 0730117373</div>
            <div style="background:#0047AB;color:#fff;padding:6px 16px;font-size:11px;clip-path:polygon(15% 0,100% 0,100% 100%,15% 100%,0 50%)" dir="rtl">آدرس: چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید</div>
          </div>
        </div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  const printThermalSlip = (row) => {
    const getPaymentMonthLabel = (dateValue) => {
      if (!dateValue) return '-';
      try {
        return new Intl.DateTimeFormat('fa-AF-u-ca-persian', {
          year: 'numeric',
          month: 'long',
        }).format(new Date(dateValue));
      } catch {
        return formatDate(dateValue);
      }
    };
    const selectedAmount = parseFloat(row?.amount || 0);
    const slipDate = row.payment_date ? formatDate(row.payment_date) : '-';
    const paidMonth = getPaymentMonthLabel(row.payment_date);
    const totalDurationLabel = `${shop.duration_count} ${shop.period_type === 'weekly' ? t('rent.weekly') : t('rent.monthly')}`;
    const html = `
      <html>
      <head><title>${t('rent.billTitle')}</title>
      <style>
      body{font-family:Arial,sans-serif;margin:0;background:#fff}
      .bill{width:210mm;min-height:297mm;margin:0 auto}
      .header{display:flex;height:100px}
      .b{background:#0047AB;color:#fff}
      .y{background:#FFD700}
      .w{background:#fff;position:relative}
      .sec{padding:15px 20px}
      table{width:100%;border-collapse:collapse;margin-top:10px}
      th,td{border:1px solid #ddd;padding:8px}
      th{background:#0047AB;color:#fff}
      .foot{background:#FFD700;padding:10px 20px;margin-top:20px;display:flex;justify-content:space-between;align-items:center}
      </style></head>
      <body>
        <div class="bill">
          <div class="header">
            <div class="b" style="width:35%;display:flex;align-items:center;justify-content:center;font-size:20px;font-weight:bold">${t('rent.billTitle')}</div>
            <div class="y" style="width:40%;display:flex;align-items:center;justify-content:center;font-size:26px;font-weight:bold" dir="rtl">بیرق سازی افغان</div>
            <div class="w" style="width:25%;display:flex;align-items:center;justify-content:center">
              <div style="position:absolute;left:0;top:30%;transform:translateY(-50%);background:#0047AB;color:#fff;padding:8px 16px;font-weight:bold;clip-path:polygon(0 0,100% 0,85% 50%,100% 100%,0 100%)">${t('rent.shopNo')}</div>
              <div style="position:absolute;bottom:10px;right:10px;color:#0047AB;font-weight:bold">#${shop.shop_no}</div>
            </div>
          </div>
          <div class="sec" dir="rtl">
            <div style="border-bottom:1px dotted #999;padding-bottom:4px;margin-bottom:6px"><strong>${t('rent.tenant')}:</strong> ${shop.tenant_name}</div>
            <div style="border-bottom:1px dotted #999;padding-bottom:4px;margin-bottom:6px"><strong>${t('rent.ownerName')}:</strong> ${shop.owner_name || '-'}</div>
            <div style="display:flex;gap:24px;flex-wrap:wrap">
              <div><strong>${t('rent.paymentDate')}:</strong> ${slipDate}</div>
              <div><strong>${t('reportsPage.month') || 'Month'}:</strong> ${paidMonth}</div>
              <div><strong>${t('rent.duration')}:</strong> ${totalDurationLabel}</div>
              <div><strong>${t('rent.amountPaid')}:</strong> AFN ${selectedAmount.toFixed(2)}</div>
              <div><strong>${t('rent.totalDue')}:</strong> AFN ${parseFloat(shop.total_due || 0).toFixed(2)}</div>
            </div>
          </div>
          <div class="sec">
            <h4 style="margin:0 0 8px 0">${t('rent.paymentHistory')}</h4>
            <table>
              <thead>
                <tr>
                  <th>#</th>
                  <th>${t('rent.paymentDate')}</th>
                  <th>${t('reportsPage.month') || 'Month'}</th>
                  <th>${t('rent.amountPaid')}</th>
                  <th>${t('common.notes')}</th>
                </tr>
              </thead>
              <tbody>
                <tr>
                  <td>1</td>
                  <td>${slipDate}</td>
                  <td>${paidMonth}</td>
                  <td>AFN ${selectedAmount.toFixed(2)}</td>
                  <td>${(row.note ?? row.notes ?? '').toString() || '-'}</td>
                </tr>
              </tbody>
            </table>
          </div>
          <div class="foot">
            <div style="font-size:12px">📞 0744841167, 0704737305, 0730117373</div>
            <div style="background:#0047AB;color:#fff;padding:6px 16px;font-size:11px;clip-path:polygon(15% 0,100% 0,100% 100%,15% 100%,0 50%)" dir="rtl">آدرس: چهارراهی صدارت، سرک وزارت داخله سابقه، مارکیت مطابع صنعتی جاوید</div>
          </div>
        </div>
      </body></html>`;
    const w = window.open('', '_blank');
    if (!w) return;
    w.document.write(html);
    w.document.close();
    w.focus();
    w.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 p-3 space-y-3">
        <PageHeader
          title={`${t('rent.shop')} ${shop.shop_no}`}
          subtitle={shop.tenant_name}
          icon={BuildingStorefrontIcon}
          actions={
            <div className="flex flex-wrap items-center gap-2">
              <button type="button" onClick={printBill} className="btn-form-green flex items-center gap-1">
                <PrinterIcon className="h-3.5 w-3.5" />
                {t('rent.printBill')}
              </button>
              <button
                type="button"
                onClick={() => navigate(`/rent/${id}/edit`)}
                className="btn-form-green flex items-center gap-1"
              >
                <PencilSquareIcon className="h-3.5 w-3.5" />
                {t('common.edit')}
              </button>
              <button
                type="button"
                onClick={() => navigate('/rent')}
                className="btn-form-red flex items-center gap-1"
              >
                <ArrowLeftIcon className="h-3.5 w-3.5" />
                {t('rent.title')}
              </button>
            </div>
          }
        />

        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5 border border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('rent.ownerName')}</p>
            <p className="text-sm font-semibold text-gray-900 dark:text-white">{shop.owner_name?.trim() || '—'}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5 border border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('rent.rentDate')}</p>
            <p className="text-sm font-semibold">{formatDate(shop.rent_date)}</p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5 border border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('rent.duration')}</p>
            <p className="text-sm font-semibold">
              {shop.duration_count} {shop.period_type}
            </p>
          </div>
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-2.5 border border-gray-100 dark:border-gray-700">
            <p className="text-[11px] text-gray-500 dark:text-gray-400">{t('rent.rentAmount')}</p>
            <p className="text-sm font-semibold">AFN {parseFloat(shop.rent_amount || 0).toFixed(2)}</p>
          </div>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
          <div className="bg-green-50 dark:bg-green-900/20 rounded-lg p-2.5">
            <p className="text-[11px] text-green-700 dark:text-green-300">{t('rent.totalPaid')}</p>
            <p className="text-sm font-bold">AFN {parseFloat(shop.total_paid || 0).toFixed(2)}</p>
          </div>
          <div className="bg-blue-50 dark:bg-blue-900/20 rounded-lg p-2.5">
            <p className="text-[11px] text-blue-700 dark:text-blue-300">{t('rent.totalDue')}</p>
            <p className="text-sm font-bold">AFN {parseFloat(shop.total_due || 0).toFixed(2)}</p>
          </div>
          <div className="bg-red-50 dark:bg-red-900/20 rounded-lg p-2.5">
            <p className="text-[11px] text-red-700 dark:text-red-300">{t('rent.remainingPeriods')}</p>
            <p className="text-sm font-bold">{shop.remaining_periods}</p>
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <button
            type="button"
            onClick={() => navigate('/rent')}
            className="btn-form-red flex items-center gap-1 text-sm"
          >
            <ArrowLeftIcon className="h-4 w-4" />
            {t('rent.backToList')}
          </button>
        </div>

        <form onSubmit={handleAddPayment} className="bg-white dark:bg-gray-800 rounded-lg shadow p-3 space-y-2 border border-gray-100 dark:border-gray-700">
          <h3 className="text-sm font-semibold">{t('rent.addPayment')}</h3>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <input
              type="number"
              min="0"
              step="0.01"
              required
              className="px-2.5 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('rent.amountPaid')}
              value={payment.amount}
              onChange={(e) => setPayment({ ...payment, amount: e.target.value })}
            />
            <LocalizedDateInput
              required
              className="px-2.5 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              value={payment.payment_date}
              onChange={(dateValue) => setPayment({ ...payment, payment_date: dateValue })}
            />
            <input
              className="px-2.5 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
              placeholder={t('common.notesPlaceholder')}
              value={payment.note}
              onChange={(e) => setPayment({ ...payment, note: e.target.value })}
              aria-label={t('common.notes')}
            />
          </div>
          <button type="submit" className="btn-form-green text-sm">
            {t('rent.addPayment')}
          </button>
        </form>

        <div className="bg-white dark:bg-gray-800 rounded-lg shadow overflow-hidden border border-gray-200 dark:border-gray-700">
          <div className="overflow-x-auto">
            <table className="w-full">
              <thead className="bg-blue-600">
                <tr>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.paymentDate')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('rent.amountPaid')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('common.notes')}</th>
                  <th className="px-3 py-2 text-left text-xs font-semibold text-white">{t('common.actions')}</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                {paymentRows.length === 0 ? (
                  <tr>
                    <td colSpan={4} className="px-3 py-4 text-center text-xs text-gray-500 dark:text-gray-400">
                      {t('common.noRecordsFound')}
                    </td>
                  </tr>
                ) : (
                  paymentRows.map((row) => (
                    <tr key={row.id}>
                      <td className="px-3 py-2 text-xs">{formatDate(row.payment_date)}</td>
                      <td className="px-3 py-2 text-xs">AFN {parseFloat(row.amount || 0).toFixed(2)}</td>
                      <td className="px-3 py-2 text-xs text-gray-800 dark:text-gray-200">
                        {(row.note ?? row.notes ?? '').toString().trim() || '—'}
                      </td>
                      <td className="px-3 py-2 text-xs">
                        <div className="flex items-center gap-1">
                          <button type="button" onClick={() => printThermalSlip(row)} className="p-1 text-indigo-600 hover:bg-indigo-50 rounded" title={t('rent.printSlip')}>
                            <PrinterIcon className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => startEditPayment(row)} className="p-1 text-blue-600 hover:bg-blue-50 rounded" title={t('common.edit')}>
                            <PencilIcon className="h-3.5 w-3.5" />
                          </button>
                          <button type="button" onClick={() => handleDeletePayment(row)} className="p-1 text-red-600 hover:bg-red-50 rounded" title={t('common.delete')}>
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
        </div>

        {editingPayment && (
          <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50 p-4">
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl p-4 w-full max-w-md">
              <h3 className="text-sm font-semibold mb-3">{t('rent.editPayment')}</h3>
              <form onSubmit={handleUpdatePayment} className="space-y-2">
                <input
                  type="number"
                  min="0"
                  step="0.01"
                  value={editPaymentData.amount}
                  onChange={(e) => setEditPaymentData((p) => ({ ...p, amount: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <LocalizedDateInput
                  value={editPaymentData.payment_date}
                  onChange={(dateValue) => setEditPaymentData((p) => ({ ...p, payment_date: dateValue }))}
                  className="w-full px-2.5 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  required
                />
                <input
                  value={editPaymentData.note}
                  onChange={(e) => setEditPaymentData((p) => ({ ...p, note: e.target.value }))}
                  className="w-full px-2.5 py-1.5 text-sm border rounded-lg dark:bg-gray-700 dark:border-gray-600 dark:text-white"
                  placeholder={t('common.notesPlaceholder')}
                />
                <div className="flex gap-2 pt-1">
                  <button type="button" onClick={() => setEditingPayment(null)} className="btn-form-red flex-1">{t('common.cancel')}</button>
                  <button type="submit" className="btn-form-green flex-1">{t('common.save')}</button>
                </div>
              </form>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default RentDetails;
