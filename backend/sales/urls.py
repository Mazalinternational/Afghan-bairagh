from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import SaleViewSet, DirectSaleViewSet, SalePaymentViewSet, DirectSalePaymentViewSet

router = DefaultRouter()
router.register(r'sales', SaleViewSet, basename='sale')
router.register(r'direct-sales', DirectSaleViewSet, basename='direct-sale')
router.register(r'sale-payments', SalePaymentViewSet, basename='sale-payment')
router.register(r'direct-sale-payments', DirectSalePaymentViewSet, basename='direct-sale-payment')

urlpatterns = [
    path('', include(router.urls)),
]
