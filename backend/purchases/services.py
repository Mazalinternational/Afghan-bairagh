from django.db import transaction
from .models import Purchase, Payment, Supplier
from core.models import AuditLog


class PurchaseService:
    @staticmethod
    @transaction.atomic
    def create_purchase(supplier, item_name, quantity, cost, payment_status='due', user=None):
        purchase = Purchase.objects.create(
            supplier=supplier,
            item_name=item_name,
            quantity=quantity,
            cost=cost,
            payment_status=payment_status
        )
        
        if user:
            AuditLog.objects.create(
                user=user,
                action='CREATE_PURCHASE',
                details={
                    'purchase_id': purchase.id,
                    'supplier_id': supplier.id,
                    'cost': float(cost),
                    'supplier_balance': float(supplier.balance)
                }
            )
        
        return purchase
    
    @staticmethod
    @transaction.atomic
    def add_payment(purchase_id, amount, payment_method='cash', notes='', user=None):
        purchase = Purchase.objects.select_for_update().get(id=purchase_id)
        old_status = purchase.payment_status
        
        payment = Payment.objects.create(
            purchase=purchase,
            amount=amount,
            payment_method=payment_method,
            notes=notes
        )
        
        purchase.refresh_from_db()
        
        if user:
            AuditLog.objects.create(
                user=user,
                action='PURCHASE_PAYMENT',
                details={
                    'purchase_id': purchase_id,
                    'payment_id': payment.id,
                    'amount': float(amount),
                    'old_status': old_status,
                    'new_status': purchase.payment_status,
                    'supplier_balance': float(purchase.supplier.balance)
                }
            )
        
        return payment
