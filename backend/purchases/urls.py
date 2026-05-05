from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SupplierViewSet, PurchaseViewSet, SupplierLedgerViewSet, PaymentViewSet, SupplierBalancePaymentViewSet

router = DefaultRouter()
router.register(r'suppliers', SupplierViewSet)
router.register(r'purchases', PurchaseViewSet)
router.register(r'payments', PaymentViewSet)
router.register(r'ledger', SupplierLedgerViewSet)
router.register(r'supplier-balance-payments', SupplierBalancePaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]