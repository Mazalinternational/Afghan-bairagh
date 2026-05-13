import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import {
  ShoppingBagIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { normalizeNumeralString, parseLocaleFloat, parseLocaleInt } from '../../utils/numerals';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import { translateSaleApiError } from '../../utils/saleApiErrors';

const toDateInputValue = (dateValue) => {
  if (!dateValue) return '';
  const parsed = new Date(dateValue);
  if (Number.isNaN(parsed.getTime())) return '';
  const y = parsed.getFullYear();
  const m = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
};

const getTodayDateString = () => toDateInputValue(new Date());

const CreateDirectSale = () => {
  const { id } = useParams();
  const isEdit = Boolean(id);
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    sale_date: getTodayDateString(),
    show_date_on_bill: true,
    discount: 0,
    notes: ''
  });
  
  const [saleItems, setSaleItems] = useState([{
    item_name: '',
    flag_size: '',
    quality_design_type: '',
    quantity: 1,
    price_per_unit: '',
    cost_per_unit: '',
    supplier_name: ''
  }]);
  
  const [expandedItems, setExpandedItems] = useState({});

  useEffect(() => {
    fetchCustomers();
    if (isEdit) {
      fetchDirectSale();
    }
  }, [isEdit, id]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addToast(t('sales.failedToFetchCustomers'), 'error');
    }
  };

  const fetchDirectSale = async () => {
    try {
      setLoading(true);
      const response = await api.get(`/api/direct-sales/${id}/`);
      const sale = response.data;
      setFormData({
        customer: sale.customer || '',
        customer_name: sale.customer_name || sale.customer_name_display || '',
        sale_date: toDateInputValue(sale.sale_date) || getTodayDateString(),
        show_date_on_bill: sale.show_date_on_bill !== false,
        discount: sale.discount || 0,
        notes: sale.notes || ''
      });
      setSaleItems(
        (sale.items || []).map((item) => ({
          item_name: item.item_name || '',
          flag_size: item.flag_size || '',
          quality_design_type: item.quality_design_type || '',
          quantity: item.quantity || 1,
          price_per_unit: item.price_per_unit || '',
          cost_per_unit: item.cost_per_unit || '',
          supplier_name: item.supplier_name || ''
        }))
      );
    } catch (error) {
      console.error('Error fetching direct sale:', error);
      addToast(t('sales.failedToLoadDirectSales'), 'error');
      navigate('/sales/direct');
    } finally {
      setLoading(false);
    }
  };

  const addSaleItem = () => {
    const newIndex = saleItems.length;
    setSaleItems([...saleItems, {
      item_name: '',
      flag_size: '',
      quality_design_type: '',
      quantity: 1,
      price_per_unit: '',
      cost_per_unit: '',
      supplier_name: ''
    }]);
    // Auto-expand the new item
    setExpandedItems({ ...expandedItems, [newIndex]: true });
  };

  const removeSaleItem = (index) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
      // Remove from expanded items
      const newExpanded = { ...expandedItems };
      delete newExpanded[index];
      setExpandedItems(newExpanded);
    }
  };
  
  const toggleItemExpanded = (index) => {
    setExpandedItems({
      ...expandedItems,
      [index]: !expandedItems[index]
    });
  };

  const updateSaleItem = (index, field, value) => {
    const updated = [...saleItems];
    updated[index][field] = value;
    setSaleItems(updated);
  };

  const calculateTotal = () => {
    const subtotal = saleItems.reduce((sum, item) => {
      return sum + (parseLocaleFloat(item.quantity) * parseLocaleFloat(item.price_per_unit || 0));
    }, 0);
    
    const totalCost = saleItems.reduce((sum, item) => {
      return sum + (parseLocaleFloat(item.quantity) * parseLocaleFloat(item.cost_per_unit || 0));
    }, 0);
    
    const discount = parseLocaleFloat(formData.discount) || 0;
    const netAmount = subtotal - discount;
    const profit = netAmount - totalCost;
    
    return {
      subtotal,
      totalCost,
      discount,
      netAmount,
      profit
    };
  };

  const validateForm = () => {
    if (!formData.customer_name && !formData.customer) {
      addToast(t('sales.customerNameRequired'), 'error');
      return false;
    }

    for (let i = 0; i < saleItems.length; i++) {
      const item = saleItems[i];
      
      if (!item.item_name) {
        addToast(`${t('items.nameRequired')} (${t('sales.itemNumber', { n: i + 1 })})`, 'error');
        return false;
      }
      
      const q = parseLocaleFloat(item.quantity);
      if (!item.quantity || Number.isNaN(q) || q <= 0) {
        addToast(`${t('sales.quantityMustBeGreaterThanZero')} (${t('sales.itemNumber', { n: i + 1 })})`, 'error');
        return false;
      }
      
      const sp = parseLocaleFloat(item.price_per_unit);
      if (!item.price_per_unit || Number.isNaN(sp) || sp <= 0) {
        addToast(`${t('sales.priceMustBeGreaterThanZero')} (${t('sales.itemNumber', { n: i + 1 })})`, 'error');
        return false;
      }

      const cp = parseLocaleFloat(item.cost_per_unit);
      if (item.cost_per_unit === '' || Number.isNaN(cp) || cp < 0) {
        addToast(`${t('sales.costPriceNonNegative')} (${t('sales.itemNumber', { n: i + 1 })})`, 'error');
        return false;
      }
    }

    return true;
  };

  const handleSubmit = async (e, confirm = false) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    try {
      setLoading(true);
      
      const payload = {
        customer: formData.customer ? parseLocaleInt(formData.customer) : null,
        customer_name: formData.customer_name,
        sale_date: formData.sale_date ? `${formData.sale_date}T00:00:00` : null,
        show_date_on_bill: formData.show_date_on_bill,
        discount: parseLocaleFloat(formData.discount) || 0,
        notes: formData.notes,
        items: saleItems.map(item => ({
          item_name: item.item_name,
          flag_size: item.flag_size || '',
          quality_design_type: item.quality_design_type || '',
          quantity: parseLocaleInt(item.quantity),
          price_per_unit: parseLocaleFloat(item.price_per_unit),
          cost_per_unit: parseLocaleFloat(item.cost_per_unit),
          supplier_name: item.supplier_name
        }))
      };

      let response;
      if (isEdit) {
        response = await api.put(`/api/direct-sales/${id}/`, payload);
      } else {
        response = await api.post('/api/direct-sales/', payload);
      }
      
      const directSaleId = response.data?.id || id;
      if (confirm) {
        try {
          await api.post(`/api/direct-sales/${directSaleId}/confirm/`);
          addToast(isEdit ? t('sales.directSaleUpdatedAndConfirmed') : t('sales.directSaleConfirmed'), 'success');
        } catch (confirmError) {
          const translated = translateSaleApiError(confirmError, t, 'sales.failedToCreateDirectSale');
          if (translated === t('sales.apiErrorDirectSaleAlreadyConfirmed')) {
            addToast(isEdit ? t('sales.directSaleUpdated') : t('sales.directSaleCreated'), 'success');
          } else {
            addToast(translated, 'error');
          }
        }
      } else {
        addToast(isEdit ? t('sales.directSaleUpdated') : t('sales.directSaleCreated'), 'success');
      }
      
      navigate('/sales/direct');
    } catch (error) {
      console.error('Error saving direct sale:', error);
      addToast(translateSaleApiError(error, t, 'sales.failedToCreateDirectSale'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const totals = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 relative overflow-hidden">
        <div className="absolute -top-10 -right-8 w-32 h-32 bg-blue-300/30 dark:bg-blue-500/20 rounded-full blur-xl" />
        <div className="absolute -bottom-12 -left-6 w-28 h-28 bg-indigo-300/30 dark:bg-indigo-500/20 rounded-full blur-xl" />
        <div className="space-y-3 p-3">
        {/* Header */}
        <PageHeader
          title={isEdit ? (t('sales.editDirectSaleTitle') || 'Edit Direct Sale') : t('sales.createDirectSaleTitle')}
          subtitle={isEdit ? (t('sales.editDirectSaleSubtitle') || 'Update items and confirm the sale') : t('sales.createDirectSaleSubtitle')}
          icon={ShoppingBagIcon}
          actions={
            <button
              type="button"
              onClick={() => navigate('/sales/direct')}
              className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold"
            >
              {t('sales.directSalesTitle')}
            </button>
          }
        />

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-3">
          {/* Customer Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
              {t('sales.customerInformation')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.customerNameRequiredLabel')}
                </label>
                <input
                  type="text"
                  value={formData.customer_name}
                  onChange={(e) => setFormData({ ...formData, customer_name: e.target.value })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  placeholder={t('customers.enterName')}
                  required
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.selectCustomerOptional')}
                </label>
                <select
                  value={formData.customer}
                  onChange={(e) => {
                    const selectedCustomer = customers.find(c => c.id === parseLocaleInt(e.target.value));
                    if (selectedCustomer) {
                      setFormData({ ...formData, customer: e.target.value, customer_name: selectedCustomer.name });
                    }
                  }}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="">{t('sales.selectCustomerPlaceholder')}</option>
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.id}>
                      {customer.name} - {customer.phone}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.date') || 'Date'}
                </label>
                <LocalizedDateInput
                  value={formData.sale_date}
                  onChange={(dateValue) => setFormData({ ...formData, sale_date: dateValue })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <div className="flex items-center mt-5">
                <label className="inline-flex items-center gap-2 text-xs font-medium text-gray-700 dark:text-gray-300 cursor-pointer">
                  <input
                    type="checkbox"
                    checked={Boolean(formData.show_date_on_bill)}
                    onChange={(e) => setFormData({ ...formData, show_date_on_bill: e.target.checked })}
                    className="h-4 w-4 rounded border-gray-300 text-blue-600 focus:ring-blue-500"
                  />
                  {t('sales.showDateOnBill') || 'Show date on bill'}
                </label>
              </div>
            </div>
          </div>

          {/* Sale Items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="flex items-center justify-between mb-2">
              <h2 className="text-xs font-semibold text-gray-900 dark:text-white">
                {t('sales.itemsToSell')}
              </h2>
              <button
                type="button"
                onClick={addSaleItem}
                className="btn-form-green px-2.5 py-1 flex items-center gap-1"
              >
                <PlusIcon className="h-3.5 w-3.5" />
                {t('sales.addItem')}
              </button>
            </div>

            <div className="space-y-2">
              {saleItems.map((saleItem, index) => {
                const isExpanded = expandedItems[index] === true; // Default to collapsed
                const itemTotal = (parseLocaleFloat(saleItem.quantity) * parseLocaleFloat(saleItem.price_per_unit || 0)).toFixed(2);
                
                return (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700/50">
                  {/* Collapsible Header */}
                  <div 
                    className="flex items-center justify-between p-2 cursor-pointer hover:bg-gray-100 dark:hover:bg-gray-700 rounded-t-lg"
                    onClick={() => toggleItemExpanded(index)}
                  >
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
                      >
                        {isExpanded ? (
                          <ChevronUpIcon className="h-4 w-4" />
                        ) : (
                          <ChevronDownIcon className="h-4 w-4" />
                        )}
                      </button>
                      <span className="text-sm font-medium text-gray-900 dark:text-white">
                        {t('sales.item')} {index + 1}: {saleItem.item_name || t('common.notSelected') || 'Not selected'}
                      </span>
                    </div>
                    <div className="flex items-center gap-3">
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        {t('sales.qty')}: {saleItem.quantity} × AFN {parseLocaleFloat(saleItem.price_per_unit || 0).toFixed(2)}
                      </span>
                      <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                        AFN {itemTotal}
                      </span>
                      {saleItems.length > 1 && (
                        <button
                          type="button"
                          onClick={(e) => {
                            e.stopPropagation();
                            removeSaleItem(index);
                          }}
                          className="text-red-600 hover:text-red-800 dark:text-red-400 dark:hover:text-red-300 p-1"
                        >
                          <TrashIcon className="h-4 w-4" />
                        </button>
                      )}
                    </div>
                  </div>
                  
                  {/* Collapsible Content */}
                  {isExpanded && (
                  <div className="p-2 border-t border-gray-200 dark:border-gray-600">
                  <div className="grid grid-cols-1 md:grid-cols-8 gap-3">
                    {/* Item Name */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('items.name')} *
                      </label>
                      <input
                        type="text"
                        value={saleItem.item_name}
                        onChange={(e) => updateSaleItem(index, 'item_name', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={t('items.enterName')}
                        required
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        سایز (اندازه)
                      </label>
                      <input
                        type="text"
                        value={saleItem.flag_size || ''}
                        onChange={(e) => updateSaleItem(index, 'flag_size', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="مثال: 2x3"
                      />
                    </div>

                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        دیزاین (طرح)
                      </label>
                      <input
                        type="text"
                        value={saleItem.quality_design_type || ''}
                        onChange={(e) => updateSaleItem(index, 'quality_design_type', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder="مثال: چاپی"
                      />
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.quantity')} *
                      </label>
                      <input
                        type="text"
                        inputMode="numeric"
                        value={saleItem.quantity}
                        onChange={(e) => updateSaleItem(index, 'quantity', normalizeNumeralString(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Selling Price */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.sellingPricePerUnit')}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={saleItem.price_per_unit}
                        onChange={(e) => updateSaleItem(index, 'price_per_unit', normalizeNumeralString(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Cost Price */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.costPricePerUnit')}
                      </label>
                      <input
                        type="text"
                        inputMode="decimal"
                        value={saleItem.cost_per_unit}
                        onChange={(e) => updateSaleItem(index, 'cost_per_unit', normalizeNumeralString(e.target.value))}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      />
                    </div>

                    {/* Total */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.total')}
                      </label>
                      <input
                        type="text"
                        value={`AFN ${(parseLocaleFloat(saleItem.quantity) * parseLocaleFloat(saleItem.price_per_unit || 0)).toFixed(2)}`}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        readOnly
                      />
                    </div>
                  </div>

                  {/* Supplier Name */}
                  <div className="mt-3">
                    <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('sales.supplierNameOptionalLabel')}
                    </label>
                    <input
                      type="text"
                      value={saleItem.supplier_name}
                      onChange={(e) => updateSaleItem(index, 'supplier_name', e.target.value)}
                      className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('sales.supplierNameOptionalLabel')}
                    />
                  </div>
                  </div>
                  )}
                </div>
              );
              })}
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <h2 className="text-xs font-semibold text-gray-900 dark:text-white mb-2">
              {t('sales.financialSummary')}
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mb-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.discount')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: normalizeNumeralString(e.target.value) })}
                  className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="border-t pt-2 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('sales.subtotalSelling')}
                </span>
                <span className="font-medium">AFN {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('sales.totalCostBuying')}
                </span>
                <span className="font-medium text-orange-600">-AFN {totals.totalCost.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">
                  {t('sales.discount')}
                </span>
                <span className="font-medium text-red-600">-AFN {totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold border-t pt-2">
                <span>{t('sales.netAmount')}</span>
                <span className="text-blue-600">AFN {totals.netAmount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-base font-bold bg-green-50 dark:bg-green-900/20 p-2 rounded">
                <span className="text-green-700 dark:text-green-400">
                  {t('sales.profit')}
                </span>
                <span className="text-green-700 dark:text-green-400">AFN {totals.profit.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sales.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-2.5 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={t('common.notesPlaceholder') || 'Additional notes...'}
            />
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow p-3">
            <div className="flex gap-2 justify-end">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-form-red"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-form-green"
                disabled={loading}
              >
                {loading ? t('common.saving') || 'Saving...' : isEdit ? (t('sales.updateDirectSale') || 'Update Sale') : t('sales.createDirectSaleDraft')}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="btn-form-green flex items-center gap-1"
                disabled={loading}
              >
                <CheckCircleIcon className="h-3.5 w-3.5" />
                {loading ? t('common.saving') || 'Saving...' : isEdit ? (t('sales.updateAndConfirm') || 'Update & Confirm') : t('sales.confirmDirectSale')}
              </button>
            </div>
          </div>
        </form>
        </div>
      </div>
    </div>
  );
};

export default CreateDirectSale;
