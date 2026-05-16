from rest_framework import serializers
from .models import Order, OrderItem, Payment
from customers.models import Customer
from inventory.models import Item


class OrderItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()
    remaining_quantity = serializers.SerializerMethodField()
    effective_purchase_unit_cost = serializers.SerializerMethodField()

    class Meta:
        model = OrderItem
        fields = [
            'id', 'item', 'item_name', 'quantity', 'price_estimate', 'purchase_unit_cost',
            'effective_purchase_unit_cost',
            'stock_type', 'flag_size', 'quality_design_type', 'manual_item_name', 'total',
            'delivered_quantity', 'remaining_quantity'
        ]
        read_only_fields = ['id', 'total', 'delivered_quantity', 'remaining_quantity', 'effective_purchase_unit_cost']

    def get_effective_purchase_unit_cost(self, obj):
        """Snapshot cost on the line, or current inventory cost when snapshot was never saved."""
        if obj.purchase_unit_cost is not None:
            return obj.purchase_unit_cost
        item = getattr(obj, 'item', None)
        if item is not None:
            cp = getattr(item, 'cost_price', None)
            if cp is not None:
                return cp
        return None

    def get_item_name(self, obj):
        if obj.manual_item_name:
            return obj.manual_item_name
        return obj.item.name if obj.item else 'Unknown'

    def get_remaining_quantity(self, obj):
        delivered = getattr(obj, 'delivered_quantity', 0) or 0
        return max(0, obj.quantity - delivered)


class PaymentSerializer(serializers.ModelSerializer):
    order_id = serializers.IntegerField(source='order.id', read_only=True)
    customer_name = serializers.CharField(source='order.customer.name', read_only=True)
    
    class Meta:
        model = Payment
        fields = ['id', 'order', 'order_id', 'customer_name', 'amount_paid', 'payment_date', 'payment_method', 'notes']
        read_only_fields = ['payment_date']

    def validate_amount_paid(self, value):
        if value <= 0:
            raise serializers.ValidationError("Payment amount must be greater than zero.")
        return value


class OrderSerializer(serializers.ModelSerializer):
    order_items = OrderItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    customer_phone = serializers.CharField(source='customer.phone', read_only=True)
    item_count = serializers.SerializerMethodField()

    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone',
            'order_date', 'status', 'total_estimated_amount', 'notes', 'manual_serial_no',
            'order_items', 'item_count', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'order_date', 'total_estimated_amount', 'created_at', 'updated_at']

    def get_item_count(self, obj):
        return obj.order_items.count()

    def create(self, validated_data):
        items_data = validated_data.pop('order_items', [])
        order = Order.objects.create(**validated_data)
        
        # Create order items
        for item_data in items_data:
            OrderItem.objects.create(order=order, **item_data)
        
        return order

    def update(self, instance, validated_data):
        items_data = validated_data.pop('order_items', None)
        
        # Update order fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.order_items.all().delete()
            # Create new items
            for item_data in items_data:
                OrderItem.objects.create(order=instance, **item_data)
        
        return instance


class OrderListSerializer(serializers.ModelSerializer):
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    item_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()
    due_amount = serializers.SerializerMethodField()
    # Summary for list: first item flag_size and total qty (or "Multiple" / sum)
    flag_size = serializers.SerializerMethodField()
    quantity = serializers.SerializerMethodField()
    total_amount = serializers.DecimalField(source='total_estimated_amount', max_digits=12, decimal_places=2, read_only=True)
    delivered_quantity = serializers.SerializerMethodField()
    remaining_quantity = serializers.SerializerMethodField()
    order_items = OrderItemSerializer(many=True, read_only=True)

    class Meta:
        model = Order
        fields = [
            'id', 'customer', 'customer_name', 'order_date', 'status',
            'total_estimated_amount', 'total_amount', 'total_paid', 'due_amount',
            'item_count', 'flag_size', 'quantity',
            'delivered_quantity', 'remaining_quantity', 'order_items', 'manual_serial_no'
        ]

    def get_item_count(self, obj):
        return obj.order_items.count()

    def get_total_paid(self, obj):
        from django.db.models import Sum
        s = obj.payments.aggregate(s=Sum('amount_paid'))['s'] or 0
        return s

    def get_due_amount(self, obj):
        total_paid = self.get_total_paid(obj)
        return max(0, float(obj.total_estimated_amount) - float(total_paid))

    def get_flag_size(self, obj):
        items = list(obj.order_items.all()[:2])
        if not items:
            return None
        if len(items) == 1:
            return items[0].flag_size or '—'
        return 'Multiple'

    def get_quantity(self, obj):
        from django.db.models import Sum
        q = obj.order_items.aggregate(s=Sum('quantity'))['s'] or 0
        return q

    def get_delivered_quantity(self, obj):
        from django.db.models import Sum
        delivered = obj.order_items.aggregate(s=Sum('delivered_quantity'))['s'] or 0
        return delivered

    def get_remaining_quantity(self, obj):
        return max(0, self.get_quantity(obj) - self.get_delivered_quantity(obj))