import React, { useState, useEffect, useCallback } from 'react';
import { useNavigate, useParams, useLocation } from 'react-router-dom';
import {
  MagnifyingGlassIcon,
  ExclamationTriangleIcon,
  CheckCircleIcon,
  XMarkIcon,
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  CurrencyDollarIcon,
  PlusIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { normalizeNumeralString, parseLocaleFloat, parseLocaleInt } from '../../utils/numerals';
import {
  effectivePurchaseUnitFromInventory,
  purchaseUnitCostStringFromInventory
} from '../../utils/saleItemCost';
import ProductTypeManager from '../../components/orders/ProductTypeManager';

/** True if inventory row is a finished flag-stand product (category/name), not a cloth flag. */
function inventoryLooksLikeFlagStand(inv) {
  if (!inv || inv.item_type !== 'finished_product') return false;
  const c = String(inv.category_name || '').toLowerCase().trim();
  const n = String(inv.name || '').toLowerCase();
  if (c === 'flag stand' || c.includes('flag stand')) return true;
  if (c.includes('stand') && c !== 'flags') return true;
  if (n.includes('flag stand')) return true;
  if (/\bstands?\b/.test(n) && /flag|pole|floor|table|display|mount/i.test(`${n} ${c}`)) return true;
  return false;
}

function inferProductTypeFromInventory(inv) {
  if (!inv) return 'flag';
  return inventoryLooksLikeFlagStand(inv) ? 'flag_stand' : 'flag';
}

/**
 * Finished products for this line: Flags vs Flag stands (by inventory category/name).
 * Falls back to all finished products if nothing matches so the list is never empty.
 */
function filterInventoryForOrderLine(allItems, productType) {
  const list = Array.isArray(allItems) ? allItems : [];
  const finished = list.filter((i) => i.item_type === 'finished_product');
  let out;
  if (productType === 'flag_stand') {
    out = finished.filter((i) => inventoryLooksLikeFlagStand(i));
  } else {
    out = finished.filter((i) => !inventoryLooksLikeFlagStand(i));
  }
  if (out.length === 0) {
    return finished;
  }
  return out;
}

/** True when no inventory row strictly matched — UI shows all finished products as fallback. */
function inventoryFilterUsesFallback(allItems, productType) {
  const finished = (Array.isArray(allItems) ? allItems : []).filter((i) => i.item_type === 'finished_product');
  if (!finished.length) return false;
  const strict =
    (productType || 'flag') === 'flag_stand'
      ? finished.filter((i) => inventoryLooksLikeFlagStand(i))
      : finished.filter((i) => !inventoryLooksLikeFlagStand(i));
  return strict.length === 0;
}

/** Name/SKU/category search across finished products (ignores product type while searching). */
function filterInventoryItemsForOrderRow(catalog, productType, searchQuery) {
  const list = Array.isArray(catalog) ? catalog : [];
  const finished = list.filter((i) => i.item_type === 'finished_product');
  const q = (searchQuery || '').trim().toLowerCase();
  if (!q) {
    return filterInventoryForOrderLine(catalog, productType);
  }
  return finished.filter((i) => {
    const name = (i.name || '').toLowerCase();
    const sku = (i.sku || '').toLowerCase();
    const category = (i.category_name || '').toLowerCase();
    return name.includes(q) || sku.includes(q) || category.includes(q);
  });
}

function inventoryFieldStr(inv, field) {
  if (!inv || inv[field] == null || inv[field] === '') return '';
  return String(inv[field]);
}

/** Subtext when purchase field is empty and no unit cost can be resolved from inventory/supplier data. */
function orderLinePurchaseCostHintText(item, t) {
  if (item.isManual || !item.item) return null;
  if (String(item.purchase_price ?? '').trim() !== '') return null;
  const meta = effectivePurchaseUnitFromInventory(item.item);
  if (meta.value != null) return null;
  if (meta.listUnitPrice != null) return t('sales.purchaseCostNoCostListPriceHint');
  return t('sales.costNotSetInInventory');
}

/** Map API order line → CreateOrder local row (needs inventory catalog for FK lookup). */
function mapApiOrderItemToLine(oi, itemsCatalog) {
  const rawItemId =
    oi.item != null ? (typeof oi.item === 'object' ? oi.item.id : oi.item) : null;
  const inv =
    rawItemId != null && Array.isArray(itemsCatalog)
      ? itemsCatalog.find((x) => Number(x.id) === Number(rawItemId))
      : null;
  const isManual = Boolean(oi.manual_item_name);
  const priceStr = oi.price_estimate != null ? String(oi.price_estimate) : '';
  const qtyStr = oi.quantity != null ? String(oi.quantity) : '';
  const persistedPurchase =
    oi.purchase_unit_cost != null && oi.purchase_unit_cost !== ''
      ? String(oi.purchase_unit_cost)
      : '';
  const purchase =
    persistedPurchase !== ''
      ? persistedPurchase
      : inv != null
        ? purchaseUnitCostStringFromInventory(inv)
        : '';
  const productType = inferProductTypeFromInventory(inv);
  const sizeFromApi = oi.flag_size || '';
  return {
    item: inv || null,
    itemId: rawItemId != null ? String(rawItemId) : '',
    isManual,
    manualItemName: oi.manual_item_name || '',
    product_type: productType,
    flag_size: productType === 'flag' ? sizeFromApi : '',
    flag_stand_type: productType === 'flag_stand' ? sizeFromApi : '',
    quality_design_type: oi.quality_design_type || '',
    stock_type: oi.stock_type || 'press_stock',
    quantity: qtyStr,
    purchase_price: purchase,
    price_per_unit: priceStr,
    itemSearch: inv?.name || '',
    showItemDropdown: false,
    isCollapsed: false
  };
}

const CreateOrder = () => {
  const navigate = useNavigate();
  const { id: editOrderId } = useParams();
  const location = useLocation();
  const isEditMode = Boolean(editOrderId && location.pathname.endsWith('/edit'));
  const { t } = useTranslation();
  const [loading, setLoading] = useState(false);
  const [customers, setCustomers] = useState([]);
  const [items, setItems] = useState([]);
  const [customerSearch, setCustomerSearch] = useState('');
  const [showCustomerDropdown, setShowCustomerDropdown] = useState(false);
  const [isManualCustomer, setIsManualCustomer] = useState(false);
  const [manualCustomerData, setManualCustomerData] = useState({
    name: '',
    phone: '',
    email: '',
    address: ''
  });
  const [inventoryStatus, setInventoryStatus] = useState(null);
  const [checkingInventory, setCheckingInventory] = useState(false);
  const [loadingCustomers, setLoadingCustomers] = useState(true);
  const [loadingItems, setLoadingItems] = useState(true);
  const [fetchError, setFetchError] = useState(null);
  const [flagDesignTypes, setFlagDesignTypes] = useState([]);
  const [newDesignType, setNewDesignType] = useState('');
  const [showAddDesignType, setShowAddDesignType] = useState({});

  const [orderItems, setOrderItems] = useState([{
    item: null,
    itemId: '',
    isManual: false,
    manualItemName: '',
    product_type: 'flag',
    flag_size: '',
    flag_stand_type: '',
    quality_design_type: '',
    stock_type: 'press_stock',
    quantity: '',
    purchase_price: '',
    price_per_unit: '',
    itemSearch: '',
    showItemDropdown: false,
    isCollapsed: false
  }]);
  const [formData, setFormData] = useState({
    customer: null
  });

  const [errors, setErrors] = useState({});
  const [customerDetails, setCustomerDetails] = useState(null);
  const [showPaymentModal, setShowPaymentModal] = useState(false);
  const [paymentData, setPaymentData] = useState({
    amount: '',
    payment_method: 'Cash',
    is_full_payment: false
  });
  const [loadingEditOrder, setLoadingEditOrder] = useState(false);
  const [orderNotes, setOrderNotes] = useState('');
  const [orderStatus, setOrderStatus] = useState('Pending');
  const [orderManualSerial, setOrderManualSerial] = useState('');
  const [orderDiscount, setOrderDiscount] = useState('0');

  // Fetch customers and items on component mount
  useEffect(() => {
    fetchCustomers();
    fetchItems();
    fetchFlagDesignTypes();
  }, []);

  const fetchFlagDesignTypes = async () => {
    try {
      const response = await api.get('/api/inventory/flag-design-types/');
      setFlagDesignTypes(Array.isArray(response.data) ? response.data : response.data.results || []);
    } catch (error) {
      console.error('Error fetching flag design types:', error);
    }
  };

  const handleAddDesignType = async (itemIndex) => {
    if (!newDesignType.trim()) return;
    try {
      const res = await api.post('/api/inventory/flag-design-types/', {
        name: newDesignType.trim(),
        description: ''
      });
      setFlagDesignTypes([...flagDesignTypes, res.data]);
      updateOrderItem(itemIndex, 'quality_design_type', res.data.name);
      setNewDesignType('');
      setShowAddDesignType(prev => ({ ...prev, [itemIndex]: false }));
      // Show success message
    } catch (err) {
      console.error('Error adding design type:', err);
    }
  };

  // Filter customers based on search
  const filteredCustomers = customers.filter(customer =>
    customer.name.toLowerCase().includes(customerSearch.toLowerCase()) ||
    customer.phone.includes(customerSearch)
  );

  const fetchCustomers = async () => {
    setLoadingCustomers(true);
    setFetchError(null);
    try {
      const response = await api.get('/api/customers/');
      const customersData = response.data.results || response.data || [];
      setCustomers(Array.isArray(customersData) ? customersData : []);
      if (customersData.length === 0) {
        setFetchError(t('orders.fetchNoCustomers'));
      }
    } catch (error) {
      console.error('Error fetching customers:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || t('common.unknownError');
      setFetchError(t('orders.fetchCustomersFailed', { message: errorMessage }));
      setCustomers([]);
    } finally {
      setLoadingCustomers(false);
    }
  };

  const fetchItems = async () => {
    setLoadingItems(true);
    setFetchError(null);
    try {
      const response = await api.get('/api/inventory/items/');
      const raw = response.data;
      const itemsData = Array.isArray(raw) ? raw : (raw?.results ?? raw?.data ?? raw?.items ?? []);
      const safeList = Array.isArray(itemsData) ? itemsData : [];
      // Ensure items have required fields with defaults
      const processedItems = safeList.map(item => ({
        ...item,
        press_stock: item.press_stock ?? item.current_stock ?? 0,
        home_stock: item.home_stock ?? 0,
        current_stock: item.current_stock ?? (item.press_stock ?? 0) + (item.home_stock ?? 0),
        sku: item.sku || t('common.notAvailable')
      }));
      setItems(processedItems);
      setOrderItems((prev) =>
        prev.map((row) => {
          if (row.isManual || row.itemId == null || String(row.itemId).trim() === '') return row;
          const fresh = processedItems.find((i) => String(i.id) === String(row.itemId));
          if (!fresh) return row;
          const nextPurchase = purchaseUnitCostStringFromInventory(fresh);
          const emptyPurchase = !row.purchase_price || String(row.purchase_price).trim() === '';
          return {
            ...row,
            item: fresh,
            ...(emptyPurchase && nextPurchase !== '' ? { purchase_price: nextPurchase } : {}),
          };
        })
      );
    } catch (error) {
      console.error('Error fetching items:', error);
      const errorMessage = error.response?.data?.detail || error.response?.data?.message || error.message || t('common.unknownError');
      setFetchError(t('orders.fetchItemsFailed', { message: errorMessage }));
      setItems([]);
    } finally {
      setLoadingItems(false);
    }
  };

  const fetchCustomerDetails = async (customerId) => {
    try {
      const response = await api.get(`/api/orders/get_customer_details/?customer_id=${customerId}`);
      setCustomerDetails(response.data);
    } catch (error) {
      console.error('Error fetching customer details:', error);
    }
  };

  const checkInventory = useCallback(async (itemId, quantity) => {
    if (!itemId || !quantity || quantity <= 0) {
      setInventoryStatus(null);
      return;
    }

    setCheckingInventory(true);
    try {
      const response = await api.get(`/api/orders/check_inventory/?item_id=${itemId}&quantity=${quantity}`);
      setInventoryStatus(response.data);
    } catch (error) {
      console.error('Error checking inventory:', error);
      setInventoryStatus(null);
    } finally {
      setCheckingInventory(false);
    }
  }, []);

  // Auto-check inventory when item or quantity changes (for first item)
  useEffect(() => {
    if (orderItems[0]?.item && orderItems[0]?.quantity) {
      checkInventory(orderItems[0].item.id, parseInt(orderItems[0].quantity));
    }
  }, [orderItems[0]?.item, orderItems[0]?.quantity, checkInventory]);

  useEffect(() => {
    if (!isEditMode || !editOrderId) return;
    if (loadingItems || loadingCustomers) return;
    if (!Array.isArray(items) || items.length === 0) return;
    if (!Array.isArray(customers)) return;

    let cancelled = false;
    const loadOrderForEdit = async () => {
      setLoadingEditOrder(true);
      try {
        const res = await api.get(`/api/orders/${editOrderId}/`);
        const order = res.data;
        if (cancelled) return;

        const custId =
          order.customer != null && typeof order.customer === 'object'
            ? order.customer.id
            : order.customer;
        const cust =
          customers.find((c) => Number(c.id) === Number(custId)) ||
          (typeof order.customer === 'object' && order.customer?.id ? order.customer : null);
        if (cust) {
          setFormData({ customer: cust });
          setCustomerSearch(cust.name || '');
          fetchCustomerDetails(cust.id);
        }

        setOrderNotes(order.notes || '');
        setOrderStatus(order.status || 'Pending');
        setOrderManualSerial(order.manual_serial_no || '');
        setOrderDiscount(String(order.discount ?? 0));

        const lines = (order.order_items || []).map((oi) => mapApiOrderItemToLine(oi, items));
        if (lines.length > 0) {
          setOrderItems(lines);
        }
      } catch (err) {
        console.error('Error loading order for edit:', err);
        setFetchError(t('orders.editOrderLoadFailed'));
      } finally {
        if (!cancelled) setLoadingEditOrder(false);
      }
    };

    loadOrderForEdit();
    return () => {
      cancelled = true;
    };
  }, [isEditMode, editOrderId, loadingItems, loadingCustomers, items, customers]);

  const handleCustomerSelect = (customer) => {
    setFormData(prev => ({ ...prev, customer }));
    setCustomerSearch(customer.name);
    setShowCustomerDropdown(false);
    setIsManualCustomer(false);
    fetchCustomerDetails(customer.id);
    setErrors(prev => ({ ...prev, customer: '' }));
  };

  const handleManualCustomerChange = (field, value) => {
    setManualCustomerData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, customer: '', [field]: '' }));
  };

  const handleInputChange = (field, value) => {
    setFormData(prev => ({ ...prev, [field]: value }));
    setErrors(prev => ({ ...prev, [field]: '' }));
  };

  const calculateItemTotal = (item) => {
    const quantity = parseLocaleFloat(item.quantity) || 0;
    const pricePerUnit = parseLocaleFloat(item.price_per_unit) || 0;
    return quantity * pricePerUnit;
  };

  const calculateItemProfit = (item) => {
    const quantity = parseLocaleFloat(item.quantity) || 0;
    let purchasePrice = parseLocaleFloat(item.purchase_price);
    if (Number.isNaN(purchasePrice) && !item.isManual && item.item) {
      const meta = effectivePurchaseUnitFromInventory(item.item);
      purchasePrice = meta.value != null ? meta.value : NaN;
    }
    if (Number.isNaN(purchasePrice)) purchasePrice = 0;
    const sellingPrice = parseLocaleFloat(item.price_per_unit) || 0;
    return quantity * (sellingPrice - purchasePrice);
  };

  const calculateTotalProfit = () => {
    return orderItems.reduce((sum, item) => sum + calculateItemProfit(item), 0);
  };

  const calculateTotal = () => {
    return orderItems.reduce((sum, item) => sum + calculateItemTotal(item), 0);
  };

  const buildOrderItemsPayload = () =>
    orderItems
      .map((oi) => {
        let purchaseParsed = parseLocaleFloat(oi.purchase_price);
        let purchase_unit_cost = Number.isNaN(purchaseParsed) ? null : purchaseParsed;
        if (purchase_unit_cost == null && !oi.isManual && oi.item) {
          purchaseParsed = parseLocaleFloat(purchaseUnitCostStringFromInventory(oi.item));
          purchase_unit_cost = Number.isNaN(purchaseParsed) ? null : purchaseParsed;
        }
        if (oi.isManual) {
          return {
            item: null,
            quantity: parseLocaleInt(oi.quantity),
            price_estimate: parseLocaleFloat(oi.price_per_unit),
            purchase_unit_cost,
            stock_type: 'press_stock',
            flag_size: oi.product_type === 'flag' ? oi.flag_size : oi.flag_stand_type,
            quality_design_type: oi.quality_design_type || '',
            manual_item_name: oi.manualItemName
          };
        }
        return {
          item: oi.item?.id,
          quantity: parseLocaleInt(oi.quantity),
          price_estimate: parseLocaleFloat(oi.price_per_unit),
          purchase_unit_cost,
          stock_type: oi.stock_type || 'press_stock',
          flag_size: oi.product_type === 'flag' ? oi.flag_size : oi.flag_stand_type,
          quality_design_type: oi.quality_design_type || ''
        };
      })
      .filter((oi) => oi.item != null || oi.manual_item_name);

  const addOrderItem = () => {
    setOrderItems([...orderItems, {
      item: null,
      itemId: '',
      isManual: false,
      manualItemName: '',
      product_type: 'flag',
      flag_size: '',
      flag_stand_type: '',
      quality_design_type: '',
      stock_type: 'press_stock',
      quantity: '',
      purchase_price: '',
      price_per_unit: '',
      itemSearch: '',
      showItemDropdown: false,
      isCollapsed: false
    }]);
  };

  const toggleItemCollapse = (index) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], isCollapsed: !updated[index].isCollapsed };
    setOrderItems(updated);
  };

  const removeOrderItem = (index) => {
    if (orderItems.length > 1) {
      setOrderItems(orderItems.filter((_, i) => i !== index));
    }
  };

  const updateOrderItem = (index, field, value) => {
    const updated = [...orderItems];
    updated[index] = { ...updated[index], [field]: value };
    setOrderItems(updated);
    if (errors[`item_${index}_${field}`]) {
      setErrors(prev => {
        const newErrors = { ...prev };
        delete newErrors[`item_${index}_${field}`];
        return newErrors;
      });
    }
  };

  const applyOrderItemInventory = (index, selectedItem) => {
    setOrderItems((prev) => {
      const next = [...prev];
      const row = { ...next[index] };
      if (selectedItem) {
        row.itemId = String(selectedItem.id);
        row.item = selectedItem;
        row.purchase_price = purchaseUnitCostStringFromInventory(selectedItem);
        row.price_per_unit = inventoryFieldStr(selectedItem, 'unit_price');
        const inferredType = inferProductTypeFromInventory(selectedItem);
        row.product_type = inferredType;
        if (inferredType === 'flag') {
          row.flag_stand_type = '';
        } else {
          row.flag_size = '';
        }
        row.itemSearch = selectedItem.name || '';
        row.showItemDropdown = false;
      } else {
        row.itemId = '';
        row.item = null;
        row.purchase_price = '';
        row.itemSearch = '';
        row.showItemDropdown = false;
      }
      next[index] = row;
      return next;
    });
    if (errors[`item_${index}_item`]) {
      setErrors((prev) => {
        const newErrors = { ...prev };
        delete newErrors[`item_${index}_item`];
        return newErrors;
      });
    }
  };

  const handleOrderItemSearchChange = (index, value) => {
    setOrderItems((prev) => {
      const next = [...prev];
      const row = { ...next[index], itemSearch: value, showItemDropdown: true };
      if (row.item && value.trim() !== (row.item.name || '').trim()) {
        row.item = null;
        row.itemId = '';
        row.purchase_price = '';
      }
      next[index] = row;
      return next;
    });
  };

  const selectOrderItemFromSearch = (index, inv) => {
    applyOrderItemInventory(index, inv);
  };

  const clearOrderItemSearch = (index) => {
    applyOrderItemInventory(index, null);
  };

  const validateForm = () => {
    const newErrors = {};

    if (!isEditMode) {
      if (!isManualCustomer && !formData.customer) {
        newErrors.customer = t('orders.errCustomerRequired');
      }
      if (isManualCustomer) {
        if (!manualCustomerData.name.trim()) {
          newErrors.customerName = t('orders.errCustomerName');
        }
        if (!manualCustomerData.phone.trim()) {
          newErrors.customerPhone = t('orders.errCustomerPhone');
        }
      }
    } else if (!formData.customer) {
      newErrors.customer = t('orders.errCustomerRequired');
    }

    if (orderItems.length === 0) {
      newErrors.items = t('orders.errAtLeastOneItem');
    }

    orderItems.forEach((item, index) => {
      // Skip item validation if manual entry
      if (!item.isManual && !item.item) {
        newErrors[`item_${index}_item`] = t('orders.errItemSelect');
      }

      // Validate manual item name if manual entry
      if (item.isManual && !item.manualItemName.trim()) {
        newErrors[`item_${index}_manualItemName`] = t('orders.errManualName');
      }

      if (item.product_type === 'flag' && !item.flag_size.trim()) {
        newErrors[`item_${index}_flag_size`] = t('orders.errFlagSize');
      }
      if (item.product_type === 'flag_stand' && !item.flag_stand_type.trim()) {
        newErrors[`item_${index}_flag_stand_type`] = t('orders.errFlagStand');
      }

      const qtyVal = parseLocaleFloat(item.quantity);
      if (!item.quantity || Number.isNaN(qtyVal) || qtyVal <= 0) {
        newErrors[`item_${index}_quantity`] = t('orders.errQuantityPositive');
      }

      const priceVal = parseLocaleFloat(item.price_per_unit);
      if (!item.price_per_unit || Number.isNaN(priceVal) || priceVal <= 0) {
        newErrors[`item_${index}_price_per_unit`] = t('orders.errSellingPrice');
      }

      // No stock validation - allow orders even if item not in stock
    });

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleFormSubmit = (e) => {
    e.preventDefault();

    if (!validateForm()) {
      return;
    }

    if (isEditMode) {
      submitOrderUpdate();
      return;
    }

    setShowPaymentModal(true);
    setPaymentData((prev) => ({
      ...prev,
      amount: totalAmount.toFixed(2),
      is_full_payment: true
    }));
  };

  const submitOrderUpdate = async () => {
    setLoading(true);
    try {
      await api.patch(`/api/orders/${editOrderId}/`, {
        customer: formData.customer?.id,
        notes: orderNotes,
        status: orderStatus,
        manual_serial_no: orderManualSerial.trim(),
        discount: parseLocaleFloat(orderDiscount) || 0,
        order_items: buildOrderItemsPayload()
      });
      navigate(`/orders/${editOrderId}`, {
        state: { message: t('orders.stateUpdatedMessage') }
      });
    } catch (error) {
      console.error('Error updating order:', error);
      if (error.response?.data) {
        const serverErrors = {};
        Object.keys(error.response.data).forEach((key) => {
          serverErrors[key] = Array.isArray(error.response.data[key])
            ? error.response.data[key][0]
            : error.response.data[key];
        });
        setErrors(serverErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const handlePaymentChange = (field, value) => {
    if (field === 'is_full_payment') {
      setPaymentData(prev => ({
        ...prev,
        is_full_payment: value,
        amount: value ? totalAmount.toFixed(2) : prev.amount
      }));
    } else {
      setPaymentData(prev => ({ ...prev, [field]: value }));
    }
  };

  const handleSubmit = async (options = {}) => {
    const explicit = options.paymentAmount;
    const paymentAmount =
      explicit !== undefined && explicit !== null
        ? Number(explicit)
        : parseLocaleFloat(paymentData.amount) || 0;

    /* Allow 0 AFN upfront — customer may pay later; order is still recorded */
    if (paymentAmount < 0) {
      setErrors({ payment: t('orders.errPaymentNegative') });
      return;
    }

    if (paymentAmount > totalAmount) {
      setErrors({ payment: t('orders.errPaymentExceeds') });
      return;
    }

    const paymentMethodRaw = options.paymentMethod ?? paymentData.payment_method;

    setLoading(true);
    setShowPaymentModal(false);
    try {
      let customerId = formData.customer?.id;
      
      // Create customer if manual entry
      if (isManualCustomer) {
        try {
          // Check if customer already exists by phone
          const existingCustomer = customers.find(c => c.phone === manualCustomerData.phone);
          if (existingCustomer) {
            customerId = existingCustomer.id;
          } else {
            const customerResponse = await api.post('/api/customers/', manualCustomerData);
            customerId = customerResponse.data.id;
          }
        } catch (error) {
          console.error('Error creating customer:', error);
          const errorMsg = error.response?.data?.phone?.[0] || error.response?.data?.detail || t('orders.errCreateCustomer');
          setErrors({ customer: errorMsg });
          setLoading(false);
          setShowPaymentModal(true);
          return;
        }
      }

      const orderItemsPayload = buildOrderItemsPayload();

      const orderData = {
        customer: customerId,
        notes: '',
        manual_serial_no: orderManualSerial.trim(),
        discount: parseLocaleFloat(orderDiscount) || 0,
        order_items: orderItemsPayload
      };

      const response = await api.post('/api/orders/', orderData);
      const orderId = response.data.id;

      if (paymentAmount > 0 && orderId) {
        try {
          const paymentMethod = String(paymentMethodRaw || 'Cash').toLowerCase().replace(/\s+/g, '_');
          await api.post('/api/order-payments/', {
            order: orderId,
            amount_paid: paymentAmount,
            payment_method: paymentMethod
          });
        } catch (paymentError) {
          console.error('Error recording payment:', paymentError);
        }
      }
      
      // Redirect to order details page to show bill
      navigate(`/orders/${orderId}`, { 
        state: { message: t('orders.stateCreatedMessage') }
      });
    } catch (error) {
      console.error('Error creating order:', error);
      if (error.response?.data) {
        const serverErrors = {};
        Object.keys(error.response.data).forEach(key => {
          serverErrors[key] = Array.isArray(error.response.data[key]) 
            ? error.response.data[key][0] 
            : error.response.data[key];
        });
        setErrors(serverErrors);
      }
    } finally {
      setLoading(false);
    }
  };

  const itemsSubtotal = calculateTotal();
  const discountAmount = parseLocaleFloat(orderDiscount) || 0;
  const totalAmount = Math.max(0, itemsSubtotal - discountAmount);

  if (isEditMode && loadingEditOrder) {
    return (
      <div className="flex justify-center items-center min-h-[40vh] p-8">
        <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-blue-600" />
      </div>
    );
  }

  return (
    <div className="space-y-2 p-2">
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-3">
        {/* Order Form */}
        <div className="lg:col-span-2">
          <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 rounded-xl sm:rounded-2xl shadow-xl border border-white/20 dark:border-gray-700">
            {/* Standard page header */}
            <div className="bg-blue-50 dark:bg-gray-800 p-3 sm:p-4 border-b border-blue-100 dark:border-gray-700">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => navigate('/orders')}
                    className="p-1.5 hover:bg-blue-100 dark:hover:bg-gray-700 rounded-lg transition-colors text-gray-700 dark:text-gray-300"
                  >
                    <ArrowLeftIcon className="h-4 w-4" />
                  </button>
                  <div>
                    <h1 className="text-base font-bold text-gray-900 dark:text-white">
                      {isEditMode
                        ? t('orders.editOrderPageTitle', { id: editOrderId })
                        : t('orders.createOrderPageTitle')}
                    </h1>
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      {isEditMode ? t('orders.editOrderPageSubtitle') : t('orders.createOrderPageSubtitle')}
                    </p>
                  </div>
                </div>
                {/* Summary in Header */}
                <div className="text-right">
                  <p className="text-xs text-gray-600 dark:text-gray-400">{t('orders.headerTotal')}</p>
                  <p className="text-lg font-bold text-gray-900 dark:text-white">AFN {totalAmount.toFixed(2)}</p>
                  <p className={`text-xs ${calculateTotalProfit() >= 0 ? 'text-green-600 dark:text-green-400' : 'text-amber-600 dark:text-amber-400'}`}>
                    {t('common.profit')}: AFN {calculateTotalProfit().toFixed(2)}
                  </p>
                </div>
              </div>
            </div>
            
            {/* Form */}
            <form onSubmit={handleFormSubmit} className="p-3 space-y-2">
            {/* Error Message */}
            {fetchError && (
              <div className="bg-red-50 dark:bg-red-900/20 border border-red-200 dark:border-red-800 rounded-lg p-2">
                <div className="flex items-center gap-2">
                  <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                  <p className="text-xs sm:text-sm text-red-600 dark:text-red-400 flex-1">{fetchError}</p>
                  <button
                    type="button"
                    onClick={() => {
                      setFetchError(null);
                      fetchCustomers();
                      fetchItems();
                    }}
                    className="ml-auto text-xs sm:text-sm text-red-600 dark:text-red-400 hover:underline flex-shrink-0"
                  >
                    {t('common.retry')}
                  </button>
                </div>
              </div>
            )}
            
            {/* Customer and Item Selection - Row 1 */}
            <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
              <div className="md:col-span-2">
                <div className="flex items-center justify-between mb-1.5">
                  <label className="block text-sm font-medium text-gray-700 dark:text-gray-300">
                    {t('orders.customerRequired')}
                  </label>
                  <label className={`flex items-center gap-1.5 ${isEditMode ? 'opacity-50 cursor-not-allowed' : 'cursor-pointer'}`}>
                    <input
                      type="checkbox"
                      checked={isManualCustomer}
                      disabled={isEditMode}
                      onChange={(e) => {
                        setIsManualCustomer(e.target.checked);
                        if (e.target.checked) {
                          setFormData(prev => ({ ...prev, customer: null }));
                          setCustomerSearch('');
                          setCustomerDetails(null);
                        } else {
                          setManualCustomerData({ name: '', phone: '', email: '', address: '' });
                        }
                      }}
                      className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                    />
                    <span className="text-xs text-gray-600 dark:text-gray-400">{t('orders.manualEntry')}</span>
                  </label>
                </div>
                
                {isManualCustomer ? (
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <input
                        type="text"
                        placeholder={t('sales.customerNameRequiredLabel')}
                        value={manualCustomerData.name}
                        onChange={(e) => handleManualCustomerChange('name', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                          errors.customerName ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.customerName && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerName}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder={`${t('customers.phone')} *`}
                        value={manualCustomerData.phone}
                        onChange={(e) => handleManualCustomerChange('phone', e.target.value)}
                        className={`w-full px-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                          errors.customerPhone ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors.customerPhone && (
                        <p className="mt-1 text-xs text-red-600 dark:text-red-400">{errors.customerPhone}</p>
                      )}
                    </div>
                    <div>
                      <input
                        type="email"
                        placeholder={t('customers.enterEmailOptional')}
                        value={manualCustomerData.email}
                        onChange={(e) => handleManualCustomerChange('email', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
                      />
                    </div>
                    <div>
                      <input
                        type="text"
                        placeholder={t('customers.enterAddress')}
                        value={manualCustomerData.address}
                        onChange={(e) => handleManualCustomerChange('address', e.target.value)}
                        className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <div className="relative">
                      <MagnifyingGlassIcon className="absolute left-3 top-2.5 h-4 w-4 text-gray-400" />
                      <input
                        type="text"
                        placeholder={t('orders.searchCustomerPlaceholder')}
                        value={customerSearch}
                        onChange={(e) => {
                          setCustomerSearch(e.target.value);
                          setShowCustomerDropdown(true);
                          if (!e.target.value) {
                            setFormData(prev => ({ ...prev, customer: null }));
                            setCustomerDetails(null);
                          }
                        }}
                        onFocus={() => setShowCustomerDropdown(true)}
                        className={`w-full pl-10 pr-3 py-2 text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                          errors.customer ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                    </div>

                    {/* Customer Dropdown */}
                    {showCustomerDropdown && customerSearch && (
                      <div className="absolute z-10 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-60 overflow-y-auto">
                        {filteredCustomers.length > 0 ? (
                          filteredCustomers.map(customer => (
                            <button
                              key={customer.id}
                              type="button"
                              onClick={() => handleCustomerSelect(customer)}
                              className="w-full px-3 sm:px-4 py-2 sm:py-3 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0"
                            >
                              <div className="font-medium text-xs sm:text-sm text-gray-900 dark:text-white">{customer.name}</div>
                              <div className="text-[10px] sm:text-xs text-gray-600 dark:text-gray-400">{customer.phone}</div>
                            </button>
                          ))
                        ) : (
                          <div className="px-3 sm:px-4 py-2 sm:py-3 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                            {t('orders.noCustomersInSearch')}
                          </div>
                        )}
                      </div>
                    )}
                  </div>
                )}
                {errors.customer && !isManualCustomer && (
                  <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400">{errors.customer}</p>
                )}
              </div>
            </div>

            <div className="max-w-md">
              <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('customers.manualSerialNo')}
              </label>
              <input
                type="text"
                value={orderManualSerial}
                onChange={(e) => setOrderManualSerial(e.target.value)}
                className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-gray-200"
                placeholder={t('customers.manualSerialNo')}
              />
            </div>

            {/* Order Items */}
            <div className="space-y-2">
              <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2 sm:gap-0">
                <h3 className="text-sm sm:text-base font-semibold text-gray-900 dark:text-white">
                  {t('orders.title')}
                </h3>
                <button
                  type="button"
                  onClick={addOrderItem}
                  className="px-3 py-1.5 text-xs bg-green-500 hover:bg-green-600 text-white rounded-full flex items-center gap-1.5 w-full sm:w-auto justify-center shadow-md transition-colors"
                >
                  <PlusIcon className="h-4 w-4" />
                  {t('orders.addItemButton')}
                </button>
              </div>

              {orderItems.map((item, index) => (
                <div key={index} className="p-2 border border-gray-200 dark:border-gray-700 rounded-lg bg-gray-50 dark:bg-gray-800/50">
                  <div className="flex justify-between items-center">
                    <div className="flex items-center gap-2 flex-1">
                      <button
                        type="button"
                        onClick={() => toggleItemCollapse(index)}
                        className="text-gray-600 dark:text-gray-400 hover:text-gray-900 dark:hover:text-gray-200 transition-colors"
                      >
                        <svg className={`h-5 w-5 transition-transform ${item.isCollapsed ? '' : 'rotate-90'}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5l7 7-7 7" />
                        </svg>
                      </button>
                      <span className="text-xs font-medium text-gray-700 dark:text-gray-300">{t('orders.itemNumber', { n: index + 1 })}</span>
                      {item.isCollapsed && (
                        <span className="text-xs text-gray-500 dark:text-gray-400 truncate">
                          {item.isManual ? item.manualItemName : item.item?.name || t('orders.notSelected')}
                          {item.quantity && ` — ${t('orders.qtyAbbr')}: ${item.quantity}`}
                          {item.price_per_unit && ` — AFN ${parseFloat(item.price_per_unit).toFixed(2)}`}
                        </span>
                      )}
                      <label className="flex items-center gap-1.5 cursor-pointer ml-2">
                        <input
                          type="checkbox"
                          checked={item.isManual || false}
                          onChange={(e) => {
                            const newItems = [...orderItems];
                            newItems[index] = {
                              ...newItems[index],
                              isManual: e.target.checked,
                              itemId: e.target.checked ? '' : newItems[index].itemId,
                              item: e.target.checked ? null : newItems[index].item,
                              manualItemName: e.target.checked ? newItems[index].manualItemName : ''
                            };
                            setOrderItems(newItems);
                          }}
                          className="rounded border-gray-300 text-blue-600 focus:ring-blue-500 w-4 h-4"
                        />
                        <span className="text-xs text-gray-600 dark:text-gray-400">{t('orders.manualEntry')}</span>
                      </label>
                    </div>
                    {orderItems.length > 1 && (
                      <button
                        type="button"
                        onClick={() => removeOrderItem(index)}
                        className="text-red-600 dark:text-red-400 hover:text-red-700 dark:hover:text-red-500 text-xs"
                      >
                        {t('orders.removeItem')}
                      </button>
                    )}
                  </div>

                  {!item.isCollapsed && (
                    <div className="space-y-2 mt-2">

                  {/* Manual Item Name OR Item Selection */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                  {item.isManual ? (
                    <div className="md:col-span-2">
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('orders.itemNameManual')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('orders.itemNameManualPh')}
                        value={item.manualItemName}
                        onChange={(e) => updateOrderItem(index, 'manualItemName', e.target.value)}
                        className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                          errors[`item_${index}_manualItemName`] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                        }`}
                      />
                      {errors[`item_${index}_manualItemName`] && (
                        <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400">{errors[`item_${index}_manualItemName`]}</p>
                      )}
                      <p className="mt-1 text-[10px] sm:text-xs text-blue-600 dark:text-blue-400">
                        💡 {t('orders.manualItemHint')}
                      </p>
                    </div>
                  ) : (
                    <div className="md:col-span-2">
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('sales.item')}
                    </label>
                    {loadingItems ? (
                      <div className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 rounded-lg bg-gray-50 dark:bg-gray-700 text-gray-700 dark:text-gray-300">
                        {t('orders.loadingItems')}
                      </div>
                    ) : !Array.isArray(items) || items.length === 0 ? (
                      <div className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-yellow-300 dark:border-yellow-600 rounded-lg bg-yellow-50 dark:bg-yellow-900/20 text-yellow-800 dark:text-yellow-300">
                        {fetchError || t('orders.noItemsUseManual')}
                      </div>
                    ) : (
                      <div>
                        <div className="flex gap-2 items-stretch">
                          <div className="relative flex-1 min-w-0">
                            <MagnifyingGlassIcon className="absolute left-2 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-gray-400 pointer-events-none z-10" />
                            <input
                              type="text"
                              placeholder={t('orders.searchItem')}
                              value={item.itemSearch || ''}
                              onChange={(e) => handleOrderItemSearchChange(index, e.target.value)}
                              onFocus={() => updateOrderItem(index, 'showItemDropdown', true)}
                              onBlur={() => {
                                setTimeout(() => {
                                  updateOrderItem(index, 'showItemDropdown', false);
                                }, 150);
                              }}
                              className={`w-full pl-7 pr-2 py-1.5 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 ${
                                errors[`item_${index}_item`] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                              }`}
                            />
                            {item.showItemDropdown && (item.itemSearch || '').trim() && (() => {
                              const matches = filterInventoryItemsForOrderRow(
                                items,
                                item.product_type || 'flag',
                                item.itemSearch
                              );
                              return (
                                <div className="absolute z-20 w-full mt-1 bg-white dark:bg-gray-800 border border-gray-300 dark:border-gray-600 rounded-lg shadow-lg max-h-48 overflow-y-auto">
                                  {matches.length > 0 ? (
                                    matches.map((inv) => (
                                      <button
                                        key={inv.id}
                                        type="button"
                                        onMouseDown={(e) => e.preventDefault()}
                                        onClick={() => selectOrderItemFromSearch(index, inv)}
                                        className="w-full px-2 sm:px-3 py-2 text-left hover:bg-gray-50 dark:hover:bg-gray-700 border-b border-gray-100 dark:border-gray-700 last:border-b-0 text-xs sm:text-sm text-gray-900 dark:text-white"
                                      >
                                        {t('orders.itemOptionStock', {
                                          name: inv.name,
                                          sku: inv.sku || t('common.notAvailable'),
                                          press: inv.press_stock ?? inv.current_stock ?? 0,
                                          home: inv.home_stock ?? 0
                                        })}
                                      </button>
                                    ))
                                  ) : (
                                    <div className="px-2 sm:px-3 py-2 text-xs sm:text-sm text-gray-500 dark:text-gray-400 text-center">
                                      {t('orders.noItemsMatchSearch')}
                                    </div>
                                  )}
                                </div>
                              );
                            })()}
                          </div>
                          {((item.itemSearch || '').trim() || item.item) && (
                            <button
                              type="button"
                              onMouseDown={(e) => e.preventDefault()}
                              onClick={() => clearOrderItemSearch(index)}
                              className="btn-form-red shrink-0 self-stretch text-xs px-4"
                            >
                              {t('common.clear')}
                            </button>
                          )}
                        </div>
                        {item.item && (
                          <p className="mt-1.5 flex items-center gap-1 text-[10px] sm:text-xs text-green-700 dark:text-green-400">
                            <CheckCircleIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
                            {t('orders.itemSelected', { name: item.item.name })}
                          </p>
                        )}
                      </div>
                    )}
                    {errors[`item_${index}_item`] && (
                      <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400">{errors[`item_${index}_item`]}</p>
                    )}
                    {!item.isManual && inventoryFilterUsesFallback(items, item.product_type) && (
                      <p className="mt-1 text-[10px] sm:text-xs text-amber-700 dark:text-amber-300">
                        {t('orders.inventoryFilteredFallback')}
                      </p>
                    )}
                  </div>
                  )}

                  {/* Product Type */}
                  <div>
                    <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                      {t('orders.productTypeLabel')}
                    </label>
                    <select
                      value={item.product_type || 'flag'}
                      onChange={(e) => {
                        const newType = e.target.value;
                        const allowed = filterInventoryForOrderLine(items, newType);
                        const cur = orderItems[index]?.item;
                        const keep =
                          cur &&
                          allowed.some((x) => String(x.id) === String(cur.id));
                        setOrderItems((prev) => {
                          const next = [...prev];
                          const row = { ...next[index], product_type: newType };
                          if (newType === 'flag') {
                            row.flag_stand_type = '';
                          } else {
                            row.flag_size = '';
                          }
                          if (!keep) {
                            row.itemId = '';
                            row.item = null;
                            row.purchase_price = '';
                            row.price_per_unit = '';
                          }
                          next[index] = row;
                          return next;
                        });
                      }}
                      className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                    >
                      <option value="flag">{t('orders.productFlag')}</option>
                      <option value="flag_stand">{t('orders.productFlagStand')}</option>
                    </select>
                  </div>

                  {/* Size/Stand Type */}
                  <div>
                    {item.product_type === 'flag' ? (
                      <ProductTypeManager
                        key={`flag-${index}`}
                        onSelect={(value) => updateOrderItem(index, 'flag_size', value)}
                        productType={item.flag_size}
                        fieldName="flag_size"
                        label={t('orders.flagSize')}
                      />
                    ) : (
                      <ProductTypeManager
                        key={`stand-${index}`}
                        onSelect={(value) => updateOrderItem(index, 'flag_stand_type', value)}
                        productType={item.flag_stand_type}
                        fieldName="flag_stand_type"
                        label={t('orders.flagStandTypeLabel')}
                      />
                    )}
                    {(errors[`item_${index}_flag_size`] || errors[`item_${index}_flag_stand_type`]) && (
                      <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400">{errors[`item_${index}_flag_size`] || errors[`item_${index}_flag_stand_type`]}</p>
                    )}
                  </div>
                  </div>

                  {/* Quality/Design Type and Stock Type */}
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('orders.qualityDesignLabel')}
                      </label>
                      <input
                        type="text"
                        placeholder={t('orders.qualityDesignPh')}
                        value={item.quality_design_type}
                        onChange={(e) => updateOrderItem(index, 'quality_design_type', e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      />
                    </div>

                    {/* Stock Type Selection - Only show for inventory items */}
                    {!item.isManual && (
                    <div>
                      <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                        {t('orders.stockSource')}
                      </label>
                      <select
                        value={item.stock_type}
                        onChange={(e) => updateOrderItem(index, 'stock_type', e.target.value)}
                        className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                      >
                        <option value="press_stock">{t('sales.pressStock')}</option>
                        <option value="home_stock">{t('sales.homeStock')}</option>
                      </select>
                      {item.item && (
                        <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                          {t('orders.availableStock', { count: (() => {
                            const list = Array.isArray(items) ? items : [];
                            const selectedItem = list.find((i) => String(i.id) === String(item.item?.id));
                            if (!selectedItem) return 0;
                            return item.stock_type === 'press_stock'
                              ? (selectedItem.press_stock ?? selectedItem.current_stock ?? 0)
                              : (selectedItem.home_stock ?? 0);
                          })() })}
                        </p>
                      )}
                    </div>
                    )}
                  </div>

                  {/* Quantity, purchase (cost), selling — after item details */}
                  <div
                    className="mt-3 rounded-lg border border-dashed border-gray-300 dark:border-gray-600 bg-white/60 dark:bg-gray-900/30 p-2 sm:p-3"
                    dir="ltr"
                  >
                    <div className="grid grid-cols-3 gap-2 sm:gap-3 items-start">
                      <div className="min-w-0">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 truncate">
                          {t('sales.quantity')}
                        </label>
                        <input
                          type="text"
                          inputMode="numeric"
                          placeholder={t('orders.enterQuantity')}
                          value={item.quantity}
                          onChange={(e) => updateOrderItem(index, 'quantity', normalizeNumeralString(e.target.value))}
                          className={`w-full min-w-0 px-2 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                            errors[`item_${index}_quantity`] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                        {errors[`item_${index}_quantity`] && (
                          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 leading-tight">{errors[`item_${index}_quantity`]}</p>
                        )}
                      </div>

                      <div className="min-w-0">
                        <label className="block text-[10px] sm:text-xs font-semibold text-gray-800 dark:text-gray-200 mb-1 truncate" title={`${t('common.cost')} — ${t('orders.purchasePrice')}`}>
                          {t('orders.purchasePrice')}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder={t('orders.costPricePh')}
                          value={item.purchase_price}
                          onChange={(e) => updateOrderItem(index, 'purchase_price', normalizeNumeralString(e.target.value))}
                          className="w-full min-w-0 px-2 py-1.5 sm:py-2 text-xs sm:text-sm border-2 border-amber-200 dark:border-amber-900/50 rounded-lg focus:ring-2 focus:ring-amber-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200"
                        />
                        <p className="mt-1 text-[10px] leading-tight text-gray-500 dark:text-gray-400 min-h-[1.25rem]">
                          {orderLinePurchaseCostHintText(item, t) ?? '\u00a0'}
                        </p>
                      </div>

                      <div className="min-w-0">
                        <label className="block text-[10px] sm:text-xs font-medium text-gray-700 dark:text-gray-300 mb-1 truncate">
                          {t('orders.sellingPrice')}
                        </label>
                        <input
                          type="text"
                          inputMode="decimal"
                          autoComplete="off"
                          placeholder={t('orders.sellingPricePh')}
                          value={item.price_per_unit}
                          onChange={(e) => updateOrderItem(index, 'price_per_unit', normalizeNumeralString(e.target.value))}
                          className={`w-full min-w-0 px-2 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent dark:bg-gray-700 dark:text-gray-200 dark:border-gray-600 ${
                            errors[`item_${index}_price_per_unit`] ? 'border-red-300 dark:border-red-600' : 'border-gray-300 dark:border-gray-600'
                          }`}
                        />
                        {errors[`item_${index}_price_per_unit`] && (
                          <p className="mt-1 text-[10px] text-red-600 dark:text-red-400 leading-tight">{errors[`item_${index}_price_per_unit`]}</p>
                        )}
                      </div>
                    </div>
                  </div>

                  {calculateItemTotal(item) > 0 && (
                    <div className="flex justify-between items-center bg-gray-100 dark:bg-gray-700 p-2 rounded">
                      <div>
                        <span className="text-xs text-gray-600 dark:text-gray-400">{t('orders.lineTotal')} </span>
                        <span className="text-sm font-semibold text-blue-600 dark:text-blue-400">
                          AFN {calculateItemTotal(item).toFixed(2)}
                        </span>
                      </div>
                    </div>
                  )}

                    </div>
                  )}
                </div>
              ))}
            </div>

            {/* Inventory Status */}
            {(checkingInventory || inventoryStatus) && (
              <div className={`p-2 rounded-lg border ${
                inventoryStatus?.available 
                  ? 'bg-green-50 dark:bg-green-900/20 border-green-200 dark:border-green-800' 
                  : 'bg-red-50 dark:bg-red-900/20 border-red-200 dark:border-red-800'
              }`}>
                {checkingInventory ? (
                  <div className="flex items-center gap-2">
                    <div className="animate-spin rounded-full h-3.5 w-3.5 sm:h-4 sm:w-4 border-b-2 border-blue-600"></div>
                    <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('orders.checkingInventory')}</span>
                  </div>
                ) : inventoryStatus ? (
                  <div className="flex items-center gap-2">
                    {inventoryStatus.available ? (
                      <CheckCircleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-green-600 dark:text-green-400 flex-shrink-0" />
                    ) : (
                      <ExclamationTriangleIcon className="h-4 w-4 sm:h-5 sm:w-5 text-red-600 dark:text-red-400 flex-shrink-0" />
                    )}
                    <div className="min-w-0 flex-1">
                      <p className={`text-xs sm:text-sm font-medium ${
                        inventoryStatus.available ? 'text-green-800 dark:text-green-300' : 'text-red-800 dark:text-red-300'
                      }`}>
                        {inventoryStatus.available ? t('dashboard.stockAvailable') : t('dashboard.insufficientStock')}
                      </p>
                      <p className={`text-[10px] sm:text-xs ${
                        inventoryStatus.available ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                      }`}>
                        {t('dashboard.currentStock')}: {inventoryStatus.current_stock} |{' '}
                        {t('dashboard.requested')}: {inventoryStatus.requested_quantity}
                        {!inventoryStatus.available && ` | ${t('dashboard.shortage')}: ${inventoryStatus.shortage}`}
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}

            {itemsSubtotal > 0 && (
              <div className="bg-gray-50 dark:bg-gray-900/40 p-3 rounded-lg border border-gray-200 dark:border-gray-700">
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('sales.discount')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={orderDiscount}
                  onChange={(e) => setOrderDiscount(normalizeNumeralString(e.target.value))}
                  className="w-full max-w-xs px-2 sm:px-3 py-1.5 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                />
              </div>
            )}

            {/* Total Amount and Profit Summary */}
            {totalAmount > 0 && (
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 rounded-lg border border-blue-200 dark:border-blue-800">
                {discountAmount > 0 && (
                  <>
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-gray-600 dark:text-gray-400">{t('sales.totalsSubtotal')}</span>
                      <span className="font-medium">AFN {itemsSubtotal.toFixed(2)}</span>
                    </div>
                    <div className="flex justify-between items-center mb-2 text-sm">
                      <span className="text-red-600 dark:text-red-400">{t('sales.discount')}</span>
                      <span className="font-medium text-red-600 dark:text-red-400">-AFN {discountAmount.toFixed(2)}</span>
                    </div>
                  </>
                )}
                <div className="flex justify-between items-center mb-2">
                  <span className="text-sm font-medium text-blue-800 dark:text-blue-200">{t('orders.totalAmountLabel')}</span>
                  <span className="text-lg font-bold text-blue-900 dark:text-blue-100">AFN {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-blue-200 dark:border-blue-700">
                  <span className="text-sm font-medium text-green-700 dark:text-green-300">{t('orders.totalProfitLabel')}</span>
                  <span className={`text-lg font-bold ${calculateTotalProfit() >= 0 ? 'text-green-700 dark:text-green-300' : 'text-amber-700 dark:text-amber-300'}`}>AFN {calculateTotalProfit().toFixed(2)}</span>
                </div>
              </div>
            )}

            {isEditMode && (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-3 pt-1">
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('orders.notesLabel')}
                  </label>
                  <textarea
                    value={orderNotes}
                    onChange={(e) => setOrderNotes(e.target.value)}
                    rows={2}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  />
                </div>
                <div className="md:col-span-2">
                  <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                    {t('orders.status')} *
                  </label>
                  <select
                    value={orderStatus}
                    onChange={(e) => setOrderStatus(e.target.value)}
                    className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500"
                  >
                    <option value="Pending">{t('orders.statusPending')}</option>
                    <option value="In_Production">{t('orders.inProduction')}</option>
                    <option value="Ready">{t('orders.ready')}</option>
                    <option value="Partially_Delivered">{t('orders.partiallyDelivered')}</option>
                    <option value="Delivered">{t('orders.delivered')}</option>
                    <option value="Cancelled">{t('orders.statusCancelled')}</option>
                  </select>
                </div>
              </div>
            )}

            {/* Action Buttons */}
            <div className="flex gap-3 pt-3">
              <button
                type="button"
                onClick={() => navigate('/orders')}
                className="btn-form-red text-sm px-6"
              >
                {t('orders.cancelButton')}
              </button>
              <button
                type="submit"
                disabled={loading}
                className="btn-form-green flex-1 text-sm px-6 disabled:opacity-50 disabled:cursor-not-allowed"
              >
                {loading
                  ? isEditMode
                    ? t('orders.updatingOrder')
                    : t('orders.creatingOrder')
                  : isEditMode
                    ? t('orders.updateOrderButton')
                    : t('orders.createOrderButton')}
              </button>
            </div>
            </form>
          </div>
        </div>

        {/* Customer Details Sidebar */}
        <div className="space-y-3">
          {customerDetails && (
            <div className="backdrop-blur-xl bg-white/70 dark:bg-gray-800/70 p-3 rounded-xl shadow-xl border border-white/20 dark:border-gray-700">
              <h3 className="text-sm font-semibold text-gray-900 dark:text-white mb-2">{t('orders.customerDetailsTitle')}</h3>
              <div className="space-y-2">
                <div className="flex items-center gap-2">
                  <UserIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <div className="min-w-0">
                    <p className="text-xs font-medium text-gray-900 dark:text-white truncate">{customerDetails.name}</p>
                  </div>
                </div>
                <div className="flex items-center gap-2">
                  <PhoneIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                  <p className="text-xs text-gray-700 dark:text-gray-300">{customerDetails.phone}</p>
                </div>
                {customerDetails.email && (
                  <div className="flex items-center gap-2">
                    <EnvelopeIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 flex-shrink-0" />
                    <p className="text-xs text-gray-700 dark:text-gray-300 break-all">{customerDetails.email}</p>
                  </div>
                )}
                <div className="flex items-start gap-2">
                  <MapPinIcon className="h-4 w-4 text-gray-400 dark:text-gray-500 mt-0.5 flex-shrink-0" />
                  <p className="text-xs text-gray-700 dark:text-gray-300 break-words">{customerDetails.address}</p>
                </div>
                {customerDetails.notes && (
                  <div className="pt-2 border-t border-gray-200 dark:border-gray-700">
                    <p className="text-xs text-gray-600 dark:text-gray-400">
                      <span className="font-medium">{t('orders.notesLabel')}</span> {customerDetails.notes}
                    </p>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Order Summary */}
          {formData.customer && (
            <div className="backdrop-blur-xl bg-white/70 p-6 rounded-2xl shadow-xl border border-white/20">
              <h3 className="text-lg font-semibold text-gray-900 mb-4">{t('orders.orderSummaryTitle')}</h3>
              <div className="space-y-3">
                <div className="flex justify-between">
                  <span className="text-gray-600">{t('orders.customer')}:</span>
                  <span className="font-medium">{formData.customer.name}</span>
                </div>
                {formData.item && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('sales.item').replace(/\s*\*?\s*$/, '')}:</span>
                    <span className="font-medium">{formData.item.name}</span>
                  </div>
                )}
                {formData.flag_size && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('orders.flagSize')}:</span>
                    <span className="font-medium">{formData.flag_size}</span>
                  </div>
                )}
                {formData.quantity && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('sales.quantity').replace(/\s*\*?\s*$/, '')}:</span>
                    <span className="font-medium">{formData.quantity}</span>
                  </div>
                )}
                {formData.price_per_unit && (
                  <div className="flex justify-between">
                    <span className="text-gray-600">{t('orders.pricePerUnitLabel')}</span>
                    <span className="font-medium">AFN {parseFloat(formData.price_per_unit).toFixed(2)}</span>
                  </div>
                )}
                {totalAmount > 0 && (
                  <div className="flex justify-between pt-3 border-t border-gray-200">
                    <span className="font-semibold text-gray-900">{t('orders.totalAmountLabel')}</span>
                    <span className="font-bold text-blue-600">AFN {totalAmount.toFixed(2)}</span>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Payment Modal */}
      {showPaymentModal && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-2 sm:p-4">
          <div className="bg-white dark:bg-gray-800 rounded-lg shadow-xl max-w-xl w-full max-h-[90vh] overflow-y-auto p-3 sm:p-4 md:p-6">
            <div className="flex justify-between items-center mb-3 sm:mb-4">
              <h2 className="text-base sm:text-lg md:text-xl font-bold text-gray-900 dark:text-gray-100">{t('orders.paymentModalTitle')}</h2>
              <button
                onClick={() => {
                  setShowPaymentModal(false);
                  setPaymentData({ amount: '', payment_method: 'Cash', is_full_payment: false });
                }}
                className="text-gray-400 hover:text-gray-600 dark:hover:text-gray-300"
              >
                <XMarkIcon className="h-5 w-5 sm:h-6 sm:w-6" />
              </button>
            </div>

            <div className="space-y-3 sm:space-y-4">
              {/* Total Amount Display */}
              <div className="bg-blue-50 dark:bg-blue-900/30 p-3 sm:p-4 rounded-lg border border-blue-200 dark:border-blue-800">
                <div className="flex justify-between items-center">
                  <span className="text-xs sm:text-sm font-medium text-blue-800 dark:text-blue-200">{t('orders.totalAmountLabel')}</span>
                  <span className="text-base sm:text-lg font-bold text-blue-900 dark:text-blue-100">AFN {totalAmount.toFixed(2)}</span>
                </div>
              </div>

              {/* Full/Partial Payment Toggle */}
              <div className="flex flex-col sm:flex-row items-start sm:items-center gap-3 sm:gap-4">
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={paymentData.is_full_payment}
                    onChange={() => handlePaymentChange('is_full_payment', true)}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4 sm:w-5 sm:h-5"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{t('orders.fullPayment')}</span>
                </label>
                <label className="flex items-center gap-2 cursor-pointer">
                  <input
                    type="radio"
                    checked={!paymentData.is_full_payment}
                    onChange={() => handlePaymentChange('is_full_payment', false)}
                    className="text-blue-600 focus:ring-blue-500 w-4 h-4 sm:w-5 sm:h-5"
                  />
                  <span className="text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300">{t('orders.partialPaymentRadio')}</span>
                </label>
              </div>

              {/* Payment Amount */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('orders.paymentAmountLabel')}
                </label>
                <input
                  type="text"
                  inputMode="decimal"
                  value={paymentData.amount}
                  onChange={(e) => handlePaymentChange('amount', normalizeNumeralString(e.target.value))}
                  disabled={paymentData.is_full_payment}
                  className={`w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent ${
                    errors.payment ? 'border-red-300' : 'border-gray-300 dark:border-gray-600'
                  } disabled:bg-gray-100 dark:disabled:bg-gray-700 disabled:cursor-not-allowed dark:bg-gray-700 dark:text-gray-200`}
                />
                {errors.payment && (
                  <p className="mt-1 text-[10px] sm:text-xs text-red-600 dark:text-red-400">{errors.payment}</p>
                )}
                {!paymentData.is_full_payment && (
                  <p className="mt-1 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">
                    {t('orders.remainingPayment', { amount: ((totalAmount - (parseLocaleFloat(paymentData.amount) || 0))).toFixed(2) })}
                  </p>
                )}
                <p className="mt-1.5 text-[10px] sm:text-xs text-gray-500 dark:text-gray-400 border-t border-gray-100 dark:border-gray-700 pt-2">
                  {t('orders.payLaterNote')}
                </p>
              </div>

              {/* Payment Method */}
              <div>
                <label className="block text-xs sm:text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                  {t('orders.paymentMethodLabel')}
                </label>
                <select
                  value={paymentData.payment_method}
                  onChange={(e) => handlePaymentChange('payment_method', e.target.value)}
                  className="w-full px-2 sm:px-3 py-1.5 sm:py-2 text-xs sm:text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-gray-200 rounded-lg focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                >
                  <option value="Cash">{t('orders.payMethodCash')}</option>
                  <option value="Credit">{t('orders.payMethodCredit')}</option>
                  <option value="Partial">{t('orders.payMethodPartial')}</option>
                </select>
              </div>

              {/* Payment Summary */}
              <div className="pt-3 sm:pt-4 border-t border-gray-200 dark:border-gray-700">
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('orders.totalAmountLabel')}</span>
                  <span className="text-xs sm:text-sm font-medium text-gray-900 dark:text-gray-100">AFN {totalAmount.toFixed(2)}</span>
                </div>
                <div className="flex justify-between items-center mb-2">
                  <span className="text-xs sm:text-sm text-gray-600 dark:text-gray-400">{t('sales.payment')}:</span>
                  <span className="text-xs sm:text-sm font-medium text-green-600 dark:text-green-400">
                    AFN {(parseLocaleFloat(paymentData.amount) || 0).toFixed(2)}
                  </span>
                </div>
                <div className="flex justify-between items-center pt-2 border-t border-gray-200 dark:border-gray-700">
                  <span className="text-xs sm:text-sm font-semibold text-gray-900 dark:text-gray-100">{t('common.remainingLabel')}:</span>
                  <span className={`text-xs sm:text-sm font-bold ${
                    (totalAmount - (parseLocaleFloat(paymentData.amount) || 0)) > 0 
                      ? 'text-red-600 dark:text-red-400' 
                      : 'text-green-600 dark:text-green-400'
                  }`}>
                    AFN {((totalAmount - (parseLocaleFloat(paymentData.amount) || 0))).toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Action Buttons */}
              <div className="flex flex-col gap-2 pt-3">
                <div className="flex flex-wrap gap-2 sm:gap-3">
                  <button
                    type="button"
                    onClick={() => {
                      setShowPaymentModal(false);
                      setPaymentData({ amount: '', payment_method: 'Cash', is_full_payment: false });
                    }}
                    className="px-4 sm:px-6 py-2 text-sm bg-red-500 hover:bg-red-600 text-white rounded-full transition-colors shadow-md"
                  >
                    {t('orders.cancelButton')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit({ paymentAmount: 0 })}
                    disabled={loading}
                    className="flex-1 min-w-[140px] px-4 py-2 text-sm bg-gray-600 hover:bg-gray-700 text-white rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    {t('orders.recordOrderNoPayment')}
                  </button>
                  <button
                    type="button"
                    onClick={() => handleSubmit()}
                    disabled={loading}
                    className="flex-1 min-w-[160px] px-4 sm:px-6 py-2 text-sm bg-green-500 hover:bg-green-600 text-white rounded-full shadow-md transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-2"
                  >
                    {loading ? (
                      <>
                        <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
                        <span>{t('orders.creating')}</span>
                      </>
                    ) : (
                      <>
                        <CurrencyDollarIcon className="h-5 w-5" />
                        <span>{t('orders.createOrderButton')}</span>
                      </>
                    )}
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CreateOrder;