import React, { useEffect, useMemo, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, PlusIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useToast } from '../../context/ToastContext';
import { normalizeNumeralString, parseLocaleFloat } from '../../utils/numerals';

const EMPTY_LINE = {
  flag_name: '',
  size: '',
  qty: '',
  making_unit_price: '',
  selling_unit_price: '',
  total_meters: '',
  per_meter_price: '',
};

const parseSizeToMetersPerUnit = (sizeValue) => {
  const raw = String(sizeValue || '').trim();
  if (!raw) return NaN;
  const parts = raw.split(/[\sxX*×]+/).map((p) => parseLocaleFloat(p)).filter((n) => !Number.isNaN(n) && n > 0);
  if (!parts.length) return NaN;
  if (parts.length >= 2) {
    const area = parts.reduce((acc, n) => acc * n, 1);
    const looksLikeCentimeters = parts.some((n) => n > 10);
    return looksLikeCentimeters ? area / 10000 : area;
  }
  return parts[0] > 10 ? parts[0] / 100 : parts[0];
};

const PrintingFormPage = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  const [suppliers, setSuppliers] = useState([]);
  const [useNewPrinter, setUseNewPrinter] = useState(false);
  const [loading, setLoading] = useState(false);
  const [formData, setFormData] = useState({
    printer: '',
    new_name: '',
    new_phone: '',
    new_address: '',
    bill_number: '',
    payment_method: 'cash',
    payment_amount: '',
    reference: '',
    notes: '',
    lines: [{ ...EMPTY_LINE }],
  });

  useEffect(() => {
    fetchSuppliers();
    if (isEdit) fetchJob();
  }, [id, isEdit]);

  const fetchSuppliers = async () => {
    const res = await api.get('/api/printing-printers/');
    setSuppliers(Array.isArray(res.data) ? res.data : res.data.results || []);
  };

  const fetchJob = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/printing-jobs/${id}/`);
      const job = res.data;
      setFormData({
        printer: String(job.printer || ''),
        new_name: '',
        new_phone: '',
        new_address: '',
        bill_number: job.bill_number || '',
        payment_method: 'cash',
        payment_amount: '',
        reference: '',
        notes: job.notes || '',
        lines: (job.items || []).map((it) => ({
          flag_name: it.flag_name || '',
          size: it.size || '',
          qty: String(it.qty ?? ''),
          making_unit_price: String(it.making_unit_price ?? it.making_price ?? ''),
          selling_unit_price: String(it.selling_unit_price ?? it.selling_price ?? ''),
          total_meters: String(it.total_meters ?? ''),
          per_meter_price: String(it.per_meter_price ?? ''),
        })),
      });
    } finally {
      setLoading(false);
    }
  };

  const addLine = () => setFormData((p) => ({ ...p, lines: [...p.lines, { ...EMPTY_LINE }] }));
  const removeLine = (idx) =>
    setFormData((p) => ({
      ...p,
      lines: p.lines.filter((_, i) => i !== idx).length ? p.lines.filter((_, i) => i !== idx) : [{ ...EMPTY_LINE }],
    }));

  const updateLine = (idx, key, value) => {
    setFormData((p) => {
      const next = [...p.lines];
      const current = { ...next[idx], [key]: value };
      if (key === 'size' || key === 'qty') {
        const qty = parseLocaleFloat(current.qty);
        const metersPerUnit = parseSizeToMetersPerUnit(current.size);
        if (!Number.isNaN(qty) && !Number.isNaN(metersPerUnit)) {
          current.total_meters = (qty * metersPerUnit).toFixed(2);
        } else if (!current.total_meters || key === 'qty') {
          current.total_meters = '';
        }
      }
      next[idx] = current;
      return { ...p, lines: next };
    });
  };

  const calcLineSubtotal = (line) => {
    const qty = parseLocaleFloat(line.qty);
    const selling = parseLocaleFloat(line.selling_unit_price);
    const meters = parseLocaleFloat(line.total_meters);
    const perMeter = parseLocaleFloat(line.per_meter_price);
    if (!Number.isNaN(selling) && selling > 0 && !Number.isNaN(qty) && qty > 0) {
      return qty * selling;
    }
    if (!Number.isNaN(meters) && !Number.isNaN(perMeter)) {
      return meters * perMeter;
    }
    return 0;
  };

  const calcLineProfit = (line) => {
    const qty = parseLocaleFloat(line.qty);
    const making = parseLocaleFloat(line.making_unit_price);
    const selling = parseLocaleFloat(line.selling_unit_price);
    if (Number.isNaN(qty) || qty <= 0) return 0;
    if (!Number.isNaN(selling) && selling > 0 && !Number.isNaN(making)) {
      return qty * (selling - making);
    }
    const sub = calcLineSubtotal(line);
    if (!Number.isNaN(making) && making >= 0) {
      return sub - qty * making;
    }
    return 0;
  };

  const grandSellingTotal = useMemo(
    () => formData.lines.reduce((sum, line) => sum + calcLineSubtotal(line), 0),
    [formData.lines]
  );
  const grandProfit = useMemo(
    () => formData.lines.reduce((sum, line) => sum + calcLineProfit(line), 0),
    [formData.lines]
  );

  const handleSubmit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      let printerId = formData.printer;
      if (useNewPrinter) {
        const created = await api.post('/api/printing-printers/', {
          name: formData.new_name.trim(),
          phone: formData.new_phone.trim(),
          address: formData.new_address.trim(),
        });
        printerId = created.data.id;
      }

      const payload = {
        printer: parseInt(printerId, 10),
        bill_number: formData.bill_number,
        job_title: formData.lines.length === 1 ? formData.lines[0].flag_name : `${t('printing.jobTitle')} (${formData.lines.length})`,
        notes: formData.notes,
        items: formData.lines.map((line) => ({
          flag_name: line.flag_name,
          size: line.size,
          qty: String(parseLocaleFloat(line.qty) || 0),
          making_unit_price: String(parseLocaleFloat(line.making_unit_price) || 0),
          selling_unit_price: String(parseLocaleFloat(line.selling_unit_price) || 0),
          total_meters: String(parseLocaleFloat(line.total_meters) || 0),
          per_meter_price: String(parseLocaleFloat(line.per_meter_price) || 0),
          line_total: String(calcLineSubtotal(line).toFixed(2)),
        })),
      };

      if (isEdit) {
        await api.put(`/api/printing-jobs/${id}/`, payload);
      } else {
        const createdJob = await api.post('/api/printing-jobs/', payload);
        if (formData.payment_method === 'cash') {
          await api.post('/api/printing-payments/', {
            job: createdJob.data.id,
            amount: grandSellingTotal,
            payment_method: 'cash',
            reference: formData.reference,
          });
        } else if (formData.payment_method === 'partial' && (parseLocaleFloat(formData.payment_amount) || 0) > 0) {
          await api.post('/api/printing-payments/', {
            job: createdJob.data.id,
            amount: parseLocaleFloat(formData.payment_amount),
            payment_method: 'partial',
            reference: formData.reference,
          });
        }
      }
      addToast(t('common.save') || 'Saved', 'success');
      navigate('/printing');
    } catch (err) {
      console.error(err);
      addToast(t('printing.failedSave'), 'error');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="mx-2 bg-white dark:bg-gray-800 rounded-xl p-3 shadow space-y-3">
        <div className="flex items-center justify-between">
          <h1 className="text-sm font-semibold">{isEdit ? t('common.edit') : t('printing.createRecord')}</h1>
          <button onClick={() => navigate('/printing')} className="btn-form-red text-xs flex items-center gap-1">
            <ArrowLeftIcon className="h-4 w-4" />
            {t('common.back')}
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="flex items-center gap-2">
            <button type="button" className={`${!useNewPrinter ? 'btn-form-green' : 'btn-form-red'} text-xs`} onClick={() => setUseNewPrinter(false)}>
              {t('printing.selectPrinter')}
            </button>
            <button type="button" className={`${useNewPrinter ? 'btn-form-green' : 'btn-form-red'} text-xs`} onClick={() => setUseNewPrinter(true)}>
              {t('printing.newPrinter')}
            </button>
          </div>

          {!useNewPrinter ? (
            <select
              value={formData.printer}
              onChange={(e) => setFormData((p) => ({ ...p, printer: e.target.value }))}
              className="w-full max-w-md px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white focus:outline-none focus:ring-2 focus:ring-blue-500"
            >
              <option value="">{t('printing.selectPrinter')}</option>
              {suppliers.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.name} - {s.phone || '-'}
                </option>
              ))}
            </select>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
              <input
                value={formData.new_name}
                onChange={(e) => setFormData((p) => ({ ...p, new_name: e.target.value }))}
                placeholder={t('printing.printerName')}
                className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required
              />
              <input
                value={formData.new_phone}
                onChange={(e) => setFormData((p) => ({ ...p, new_phone: e.target.value }))}
                placeholder={t('printing.printerPhone')}
                className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
              <input
                value={formData.new_address}
                onChange={(e) => setFormData((p) => ({ ...p, new_address: e.target.value }))}
                placeholder={t('printing.printerAddress')}
                className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            </div>
          )}

          <div className="text-[10px] font-semibold text-gray-600 dark:text-gray-400 uppercase tracking-wide">
            {t('printing.lineItemsHeading')}
          </div>

          <div className="space-y-2">
            {formData.lines.map((line, idx) => (
              <div key={idx} className="border border-gray-200 dark:border-gray-700 p-2 rounded-lg space-y-2">
                <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-2">
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-0.5">{t('printing.flagName')}</label>
                    <input
                      value={line.flag_name}
                      onChange={(e) => updateLine(idx, 'flag_name', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-0.5">{t('printing.size')}</label>
                    <input
                      value={line.size}
                      onChange={(e) => updateLine(idx, 'size', e.target.value)}
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-0.5">{t('printing.qty')}</label>
                    <input
                      value={line.qty}
                      onChange={(e) => updateLine(idx, 'qty', normalizeNumeralString(e.target.value))}
                      type="text"
                      inputMode="decimal"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-0.5">{t('printing.makingUnitPrice')}</label>
                    <input
                      value={line.making_unit_price}
                      onChange={(e) => updateLine(idx, 'making_unit_price', normalizeNumeralString(e.target.value))}
                      type="text"
                      inputMode="decimal"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-0.5">{t('printing.sellingUnitPrice')}</label>
                    <input
                      value={line.selling_unit_price}
                      onChange={(e) => updateLine(idx, 'selling_unit_price', normalizeNumeralString(e.target.value))}
                      type="text"
                      inputMode="decimal"
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    />
                  </div>
                  <div>
                    <label className="block text-[9px] text-gray-500 mb-0.5">{t('printing.lineSubtotal')}</label>
                    <input
                      value={calcLineSubtotal(line).toFixed(2)}
                      readOnly
                      className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-100 dark:bg-gray-600 dark:text-white"
                    />
                  </div>
                </div>
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <div className="text-[10px] text-green-700 dark:text-green-300">
                    {t('printing.lineProfit')}: AFN {calcLineProfit(line).toFixed(2)}
                  </div>
                  <div className="flex gap-2 text-[10px] text-gray-500 dark:text-gray-400">
                    <span>
                      {t('printing.totalMeters')}:{' '}
                      <input
                        value={line.total_meters}
                        readOnly
                        className="w-16 px-1 py-0.5 border border-gray-200 dark:border-gray-600 rounded bg-gray-50 dark:bg-gray-700 inline-block"
                      />
                    </span>
                    <span>
                      {t('printing.perMeterPriceLegacy')}:{' '}
                      <input
                        value={line.per_meter_price}
                        onChange={(e) => updateLine(idx, 'per_meter_price', normalizeNumeralString(e.target.value))}
                        className="w-16 px-1 py-0.5 border border-gray-300 dark:border-gray-600 rounded dark:bg-gray-700 dark:text-white"
                      />
                    </span>
                  </div>
                  <button type="button" onClick={() => removeLine(idx)} className="btn-form-red text-xs">
                    {t('common.delete')}
                  </button>
                </div>
              </div>
            ))}
            <button type="button" onClick={addLine} className="btn-form-green text-xs flex items-center gap-1">
              <PlusIcon className="h-3.5 w-3.5" />
              {t('printing.addLine')}
            </button>
          </div>

          <div className="rounded-lg bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 p-2 space-y-1">
            <div className="text-xs font-semibold text-blue-900 dark:text-blue-100">
              {t('printing.grandTotal')}: AFN {grandSellingTotal.toFixed(2)}
            </div>
            <div className="text-xs font-semibold text-green-800 dark:text-green-200">
              {t('printing.totalProfit')}: AFN {grandProfit.toFixed(2)}
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
            <input
              value={formData.bill_number}
              onChange={(e) => setFormData((p) => ({ ...p, bill_number: e.target.value }))}
              placeholder={t('printing.billNumber')}
              className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
            <select
              value={formData.payment_method}
              onChange={(e) => setFormData((p) => ({ ...p, payment_method: e.target.value }))}
              className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            >
              <option value="cash">{t('printing.cash')}</option>
              <option value="partial">{t('printing.partial')}</option>
              <option value="credit">{t('printing.credit')}</option>
            </select>
            {!isEdit && formData.payment_method === 'partial' && (
              <input
                value={formData.payment_amount}
                onChange={(e) => setFormData((p) => ({ ...p, payment_amount: normalizeNumeralString(e.target.value) }))}
                type="text"
                inputMode="decimal"
                placeholder={t('printing.paymentAmount')}
                className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
              />
            )}
            <input
              value={formData.reference}
              onChange={(e) => setFormData((p) => ({ ...p, reference: e.target.value }))}
              placeholder={t('printing.reference')}
              className="px-2.5 py-2 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            />
          </div>

          <button disabled={loading} className="btn-form-green text-xs">
            {loading ? t('common.saving') : t('common.save')}
          </button>
        </form>
      </div>
    </div>
  );
};

export default PrintingFormPage;
