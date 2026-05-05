import django_filters
from django.db.models import Q
from .models import Purchase, Supplier, Payment


class PurchaseFilter(django_filters.FilterSet):
    """Advanced filtering for purchases"""
    date_from = django_filters.DateFilter(field_name='purchase_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='purchase_date', lookup_expr='lte')
    cost_min = django_filters.NumberFilter(field_name='cost', lookup_expr='gte')
    cost_max = django_filters.NumberFilter(field_name='cost', lookup_expr='lte')
    has_payments = django_filters.BooleanFilter(method='filter_has_payments')
    
    class Meta:
        model = Purchase
        fields = ['supplier', 'payment_status', 'is_for_press']
    
    def filter_has_payments(self, queryset, name, value):
        if value:
            return queryset.filter(payments__isnull=False).distinct()
        return queryset.filter(payments__isnull=True)


class SupplierFilter(django_filters.FilterSet):
    """Advanced filtering for suppliers"""
    has_balance = django_filters.BooleanFilter(method='filter_has_balance')
    balance_min = django_filters.NumberFilter(field_name='balance', lookup_expr='gte')
    balance_max = django_filters.NumberFilter(field_name='balance', lookup_expr='lte')
    
    class Meta:
        model = Supplier
        fields = ['name']
    
    def filter_has_balance(self, queryset, name, value):
        if value:
            return queryset.filter(balance__gt=0)
        return queryset.filter(balance=0)


class PaymentFilter(django_filters.FilterSet):
    """Advanced filtering for payments"""
    date_from = django_filters.DateFilter(field_name='payment_date', lookup_expr='gte')
    date_to = django_filters.DateFilter(field_name='payment_date', lookup_expr='lte')
    amount_min = django_filters.NumberFilter(field_name='amount', lookup_expr='gte')
    amount_max = django_filters.NumberFilter(field_name='amount', lookup_expr='lte')
    
    class Meta:
        model = Payment
        fields = ['purchase', 'payment_method']