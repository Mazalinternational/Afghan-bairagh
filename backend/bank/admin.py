from django.contrib import admin

from .models import BankTransaction


@admin.register(BankTransaction)
class BankTransactionAdmin(admin.ModelAdmin):
    list_display = ('id', 'transaction_type', 'source', 'amount', 'transaction_date')
    list_filter = ('transaction_type', 'source', 'transaction_date')
    search_fields = ('note',)

