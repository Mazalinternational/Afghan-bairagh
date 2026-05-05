from django.contrib import admin
from .models import RozNamcha


@admin.register(RozNamcha)
class RozNamchaAdmin(admin.ModelAdmin):
    list_display = ['item_name', 'date', 'cost_price', 'created_at']
    list_filter = ['date', 'created_at']
    search_fields = ['item_name', 'description']
    date_hierarchy = 'date'
    ordering = ['-date', '-created_at']
