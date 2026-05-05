from django.db import transaction
from .models import Item, StockTransaction, LowStockAlert
from core.models import AuditLog


class InventoryService:
    @staticmethod
    @transaction.atomic
    def stock_in(item_id, quantity, notes='', user=None):
        item = Item.objects.select_for_update().get(id=item_id)
        stock_txn = StockTransaction.objects.create(
            item=item,
            transaction_type='stock_in',
            quantity=quantity,
            notes=notes
        )
        
        if user:
            AuditLog.objects.create(
                user=user,
                action='STOCK_IN',
                details={'item_id': item_id, 'quantity': quantity, 'new_stock': item.current_stock}
            )
        
        return stock_txn
    
    @staticmethod
    @transaction.atomic
    def stock_out(item_id, quantity, notes='', user=None):
        item = Item.objects.select_for_update().get(id=item_id)
        if item.current_stock < quantity:
            raise ValueError(f'Insufficient stock. Available: {item.current_stock}')
        
        stock_txn = StockTransaction.objects.create(
            item=item,
            transaction_type='stock_out',
            quantity=quantity,
            notes=notes
        )
        
        if user:
            AuditLog.objects.create(
                user=user,
                action='STOCK_OUT',
                details={'item_id': item_id, 'quantity': quantity, 'new_stock': item.current_stock}
            )
        
        return stock_txn
    
    @staticmethod
    def resolve_alert(alert_id, user=None):
        alert = LowStockAlert.objects.get(id=alert_id)
        alert.is_resolved = True
        alert.save()
        
        if user:
            AuditLog.objects.create(
                user=user,
                action='RESOLVE_STOCK_ALERT',
                details={'alert_id': alert_id, 'item_id': alert.item.id}
            )
        
        return alert
