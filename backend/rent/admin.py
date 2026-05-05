from django.contrib import admin

from .models import RentPayment, Shop


class RentPaymentInline(admin.TabularInline):
    model = RentPayment
    extra = 0


@admin.register(Shop)
class ShopAdmin(admin.ModelAdmin):
    list_display = ("shop_no", "tenant_name", "owner_name", "period_type", "duration_count", "rent_amount", "is_active")
    search_fields = ("shop_no", "tenant_name", "owner_name")
    inlines = [RentPaymentInline]


@admin.register(RentPayment)
class RentPaymentAdmin(admin.ModelAdmin):
    list_display = ("shop", "amount", "payment_date")
    search_fields = ("shop__shop_no", "shop__tenant_name")
