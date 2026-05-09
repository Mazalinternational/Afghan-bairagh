from decimal import Decimal
from django.db import models
from django.core.validators import RegexValidator
from django.db.models import Sum


class Customer(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    phone = models.CharField(
        max_length=15,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$')],
        db_index=True
    )
    phone_secondary = models.CharField(
        max_length=15,
        validators=[RegexValidator(r'^\+?1?\d{9,15}$')],
        blank=True,
        default=''
    )
    address = models.TextField()
    email = models.EmailField(blank=True, null=True)
    notes = models.TextField(blank=True)
    previous_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Balance before system implementation",
    )
    previous_balance_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference number for previous balance"
    )
    manual_serial_no = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
        help_text="Manual customer serial / ledger number",
    )
    registration_date = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-registration_date']
        indexes = [
            models.Index(fields=['name', 'phone']),
        ]

    @property
    def previous_balance_paid(self):
        total = self.balance_payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')
        return total

    @property
    def previous_balance_remaining(self):
        remaining = (self.previous_balance or Decimal('0')) - self.previous_balance_paid
        return remaining if remaining > 0 else Decimal('0')

    def __str__(self):
        return f"{self.name} ({self.phone})"


class CustomerBalancePayment(models.Model):
    customer = models.ForeignKey(
        Customer,
        on_delete=models.CASCADE,
        related_name='balance_payments',
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"Previous balance payment {self.amount} for {self.customer.name}"