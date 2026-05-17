from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from rest_framework.permissions import AllowAny
from django.db.models import Q
from .models import Sale, SaleItem, SalePayment
from .direct_sales_models import DirectSale, DirectSaleItem, DirectSalePayment
from .serializers import (
    SaleSerializer, SaleListSerializer, SalePaymentSerializer,
    DirectSaleSerializer, DirectSaleListSerializer, DirectSalePaymentSerializer
)
from .services import InventoryService


class DirectSalePaymentViewSet(viewsets.ModelViewSet):
    queryset = DirectSalePayment.objects.select_related('direct_sale').all()
    serializer_class = DirectSalePaymentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = DirectSalePayment.objects.select_related('direct_sale').all()
        sale_id = self.request.query_params.get('direct_sale')
        if sale_id:
            queryset = queryset.filter(direct_sale_id=sale_id)
        return queryset


class SalePaymentViewSet(viewsets.ModelViewSet):
    queryset = SalePayment.objects.all()
    serializer_class = SalePaymentSerializer
    permission_classes = [AllowAny]

    def get_queryset(self):
        queryset = SalePayment.objects.all()
        sale_id = self.request.query_params.get('sale')
        if sale_id:
            queryset = queryset.filter(sale_id=sale_id)
        return queryset


class SaleViewSet(viewsets.ModelViewSet):
    queryset = Sale.objects.select_related('customer').prefetch_related('items', 'payments').all()
    serializer_class = SaleSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'list':
            return SaleListSerializer
        return SaleSerializer

    def get_queryset(self):
        """Filter sales by customer if customer_id is provided"""
        queryset = Sale.objects.select_related('customer').prefetch_related('items', 'payments').all()
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        """
        Confirm sale and deduct stock
        This is where stock deduction happens
        """
        try:
            sale = self.get_object()
            sale.confirm_sale()  # This calls InventoryService.process_sale_stock()
            return Response(
                {'message': 'Sale confirmed successfully', 'sale': SaleSerializer(sale).data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """
        Cancel sale and return stock if it was confirmed
        """
        try:
            sale = self.get_object()
            sale.cancel_sale()  # This calls InventoryService.reverse_sale_stock()
            return Response(
                {'message': 'Sale cancelled successfully', 'sale': SaleSerializer(sale).data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        """Add payment to a sale"""
        sale = self.get_object()
        serializer = SalePaymentSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(sale=sale)
            return Response(
                {'message': 'Payment added successfully', 'sale': SaleSerializer(sale).data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=False, methods=['post'])
    def create_from_order(self, request):
        """
        Convert an order to a sale
        This is the proper way to fulfill an order
        """
        from orders.models import Order
        
        order_id = request.data.get('order_id')
        if not order_id:
            return Response(
                {'error': 'order_id is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
            
            if order.status == 'Cancelled':
                return Response(
                    {'error': 'Cannot create sale from cancelled order'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            if order.status == 'Delivered':
                return Response(
                    {'error': 'Order already delivered'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Create sale from order
            sale = Sale.objects.create(
                customer=order.customer,
                reference_order=order,
                notes=f'Converted from Order #{order.id}',
                discount=request.data.get('discount', 0),
                tax=request.data.get('tax', 0)
            )
            
            # Create sale items from order items
            for order_item in order.order_items.all():
                SaleItem.objects.create(
                    sale=sale,
                    item=order_item.item,
                    quantity=order_item.quantity,
                    price_per_unit=order_item.price_estimate,
                    stock_type=order_item.stock_type,
                    flag_size=order_item.flag_size,
                    quality_design_type=order_item.quality_design_type
                )
            
            # Confirm sale (deduct stock)
            if request.data.get('confirm', True):
                sale.confirm_sale()
            
            return Response(
                {'message': 'Sale created from order successfully', 'sale': SaleSerializer(sale).data},
                status=status.HTTP_201_CREATED
            )
            
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def confirmed(self, request):
        """List all confirmed sales"""
        sales = self.queryset.filter(status='Confirmed')
        serializer = SaleListSerializer(sales, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def unpaid(self, request):
        """List all unpaid or partially paid sales"""
        sales = self.queryset.filter(payment_status__in=['Unpaid', 'Partial'])
        serializer = SaleListSerializer(sales, many=True)
        return Response(serializer.data)


class DirectSaleViewSet(viewsets.ModelViewSet):
    queryset = DirectSale.objects.select_related('customer').prefetch_related('items', 'payments').all()
    serializer_class = DirectSaleSerializer
    permission_classes = [AllowAny]

    def get_serializer_class(self):
        if self.action == 'list':
            return DirectSaleListSerializer
        return DirectSaleSerializer

    def get_queryset(self):
        queryset = DirectSale.objects.select_related('customer').prefetch_related('items', 'payments').all()
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            from customers.models import Customer
            customer = Customer.objects.filter(pk=customer_id).first()
            if customer:
                name = (customer.name or '').strip()
                queryset = queryset.filter(
                    Q(customer_id=customer_id)
                    | Q(customer__isnull=True, customer_name__iexact=name)
                )
            else:
                queryset = queryset.filter(customer_id=customer_id)
        return queryset

    @action(detail=True, methods=['post'])
    def confirm(self, request, pk=None):
        try:
            direct_sale = self.get_object()
            if direct_sale.status == 'Confirmed':
                return Response({'error': 'Direct sale is already confirmed'}, status=status.HTTP_400_BAD_REQUEST)
            
            direct_sale.status = 'Confirmed'
            direct_sale.save()
            direct_sale.update_due()
            
            return Response(
                {'message': 'Direct sale confirmed successfully', 'direct_sale': DirectSaleSerializer(direct_sale).data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        try:
            direct_sale = self.get_object()
            direct_sale.status = 'Cancelled'
            direct_sale.save()
            return Response(
                {'message': 'Direct sale cancelled successfully', 'direct_sale': DirectSaleSerializer(direct_sale).data},
                status=status.HTTP_200_OK
            )
        except Exception as e:
            return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)

    @action(detail=True, methods=['post'])
    def add_payment(self, request, pk=None):
        direct_sale = self.get_object()
        serializer = DirectSalePaymentSerializer(data=request.data)
        
        if serializer.is_valid():
            serializer.save(direct_sale=direct_sale)
            return Response(
                {'message': 'Payment added successfully', 'direct_sale': DirectSaleSerializer(direct_sale).data},
                status=status.HTTP_201_CREATED
            )
        return Response(serializer.errors, status=status.HTTP_400_BAD_REQUEST)
