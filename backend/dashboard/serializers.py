from rest_framework import serializers


class OrderSummarySerializer(serializers.Serializer):
    total_orders = serializers.IntegerField()
    pending_orders = serializers.IntegerField()
    completed_orders = serializers.IntegerField()
    cancelled_orders = serializers.IntegerField()
    total_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    pending_revenue = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    total_due = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    avg_order_value = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    today_orders = serializers.IntegerField()
    this_week_orders = serializers.IntegerField()


class CustomerSummarySerializer(serializers.Serializer):
    total_customers = serializers.IntegerField()
    active_customers = serializers.IntegerField()
    customers_with_dues = serializers.IntegerField()
    customers_with_credits = serializers.IntegerField()
    total_outstanding_dues = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    total_customer_credits = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    avg_customer_value = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)


class InventorySummarySerializer(serializers.Serializer):
    total_items = serializers.IntegerField()
    low_stock_count = serializers.IntegerField()
    critical_stock_count = serializers.IntegerField()
    out_of_stock_count = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2, allow_null=True)
    avg_stock_level = serializers.DecimalField(max_digits=10, decimal_places=2, allow_null=True)
    raw_materials_count = serializers.IntegerField()
    finished_products_count = serializers.IntegerField()


class SupplierSummarySerializer(serializers.Serializer):
    total_suppliers = serializers.IntegerField()
    active_suppliers = serializers.IntegerField()
    suppliers_with_balance = serializers.IntegerField()
    total_outstanding = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    total_overdue = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)


class FinancialSummarySerializer(serializers.Serializer):
    period = serializers.CharField()
    revenue = serializers.DictField()
    expenses = serializers.DictField()
    purchases = serializers.DictField()
    profitability = serializers.DictField()


class EmployeeSummarySerializer(serializers.Serializer):
    total_employees = serializers.IntegerField()
    total_monthly_salary = serializers.DecimalField(max_digits=12, decimal_places=2, allow_null=True)
    employees_with_advances = serializers.IntegerField()


class AlertsSerializer(serializers.Serializer):
    critical_stock = serializers.IntegerField()
    high_customer_dues = serializers.IntegerField()
    overdue_suppliers = serializers.IntegerField()
    pending_high_value_orders = serializers.IntegerField()


class KPISerializer(serializers.Serializer):
    monthly_order_fulfillment_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    inventory_turnover = serializers.DecimalField(max_digits=5, decimal_places=2)
    customer_retention_rate = serializers.DecimalField(max_digits=5, decimal_places=2)
    average_payment_delay = serializers.DecimalField(max_digits=5, decimal_places=1)


class OverviewSerializer(serializers.Serializer):
    alerts = AlertsSerializer()
    kpis = KPISerializer()
    total_critical_alerts = serializers.IntegerField()


class AdminDashboardSerializer(serializers.Serializer):
    orders = serializers.DictField()
    customers = serializers.DictField()
    inventory = serializers.DictField()
    suppliers = serializers.DictField()
    financials = FinancialSummarySerializer()
    employees = serializers.DictField()
    overview = OverviewSerializer()


class DashboardSummarySerializer(serializers.Serializer):
    orders = serializers.DictField()
    inventory = serializers.DictField()
    financials = serializers.DictField()
    customers = serializers.DictField()
    alerts = serializers.DictField()


class MonthlyTrendSerializer(serializers.Serializer):
    month = serializers.CharField()
    revenue = serializers.DecimalField(max_digits=12, decimal_places=2)
    expenses = serializers.DecimalField(max_digits=12, decimal_places=2)
    purchases = serializers.DecimalField(max_digits=12, decimal_places=2)
    gross_profit = serializers.DecimalField(max_digits=12, decimal_places=2)
    net_profit = serializers.DecimalField(max_digits=12, decimal_places=2)


class FinancialAnalyticsSerializer(serializers.Serializer):
    monthly_trends = MonthlyTrendSerializer(many=True)
    yearly_summary = serializers.DictField()
    profitability_analysis = serializers.DictField()