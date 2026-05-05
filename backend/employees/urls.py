from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import (
    EmployeeViewSet, AdvanceViewSet, SalaryPaymentViewSet, LoanViewSet, TipViewSet,
    SalaryDepositEntryViewSet,
)

router = DefaultRouter()
router.register(r'employees', EmployeeViewSet, basename='employee')
router.register(r'salary-deposit-entries', SalaryDepositEntryViewSet, basename='salary-deposit-entry')
router.register(r'advances', AdvanceViewSet, basename='advance')
router.register(r'salary-payments', SalaryPaymentViewSet, basename='salary-payment')
router.register(r'loans', LoanViewSet, basename='loan')
router.register(r'tips', TipViewSet, basename='tip')

urlpatterns = [
    path('', include(router.urls)),
]