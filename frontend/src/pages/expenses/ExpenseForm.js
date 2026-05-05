import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { PlusIcon, BanknotesIcon } from '@heroicons/react/24/outline';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';
import PageHeader from '../../components/common/PageHeader';
import LocalizedDateInput from '../../components/common/LocalizedDateInput';
import { normalizeNumeralString, parseLocaleFloat } from '../../utils/numerals';

const ExpenseForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t } = useTranslation();
  const [loading, setLoading] = useState(!!id);
  const [submitting, setSubmitting] = useState(false);
  const [showAddCategory, setShowAddCategory] = useState(false);
  const [newCategory, setNewCategory] = useState('');
  const [formData, setFormData] = useState({
    description: '',
    amount: '',
    expense_date: new Date().toISOString().split('T')[0],
    category: 'office',
    is_for_press: true,
    notes: ''
  });

  const categories = [
    { value: 'office', label: 'Office Supplies' },
    { value: 'utilities', label: 'Utilities' },
    { value: 'transport', label: 'Transportation' },
    { value: 'marketing', label: 'Marketing' },
    { value: 'maintenance', label: 'Maintenance' },
    { value: 'other', label: 'Other' }
  ];

  useEffect(() => {
    if (id) {
      fetchExpense();
    }
  }, [id]);

  const fetchExpense = async () => {
    try {
      const response = await api.get(`/api/expenses/${id}/`);
      setFormData(response.data);
    } catch (err) {
      console.error('Error fetching expense:', err);
      addToast(t('expenses.failedToFetchExpense'), 'error');
      navigate('/expenses');
    } finally {
      setLoading(false);
    }
  };

  const handleChange = (e) => {
    const { name, value, type, checked } = e.target;
    const normalizedValue = name === 'amount' ? normalizeNumeralString(value) : value;
    setFormData(prev => ({
      ...prev,
      [name]: type === 'checkbox' ? checked : normalizedValue
    }));
  };

  const handleAddCategory = () => {
    if (newCategory.trim()) {
      setFormData(prev => ({ ...prev, category: newCategory.trim() }));
      setNewCategory('');
      setShowAddCategory(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.description.trim()) {
      addToast(t('expenses.descriptionRequired'), 'error');
      return;
    }
    const amountValue = parseLocaleFloat(formData.amount);
    if (!formData.amount || Number.isNaN(amountValue) || amountValue <= 0) {
      addToast(t('expenses.amountRequired'), 'error');
      return;
    }

    setSubmitting(true);
    try {
      if (id) {
        await api.put(`/api/expenses/${id}/`, { ...formData, amount: amountValue });
        addToast(t('expenses.expenseUpdated'), 'success');
      } else {
        await api.post('/api/expenses/', { ...formData, amount: amountValue });
        addToast(t('expenses.expenseCreated'), 'success');
      }
      navigate('/expenses');
    } catch (err) {
      console.error('Error saving expense:', err);
      addToast(t('expenses.failedToSaveExpense'), 'error');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading) return <div className="flex justify-center items-center min-h-screen"><div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" /></div>;

  return (
    <div className="min-h-0 bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-1.5 sm:p-2 space-y-1.5 sm:space-y-2">
      {/* Add Category Modal */}
      {showAddCategory && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-3">
          <div className="bg-white dark:bg-gray-800 p-4 rounded-lg shadow-xl max-w-sm w-full">
            <h3 className="text-sm font-semibold mb-2 text-gray-900 dark:text-white">Add New Category</h3>
            <input
              type="text"
              value={newCategory}
              onChange={(e) => setNewCategory(e.target.value)}
              onKeyPress={(e) => e.key === 'Enter' && handleAddCategory()}
              placeholder={t('expenses.enterCategoryName') || 'Enter category name'}
              className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 mb-3"
              autoFocus
            />
            <div className="flex gap-2">
              <button
                onClick={handleAddCategory}
                type="button"
                className="btn-form-green flex-1"
              >
                {t('common.add')}
              </button>
              <button
                type="button"
                onClick={() => {
                  setShowAddCategory(false);
                  setNewCategory('');
                }}
                className="btn-form-red flex-1"
              >
                {t('common.cancel')}
              </button>
            </div>
          </div>
        </div>
      )}

      <div className="bg-white dark:bg-gray-800 rounded-lg shadow-md border border-blue-100 dark:border-gray-700 mx-1 sm:mx-2 p-2">
        <PageHeader
          title={id ? t('expenses.editExpense') : t('expenses.addExpenseForm')}
          subtitle={t('expenses.createNew')}
          icon={BanknotesIcon}
          compact
          actions={
            <button
              type="button"
              onClick={() => navigate('/expenses')}
              className="btn-form-green text-xs py-1 px-2"
            >
              {t('expenses.title')}
            </button>
          }
        />
      </div>

      <div className="bg-white dark:bg-gray-800 p-3 sm:p-4 rounded-lg shadow border border-gray-100 dark:border-gray-700 mx-1 sm:mx-2">
        <form onSubmit={handleSubmit} className="space-y-2.5 sm:space-y-3">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-2 sm:gap-3">
            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenses.description')} *</label>
              <input type="text" name="description" value={formData.description} onChange={handleChange} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('expenses.enterDescription')} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenses.amount')} (AFN) *</label>
              <input type="text" inputMode="decimal" name="amount" value={formData.amount} onChange={handleChange} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" placeholder={t('expenses.amountPlaceholder') || '0.00'} />
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenses.expenseFor')}</label>
              <div className="flex items-center gap-3 mt-1">
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_for_press"
                    checked={formData.is_for_press}
                    onChange={handleChange}
                    className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('expenses.locationPress') || 'Press'}</span>
                </label>
                <label className="flex items-center gap-1.5 cursor-pointer">
                  <input
                    type="checkbox"
                    name="is_for_press"
                    checked={!formData.is_for_press}
                    onChange={(e) => setFormData(prev => ({ ...prev, is_for_press: !e.target.checked }))}
                    className="w-3.5 h-3.5 text-blue-600 rounded focus:ring-2 focus:ring-blue-500"
                  />
                  <span className="text-xs text-gray-700 dark:text-gray-300">{t('expenses.locationHome') || 'Home'}</span>
                </label>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenses.category')} *</label>
              <div className="flex gap-2">
                <select
                  name="category"
                  value={categories.find(c => c.value === formData.category) ? formData.category : 'custom'}
                  onChange={(e) => {
                    if (e.target.value === 'add_new') {
                      setShowAddCategory(true);
                    } else if (e.target.value !== 'custom') {
                      handleChange(e);
                    }
                  }}
                  className="flex-1 px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  {categories.map(cat => (
                    <option key={cat.value} value={cat.value}>{cat.label}</option>
                  ))}
                  {!categories.find(c => c.value === formData.category) && (
                    <option value="custom">{formData.category}</option>
                  )}
                  <option value="add_new">+ {t('expenses.addNewCategory') || 'Add New Category'}</option>
                </select>
              </div>
            </div>

            <div>
              <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenses.date')} *</label>
              <LocalizedDateInput
                name="expense_date"
                value={formData.expense_date}
                onChange={(dateValue) => setFormData((prev) => ({ ...prev, expense_date: dateValue }))}
                className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-xs font-medium text-gray-700 dark:text-gray-300 mb-1">{t('expenses.notes')}</label>
            <textarea name="notes" value={formData.notes} onChange={handleChange} rows={2} className="w-full px-2 py-1.5 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 resize-y min-h-[3.5rem]" placeholder={t('expenses.enterNotes')} />
          </div>

          <div className="flex gap-2 pt-2 flex-wrap">
            <button type="submit" disabled={submitting} className="btn-form-green text-sm py-1.5 px-3 disabled:opacity-50">{submitting ? t('expenses.saving') : t('expenses.saveExpense')}</button>
            <button type="button" onClick={() => navigate('/expenses')} className="btn-form-red text-sm py-1.5 px-3">{t('common.cancel')}</button>
          </div>
        </form>
      </div>
    </div>
  );
};

export default ExpenseForm;
