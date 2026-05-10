import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useTranslation } from '../../i18n/fallback';
import {
  ArrowLeftIcon,
  UserIcon,
  PhoneIcon,
  MapPinIcon,
  EnvelopeIcon,
  DocumentTextIcon,
  UserGroupIcon,
  HashtagIcon
} from '@heroicons/react/24/outline';
import api from '../../services/api';
import { getAccessToken } from '../../utils/tokenStorage';
import PageHeader from '../../components/common/PageHeader';

const CustomerForm = () => {
  const { id } = useParams();
  const navigate = useNavigate();
  const { t } = useTranslation();
  const isEdit = Boolean(id);

  const [formData, setFormData] = useState({
    name: '',
    manual_serial_no: '',
    phone: '',
    phone_secondary: '',
    address: '',
    email: '',
    notes: ''
  });
  const [loading, setLoading] = useState(false);
  const [errors, setErrors] = useState({});

  useEffect(() => {
    if (isEdit) {
      fetchCustomer();
    }
  }, [id, isEdit]);

  const fetchCustomer = async () => {
    setLoading(true);
    try {
      const res = await api.get(`/api/customers/${id}/`);
      setFormData({
        name: res.data.name || '',
        manual_serial_no: res.data.manual_serial_no || '',
        phone: res.data.phone || '',
        phone_secondary: res.data.phone_secondary || '',
        address: res.data.address || '',
        email: res.data.email || '',
        notes: res.data.notes || ''
      });
    } catch (err) {
      console.error('Error fetching customer:', err);
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
      newErrors.name = t('customers.nameRequired');
    }
    
    if (!formData.phone.trim()) {
      newErrors.phone = t('customers.phoneRequired');
    }
    
    if (!formData.address.trim()) {
      newErrors.address = t('customers.addressRequired');
    }

    if (formData.email && !/\S+@\S+\.\S+/.test(formData.email)) {
      newErrors.email = t('customers.invalidEmail');
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!validateForm()) return;

    // Check if user is authenticated, if not set test token
    if (!getAccessToken()) {
      localStorage.setItem('token', 'test-token');
    }

    setLoading(true);
    try {
      if (isEdit) {
        await api.put(`/api/customers/${id}/`, formData);
      } else {
        await api.post('/api/customers/', formData);
      }
      navigate('/customers');
    } catch (err) {
      console.error('Error saving customer:', err);
      if (err.response?.data) {
        setErrors(err.response.data);
      }
    } finally {
      setLoading(false);
    }
  };

  if (loading && isEdit) {
    return (
      <div className="flex justify-center items-center min-h-screen">
        <div className="h-10 w-10 animate-spin border-b-2 border-blue-600 rounded-full" />
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2 sm:p-3">
      <div className="w-full space-y-3">
      {/* Header */}
      <PageHeader
        title={isEdit ? t('customers.editCustomer') : t('customers.addCustomerForm')}
        subtitle={isEdit ? 'Update customer information' : 'Create a new customer'}
        icon={UserGroupIcon}
        actions={
          <button
            onClick={() => navigate('/customers')}
            className="px-3 py-2 bg-red-500/80 hover:bg-red-600/80 text-white rounded-full backdrop-blur-sm shadow-lg hover:shadow-xl border border-white/20 transition-all text-xs font-semibold flex items-center gap-1"
          >
            <ArrowLeftIcon className="h-3.5 w-3.5" />
            Back
          </button>
        }
      />

      {/* Form */}
      <div className="bg-white/80 dark:bg-gray-800/80 backdrop-blur-md p-4 rounded-xl shadow-xl border border-white/20">
        <form onSubmit={handleSubmit} className="space-y-4">
          {/* Name, Phone and Email Row */}
          <div className="grid grid-cols-1 md:grid-cols-5 gap-3">
            <div className="max-w-md">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <UserIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('common.name')} *
              </label>
              <input
                type="text"
                name="name"
                value={formData.name}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                  errors.name ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                }`}
                placeholder={t('customers.enterName')}
              />
              {errors.name && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.name}
                </p>
              )}
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <HashtagIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('customers.manualSerialNo')}
              </label>
              <input
                type="text"
                name="manual_serial_no"
                value={formData.manual_serial_no}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm transition-all"
                placeholder={t('customers.manualSerialNoPlaceholder')}
              />
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <PhoneIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('customers.phone')} *
              </label>
              <input
                type="tel"
                name="phone"
                value={formData.phone}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                  errors.phone ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                }`}
                placeholder={t('customers.enterPhone')}
              />
              {errors.phone && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.phone}
                </p>
              )}
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <PhoneIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('customers.phone')} 2
              </label>
              <input
                type="tel"
                name="phone_secondary"
                value={formData.phone_secondary}
                onChange={handleChange}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 dark:bg-gray-700/50 dark:text-white rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 backdrop-blur-sm transition-all"
                placeholder={`${t('customers.enterPhone')} (optional)`}
              />
            </div>

            <div className="max-w-md">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <EnvelopeIcon className="h-3.5 w-3.5 inline mr-1" />
                Email
              </label>
              <input
                type="email"
                name="email"
                value={formData.email}
                onChange={handleChange}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                  errors.email ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                }`}
                placeholder="Enter email address (optional)"
              />
              {errors.email && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.email}
                </p>
              )}
            </div>
          </div>

          {/* Address and Notes Row */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
            <div className="max-w-2xl">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <MapPinIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('customers.address')} *
              </label>
              <textarea
                name="address"
                value={formData.address}
                onChange={handleChange}
                rows={3}
                className={`w-full px-3 py-2 text-sm border rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white dark:border-gray-600 backdrop-blur-sm transition-all ${
                  errors.address ? 'border-red-500 ring-2 ring-red-200' : 'border-gray-300'
                }`}
                placeholder={t('customers.enterAddress')}
              />
              {errors.address && (
                <p className="text-red-500 text-xs mt-1 flex items-center gap-1">
                  <span className="inline-block w-1 h-1 bg-red-500 rounded-full"></span>
                  {errors.address}
                </p>
              )}
            </div>

            <div className="max-w-2xl">
              <label className="block text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1.5">
                <DocumentTextIcon className="h-3.5 w-3.5 inline mr-1" />
                {t('customers.notes')}
              </label>
              <textarea
                name="notes"
                value={formData.notes}
                onChange={handleChange}
                rows={3}
                className="w-full px-3 py-2 text-sm border border-gray-300 dark:border-gray-600 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 dark:bg-gray-700/50 dark:text-white backdrop-blur-sm transition-all"
                placeholder={t('customers.notesOptional')}
              />
            </div>
          </div>

          {/* Submit Button */}
          <div className="flex gap-2">
            <button
              type="submit"
              disabled={loading}
              className="btn-form-green text-sm disabled:opacity-50"
            >
              {loading ? t('customers.saving') : (isEdit ? t('customers.updateCustomer') : t('customers.createCustomer'))}
            </button>
            <button
              type="button"
              onClick={() => navigate('/customers')}
              className="btn-form-red text-sm"
            >
              {t('common.cancel')}
            </button>
          </div>
        </form>
      </div>
      </div>
    </div>
  );
};

export default CustomerForm;
