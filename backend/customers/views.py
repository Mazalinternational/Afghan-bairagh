from decimal import Decimal, InvalidOperation
from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.core.cache import cache
from django.db.models import Q, Sum
from .models import Customer, CustomerBalancePayment
from .serializers import CustomerSerializer, CustomerCreateSerializer, CustomerBalancePaymentSerializer


class CustomerViewSet(viewsets.ModelViewSet):
    queryset = Customer.objects.all()
    permission_classes = [AllowAny]
    http_method_names = ['get', 'post', 'put', 'patch', 'delete', 'head', 'options']

    def get_serializer_class(self):
        if self.action == 'create':
            return CustomerCreateSerializer
        return CustomerSerializer

    def retrieve(self, request, pk=None):
        """Retrieve customer (always fresh from DB)."""
        try:
            customer = self.get_object()
            serializer = self.get_serializer(customer)
            return Response(serializer.data)
        except Customer.DoesNotExist:
            return Response({'error': 'Customer not found'}, status=status.HTTP_404_NOT_FOUND)

    def create(self, request, *args, **kwargs):
        """Create customer and return ID"""
        serializer = self.get_serializer(data=request.data)
        serializer.is_valid(raise_exception=True)
        customer = serializer.save()
        
        # Cache the new customer
        cache_key = f"customer_{customer.id}"
        customer_serializer = CustomerSerializer(customer)
        cache.set(cache_key, customer_serializer.data, timeout=300)
        
        return Response({
            'id': customer.id,
            'message': 'Customer created successfully'
        }, status=status.HTTP_201_CREATED)

    def update(self, request, *args, **kwargs):
        """Update customer and invalidate cache"""
        response = super().update(request, *args, **kwargs)
        if response.status_code == 200:
            cache_key = f"customer_{kwargs.get('pk')}"
            cache.delete(cache_key)
        return response

    def partial_update(self, request, *args, **kwargs):
        """Partial update customer and invalidate cache"""
        response = super().partial_update(request, *args, **kwargs)
        if response.status_code == 200:
            cache_key = f"customer_{kwargs.get('pk')}"
            cache.delete(cache_key)
        return response

    def destroy(self, request, *args, **kwargs):
        """Delete customer and invalidate cache"""
        try:
            customer = self.get_object()
            customer_id = customer.id

            from orders.models import Order
            from orders.quotation_models import Quotation
            from sales.models import Sale
            from sales.direct_sales_models import DirectSale

            # Remove rows that are not shown on the customer ledger / are abandoned drafts,
            # so deletion matches an "empty ledger" in the UI.
            Quotation.objects.filter(customer=customer).delete()
            Sale.objects.filter(customer=customer, status__in=['Draft', 'Cancelled']).delete()
            DirectSale.objects.filter(customer=customer, status__in=['Draft', 'Cancelled']).delete()
            Order.objects.filter(customer=customer, status='Cancelled').delete()

            if Order.objects.filter(customer=customer).exists():
                return Response(
                    {'error': 'Cannot delete customer while they have active orders.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if Sale.objects.filter(customer=customer).exists():
                return Response(
                    {'error': 'Cannot delete customer with confirmed inventory sales on record.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if DirectSale.objects.filter(customer=customer).exists():
                return Response(
                    {'error': 'Cannot delete customer with confirmed direct sales on record.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if customer.previous_balance_remaining > Decimal('0'):
                return Response(
                    {'error': 'Cannot delete customer with an outstanding previous balance.'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            customer.delete()
            
            # Invalidate cache
            cache_key = f"customer_{customer_id}"
            cache.delete(cache_key)
            
            return Response({'message': 'Customer deleted successfully'}, status=status.HTTP_200_OK)
        except Exception as e:
            return Response(
                {'error': f'Failed to delete customer: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def search(self, request):
        """Search customers by name or phone"""
        query = request.query_params.get('q', '').strip()
        if not query:
            return Response({'error': 'Search query required'}, status=status.HTTP_400_BAD_REQUEST)
        
        customers = self.queryset.filter(
            Q(name__icontains=query) | Q(phone__icontains=query)
        )[:20]  # Limit results
        
        serializer = self.get_serializer(customers, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def pay_previous_balance(self, request, pk=None):
        """Record a payment towards customer's previous balance"""
        customer = self.get_object()
        amount = request.data.get('amount')
        notes = request.data.get('notes', '')
        reference = request.data.get('reference', '')

        try:
            amount = Decimal(str(amount or 0))
        except (TypeError, ValueError, InvalidOperation):
            return Response({'error': 'Invalid amount'}, status=status.HTTP_400_BAD_REQUEST)

        if amount <= 0:
            return Response({'error': 'Amount must be greater than zero'}, status=status.HTTP_400_BAD_REQUEST)

        remaining = customer.previous_balance_remaining
        if remaining <= 0:
            return Response({'error': 'No previous balance remaining for this customer'}, status=status.HTTP_400_BAD_REQUEST)

        # Do not allow paying more than remaining
        amount_to_record = min(amount, remaining)

        CustomerBalancePayment.objects.create(
            customer=customer,
            amount=amount_to_record,
            notes=notes,
        )

        # Refresh customer to update computed fields and clear cache
        customer.refresh_from_db()
        cache_key = f"customer_{customer.id}"
        cache.delete(cache_key)
        serializer = self.get_serializer(customer)
        return Response(
            {
                'message': 'Previous balance payment recorded successfully',
                'customer': serializer.data,
            },
            status=status.HTTP_200_OK,
        )


class CustomerBalancePaymentViewSet(viewsets.ModelViewSet):
    queryset = CustomerBalancePayment.objects.all()
    serializer_class = CustomerBalancePaymentSerializer
    permission_classes = [AllowAny]

    def _invalidate_customer_cache(self, customer_id):
        cache.delete(f"customer_{customer_id}")

    def perform_create(self, serializer):
        instance = serializer.save()
        self._invalidate_customer_cache(instance.customer_id)

    def perform_update(self, serializer):
        instance = serializer.save()
        self._invalidate_customer_cache(instance.customer_id)

    def perform_destroy(self, instance):
        customer_id = instance.customer_id
        super().perform_destroy(instance)
        self._invalidate_customer_cache(customer_id)

    def get_queryset(self):
        queryset = CustomerBalancePayment.objects.all()
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset