from django.db import transaction
from django.core.exceptions import ValidationError
from inventory.models import Item, StockTransaction


class InventoryService:
    """
    Service layer for controlled stock transactions
    All stock operations must go through this service
    """
    
    @staticmethod
    @transaction.atomic
    def process_sale_stock(sale):
        """
        Deduct stock for all items in a sale
        This is the ONLY place where stock is deducted for sales
        """
        for sale_item in sale.items.all():
            item = sale_item.item
            quantity = sale_item.quantity
            stock_type = sale_item.stock_type
            
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
                reference_type='SALE',
                reference_id=sale.id,
                reference_number=f'SALE-{sale.id}',
                notes=f'Sale #{sale.id} - {sale.customer.name}'
            )
            
            # Deduct stock
            if stock_type == 'press_stock':
                item.press_stock -= quantity
            else:
                item.home_stock -= quantity
            
            # Update current_stock
            item.current_stock = item.press_stock + item.home_stock
            item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])
    
    @staticmethod
    @transaction.atomic
    def reverse_sale_stock(sale):
        """
        Return stock when sale is cancelled
        """
        for sale_item in sale.items.all():
            item = sale_item.item
            quantity = sale_item.quantity
            stock_type = sale_item.stock_type
            
            # Create reverse stock transaction
            StockTransaction.objects.create(
                item=item,
                transaction_type='IN',
                stock_type=stock_type,
                quantity=quantity,
                reference_type='SALE_CANCEL',
                reference_id=sale.id,
                reference_number=f'SALE-{sale.id}-CANCEL',
                notes=f'Sale #{sale.id} cancelled - Stock returned'
            )
            
            # Return stock
            if stock_type == 'press_stock':
                item.press_stock += quantity
            else:
                item.home_stock += quantity
            
            # Update current_stock
            item.current_stock = item.press_stock + item.home_stock
            item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])
    
    @staticmethod
    @transaction.atomic
    def process_purchase_stock(purchase):
        """
        Add stock when purchase is received
        """
        item = purchase.item
        quantity = purchase.quantity
        stock_type = purchase.stock_type
        
        # Create stock transaction
        StockTransaction.objects.create(
            item=item,
            transaction_type='IN',
            stock_type=stock_type,
            quantity=quantity,
            reference_type='PURCHASE',
            reference_id=purchase.id,
            reference_number=f'PURCH-{purchase.id}',
            notes=f'Purchase #{purchase.id} - {purchase.supplier.name if hasattr(purchase, 'supplier') else "N/A"}'
        )
        
        # Add stock
        if stock_type == 'press_stock':
            item.press_stock += quantity
        else:
            item.home_stock += quantity
        
        # Update current_stock
        item.current_stock = item.press_stock + item.home_stock
        item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])
    
    @staticmethod
    @transaction.atomic
    def adjust_stock(item, quantity, stock_type, reason, user=None):
        """
        Manual stock adjustment (corrections, damages, etc.)
        """
        transaction_type = 'IN' if quantity > 0 else 'OUT'
        abs_quantity = abs(quantity)
        
        if transaction_type == 'OUT':
            available_stock = item.press_stock if stock_type == 'press_stock' else item.home_stock
            if available_stock < abs_quantity:
                raise ValidationError(f'Insufficient stock for adjustment')
        
        # Create stock transaction
        StockTransaction.objects.create(
            item=item,
            transaction_type=transaction_type,
            stock_type=stock_type,
            quantity=abs_quantity,
            reference_type='ADJUSTMENT',
            reference_id=0,
            reference_number=f'ADJ-{item.id}-{transaction_type}',
            notes=reason,
            created_by=user
        )
        
        # Adjust stock
        if stock_type == 'press_stock':
            item.press_stock += quantity
        else:
            item.home_stock += quantity
        
        # Update current_stock
        item.current_stock = item.press_stock + item.home_stock
        item.save(update_fields=['press_stock', 'home_stock', 'current_stock'])
