from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from django.utils import timezone
from .models import StockTransaction, Item, LowStockAlert
from core.models import AuditLog


@receiver(post_save, sender=StockTransaction)
def update_stock_on_transaction(sender, instance, created, **kwargs):
    """Update item stock when a stock transaction is created"""
    if created:
        with transaction.atomic():
            item = Item.objects.select_for_update().get(id=instance.item.id)
            old_press_stock = item.press_stock
            old_home_stock = item.home_stock
            old_total_stock = item.current_stock
            
            # Update based on stock_type
            if instance.stock_type == 'press_stock':
                if instance.transaction_type == 'IN':
                    item.press_stock += instance.quantity
                elif instance.transaction_type == 'OUT':
                    if item.press_stock < instance.quantity:
                        raise ValueError(f"Insufficient press stock. Available: {item.press_stock}")
                    item.press_stock -= instance.quantity
            elif instance.stock_type == 'home_stock':
                if instance.transaction_type == 'IN':
                    item.home_stock += instance.quantity
                elif instance.transaction_type == 'OUT':
                    if item.home_stock < instance.quantity:
                        raise ValueError(f"Insufficient home stock. Available: {item.home_stock}")
                    item.home_stock -= instance.quantity
            elif instance.stock_type == 'both':
                # For 'both', distribute equally or use press_stock as default
                if instance.transaction_type == 'IN':
                    item.press_stock += instance.quantity // 2
                    item.home_stock += instance.quantity - (instance.quantity // 2)
                elif instance.transaction_type == 'OUT':
                    if item.current_stock < instance.quantity:
                        raise ValueError(f"Insufficient total stock. Available: {item.current_stock}")
                    # Deduct from press_stock first, then home_stock
                    remaining = instance.quantity
                    if item.press_stock >= remaining:
                        item.press_stock -= remaining
                        remaining = 0
                    else:
                        remaining -= item.press_stock
                        item.press_stock = 0
                        item.home_stock -= remaining
            
            # Update current_stock (sum of both)
            item.current_stock = item.press_stock + item.home_stock
            item.save(update_fields=['press_stock', 'home_stock', 'current_stock', 'updated_at'])
            
            AuditLog.objects.create(
                user=None,
                action=f'STOCK_{instance.transaction_type.upper()}',
                details={
                    'item_id': item.id,
                    'transaction_id': instance.id,
                    'stock_type': instance.stock_type,
                    'quantity': instance.quantity,
                    'old_press_stock': old_press_stock,
                    'new_press_stock': item.press_stock,
                    'old_home_stock': old_home_stock,
                    'new_home_stock': item.home_stock,
                    'old_total_stock': old_total_stock,
                    'new_total_stock': item.current_stock
                }
            )
            
            if item.is_low_stock:
                create_low_stock_alert(item)


def create_low_stock_alert(item):
    """Create a low stock alert if one doesn't already exist"""
    existing_alert = LowStockAlert.objects.filter(
        item=item,
        is_resolved=False
    ).first()
    
    if not existing_alert:
        LowStockAlert.objects.create(
            item=item,
            current_stock=item.current_stock,
            minimum_stock=item.minimum_stock
        )


@receiver(post_save, sender=Item)
def check_stock_level_on_update(sender, instance, created, **kwargs):
    """Check stock level when item is updated and resolve/create alerts as needed"""
    if not created:
        if instance.is_low_stock:
            create_low_stock_alert(instance)
        else:
            LowStockAlert.objects.filter(
                item=instance,
                is_resolved=False
            ).update(is_resolved=True, resolved_at=timezone.now())