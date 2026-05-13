from rest_framework import serializers
from .models import Category, Item, StockTransaction, LowStockAlert, FlagDesignType
from .purchase_cost import build_latest_supplier_unit_cost_by_item_id


class FlagDesignTypeSerializer(serializers.ModelSerializer):
    class Meta:
        model = FlagDesignType
        fields = ['id', 'name', 'description', 'created_at']


class CategorySerializer(serializers.ModelSerializer):
    items_count = serializers.SerializerMethodField()

    class Meta:
        model = Category
        fields = ['id', 'name', 'description', 'items_count', 'created_at']

    def get_items_count(self, obj):
        return obj.items.count()


class ItemSerializer(serializers.ModelSerializer):
    category_name = serializers.CharField(source='category.name', read_only=True)
    is_low_stock = serializers.ReadOnlyField()
    flag_design_type_name = serializers.SerializerMethodField()
    last_supplier_unit_cost = serializers.SerializerMethodField()

    class Meta:
        model = Item
        fields = [
            'id', 'name', 'sku', 'item_type', 'category', 'category_name',
            'description', 'unit_price', 'cost_price', 'last_supplier_unit_cost',
            'press_stock', 'home_stock',
            'current_stock', 'minimum_stock', 'flag_design_type', 'flag_design_type_name',
            'flag_size', 'size', 'is_low_stock', 'created_at', 'updated_at'
        ]
        read_only_fields = ['sku', 'current_stock', 'last_supplier_unit_cost']

    def _supplier_unit_cost_map(self):
        cache = self.context.setdefault('_supplier_unit_cost_map', None)
        if cache is None:
            cache = build_latest_supplier_unit_cost_by_item_id()
            self.context['_supplier_unit_cost_map'] = cache
        return cache

    def get_last_supplier_unit_cost(self, obj):
        v = self._supplier_unit_cost_map().get(obj.id)
        return v if v is not None else None

    def get_flag_design_type_name(self, obj):
        return obj.flag_design_type.name if obj.flag_design_type else None


class StockTransactionSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)
    created_by_username = serializers.CharField(source='created_by.username', read_only=True)

    class Meta:
        model = StockTransaction
        fields = [
            'id', 'item', 'item_name', 'item_sku', 'transaction_type', 'stock_type',
            'quantity', 'reference_number', 'notes', 'created_by',
            'created_by_username', 'created_at'
        ]
        read_only_fields = ['created_by']

    def validate(self, data):
        if data['transaction_type'] == 'OUT':
            item = data['item']
            stock_type = data.get('stock_type', 'press_stock')
            
            # Safely get stock values (handle cases where fields might not exist yet)
            if stock_type == 'press_stock':
                available = getattr(item, 'press_stock', item.current_stock if hasattr(item, 'current_stock') else 0)
            elif stock_type == 'home_stock':
                available = getattr(item, 'home_stock', 0)
            else:  # both
                available = getattr(item, 'current_stock', 0)
            
            if available < data['quantity']:
                stock_name = stock_type.replace('_', ' ').title()
                raise serializers.ValidationError(
                    f"Insufficient {stock_name}. Available: {available}, Requested: {data['quantity']}"
                )
        return data


class LowStockAlertSerializer(serializers.ModelSerializer):
    item_name = serializers.CharField(source='item.name', read_only=True)
    item_sku = serializers.CharField(source='item.sku', read_only=True)

    class Meta:
        model = LowStockAlert
        fields = [
            'id', 'item', 'item_name', 'item_sku', 'current_stock',
            'minimum_stock', 'is_resolved', 'created_at', 'resolved_at'
        ]


class StockReportSerializer(serializers.Serializer):
    item_type = serializers.CharField()
    total_items = serializers.IntegerField()
    total_stock_value = serializers.DecimalField(max_digits=15, decimal_places=2)
    low_stock_items = serializers.IntegerField()


class ItemStockHistorySerializer(serializers.Serializer):
    date = serializers.DateField()
    stock_in = serializers.IntegerField()
    stock_out = serializers.IntegerField()
    net_change = serializers.IntegerField()