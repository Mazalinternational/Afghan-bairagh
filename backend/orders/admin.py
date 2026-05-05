from django.contrib import admin
from .models import Order, OrderItem
from .quotation_models import Quotation, QuotationItem


class OrderItemInline(admin.TabularInline):
    model = OrderItem
    extra = 1
    readonly_fields = ['total']


@admin.register(Order)
class OrderAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'total_estimated_amount', 'status', 'order_date']
    list_filter = ['status', 'order_date']
    search_fields = ['customer__name', 'customer__phone', 'notes']
    readonly_fields = ['order_date', 'created_at', 'updated_at']
    inlines = [OrderItemInline]
    list_per_page = 50


class QuotationItemInline(admin.TabularInline):
    model = QuotationItem
    extra = 1
    readonly_fields = ['total']


@admin.register(Quotation)
class QuotationAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'total_amount', 'quotation_date']
    list_filter = ['quotation_date']
    search_fields = ['customer__name', 'customer__phone', 'notes']
    readonly_fields = ['quotation_date', 'created_at', 'updated_at']
    inlines = [QuotationItemInline]
    list_per_page = 50
