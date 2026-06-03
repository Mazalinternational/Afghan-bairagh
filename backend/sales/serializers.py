from rest_framework import serializers
from .models import Sale, SaleItem, SalePayment
from .direct_sales_models import DirectSale, DirectSaleItem, DirectSalePayment
from customers.models import Customer
from customers.serializers import CustomerSerializer
from inventory.serializers import ItemSerializer


class SaleItemSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    
    class Meta:
        model = SaleItem
        fields = [
            'id', 'item', 'item_name', 'quantity', 'price_per_unit', 
            'stock_type', 'flag_size', 'flag_stand_size', 'quality_design_type', 'total'
        ]
        read_only_fields = ['id', 'total']


class SalePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = SalePayment
        fields = ['id', 'sale', 'amount_paid', 'payment_method', 'payment_date', 'notes']
        read_only_fields = ['id', 'payment_date']
        extra_kwargs = {
            # Nested POST .../sales/:id/add_payment/ passes sale via save(sale=...)
            'sale': {'required': False},
        }


class SaleSerializer(serializers.ModelSerializer):
    items = SaleItemSerializer(many=True, required=False)
    payments = SalePaymentSerializer(many=True, read_only=True)
    customer = serializers.PrimaryKeyRelatedField(queryset=Customer.objects.all(), required=False, allow_null=True)
    customer_name = serializers.CharField(required=False, allow_blank=True)
    customer_phone = serializers.CharField(required=False, allow_blank=True, read_only=True)
    customer_address = serializers.CharField(required=False, allow_blank=True, read_only=True)
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    balance_due = serializers.DecimalField(max_digits=12, decimal_places=2, read_only=True)
    
    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'customer_address',
            'reference_order', 'sale_date', 'total_amount', 'discount', 'tax', 
            'net_amount', 'status', 'payment_status', 'notes', 'items', 'payments', 
            'total_paid', 'balance_due', 'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_amount', 'net_amount', 'payment_status', 'created_at', 'updated_at']
    
    def create(self, validated_data):
        from customers.models import Customer
        
        items_data = validated_data.pop('items', [])
        customer_name = validated_data.pop('customer_name', None)
        
        # If customer is not provided but customer_name is, create or get customer
        if not validated_data.get('customer') and customer_name:
            customer, created = Customer.objects.get_or_create(
                name=customer_name,
                defaults={'phone': 'N/A', 'address': 'N/A'}
            )
            validated_data['customer'] = customer
        
        sale = Sale.objects.create(**validated_data)
        
        # Create sale items
        for item_data in items_data:
            SaleItem.objects.create(sale=sale, **item_data)
        
        return sale
    
    def to_representation(self, instance):
        """Override to show customer name properly"""
        representation = super().to_representation(instance)
        if instance.customer:
            representation['customer_name'] = instance.customer.name
            representation['customer_phone'] = instance.customer.phone
            representation['customer_address'] = instance.customer.address
        return representation
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)
        
        # If sale is being edited and was Confirmed, revert stock and set to Draft
        if instance.status == 'Confirmed' and validated_data.get('status') == 'Draft':
            # Revert stock for confirmed sale
            from .services import InventoryService
            try:
                InventoryService.reverse_sale_stock(instance)
            except Exception as e:
                from rest_framework.exceptions import ValidationError
                raise ValidationError(f'Failed to revert stock: {str(e)}')
        
        # Update sale fields
        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()
        
        # Update items if provided
        if items_data is not None:
            # Delete existing items
            instance.items.all().delete()
            # Create new items
            for item_data in items_data:
                SaleItem.objects.create(sale=instance, **item_data)
        
        return instance


class SaleListSerializer(serializers.ModelSerializer):
    """Simplified serializer for listing sales"""
    customer_name = serializers.CharField(source='customer.name', read_only=True)
    item_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()

    class Meta:
        model = Sale
        fields = [
            'id', 'customer', 'customer_name', 'sale_date', 'total_amount',
            'net_amount', 'due', 'status', 'payment_status', 'item_count',
            'total_paid', 'created_at',
        ]

    def get_item_count(self, obj):
        return obj.items.count()

    def get_total_paid(self, obj):
        return float(obj.total_paid or 0)


class DirectSaleItemSerializer(serializers.ModelSerializer):
    class Meta:
        model = DirectSaleItem
        fields = [
            'id',
            'item_name',
            'quantity',
            'price_per_unit',
            'cost_per_unit',
            'total',
            'cost_total',
            'supplier_name',
            'flag_size',
            'quality_design_type'
        ]
        read_only_fields = ['id', 'total', 'cost_total']


class DirectSalePaymentSerializer(serializers.ModelSerializer):
    class Meta:
        model = DirectSalePayment
        fields = ['id', 'direct_sale', 'amount_paid', 'payment_method', 'payment_date', 'notes']
        read_only_fields = ['id', 'payment_date']
        extra_kwargs = {
            'direct_sale': {'required': False},
        }


class DirectSaleSerializer(serializers.ModelSerializer):
    items = DirectSaleItemSerializer(many=True, required=False)
    payments = DirectSalePaymentSerializer(many=True, read_only=True)
    customer_name_display = serializers.SerializerMethodField()
    total_paid = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = DirectSale
        fields = [
            'id', 'customer', 'customer_name', 'customer_phone', 'customer_name_display', 'sale_date',
            'show_date_on_bill', 'total_amount', 'cost_amount', 'discount', 'net_amount', 'profit', 'due',
            'manual_serial_no', 'status', 'payment_status', 'notes', 'items', 'payments', 'total_paid',
            'created_at', 'updated_at'
        ]
        read_only_fields = ['id', 'total_amount', 'cost_amount', 'net_amount', 'profit', 'payment_status', 'created_at', 'updated_at']
    
    def get_customer_name_display(self, obj):
        return obj.customer.name if obj.customer else obj.customer_name

    def validate(self, data):
        customer = data.get('customer')
        if customer is None and self.instance:
            customer = self.instance.customer
        if customer and not (data.get('customer_phone') or '').strip():
            from customers.models import Customer
            cust = customer if hasattr(customer, 'phone') else Customer.objects.filter(pk=customer).first()
            if cust and cust.phone:
                data['customer_phone'] = cust.phone
        return data
    
    def create(self, validated_data):
        items_data = validated_data.pop('items', [])
        direct_sale = DirectSale.objects.create(**validated_data)
        
        for item_data in items_data:
            DirectSaleItem.objects.create(direct_sale=direct_sale, **item_data)
        
        return direct_sale
    
    def update(self, instance, validated_data):
        items_data = validated_data.pop('items', None)

        for attr, value in validated_data.items():
            setattr(instance, attr, value)
        instance.save()

        if items_data is not None:
            instance.items.all().delete()
            for item_data in items_data:
                DirectSaleItem.objects.create(direct_sale=instance, **item_data)
        else:
            # Header-only edits (e.g. discount): recalc net/profit from line items.
            instance.calculate_totals()
            instance.save(update_fields=['total_amount', 'cost_amount', 'net_amount', 'profit'])

        instance.update_due()
        return instance


class DirectSaleListSerializer(serializers.ModelSerializer):
    customer_name_display = serializers.SerializerMethodField()
    customer_phone_display = serializers.SerializerMethodField()
    item_count = serializers.SerializerMethodField()
    total_paid = serializers.SerializerMethodField()

    class Meta:
        model = DirectSale
        fields = [
            'id', 'customer', 'customer_name_display', 'customer_phone_display', 'sale_date', 'total_amount', 'cost_amount',
            'show_date_on_bill', 'manual_serial_no', 'net_amount', 'profit', 'due', 'status', 'payment_status', 'item_count',
            'total_paid', 'created_at',
        ]

    def get_customer_name_display(self, obj):
        return obj.customer.name if obj.customer else obj.customer_name

    def get_customer_phone_display(self, obj):
        if obj.customer_phone:
            return obj.customer_phone
        if obj.customer_id and obj.customer:
            return obj.customer.phone or ''
        return ''

    def get_item_count(self, obj):
        return obj.items.count()

    def get_total_paid(self, obj):
        return float(obj.total_paid or 0)
