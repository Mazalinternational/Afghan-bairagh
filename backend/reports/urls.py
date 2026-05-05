from django.urls import path
from .views import (
    OrdersWithDuesReport,
    SuppliersWithBalanceReport,
    LowStockReport,
    PendingAdvancesReport,
    MonthlyExpensesReport,
    EmployeeSalaryReport,
    PurchasePaymentStatusReport,
    DetailedReportView
)

urlpatterns = [
    path('orders-with-dues/', OrdersWithDuesReport.as_view(), name='orders_with_dues'),
    path('suppliers-with-balance/', SuppliersWithBalanceReport.as_view(), name='suppliers_with_balance'),
    path('low-stock/', LowStockReport.as_view(), name='low_stock'),
    path('pending-advances/', PendingAdvancesReport.as_view(), name='pending_advances'),
    path('monthly-expenses/', MonthlyExpensesReport.as_view(), name='monthly_expenses'),
    path('employee-salary/', EmployeeSalaryReport.as_view(), name='employee_salary'),
    path('purchase-payment-status/', PurchasePaymentStatusReport.as_view(), name='purchase_payment_status'),
    path('detailed/', DetailedReportView.as_view(), name='detailed_report'),
]
