from decimal import Decimal
from django.db import models


class BankTransaction(models.Model):
    TYPE_DEPOSIT = 'deposit'
    TYPE_WITHDRAW = 'withdraw'
    TRANSACTION_TYPES = [
        (TYPE_DEPOSIT, 'Deposit'),
        (TYPE_WITHDRAW, 'Withdraw'),
    ]

    SOURCE_MANUAL = 'manual'
    SOURCE_INCOME = 'income'
    SOURCES = [
        (SOURCE_MANUAL, 'Manual'),
        (SOURCE_INCOME, 'Income'),
    ]

    transaction_type = models.CharField(max_length=20, choices=TRANSACTION_TYPES, db_index=True)
    source = models.CharField(max_length=20, choices=SOURCES, default=SOURCE_MANUAL, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    note = models.TextField(blank=True)
    transaction_date = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-transaction_date', '-id']
        db_table = 'bank_transactions'

    def __str__(self):
        return f"{self.transaction_type} - {self.amount}"

    @classmethod
    def current_balance(cls):
        totals = cls.objects.aggregate(
            deposit_total=models.Sum(
                models.Case(
                    models.When(transaction_type=cls.TYPE_DEPOSIT, then='amount'),
                    default=Decimal('0'),
                    output_field=models.DecimalField(max_digits=14, decimal_places=2),
                )
            ),
            withdraw_total=models.Sum(
                models.Case(
                    models.When(transaction_type=cls.TYPE_WITHDRAW, then='amount'),
                    default=Decimal('0'),
                    output_field=models.DecimalField(max_digits=14, decimal_places=2),
                )
            ),
        )
        deposit_total = totals.get('deposit_total') or Decimal('0')
        withdraw_total = totals.get('withdraw_total') or Decimal('0')
        return deposit_total - withdraw_total

