from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import PrintingPrinterViewSet, PrintingJobViewSet, PrintingPaymentViewSet

router = DefaultRouter()
router.register(r'printing-printers', PrintingPrinterViewSet)
router.register(r'printing-jobs', PrintingJobViewSet)
router.register(r'printing-payments', PrintingPaymentViewSet)

urlpatterns = [
    path('', include(router.urls)),
]

