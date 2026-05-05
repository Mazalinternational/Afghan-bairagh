import React, { useState, useEffect, useCallback } from 'react';
import api from '../../services/api';
import { useTranslation } from '../../i18n/fallback';
import { useSettings } from '../../context/SettingsContext';
import { 
  ArrowUpIcon, 
  ArrowDownIcon,
  ArrowPathIcon,
  CurrencyDollarIcon,
  ShoppingCartIcon,
  UserGroupIcon,
  ExclamationTriangleIcon,
  BuildingStorefrontIcon,
  ChartBarIcon,
  ArrowTrendingUpIcon,
  ArrowTrendingDownIcon,
  ChevronLeftIcon,
  ChevronRightIcon
} from '@heroicons/react/24/outline';
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell, AreaChart, Area,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer
} from 'recharts';

const Dashboard = () => {
  const { t, formatDate, formatTime } = useTranslation();
  const { formatCurrency, currencySymbol } = useSettings();
  const [loading, setLoading] = useState(true);
  const [dashboardData, setDashboardData] = useState(null);
  const [financialAnalytics, setFinancialAnalytics] = useState(null);
  const [recentTransactions, setRecentTransactions] = useState([]);
  const [error, setError] = useState(null);
  const [transactionPage, setTransactionPage] = useState(1);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 640);
  const [selectedPeriod, setSelectedPeriod] = useState('daily'); // daily, weekly, monthly, yearly
  const transactionsPerPage = 5;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 640);
    };
    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, []);

  const fetchRecentTransactions = useCallback(async () => {
    try {
      const timestamp = Date.now();
      const bust = `_t=${timestamp}`;
      const [ordersRes, expensesRes, purchasesRes, supplierPaymentsRes, roznamchaRes] = await Promise.all([
        api.get(`/api/orders/?ordering=-order_date&limit=15&${bust}`),
        api.get(`/api/expenses/?ordering=-expense_date&limit=10&${bust}`),
        api.get(`/api/purchases/?ordering=-purchase_date&limit=10&${bust}`),
        api.get(`/api/payments/?ordering=-payment_date&limit=10&${bust}`),
        api.get(`/api/roznamcha/?ordering=-date&limit=10&${bust}`)
      ]);
      const orders = ordersRes.data.results || ordersRes.data || [];
      const expenses = expensesRes.data.results || expensesRes.data || [];
      const purchases = purchasesRes.data.results || purchasesRes.data || [];
      const supplierPayments = supplierPaymentsRes.data.results || supplierPaymentsRes.data || [];
      const roznamcha = roznamchaRes.data.results || roznamchaRes.data || [];
      
      // Combine and sort transactions
      const transactions = [
        ...orders.map(o => ({
          id: o.id,
          type: 'order',
          typeLabel: t('dashboard.order'),
          amount: parseFloat(o.total_amount ?? o.total_estimated_amount) || 0,
          customer: o.customer_name || o.customer?.name || t('common.notAvailable'),
          customerId: typeof o.customer === 'object' ? o.customer?.id : o.customer,
          itemName: o.item_name || o.item?.name || o.flag_size || '',
          status: o.status,
          date: o.order_date || o.created_at,
          color: o.status === 'Completed' ? 'green' : o.status === 'Pending' ? 'yellow' : 'red'
        })),
        ...expenses.map(e => ({
          id: e.id,
          type: 'expense',
          typeLabel: t('dashboard.expense'),
          amount: -parseFloat(e.amount) || 0,
          category: e.category_display || (e.category ? e.category.charAt(0).toUpperCase() + e.category.slice(1).replace(/_/g, ' ') : t('common.notAvailable')),
          description: e.description || '',
          date: e.expense_date || e.created_at,
          color: 'red'
        })),
        ...purchases.map(p => ({
          id: p.id,
          type: 'purchase',
          typeLabel: t('dashboard.purchase'),
          amount: -parseFloat(p.cost) || 0,
          supplier: p.supplier_name || p.supplier?.name || t('common.notAvailable'),
          supplierId: typeof p.supplier === 'object' ? p.supplier?.id : p.supplier,
          itemName: p.item_name || p.item_name_display || p.item?.name || '',
          date: p.purchase_date || p.created_at,
          status: p.payment_status ? (p.payment_status.charAt(0).toUpperCase() + p.payment_status.slice(1)) : null,
          color: p.payment_status === 'paid' ? 'green' : p.payment_status === 'partial' ? 'yellow' : 'orange'
        })),
        ...supplierPayments.map(sp => ({
          id: sp.id,
          type: 'supplier_payment',
          typeLabel: t('dashboard.supplierPayment'),
          amount: -parseFloat(sp.amount) || 0,
          supplier: sp.supplier_name || t('common.notAvailable'),
          itemName: sp.purchase_item_name || '',
          description: sp.notes
            ? `${sp.payment_method || t('sales.payment')} - ${sp.notes}`
            : (sp.payment_method || t('sales.payment')),
          date: sp.payment_date || sp.created_at,
          status: 'Paid',
          color: 'green'
        })),
        ...roznamcha.map(r => ({
          id: r.id,
          type: 'roznamcha',
          typeLabel: t('dashboard.roznamcha'),
          amount: -parseFloat(r.cost_price) || 0,
          itemName: r.item_name || '',
          description: r.description || '',
          date: r.date || r.created_at,
          color: 'blue'
        }))
      ].sort((a, b) => new Date(b.date) - new Date(a.date)).slice(0, 20);
      
      setRecentTransactions(transactions);
    } catch (err) {
      console.error('Error fetching recent transactions:', err);
    }
  }, [t]);

  const fetchDashboardData = useCallback(async () => {
    setLoading(true);
    setError(null);
    try {
      const response = await api.get('/api/dashboard/admin-dashboard/', {
        params: {
          period: selectedPeriod,
          _t: Date.now()
        }
      });
      setDashboardData(response.data);
    } catch (err) {
      console.error('Error fetching dashboard data:', err);
      setError(err.response?.data?.detail || err.message || 'Failed to load dashboard data');
    } finally {
      setLoading(false);
    }
  }, [selectedPeriod]);

  const fetchFinancialAnalytics = useCallback(async () => {
    try {
      const response = await api.get('/api/dashboard/financial-analytics/', {
        params: { _t: Date.now() }
      });
      setFinancialAnalytics(response.data);
    } catch (err) {
      console.error('Error fetching financial analytics:', err);
    }
  }, []);

  useEffect(() => {
    fetchDashboardData();
  }, [fetchDashboardData]);

  useEffect(() => {
    fetchFinancialAnalytics();
  }, [fetchFinancialAnalytics]);

  useEffect(() => {
    fetchRecentTransactions();
    const interval = setInterval(fetchRecentTransactions, 120000);
    return () => clearInterval(interval);
  }, [fetchRecentTransactions]);

  const formatTxStatus = (status) => {
    if (status == null || status === '') return null;
    const s = String(status).toLowerCase();
    const key = {
      completed: 'dashboard.completed',
      pending: 'dashboard.pending',
      cancelled: 'dashboard.cancelled',
      partial: 'dashboard.partial',
      due: 'dashboard.due',
      paid: 'dashboard.statusPaid'
    }[s];
    if (key) return t(key);
    const str = String(status);
    return str.charAt(0).toUpperCase() + str.slice(1);
  };

  if (loading && !dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="h-12 w-12 animate-spin border-4 border-blue-600 border-t-transparent rounded-full" />
      </div>
    );
  }

  if (!dashboardData) {
    return (
      <div className="flex justify-center items-center min-h-screen bg-gray-50 dark:bg-gray-900">
        <div className="text-center">
          <p className="text-red-600 dark:text-red-400 mb-2 font-semibold">{t('dashboard.failedToLoad')}</p>
          <p className="text-gray-600 dark:text-gray-400 mb-4 text-sm">{error}</p>
          <button
            onClick={fetchDashboardData}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            {t('dashboard.retry')}
          </button>
        </div>
      </div>
    );
  }

  const KPICard = ({ title, value, change, changeLabel, icon: Icon, color, isPositive = true }) => {
    const bgColor = color === '#10b981' ? 'bg-green-50 dark:bg-green-900/20' :
                    color === '#ef4444' ? 'bg-red-50 dark:bg-red-900/20' :
                    color === '#3b82f6' ? 'bg-blue-50 dark:bg-blue-900/20' :
                    color === '#f59e0b' ? 'bg-amber-50 dark:bg-amber-900/20' :
                    'bg-gray-50 dark:bg-gray-800';
    
    const shapeColor = color === '#10b981' ? 'bg-green-300/60 dark:bg-green-600/40' :
                       color === '#ef4444' ? 'bg-red-300/60 dark:bg-red-600/40' :
                       color === '#3b82f6' ? 'bg-blue-300/60 dark:bg-blue-600/40' :
                       color === '#f59e0b' ? 'bg-amber-300/60 dark:bg-amber-600/40' :
                       'bg-gray-300/60 dark:bg-gray-600/40';

    return (
      <div className={`${bgColor} rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-4 transition-all relative overflow-hidden min-h-[105px] flex flex-col justify-between`}>
        {/* Decorative shapes */}
        <div className={`absolute -top-6 -right-6 w-20 h-20 ${shapeColor} rounded-full opacity-50`} />
        <div className={`absolute -bottom-4 -left-4 w-16 h-16 ${shapeColor} rounded-full opacity-30`} />
        
        <div className="flex items-center justify-between relative z-10">
          <div className="flex-1 min-w-0">
            <p className="text-gray-600 dark:text-gray-400 text-[10px] font-medium truncate">{title}</p>
            <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 break-words">{value}</p>
            {changeLabel && (
              <p className={`text-[9px] mt-0.5 flex items-center gap-1 ${change >= 0 && isPositive ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {change >= 0 && isPositive ? <ArrowUpIcon className="h-2.5 w-2.5 flex-shrink-0" /> : <ArrowDownIcon className="h-2.5 w-2.5 flex-shrink-0" />}
                <span className="truncate">{changeLabel}</span>
              </p>
            )}
          </div>
          <div className="p-1 rounded-full ml-2 flex-shrink-0" style={{ backgroundColor: `${color}20` }}>
            <Icon className="h-3.5 w-3.5" style={{ color }} />
          </div>
        </div>
      </div>
    );
  };

  const orders = dashboardData?.orders?.summary || {};
  const customers = dashboardData?.customers?.summary || {};
  const inventory = dashboardData?.inventory?.summary || {};
  const financials = dashboardData?.financials || {};
  const suppliers = dashboardData?.suppliers?.summary || {};
  const employees = dashboardData?.employees?.summary || {};

  // Financial calculations
  const monthlyRevenue = parseFloat(financials?.revenue?.total_revenue) || 0;
  const monthlyExpenses = parseFloat(financials?.expenses?.summary?.total_expenses) || 0;
  const directSalesCost = parseFloat(financials?.revenue?.direct_sales_cost) || 0;
  const monthlyPurchases = parseFloat(financialAnalytics?.monthly_trends?.[0]?.purchases) || 0;
  
  // Use backend calculated profit if available, otherwise calculate
  const grossProfit = parseFloat(financials?.profitability?.gross_profit) || (monthlyRevenue - directSalesCost - monthlyPurchases);
  const netProfit = parseFloat(financials?.profitability?.net_profit) || (monthlyRevenue - directSalesCost - monthlyExpenses - monthlyPurchases);
  
  const customerDues = parseFloat(customers.total_outstanding_dues) || 0;
  const supplierBalances = parseFloat(suppliers.total_outstanding) || 0;
  const netBalance = customerDues - supplierBalances;

  // Chart data
  const salesData = dashboardData?.orders?.recent_orders?.length > 0 
    ? dashboardData.orders.recent_orders.slice(0, 7).map((order) => ({
        name: t('dashboard.orderChartLabel', { id: order.id }),
        amount: parseFloat(order.total_amount ?? order.total_estimated_amount) || 0
      }))
    : [{ name: t('dashboard.chartNoData'), amount: 0 }];

  const monthlyTrends = financialAnalytics?.monthly_trends?.slice(0, 6).reverse() || [];
  const trendData = monthlyTrends.map(trendRow => ({
    month: trendRow.month?.split('-')[1] || t('common.notAvailable'),
    revenue: parseFloat(trendRow.revenue) || 0,
    expenses: parseFloat(trendRow.expenses) || 0,
    profit: parseFloat(trendRow.net_profit) || 0
  }));

  const topCustomersWithDues = dashboardData?.customers?.customers_with_balances?.slice(0, 10) || [];
  const suppliersWithBalance = dashboardData?.suppliers?.suppliers_with_balances?.slice(0, 10) || [];

  const COLORS = ['#3b82f6', '#10b981', '#f59e0b', '#ef4444', '#8b5cf6'];
  
  // Pie chart data
  const pieChartData = [
    { name: t('dashboard.pieRevenue'), value: monthlyRevenue },
    { name: t('dashboard.pieExpenses'), value: monthlyExpenses },
    { name: t('dashboard.piePurchases'), value: monthlyPurchases }
  ].filter(item => item.value > 0);

  // Get period-specific labels
  const getRevenueLabel = () => {
    if (selectedPeriod === 'daily') return t('dashboard.dailyRevenue');
    if (selectedPeriod === 'weekly') return t('dashboard.weeklyRevenue');
    return t('dashboard.monthlyRevenue');
  };

  const getExpensesLabel = () => {
    if (selectedPeriod === 'daily') return t('dashboard.dailyExpenses');
    if (selectedPeriod === 'weekly') return t('dashboard.weeklyExpenses');
    return t('dashboard.monthlyExpenses');
  };

  const getPeriodLabel = () => {
    if (selectedPeriod === 'daily') return t('dashboard.today');
    if (selectedPeriod === 'weekly') return t('dashboard.thisWeek');
    return t('dashboard.thisMonth');
  };

  return (
    <div className="min-h-screen bg-blue-50 dark:bg-gray-900 p-2 sm:p-3 space-y-2">
      {/* Header */}
      <div className="mb-2">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-2">
          <div>
            <h1 className="text-base font-bold text-gray-900 dark:text-white">{t('dashboard.title')}</h1>
            <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5">{t('dashboard.subtitle')}</p>
          </div>
          <button
            onClick={() => { fetchDashboardData(); fetchFinancialAnalytics(); fetchRecentTransactions(); }}
            disabled={loading}
            className="flex items-center gap-1 px-2.5 py-1 text-xs bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition disabled:opacity-50 w-full sm:w-auto justify-center"
          >
            <ArrowPathIcon className={`h-3.5 w-3.5 ${loading ? 'animate-spin' : ''}`} />
            {t('dashboard.refresh')}
          </button>
        </div>
      </div>

      {/* Period Filter */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-2 mb-2">
        <div className="flex items-center gap-2">
          <span className="text-xs font-medium text-gray-700 dark:text-gray-300">
            {t('dashboard.filterLabel')}:
          </span>
          <select
            value={selectedPeriod}
            onChange={(e) => setSelectedPeriod(e.target.value)}
            className="px-3 py-1.5 text-xs border border-gray-300 dark:border-gray-600 dark:bg-gray-700 dark:text-white rounded-lg focus:ring-2 focus:ring-blue-500"
          >
            <option value="daily">{t('dashboard.daily')}</option>
            <option value="weekly">{t('dashboard.weekly')}</option>
            <option value="monthly">{t('dashboard.monthly')}</option>
            <option value="yearly">{t('dashboard.yearly')}</option>
          </select>
        </div>
      </div>

      {/* Financial KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2">
        <KPICard 
          title={getRevenueLabel()} 
          value={formatCurrency(monthlyRevenue)}
          change={monthlyRevenue}
          changeLabel={financialAnalytics?.monthly_trends?.[0] ? t('dashboard.vsLastMonth') : getPeriodLabel()}
          icon={ArrowTrendingUpIcon}
          color="#10b981"
        />
        <KPICard 
          title={getExpensesLabel()} 
          value={formatCurrency(monthlyExpenses)}
          change={monthlyExpenses}
          changeLabel={getPeriodLabel()}
          icon={ArrowTrendingDownIcon}
          color="#ef4444"
          isPositive={false}
        />
        <KPICard 
          title={t('dashboard.netProfit')} 
          value={formatCurrency(netProfit)}
          change={netProfit}
          changeLabel={netProfit >= 0 ? t('dashboard.positive') : t('dashboard.negative')}
          icon={ChartBarIcon}
          color={netProfit >= 0 ? "#10b981" : "#ef4444"}
          isPositive={netProfit >= 0}
        />
        <KPICard 
          title={t('dashboard.netBalance')} 
          value={formatCurrency(netBalance)}
          change={netBalance}
          changeLabel={`${t('dashboard.customerDues')}: ${formatCurrency(customerDues)} | ${t('dashboard.supplierPayables')}: ${formatCurrency(supplierBalances)}`}
          icon={CurrencyDollarIcon}
          color={netBalance >= 0 ? "#10b981" : "#ef4444"}
        />
      </div>

      {/* Secondary KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-2 sm:gap-3">
        <KPICard 
          title={t('dashboard.totalOrders')} 
          value={orders.total_orders || 0}
          change={orders.this_week_orders || 0}
          changeLabel={`${orders.pending_orders || 0} ${t('dashboard.pending')}`}
          icon={ShoppingCartIcon}
          color="#3b82f6"
        />
        <KPICard 
          title={t('dashboard.customerDues')} 
          value={formatCurrency(customerDues)}
          change={customers.customers_with_dues || 0}
          changeLabel={t('dashboard.fromCustomers', { count: customers.customers_with_dues || 0 })}
          icon={UserGroupIcon}
          color="#f59e0b"
        />
        <KPICard 
          title={t('dashboard.supplierPayables')} 
          value={formatCurrency(supplierBalances)}
          change={suppliers.suppliers_with_balance || 0}
          changeLabel={t('dashboard.toSuppliers', { count: suppliers.suppliers_with_balance || 0 })}
          icon={BuildingStorefrontIcon}
          color="#ef4444"
        />
        <KPICard 
          title={t('dashboard.lowStockItems')} 
          value={inventory.low_stock_count || 0}
          change={inventory.critical_stock_count || 0}
          changeLabel={`${inventory.critical_stock_count || 0} ${t('dashboard.critical')}`}
          icon={ExclamationTriangleIcon}
          color="#ef4444"
          isPositive={false}
        />
      </div>

      {/* Charts Section */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-2">
        {/* Revenue vs Expenses Trend */}
        <div className="lg:col-span-2 bg-purple-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-8 -right-8 w-24 h-24 bg-purple-300/60 dark:bg-purple-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-6 -left-6 w-20 h-20 bg-purple-300/60 dark:bg-purple-600/40 rounded-full opacity-30" />
          
          <h2 className="text-xs font-bold text-gray-900 dark:text-white mb-2 relative z-10">{t('dashboard.revenueVsExpensesTrend')}</h2>
          {trendData.length > 0 ? (
            <ResponsiveContainer width="100%" height={isMobile ? 180 : 220} className="relative z-10">
              <AreaChart data={trendData}>
                <CartesianGrid strokeDasharray="3 3" stroke="#e5e7eb" />
                <XAxis 
                  dataKey="month" 
                  stroke="#6b7280"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                />
                <YAxis 
                  stroke="#6b7280"
                  tick={{ fontSize: isMobile ? 10 : 12 }}
                />
                <Tooltip 
                  contentStyle={{ 
                    backgroundColor: '#fff',
                    border: '1px solid #e5e7eb',
                    borderRadius: '8px',
                    fontSize: isMobile ? '11px' : '12px'
                  }} 
                />
                <Area type="monotone" dataKey="revenue" stackId="1" stroke="#10b981" fill="#10b981" fillOpacity={0.6} />
                <Area type="monotone" dataKey="expenses" stackId="2" stroke="#ef4444" fill="#ef4444" fillOpacity={0.6} />
                <Legend wrapperStyle={{ fontSize: isMobile ? '10px' : '12px' }} />
              </AreaChart>
            </ResponsiveContainer>
          ) : (
            <div className="h-40 sm:h-60 flex items-center justify-center bg-gray-50 dark:bg-gray-700 rounded-lg">
              <p className="text-[10px] sm:text-xs text-gray-500 dark:text-gray-400">{t('dashboard.noTrendData')}</p>
            </div>
          )}
        </div>

        {/* Financial Summary Pie */}
        <div className="bg-teal-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-teal-300/60 dark:bg-teal-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-teal-300/60 dark:bg-teal-600/40 rounded-full opacity-30" />
          
          <h2 className="text-xs font-bold text-gray-900 dark:text-white mb-2 relative z-10">{t('dashboard.financialOverview')}</h2>
          <ResponsiveContainer width="100%" height={isMobile ? 150 : 180} className="relative z-10">
            <PieChart>
              <Pie
                data={pieChartData}
                cx="50%"
                cy="50%"
                labelLine={false}
                label={({ percent }) => percent > 0.05 ? `${(percent * 100).toFixed(0)}%` : ''}
                outerRadius={isMobile ? 50 : 60}
                fill="#8884d8"
                dataKey="value"
              >
                {pieChartData.map((entry, index) => (
                  <Cell key={`cell-${index}`} fill={COLORS[index % COLORS.length]} />
                ))}
              </Pie>
              <Tooltip 
                contentStyle={{ fontSize: isMobile ? '11px' : '12px' }}
              />
              <Legend 
                wrapperStyle={{ fontSize: isMobile ? '9px' : '11px' }}
                iconSize={isMobile ? 8 : 10}
              />
            </PieChart>
          </ResponsiveContainer>
          <div className="mt-2 space-y-1 sm:space-y-1.5 relative z-10">
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.grossProfit')}:</span>
              <span className="font-semibold text-gray-900 dark:text-white">{formatCurrency(grossProfit)}</span>
            </div>
            <div className="flex justify-between text-[10px] sm:text-xs">
              <span className="text-gray-600 dark:text-gray-400">{t('dashboard.netProfit')}:</span>
              <span className={`font-semibold ${netProfit >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                {formatCurrency(netProfit)}
              </span>
            </div>
          </div>
        </div>
      </div>

      {/* Real-time Transactions */}
      <div className="bg-white dark:bg-gray-800 rounded-lg shadow dark:shadow-gray-900/50 p-2 sm:p-3">
        <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center gap-1 mb-2">
          <h2 className="text-xs font-bold text-gray-900 dark:text-white">{t('dashboard.realTimeTransactions')}</h2>
          <span className="text-[9px] text-gray-500 dark:text-gray-400">{t('dashboard.lastUpdated')}: {formatTime(new Date())}</span>
        </div>
        <div className="overflow-x-auto">
            <table className="w-full min-w-[600px]">
              <thead className="bg-blue-600">
                <tr>
                  <th className="text-left py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.type')}</th>
                  <th className="text-left py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.details')}</th>
                  <th className="text-right py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.amount')}</th>
                  <th className="text-left py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.date')}</th>
                  <th className="text-left py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.status')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  const totalPages = Math.ceil(recentTransactions.length / transactionsPerPage);
                  const startIdx = (transactionPage - 1) * transactionsPerPage;
                  const endIdx = startIdx + transactionsPerPage;
                  const paginatedTransactions = recentTransactions.slice(startIdx, endIdx);
                  
                  return paginatedTransactions.length > 0 ? (
                    paginatedTransactions.map((transaction, idx) => (
                    <tr key={`${transaction.type}-${transaction.id}`} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-1.5 px-2">
                      <span className="px-1.5 py-0.5 text-[10px] font-medium rounded" style={{ 
                        backgroundColor: `${transaction.color}20`,
                        color: transaction.color === 'green' ? '#10b981' : transaction.color === 'yellow' ? '#f59e0b' : transaction.color === 'orange' ? '#f97316' : transaction.color === 'blue' ? '#3b82f6' : '#ef4444'
                      }}>
                        {transaction.typeLabel}
                      </span>
                    </td>
                    <td className="py-1.5 px-2 text-gray-900 dark:text-white text-[11px]">
                      {transaction.type === 'order' && (
                        <div>
                          <div className="font-medium text-[11px]">{transaction.customer || t('common.notAvailable')}</div>
                          {transaction.itemName && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{transaction.itemName}</div>
                          )}
                        </div>
                      )}
                      {transaction.type === 'purchase' && (
                        <div>
                          <div className="font-medium text-[11px]">{transaction.supplier || t('common.notAvailable')}</div>
                          {transaction.itemName && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{transaction.itemName}</div>
                          )}
                        </div>
                      )}
                      {transaction.type === 'expense' && (
                        <div>
                          <div className="font-medium text-[11px]">{transaction.category || t('common.notAvailable')}</div>
                          {transaction.description && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs" title={transaction.description}>
                              {transaction.description}
                            </div>
                          )}
                        </div>
                      )}
                      {transaction.type === 'supplier_payment' && (
                        <div>
                          <div className="font-medium text-[11px]">{transaction.supplier || t('common.notAvailable')}</div>
                          {transaction.description && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5">{transaction.description}</div>
                          )}
                        </div>
                      )}
                      {transaction.type === 'roznamcha' && (
                        <div>
                          <div className="font-medium text-[11px]">{transaction.itemName || t('common.notAvailable')}</div>
                          {transaction.description && (
                            <div className="text-[10px] text-gray-500 dark:text-gray-400 mt-0.5 truncate max-w-xs" title={transaction.description}>
                              {transaction.description}
                            </div>
                          )}
                        </div>
                      )}
                    </td>
                    <td className={`py-1.5 px-2 text-right font-semibold text-[11px] ${transaction.amount >= 0 ? 'text-green-600 dark:text-green-400' : 'text-red-600 dark:text-red-400'}`}>
                      {transaction.amount >= 0 ? '+' : ''}{formatCurrency(Math.abs(transaction.amount))}
                    </td>
                    <td className="py-1.5 px-2 text-gray-600 dark:text-gray-400 text-[11px]">
                      {formatDate(transaction.date)}
                    </td>
                    <td className="py-1.5 px-2">
                      {transaction.status ? (
                        <span className={`px-1.5 py-0.5 text-[10px] rounded-full ${
                          transaction.status === 'Completed' || transaction.status === 'completed' || transaction.status === 'paid' ? 'bg-green-100 text-green-800 dark:bg-green-900 dark:text-green-200' :
                          transaction.status === 'Pending' || transaction.status === 'pending' ? 'bg-yellow-100 text-yellow-800 dark:bg-yellow-900 dark:text-yellow-200' :
                          transaction.status === 'Cancelled' || transaction.status === 'cancelled' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          transaction.status === 'Partial' || transaction.status === 'partial' ? 'bg-orange-100 text-orange-800 dark:bg-orange-900 dark:text-orange-200' :
                          transaction.status === 'Due' || transaction.status === 'due' ? 'bg-red-100 text-red-800 dark:bg-red-900 dark:text-red-200' :
                          'bg-gray-100 text-gray-800 dark:bg-gray-700 dark:text-gray-300'
                        }`}>
                          {formatTxStatus(transaction.status)}
                        </span>
                      ) : (
                        <span className="text-[11px] text-gray-400 dark:text-gray-500">-</span>
                      )}
                    </td>
                  </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="5" className="py-8 text-center text-gray-500 dark:text-gray-400">{t('dashboard.noRecentTransactions')}</td>
                    </tr>
                  );
                })()}
            </tbody>
          </table>
        </div>
        {recentTransactions.length > transactionsPerPage && (
          <div className="flex justify-between items-center mt-2 pt-2 border-t border-gray-200 dark:border-gray-700">
            <div className="text-[10px] text-gray-600 dark:text-gray-400">
              {t('dashboard.showing')} {((transactionPage - 1) * transactionsPerPage) + 1} {t('dashboard.to')} {Math.min(transactionPage * transactionsPerPage, recentTransactions.length)} {t('dashboard.of')} {recentTransactions.length}
            </div>
            <div className="flex items-center gap-1.5">
              <button
                onClick={() => setTransactionPage(prev => Math.max(1, prev - 1))}
                disabled={transactionPage === 1}
                className="px-1.5 py-0.5 text-[10px] border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronLeftIcon className="h-3 w-3" />
              </button>
              <span className="text-[10px] text-gray-600 dark:text-gray-400">
                {t('dashboard.page')} {transactionPage} {t('dashboard.of')} {Math.ceil(recentTransactions.length / transactionsPerPage)}
              </span>
              <button
                onClick={() => setTransactionPage(prev => Math.min(Math.ceil(recentTransactions.length / transactionsPerPage), prev + 1))}
                disabled={transactionPage >= Math.ceil(recentTransactions.length / transactionsPerPage)}
                className="px-1.5 py-0.5 text-[10px] border border-gray-300 dark:border-gray-600 rounded disabled:opacity-50 disabled:cursor-not-allowed hover:bg-gray-50 dark:hover:bg-gray-700"
              >
                <ChevronRightIcon className="h-3 w-3" />
              </button>
            </div>
          </div>
        )}
      </div>

      {/* Dues and Payables Tables */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-2">
        {/* Customers with Dues */}
        <div className="bg-orange-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-orange-300/60 dark:bg-orange-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-orange-300/60 dark:bg-orange-600/40 rounded-full opacity-30" />
          
          <h2 className="text-xs font-bold text-gray-900 dark:text-white mb-2 relative z-10">{t('dashboard.customersWithDues')}</h2>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full min-w-[300px]">
              <thead className="bg-blue-600">
                <tr>
                  <th className="text-left py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.customer')}</th>
                  <th className="text-right py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.dueAmount')}</th>
                  <th className="text-right py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.orders')}</th>
                </tr>
              </thead>
              <tbody>
                {topCustomersWithDues.length > 0 ? (
                  topCustomersWithDues.map((customer, idx) => (
                    <tr key={idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                      <td className="py-1.5 px-2 text-[11px] text-gray-900 dark:text-white">{customer.name || t('common.notAvailable')}</td>
                      <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-red-600 dark:text-red-400">
                        {formatCurrency(parseFloat(customer.total_due) || 0)}
                      </td>
                      <td className="py-1.5 px-2 text-right text-[11px] text-gray-600 dark:text-gray-400">{customer.total_orders || 0}</td>
                    </tr>
                  ))
                ) : (
                  <tr>
                    <td colSpan="3" className="py-6 text-center text-[11px] text-gray-500 dark:text-gray-400">{t('dashboard.noOutstandingDues')}</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>

        {/* Suppliers with Balance */}
        <div className="bg-pink-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-6 -right-6 w-20 h-20 bg-pink-300/60 dark:bg-pink-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-4 -left-4 w-16 h-16 bg-pink-300/60 dark:bg-pink-600/40 rounded-full opacity-30" />
          
          <h2 className="text-xs font-bold text-gray-900 dark:text-white mb-2 relative z-10">{t('dashboard.suppliersWithBalance')}</h2>
          <div className="overflow-x-auto relative z-10">
            <table className="w-full min-w-[300px]">
              <thead className="bg-blue-600">
                <tr>
                  <th className="text-left py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.supplier')}</th>
                  <th className="text-right py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.balance')}</th>
                  <th className="text-right py-1.5 px-2 text-[10px] text-white font-medium">{t('dashboard.purchases')}</th>
                </tr>
              </thead>
              <tbody>
                {(() => {
                  // Filter suppliers with actual outstanding balance > 0
                  const suppliersWithActualBalance = suppliersWithBalance.filter(s => {
                    const balance = parseFloat(s.outstanding_balance || s.balance || 0);
                    return balance > 0;
                  });
                  
                  return suppliersWithActualBalance.length > 0 ? (
                    suppliersWithActualBalance.map((supplier, idx) => (
                      <tr key={supplier.id || idx} className="border-b border-gray-100 dark:border-gray-700 hover:bg-gray-50 dark:hover:bg-gray-700">
                        <td className="py-1.5 px-2 text-[11px] text-gray-900 dark:text-white">{supplier.name || t('common.notAvailable')}</td>
                        <td className="py-1.5 px-2 text-right text-[11px] font-semibold text-red-600 dark:text-red-400">
                          {formatCurrency(parseFloat(supplier.outstanding_balance || supplier.balance) || 0)}
                        </td>
                        <td className="py-1.5 px-2 text-right text-[11px] text-gray-600 dark:text-gray-400">{supplier.total_purchases || 0}</td>
                      </tr>
                    ))
                  ) : (
                    <tr>
                      <td colSpan="3" className="py-6 text-center text-[11px] text-gray-500 dark:text-gray-400">{t('dashboard.noOutstandingBalances')}</td>
                    </tr>
                  );
                })()}
              </tbody>
            </table>
          </div>
        </div>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-2">
        <div className="bg-indigo-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-indigo-300/60 dark:bg-indigo-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-indigo-300/60 dark:bg-indigo-600/40 rounded-full opacity-30" />
          
          <p className="text-gray-600 dark:text-gray-400 text-[10px] font-medium relative z-10">{t('dashboard.totalCustomers')}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 relative z-10">{customers.total_customers || 0}</p>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 relative z-10">{t('dashboard.active')}: {customers.active_customers || 0}</p>
        </div>
        <div className="bg-cyan-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-cyan-300/60 dark:bg-cyan-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-cyan-300/60 dark:bg-cyan-600/40 rounded-full opacity-30" />
          
          <p className="text-gray-600 dark:text-gray-400 text-[10px] font-medium relative z-10">{t('dashboard.totalInventoryValue')}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 relative z-10">
            {formatCurrency(inventory.total_stock_value || 0)}
          </p>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 relative z-10">{t('dashboard.itemsInStock', { count: inventory.total_items || 0 })}</p>
        </div>
        <div className="bg-lime-50 dark:bg-gray-800 rounded-lg shadow-md hover:shadow-xl dark:shadow-lg dark:hover:shadow-2xl p-2 sm:p-3 sm:col-span-2 md:col-span-1 relative overflow-hidden">
          {/* Decorative shapes */}
          <div className="absolute -top-4 -right-4 w-16 h-16 bg-lime-300/60 dark:bg-lime-600/40 rounded-full opacity-50" />
          <div className="absolute -bottom-3 -left-3 w-12 h-12 bg-lime-300/60 dark:bg-lime-600/40 rounded-full opacity-30" />
          
          <p className="text-gray-600 dark:text-gray-400 text-[10px] font-medium relative z-10">{t('dashboard.activeEmployees')}</p>
          <p className="text-sm font-bold text-gray-900 dark:text-white mt-0.5 relative z-10">{employees.total_employees || 0}</p>
          <p className="text-[10px] text-gray-600 dark:text-gray-400 mt-0.5 relative z-10">
            {t('dashboard.monthlySalary')}: {formatCurrency(employees.total_monthly_salary || 0)}
          </p>
        </div>
      </div>
    </div>
  );
};

export default Dashboard;
