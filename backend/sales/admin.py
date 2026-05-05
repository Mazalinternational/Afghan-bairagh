from django.contrib import admin
from .models import Sale, SaleItem, SalePayment
from .direct_sales_models import DirectSale, DirectSaleItem, DirectSalePayment


class SaleItemInline(admin.TabularInline):
    model = SaleItem
    extra = 1
    readonly_fields = ['total']


class SalePaymentInline(admin.TabularInline):
    model = SalePayment
    extra = 0
    readonly_fields = ['payment_date']


@admin.register(Sale)
class SaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer', 'sale_date', 'total_amount', 'net_amount', 'status', 'payment_status']
    list_filter = ['status', 'payment_status', 'sale_date']
    search_fields = ['customer__name', 'id']
    readonly_fields = ['sale_date', 'total_amount', 'net_amount', 'created_at', 'updated_at']
    inlines = [SaleItemInline, SalePaymentInline]
    
    fieldsets = (
        ('Sale Information', {
            'fields': ('customer', 'reference_order', 'sale_date', 'status', 'payment_status')
        }),
        ('Financial Details', {
            'fields': ('total_amount', 'discount', 'tax', 'net_amount')
        }),
        ('Additional Info', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )


@admin.register(SaleItem)
class SaleItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'sale', 'item', 'quantity', 'price_per_unit', 'total', 'stock_type']
    list_filter = ['stock_type']
    search_fields = ['sale__id', 'item__name']


@admin.register(SalePayment)
class SalePaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'sale', 'amount_paid', 'payment_method', 'payment_date']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['sale__id']


class DirectSaleItemInline(admin.TabularInline):
    model = DirectSaleItem
    extra = 1
    readonly_fields = ['total', 'cost_total']


class DirectSalePaymentInline(admin.TabularInline):
    model = DirectSalePayment
    extra = 0
    readonly_fields = ['payment_date']


@admin.register(DirectSale)
class DirectSaleAdmin(admin.ModelAdmin):
    list_display = ['id', 'customer_name', 'sale_date', 'total_amount', 'cost_amount', 'profit', 'net_amount', 'status', 'payment_status']
    list_filter = ['status', 'payment_status', 'sale_date']
    search_fields = ['customer_name', 'id']
    readonly_fields = ['sale_date', 'total_amount', 'cost_amount', 'profit', 'net_amount', 'created_at', 'updated_at']
    inlines = [DirectSaleItemInline, DirectSalePaymentInline]
    
    fieldsets = (
        ('Sale Information', {
            'fields': ('customer', 'customer_name', 'sale_date', 'status', 'payment_status')
        }),
        ('Financial Details', {
            'fields': ('total_amount', 'cost_amount', 'discount', 'net_amount', 'profit')
        }),
        ('Additional Info', {
            'fields': ('notes', 'created_at', 'updated_at')
        }),
    )


@admin.register(DirectSaleItem)
class DirectSaleItemAdmin(admin.ModelAdmin):
    list_display = ['id', 'direct_sale', 'item_name', 'quantity', 'price_per_unit', 'cost_per_unit', 'total', 'supplier_name']
    search_fields = ['direct_sale__id', 'item_name', 'supplier_name']


@admin.register(DirectSalePayment)
class DirectSalePaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'direct_sale', 'amount_paid', 'payment_method', 'payment_date']
    list_filter = ['payment_method', 'payment_date']
    search_fields = ['direct_sale__id']
