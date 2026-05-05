from rest_framework import viewsets, filters, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django_filters.rest_framework import DjangoFilterBackend
from django.db.models import Sum, Q
from django.http import FileResponse
from datetime import datetime
from decimal import Decimal, InvalidOperation
from .models import Supplier, Purchase, SupplierLedger, Payment, SupplierBalancePayment
from .serializers import SupplierSerializer, PurchaseSerializer, SupplierLedgerSerializer, PaymentSerializer, SupplierBalancePaymentSerializer
from .filters import PurchaseFilter, SupplierFilter, PaymentFilter
from .pdf_utils import generate_supplier_ledger_pdf


class SupplierViewSet(viewsets.ModelViewSet):
    queryset = Supplier.objects.all()
    serializer_class = SupplierSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = SupplierFilter
    search_fields = ['name', 'contact_person', 'phone', 'email']
    ordering_fields = ['name', 'balance', 'created_at']
    ordering = ['name']
    
    @action(detail=False, methods=['get'])
    def outstanding_balance(self, request):
        """List suppliers with outstanding balances"""
        suppliers = self.queryset.filter(balance__gt=0).order_by('-balance')
        serializer = self.get_serializer(suppliers, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_balance_range(self, request):
        """Filter suppliers by balance range"""
        min_balance = request.query_params.get('min_balance')
        max_balance = request.query_params.get('max_balance')
        
        queryset = self.queryset
        if min_balance:
            queryset = queryset.filter(balance__gte=min_balance)
        if max_balance:
            queryset = queryset.filter(balance__lte=max_balance)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def high_balance_suppliers(self, request):
        """Get suppliers with high outstanding balances (threshold: 1000)"""
        threshold = request.query_params.get('threshold', 1000)
        suppliers = self.queryset.filter(balance__gte=threshold).order_by('-balance')
        serializer = self.get_serializer(suppliers, many=True)
        return Response(serializer.data)
    
    @action(detail=True, methods=['get'])
    def ledger_pdf(self, request, pk=None):
        """Generate PDF report for supplier ledger with status filters"""
        supplier = self.get_object()
        purchases = Purchase.objects.filter(supplier=supplier).prefetch_related('payments')
        statuses = request.query_params.get('statuses', '').split(',')
        statuses = [s.strip() for s in statuses if s.strip()]
        pdf_buffer = generate_supplier_ledger_pdf(supplier, purchases, statuses if statuses else None)
        return FileResponse(pdf_buffer, as_attachment=True, filename=f"Ledger_{supplier.name}_{datetime.now().strftime('%Y%m%d')}.pdf", content_type='application/pdf')
    
    @action(detail=True, methods=['post'])
    def pay_previous_balance(self, request, pk=None):
        """Record a payment towards supplier's previous balance"""
        supplier = self.get_object()
        amount = request.data.get('amount')
        notes = request.data.get('notes', '')
        reference = request.data.get('reference', '')

        try:
            amount = Decimal(str(amount or 0))
        except (TypeError, ValueError, InvalidOperation):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        remaining = supplier.previous_balance_remaining
        if remaining <= 0:
            return Response({'error': 'No previous balance remaining for this supplier'}, status=status.HTTP_400_BAD_REQUEST)

        # Do not allow paying more than remaining
        amount_to_record = min(amount, remaining)

        SupplierBalancePayment.objects.create(
            supplier=supplier,
            amount=amount_to_record,
            notes=notes,
        )

        # Refresh supplier to update computed fields
        supplier.refresh_from_db()
        serializer = self.get_serializer(supplier)
        return Response(
            {
                'message': 'Previous balance payment recorded successfully',
                'supplier': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class PurchaseViewSet(viewsets.ModelViewSet):
    queryset = Purchase.objects.select_related('supplier', 'item').prefetch_related('payments')
    serializer_class = PurchaseSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PurchaseFilter
    search_fields = ['item_name', 'supplier__name', 'description']
    ordering_fields = ['purchase_date', 'cost', 'payment_status']
    ordering = ['-purchase_date']
    
    @action(detail=True, methods=['get'])
    def payment_history(self, request, pk=None):
        """Get complete payment history for a purchase"""
        purchase = self.get_object()
        payments = purchase.payments.all().order_by('-payment_date')
        serializer = PaymentSerializer(payments, many=True)
        return Response({
            'purchase': PurchaseSerializer(purchase).data,
            'payments': serializer.data,
            'total_paid': purchase.total_paid,
            'remaining_amount': purchase.remaining_amount
        })
    
    @action(detail=False, methods=['get'])
    def lifecycle_status(self, request):
        """Get purchase lifecycle management summary"""
        status_summary = {
            'paid': self.queryset.filter(payment_status='paid').count(),
            'partial': self.queryset.filter(payment_status='partial').count(),
            'due': self.queryset.filter(payment_status='due').count(),
            'total_outstanding': self.queryset.filter(
                payment_status__in=['partial', 'due']
            ).aggregate(total=Sum('cost'))['total'] or 0
        }
        return Response(status_summary)
    
    @action(detail=False, methods=['get'])
    def filter_by_payment_status(self, request):
        """Filter purchases by payment status"""
        payment_status = request.query_params.get('status')
        if not payment_status:
            return Response({'error': 'status parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        purchases = self.queryset.filter(payment_status=payment_status)
        serializer = self.get_serializer(purchases, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_supplier(self, request):
        """Filter purchases by supplier ID"""
        supplier_id = request.query_params.get('supplier_id')
        if not supplier_id:
            return Response({'error': 'supplier_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        purchases = self.queryset.filter(supplier_id=supplier_id)
        serializer = self.get_serializer(purchases, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_date_range(self, request):
        """Filter purchases by date range"""
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        
        queryset = self.queryset
        if start_date:
            queryset = queryset.filter(purchase_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(purchase_date__lte=end_date)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def outstanding_purchases(self, request):
        """Get all purchases with outstanding balance"""
        purchases = self.queryset.filter(payment_status__in=['due', 'partial'])
        total_outstanding = purchases.aggregate(total=Sum('cost'))['total'] or 0
        
        serializer = self.get_serializer(purchases, many=True)
        return Response({
            'total_outstanding': total_outstanding,
            'count': purchases.count(),
            'purchases': serializer.data
        })


class PaymentViewSet(viewsets.ModelViewSet):
    queryset = Payment.objects.select_related('purchase', 'purchase__supplier')
    serializer_class = PaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.SearchFilter, filters.OrderingFilter]
    filterset_class = PaymentFilter
    search_fields = ['purchase__item_name', 'purchase__supplier__name', 'reference', 'notes']
    ordering_fields = ['payment_date', 'amount']
    ordering = ['-payment_date']
    
    def perform_create(self, serializer):
        """Enhanced payment creation with validation"""
        payment = serializer.save()
        # Automatic payment status update is handled by model's save method
        return payment


class SupplierLedgerViewSet(viewsets.ReadOnlyModelViewSet):
    queryset = SupplierLedger.objects.all()
    serializer_class = SupplierLedgerSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier', 'transaction_type']
    ordering_fields = ['created_at']
    ordering = ['-created_at']
    
    @action(detail=False, methods=['get'])
    def supplier_summary(self, request):
        """Get ledger summary for a supplier"""
        supplier_id = request.query_params.get('supplier_id')
        if not supplier_id:
            return Response({'error': 'supplier_id is required'}, status=status.HTTP_400_BAD_REQUEST)
        
        try:
            supplier = Supplier.objects.get(id=supplier_id)
        except Supplier.DoesNotExist:
            return Response({'error': 'Supplier not found'}, status=status.HTTP_404_NOT_FOUND)
        
        ledger_entries = self.queryset.filter(supplier=supplier)
        serializer = self.get_serializer(ledger_entries, many=True)
        return Response({
            'supplier': SupplierSerializer(supplier).data,
            'ledger_entries': serializer.data
        })


class SupplierBalancePaymentViewSet(viewsets.ModelViewSet):
    queryset = SupplierBalancePayment.objects.all()
    serializer_class = SupplierBalancePaymentSerializer
    filter_backends = [DjangoFilterBackend, filters.OrderingFilter]
    filterset_fields = ['supplier']
    ordering_fields = ['payment_date']
    ordering = ['-payment_date']
