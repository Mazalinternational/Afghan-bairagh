from django.contrib import admin
from .models import Expense


@admin.register(Expense)
class ExpenseAdmin(admin.ModelAdmin):
    list_display = ['description', 'amount', 'category', 'expense_date', 'created_at']
    list_filter = ['category', 'expense_date', 'created_at']
    search_fields = ['description', 'notes']
    date_hierarchy = 'expense_date'
    readonly_fields = ['created_at']