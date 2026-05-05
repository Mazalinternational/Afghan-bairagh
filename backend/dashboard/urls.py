from django.urls import path
from .views import AdminDashboardView, DashboardSummaryView, FinancialAnalyticsView

urlpatterns = [
    path('admin-dashboard/', AdminDashboardView.as_view(), name='admin_dashboard'),
    path('dashboard-summary/', DashboardSummaryView.as_view(), name='dashboard_summary'),
    path('financial-analytics/', FinancialAnalyticsView.as_view(), name='financial_analytics'),
]