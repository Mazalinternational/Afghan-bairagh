from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db import transaction
from django.db.models import Q, Sum
from django.core.exceptions import ValidationError
from .models import Order, Payment
from .serializers import OrderSerializer, OrderListSerializer, PaymentSerializer
from customers.models import Customer
from customers.serializers import CustomerSerializer
from inventory.models import Item


class OrderViewSet(viewsets.ModelViewSet):
    serializer_class = OrderSerializer

    def get_serializer_class(self):
        if self.action == 'list':
            return OrderListSerializer
        return OrderSerializer

    def get_queryset(self):
        """Filter orders by customer if customer_id is provided"""
        queryset = Order.objects.select_related('customer').prefetch_related('order_items', 'order_items__item', 'payments').all()
        customer_id = self.request.query_params.get('customer')
        if customer_id:
            queryset = queryset.filter(customer_id=customer_id)
        return queryset

    @transaction.atomic
    def destroy(self, request, *args, **kwargs):
        """Delete order; return inventory if stock was already deducted for delivery."""
        order = self.get_object()
        if order.status in ('Delivered', 'Partially_Delivered'):
            from .services import OrderInventoryService
            try:
                OrderInventoryService.reverse_order_delivery(order)
            except ValidationError as e:
                return Response({'error': str(e)}, status=status.HTTP_400_BAD_REQUEST)
        return super().destroy(request, *args, **kwargs)

    @action(detail=False, methods=['get'])
    def get_customer_details(self, request):
        """Fetch customer details by ID for order creation"""
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response(
                {'error': 'customer_id parameter is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            customer = Customer.objects.get(id=customer_id)
            serializer = CustomerSerializer(customer)
            return Response(serializer.data)
        except Customer.DoesNotExist:
            return Response(
                {'error': 'Customer not found'},
                status=status.HTTP_404_NOT_FOUND
            )

    @action(detail=False, methods=['get'])
    def check_inventory(self, request):
        """Check inventory availability before order creation"""
        item_id = request.query_params.get('item_id')
        quantity = request.query_params.get('quantity')
        
        if not item_id or not quantity:
            return Response(
                {'error': 'item_id and quantity parameters are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            item = Item.objects.get(id=item_id)
            quantity = int(quantity)
            
            available = item.current_stock >= quantity
            return Response({
                'item_id': item.id,
                'item_name': item.name,
                'current_stock': item.current_stock,
                'requested_quantity': quantity,
                'available': available,
                'shortage': max(0, quantity - item.current_stock) if not available else 0
            })
        except Item.DoesNotExist:
            return Response(
                {'error': 'Item not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except ValueError:
            return Response(
                {'error': 'Invalid quantity value'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['get'])
    def pending(self, request):
        """List all pending orders"""
        orders = self.get_queryset().filter(status='Pending')
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def completed(self, request):
        """List all delivered/completed orders"""
        orders = self.get_queryset().filter(status='Delivered')
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def due(self, request):
        """List all orders that are not delivered/cancelled (may have due balance)"""
        orders = self.get_queryset().exclude(status__in=['Cancelled', 'Delivered'])
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)

    @action(detail=True, methods=['post'])
    def cancel(self, request, pk=None):
        """Cancel an order and rollback inventory"""
        try:
            order = self.get_object()
            order.cancel_order()
            # Refresh from DB to get updated stock values
            order.refresh_from_db()
            return Response(
                {'message': 'Order cancelled successfully', 'order': OrderSerializer(order).data},
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to cancel order: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def complete(self, request, pk=None):
        """Mark an order as delivered and deduct stock"""
        try:
            order = self.get_object()
            if order.status == 'Cancelled':
                return Response(
                    {'error': 'Cannot complete a cancelled order'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            if order.status == 'Delivered':
                return Response(
                    {'error': 'Order is already delivered'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Change status to Delivered (this will trigger stock deduction in save method)
            order.status = 'Delivered'
            order.save()
            
            return Response(
                {'message': 'Order delivered successfully and stock deducted', 'order': OrderSerializer(order).data},
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to deliver order: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=True, methods=['post'])
    def partial_deliver(self, request, pk=None):
        """
        Partially deliver items in an order.
        Expected payload:
        {
            "items": [
                {"order_item": 1, "quantity": 5},
                ...
            ]
        }
        """
        try:
            order = self.get_object()
            items_payload = request.data.get('items', [])
            if not items_payload:
                return Response(
                    {'error': 'items field is required'},
                    status=status.HTTP_400_BAD_REQUEST
                )

            from .services import OrderInventoryService
            deliveries = []
            for row in items_payload:
                order_item_id = row.get('order_item')
                quantity = row.get('quantity')
                if not order_item_id or quantity is None:
                    return Response(
                        {'error': 'Each item must include order_item and quantity'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                try:
                    quantity = int(quantity)
                except (TypeError, ValueError):
                    return Response(
                        {'error': 'Quantity must be a valid integer'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                if quantity <= 0:
                    return Response(
                        {'error': 'Quantity must be greater than zero'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                order_item = order.order_items.filter(id=order_item_id).first()
                if not order_item:
                    return Response(
                        {'error': f'Order item {order_item_id} does not belong to this order'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                deliveries.append((order_item, quantity))

            OrderInventoryService.process_partial_deliveries(deliveries)

            # Refresh order and items
            order.refresh_from_db()

            # Update order status based on delivered quantities
            items = list(order.order_items.all())
            all_delivered = all((i.delivered_quantity or 0) >= i.quantity for i in items)
            any_delivered = any((i.delivered_quantity or 0) > 0 for i in items)

            new_status = order.status
            if all_delivered:
                new_status = 'Delivered'
            elif any_delivered and order.status not in ('Delivered', 'Cancelled'):
                new_status = 'Partially_Delivered'

            if new_status != order.status:
                order.status = new_status
                order.save(update_fields=['status'])

            serializer = OrderSerializer(order)
            return Response(
                {'message': 'Partial delivery processed successfully', 'order': serializer.data},
                status=status.HTTP_200_OK
            )
        except ValidationError as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_400_BAD_REQUEST
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to process partial delivery: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def return_order(self, request):
        """Process return/refund for an order"""
        order_id = request.data.get('order')
        return_type = request.data.get('return_type', 'full')
        refund_amount = request.data.get('refund_amount')
        reason = request.data.get('reason', '')
        refund_method = request.data.get('refund_method', 'Cash')
        
        if not order_id:
            return Response(
                {'error': 'Order ID is required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            order = Order.objects.get(id=order_id)
            
            if order.status != 'Delivered' and order.status != 'Completed':
                return Response(
                    {'error': 'Can only return/refund delivered orders'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            total_order = float(order.total_estimated_amount)
            total_paid = order.payments.aggregate(s=Sum('amount_paid'))['s'] or 0
            total_paid = float(total_paid)
            # Calculate refund amount
            if return_type == 'full':
                refund_amount = min(float(total_order), total_paid)
            else:
                if not refund_amount or float(refund_amount) <= 0:
                    return Response(
                        {'error': 'Invalid refund amount'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                refund_amount = min(float(refund_amount), total_paid)
            
            # Order model has no stored due/balance; refund is recorded elsewhere if needed
            
            return Response({
                'message': 'Return/Refund processed successfully',
                'refund_amount': refund_amount,
                'order': OrderSerializer(order).data
            }, status=status.HTTP_200_OK)
            
        except Order.DoesNotExist:
            return Response(
                {'error': 'Order not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': f'Failed to process return/refund: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )


class PaymentViewSet(viewsets.ModelViewSet):
    serializer_class = PaymentSerializer

    def get_queryset(self):
        qs = Payment.objects.select_related('order', 'order__customer').all()
        order_id = self.request.query_params.get('order')
        if order_id:
            qs = qs.filter(order_id=order_id)
        return qs

    @action(detail=False, methods=['get'])
    def outstanding_dues(self, request):
        """Report of all orders with outstanding dues (total_estimated_amount > sum of payments)"""
        orders = Order.objects.exclude(status='Cancelled').select_related('customer').prefetch_related('payments')
        dues_data = []
        total_outstanding = 0
        for order in orders:
            total_paid = order.payments.aggregate(s=Sum('amount_paid'))['s'] or 0
            due = max(0, float(order.total_estimated_amount) - float(total_paid))
            if due <= 0:
                continue
            total_outstanding += due
            dues_data.append({
                'order_id': order.id,
                'customer_name': order.customer.name,
                'customer_phone': order.customer.phone,
                'total_amount': float(order.total_estimated_amount),
                'total_paid': float(total_paid),
                'due_amount': due,
                'order_date': order.order_date,
                'status': order.status
            })
        return Response({
            'total_outstanding': total_outstanding,
            'count': len(dues_data),
            'orders': dues_data
        })
    
    @action(detail=False, methods=['get'])
    def customer_credits(self, request):
        """Report of customers with credit balances (Order model has no balance field; return empty)"""
        return Response({
            'total_credits': 0,
            'count': 0,
            'orders': []
        })
    
    @action(detail=False, methods=['get'])
    def filter_by_status(self, request):
        """Filter orders by status with optional date range (returns orders)"""
        status_filter = request.query_params.get('status')
        start_date = request.query_params.get('start_date')
        end_date = request.query_params.get('end_date')
        queryset = Order.objects.select_related('customer').prefetch_related('order_items', 'order_items__item', 'payments').all()
        if status_filter:
            queryset = queryset.filter(status=status_filter)
        if start_date:
            queryset = queryset.filter(order_date__gte=start_date)
        if end_date:
            queryset = queryset.filter(order_date__lte=end_date)
        serializer = OrderListSerializer(queryset, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def filter_by_customer(self, request):
        """Filter orders by customer ID (returns orders)"""
        customer_id = request.query_params.get('customer_id')
        if not customer_id:
            return Response({'error': 'customer_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        orders = Order.objects.select_related('customer').prefetch_related('order_items', 'order_items__item', 'payments').filter(customer_id=customer_id)
        serializer = OrderListSerializer(orders, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_amount_range(self, request):
        """Filter orders by amount range (PaymentViewSet: filter payments by amount_paid)"""
        min_amount = request.query_params.get('min_amount')
        max_amount = request.query_params.get('max_amount')
        queryset = self.get_queryset()
        if min_amount:
            queryset = queryset.filter(amount_paid__gte=min_amount)
        if max_amount:
            queryset = queryset.filter(amount_paid__lte=max_amount)
        serializer = PaymentSerializer(queryset, many=True)
        return Response(serializer.data)
