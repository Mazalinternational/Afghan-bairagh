from django.contrib import admin
from .models import Supplier, Purchase, SupplierLedger, Payment, SupplierBalancePayment


@admin.register(Supplier)
class SupplierAdmin(admin.ModelAdmin):
    list_display = ['name', 'contact_person', 'phone', 'balance', 'previous_balance', 'created_at']
    search_fields = ['name', 'contact_person', 'phone']
    list_filter = ['created_at']
    readonly_fields = ['balance', 'created_at']


@admin.register(Purchase)
class PurchaseAdmin(admin.ModelAdmin):
    list_display = ['id', 'supplier', 'item_name', 'quantity', 'cost', 'payment_status', 'is_for_press', 'purchase_date']
    list_filter = ['payment_status', 'is_for_press', 'purchase_date', 'supplier']
    search_fields = ['item_name', 'supplier__name']
    readonly_fields = ['purchase_date', 'total_paid', 'remaining_amount']


@admin.register(Payment)
class PaymentAdmin(admin.ModelAdmin):
    list_display = ['id', 'purchase', 'amount', 'payment_method', 'payment_date']
    list_filter = ['payment_method', 'payment_date']
    readonly_fields = ['payment_date']


@admin.register(SupplierLedger)
class SupplierLedgerAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'transaction_type', 'amount_due', 'balance', 'created_at']
    list_filter = ['transaction_type', 'created_at', 'supplier']
    readonly_fields = ['balance', 'created_at']


@admin.register(SupplierBalancePayment)
class SupplierBalancePaymentAdmin(admin.ModelAdmin):
    list_display = ['supplier', 'amount', 'payment_date']
    list_filter = ['payment_date', 'supplier']
    readonly_fields = ['payment_date']