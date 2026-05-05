from django.db import models
from django.core.exceptions import ValidationError


class Expense(models.Model):
    """
    Expense model for tracking business expenses.
    Note: Expenses are independent of inventory and do not affect stock levels.
    """
    CATEGORY_CHOICES = [
        ('office', 'Office Supplies'),
        ('utilities', 'Utilities'),
        ('transport', 'Transportation'),
        ('marketing', 'Marketing'),
        ('maintenance', 'Maintenance'),
        ('other', 'Other'),
    ]
    
    description = models.CharField(max_length=255)
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    expense_date = models.DateField(db_index=True)
    category = models.CharField(max_length=100, db_index=True)  # Removed choices to allow custom categories
    is_for_press = models.BooleanField(default=True, help_text="True if expense is for press, False if for home")
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-expense_date']

    def clean(self):
        if self.amount <= 0:
            raise ValidationError({'amount': 'Amount must be greater than zero.'})
        # Ensure this expense doesn't reference any inventory items
        # This is a business rule to keep expenses separate from inventory

    def __str__(self):
        return f"{self.description} - {self.amount}"