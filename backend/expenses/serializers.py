from rest_framework import serializers
from .models import Expense


class ExpenseSerializer(serializers.ModelSerializer):
    category_display = serializers.SerializerMethodField(read_only=True)
    
    def get_category_display(self, obj):
        """Return formatted category name for display"""
        # Check if it's one of the predefined categories
        category_map = {
            'office': 'Office Supplies',
            'utilities': 'Utilities',
            'transport': 'Transportation',
            'marketing': 'Marketing',
            'maintenance': 'Maintenance',
            'other': 'Other',
        }
        return category_map.get(obj.category, obj.category.replace('_', ' ').title())
    
    class Meta:
        model = Expense
        fields = '__all__'
        read_only_fields = ['created_at']