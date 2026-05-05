from decimal import Decimal
from django.db.models import Sum
from rest_framework import serializers

from sales.models import Sale
from sales.direct_sales_models import DirectSale
from .models import BankTransaction


class BankTransactionSerializer(serializers.ModelSerializer):
    class Meta:
        model = BankTransaction
        fields = ['id', 'transaction_type', 'source', 'amount', 'note', 'transaction_date']
        read_only_fields = ['id', 'transaction_date']

    def validate_amount(self, value):
        if value is None or value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate(self, attrs):
        tx_type = attrs.get('transaction_type', getattr(self.instance, 'transaction_type', None))
        amount = attrs.get('amount', getattr(self.instance, 'amount', Decimal('0'))) or Decimal('0')

        # Ensure the resulting bank balance never becomes negative
        current_balance = BankTransaction.current_balance()
        old_effect = Decimal('0')
        if self.instance is not None:
            old_effect = self.instance.amount if self.instance.transaction_type == BankTransaction.TYPE_DEPOSIT else -self.instance.amount
        new_effect = amount if tx_type == BankTransaction.TYPE_DEPOSIT else -amount
        resulting_balance = current_balance - old_effect + new_effect
        if resulting_balance < 0:
            raise serializers.ValidationError({'amount': f'Insufficient bank balance. Available: {current_balance}'})
        return attrs


def income_total_confirmed():
    sale_income = Sale.objects.filter(status='Confirmed').aggregate(total=Sum('net_amount'))['total'] or Decimal('0')
    direct_income = DirectSale.objects.filter(status='Confirmed').aggregate(total=Sum('net_amount'))['total'] or Decimal('0')
    return sale_income + direct_income

