import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  UserIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  PlusIcon,
  TrashIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';

const EMPTY_LINE = {
  item: '',
  item_name: '',
  quantity: '',
  unit_cost: '',
  collapsed: false,
};

const PurchaseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [suppliers, setSuppliers] = useState([]);
  const [items, setItems] = useState([]);
  const [formData, setFormData] = useState({
    supplier: '',
    bill_number: '',
    description: '',
    payment_method: 'cash',
    payment_amount: '',
    reference: '',
    purchase_items: [{ ...EMPTY_LINE }],
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchSuppliers();
    fetchItems();
    if (isEdit) fetchPurchase();
  }, [id, isEdit]);

  const fetchSuppliers = async () => {
    try {
      const res = await api.get('/api/suppliers/');
      setSuppliers(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching suppliers:', err);
    }
  };

  const fetchItems = async () => {
    try {
      const res = await api.get('/api/inventory/items/');
      setItems(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching items:', err);
    }
  };

  const fetchPurchase = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/purchases/${id}/`);
      const lines = Array.isArray(res.data.purchase_items) && res.data.purchase_items.length > 0
        ? res.data.purchase_items.map((line) => ({
            item: line.item || '',
            item_name: line.item_name || '',
            quantity: line.quantity || '',
            unit_cost: line.unit_cost || '',
            collapsed: false,
          }))
        : [{
            item: res.data.item || '',
            item_name: res.data.item_name || '',
            quantity: res.data.quantity || '',
            unit_cost: res.data.quantity ? ((parseFloat(res.data.cost || 0) / parseFloat(res.data.quantity || 1)).toFixed(2)) : '',
            collapsed: false,
          }];
      setFormData({
        supplier: res.data.supplier || '',
        bill_number: res.data.bill_number || '',
        description: res.data.description || '',
        payment_method: res.data.payment_method || 'cash',
        payment_amount: '',
        reference: res.data.reference || '',
        purchase_items: lines
      });
    } catch (err) {
      console.error('Error fetching purchase:', err);
      addToast(t('purchases.toastFetchFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    setFormData(prev => ({ 
      ...prev, 
      [name]: type === 'checkbox' ? checked : value 
    }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const updateLine = (index, key, value) => {
    setFormData((prev) => {
      const next = [...prev.purchase_items];
      next[index] = { ...next[index], [key]: value };
      return { ...prev, purchase_items: next };
    });
  };

  const addLine = () => {
    setFormData((prev) => ({
      ...prev,
      purchase_items: [...prev.purchase_items, { ...EMPTY_LINE }],
    }));
  };

  const removeLine = (index) => {
    setFormData((prev) => ({
      ...prev,
      purchase_items: prev.purchase_items.filter((_, i) => i !== index).length
        ? prev.purchase_items.filter((_, i) => i !== index)
        : [{ ...EMPTY_LINE }],
    }));
  };

  const toggleCollapse = (index) => {
    updateLine(index, 'collapsed', !formData.purchase_items[index].collapsed);
  };

  const getLineTotal = (line) => {
    const qty = parseFloat(line.quantity || 0);
    const cost = parseFloat(line.unit_cost || 0);
    return qty * cost;
  };

  const totalPrice = formData.purchase_items.reduce((sum, line) => sum + getLineTotal(line), 0);

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.supplier) {
      newErrors.supplier = t('purchases.errSupplierRequired');
    }
    
    if (!Array.isArray(formData.purchase_items) || formData.purchase_items.length === 0) {
      newErrors.purchase_items = t('purchases.errAtLeastOneItem');
    } else {
      const invalid = formData.purchase_items.find((line) => !line.item_name || parseFloat(line.quantity || 0) <= 0 || parseFloat(line.unit_cost || 0) < 0);
      if (invalid) {
        newErrors.purchase_items = t('purchases.errEachItemValid');
      }
    }

    // Validate payment amount for partial payment
    if (formData.payment_method === 'partial') {
      const paymentAmount = parseFloat(formData.payment_amount) || 0;
      if (paymentAmount <= 0) {
        newErrors.payment_amount = t('purchases.errPartialPaymentRequired');
      } else if (paymentAmount >= totalPrice) {
        newErrors.payment_amount = t('purchases.errPartialPaymentLessThanTotal');
      }
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const purchaseItems = formData.purchase_items.map((line) => {
        const qty = parseFloat(line.quantity || 0);
        const unitCost = parseFloat(line.unit_cost || 0);
        return {
          item: line.item ? parseInt(line.item, 10) : null,
          item_name: line.item_name,
          quantity: qty.toFixed(2),
          unit_cost: unitCost.toFixed(2),
          line_total: (qty * unitCost).toFixed(2),
        };
      });

      const submitData = {
        supplier: parseInt(formData.supplier),
        bill_number: formData.bill_number,
        item_name: purchaseItems.length === 1 ? purchaseItems[0].item_name : `Multiple items (${purchaseItems.length})`,
        quantity: Math.max(1, Math.round(purchaseItems.reduce((sum, line) => sum + parseFloat(line.quantity || 0), 0))),
        cost: totalPrice.toFixed(2),
        is_for_press: false,
        description: formData.description,
        reference: formData.reference,
        item: purchaseItems.length === 1 && purchaseItems[0].item ? purchaseItems[0].item : null,
        purchase_items: purchaseItems
      };

      let purchaseResponse;
      if (isEdit) {
        purchaseResponse = await api.put(`/api/purchases/${id}/`, submitData);
        addToast(t('purchases.toastUpdated'), 'success');
      } else {
        purchaseResponse = await api.post('/api/purchases/', submitData);
        
        // Handle payment based on payment method
        const purchaseId = purchaseResponse.data.id;
        
        if (formData.payment_method === 'cash') {
          // Full payment - pay the entire amount
          await api.post('/api/payments/', {
            purchase: purchaseId,
            amount: totalPrice,
            payment_method: 'cash',
            reference: formData.reference,
            notes: 'Full payment at purchase'
          });
        } else if (formData.payment_method === 'partial') {
          // Partial payment - pay the specified amount
          const paymentAmount = parseFloat(formData.payment_amount) || 0;
          if (paymentAmount > 0) {
            await api.post('/api/payments/', {
              purchase: purchaseId,
              amount: paymentAmount,
              payment_method: 'partial',
              reference: formData.reference,
              notes: 'Partial payment at purchase'
            });
          }
        }
        // For 'credit', no payment is made
        
        addToast(t('purchases.toastCreated'), 'success');
      }
      navigate('/purchases');
    } catch (err) {
      console.error('Error saving purchase:', err);
      if (err.response?.data) {
        setErrors(err.response.data);
        addToast(t('purchases.toastSaveFailed'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900">
        <div className="h-12 w-12 animate-spin border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="w-full max-w-6xl mx-auto space-y-2">
      <div className="bg-blue-50 dark:bg-gray-800 p-2.5 rounded-xl shadow-md relative overflow-hidden">
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-50" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-400/60 dark:bg-blue-600/40 rounded-full opacity-30" />
        
        <div className="flex items-center gap-2 relative z-10">
          <button 
            onClick={() => navigate('/purchases')} 
            className="p-1.5 bg-blue-500/20 hover:bg-blue-500/30 backdrop-blur-sm rounded-lg transition-colors"
          >
            <ArrowLeftIcon className="h-4 w-4 text-blue-600 dark:text-blue-400" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">
              {isEdit ? t('purchases.editPurchasePageTitle') : t('purchases.addPurchasePageTitle')}
            </h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">
              {isEdit ? t('purchases.editPurchasePageSubtitle') : t('purchases.addPurchasePageSubtitle')}
            </p>
          </div>
        </div>
      </div>
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-3 rounded-xl shadow-xl border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
            <div className="max-w-md">
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <UserIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('purchases.formSupplierLabel')}
              </label>
              <select
                name="supplier"
                value={formData.supplier}
                onChange={handleChange}
                className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                  errors.supplier ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                }`}
              >
                <option value="">{t('purchases.formSelectExistingSupplier')}</option>
                {suppliers.map(sup => (
                  <option key={sup.id} value={sup.id}>{sup.name}</option>
                ))}
              </select>
              {errors.supplier && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.supplier}
                </p>
              )}
            </div>

            <div className="max-w-md">
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                <DocumentTextIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('purchases.formBillNumberLabel')}
              </label>
              <input
                type="text"
                name="bill_number"
                value={formData.bill_number}
                onChange={handleChange}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm transition-all"
                placeholder={t('purchases.formBillNumberPlaceholder')}
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-semibold text-gray-900 dark:text-white">
                {t('purchases.formPurchaseItemsTitle')} ({formData.purchase_items.length})
              </h3>
              <button type="button" onClick={addLine} className="px-2 py-1 text-[11px] rounded-lg bg-blue-600 text-white hover:bg-blue-700 flex items-center gap-1">
                <PlusIcon className="h-3.5 w-3.5" /> {t('purchases.formAddItem')}
              </button>
            </div>
            {errors.purchase_items && <p className="text-xs text-red-500">{errors.purchase_items}</p>}
            {formData.purchase_items.map((line, idx) => {
              const selectedItem = items.find((it) => String(it.id) === String(line.item));
              const title = line.item_name || selectedItem?.name || `${t('purchases.item')} ${idx + 1}`;
              return (
                <div key={`purchase-line-${idx}`} className="border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
                  <div className="px-2.5 py-1.5 bg-gray-50 dark:bg-gray-700/40 flex items-center justify-between">
                    <button type="button" onClick={() => toggleCollapse(idx)} className="text-[11px] font-medium text-gray-800 dark:text-gray-200 flex items-center gap-1">
                      {line.collapsed ? <ChevronDownIcon className="h-4 w-4" /> : <ChevronUpIcon className="h-4 w-4" />}
                      {title} - AFN {getLineTotal(line).toFixed(2)}
                    </button>
                    <button type="button" onClick={() => removeLine(idx)} className="text-red-600 hover:text-red-700">
                      <TrashIcon className="h-4 w-4" />
                    </button>
                  </div>
                  {!line.collapsed && (
                    <div className="p-2.5 grid grid-cols-1 md:grid-cols-4 gap-2">
                      <div>
                        <label className="block text-[11px] mb-1 text-gray-700 dark:text-gray-300">{t('purchases.formSelectItem')}</label>
                        <select
                          value={line.item}
                          onChange={(e) => {
                            const selected = items.find((it) => String(it.id) === e.target.value);
                            updateLine(idx, 'item', e.target.value);
                            if (selected && !line.item_name) updateLine(idx, 'item_name', selected.name);
                          }}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        >
                          <option value="">{t('common.select')}</option>
                          {items.map((it) => <option key={it.id} value={it.id}>{it.name}</option>)}
                        </select>
                      </div>
                      <div>
                        <label className="block text-[11px] mb-1 text-gray-700 dark:text-gray-300">{t('purchases.itemName')}</label>
                        <input
                          type="text"
                          value={line.item_name}
                          onChange={(e) => updateLine(idx, 'item_name', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] mb-1 text-gray-700 dark:text-gray-300">{t('purchases.quantity')}</label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.quantity}
                          onChange={(e) => updateLine(idx, 'quantity', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                      <div>
                        <label className="block text-[11px] mb-1 text-gray-700 dark:text-gray-300">
                          <CurrencyDollarIcon className="h-3.5 w-3.5 inline mr-1" />
                          {t('purchases.formUnitCost')}
                        </label>
                        <input
                          type="number"
                          step="0.01"
                          min="0"
                          value={line.unit_cost}
                          onChange={(e) => updateLine(idx, 'unit_cost', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                        <p className="text-[10px] mt-1 text-blue-600 dark:text-blue-400">{t('purchases.formLineTotal')}: AFN {getLineTotal(line).toFixed(2)}</p>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>

          {totalPrice > 0 && (
            <div className="max-w-md">
              <div className="p-2 bg-gradient-to-r from-blue-50 to-indigo-50 dark:from-blue-900/20 dark:to-indigo-900/20 rounded-lg border border-blue-200 dark:border-blue-800 backdrop-blur-sm">
                <p className="text-xs font-bold text-blue-600 dark:text-blue-400">{t('purchases.formTotalCostSimple')}: AFN {totalPrice.toFixed(2)}</p>
              </div>
            </div>
          )}

          <div className="max-w-2xl">
            <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
              <DocumentTextIcon className="h-3.5 w-3.5 inline mr-1" />
              {t('purchases.formDescriptionLabel')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                errors.description ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
              }`}
              placeholder={t('purchases.formDescriptionPlaceholder')}
            />
            {errors.description && (
              <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                {errors.description}
              </p>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
            <div className="max-w-xs">
              <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                {t('purchases.formPaymentMethodLabel')}
              </label>
              <select
                name="payment_method"
                value={formData.payment_method}
                onChange={handleChange}
                className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm transition-all"
              >
                <option value="cash">{t('purchases.formCashLabel')} (Full Payment)</option>
                <option value="partial">{t('purchases.formPartialPayment')}</option>
                <option value="credit">{t('purchases.formFullCredit')}</option>
              </select>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">
                {formData.payment_method === 'cash' && t('purchases.formPaymentHintCash')}
                {formData.payment_method === 'partial' && t('purchases.formPaymentHintPartial')}
                {formData.payment_method === 'credit' && t('purchases.formPaymentHintCredit')}
              </p>
            </div>

            {formData.payment_method === 'partial' && (
              <div className="max-w-xs">
                <label className="block text-[11px] font-semibold text-gray-700 dark:text-gray-300 mb-1">
                  {t('purchases.formPaymentAmount')} *
                </label>
                <input
                  type="number"
                  name="payment_amount"
                  value={formData.payment_amount}
                  onChange={handleChange}
                  step="0.01"
                  min="0"
                  max={totalPrice}
                  className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                    errors.payment_amount ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                  }`}
                  placeholder={t('purchases.formPaymentAmountPlaceholder')}
                />
                {errors.payment_amount && (
                  <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                    <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                    {errors.payment_amount}
                  </p>
                )}
                {formData.payment_amount && totalPrice > 0 && (
                  <p className="text-[10px] text-green-600 dark:text-green-400 mt-1 font-medium">
                    ✓ {t('purchases.remaining')}: AFN {(totalPrice - parseFloat(formData.payment_amount || 0)).toFixed(2)}
                  </p>
                )}
              </div>
            )}
          </div>
          <div className="flex gap-2 pt-1">
            <button
              type="submit"
              disabled={loading}
              className="btn-form-green disabled:opacity-50 text-xs"
            >
              {loading ? t('common.saving') : (isEdit ? t('purchases.formUpdatePurchase') : t('purchases.formCreatePurchase'))}
            </button>
            <button
              type="button"
              onClick={() => navigate('/purchases')}
              className="btn-form-red text-xs"
            >
              {t('purchases.formCancelButton')}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default PurchaseForm;
