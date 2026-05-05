from rest_framework import viewsets, filters
from django_filters.rest_framework import DjangoFilterBackend
from .models import PrintingPrinter, PrintingJob, PrintingPayment
from .serializers import (
    PrintingPrinterSerializer,
    PrintingJobSerializer,
    PrintingPaymentSerializer,
)


class PrintingPrinterViewSet(viewsets.ModelViewSet):
    queryset = PrintingPrinter.objects.all()
    serializer_class = PrintingPrinterSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    search_fields = ['name', 'phone', 'address']
    ordering_fields = ['name', 'created_at']
    ordering = ['name']


class PrintingJobViewSet(viewsets.ModelViewSet):
    queryset = PrintingJob.objects.select_related('printer').prefetch_related('items', 'payments')
    serializer_class = PrintingJobSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_fields = ['payment_status', 'printer']
    search_fields = ['bill_number', 'job_title', 'notes', 'printer__name']
    ordering_fields = ['job_date', 'total_price']
    ordering = ['-job_date']


class PrintingPaymentViewSet(viewsets.ModelViewSet):
    queryset = PrintingPayment.objects.select_related('job', 'job__printer')
    serializer_class = PrintingPaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['job']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']

