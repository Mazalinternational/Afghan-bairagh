import React, { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { ArrowLeftIcon, ChevronDownIcon, ChevronUpIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { normalizeNumeralString, parseLocaleFloat, parseLocaleInt } from '../../utils/numerals';
import { formatDateForInput } from '../../i18n/dateUtils';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';

const CreateQuotation = () => {
  const navigate = useNavigate();
  const { id } = useParams();
  const { t } = useTranslation();
  const isEdit = Boolean(id);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [useManualCustomer, setUseManualCustomer] = useState(false);
  const [manualCustomerName, setManualCustomerName] = useState('');
  const [toast, setToast] = useState(null);
  const [formData, setFormData] = useState({
    customer: '',
    notes: '',
    manual_serial_no: '',
    quotation_date: '',
    quotation_items: [{ item: '', quantity: 1, price_estimate: 0, sale_price: 0, flag_size: '', quality_design_type: '', manual_item_name: '', useManual: false, itemSearch: '', collapsed: false }]
  });

  useEffect(() => {
    fetchCustomers();
    fetchItems();
  }, []);

  useEffect(() => {
    if (!isEdit || !id) return;
    let cancelled = false;
    (async () => {
      try {
        const response = await api.get(`/api/quotations/${id}/`);
        if (cancelled) return;
        const quotation = response.data;
        setCustomerSearch(quotation.customer_name || '');
        setFormData({
          customer: quotation.customer,
          notes: quotation.notes || '',
          manual_serial_no: quotation.manual_serial_no || '',
          quotation_date: formatDateForInput(quotation.quotation_date) || formatDateForInput(quotation.created_at),
          quotation_items: (quotation.quotation_items || []).map((item) => {
            const purchaseStored =
              item.purchase_unit_cost != null && Number(item.purchase_unit_cost) > 0
                ? String(item.purchase_unit_cost)
                : '';
            const saleStored =
              item.price_estimate != null ? String(item.price_estimate) : '';
            return {
              item: item.item,
              quantity: item.quantity,
              price_estimate: purchaseStored,
              sale_price: saleStored,
              flag_size: item.flag_size || '',
              quality_design_type: item.quality_design_type || '',
              manual_item_name: item.manual_item_name || '',
              useManual: !item.item,
              itemSearch: item.item_name || '',
              collapsed: false
            };
          })
        });
      } catch (error) {
        console.error('Error fetching quotation:', error);
        if (!cancelled) showToast(t('quotations.failedToLoad'), 'error');
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [id, isEdit]);

  const showToast = (message, type = 'error') => {
    setToast({ message, type });
    setTimeout(() => setToast(null), 3000);
  };

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/api/customers/');
      const customersData = response.data.results || response.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      setCustomers([]);
    }
  };

  const fetchItems = async () => {
    try {
      const [inventoryRes, itemsRes] = await Promise.all([
        api.get('/api/inventory/').catch(() => ({ data: [] })),
        api.get('/api/inventory/items/').catch(() => ({ data: [] })),
      ]);
      const fromInventory = inventoryRes.data.results || inventoryRes.data || [];
      const fromItems = itemsRes.data.results || itemsRes.data || [];
      const merged = [...(Array.isArray(fromInventory) ? fromInventory : []), ...(Array.isArray(fromItems) ? fromItems : [])];
      const seen = new Set();
      const unique = merged.filter((it) => {
        const key = `${it.id || ''}-${(it.name || '').toLowerCase()}`;
        if (seen.has(key)) return false;
        seen.add(key);
        return true;
      });
      setItems(unique);
    } catch (error) {
      console.error('Error fetching items:', error);
      setItems([]);
    }
  };

  const filteredCustomers = customers.filter(c => 
    c.name.toLowerCase().includes(customerSearch.toLowerCase())
  );

  const getFilteredItems = (searchTerm) => {
    return items.filter(item => 
      item.name.toLowerCase().includes(searchTerm.toLowerCase())
    );
  };

  const handleCustomerSelect = (customer) => {
    setFormData({ ...formData, customer: customer.id });
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
  };

  const handleItemSelect = (index, item) => {
    const newItems = [...formData.quotation_items];
    newItems[index].item = item.id;
    newItems[index].itemSearch = item.name;
    newItems[index][`showDropdown_${index}`] = false;
    const cost =
      item.cost_price != null && item.cost_price !== ''
        ? String(item.cost_price)
        : '';
    const sale =
      item.unit_price != null && item.unit_price !== ''
        ? String(item.unit_price)
        : '';
    newItems[index].price_estimate = cost;
    newItems[index].sale_price = sale;
    setFormData({ ...formData, quotation_items: newItems });
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    try {
      let customerId = formData.customer;
      
      if (useManualCustomer && manualCustomerName.trim()) {
        try {
          const newCustomer = await api.post('/api/customers/', {
            name: manualCustomerName.trim(),
            phone: '0000000000',
            email: '',
            address: 'Not provided'
          });
          customerId = newCustomer.data.id;
        } catch (customerError) {
          console.error('Error creating customer:', customerError);
          showToast('Failed to create customer. Please try again.', 'error');
          return;
        }
      }

      const processedItems = await Promise.all(
        formData.quotation_items.map(async (item) => {
          if (item.useManual && item.manual_item_name.trim()) {
            try {
              const newItem = await api.post('/api/inventory/', {
                name: item.manual_item_name.trim(),
                unit_price: parseLocaleFloat(item.sale_price) || parseLocaleFloat(item.price_estimate) || 0,
                quantity: 0
              });
              return {
                item: newItem.data.id,
                quantity: parseLocaleInt(item.quantity),
                price_estimate: parseLocaleFloat(item.sale_price) || 0,
                purchase_unit_cost: parseLocaleFloat(item.price_estimate) || 0,
                flag_size: item.flag_size,
                quality_design_type: item.quality_design_type,
                manual_item_name: ''
              };
            } catch (error) {
              console.error('Error creating item:', error);
              return {
                item: null,
                quantity: parseLocaleInt(item.quantity),
                price_estimate: parseLocaleFloat(item.sale_price) || 0,
                purchase_unit_cost: parseLocaleFloat(item.price_estimate) || 0,
                flag_size: item.flag_size,
                quality_design_type: item.quality_design_type,
                manual_item_name: item.manual_item_name
              };
            }
          }
          return {
            item: item.item || null,
            quantity: parseLocaleInt(item.quantity),
            price_estimate: parseLocaleFloat(item.sale_price) || 0,
            purchase_unit_cost: parseLocaleFloat(item.price_estimate) || 0,
            flag_size: item.flag_size,
            quality_design_type: item.quality_design_type,
            manual_item_name: item.useManual ? item.manual_item_name : ''
          };
        })
      );

      const quotationData = {
        customer: customerId,
        notes: formData.notes,
        manual_serial_no: (formData.manual_serial_no || '').trim(),
        quotation_items: processedItems
      };
      if (formData.quotation_date) {
        quotationData.quotation_date = new Date(`${formData.quotation_date}T12:00:00`).toISOString();
      }

      let response;
      if (isEdit) {
        response = await api.put(`/api/quotations/${id}/`, quotationData);
        showToast(t('quotations.quotationUpdated'), 'success');
      } else {
        response = await api.post('/api/quotations/', quotationData);
        showToast(t('quotations.quotationCreated'), 'success');
      }
      setTimeout(() => navigate(`/quotations/${response.data.id}`), 1000);
    } catch (error) {
      console.error(`Error ${isEdit ? 'updating' : 'creating'} quotation:`, error);
      const errorMsg = error.response?.data?.detail || 
                       error.response?.data?.message || 
                       `Failed to ${isEdit ? 'update' : 'create'} quotation. Please try again.`;
      showToast(errorMsg, 'error');
    }
  };

  const addItem = () => {
    setFormData({
      ...formData,
      quotation_items: [...formData.quotation_items, { item: '', quantity: 1, price_estimate: 0, sale_price: 0, flag_size: '', quality_design_type: '', manual_item_name: '', useManual: false, itemSearch: '', collapsed: false }]
    });
  };

  const removeItem = (index) => {
    const newItems = formData.quotation_items.filter((_, i) => i !== index);
    setFormData({ ...formData, quotation_items: newItems });
  };

  const updateItem = (index, field, value) => {
    const newItems = [...formData.quotation_items];
    newItems[index][field] = value;
    setFormData({ ...formData, quotation_items: newItems });
  };

  const toggleItemMode = (index) => {
    const newItems = [...formData.quotation_items];
    newItems[index].useManual = !newItems[index].useManual;
    newItems[index].item = '';
    newItems[index].itemSearch = '';
    newItems[index].manual_item_name = '';
    newItems[index].quality_design_type = '';
    setFormData({ ...formData, quotation_items: newItems });
  };

  const toggleCollapse = (index) => {
    const newItems = [...formData.quotation_items];
    newItems[index].collapsed = !newItems[index].collapsed;
    setFormData({ ...formData, quotation_items: newItems });
  };

  const getItemDisplayName = (item) => {
    if (item.useManual && item.manual_item_name) {
      return item.manual_item_name;
    }
    if (item.itemSearch) {
      return item.itemSearch;
    }
    return 'New Item';
  };

  const getSaleUnitPrice = (item) => {
    return parseLocaleFloat(item.sale_price) || 0;
  };

  const calculateQuotationTotalProfit = () => {
    return formData.quotation_items.reduce((sum, item) => {
      const q = parseLocaleFloat(item.quantity) || 0;
      const purchase = parseLocaleFloat(item.price_estimate) || 0;
      const sale = getSaleUnitPrice(item);
      return sum + q * (sale - purchase);
    }, 0);
  };

  return (
    <div className="p-3 space-y-3">
      {/* Toast Notification */}
      {toast && (
        <div className={`fixed top-4 right-4 px-4 py-2 rounded-lg text-white z-50 shadow-lg ${
          toast.type === 'error' ? 'bg-red-500' : 'bg-green-500'
        }`}>
          {toast.message}
        </div>
      )}
      
      <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-xl shadow-md border border-blue-100 dark:border-gray-700">
        <div className="flex items-center gap-2">
          <button onClick={() => navigate('/quotations')} className="text-gray-600 dark:text-gray-300 hover:text-gray-900 dark:hover:text-white">
            <ArrowLeftIcon className="h-4 w-4" />
          </button>
          <div>
            <h1 className="text-lg font-bold text-gray-900 dark:text-white">{isEdit ? t('quotations.editQuotation') : t('quotations.createQuotation')}</h1>
            <p className="text-xs text-gray-600 dark:text-gray-400">{isEdit ? t('quotations.updateQuotationDetails') : t('quotations.createNewQuotation')}</p>
          </div>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="bg-white dark:bg-gray-800 rounded-xl shadow-md p-4 space-y-3">
        <div className="flex gap-2">
          <div className="flex-1 max-w-xs relative">
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotations.customer')} *</label>
            {!useManualCustomer ? (
              <>
                <input
                  type="text"
                  value={customerSearch}
                  onChange={(e) => {
                    setCustomerSearch(e.target.value);
                    setShowCustomerDropdown(true);
                  }}
                  onFocus={() => setShowCustomerDropdown(true)}
                  placeholder={t('quotations.searchCustomer')}
                  className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                  required={!useManualCustomer}
                />
                {showCustomerDropdown && filteredCustomers.length > 0 && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                    {filteredCustomers.map(customer => (
                      <div
                        key={customer.id}
                        onClick={() => handleCustomerSelect(customer)}
                        className="px-3 py-2 text-sm hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white"
                      >
                        {customer.name}
                      </div>
                    ))}
                  </div>
                )}
              </>
            ) : (
              <input
                type="text"
                value={manualCustomerName}
                onChange={(e) => setManualCustomerName(e.target.value)}
                placeholder={t('quotations.enterCustomerName')}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                required={useManualCustomer}
              />
            )}
          </div>
          <div className="flex items-end">
            <button
              type="button"
              onClick={() => {
                setUseManualCustomer(!useManualCustomer);
                setCustomerSearch('');
                setManualCustomerName('');
                setFormData({ ...formData, customer: '' });
              }}
              className="px-3 py-2 text-xs bg-gray-600 text-white rounded-lg hover:bg-gray-700 whitespace-nowrap"
            >
              {useManualCustomer ? t('quotations.selectExisting') : t('quotations.addNewCustomer')}
            </button>
          </div>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-2">{t('quotations.items')} *</label>
          <div className="space-y-2">
            {formData.quotation_items.map((item, index) => (
              <div key={index} className="border border-gray-300 dark:border-gray-600 rounded-lg overflow-hidden">
                <div 
                  className="bg-gray-100 dark:bg-gray-700 px-3 py-2 flex items-center justify-between cursor-pointer hover:bg-gray-200 dark:hover:bg-gray-600"
                  onClick={() => toggleCollapse(index)}
                >
                  <div className="flex items-center gap-2">
                    {item.collapsed ? (
                      <ChevronDownIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    ) : (
                      <ChevronUpIcon className="h-4 w-4 text-gray-600 dark:text-gray-300" />
                    )}
                    <span className="text-sm font-medium text-gray-900 dark:text-white">
                      {t('quotations.item')} {index + 1}: {getItemDisplayName(item)}
                    </span>
                    {item.quantity && getSaleUnitPrice(item) > 0 && (
                      <span className="text-xs text-gray-600 dark:text-gray-400">
                        (Qty: {item.quantity} × AFN {getSaleUnitPrice(item).toFixed(2)} = AFN {(parseLocaleFloat(item.quantity) * getSaleUnitPrice(item)).toFixed(2)})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={(e) => {
                      e.stopPropagation();
                      removeItem(index);
                    }}
                    className="text-red-600 hover:text-red-800 text-xs font-medium px-2 py-1 rounded hover:bg-red-50 dark:hover:bg-red-900/20"
                  >
                    {t('quotations.remove')}
                  </button>
                </div>

                {!item.collapsed && (
                  <div className="p-3 space-y-2 bg-white dark:bg-gray-800">
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.itemName')} *</label>
                        <div className="relative">
                          {!item.useManual ? (
                            <>
                              <input
                                type="text"
                                value={item.itemSearch}
                                onChange={(e) => {
                                  updateItem(index, 'itemSearch', e.target.value);
                                  updateItem(index, `showDropdown_${index}`, true);
                                }}
                                onFocus={() => updateItem(index, `showDropdown_${index}`, true)}
                                placeholder={t('quotations.searchItem')}
                                className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                              />
                              {item[`showDropdown_${index}`] && getFilteredItems(item.itemSearch).length > 0 && (
                                <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-32 overflow-y-auto">
                                  {getFilteredItems(item.itemSearch).map(itm => (
                                    <div
                                      key={itm.id}
                                      onClick={() => handleItemSelect(index, itm)}
                                      className="px-2 py-1.5 text-xs hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer text-gray-900 dark:text-white"
                                    >
                                      {itm.name}
                                    </div>
                                  ))}
                                </div>
                              )}
                            </>
                          ) : (
                            <input
                              type="text"
                              value={item.manual_item_name}
                              onChange={(e) => updateItem(index, 'manual_item_name', e.target.value)}
                              placeholder="Item name..."
                              className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                              required
                            />
                          )}
                        </div>
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.mode')}</label>
                        <button
                          type="button"
                          onClick={() => toggleItemMode(index)}
                          className="w-full px-2 py-1.5 text-xs bg-green-600 text-white rounded-lg hover:bg-green-700"
                        >
                          {item.useManual ? t('quotations.switchToSelect') : t('quotations.switchToManual')}
                        </button>
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.flagSize')}</label>
                        <input
                          type="text"
                          placeholder={t('quotations.flagSizePlaceholder')}
                          value={item.flag_size}
                          onChange={(e) => updateItem(index, 'flag_size', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.designType')}</label>
                        <input
                          type="text"
                          placeholder={t('quotations.designTypePlaceholder')}
                          value={item.quality_design_type}
                          onChange={(e) => updateItem(index, 'quality_design_type', e.target.value)}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                        />
                      </div>
                    </div>

                    <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.quantity')} *</label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder="Quantity"
                          value={item.quantity}
                          onChange={(e) => updateItem(index, 'quantity', normalizeNumeralString(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.purchasePrice')} *</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="Price"
                          value={item.price_estimate}
                          onChange={(e) => updateItem(index, 'price_estimate', normalizeNumeralString(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>

                      <div>
                        <label className="block text-[10px] font-medium text-gray-600 dark:text-gray-400 mb-1">{t('quotations.salePriceWithProfit')}</label>
                        <input
                          type="text"
                          inputMode="decimal"
                          placeholder="0"
                          value={item.sale_price}
                          onChange={(e) => updateItem(index, 'sale_price', normalizeNumeralString(e.target.value))}
                          className="w-full px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                          required
                        />
                      </div>
                    </div>

                    {item.quantity && item.price_estimate && (
                      <div className="bg-blue-50 dark:bg-blue-900/20 p-2 rounded-lg">
                        <p className="text-xs text-blue-700 dark:text-blue-300 font-semibold">
                          {t('quotations.purchaseSubtotal')}: AFN {(parseLocaleFloat(item.quantity) * parseLocaleFloat(item.price_estimate)).toFixed(2)}
                        </p>
                        <p className="text-xs text-green-700 dark:text-green-300 font-semibold mt-1">
                          {t('quotations.saleSubtotal')}: AFN {(parseLocaleFloat(item.quantity) * getSaleUnitPrice(item)).toFixed(2)}
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
          <button
            type="button"
            onClick={addItem}
            className="mt-2 text-blue-600 hover:text-blue-800 text-xs font-medium"
          >
            {t('quotations.addItem')}
          </button>
        </div>

        {formData.quotation_items.length > 0 && (
          <div className="bg-purple-50 dark:bg-purple-900/20 border border-purple-200 dark:border-purple-800 rounded-lg p-3">
            <p className="text-sm font-semibold text-purple-800 dark:text-purple-200">
              {t('orders.totalProfitLabel')}: AFN {calculateQuotationTotalProfit().toFixed(2)}
            </p>
          </div>
        )}

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('customers.manualSerialNo')}</label>
          <input
            type="text"
            value={formData.manual_serial_no}
            onChange={(e) => setFormData({ ...formData, manual_serial_no: e.target.value })}
            className="w-full max-w-md px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            placeholder={t('customers.manualSerialNoPlaceholder')}
          />
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotations.quotationDateLabel')}</label>
          <LocalizedDateInput
            value={formData.quotation_date}
            onChange={(dateValue) => setFormData({ ...formData, quotation_date: dateValue })}
            className="w-full max-w-xs px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
          />
          <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-1">{t('quotations.quotationDateHelp')}</p>
        </div>

        <div>
          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('quotations.notes')}</label>
          <textarea
            value={formData.notes}
            onChange={(e) => setFormData({ ...formData, notes: e.target.value })}
            className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
            rows="2"
          />
        </div>

        <div className="flex gap-2 flex-wrap">
          <button
            type="button"
            onClick={() => navigate('/quotations')}
            className="btn-form-red text-sm"
          >
            {t('common.cancel')}
          </button>
          <button
            type="submit"
            className="btn-form-green text-sm"
          >
            {isEdit ? t('quotations.update') : t('quotations.create')}
          </button>
        </div>
      </form>
    </div>
  );
};

export default CreateQuotation;
