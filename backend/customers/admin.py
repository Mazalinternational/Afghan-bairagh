from django.contrib import admin
from .models import Customer


@admin.register(Customer)
class CustomerAdmin(admin.ModelAdmin):
    list_display = ['id', 'name', 'phone', 'email', 'registration_date']
    list_filter = ['registration_date']
    search_fields = ['name', 'phone', 'email']
    readonly_fields = ['registration_date']
    fieldsets = (
        ('Basic Information', {
            'fields': ('name', 'phone', 'email')
        }),
        ('Address & Notes', {
            'fields': ('address', 'notes')
        }),
        ('Metadata', {
            'fields': ('registration_date',),
            'classes': ('collapse',)
        }),
    )