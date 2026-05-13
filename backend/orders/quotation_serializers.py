from rest_framework import serializers
from .quotation_models import Quotation, QuotationItem


class QuotationItemSerializer(serializers.ModelSerializer):
    item_name = serializers.SerializerMethodField()

    class Meta:
        model = QuotationItem
        fields = [
            'id', 'item', 'item_name', 'quantity', 'price_estimate', 'purchase_unit_cost',
            'flag_size',
            'quality_design_type', 'manual_item_name', 'total',
        ]
        read_only_fields = ['total']

    def get_item_name(self, obj):
        if obj.manual_item_name:
            return obj.manual_item_name
        return obj.item.name if obj.item else None


class QuotationSerializer(serializers.ModelSerializer):
    quotation_items = QuotationItemSerializer(many=True, required=False)
    customer_name = serializers.CharField(source='customer.name', read_only=True)

    class Meta:
        model = Quotation
        fields = ['id', 'customer', 'customer_name', 'quotation_date', 'total_amount', 'notes', 'quotation_items', 'created_at']
        read_only_fields = ['total_amount', 'created_at']

    def create(self, validated_data):
        items_data = validated_data.pop('quotation_items', [])
        quotation = Quotation.objects.create(**validated_data)
        
        for item_data in items_data:
            QuotationItem.objects.create(quotation=quotation, **item_data)
        
        quotation.calculate_total()
        quotation.save()
        return quotation

    def update(self, instance, validated_data):
        items_data = validated_data.pop('quotation_items', [])
        
        # Update quotation fields
        instance.customer = validated_data.get('customer', instance.customer)
        instance.notes = validated_data.get('notes', instance.notes)
        if 'quotation_date' in validated_data and validated_data['quotation_date'] is not None:
            instance.quotation_date = validated_data['quotation_date']
        instance.save()
        
        # Delete existing items and create new ones
        instance.quotation_items.all().delete()
        
        for item_data in items_data:
            QuotationItem.objects.create(quotation=instance, **item_data)
        
        instance.calculate_total()
        instance.save()
        return instance
