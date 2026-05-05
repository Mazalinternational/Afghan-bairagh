from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from django.db.models import Sum, Count, Q, F
from django.db.models.functions import TruncDate
from django.utils import timezone
from django.db import transaction
from datetime import timedelta
from .models import Category, Item, StockTransaction, LowStockAlert, FlagDesignType
from .serializers import (
    CategorySerializer, ItemSerializer, StockTransactionSerializer,
    LowStockAlertSerializer, StockReportSerializer, ItemStockHistorySerializer,
    FlagDesignTypeSerializer
)


class FlagDesignTypeViewSet(viewsets.ModelViewSet):
    queryset = FlagDesignType.objects.all()
    serializer_class = FlagDesignTypeSerializer
    permission_classes = []  # AllowAny by default


class CategoryViewSet(viewsets.ModelViewSet):
    queryset = Category.objects.prefetch_related('items').all()
    serializer_class = CategorySerializer


class ItemViewSet(viewsets.ModelViewSet):
    serializer_class = ItemSerializer

    def get_queryset(self):
        return Item.objects.select_related('category').all()

    def destroy(self, request, *args, **kwargs):
        """Delete item with protection check"""
        try:
            item = self.get_object()
            
            # Check if item has order items
            from orders.models import OrderItem
            if OrderItem.objects.filter(item=item).exists():
                order_count = OrderItem.objects.filter(item=item).count()
                return Response(
                    {'error': f'Cannot delete item "{item.name}" because it is referenced by {order_count} order item(s). Please remove or cancel all related orders first.'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            # Check if item has purchases
            from purchases.models import Purchase
            if Purchase.objects.filter(item=item).exists():
                purchase_count = Purchase.objects.filter(item=item).count()
                return Response(
                    {'error': f'Cannot delete item "{item.name}" because it is referenced by {purchase_count} purchase(s).'},
                    status=status.HTTP_400_BAD_REQUEST
                )
            
            return super().destroy(request, *args, **kwargs)
        except Exception as e:
            return Response(
                {'error': f'Failed to delete item: {str(e)}'},
                status=status.HTTP_400_BAD_REQUEST
            )

    @action(detail=False, methods=['post'])
    def produce(self, request):
        """Convert raw materials to finished products"""
        raw_material_id = request.data.get('raw_material_id')
        finished_product_id = request.data.get('finished_product_id')
        raw_quantity = request.data.get('raw_quantity')
        finished_quantity = request.data.get('finished_quantity', 1)
        
        if not all([raw_material_id, finished_product_id, raw_quantity]):
            return Response(
                {'error': 'raw_material_id, finished_product_id, and raw_quantity are required'},
                status=status.HTTP_400_BAD_REQUEST
            )
        
        try:
            with transaction.atomic():
                raw_material = Item.objects.get(id=raw_material_id, item_type='raw_material')
                finished_product = Item.objects.get(id=finished_product_id, item_type='finished_product')
                
                if raw_material.current_stock < raw_quantity:
                    return Response(
                        {'error': f'Insufficient raw material stock. Available: {raw_material.current_stock}'},
                        status=status.HTTP_400_BAD_REQUEST
                    )
                
                # Deduct raw material
                raw_material.current_stock -= raw_quantity
                raw_material.save()
                
                # Add finished product
                finished_product.current_stock += finished_quantity
                finished_product.save()
                
                # Create stock transactions
                StockTransaction.objects.create(
                    item=raw_material,
                    transaction_type='OUT',
                    quantity=raw_quantity,
                    reference_number=f'PROD-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                    notes=f'Production: {raw_quantity} used to produce {finished_quantity} {finished_product.name}',
                    created_by=request.user
                )
                
                StockTransaction.objects.create(
                    item=finished_product,
                    transaction_type='IN',
                    quantity=finished_quantity,
                    reference_number=f'PROD-{timezone.now().strftime("%Y%m%d%H%M%S")}',
                    notes=f'Production: {finished_quantity} produced from {raw_quantity} {raw_material.name}',
                    created_by=request.user
                )
                
                return Response({
                    'message': 'Production completed successfully',
                    'raw_material': {'name': raw_material.name, 'remaining_stock': raw_material.current_stock},
                    'finished_product': {'name': finished_product.name, 'new_stock': finished_product.current_stock}
                })
                
        except Item.DoesNotExist:
            return Response(
                {'error': 'Raw material or finished product not found'},
                status=status.HTTP_404_NOT_FOUND
            )
        except Exception as e:
            return Response(
                {'error': str(e)},
                status=status.HTTP_500_INTERNAL_SERVER_ERROR
            )

    @action(detail=False, methods=['get'])
    def low_stock(self, request):
        """Get items with low stock"""
        low_stock_items = self.get_queryset().filter(
            current_stock__lte=F('minimum_stock')
        )
        serializer = self.get_serializer(low_stock_items, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def by_type(self, request):
        """Get items filtered by type"""
        item_type = request.query_params.get('type')
        if item_type:
            items = self.get_queryset().filter(item_type=item_type)
            serializer = self.get_serializer(items, many=True)
            return Response(serializer.data)
        return Response({'error': 'Type parameter required'}, status=400)
    
    @action(detail=False, methods=['get'])
    def filter_by_stock_level(self, request):
        """Filter items by stock level range"""
        min_stock = request.query_params.get('min_stock')
        max_stock = request.query_params.get('max_stock')
        
        queryset = self.get_queryset()
        if min_stock:
            queryset = queryset.filter(current_stock__gte=min_stock)
        if max_stock:
            queryset = queryset.filter(current_stock__lte=max_stock)
        
        serializer = self.get_serializer(queryset, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def critical_stock(self, request):
        """Get items with critical stock (out of stock or very low)"""
        threshold = request.query_params.get('threshold', 0)
        critical_items = self.get_queryset().filter(current_stock__lte=threshold)
        serializer = self.get_serializer(critical_items, many=True)
        return Response(serializer.data)
    
    @action(detail=False, methods=['get'])
    def filter_by_category(self, request):
        """Filter items by category"""
        category_id = request.query_params.get('category_id')
        if not category_id:
            return Response({'error': 'category_id parameter required'}, status=status.HTTP_400_BAD_REQUEST)
        
        items = self.get_queryset().filter(category_id=category_id)
        serializer = self.get_serializer(items, many=True)
        return Response(serializer.data)


class StockTransactionViewSet(viewsets.ModelViewSet):
    serializer_class = StockTransactionSerializer

    def get_queryset(self):
        return StockTransaction.objects.select_related(
            'item', 'item__category', 'created_by'
        ).all()

    def perform_create(self, serializer):
        serializer.save(created_by=self.request.user)

    @action(detail=False, methods=['get'])
    def by_item(self, request):
        """Get transactions for a specific item"""
        item_id = request.query_params.get('item_id')
        if item_id:
            transactions = self.get_queryset().filter(item_id=item_id)
            serializer = self.get_serializer(transactions, many=True)
            return Response(serializer.data)
        return Response({'error': 'item_id parameter required'}, status=400)

    @action(detail=False, methods=['get'])
    def stock_history(self, request):
        """Get stock movement history for an item"""
        item_id = request.query_params.get('item_id')
        days = int(request.query_params.get('days', 30))
        
        if not item_id:
            return Response({'error': 'item_id parameter required'}, status=400)

        start_date = timezone.now().date() - timedelta(days=days)
        
        history = StockTransaction.objects.filter(
            item_id=item_id,
            created_at__date__gte=start_date
        ).annotate(
            date=TruncDate('created_at')
        ).values('date').annotate(
            stock_in=Sum('quantity', filter=Q(transaction_type='IN')),
            stock_out=Sum('quantity', filter=Q(transaction_type='OUT'))
        ).annotate(
            net_change=F('stock_in') - F('stock_out')
        ).order_by('date')

        serializer = ItemStockHistorySerializer(history, many=True)
        return Response(serializer.data)


class LowStockAlertViewSet(viewsets.ReadOnlyModelViewSet):
    serializer_class = LowStockAlertSerializer

    def get_queryset(self):
        return LowStockAlert.objects.select_related('item').all()

    @action(detail=True, methods=['post'])
    def resolve(self, request, pk=None):
        """Mark a low stock alert as resolved"""
        alert = self.get_object()
        alert.is_resolved = True
        alert.resolved_at = timezone.now()
        alert.save()
        return Response({'status': 'Alert resolved'})

    @action(detail=False, methods=['get'])
    def active(self, request):
        """Get only active (unresolved) alerts"""
        active_alerts = self.get_queryset().filter(is_resolved=False)
        serializer = self.get_serializer(active_alerts, many=True)
        return Response(serializer.data)


class ReportViewSet(viewsets.ViewSet):
    """Reporting endpoints for inventory analytics"""

    @action(detail=False, methods=['get'])
    def stock_summary(self, request):
        """Get stock summary by item type"""
        summary = Item.objects.values('item_type').annotate(
            total_items=Count('id'),
            total_stock_value=Sum(F('current_stock') * F('unit_price')),
            low_stock_items=Count('id', filter=Q(current_stock__lte=F('minimum_stock')))
        )
        
        serializer = StockReportSerializer(summary, many=True)
        return Response(serializer.data)

    @action(detail=False, methods=['get'])
    def transaction_summary(self, request):
        """Get transaction summary for a date range"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        summary = StockTransaction.objects.filter(
            created_at__date__gte=start_date
        ).aggregate(
            total_transactions=Count('id'),
            total_stock_in=Sum('quantity', filter=Q(transaction_type='IN')),
            total_stock_out=Sum('quantity', filter=Q(transaction_type='OUT'))
        )
        
        return Response(summary)

    @action(detail=False, methods=['get'])
    def top_moving_items(self, request):
        """Get items with highest transaction volume"""
        days = int(request.query_params.get('days', 30))
        start_date = timezone.now().date() - timedelta(days=days)
        
        top_items = Item.objects.filter(
            transactions__created_at__date__gte=start_date
        ).annotate(
            total_transactions=Sum('transactions__quantity')
        ).select_related('category').order_by('-total_transactions')[:10]
        
        serializer = ItemSerializer(top_items, many=True)
        return Response(serializer.data)