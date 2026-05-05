from decimal import Decimal
from django.db import models
from django.core.exceptions import ValidationError
from django.utils import timezone
from django.db.models import Sum
from customers.models import Customer


class DirectSale(models.Model):
    """
    Direct Sale Model - For items bought from external sources and sold directly
    No stock management involved
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

    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='direct_sales', null=True, blank=True)
    customer_name = models.CharField(max_length=255, default='', help_text="Customer name if not in system")
    sale_date = models.DateTimeField(null=True, blank=True, default=timezone.now, db_index=True)
    show_date_on_bill = models.BooleanField(default=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    discount = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    cost_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Total cost of items purchased")
    profit = models.DecimalField(max_digits=12, decimal_places=2, default=0, help_text="Net profit (net_amount - cost_amount)")
    due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Draft', db_index=True)
    payment_status = models.CharField(max_length=20, choices=PAYMENT_STATUS_CHOICES, default='Unpaid', db_index=True)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-sale_date']
        db_table = 'direct_sales'

    def calculate_totals(self):
        """Calculate totals from items"""
        items_total = self.items.aggregate(total=Sum('total'))['total'] or 0
        items_cost = self.items.aggregate(total=Sum('cost_total'))['total'] or 0
        self.total_amount = items_total
        self.cost_amount = items_cost
        self.net_amount = self.total_amount - self.discount
        self.profit = self.net_amount - self.cost_amount

    @property
    def total_paid(self):
        return self.payments.aggregate(total=Sum('amount_paid'))['total'] or 0

    def update_due(self):
        if self.status == 'Cancelled':
            new_due = Decimal('0')
        else:
            paid = self.total_paid
            new_due = max(Decimal('0'), self.net_amount - paid)
        if self.due != new_due:
            self.due = new_due
            DirectSale.objects.filter(pk=self.pk).update(due=new_due)

    def update_payment_status(self):
        self.update_due()
        total_paid = self.total_paid
        
        if total_paid == 0:
            self.payment_status = 'Unpaid'
        elif total_paid >= self.net_amount:
            self.payment_status = 'Paid'
        else:
            self.payment_status = 'Partial'
        
        self.save(update_fields=['payment_status'])

    def __str__(self):
        return f"Direct Sale #{self.id} - {self.customer_name} - {self.status}"


class DirectSaleItem(models.Model):
    """Items in a direct sale"""
    direct_sale = models.ForeignKey(DirectSale, on_delete=models.CASCADE, related_name='items')
    item_name = models.CharField(max_length=255, help_text="Item description")
    quantity = models.PositiveIntegerField()
    price_per_unit = models.DecimalField(max_digits=10, decimal_places=2, help_text="Selling price per unit")
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2, help_text="Purchase cost per unit")
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    cost_total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)
    supplier_name = models.CharField(max_length=255, blank=True, help_text="Where item was purchased from")
    flag_size = models.CharField(max_length=100, blank=True, default='')
    quality_design_type = models.CharField(max_length=255, blank=True, default='')

    class Meta:
        db_table = 'direct_sale_items'

    def clean(self):
        if self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero'})
        if self.price_per_unit <= 0:
            raise ValidationError({'price_per_unit': 'Price must be greater than zero'})
        if self.cost_per_unit < 0:
            raise ValidationError({'cost_per_unit': 'Cost cannot be negative'})

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.price_per_unit
        self.cost_total = self.quantity * self.cost_per_unit
        super().save(*args, **kwargs)
        
        if self.direct_sale_id:
            self.direct_sale.calculate_totals()
            self.direct_sale.save(update_fields=['total_amount', 'cost_amount', 'net_amount', 'profit'])

    def __str__(self):
        return f"{self.item_name} x{self.quantity} - Direct Sale #{self.direct_sale.id}"


class DirectSalePayment(models.Model):
    """Payment records for direct sales"""
    PAYMENT_METHODS = [
        ('cash', 'Cash'),
        ('credit', 'Credit'),
        ('partial', 'Partial'),
    ]

    direct_sale = models.ForeignKey(DirectSale, on_delete=models.CASCADE, related_name='payments')
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=20, choices=PAYMENT_METHODS, default='cash')
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']
        db_table = 'direct_sale_payments'

    def clean(self):
        if self.amount_paid <= 0:
            raise ValidationError({'amount_paid': 'Payment amount must be greater than zero'})

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.direct_sale.update_payment_status()

    def delete(self, *args, **kwargs):
        direct_sale = self.direct_sale
        super().delete(*args, **kwargs)
        direct_sale.update_payment_status()

    def __str__(self):
        return f"Payment #{self.id} - Direct Sale #{self.direct_sale.id} - {self.amount_paid}"
