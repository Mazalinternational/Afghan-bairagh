from rest_framework import serializers
from django.core.exceptions import ValidationError as DjangoValidationError
from decimal import Decimal, InvalidOperation, ROUND_HALF_UP
from .models import Supplier, Purchase, SupplierLedger, Payment, SupplierBalancePayment


class SupplierSerializer(serializers.ModelSerializer):
    calculated_balance = serializers.SerializerMethodField()
    total_purchases = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    previous_balance_paid = serializers.SerializerMethodField()
    previous_balance_remaining = serializers.SerializerMethodField()
    previous_balance_reference = serializers.CharField(required=False, allow_blank=True)
    
    class Meta:
        model = Supplier
        fields = '__all__'
        read_only_fields = ['balance', 'created_at']
    
    def get_previous_balance_paid(self, obj):
        return float(obj.previous_balance_paid)
    
    def get_previous_balance_remaining(self, obj):
        return float(obj.previous_balance_remaining)
    
    def get_calculated_balance(self, obj):
        """Calculate balance from purchases and payments for accuracy"""
        from django.db.models import Sum
        total_cost = obj.purchases.aggregate(total=Sum('cost'))['total'] or 0
        total_paid = Payment.objects.filter(purchase__supplier=obj).aggregate(total=Sum('amount'))['total'] or 0
        return float(total_cost - total_paid)
    
    def get_total_purchases(self, obj):
        """Get total purchase amount"""
        from django.db.models import Sum
        return float(obj.purchases.aggregate(total=Sum('cost'))['total'] or 0)
    
    def get_total_paid(self, obj):
        """Get total amount paid"""
        from django.db.models import Sum
        return float(Payment.objects.filter(purchase__supplier=obj).aggregate(total=Sum('amount'))['total'] or 0)


class PaymentSerializer(serializers.ModelSerializer):
    purchase_item_name = serializers.CharField(source='purchase.item_name', read_only=True)
    supplier_name = serializers.CharField(source='purchase.supplier.name', read_only=True)
    remaining_after_payment = serializers.SerializerMethodField()
    
    class Meta:
        model = Payment
        fields = '__all__'
        read_only_fields = ['payment_date']
    
    def get_remaining_after_payment(self, obj):
        return obj.purchase.remaining_amount
    
    def validate_amount(self, value):
        """Enhanced validation to prevent overpayments"""
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        
        if self.instance is None:  # Creating new payment
            purchase_id = self.initial_data.get('purchase')
            if purchase_id:
                try:
                    purchase = Purchase.objects.get(id=purchase_id)
                    if value > purchase.remaining_amount:
                        raise serializers.ValidationError(
                            f"Payment amount ({value}) cannot exceed remaining balance ({purchase.remaining_amount})."
                        )
                except Purchase.DoesNotExist:
                    raise serializers.ValidationError("Invalid purchase ID.")
        
        return value


class PurchaseSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    item_name_display = serializers.CharField(source='item.name', read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    payments = PaymentSerializer(many=True, read_only=True)
    payment_count = serializers.SerializerMethodField()
    
    class Meta:
        model = Purchase
        fields = '__all__'
        read_only_fields = ['purchase_date', 'updated_at', 'total_paid', 'remaining_amount']
    
    def get_payment_count(self, obj):
        return obj.payments.count()
    
    def validate(self, data):
        """Enhanced validation for purchase data"""
        purchase_items = data.get('purchase_items')
        if purchase_items is None and self.instance is not None:
            purchase_items = self.instance.purchase_items

        if purchase_items:
            if not isinstance(purchase_items, list):
                raise serializers.ValidationError({'purchase_items': 'Purchase items must be a list.'})

            normalized_items = []
            total_cost = Decimal('0')
            total_quantity = Decimal('0')

            for idx, line in enumerate(purchase_items):
                if not isinstance(line, dict):
                    raise serializers.ValidationError({'purchase_items': f'Line {idx + 1} is invalid.'})

                item_name = str(line.get('item_name', '')).strip()
                if not item_name:
                    raise serializers.ValidationError({'purchase_items': f'Line {idx + 1}: item name is required.'})

                try:
                    qty = Decimal(str(line.get('quantity', '0')))
                    unit_cost = Decimal(str(line.get('unit_cost', '0')))
                except (InvalidOperation, TypeError, ValueError):
                    raise serializers.ValidationError({'purchase_items': f'Line {idx + 1}: quantity and unit cost must be valid numbers.'})

                if qty <= 0 or unit_cost < 0:
                    raise serializers.ValidationError({'purchase_items': f'Line {idx + 1}: quantity must be > 0 and unit cost must be >= 0.'})

                line_total = (qty * unit_cost).quantize(Decimal('0.01'))
                total_cost += line_total
                total_quantity += qty

                flag_size = str(line.get('flag_size', '')).strip()
                job_qty = line.get('job_qty')
                total_meters = line.get('total_meters')
                per_meter_price = line.get('per_meter_price')

                normalized_items.append({
                    'item': line.get('item') or None,
                    'item_name': item_name,
                    'quantity': str(qty),
                    'unit_cost': str(unit_cost),
                    'line_total': str(line_total),
                    'flag_size': flag_size,
                    'job_qty': str(job_qty) if job_qty not in (None, '') else '',
                    'total_meters': str(total_meters) if total_meters not in (None, '') else '',
                    'per_meter_price': str(per_meter_price) if per_meter_price not in (None, '') else '',
                    'collapsed': bool(line.get('collapsed', False)),
                })

            data['purchase_items'] = normalized_items
            data['cost'] = total_cost
            # Keep integer quantity for legacy stock logic and existing UI columns
            data['quantity'] = max(1, int(total_quantity.to_integral_value(rounding=ROUND_HALF_UP)))
            if not data.get('item_name'):
                data['item_name'] = normalized_items[0]['item_name'] if len(normalized_items) == 1 else f"Multiple items ({len(normalized_items)})"
        else:
            if data.get('quantity', 0) <= 0:
                raise serializers.ValidationError({'quantity': 'Quantity must be greater than zero.'})
            if data.get('cost', 0) <= 0:
                raise serializers.ValidationError({'cost': 'Cost must be greater than zero.'})
        
        # Validate description for personal purchases
        if not data.get('is_for_press', True) and not data.get('description'):
            raise serializers.ValidationError({
                'description': 'Description is required for personal purchases.'
            })
        
        # Validate stock_distributions sum equals quantity when provided
        stock_distributions = data.get('stock_distributions')
        if stock_distributions is not None and isinstance(stock_distributions, list) and len(stock_distributions) > 0:
            quantity = data.get('quantity') or (self.instance.quantity if self.instance else 0)
            total = 0
            for d in stock_distributions:
                if isinstance(d, dict) and d.get('stock_type') in ('press_stock', 'home_stock'):
                    total += int(d.get('quantity', 0) or 0)
            if total != quantity:
                raise serializers.ValidationError({
                    'stock_distributions': f'Press + Home stock must equal total quantity ({quantity}). Got {total}.'
                })
        
        return data


class SupplierLedgerSerializer(serializers.ModelSerializer):
    supplier_name = serializers.CharField(source='supplier.name', read_only=True)
    
    class Meta:
        model = SupplierLedger
        fields = ['id', 'supplier', 'supplier_name', 'transaction_type', 'amount_due', 'amount_paid', 'balance', 'purchase', 'description', 'created_at']
        read_only_fields = ['balance', 'created_at']


class SupplierBalancePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SupplierBalancePayment
        fields = ['id', 'supplier', 'amount', 'payment_date', 'notes']
        read_only_fields = ['payment_date']
