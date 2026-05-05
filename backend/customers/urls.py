from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import CustomerViewSet, CustomerBalancePaymentViewSet

router = DefaultRouter()
router.register(r'customers', CustomerViewSet)
router.register(r'customer-balance-payments', CustomerBalancePaymentViewSet, basename='customer-balance-payment')

urlpatterns = [
    path('', include(router.urls)),
]