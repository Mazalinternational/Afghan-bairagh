import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
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
import { effectivePurchaseUnitFromInventory } from '../../utils/saleItemCost';
import { useToast } from '../../context/ToastContext';
import PageHeader from '../../components/common/PageHeader';

const emptySaleItem = () => ({
  item: '',
  quantity: 1,
  price_per_unit: '',
  stock_type: 'press_stock',
  flag_size: '',
  flag_stand_size: '',
  quality_design_type: ''
});

const EditSale = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const { addToast } = useToast();

  const [pageLoading, setPageLoading] = useState(true);
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

  const [saleItems, setSaleItems] = useState([emptySaleItem()]);

  useEffect(() => {
    fetchItems();
    fetchSaleAndCustomers();
  }, [id]);

  const fetchCustomersList = async () => {
    const response = await api.get('/api/customers/');
    const raw = response.data;
    return Array.isArray(raw) ? raw : (raw?.results ?? []);
  };

  const fetchSaleAndCustomers = async () => {
    try {
      setPageLoading(true);
      const [sale, custList] = await Promise.all([
        api.get(`/api/sales/${id}/`).then((r) => r.data),
        fetchCustomersList()
      ]);

      setCustomers(custList);

      if (sale.status === 'Cancelled') {
        addToast(t('sales.editSaleCancelledCannotEdit'), 'error');
        navigate(`/sales/${id}`);
        return;
      }

      const cid = sale.customer;
      const cust = custList.find((c) => c.id === cid);
      setCustomerSearchInput(cust ? cust.name : '');
      setFormData({
        customer: cid || '',
        customer_name: '',
        discount: sale.discount ?? 0,
        tax: sale.tax ?? 0,
        notes: sale.notes || ''
      });

      if (sale.items && sale.items.length > 0) {
        setSaleItems(
          sale.items.map((item) => ({
            item: item.item,
            quantity: item.quantity,
            price_per_unit: item.price_per_unit,
            stock_type: item.stock_type || 'press_stock',
            flag_size: item.flag_size || '',
            flag_stand_size: item.flag_stand_size || '',
            quality_design_type: item.quality_design_type || ''
          }))
        );
      } else {
        setSaleItems([emptySaleItem()]);
      }
    } catch (error) {
      console.error('Error fetching sale:', error);
      addToast(t('sales.editSaleLoadFailed'), 'error');
      navigate('/sales');
    } finally {
      setPageLoading(false);
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

  const addSaleItem = () => {
    setSaleItems([...saleItems, emptySaleItem()]);
  };

  const removeSaleItem = (index) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter((_, i) => i !== index));
    }
  };

  const updateSaleItem = (index, field, value) => {
    const updated = [...saleItems];
    updated[index][field] = value;

    if (field === 'item' && value) {
      const selectedItem = items.find((item) => item.id === parseInt(value, 10));
      if (selectedItem) {
        updated[index].price_per_unit = selectedItem.unit_price ?? '';
      }
    }

    setSaleItems(updated);
  };

  const getItemStock = (itemIdOrObj, stockType) => {
    const idVal = itemIdOrObj != null && typeof itemIdOrObj === 'object' ? itemIdOrObj.id : itemIdOrObj;
    const list = Array.isArray(items) ? items : [];
    const row = list.find((i) => String(i.id) === String(idVal));
    if (!row) return 0;
    return stockType === 'press_stock' ? (row.press_stock ?? 0) : (row.home_stock ?? 0);
  };

  const getInventoryItemForLine = (saleItem) => {
    if (!saleItem?.item) return null;
    const list = Array.isArray(items) ? items : [];
    return list.find((i) => String(i.id) === String(saleItem.item)) || null;
  };

  const getEffectiveCostMeta = (saleItem) => {
    const inv = getInventoryItemForLine(saleItem);
    return effectivePurchaseUnitFromInventory(inv);
  };

  const calculateTotal = () => {
    const subtotal = saleItems.reduce((sum, row) => {
      return sum + parseLocaleFloat(row.quantity) * parseLocaleFloat(row.price_per_unit || 0);
    }, 0);

    const totalCost = saleItems.reduce((sum, saleItem) => {
      const unitCost = getEffectiveCostMeta(saleItem).value;
      if (unitCost == null) return sum;
      return sum + parseLocaleFloat(saleItem.quantity) * unitCost;
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
    if (!formData.customer) {
      addToast(t('orders.errCustomerRequired'), 'error');
      return false;
    }

    for (let i = 0; i < saleItems.length; i++) {
      const row = saleItems[i];

      if (!row.item) {
        addToast(`${t('sales.selectItem')} (Item ${i + 1})`, 'error');
        return false;
      }

      const q = parseLocaleFloat(row.quantity);
      if (!row.quantity || Number.isNaN(q) || q <= 0) {
        addToast(`${t('sales.quantityMustBeGreaterThanZero')} (${t('sales.itemNumber', { n: i + 1 })})`, 'error');
        return false;
      }

      const p = parseLocaleFloat(row.price_per_unit);
      if (!row.price_per_unit || Number.isNaN(p) || p <= 0) {
        addToast(`${t('sales.priceMustBeGreaterThanZero')} (${t('sales.itemNumber', { n: i + 1 })})`, 'error');
        return false;
      }

      const availableStock = getItemStock(row.item, row.stock_type);
      if (availableStock < q) {
        addToast(
          t('sales.insufficientStockForItem', {
            stockType: row.stock_type === 'press_stock' ? t('sales.pressStock') : t('sales.homeStock'),
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
        customer: parseLocaleInt(formData.customer),
        discount: parseLocaleFloat(formData.discount) || 0,
        tax: parseLocaleFloat(formData.tax) || 0,
        notes: formData.notes,
        items: saleItems.map((row) => ({
          item: parseLocaleInt(row.item),
          quantity: parseLocaleInt(row.quantity),
          price_per_unit: parseLocaleFloat(row.price_per_unit),
          stock_type: row.stock_type,
          flag_size: row.flag_size,
          flag_stand_size: row.flag_stand_size || '',
          quality_design_type: row.quality_design_type
        })),
        status: 'Draft'
      };

      await api.put(`/api/sales/${id}/`, payload);

      if (confirm) {
        await api.post(`/api/sales/${id}/confirm/`);
        addToast(t('sales.saleConfirmed'), 'success');
      } else {
        addToast(t('sales.editSaleUpdatedSuccess'), 'success');
      }

      navigate(`/sales/${id}`);
    } catch (error) {
      console.error('Error updating sale:', error);
      addToast(error.response?.data?.error || t('sales.editSaleUpdateFailed'), 'error');
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

      const newId = response.data?.id;
      const refreshed = await fetchCustomersList();
      setCustomers(refreshed);
      if (newId) {
        setFormData((prev) => ({ ...prev, customer: newId }));
        setCustomerSearchInput(newCustomerData.name.trim());
      }
      setNewCustomerData({ name: '', phone: '', address: '' });
      setShowNewCustomerModal(false);
      addToast(t('sales.customerCreatedSuccessfully'), 'success');
    } catch (error) {
      console.error('Error creating customer:', error);
      addToast(t('sales.failedToCreateCustomer'), 'error');
    }
  };

  const totals = calculateTotal();

  if (pageLoading) {
    return (
      <div className="flex flex-col justify-center items-center gap-2 min-h-screen text-gray-600 dark:text-gray-400">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
        <span className="text-sm">{t('common.loading')}</span>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-3 p-3">
          <PageHeader
            title={t('sales.editSaleTitle', { id })}
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
                      const match = customers.find((c) => c.name.toLowerCase().includes(value.toLowerCase()));
                      if (match) {
                        setFormData((prev) => ({ ...prev, customer: match.id }));
                      } else {
                        setFormData((prev) => ({ ...prev, customer: '' }));
                      }
                    }}
                    placeholder={t('sales.searchCustomerPlaceholder')}
                    className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                    list="customers-list-edit-sale"
                  />
                  <datalist id="customers-list-edit-sale">
                    {customers.map((customer) => (
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
                      setFormData((prev) => ({ ...prev, customer: '' }));
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

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex items-center justify-between mb-3">
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white">{t('sales.saleItems')}</h2>
                <button type="button" onClick={addSaleItem} className="btn-form-green flex items-center gap-1">
                  <PlusIcon className="h-4 w-4" />
                  {t('sales.addItem')}
                </button>
              </div>

              <div className="space-y-3">
                {saleItems.map((saleItem, index) => (
                  <div
                    key={index}
                    className="border border-gray-200 dark:border-gray-600 rounded-lg p-3 bg-gray-50 dark:bg-gray-700/50"
                  >
                    <div className="pt-2">
                      <div className="grid grid-cols-1 sm:grid-cols-3 gap-x-3 gap-y-2">
                        <div className="sm:col-span-3">
                          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('sales.item')}</label>
                          <div className="h-8">
                            <select
                              value={saleItem.item != null ? (typeof saleItem.item === 'object' ? String(saleItem.item.id) : String(saleItem.item)) : ''}
                              onChange={(e) => {
                                const val = e.target.value;
                                const selected = val ? (Array.isArray(items) ? items : []).find((i) => String(i.id) === val) : null;
                                updateSaleItem(index, 'item', selected ? selected.id : '');
                                if (selected) updateSaleItem(index, 'price_per_unit', selected.unit_price ?? '');
                              }}
                              className="w-full h-full min-h-0 px-2 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 box-border"
                              required
                            >
                              <option value="">{t('sales.selectItem')}</option>
                              {(Array.isArray(items) ? items : []).map((invItem) => (
                                <option key={invItem.id} value={String(invItem.id)}>{invItem.name}</option>
                              ))}
                            </select>
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('sales.quantity')}</label>
                          <div className="h-8">
                            <input type="text" inputMode="numeric" value={saleItem.quantity} onChange={(e) => updateSaleItem(index, 'quantity', normalizeNumeralString(e.target.value))} className="w-full h-full min-h-0 px-2 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md box-border" required />
                          </div>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('sales.purchaseCostPerUnit')}</label>
                          <div className="h-8">
                            <input type="text" readOnly className="w-full h-full min-h-0 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white box-border" value={(() => {
                              if (!saleItem.item) return '—';
                              const meta = getEffectiveCostMeta(saleItem);
                              if (meta.value != null) return `AFN ${meta.value.toFixed(2)}`;
                              if (meta.listUnitPrice != null) return `${t('sales.costNotSetShort')} — ${t('sales.listPriceReference')} AFN ${meta.listUnitPrice.toFixed(2)}`;
                              return t('sales.costNotSetShort');
                            })()} />
                          </div>
                          <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5 min-h-[1.5rem]">
                            {saleItem.item ? (() => {
                              const meta = getEffectiveCostMeta(saleItem);
                              if (meta.source === 'inventory') return t('sales.purchaseCostSourceInventory');
                              if (meta.source === 'supplier') return t('sales.purchaseCostSourceSupplier');
                              if (meta.listUnitPrice != null) return t('sales.purchaseCostNoCostListPriceHint');
                              return t('sales.costNotSetInInventory');
                            })() : '\u00a0'}
                          </p>
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('sales.sellingPricePerUnit')}</label>
                          <div className="h-8">
                            <input type="text" inputMode="decimal" value={saleItem.price_per_unit} onChange={(e) => updateSaleItem(index, 'price_per_unit', normalizeNumeralString(e.target.value))} className="w-full h-full min-h-0 px-2 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:ring-1 focus:ring-blue-500 box-border" required />
                          </div>
                          <div className="mt-0.5 min-h-[1.5rem]" aria-hidden="true" />
                        </div>

                        <div>
                          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('sales.stockType')}</label>
                          <div className="h-8">
                            <select value={saleItem.stock_type} onChange={(e) => updateSaleItem(index, 'stock_type', e.target.value)} className="w-full h-full min-h-0 px-2 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md box-border">
                              <option value="press_stock">{t('sales.pressStock')}</option>
                              <option value="home_stock">{t('sales.homeStock')}</option>
                            </select>
                          </div>
                          <p className="text-[10px] leading-tight text-gray-500 dark:text-gray-400 mt-0.5 min-h-[1.5rem]">
                            {saleItem.item ? `${t('sales.availableStock')}: ${getItemStock(saleItem.item, saleItem.stock_type)}` : '\u00a0'}
                          </p>
                        </div>

                        <div className="sm:col-span-2">
                          <label className="block text-[11px] font-medium text-gray-700 dark:text-gray-300 mb-0.5">{t('sales.total')}</label>
                          <div className="h-8">
                            <input type="text" readOnly className="w-full h-full min-h-0 px-2 text-xs border border-gray-300 dark:border-gray-600 rounded-md bg-gray-50 dark:bg-gray-700 dark:text-white box-border" value={`AFN ${(parseLocaleFloat(saleItem.quantity) * parseLocaleFloat(saleItem.price_per_unit || 0)).toFixed(2)}`} />
                          </div>
                          <div className="mt-0.5 min-h-[1.5rem]" aria-hidden="true" />
                        </div>
                      </div>
                    </div>

                    {saleItem.item ? (
                      <div className="mt-2 rounded-lg border border-blue-100 dark:border-blue-900/50 bg-blue-50/70 dark:bg-blue-950/25 px-3 py-2 text-[11px] leading-snug text-gray-700 dark:text-gray-300">
                        {(() => {
                          const meta = getEffectiveCostMeta(saleItem);
                          const unitCost = meta.value;
                          const qty = parseLocaleFloat(saleItem.quantity) || 0;
                          const unitSell = parseLocaleFloat(saleItem.price_per_unit || 0) || 0;
                          if (unitCost == null) {
                            return (
                              <p>
                                {meta.listUnitPrice != null
                                  ? t('sales.lineProfitNeedsCostOrUseList', { list: meta.listUnitPrice.toFixed(2) })
                                  : t('sales.costNotSetInInventory')}
                              </p>
                            );
                          }
                          const lineProfit = qty * (unitSell - unitCost);
                          return (
                            <div className="space-y-1">
                              <p>
                                <span className="font-semibold text-gray-900 dark:text-white">
                                  {t('sales.lineProfitAtYourPrice')}{' '}
                                </span>
                                <span className={lineProfit >= 0 ? 'text-green-700 dark:text-green-400 font-semibold' : 'text-red-600 dark:text-red-400 font-semibold'}>
                                  AFN {lineProfit.toFixed(2)}
                                </span>
                                <span className="text-gray-500 dark:text-gray-400"> — {t('sales.lineProfitHint')}</span>
                              </p>
                              <p className="text-gray-600 dark:text-gray-400">
                                {t('sales.profitIfSoldAtCost', { cost: unitCost.toFixed(2) })}
                                <span className="font-semibold text-gray-800 dark:text-gray-200"> AFN 0.00</span>
                                {qty > 0 ? ` ${t('sales.forThisLineQty', { qty: qty.toFixed(0) })}` : null}
                              </p>
                            </div>
                          );
                        })()}
                      </div>
                    ) : null}

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
                  <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('sales.tax')}</label>
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
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.totalPurchaseCost')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">AFN {totals.totalCost.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-sm">
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.profit')}:</span>
                  <span
                    className={`font-medium ${totals.profit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}
                  >
                    AFN {totals.profit.toFixed(2)}
                  </span>
                </div>
                <p className="text-[10px] text-gray-500 dark:text-gray-400">{t('sales.profitSummaryFootnote')}</p>
                <div className="flex justify-between text-base font-bold border-t border-gray-200 dark:border-gray-700 pt-2 mt-2">
                  <span className="text-gray-900 dark:text-white">{t('sales.netAmount')}:</span>
                  <span className="text-blue-600 dark:text-blue-400">AFN {totals.total.toFixed(2)}</span>
                </div>
              </div>
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('sales.notes')}</label>
              <textarea
                value={formData.notes}
                onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
                rows="2"
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
                placeholder={t('sales.additionalNotesPlaceholder')}
              />
            </div>

            <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-4">
              <div className="flex gap-2 justify-end flex-wrap">
                <button type="button" onClick={() => navigate(-1)} className="btn-form-red text-sm" disabled={loading}>
                  {t('common.cancel')}
                </button>
                <button type="submit" className="btn-form-green text-sm" disabled={loading}>
                  {loading ? t('common.saving') : t('sales.editSaleSubmit')}
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
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, name: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('sales.enterCustomerName')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.phone')}</label>
                    <input
                      type="text"
                      value={newCustomerData.phone}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, phone: e.target.value })}
                      className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      placeholder={t('sales.enterPhoneNumber')}
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">{t('common.address')}</label>
                    <textarea
                      value={newCustomerData.address}
                      onChange={(e) => setNewCustomerData({ ...newCustomerData, address: e.target.value })}
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
                  <button type="button" onClick={handleCreateNewCustomer} className="btn-form-green flex-1 text-sm">
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

export default EditSale;
