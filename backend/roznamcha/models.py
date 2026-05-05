from django.db import models
from django.core.exceptions import ValidationError


class RozNamcha(models.Model):
    """
    Roz Namcha (Daily Record) model for tracking daily entries.
    Fields: item_name, date, description, transaction_type (debit/credit), amount
    """
    TRANSACTION_TYPES = [
        ('debit', 'Debit'),
        ('credit', 'Credit'),
    ]
    
    item_name = models.CharField(max_length=200, db_index=True)
    date = models.DateField(db_index=True)
    description = models.TextField(blank=True)
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, default='debit', db_index=True)
    cost_price = models.DecimalField(max_digits=10, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-date', '-created_at']
        verbose_name = 'Roz Namcha'
        verbose_name_plural = 'Roz Namcha'
        indexes = [
            models.Index(fields=['date', 'item_name']),
            models.Index(fields=['transaction_type', 'date']),
        ]

    def clean(self):
        """Validate model data"""
        if self.cost_price <= 0:
            raise ValidationError({'cost_price': 'Amount must be greater than zero.'})
        if not self.item_name or not self.item_name.strip():
            raise ValidationError({'item_name': 'Item name is required.'})

    def save(self, *args, **kwargs):
        self.full_clean()
        super().save(*args, **kwargs)

    def __str__(self):
        return f"{self.item_name} - {self.transaction_type} - {self.date}"
