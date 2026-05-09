from decimal import Decimal
from django.db import transaction
from django.db.models import Sum, Q
from rest_framework import serializers
from .models import Customer, CustomerBalancePayment


class CustomerSerializer(serializers.ModelSerializer):
    previous_balance_remaining = serializers.SerializerMethodField()
    previous_balance_paid = serializers.SerializerMethodField()
    has_due = serializers.SerializerMethodField()
    total_due = serializers.SerializerMethodField()

    class Meta:
        model = Customer
        fields = [
            'id',
            'name',
            'manual_serial_no',
            'phone',
            'phone_secondary',
            'address',
            'email',
            'notes',
            'previous_balance',
            'previous_balance_reference',
            'previous_balance_paid',
            'previous_balance_remaining',
            'has_due',
            'total_due',
            'registration_date',
        ]
        read_only_fields = ['id', 'registration_date', 'previous_balance_paid', 'previous_balance_remaining', 'has_due', 'total_due']

    def get_previous_balance_paid(self, obj):
        return obj.previous_balance_paid

    def get_previous_balance_remaining(self, obj):
        return obj.previous_balance_remaining

    def _get_order_and_sales_due(self, obj):
        # Import here to avoid circular imports
        from orders.models import Order
        from sales.models import Sale
        from sales.direct_sales_models import DirectSale

        order_due = Order.objects.filter(
            customer=obj,
            status__in=['Pending', 'In_Production', 'Ready'],
            due__gt=0,
        ).aggregate(total=Sum('due'))['total'] or Decimal('0')

        sale_due = Sale.objects.filter(
            customer=obj,
            status='Confirmed',
            payment_status__in=['Unpaid', 'Partial'],
        ).aggregate(total=Sum('due'))['total'] or Decimal('0')

        direct_sale_due = DirectSale.objects.filter(
            customer=obj,
            status='Confirmed',
            payment_status__in=['Unpaid', 'Partial'],
        ).aggregate(total=Sum('due'))['total'] or Decimal('0')

        return order_due + sale_due + direct_sale_due

    def get_total_due(self, obj):
        previous_remaining = obj.previous_balance_remaining
        other_due = self._get_order_and_sales_due(obj)
        return previous_remaining + other_due

    def get_has_due(self, obj):
        if obj.previous_balance_remaining > 0:
            return True
        other_due = self._get_order_and_sales_due(obj)
        return other_due > 0

    def validate_manual_serial_no(self, value):
        if value is None:
            return ''
        return (value or '').strip()

    def validate_phone(self, value):
        if Customer.objects.filter(phone=value).exclude(pk=self.instance.pk if self.instance else None).exists():
            raise serializers.ValidationError("Customer with this phone number already exists.")
        return value

    def validate_previous_balance(self, value):
        if value is not None and value < 0:
            raise serializers.ValidationError('Previous balance cannot be negative.')
        return value

    def _trim_balance_payments_to_max(self, customer, max_total_paid):
        """
        When reducing previous_balance below recorded payments, drop or shrink
        balance payments (newest first) so totals stay consistent.
        """
        max_total_paid = max(max_total_paid or Decimal('0'), Decimal('0'))
        current = customer.previous_balance_paid
        if current <= max_total_paid:
            return
        excess = current - max_total_paid
        payments = list(customer.balance_payments.order_by('-payment_date', '-id'))
        for p in payments:
            if excess <= 0:
                break
            pa = p.amount
            if pa <= excess:
                excess -= pa
                p.delete()
            else:
                p.amount = pa - excess
                p.save(update_fields=['amount'])
                excess = Decimal('0')

    @transaction.atomic
    def update(self, instance, validated_data):
        if 'previous_balance' in validated_data and validated_data['previous_balance'] is not None:
            new_pb = validated_data['previous_balance']
            if new_pb < instance.previous_balance_paid:
                self._trim_balance_payments_to_max(instance, new_pb)
                instance.refresh_from_db()
        return super().update(instance, validated_data)


class CustomerCreateSerializer(serializers.ModelSerializer):
    class Meta:
        model = Customer
        fields = [
            'name',
            'manual_serial_no',
            'phone',
            'phone_secondary',
            'address',
            'email',
            'notes',
            'previous_balance',
            'previous_balance_reference',
        ]

    def validate_manual_serial_no(self, value):
        if value is None:
            return ''
        return (value or '').strip()


class CustomerBalancePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = CustomerBalancePayment
        fields = ['id', 'customer', 'amount', 'payment_date', 'notes']
        read_only_fields = ['id', 'payment_date']

    def validate_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value