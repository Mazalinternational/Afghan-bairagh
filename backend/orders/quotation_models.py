from decimal import Decimal
from django.db import models
from django.utils import timezone
from customers.models import Customer
from inventory.models import Item


class Quotation(models.Model):
    """
    Price Quotation - separate from orders
    """
    customer = models.ForeignKey(Customer, on_delete=models.PROTECT, related_name='quotations')
    quotation_date = models.DateTimeField(default=timezone.now, db_index=True)
    total_amount = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-quotation_date']
        db_table = 'quotations'

    def calculate_total(self):
        """Calculate total from quotation items"""
        items_total = self.quotation_items.aggregate(total=models.Sum('total'))['total'] or 0
        self.total_amount = items_total

    def __str__(self):
        return f"Quotation #{self.id} - {self.customer.name}"


class QuotationItem(models.Model):
    """
    Items in a quotation
    """
    quotation = models.ForeignKey(Quotation, on_delete=models.CASCADE, related_name='quotation_items')
    item = models.ForeignKey(Item, on_delete=models.PROTECT, related_name='quotation_items', null=True, blank=True)
    quantity = models.PositiveIntegerField()
    price_estimate = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        help_text='Quoted sale price per unit (customer-facing)',
    )
    purchase_unit_cost = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        default=0,
        help_text='Internal purchase/cost per unit',
    )
    flag_size = models.CharField(max_length=50, blank=True)
    quality_design_type = models.CharField(max_length=200, blank=True)
    manual_item_name = models.CharField(max_length=200, blank=True)
    total = models.DecimalField(max_digits=12, decimal_places=2, editable=False)

    class Meta:
        db_table = 'quotation_items'

    def save(self, *args, **kwargs):
        self.total = self.quantity * self.price_estimate
        super().save(*args, **kwargs)
        
        if self.quotation_id:
            self.quotation.calculate_total()
            self.quotation.save(update_fields=['total_amount'])

    def __str__(self):
        item_name = self.manual_item_name if self.manual_item_name else (self.item.name if self.item else 'Unknown')
        return f"{item_name} x{self.quantity} - Quotation #{self.quotation.id}"
