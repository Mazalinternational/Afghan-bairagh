from django.db.models.signals import post_save
from django.dispatch import receiver
from django.utils import timezone
from .models import RozNamcha


from orders.models import Order


@receiver(post_save, sender=Order)
def create_roznamcha_for_order(sender, instance, created, **kwargs):
    """Create Roznamcha entry when an order is created"""
    if created:
        # Safely derive customer name
        customer_name = getattr(getattr(instance, 'customer', None), 'name', None) or 'Customer'

        # Use order estimated total; if zero or negative, skip creating entry
        total_amount = getattr(instance, 'total_estimated_amount', 0) or 0
        if total_amount <= 0:
            return

        # Build a simple description from the first order item, if any
        first_item = instance.order_items.select_related('item').first()
        if first_item:
            item_label = getattr(first_item.item, 'name', '') or 'Item'
            qty = first_item.quantity or 0
            description = f"Order: {item_label} x {qty}"
        else:
            description = "Order created"

        RozNamcha.objects.create(
            item_name=f"Order #{instance.id} - {customer_name}",
            date=instance.order_date or timezone.now().date(),
            description=description,
            transaction_type='credit',
            cost_price=total_amount
        )


@receiver(post_save, sender='purchases.Purchase')
def create_roznamcha_for_purchase(sender, instance, created, **kwargs):
    """Create Roznamcha entry when a purchase is created"""
    if created:
        supplier_name = instance.supplier.name if instance.supplier else 'Supplier'
        RozNamcha.objects.create(
            item_name=f"Purchase #{instance.id} - {supplier_name}",
            date=instance.purchase_date or timezone.now().date(),
            description=f"Purchase: {instance.item_name or 'Item'} x {instance.quantity}",
            transaction_type='debit',
            cost_price=instance.cost or 0
        )


@receiver(post_save, sender='expenses.Expense')
def create_roznamcha_for_expense(sender, instance, created, **kwargs):
    """Create Roznamcha entry when an expense is created"""
    if created:
        # Format category for display (capitalize first letter)
        category_display = instance.category.replace('_', ' ').title() if instance.category else 'Expense'
        RozNamcha.objects.create(
            item_name=f"Expense - {category_display}",
            date=instance.expense_date or timezone.now().date(),
            description=instance.description or f"Expense: {instance.category}",
            transaction_type='debit',
            cost_price=instance.amount or 0
        )


@receiver(post_save, sender='purchases.Payment')
def create_roznamcha_for_supplier_payment(sender, instance, created, **kwargs):
    """Create Roznamcha entry when a supplier payment is made"""
    if created:
        purchase = instance.purchase
        supplier_name = purchase.supplier.name if purchase.supplier else 'Supplier'
        RozNamcha.objects.create(
            item_name=f"Payment to {supplier_name}",
            date=instance.payment_date or timezone.now().date(),
            description=f"Payment for Purchase #{purchase.id} - {instance.payment_method}",
            transaction_type='debit',
            cost_price=instance.amount or 0
        )


@receiver(post_save, sender='orders.Payment')
def create_roznamcha_for_order_payment(sender, instance, created, **kwargs):
    """Create Roznamcha entry when an order payment is received"""
    if created:
        order = instance.order
        customer_name = getattr(getattr(order, 'customer', None), 'name', None) or 'Customer'
        RozNamcha.objects.create(
            item_name=f"Payment from {customer_name}",
            date=instance.payment_date or timezone.now().date(),
            description=f"Payment for Order #{order.id} - {instance.payment_method}",
            transaction_type='credit',
            cost_price=instance.amount_paid or 0
        )


@receiver(post_save, sender='sales.Sale')
def create_roznamcha_for_sale(sender, instance, update_fields, **kwargs):
    """Create Roznamcha entry when a sale is confirmed"""
    # Only create entry when sale status changes to Confirmed
    if instance.status == 'Confirmed' and update_fields and 'status' in update_fields:
        customer_name = instance.customer.name if hasattr(instance.customer, 'name') else 'Customer'
        # Use get_or_create to avoid duplicates
        RozNamcha.objects.get_or_create(
            item_name=f"Sale #{instance.id} - {customer_name}",
            date=instance.sale_date.date() if hasattr(instance.sale_date, 'date') else instance.sale_date,
            defaults={
                'description': f"Sale to {customer_name} - {instance.items.count()} items",
                'transaction_type': 'credit',
                'cost_price': instance.net_amount or 0
            }
        )


@receiver(post_save, sender='sales.SalePayment')
def create_roznamcha_for_sale_payment(sender, instance, created, **kwargs):
    """Create Roznamcha entry when a sale payment is received"""
    if created:
        sale = instance.sale
        customer_name = sale.customer.name if hasattr(sale.customer, 'name') else 'Customer'
        RozNamcha.objects.create(
            item_name=f"Payment from {customer_name}",
            date=instance.payment_date.date() if hasattr(instance.payment_date, 'date') else instance.payment_date,
            description=f"Payment for Sale #{sale.id} - {instance.payment_method}",
            transaction_type='credit',
            cost_price=instance.amount_paid or 0
        )
