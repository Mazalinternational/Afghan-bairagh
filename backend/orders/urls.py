from django.urls import path, include
from rest_framework.routers import DefaultRouter
from .views import OrderViewSet, PaymentViewSet
from .quotation_views import QuotationTemplateView
from .quotation_api_views import QuotationViewSet

router = DefaultRouter()
router.register(r'orders', OrderViewSet, basename='order')
router.register(r'order-payments', PaymentViewSet, basename='order-payment')
router.register(r'quotations', QuotationViewSet, basename='quotation')

urlpatterns = [
    path('', include(router.urls)),
    path('orders/<int:order_id>/quotation/', QuotationTemplateView.as_view(), name='order-quotation'),
]
