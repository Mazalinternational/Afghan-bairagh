import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import {
  MagnifyingGlassIcon,
  PlusIcon,
  TrashIcon,
  ShoppingCartIcon,
  UserIcon,
  CurrencyDollarIcon,
  CheckCircleIcon,
  XMarkIcon,
  PrinterIcon,
  CubeIcon,
  ChevronDownIcon,
  ChevronUpIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import PaymentModal from '../../components/orders/PaymentModal';
import PrintableBill from '../../components/orders/PrintableBill';

const Sales = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  
  // State management
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [flagDesignTypes, setFlagDesignTypes] = useState([]);
  const [newDesignType, setNewDesignType] = useState('');
  const [showAddDesignType, setShowAddDesignType] = useState(false);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState(null);
  const [customerDetails, setCustomerDetails] = useState(null);
  
  const [saleItems, setSaleItems] = useState([{
    id: Date.now(),
    item: null,
    item_id: '',
    item_name: '',
    quantity: '',
    price_per_unit: '',
    quality_design_type: '',
    stock_type: 'press_stock',
    total: 0,
    stock_available: 0
  }]);
  
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'cash',
    is_full_payment: true,
    notes: ''
  });
  
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});
  const [createdOrders, setCreatedOrders] = useState([]);
  const [showBill, setShowBill] = useState(false);
  const [itemsSectionCollapsed, setItemsSectionCollapsed] = useState(false);

  // Fetch data on mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchFlagDesignTypes();
  }, []);

  // Calculate totals
  const calculateTotals = useCallback(() => {
    const subtotal = saleItems.reduce((sum, item) => {
      const qty = parseFloat(item.quantity) || 0;
      const price = parseFloat(item.price_per_unit) || 0;
      return sum + (qty * price);
    }, 0);
    
    return {
      subtotal,
      total: subtotal,
      itemCount: saleItems.filter(item => item.item_id && item.quantity).length
    };
  }, [saleItems]);

  const totals = calculateTotals();

  const fetchCustomers = async () => {
    try {
      const response = await api.get('/api/customers/');
      setCustomers(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error fetching customers:', error);
      addToast(t('sales.failedToFetchCustomers'), 'error');
    }
  };

  const fetchItems = async () => {
    try {
      const response = await api.get('/api/inventory/items/');
      const itemsData = Array.isArray(response.data) ? response.data : response.data.results || [];
      // Ensure items have required fields with defaults - process each item
      const processedItems = itemsData.map(item => {
        // If press_stock/home_stock don't exist yet (migrations not run), use current_stock as fallback
        const pressStock = item.press_stock !== undefined && item.press_stock !== null 
          ? item.press_stock 
          : (item.current_stock || 0);
        const homeStock = item.home_stock !== undefined && item.home_stock !== null 
          ? item.home_stock 
          : 0;
        
        return {
          ...item,
          press_stock: pressStock,
          home_stock: homeStock,
          current_stock: item.current_stock ?? (pressStock + homeStock)
        };
      });
      setItems(processedItems);
    } catch (error) {
      console.error('Error fetching items:', error);
      addToast(t('sales.failedToFetchItems'), 'error');
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    try {
      const response = await api.get(`/api/customers/${customerId}/`);
      setCustomerDetails(response.data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const fetchFlagDesignTypes = async () => {
    try {
      const response = await api.get('/api/inventory/flag-design-types/');
      setFlagDesignTypes(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error fetching flag design types:', error);
    }
  };

  const handleAddDesignType = async () => {
    if (!newDesignType.trim()) return;
    try {
      const res = await api.post('/api/inventory/flag-design-types/', {
        name: newDesignType.trim(),
        description: ''
      });
      setFlagDesignTypes([...flagDesignTypes, res.data]);
      setNewDesignType('');
      setShowAddDesignType(false);
      addToast(t('sales.designTypeAdded'), 'success');
    } catch (err) {
      console.error('Error adding design type:', err);
      addToast(t('sales.failedToAddDesignType'), 'error');
    }
  };

  const filteredCustomers = customers.filter(customer =>
    customer.name?.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone?.includes(customerSearch)
  );

  const handleCustomerSelect = (customer) => {
    setSelectedCustomer(customer);
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    fetchCustomerDetails(customer.id);
  };

  const handleAddItem = () => {
    setSaleItems([...saleItems, {
      id: Date.now(),
      item: null,
      item_id: '',
      item_name: '',
      quantity: '',
      price_per_unit: '',
      total: 0,
      stock_available: 0
    }]);
  };

  const handleRemoveItem = (itemId) => {
    if (saleItems.length > 1) {
      setSaleItems(saleItems.filter(item => item.id !== itemId));
    } else {
      addToast(t('sales.atLeastOneItem'), 'error');
    }
  };

  const handleItemChange = (itemId, field, value) => {
    setSaleItems(saleItems.map(item => {
      if (item.id === itemId) {
        const updated = { ...item, [field]: value };
        
        // When item is selected, update item details
        if (field === 'item_id' && value) {
          const selectedItem = items.find(i => i.id === parseInt(value));
          if (selectedItem) {
            updated.item = selectedItem;
            updated.item_name = selectedItem.name;
            updated.price_per_unit = selectedItem.unit_price || '';
            // Update stock_available based on current stock_type
            const stockType = updated.stock_type || 'press_stock';
            // Get the actual stock value - ensure we're reading from the processed item data
            // Check if press_stock/home_stock exist, otherwise fallback to current_stock
            let pressStock = 0;
            let homeStock = 0;
            
            if (selectedItem.press_stock !== undefined && selectedItem.press_stock !== null) {
              pressStock = selectedItem.press_stock;
            } else if (selectedItem.current_stock !== undefined) {
              pressStock = selectedItem.current_stock; // Fallback to current_stock if press_stock not available
            }
            
            if (selectedItem.home_stock !== undefined && selectedItem.home_stock !== null) {
              homeStock = selectedItem.home_stock;
            }
            
            updated.stock_available = stockType === 'press_stock' ? pressStock : homeStock;
          }
        }
        // Update stock_available when stock_type changes
        if (field === 'stock_type' && updated.item_id) {
          const selectedItem = items.find(i => i.id === parseInt(updated.item_id));
          if (selectedItem) {
            // Get the actual stock value - ensure we're reading from the processed item data
            let pressStock = 0;
            let homeStock = 0;
            
            if (selectedItem.press_stock !== undefined && selectedItem.press_stock !== null) {
              pressStock = selectedItem.press_stock;
            } else if (selectedItem.current_stock !== undefined) {
              pressStock = selectedItem.current_stock; // Fallback to current_stock if press_stock not available
            }
            
            if (selectedItem.home_stock !== undefined && selectedItem.home_stock !== null) {
              homeStock = selectedItem.home_stock;
            }
            
            updated.stock_available = value === 'press_stock' ? pressStock : homeStock;
          }
        }
        
        // Calculate total when quantity or price changes
        if (field === 'quantity' || field === 'price_per_unit') {
          const qty = parseFloat(updated.quantity) || 0;
          const price = parseFloat(updated.price_per_unit) || 0;
          updated.total = qty * price;
        }
        
        return updated;
      }
      return item;
    }));
    
    // Clear errors for this field
    if (errors[`item_${itemId}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item_${itemId}_${field}`];
        return newErrors;
      });
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!selectedCustomer) {
      newErrors.customer = t('sales.pleaseSelectCustomer');
    }
    
    saleItems.forEach((item, index) => {
      if (!item.item_id) {
        newErrors[`item_${item.id}_item`] = t('sales.pleaseSelectItem');
      }
      if (!item.quantity || parseFloat(item.quantity) <= 0) {
        newErrors[`item_${item.id}_quantity`] = t('sales.quantityRequired');
      }
      if (item.item && parseFloat(item.quantity) > item.stock_available) {
        newErrors[`item_${item.id}_quantity`] = t('sales.insufficientStock', { count: item.stock_available });
      }
      if (!item.price_per_unit || parseFloat(item.price_per_unit) <= 0) {
        newErrors[`item_${item.id}_price`] = t('sales.priceRequired');
      }
    });
    
    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleProceedToPayment = () => {
    if (!validateForm()) {
      addToast(t('sales.fixErrors'), 'error');
      return;
    }
    
    setPaymentData({
      amount: totals.total.toFixed(2),
      payment_method: 'cash',
      is_full_payment: true,
      notes: ''
    });
    setShowPaymentModal(true);
  };

  const handlePaymentSubmit = async (paymentInfo) => {
    setLoading(true);
    try {
      // Create order for each item (or combine into one order with multiple items)
      // For now, we'll create separate orders for each item to match existing structure
      const createdOrders = [];
      
      for (const saleItem of saleItems.filter(item => item.item_id && item.quantity)) {
        const orderData = {
          customer: selectedCustomer.id,
          item: parseInt(saleItem.item_id),
          flag_size: saleItem.item_name, // Using item name as flag_size for now
          quality_design_type: saleItem.quality_design_type || '',
          stock_type: saleItem.stock_type || 'press_stock',
          price_per_unit: parseFloat(saleItem.price_per_unit),
          quantity: parseInt(saleItem.quantity),
          status: 'Pending'
        };
        
        const orderResponse = await api.post('/api/orders/', orderData);
        createdOrders.push(orderResponse.data);
        
        // Add payment if provided
        if (paymentInfo.amount && parseFloat(paymentInfo.amount) > 0) {
          const paymentAmount = paymentInfo.is_full_payment 
            ? parseFloat(saleItem.total)
            : (parseFloat(paymentInfo.amount) / totals.total) * parseFloat(saleItem.total);
          
          if (paymentAmount > 0) {
            // Convert payment method to lowercase to match backend choices
            const paymentMethod = paymentInfo.payment_method.toLowerCase().replace(/\s+/g, '_');
            
            await api.post('/api/order-payments/', {
              order: orderResponse.data.id,
              amount_paid: paymentAmount,
              payment_method: paymentMethod,
              notes: paymentInfo.notes || ''
            });
          }
        }
      }
      
      // Mark orders as completed if full payment
      if (paymentInfo.is_full_payment && parseFloat(paymentInfo.amount) >= totals.total) {
        for (const order of createdOrders) {
          await api.post(`/api/orders/${order.id}/complete/`);
        }
      }
      
      // Refresh orders to get updated payment info
      const refreshedOrders = [];
      for (const order of createdOrders) {
        const refreshed = await api.get(`/api/orders/${order.id}/`);
        refreshedOrders.push(refreshed.data);
      }
      
      setCreatedOrders(refreshedOrders);
      setShowPaymentModal(false);
      setShowBill(true);
      addToast(t('sales.saleCompletedSuccess'), 'success');
      
      // Don't auto-reset - let user view/print bill and manually reset when ready
      
    } catch (error) {
      console.error('Error processing sale:', error);
      const errorMsg = error.response?.data?.detail || error.response?.data?.message || 'Failed to process sale';
      addToast(errorMsg, 'error');
    } finally {
      setLoading(false);
    }
  };

  const resetForm = () => {
    setSelectedCustomer(null);
    setCustomerSearch('');
    setCustomerDetails(null);
    setSaleItems([{
      id: Date.now(),
      item: null,
      item_id: '',
      item_name: '',
      quantity: '',
      price_per_unit: '',
      total: 0,
      stock_available: 0
    }]);
    setCreatedOrders([]);
    setShowBill(false);
    setErrors({});
  };

  const handlePrintBill = () => {
    window.print();
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
        <div className="space-y-2 p-2 sm:p-3">
      {/* Header */}
      <div className="bg-blue-50 dark:bg-gray-800 p-3 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl relative overflow-hidden">
        {/* Decorative shapes */}
        <div className="absolute -top-6 -right-6 w-20 h-20 bg-blue-300/60 dark:bg-blue-600/40 rounded-full opacity-50" />
        <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-blue-300/60 dark:bg-blue-600/40 rounded-full opacity-30" />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex items-center gap-2">
            <ShoppingCartIcon className="h-5 w-5 text-blue-600 dark:text-blue-400" />
            <div>
              <h1 className="text-base font-bold text-gray-900 dark:text-white">{t('sales.title')}</h1>
              <p className="text-gray-600 dark:text-gray-400 text-xs">{t('sales.subtitle')}</p>
            </div>
          </div>
          <button
            onClick={() => navigate('/orders')}
            className="px-3 py-3 bg-green-500/80 hover:bg-green-600/80 text-white rounded-full transition-all text-xs backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20"
          >
            {t('sales.viewOrders')}
          </button>
        </div>
      </div>

      {/* Bill Preview (when sale is completed) */}
      {showBill && createdOrders.length > 0 && (
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 border border-gray-200 dark:border-gray-700">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-base font-bold text-gray-900 dark:text-white">Sale Completed!</h2>
            <div className="flex gap-1.5">
              <button
                onClick={handlePrintBill}
                className="px-2.5 py-1 bg-blue-600 text-white rounded-lg hover:bg-blue-700 flex items-center gap-1 text-xs"
              >
                <PrinterIcon className="h-3.5 w-3.5" />
                {t('sales.printBill')}
              </button>
              <button
                onClick={() => {
                  setShowBill(false);
                  resetForm();
                }}
                className="px-2.5 py-1 bg-gray-500 text-white rounded-lg hover:bg-gray-600 text-xs"
              >
                {t('sales.newSale')}
              </button>
            </div>
          </div>
          
          <div className="border-t border-gray-200 dark:border-gray-700 pt-3 mb-3">
            <div className="grid grid-cols-2 gap-2 text-xs">
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('sales.ordersCreated')}:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                  {createdOrders.map(o => `#${o.id}`).join(', ')}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('sales.customer')}:</span>
                <span className="ml-2 font-semibold text-gray-900 dark:text-white">
                  {customerDetails?.name || selectedCustomer?.name}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('sales.totalAmount')}:</span>
                <span className="ml-2 font-semibold text-green-600 dark:text-green-400">
                  AFN {totals.total.toFixed(2)}
                </span>
              </div>
              <div>
                <span className="text-gray-600 dark:text-gray-400">{t('sales.status')}:</span>
                <span className="ml-2 px-2 py-0.5 bg-green-100 text-green-800 rounded-full text-[10px] font-medium">
                  {t('sales.completed')}
                </span>
              </div>
            </div>
          </div>
          
          {/* Printable Bill for first order */}
          {createdOrders[0] && (
            <PrintableBill 
              order={createdOrders[0]} 
              customer={customerDetails || selectedCustomer} 
            />
          )}
        </div>
      )}

      {/* Main Sales Form */}
      {!showBill && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
          {/* Left Column - Customer & Items */}
          <div className="lg:col-span-2 space-y-3">
            {/* Customer Selection */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 border border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                <UserIcon className="h-4 w-4" />
                {t('sales.customerInformation')}
              </h2>
              
              <div className="relative">
                <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.searchCustomer')}
                </label>
                <div className="relative">
                  <MagnifyingGlassIcon className="absolute left-2 top-1/2 transform -translate-y-1/2 h-3.5 w-3.5 text-gray-400" />
                  <input
                    type="text"
                    value={customerSearch}
                    onChange={(e) => {
                      setCustomerSearch(e.target.value);
                      setShowCustomerDropdown(true);
                    }}
                    onFocus={() => setShowCustomerDropdown(true)}
                    placeholder={t('sales.searchPlaceholder')}
                    className={`w-full pl-7 pr-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                      errors.customer ? 'border-red-500' : 'border-gray-300'
                    }`}
                  />
                  {errors.customer && (
                    <p className="mt-1 text-xs text-red-600">{errors.customer}</p>
                  )}
                </div>
                
                {/* Customer Dropdown */}
                {showCustomerDropdown && customerSearch && (
                  <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-700 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                    {filteredCustomers.length > 0 ? (
                      filteredCustomers.map(customer => (
                        <div
                          key={customer.id}
                          onClick={() => handleCustomerSelect(customer)}
                          className="px-2.5 py-2 hover:bg-gray-100 dark:hover:bg-gray-600 cursor-pointer border-b border-gray-200 dark:border-gray-600 last:border-b-0"
                        >
                          <div className="font-medium text-xs text-gray-900 dark:text-white">{customer.name}</div>
                          <div className="text-[10px] text-gray-500 dark:text-gray-400">{customer.phone}</div>
                        </div>
                      ))
                    ) : (
                      <div className="px-2.5 py-2 text-gray-500 dark:text-gray-400 text-center text-xs">
                        {t('sales.noCustomersFound')}
                      </div>
                    )}
                  </div>
                )}
              </div>

              {/* Customer Details Display */}
              {customerDetails && (
                <div className="mt-3 p-2 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">{t('sales.name')}:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{customerDetails.name}</span>
                    </div>
                    <div>
                      <span className="text-gray-600 dark:text-gray-400">{t('sales.phone')}:</span>
                      <span className="ml-2 font-medium text-gray-900 dark:text-white">{customerDetails.phone}</span>
                    </div>
                    {customerDetails.email && (
                      <div>
                        <span className="text-gray-600 dark:text-gray-400">{t('sales.email')}:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{customerDetails.email}</span>
                      </div>
                    )}
                    {customerDetails.address && (
                      <div className="col-span-2">
                        <span className="text-gray-600 dark:text-gray-400">{t('sales.address')}:</span>
                        <span className="ml-2 font-medium text-gray-900 dark:text-white">{customerDetails.address}</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>

            {/* Sale Items - Collapsible */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 border border-gray-200 dark:border-gray-700">
              <button
                type="button"
                onClick={() => setItemsSectionCollapsed(!itemsSectionCollapsed)}
                className="w-full flex items-center justify-between mb-2 text-left focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-inset rounded-lg"
              >
                <h2 className="text-sm font-semibold text-gray-900 dark:text-white flex items-center gap-1.5">
                  <CubeIcon className="h-4 w-4" />
                  Sale Items
                  {totals.itemCount > 0 && (
                    <span className="text-xs font-normal text-gray-500 dark:text-gray-400">
                      ({totals.itemCount})
                    </span>
                  )}
                </h2>
                <span className="flex items-center gap-1.5">
                  {!itemsSectionCollapsed && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.stopPropagation();
                        handleAddItem();
                      }}
                      className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex items-center gap-1"
                    >
                      <PlusIcon className="h-3.5 w-3.5" />
                      {t('sales.addItem')}
                    </button>
                  )}
                  {itemsSectionCollapsed ? (
                    <ChevronDownIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  ) : (
                    <ChevronUpIcon className="h-5 w-5 text-gray-500 dark:text-gray-400" />
                  )}
                </span>
              </button>

              {!itemsSectionCollapsed && (
              <div className="space-y-2">
                {saleItems.map((saleItem, index) => (
                  <div key={saleItem.id} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-700/30">
                    <div className="flex items-start justify-between mb-2">
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('sales.item').replace(' *', '')} {index + 1}</span>
                      {saleItems.length > 1 && (
                        <button
                          onClick={() => handleRemoveItem(saleItem.id)}
                          className="text-red-600 hover:text-red-800"
                        >
                          <TrashIcon className="h-3.5 w-3.5" />
                        </button>
                      )}
                    </div>

                    <div className="space-y-2">
                      <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
                        {/* Item Selection */}
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('sales.item')}
                          </label>
                          <select
                            value={saleItem.item_id}
                            onChange={(e) => handleItemChange(saleItem.id, 'item_id', e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                              errors[`item_${saleItem.id}_item`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                          >
                            <option value="">{t('sales.selectItem')}</option>
                            {items.map(item => (
                              <option key={item.id} value={item.id}>
                                {item.name} - Press: {item.press_stock ?? item.current_stock ?? 0} | Home: {item.home_stock ?? 0}
                              </option>
                            ))}
                          </select>
                          {errors[`item_${saleItem.id}_item`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`item_${saleItem.id}_item`]}</p>
                          )}
                          {saleItem.stock_available > 0 && (
                            <p className="mt-1 text-[10px] text-gray-500 dark:text-gray-400">
                              {t('sales.available')}: {saleItem.stock_available}
                            </p>
                          )}
                        </div>

                        {/* Quantity */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('sales.quantity')}
                          </label>
                          <input
                            type="number"
                            min="1"
                            value={saleItem.quantity}
                            onChange={(e) => handleItemChange(saleItem.id, 'quantity', e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                              errors[`item_${saleItem.id}_quantity`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder={t('sales.qty')}
                          />
                          {errors[`item_${saleItem.id}_quantity`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`item_${saleItem.id}_quantity`]}</p>
                          )}
                        </div>

                        {/* Price Per Unit */}
                        <div>
                          <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('sales.pricePerUnit')}
                          </label>
                          <input
                            type="number"
                            step="0.01"
                            min="0"
                            value={saleItem.price_per_unit}
                            onChange={(e) => handleItemChange(saleItem.id, 'price_per_unit', e.target.value)}
                            className={`w-full px-2.5 py-1.5 text-xs border rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                              errors[`item_${saleItem.id}_price`] ? 'border-red-500' : 'border-gray-300'
                            }`}
                            placeholder="0.00"
                          />
                          {errors[`item_${saleItem.id}_price`] && (
                            <p className="mt-1 text-xs text-red-600">{errors[`item_${saleItem.id}_price`]}</p>
                          )}
                        </div>

                        {/* Total */}
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('sales.totalAfn')}
                          </label>
                          <div className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 font-semibold text-gray-900 dark:text-white">
                            {saleItem.total.toFixed(2)}
                          </div>
                        </div>
                      </div>

                      {/* Quality/Design Type and Stock Type Row */}
                      <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('sales.qualityDesignType')}
                          </label>
                          <div className="flex gap-1.5">
                            <select
                              value={saleItem.quality_design_type}
                              onChange={(e) => handleItemChange(saleItem.id, 'quality_design_type', e.target.value)}
                              className="flex-1 px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white truncate"
                            >
                              <option value="">{t('sales.selectDesignType')}</option>
                              {flagDesignTypes.map(dt => (
                                <option key={dt.id} value={dt.name}>{dt.name}</option>
                              ))}
                            </select>
                            <button
                              type="button"
                              onClick={() => setShowAddDesignType(!showAddDesignType)}
                              className="px-1.5 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg text-xs flex-shrink-0"
                              title={t('sales.addNewDesignType')}
                            >
                              +
                            </button>
                          </div>
                          {showAddDesignType && (
                            <div className="mt-1.5 flex gap-1.5">
                              <input
                                type="text"
                                value={newDesignType}
                                onChange={(e) => setNewDesignType(e.target.value)}
                                placeholder="New design type name"
                                className="flex-1 px-2.5 py-1 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                                onKeyPress={(e) => e.key === 'Enter' && handleAddDesignType()}
                              />
                              <button
                                type="button"
                                onClick={handleAddDesignType}
                                className="px-2.5 py-1 bg-blue-600 text-white text-xs rounded-lg hover:bg-blue-700 flex-shrink-0"
                              >
                                {t('common.add')}
                              </button>
                            </div>
                          )}
                        </div>

                        <div>
                          <label className="block text-[10px] font-medium text-gray-700 dark:text-gray-300 mb-1">
                            {t('sales.stockSource')}
                          </label>
                          <select
                            value={saleItem.stock_type}
                            onChange={(e) => handleItemChange(saleItem.id, 'stock_type', e.target.value)}
                            className="w-full px-2.5 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                          >
                            <option value="press_stock">{t('sales.pressStock')}</option>
                            <option value="home_stock">{t('sales.homeStock')}</option>
                          </select>
                          {saleItem.item_id && (
                            <p className="mt-1 text-[9px] text-gray-500 dark:text-gray-400 truncate max-w-full">
                              {t('sales.available')}: <span className="font-medium">{saleItem.stock_available || (() => {
                                const item = items.find(i => i.id === parseInt(saleItem.item_id));
                                if (!item) return 0;
                                const stockValue = saleItem.stock_type === 'press_stock' 
                                  ? (item.press_stock !== undefined ? item.press_stock : (item.current_stock || 0))
                                  : (item.home_stock !== undefined ? item.home_stock : 0);
                                return stockValue;
                              })()}</span>
                            </p>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
              )}
            </div>
          </div>

          {/* Right Column - Summary & Actions */}
          <div className="space-y-3">
            {/* Order Summary */}
            <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-3 border border-gray-200 dark:border-gray-700">
              <h2 className="text-sm font-semibold text-gray-900 dark:text-white mb-2 flex items-center gap-1.5">
                <CurrencyDollarIcon className="h-4 w-4" />
                {t('sales.orderSummary')}
              </h2>

              <div className="space-y-2">
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.items')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">{totals.itemCount}</span>
                </div>
                <div className="flex justify-between text-xs">
                  <span className="text-gray-600 dark:text-gray-400">{t('sales.subtotal')}:</span>
                  <span className="font-medium text-gray-900 dark:text-white">AFN {totals.subtotal.toFixed(2)}</span>
                </div>
                <div className="border-t border-gray-200 dark:border-gray-700 pt-2">
                  <div className="flex justify-between">
                    <span className="text-sm font-semibold text-gray-900 dark:text-white">{t('sales.total')}:</span>
                    <span className="text-sm font-bold text-blue-600 dark:text-blue-400">
                      AFN {totals.total.toFixed(2)}
                    </span>
                  </div>
                </div>
              </div>

              <div className="mt-3 space-y-2">
                <button
                  onClick={handleProceedToPayment}
                  disabled={loading || totals.itemCount === 0 || !selectedCustomer}
                  className="w-full px-3 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed font-semibold flex items-center justify-center gap-1.5 transition-colors text-xs"
                >
                  <CheckCircleIcon className="h-3.5 w-3.5" />
                  {loading ? t('sales.processing') : t('sales.proceedToPayment')}
                </button>
                
                <button
                  onClick={resetForm}
                  className="w-full px-3 py-1.5 bg-gray-200 dark:bg-gray-700 text-gray-700 dark:text-gray-300 rounded-lg hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors text-xs"
                >
                  {t('sales.resetForm')}
                </button>
              </div>
            </div>

            {/* Quick Stats */}
            <div className="bg-blue-50 dark:bg-gray-700 rounded-lg p-2 border border-blue-200 dark:border-gray-600">
              <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">{t('sales.quickInfo')}</h3>
              <div className="space-y-1 text-[10px] text-gray-600 dark:text-gray-400">
                <div>{t('sales.totalCustomers')}: {customers.length}</div>
                <div>{t('sales.availableItems')}: {items.length}</div>
                <div>{t('sales.itemsInCart')}: {totals.itemCount}</div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Payment Modal */}
      <PaymentModal
        isOpen={showPaymentModal}
        onClose={() => {
          setShowPaymentModal(false);
          setPaymentData({
            amount: '',
            payment_method: 'cash',
            is_full_payment: true,
            notes: ''
          });
        }}
        onPaymentAdd={handlePaymentSubmit}
        dueAmount={totals.total}
        initialAmount={totals.total.toFixed(2)}
        isFullPayment={true}
      />
        </div>
      </div>
    </div>
  );
};

export default Sales;
