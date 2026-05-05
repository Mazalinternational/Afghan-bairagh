from django.db import transaction
from django.core.exceptions import ValidationError
from inventory.models import StockTransaction


class OrderInventoryService:
    """
    Service for order stock operations
    Stock is deducted ONLY when order is delivered
    """
    
    @staticmethod
    @transaction.atomic
    def process_order_delivery(order):
        """
        Deduct stock when order status changes to 'Delivered'.
        This will only deduct remaining (undelivered) quantities.
        """
        for order_item in order.order_items.all():
            item = order_item.item
            already_delivered = getattr(order_item, 'delivered_quantity', 0) or 0
            quantity = max(0, order_item.quantity - already_delivered)
            if quantity <= 0:
                continue
            stock_type = order_item.stock_type
            
            # Check stock availability
            available_stock = item.press_stock if stock_type == 'press_stock' else item.home_stock
            
            if available_stock < quantity:
                raise ValidationError(
                    f'Insufficient {stock_type.replace("_", " ")} for {item.name}. '
                    f'Available: {available_stock}, Required: {quantity}'
                )
            
            # Create stock transaction
            StockTransaction.objects.create(
                item=item,
                transaction_type='OUT',
                stock_type=stock_type,
                quantity=quantity,
                reference_type='ORDER',
                reference_id=order.id,
                reference_number=f'ORDER-{order.id}',
                notes=f'Order #{order.id} delivered - {order.customer.name}'
            )
            
            # Deduct stock
            if stock_type == 'press_stock':
                item.press_stock -= quantity
            else:
                item.home_stock -= quantity
            
            # Update current_stock
            item.current_stock = item.press_stock + item.home_stock
            item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])

            # Update delivered quantity for the order item
            order_item.delivered_quantity = already_delivered + quantity
            order_item.save(update_fields=['delivered_quantity'])
    
    @staticmethod
    @transaction.atomic
    def reverse_order_delivery(order):
        """
        Return stock when delivered order is cancelled
        """
        for order_item in order.order_items.all():
            item = order_item.item
            delivered_quantity = getattr(order_item, 'delivered_quantity', 0) or 0
            quantity = delivered_quantity
            if quantity <= 0:
                continue
            stock_type = order_item.stock_type
            
            # Create reverse stock transaction
            StockTransaction.objects.create(
                item=item,
                transaction_type='IN',
                stock_type=stock_type,
                quantity=quantity,
                reference_type='ORDER_CANCEL',
                reference_id=order.id,
                reference_number=f'ORDER-{order.id}-CANCEL',
                notes=f'Order #{order.id} cancelled - Stock returned'
            )
            
            # Return stock
            if stock_type == 'press_stock':
                item.press_stock += quantity
            else:
                item.home_stock += quantity
            
            # Update current_stock
            item.current_stock = item.press_stock + item.home_stock
            item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])

            # Reset delivered quantity on cancellation
            order_item.delivered_quantity = 0
            order_item.save(update_fields=['delivered_quantity'])

    @staticmethod
    @transaction.atomic
    def process_partial_deliveries(deliveries):
        """
        Process partial deliveries for a list of (order_item, quantity) tuples.
        """
        for order_item, quantity in deliveries:
            if quantity <= 0:
                raise ValidationError('Delivery quantity must be greater than zero.')

            already_delivered = getattr(order_item, 'delivered_quantity', 0) or 0
            remaining = order_item.quantity - already_delivered
            if quantity > remaining:
                raise ValidationError(
                    f"Cannot deliver more than remaining quantity for item {order_item.item.name}. "
                    f"Remaining: {remaining}, Requested: {quantity}"
                )

            item = order_item.item
            stock_type = order_item.stock_type

            # Check stock availability
            available_stock = item.press_stock if stock_type == 'press_stock' else item.home_stock
            if available_stock < quantity:
                raise ValidationError(
                    f'Insufficient {stock_type.replace("_", " ")} for {item.name}. '
                    f'Available: {available_stock}, Requested: {quantity}'
                )

            # Create stock transaction
            StockTransaction.objects.create(
                item=item,
                transaction_type='OUT',
                stock_type=stock_type,
                quantity=quantity,
                reference_type='ORDER_PARTIAL',
                reference_id=order_item.order.id,
                reference_number=f'ORDER-{order_item.order.id}-PARTIAL',
                notes=f'Partial delivery for Order #{order_item.order.id} - {order_item.order.customer.name}'
            )

            # Deduct stock
            if stock_type == 'press_stock':
                item.press_stock -= quantity
            else:
                item.home_stock -= quantity

            # Update current_stock
            item.current_stock = item.press_stock + item.home_stock
            item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])

            # Update delivered quantity on the order item
            order_item.delivered_quantity = already_delivered + quantity
            order_item.save(update_fields=['delivered_quantity'])
