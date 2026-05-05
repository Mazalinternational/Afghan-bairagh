import React, { useMemo, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MagnifyingGlassIcon, DocumentTextIcon } from '@heroicons/react/24/outline';
import PageHeader from '../../components/common/PageHeader';
import api from '../../services/api';
import { useToast } from '../../context/ToastContext';
import { useTranslation } from '../../i18n/fallback';

const fetchAllPages = async (url) => {
  const pageSize = 100;
  let page = 1;
  let total = Infinity;
  const rows = [];
  while (rows.length < total) {
    const sep = url.includes('?') ? '&' : '?';
    const res = await api.get(`${url}${sep}page=${page}&page_size=${pageSize}`);
    const chunk = res.data?.results || res.data || [];
    if (!Array.isArray(chunk)) break;
    total = res.data?.count ?? chunk.length;
    rows.push(...chunk);
    if (chunk.length < pageSize) break;
    page += 1;
    if (page > 50) break;
  }
  return rows;
};

const normalize = (value) => String(value || '').toLowerCase().trim();

const RecordLookup = () => {
  const navigate = useNavigate();
  const { addToast } = useToast();
  const { t, formatDate } = useTranslation();
  const [query, setQuery] = useState('');
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState({
    customers: [],
    suppliers: [],
    orders: [],
    sales: [],
    directSales: [],
    quotations: [],
    purchases: [],
  });

  const performSearch = async () => {
    const q = normalize(query);
    if (!q) {
      addToast(t('recordLookup.enterQuery'), 'error');
      return;
    }
    setLoading(true);
    try {
      const [customers, suppliers, orders, sales, directSales, quotations, purchases] = await Promise.all([
        fetchAllPages('/api/customers/'),
        fetchAllPages('/api/suppliers/'),
        fetchAllPages('/api/orders/'),
        fetchAllPages('/api/sales/'),
        fetchAllPages('/api/direct-sales/'),
        fetchAllPages('/api/quotations/'),
        fetchAllPages('/api/purchases/'),
      ]);

      const matchIdentity = (row) => {
        const id = normalize(row.id);
        const name = normalize(row.name);
        const phone = normalize(row.phone);
        const phoneSecondary = normalize(row.phone_secondary);
        return id === q || name.includes(q) || phone.includes(q) || phoneSecondary.includes(q);
      };

      const matchedCustomers = customers.filter(matchIdentity);
      const matchedSuppliers = suppliers.filter(matchIdentity);

      const customerIds = new Set(matchedCustomers.map((c) => Number(c.id)));
      const customerNames = matchedCustomers.map((c) => normalize(c.name));
      const supplierIds = new Set(matchedSuppliers.map((s) => Number(s.id)));
      const supplierNames = matchedSuppliers.map((s) => normalize(s.name));

      const matchesName = (value, names) => {
        const v = normalize(value);
        return names.some((name) => name && v.includes(name));
      };

      const filteredOrders = orders.filter((o) => customerIds.has(Number(o.customer)) || matchesName(o.customer_name, customerNames));
      const filteredSales = sales.filter((s) => customerIds.has(Number(s.customer)) || matchesName(s.customer_name, customerNames));
      const filteredDirectSales = directSales.filter((d) => matchesName(d.customer_name, customerNames));
      const filteredQuotations = quotations.filter((qRow) => customerIds.has(Number(qRow.customer)) || matchesName(qRow.customer_name, customerNames));
      const filteredPurchases = purchases.filter((p) => supplierIds.has(Number(p.supplier)) || matchesName(p.supplier_name, supplierNames));

      setData({
        customers: matchedCustomers,
        suppliers: matchedSuppliers,
        orders: filteredOrders,
        sales: filteredSales,
        directSales: filteredDirectSales,
        quotations: filteredQuotations,
        purchases: filteredPurchases,
      });
    } catch (error) {
      console.error(error);
      addToast(t('recordLookup.searchFailed'), 'error');
    } finally {
      setLoading(false);
    }
  };

  const sections = useMemo(() => ([
    {
      key: 'orders',
      title: t('recordLookup.orders'),
      rows: data.orders,
      dateField: 'order_date',
      amountField: 'total_amount',
      nameField: 'customer_name',
      viewPath: (r) => `/orders/${r.id}`,
    },
    {
      key: 'sales',
      title: t('recordLookup.sales'),
      rows: data.sales,
      dateField: 'sale_date',
      amountField: 'total_amount',
      nameField: 'customer_name',
      viewPath: (r) => `/sales/${r.id}`,
    },
    {
      key: 'directSales',
      title: t('recordLookup.directSales'),
      rows: data.directSales,
      dateField: 'sale_date',
      amountField: 'net_amount',
      nameField: 'customer_name',
      viewPath: (r) => `/sales/direct/${r.id}`,
    },
    {
      key: 'quotations',
      title: t('recordLookup.quotations'),
      rows: data.quotations,
      dateField: 'quotation_date',
      amountField: 'total_estimated_amount',
      nameField: 'customer_name',
      viewPath: (r) => `/quotations/${r.id}`,
    },
    {
      key: 'purchases',
      title: t('recordLookup.purchases'),
      rows: data.purchases,
      dateField: 'purchase_date',
      amountField: 'cost',
      nameField: 'supplier_name',
      viewPath: (r) => `/purchases/${r.id}`,
    },
  ]), [data, t]);

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-blue-100 to-indigo-100 dark:from-gray-900 dark:via-blue-900 dark:to-gray-900 p-2">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-xl border border-blue-100 dark:border-gray-700 mx-2 p-3 space-y-3">
        <PageHeader
          title={t('recordLookup.title')}
          subtitle={t('recordLookup.subtitle')}
          icon={DocumentTextIcon}
        />

        <div className="grid grid-cols-1 md:grid-cols-4 gap-2">
          <input
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            onKeyDown={(e) => { if (e.key === 'Enter') performSearch(); }}
            placeholder={t('recordLookup.placeholder')}
            className="md:col-span-3 border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg px-3 py-2 text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
          />
          <button
            type="button"
            onClick={performSearch}
            disabled={loading}
            className="btn-form-green text-sm disabled:opacity-50 flex items-center justify-center gap-1.5"
          >
            <MagnifyingGlassIcon className="h-4 w-4" />
            {loading ? t('common.loading') : t('common.search')}
          </button>
        </div>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-2">
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('recordLookup.matchedCustomers')}</h3>
            {data.customers.length === 0 ? (
              <p className="text-xs text-gray-500">{t('common.noData')}</p>
            ) : data.customers.map((c) => (
              <div key={`customer-${c.id}`} className="text-xs text-gray-700 dark:text-gray-300">
                #{c.id} - {c.name} - {c.phone || '-'}
              </div>
            ))}
          </div>
          <div className="rounded-lg border border-gray-200 dark:border-gray-700 p-2">
            <h3 className="text-xs font-semibold text-gray-700 dark:text-gray-300 mb-1">{t('recordLookup.matchedSuppliers')}</h3>
            {data.suppliers.length === 0 ? (
              <p className="text-xs text-gray-500">{t('common.noData')}</p>
            ) : data.suppliers.map((s) => (
              <div key={`supplier-${s.id}`} className="text-xs text-gray-700 dark:text-gray-300">
                #{s.id} - {s.name} - {s.phone || '-'}
              </div>
            ))}
          </div>
        </div>

        {sections.map((section) => (
          <div key={section.key} className="rounded-lg border border-gray-200 dark:border-gray-700 overflow-hidden">
            <div className="px-3 py-2 bg-blue-600 text-white text-sm font-semibold">
              {section.title} ({section.rows.length})
            </div>
            {section.rows.length === 0 ? (
              <div className="p-3 text-xs text-gray-500">{t('common.noData')}</div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full text-xs">
                  <thead className="bg-gray-100 dark:bg-gray-700">
                    <tr>
                      <th className="px-2 py-2 text-left">ID</th>
                      <th className="px-2 py-2 text-left">{t('common.name')}</th>
                      <th className="px-2 py-2 text-left">{t('common.date')}</th>
                      <th className="px-2 py-2 text-left">{t('common.amount')}</th>
                      <th className="px-2 py-2 text-left">{t('common.actions')}</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-gray-200 dark:divide-gray-700">
                    {section.rows.map((row) => (
                      <tr key={`${section.key}-${row.id}`} className="bg-white dark:bg-gray-800">
                        <td className="px-2 py-2">{row.id}</td>
                        <td className="px-2 py-2">{row[section.nameField] || '-'}</td>
                        <td className="px-2 py-2">{row[section.dateField] ? formatDate(row[section.dateField]) : '-'}</td>
                        <td className="px-2 py-2">AFN {parseFloat(row[section.amountField] || 0).toFixed(2)}</td>
                        <td className="px-2 py-2">
                          <button
                            type="button"
                            onClick={() => navigate(section.viewPath(row))}
                            className="px-2 py-1 rounded bg-blue-100 text-blue-700 hover:bg-blue-200"
                          >
                            {t('common.view')}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

export default RecordLookup;

