from decimal import Decimal
from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum, F
from customers.models import Customer
from inventory.models import Item, StockTransaction
from orders.models import Order
from .direct_sales_models import DirectSale, DirectSaleItem, DirectSalePayment


class Sale(models.Model):
    """
    Invoice/Sale Model - Represents actual sales transactions
    Stock is deducted when Sale is confirmed
    """
    STATUS_CHOICES = [
        ('Draft', 'Draft'),
        ('Confirmed', 'Confirmed'),
        ('Cancelled', 'Cancelled'),
    ]
    
    PAYMENT_STATUS_CHOICES = [
        ('Unpaid', 'Unpaid'),
        ('Partial', 'Partial'),
        ('Paid', 'Paid'),
    ]

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='sales')
    reference_order = models.ForeignKey(Order, on_delete=models.SET_NULL, null=True, blank=True, related_name='sales', help_text="Original order if this sale is from an order")
    sale_date = models.DateTimeField(null=True, blank=True, default=timezone.now, db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    tax = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total after discount and tax")
    due = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Outstanding amount (net_amount - payments)")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft', db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Unpaid', db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = [F('sale_date').desc(nulls_last=True), '-id']
        indexes = [
            models.Index(fields=['status', 'sale_date']),
            models.Index(fields=['customer', 'status']),
            models.Index(fields=['payment_status', 'sale_date']),
        ]
        db_table = 'sales'

    def calculate_totals(self):
        """Calculate total from sale items"""
        items_total = self.items.aggregate(total=Sum('total'))['total'] or 0
        self.total_amount = items_total
        self.net_amount = self.total_amount - self.discount + self.tax

    @property
    def total_paid(self):
        """Total amount paid for this sale"""
        return self.payments.aggregate(total=Sum('amount_paid'))['total'] or 0

    @property
    def balance_due(self):
        """Remaining balance to be paid (property for backward compatibility)"""
        return self.due

    def update_due(self):
        """Set due = net_amount - sum(payments). Call after save or when payments change."""
        if self.status == 'Cancelled':
            new_due = Decimal('0')
        else:
            paid = self.total_paid
            new_due = max(Decimal('0'), self.net_amount - paid)
        if self.due != new_due:
            self.due = new_due
            Sale.objects.filter(pk=self.pk).update(due=new_due)

    def update_payment_status(self):
        """Update payment status based on payments"""
        self.update_due()  # First update due
        total_paid = self.total_paid
        
        if total_paid == 0:
            self.payment_status = 'Unpaid'
        elif total_paid >= self.net_amount:
            self.payment_status = 'Paid'
        else:
            self.payment_status = 'Partial'
        
        self.save(update_fields=['payment_status'])

    def confirm_sale(self):
        """
        Confirm sale and deduct stock
        This is the ONLY place where stock is deducted for sales
        """
        if self.status == 'Confirmed':
            raise ValidationError('Sale is already confirmed')
        
        if self.status == 'Cancelled':
            raise ValidationError('Cannot confirm a cancelled sale')
        
        # Import service to avoid circular imports
        from .services import InventoryService
        
        with transaction.atomic():
            # Deduct stock for all items
            InventoryService.process_sale_stock(self)
            
            # Update status
            self.status = 'Confirmed'
            self.save(update_fields=['status'])
            
            # Set due = net_amount so Add Payment shows correct balance
            self.update_due()
            
            # Mark reference order as Delivered if exists
            if self.reference_order:
                self.reference_order.status = 'Delivered'
                self.reference_order.save(update_fields=['status'])

    def cancel_sale(self):
        """Cancel sale and return stock"""
        if self.status == 'Cancelled':
            raise ValidationError('Sale is already cancelled')
        
        if self.status != 'Confirmed':
            # If not confirmed, just update status
            self.status = 'Cancelled'
            self.save(update_fields=['status'])
            return
        
        # Import service to avoid circular imports
        from .services import InventoryService
        
        with transaction.atomic():
            # Return stock for all items
            InventoryService.reverse_sale_stock(self)
            
            # Update status
            self.status = 'Cancelled'
            self.save(update_fields=['status'])

    def __str__(self):
        return f"Sale #{self.id} - {self.customer.name} - {self.status}"


class SaleItem(models.Model):
    """
    Individual items in a sale
    """
    STOCK_TYPE_CHOICES = [
        ('press_stock', 'Press Stock'),
        ('home_stock', 'Home Stock'),
    ]

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='sale_items')
    quantity = models.PositiveIntegerField()
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2)
    stock_type = models.CharField(max_length=20, choices=STOCK_TYPE_CHOICES, default='press_stock')
    flag_size = models.CharField(max_length=50, blank=True)
    flag_stand_size = models.CharField(max_length=50, blank=True)
    quality_design_type = models.CharField(max_length=100, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    class Meta:
        db_table = 'sale_items'

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero'})
        if self.price_per_unit <= 0:
            raise ValidationError({'price_per_unit': 'Price must be greater than zero'})

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.price_per_unit
        super().save(*args, **kwargs)
        
        # Update sale totals
        if self.sale_id:
            self.sale.calculate_totals()
            self.sale.save(update_fields=['total_amount', 'net_amount'])

    def __str__(self):
        return f"{self.item.name} x{self.quantity} - Sale #{self.sale.id}"


class SalePayment(models.Model):
    """
    Payment records for sales
    Separated from order/sale status
    """
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('credit', 'Credit'),
        ('partial', 'Partial'),
    ]

    sale = models.ForeignKey(Sale, on_delete=models.CASCADE, related_name='payments')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']
        db_table = 'sale_payments'

    def clean(self):
        if self.amount_paid <= 0:
            raise ValidationError({'amount_paid': 'Payment amount must be greater than zero'})

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        # Update sale payment status
        self.sale.update_payment_status()

    def __str__(self):
        return f"Payment #{self.id} - Sale #{self.sale.id} - {self.amount_paid}"
