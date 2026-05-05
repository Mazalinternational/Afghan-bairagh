import React, { useState, useEffect } from 'react';
import { useNavigate, useLocation } from 'react-router-dom';
import {
  ShoppingCartIcon,
  ArrowLeftIcon,
  PlusIcon,
  TrashIcon,
  CheckCircleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { normalizeNumeralString, parseLocaleFloat, parseLocaleInt } from '../../utils/numerals';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';

const CreateSale = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const { t } = useTranslation();
  const { addToast } = useToast();
  
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [customerSearchInput, setCustomerSearchInput] = useState('');
  const [showNewCustomerModal, setShowNewCustomerModal] = useState(false);
  const [newCustomerData, setNewCustomerData] = useState({ name: '', phone: '', address: '' });
  const [formData, setFormData] = useState({
    customer: '',
    customer_name: '',
    discount: 0,
    tax: 0,
    notes: ''
  });
  
  const [saleItems, setSaleItems] = useState([{
    item: '',
    quantity: 1,
    price_per_unit: '',
    stock_type: 'press_stock',
    flag_size: '',
    quality_design_type: ''
  }]);

  useEffect(() => {
    fetchCustomers();
    fetchItems();
    
    // Check if converting from order
    const orderId = new URLSearchParams(location.search).get('order_id');
    if (orderId) {
      loadOrderData(orderId);
    }
  }, [location]);

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/api/customers/');
      setCustomers(response.data);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addToast(t('sales.failedToLoad'), 'error');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/items/');
      const raw = response.data;
      const list = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? []);
      setItems(Array.isArray(list) ? list : []);
    } catch (error) {
      console.error('Error fetching items:', error);
      addToast(t('sales.failedToLoad'), 'error');
      setItems([]);
    }
  };

  const loadOrderData = async (orderId) => {
    try {
      const response = await api.get(`/api/orders/${orderId}/`);
      const order = response.data;
      
      setFormData(prev => ({
        ...prev,
        customer: order.customer
      }));

      if (order.order_items && order.order_items.length > 0) {
        setSaleItems(order.order_items.map(item => ({
          item: item.item,
          quantity: item.quantity,
          price_per_unit: item.price_estimate,
          stock_type: item.stock_type,
          flag_size: item.flag_size,
          quality_design_type: item.quality_design_type
        })));
      }
    } catch (error) {
      console.error('Error loading order:', error);
      addToast(t('sales.failedToLoadOrderData'), 'error');
    }
  };

  const addSaleItem = () => {
    setSaleItems([...saleItems, {
      item: '',
      quantity: 1,
      price_per_unit: '',
      stock_type: 'press_stock',
      flag_size: '',
      quality_design_type: ''
    }]);
  };

  const removeSaleItem = (index) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
    }
  };

  const updateSaleItem = (index, field, value) => {
    const updated = [...saleItems];
    updated[index][field] = value;
    
    // Auto-populate price when item is selected
    if (field === 'item' && value) {
      const selectedItem = items.find(item => item.id === parseInt(value));
      if (selectedItem) {
        updated[index].price_per_unit = selectedItem.unit_price || '';
      }
    }
    
    setSaleItems(updated);
  };

  const getItemStock = (itemIdOrObj, stockType) => {
    const id = itemIdOrObj != null && typeof itemIdOrObj === 'object' ? itemIdOrObj.id : itemIdOrObj;
    const list = Array.isArray(items) ? items : [];
    const item = list.find((i) => String(i.id) === String(id));
    if (!item) return 0;
    return stockType === 'press_stock' ? (item.press_stock ?? 0) : (item.home_stock ?? 0);
  };

  const calculateTotal = () => {
    const subtotal = saleItems.reduce((sum, item) => {
      return sum + (parseLocaleFloat(item.quantity) * parseLocaleFloat(item.price_per_unit || 0));
    }, 0);

    const totalCost = saleItems.reduce((sum, saleItem) => {
      const selectedItem = (Array.isArray(items) ? items : []).find(
        (invItem) => String(invItem.id) === String(saleItem.item)
      );
      const unitCost = parseLocaleFloat(selectedItem?.unit_price || 0);
      return sum + (parseLocaleFloat(saleItem.quantity) * unitCost);
    }, 0);
    
    const discount = parseLocaleFloat(formData.discount) || 0;
    const tax = parseLocaleFloat(formData.tax) || 0;
    const netAmount = subtotal - discount + tax;
    
    return {
      subtotal,
      totalCost,
      discount,
      tax,
      total: netAmount,
      profit: netAmount - totalCost
    };
  };

  const validateForm = () => {
    if (!formData.customer && !customerSearchInput.trim()) {
      addToast(t('sales.selectOrEnterCustomer'), 'error');
      return false;
    }

    for (let i = 0; i < saleItems.length; i++) {
      const item = saleItems[i];
      
      if (!item.item) {
        addToast(`${t('sales.selectItem')} (Item ${i + 1})`, 'error');
        return false;
      }
      
      const q = parseLocaleFloat(item.quantity);
      if (!item.quantity || Number.isNaN(q) || q <= 0) {
        addToast(`${t('sales.quantityMustBeGreaterThanZero')} (${t('sales.itemNumber', { number: i + 1 })})`, 'error');
        return false;
      }
      
      const p = parseLocaleFloat(item.price_per_unit);
      if (!item.price_per_unit || Number.isNaN(p) || p <= 0) {
        addToast(`${t('sales.priceMustBeGreaterThanZero')} (${t('sales.itemNumber', { number: i + 1 })})`, 'error');
        return false;
      }

      // Check stock availability
      const availableStock = getItemStock(item.item, item.stock_type);
      if (availableStock < q) {
        addToast(
          t('sales.insufficientStockForItem', {
            stockType: item.stock_type === 'press_stock' ? t('sales.pressStock') : t('sales.homeStock'),
            itemNumber: i + 1,
            available: availableStock
          }),
          'error'
        );
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
        discount: parseLocaleFloat(formData.discount) || 0,
        tax: parseLocaleFloat(formData.tax) || 0,
        notes: formData.notes,
        items: saleItems.map(item => ({
          item: parseLocaleInt(item.item),
          quantity: parseLocaleInt(item.quantity),
          price_per_unit: parseLocaleFloat(item.price_per_unit),
          stock_type: item.stock_type,
          flag_size: item.flag_size,
          quality_design_type: item.quality_design_type
        }))
      };

      // Add customer ID or customer name
      if (formData.customer) {
        payload.customer = parseLocaleInt(formData.customer);
      } else if (customerSearchInput.trim()) {
        payload.customer_name = customerSearchInput.trim();
      }

      const response = await api.post('/api/sales/', payload);
      
      // Confirm sale immediately if requested
      if (confirm) {
        await api.post(`/api/sales/${response.data.id}/confirm/`);
        addToast(t('sales.saleConfirmed'), 'success');
      } else {
        addToast(t('sales.saleCreated'), 'success');
      }
      
      navigate('/sales');
    } catch (error) {
      console.error('Error creating sale:', error);
      addToast(error.response?.data?.error || t('sales.failedToCreate'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleCreateNewCustomer = async () => {
    if (!newCustomerData.name.trim()) {
      addToast(t('sales.customerNameRequired'), 'error');
      return;
    }

    try {
      const response = await api.post('/api/customers/', {
        name: newCustomerData.name.trim(),
        phone: newCustomerData.phone.trim() || 'N/A',
        address: newCustomerData.address.trim() || 'N/A'
      });
      
      setCustomers([...customers, response.data]);
      setFormData({ ...formData, customer: response.data.id });
      setCustomerSearchInput(response.data.name);
      setNewCustomerData({ name: '', phone: '', address: '' });
      setShowNewCustomerModal(false);
      addToast(t('sales.customerCreatedSuccessfully'), 'success');
    } catch (error) {
      console.error('Error creating customer:', error);
      addToast(t('sales.failedToCreateCustomer'), 'error');
    }
  };

  const totals = calculateTotal();

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-3 p-3">
        {/* Header */}
        <PageHeader
          title={t('sales.createSale')}
          subtitle={t('sales.stockDeducted')}
          icon={ShoppingCartIcon}
          actions={
            <div className="flex items-center gap-2">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="p-2 bg-white/80 hover:bg-white text-gray-700 rounded-full shadow border border-gray-200 transition-all"
                aria-label={t('common.back')}
                title={t('common.back')}
              >
                <ArrowLeftIcon className="h-4 w-4" />
              </button>
              <button
                type="button"
                onClick={() => navigate('/sales')}
                className="px-3 py-2 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold"
              >
                {t('sales.title')}
              </button>
            </div>
          }
        />

        <form onSubmit={(e) => handleSubmit(e, false)} className="space-y-4">
          {/* Customer Selection */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('sales.customer')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.searchExistingCustomer')}
                </label>
                <input
                  type="text"
                  value={customerSearchInput}
                  onChange={(e) => {
                    const value = e.target.value;
                    setCustomerSearchInput(value);
                    
                    // Search for matching customer
                    const match = customers.find(c => 
                      c.name.toLowerCase().includes(value.toLowerCase())
                    );
                    
                    if (match) {
                      setFormData({ ...formData, customer: match.id });
                    } else {
                      setFormData({ ...formData, customer: '' });
                    }
                  }}
                  placeholder={t('sales.searchCustomerPlaceholder')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  list="customers-list"
                />
                <datalist id="customers-list">
                  {customers.map(customer => (
                    <option key={customer.id} value={customer.name}>
                      {customer.phone}
                    </option>
                  ))}
                </datalist>
              </div>
              
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.enterCustomerManually')}
                </label>
                <input
                  type="text"
                  value={customerSearchInput}
                  onChange={(e) => {
                    setCustomerSearchInput(e.target.value);
                    setFormData({ ...formData, customer: '' });
                  }}
                  placeholder={t('sales.typeCustomerName')}
                  className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            </div>

            <button
              type="button"
              onClick={() => setShowNewCustomerModal(true)}
              className="mt-3 text-sm text-blue-600 hover:text-blue-700 dark:text-blue-400 font-medium"
            >
              + {t('sales.createCustomerWithDetails')}
            </button>
          </div>

          {/* Sale Items */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex items-center justify-between mb-3">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('sales.saleItems')}</h2>
              <button
                type="button"
                onClick={addSaleItem}
                className="btn-form-green flex items-center gap-1"
              >
                <PlusIcon className="h-4 w-4" />
                {t('sales.addItem')}
              </button>
            </div>

            <div className="space-y-3">
              {saleItems.map((saleItem, index) => (
                <div key={index} className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50">
                  <div className="grid grid-cols-1 md:grid-cols-7 gap-3">
                    {/* Item Selection */}
                    <div className="md:col-span-2">
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.item')}
                      </label>
                      <select
                        value={saleItem.item != null ? (typeof saleItem.item === 'object' ? String(saleItem.item.id) : String(saleItem.item)) : ''}
                        onChange={(e) => {
                          const val = e.target.value;
                          const selected = val ? (Array.isArray(items) ? items : []).find((i) => String(i.id) === val) : null;
                          updateSaleItem(index, 'item', selected ? selected.id : '');
                          if (selected) updateSaleItem(index, 'price_per_unit', selected.unit_price ?? '');
                        }}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        required
                      >
                        <option value="">{t('sales.selectItem')}</option>
                        {(Array.isArray(items) ? items : []).map((invItem) => (
                          <option key={invItem.id} value={String(invItem.id)}>
                            {invItem.name}
                          </option>
                        ))}
                      </select>
                    </div>

                    {/* Quantity */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.quantity')}
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

                    {/* Purchase Price (Cost) */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('common.cost')}
                      </label>
                      <input
                        type="text"
                        value={`AFN ${parseLocaleFloat((Array.isArray(items) ? items : []).find((invItem) => String(invItem.id) === String(saleItem.item))?.unit_price || 0).toFixed(2)}`}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 dark:text-white"
                        readOnly
                      />
                    </div>

                    {/* Sale Price */}
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

                    {/* Stock Type */}
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.stockType')}
                      </label>
                      <select
                        value={saleItem.stock_type}
                        onChange={(e) => updateSaleItem(index, 'stock_type', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="press_stock">{t('sales.pressStock')}</option>
                        <option value="home_stock">{t('sales.homeStock')}</option>
                      </select>
                      {saleItem.item && (
                        <p className="text-xs text-gray-500 dark:text-gray-400 mt-1">
                          {t('sales.availableStock')}: {getItemStock(saleItem.item, saleItem.stock_type)}
                        </p>
                      )}
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

                  {/* Additional Fields */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-3 mt-3">
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.flagSize')}
                      </label>
                      <input
                        type="text"
                        value={saleItem.flag_size}
                        onChange={(e) => updateSaleItem(index, 'flag_size', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={t('sales.flagSizeExample')}
                      />
                    </div>
                    <div>
                      <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('sales.qualityDesignType')}
                      </label>
                      <input
                        type="text"
                        value={saleItem.quality_design_type}
                        onChange={(e) => updateSaleItem(index, 'quality_design_type', e.target.value)}
                        className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                        placeholder={t('sales.qualityDesignExample')}
                      />
                    </div>
                  </div>

                  {/* Remove Button */}
                  {saleItems.length > 1 && (
                    <button
                      type="button"
                      onClick={() => removeSaleItem(index)}
                      className="mt-2 text-red-600 hover:text-red-800 text-xs font-medium flex items-center gap-1"
                    >
                      <TrashIcon className="h-4 w-4" />
                      {t('common.remove')}
                    </button>
                  )}
                </div>
              ))}
            </div>
          </div>

          {/* Financial Details */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-3">{t('sales.financial')}</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.discount')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.discount}
                  onChange={(e) => setFormData({ ...formData, discount: normalizeNumeralString(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
              <div>
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.tax')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={formData.tax}
                  onChange={(e) => setFormData({ ...formData, tax: normalizeNumeralString(e.target.value) })}
                  className="w-full px-3 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                  placeholder="0.00"
                />
              </div>
            </div>

            {/* Totals Summary */}
            <div className="mt-3 pt-3 border-t border-gray-200 dark:border-gray-700 space-y-1.5">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('sales.subtotal')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">AFN {totals.subtotal.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('sales.discount')}:</span>
                <span className="font-medium text-red-600 dark:text-red-400">-AFN {totals.discount.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('sales.tax')}:</span>
                <span className="font-medium text-gray-900 dark:text-white">+AFN {totals.tax.toFixed(2)}</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600 dark:text-gray-400">{t('sales.profit')}:</span>
                <span className={`font-medium ${totals.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                  AFN {totals.profit.toFixed(2)}
                </span>
              </div>
              <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                <span className="text-gray-900 dark:text-white">{t('sales.netAmount')}:</span>
                <span className="text-blue-600 dark:text-blue-400">AFN {totals.total.toFixed(2)}</span>
              </div>
            </div>
          </div>

          {/* Notes */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              {t('sales.notes')}
            </label>
            <textarea
              value={formData.notes}
              onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
              rows="2"
              className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
              placeholder={t('sales.additionalNotesPlaceholder')}
            />
          </div>

          {/* Action Buttons */}
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
            <div className="flex gap-2 justify-end flex-wrap">
              <button
                type="button"
                onClick={() => navigate(-1)}
                className="btn-form-red text-sm"
                disabled={loading}
              >
                {t('common.cancel')}
              </button>
              <button
                type="submit"
                className="btn-form-green text-sm"
                disabled={loading}
              >
                {loading ? t('common.saving') : t('sales.createSaleDraft')}
              </button>
              <button
                type="button"
                onClick={(e) => handleSubmit(e, true)}
                className="btn-form-green text-sm flex items-center gap-1.5"
                disabled={loading}
              >
                <CheckCircleIcon className="h-4 w-4" />
                {loading ? t('common.saving') : t('sales.confirmSale')}
              </button>
            </div>
          </div>
        </form>

        {/* New Customer Modal */}
        {showNewCustomerModal && (
          <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
            <div className="bg-white dark:bg-gray-800 p-6 rounded-lg shadow-xl max-w-md w-full mx-4">
              <h3 className="text-lg font-semibold mb-4 text-gray-900 dark:text-white">{t('sales.createNewCustomer')}</h3>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.name')} *</label>
                  <input
                    type="text"
                    value={newCustomerData.name}
                    onChange={(e) => setNewCustomerData({...newCustomerData, name: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('sales.enterCustomerName')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.phone')}</label>
                  <input
                    type="text"
                    value={newCustomerData.phone}
                    onChange={(e) => setNewCustomerData({...newCustomerData, phone: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    placeholder={t('sales.enterPhoneNumber')}
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.address')}</label>
                  <textarea
                    value={newCustomerData.address}
                    onChange={(e) => setNewCustomerData({...newCustomerData, address: e.target.value})}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    rows="2"
                    placeholder={t('sales.enterAddress')}
                  />
                </div>
              </div>
              <div className="flex gap-3 mt-6">
                <button
                  type="button"
                  onClick={() => {
                    setShowNewCustomerModal(false);
                    setNewCustomerData({ name: '', phone: '', address: '' });
                  }}
                  className="btn-form-red flex-1 text-sm"
                >
                  {t('common.cancel')}
                </button>
                <button
                  type="button"
                  onClick={handleCreateNewCustomer}
                  className="btn-form-green flex-1 text-sm"
                >
                  {t('sales.createCustomer')}
                </button>
              </div>
            </div>
          </div>
        )}
      </div>
      </div>
    </div>
  );
};

export default CreateSale;
