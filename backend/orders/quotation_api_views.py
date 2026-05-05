from rest_framework import viewsets, filters
from rest_framework.pagination import PageNumberPagination
from django_filters.rest_framework import DjangoFilterBackend
from .quotation_models import Quotation
from .quotation_serializers import QuotationSerializer


class QuotationPagination(PageNumberPagination):
    page_size = 5
    page_size_query_param = 'page_size'
    max_page_size = 100


class QuotationViewSet(viewsets.ModelViewSet):
    queryset = Quotation.objects.select_related('customer').prefetch_related('quotation_items').all()
    serializer_class = QuotationSerializer
    pagination_class = QuotationPagination
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['customer__name', 'id']
    ordering_fields = ['quotation_date', 'total_amount']
    ordering = ['-quotation_date']
