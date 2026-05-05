from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    CategoryViewSet, ItemViewSet, StockTransactionViewSet,
    LowStockAlertViewSet, ReportViewSet, FlagDesignTypeViewSet
)

router = DefaultRouter()
router.register(r'categories', CategoryViewSet)
router.register(r'items', ItemViewSet, basename='item')
router.register(r'transactions', StockTransactionViewSet, basename='transaction')
router.register(r'alerts', LowStockAlertViewSet, basename='alert')
router.register(r'reports', ReportViewSet, basename='report')
router.register(r'flag-design-types', FlagDesignTypeViewSet, basename='flag-design-type')

urlpatterns = [
    path('inventory/', include(router.urls)),
]