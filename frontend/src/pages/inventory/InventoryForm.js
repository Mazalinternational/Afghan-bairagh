import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeftIcon,
  CubeIcon,
  HashtagIcon,
  TagIcon,
  CurrencyDollarIcon,
  DocumentTextIcon,
  ExclamationTriangleIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';
import PageHeader from '../../components/common/PageHeader';

const InventoryForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [categories, setCategories] = useState([]);
  const [flagDesignTypes, setFlagDesignTypes] = useState([]);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategoryName, setNewCategoryName] = useState('');
  const [showAddDesignType, setShowAddDesignType] = useState(false);
  const [newDesignType, setNewDesignType] = useState('');
  const [formData, setFormData] = useState({
    name: '',
    item_type: 'raw_material',
    category: '',
    description: '',
    cost_price: '',
    unit_price: '',
    press_stock: '',
    home_stock: '',
    minimum_stock: '',
    flag_design_type: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    fetchCategories();
    fetchFlagDesignTypes();
    if (isEdit) {
      fetchItem();
    }
  }, [id, isEdit]);

  const fetchCategories = async () => {
    try {
      const res = await api.get('/api/inventory/categories/');
      setCategories(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching categories:', err);
    }
  };

  const fetchFlagDesignTypes = async () => {
    try {
      const res = await api.get('/api/inventory/flag-design-types/');
      setFlagDesignTypes(Array.isArray(res.data) ? res.data : res.data.results || []);
    } catch (err) {
      console.error('Error fetching flag design types:', err);
    }
  };

  const handleAddCategory = async () => {
    if (!newCategoryName.trim()) return;
    try {
      const res = await api.post('/api/inventory/categories/', {
        name: newCategoryName.trim(),
        description: ''
      });
      setCategories([...categories, res.data]);
      setFormData(prev => ({ ...prev, category: res.data.id }));
      setNewCategoryName('');
      setShowAddCategory(false);
      addToast(t('inventory.toastCategoryAdded'), 'success');
    } catch (err) {
      console.error('Error adding category:', err);
      addToast(err.response?.data?.name?.[0] || t('inventory.toastCategoryAddFailed'), 'error');
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
      setFormData(prev => ({ ...prev, flag_design_type: res.data.id }));
      setNewDesignType('');
      setShowAddDesignType(false);
      addToast(t('inventory.toastDesignAdded'), 'success');
    } catch (err) {
      console.error('Error adding design type:', err);
      addToast(t('inventory.toastDesignAddFailed'), 'error');
    }
  };

  const fetchItem = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/inventory/items/${id}/`);
      setFormData({
        name: res.data.name || '',
        item_type: res.data.item_type || 'raw_material',
        category: res.data.category || '',
        description: res.data.description || '',
        cost_price: res.data.cost_price ?? '',
        unit_price: res.data.unit_price || '',
        press_stock: res.data.press_stock ?? res.data.current_stock ?? '',
        home_stock: res.data.home_stock ?? '',
        minimum_stock: res.data.minimum_stock || '',
        flag_design_type: res.data.flag_design_type || ''
      });
    } catch (err) {
      console.error('Error fetching item:', err);
      addToast(t('inventory.toastFetchItemFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({ ...prev, [name]: value }));
    if (errors[name]) {
      setErrors(prev => ({ ...prev, [name]: '' }));
    }
  };

  const validateForm = () => {
    const newErrors = {};
    
    if (!formData.name.trim()) {
      newErrors.name = t('inventory.errNameRequired');
    }
    
    if (!formData.category) {
      newErrors.category = t('inventory.errCategoryRequired');
    }



    if (formData.press_stock === '' || parseInt(formData.press_stock) < 0) {
      newErrors.press_stock = t('inventory.errPressStock');
    }

    if (formData.home_stock === '' || parseInt(formData.home_stock) < 0) {
      newErrors.home_stock = t('inventory.errHomeStock');
    }

    if (formData.minimum_stock === '' || parseInt(formData.minimum_stock) < 0) {
      newErrors.minimum_stock = t('inventory.errMinStock');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    setLoading(true);
    try {
      const submitData = {
        ...formData,
        cost_price: formData.cost_price !== '' && formData.cost_price != null ? parseFloat(formData.cost_price) : null,
        unit_price: formData.unit_price ? parseFloat(formData.unit_price) : null,
        press_stock: parseInt(formData.press_stock) || 0,
        home_stock: parseInt(formData.home_stock) || 0,
        minimum_stock: parseInt(formData.minimum_stock),
        flag_design_type: formData.flag_design_type || null
      };

      if (isEdit) {
        await api.put(`/api/inventory/items/${id}/`, submitData);
        addToast(t('inventory.toastItemUpdated'), 'success');
      } else {
        await api.post('/api/inventory/items/', submitData);
        addToast(t('inventory.toastItemCreated'), 'success');
      }
      navigate('/inventory');
    } catch (err) {
      console.error('Error saving item:', err);
      if (err.response?.data) {
        setErrors(err.response.data);
        addToast(t('inventory.toastSaveFailed'), 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const sellPx = parseFloat(formData.unit_price) || 0;
  const costPx = parseFloat(formData.cost_price) || 0;
  const profitPerUnit = sellPx - costPx;

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="max-w-6xl mx-auto">
        <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2">
          <div className="space-y-2 sm:space-y-3 p-2 sm:p-3 md:p-4">
      {/* Header */}
      <PageHeader
        title={isEdit ? t('inventory.editItemPageTitle') : t('inventory.formHeaderCreate')}
        subtitle="Add item — new inventory record"
        icon={CubeIcon}
        actions={
          <button
            onClick={() => navigate('/inventory')}
            className="px-3 py-2 bg-gray-500/80 hover:bg-gray-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back
          </button>
        }
      />

      {/* Form */}
      <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name, Type, and Category Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CubeIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
                {t('inventory.formItemNameLabel')}
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.name ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('inventory.formItemNamePlaceholder')}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1">{errors.name}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <TagIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
                {t('inventory.formTypeLabel')}
              </label>
              <select
                name="item_type"
                value={formData.item_type}
                onChange={handleChange}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              >
                <option value="raw_material">{t('inventory.rawMaterial')}</option>
                <option value="finished_product">{t('inventory.finishedProduct')}</option>
              </select>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inventory.formCategoryLabel')}
              </label>
              <div className="flex gap-2">
                <select
                  name="category"
                  value={formData.category}
                  onChange={handleChange}
                  className={`flex-1 px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                    errors.category ? 'border-red-500' : 'border-gray-300'
                  }`}
                >
                  <option value="">{t('inventory.formSelectCategory')}</option>
                  {categories.map(cat => (
                    <option key={cat.id} value={cat.id}>{cat.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddCategory(!showAddCategory)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg text-xs flex-shrink-0"
                  title={t('inventory.formAddCategoryTitle')}
                >
                  +
                </button>
              </div>
              {showAddCategory && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newCategoryName}
                    onChange={(e) => setNewCategoryName(e.target.value)}
                    placeholder={t('inventory.formNewCategoryPlaceholder')}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
                  />
                  <button
                    type="button"
                    onClick={handleAddCategory}
                    className="btn-form-green flex-shrink-0 py-1.5 px-2.5"
                  >
                    {t('common.add')}
                  </button>
                </div>
              )}
              {errors.category && (
                <p className="text-red-500 text-xs mt-1">{errors.category}</p>
              )}
            </div>
          </div>
          
          {/* Note about SKU */}
          <div className="bg-blue-50 dark:bg-blue-900/20 border border-blue-200 dark:border-blue-800 rounded-lg p-2">
            <p className="text-xs text-blue-700 dark:text-blue-300">
              <HashtagIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
              <strong>{t('common.note')}</strong> {t('inventory.formSkuNote')}
            </p>
          </div>

          {/* Purchase cost, selling price, profit — then stock counts */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CurrencyDollarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
                {t('inventory.purchasePriceLabel')}
              </label>
              <input
                type="number"
                name="cost_price"
                value={formData.cost_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                placeholder="0.00"
              />
            </div>
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <CurrencyDollarIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
                {t('inventory.formUnitPriceLabel')}
              </label>
              <input
                type="number"
                name="unit_price"
                value={formData.unit_price}
                onChange={handleChange}
                step="0.01"
                min="0"
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.unit_price ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('inventory.formUnitPricePlaceholder')}
              />
              {errors.unit_price && (
                <p className="text-red-500 text-xs mt-1">{errors.unit_price}</p>
              )}
            </div>
            <div className="flex flex-col justify-end">
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inventory.profitPerUnitLabel')}
              </label>
              <div
                className={`px-2 py-1.5 text-sm rounded-lg border border-gray-200 dark:border-gray-600 bg-gray-50 dark:bg-gray-700/80 font-semibold ${
                  profitPerUnit >= 0 ? 'text-green-700 dark:text-green-400' : 'text-red-600 dark:text-red-400'
                }`}
              >
                AFN {profitPerUnit.toFixed(2)}
              </div>
              <p className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{t('inventory.profitPerUnitHint')}</p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inventory.formPressStockLabel')}
              </label>
              <input
                type="number"
                name="press_stock"
                value={formData.press_stock}
                onChange={handleChange}
                min="0"
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.press_stock ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('inventory.formPressStockPlaceholder')}
              />
              {errors.press_stock && (
                <p className="text-red-500 text-xs mt-1">{errors.press_stock}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inventory.formHomeStockLabel')}
              </label>
              <input
                type="number"
                name="home_stock"
                value={formData.home_stock}
                onChange={handleChange}
                min="0"
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.home_stock ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('inventory.formHomeStockPlaceholder')}
              />
              {errors.home_stock && (
                <p className="text-red-500 text-xs mt-1">{errors.home_stock}</p>
              )}
            </div>
          </div>

          {/* Minimum Stock and Flag Design Type Row */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                <ExclamationTriangleIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
                {t('inventory.formMinStockLabel')}
              </label>
              <input
                type="number"
                name="minimum_stock"
                value={formData.minimum_stock}
                onChange={handleChange}
                min="0"
                className={`w-full px-2 py-1.5 text-sm border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white dark:border-gray-600 ${
                  errors.minimum_stock ? 'border-red-500' : 'border-gray-300'
                }`}
                placeholder={t('inventory.formMinStockPlaceholder')}
              />
              {errors.minimum_stock && (
                <p className="text-red-500 text-xs mt-1">{errors.minimum_stock}</p>
              )}
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
                {t('inventory.formFlagDesignLabel')}
              </label>
              <div className="flex gap-2">
                <select
                  name="flag_design_type"
                  value={formData.flag_design_type}
                  onChange={handleChange}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
                >
                  <option value="">{t('inventory.formSelectDesignOptional')}</option>
                  {flagDesignTypes.map(dt => (
                    <option key={dt.id} value={dt.id}>{dt.name}</option>
                  ))}
                </select>
                <button
                  type="button"
                  onClick={() => setShowAddDesignType(!showAddDesignType)}
                  className="px-3 py-1.5 bg-gray-200 dark:bg-gray-600 hover:bg-gray-300 dark:hover:bg-gray-500 rounded-lg text-xs flex-shrink-0"
                  title={t('inventory.formAddDesignTitle')}
                >
                  +
                </button>
              </div>
              {showAddDesignType && (
                <div className="mt-2 flex gap-2">
                  <input
                    type="text"
                    value={newDesignType}
                    onChange={(e) => setNewDesignType(e.target.value)}
                    placeholder={t('inventory.formNewDesignPlaceholder')}
                    className="flex-1 px-2 py-1.5 text-xs border border-gray-300 dark:border-gray-600 rounded-lg dark:bg-gray-700 dark:text-white"
                    onKeyPress={(e) => e.key === 'Enter' && handleAddDesignType()}
                  />
                  <button
                    type="button"
                    onClick={handleAddDesignType}
                    className="btn-form-green flex-shrink-0 py-1.5 px-2.5"
                  >
                    {t('common.add')}
                  </button>
                </div>
              )}
            </div>
            <div></div>
          </div>

          {/* Description Row */}
          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">
              <DocumentTextIcon className="h-3.5 w-3.5 sm:h-4 sm:w-4 inline mr-1" />
              {t('inventory.formDescriptionLabel')}
            </label>
            <textarea
              name="description"
              value={formData.description}
              onChange={handleChange}
              rows={2}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700 dark:text-white"
              placeholder={t('inventory.formDescriptionPlaceholder')}
            />
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-form-green disabled:opacity-50"
            >
              {loading ? t('common.saving') : (isEdit ? t('inventory.formUpdateButton') : t('inventory.formCreateButton'))}
            </button>
            <button
              type="button"
              onClick={() => navigate('/inventory')}
              className="btn-form-red"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default InventoryForm;
