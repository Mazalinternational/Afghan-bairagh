from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.db.models import Sum
from customers.models import Customer
from inventory.models import Item, StockTransaction

# Import quotation models
from .quotation_models import Quotation, QuotationItem


class Order(models.Model):
    """
    Customer Order/Request
    Stock is deducted ONLY when order status changes to 'Delivered'
    Payment and order creation do NOT affect inventory
    """
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('In_Production', 'In Production'),
        ('Ready', 'Ready'),
        ('Partially_Delivered', 'Partially Delivered'),
        ('Delivered', 'Delivered'),
        ('Cancelled', 'Cancelled'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='orders')
    order_date = models.DateTimeField(auto_now_add=True, db_index=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    total_estimated_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Estimated total for the order")
    due = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Outstanding amount (total - payments)")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-order_date']
        indexes = [
            models.Index(fields=['status', 'order_date']),
            models.Index(fields=['customer', 'status']),
        ]
        db_table = 'orders'

    def calculate_totals(self):
        """Calculate total from order items"""
        items_total = self.order_items.aggregate(total=Sum('total'))['total'] or 0
        self.total_estimated_amount = items_total

    @property
    def total_paid(self):
        """Total amount paid for this order"""
        return self.payments.aggregate(total=Sum('amount_paid'))['total'] or Decimal('0')

    def update_due(self):
        """Set due = total_estimated_amount - sum(payments). Call after save or when payments change."""
        if self.status in ('Delivered', 'Cancelled'):
            new_due = Decimal('0')
        else:
            paid = self.payments.aggregate(s=Sum('amount_paid'))['s'] or Decimal('0')
            new_due = max(Decimal('0'), self.total_estimated_amount - paid)
        if self.due != new_due:
            self.due = new_due
            Order.objects.filter(pk=self.pk).update(due=new_due)

    def save(self, *args, **kwargs):
        # Track status change for stock deduction
        old_status = None
        if self.pk:
            old_status = Order.objects.filter(pk=self.pk).values_list('status', flat=True).first()
        
        super().save(*args, **kwargs)
        self.update_due()
        
        # Deduct stock when status changes to Delivered
        if old_status and old_status != 'Delivered' and self.status == 'Delivered':
            from .services import OrderInventoryService
            OrderInventoryService.process_order_delivery(self)

    def can_cancel(self):
        """Check if order can be cancelled (any status except Cancelled)"""
        return self.status != 'Cancelled'

    def cancel_order(self):
        """Cancel order and return stock if it was delivered"""
        if self.status == 'Cancelled':
            raise ValidationError('Order is already cancelled')
        
        # If order was delivered, return stock
        if self.status == 'Delivered':
            from .services import OrderInventoryService
            with transaction.atomic():
                OrderInventoryService.reverse_order_delivery(self)
                self.status = 'Cancelled'
                Order.objects.filter(pk=self.pk).update(status='Cancelled')
        else:
            # Not delivered yet, just cancel
            self.status = 'Cancelled'
            self.save(update_fields=['status'])

    def __str__(self):
        return f"Order #{self.id} - {self.customer.name} - {self.status}"


class OrderItem(models.Model):
    """
    Items in an order - represents customer requests
    """
    STOCK_TYPE_CHOICES = [
        ('press_stock', 'Press Stock'),
        ('home_stock', 'Home Stock'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='order_items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='order_items', null=True, blank=True)
    quantity = models.PositiveIntegerField()
    price_estimate = models.DecimalField(max_digits=10, decimal_places=2, help_text="Estimated price per unit")
    stock_type = models.CharField(max_length=20, choices=STOCK_TYPE_CHOICES, default='press_stock')
    flag_size = models.CharField(max_length=50, blank=True)
    quality_design_type = models.CharField(max_length=100, blank=True)
    manual_item_name = models.CharField(max_length=200, blank=True, help_text="Item name for manual entries")
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    delivered_quantity = models.PositiveIntegerField(default=0, help_text="Quantity already delivered to customer")

    class Meta:
        db_table = 'order_items'

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero'})
        if self.price_estimate <= 0:
            raise ValidationError({'price_estimate': 'Price must be greater than zero'})
        if self.delivered_quantity < 0 or self.delivered_quantity > self.quantity:
            raise ValidationError({'delivered_quantity': 'Delivered quantity must be between 0 and total quantity'})

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.price_estimate
        super().save(*args, **kwargs)
        
        # Update order totals
        if self.order_id:
            self.order.calculate_totals()
            self.order.save(update_fields=['total_estimated_amount'])

    def __str__(self):
        item_name = self.manual_item_name if self.manual_item_name else (self.item.name if self.item else 'Unknown')
        return f"{item_name} x{self.quantity} - Order #{self.order.id}"


class Payment(models.Model):
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('credit', 'Credit'),
        ('partial', 'Partial'),
    ]

    order = models.ForeignKey(Order, on_delete=models.CASCADE, related_name='payments')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']

    def clean(self):
        if self.amount_paid <= 0:
            raise ValidationError({'amount_paid': 'Payment amount must be greater than zero.'})

    def __str__(self):
        return f"Payment #{self.id} - Order #{self.order.id} - {self.amount_paid}"
