from django.db.models.signals import post_save
from django.dispatch import receiver
from django.db import transaction
from .models import Purchase, SupplierLedger, Payment
from core.models import AuditLog


@receiver(post_save, sender=Purchase)
def create_supplier_ledger_entry(sender, instance, created, **kwargs):
    if created:
        with transaction.atomic():
            supplier = instance.supplier
            old_balance = supplier.balance
            supplier.balance += instance.cost
            supplier.save()
            
            SupplierLedger.objects.create(
                supplier=supplier,
                transaction_type='purchase',
                amount_due=instance.cost,
                amount_paid=0,
                balance=supplier.balance,
                purchase=instance,
                description=f'Purchase: {instance.item_name}'
            )
            
            AuditLog.objects.create(
                user=None,
                action='PURCHASE_CREATED',
                details={
                    'purchase_id': instance.id,
                    'supplier_id': supplier.id,
                    'cost': float(instance.cost),
                    'old_balance': float(old_balance),
                    'new_balance': float(supplier.balance)
                }
            )


@receiver(post_save, sender=Payment)
def create_payment_ledger_entry(sender, instance, created, **kwargs):
    if created:
        with transaction.atomic():
            supplier = instance.purchase.supplier
            old_balance = supplier.balance
            supplier.balance -= instance.amount
            supplier.save()
            
            last_entry = SupplierLedger.objects.filter(
                supplier=supplier,
                purchase=instance.purchase
            ).order_by('-created_at').first()
            
            amount_due = last_entry.amount_due if last_entry else instance.purchase.cost
            
            SupplierLedger.objects.create(
                supplier=supplier,
                transaction_type='payment',
                amount_due=amount_due,
                amount_paid=instance.amount,
                balance=supplier.balance,
                purchase=instance.purchase,
                description=f'Payment for Purchase #{instance.purchase.id}'
            )
            
            AuditLog.objects.create(
                user=None,
                action='SUPPLIER_PAYMENT',
                details={
                    'payment_id': instance.id,
                    'purchase_id': instance.purchase.id,
                    'supplier_id': supplier.id,
                    'amount': float(instance.amount),
                    'old_balance': float(old_balance),
                    'new_balance': float(supplier.balance)
                }
            )
