from django.urls import include, path
from rest_framework.routers import DefaultRouter

from .views import BankTransactionViewSet

router = DefaultRouter()
router.register(r'bank/transactions', BankTransactionViewSet, basename='bank-transaction')

urlpatterns = [
    path('', include(router.urls)),
]

