from django.contrib import admin
from .models import Employee, Advance, SalaryPayment, Tip


@admin.register(Employee)
class EmployeeAdmin(admin.ModelAdmin):
    list_display = ['name', 'nid', 'phone', 'salary', 'pending_advances', 'net_salary', 'is_active']
    list_filter = ['is_active', 'join_date']
    search_fields = ['name', 'father_name', 'nid', 'phone']
    readonly_fields = ['pending_advances', 'net_salary', 'created_at']


@admin.register(Advance)
class AdvanceAdmin(admin.ModelAdmin):
    list_display = ['employee', 'amount', 'date_given', 'is_deducted', 'deduction_date']
    list_filter = ['is_deducted', 'date_given']
    search_fields = ['employee__name', 'employee__nid']


@admin.register(SalaryPayment)
class SalaryPaymentAdmin(admin.ModelAdmin):
    list_display = ['employee', 'month', 'base_salary', 'advance_deducted', 'net_paid', 'payment_date', 'notes']
    list_filter = ['month', 'payment_date']
    search_fields = ['employee__name', 'employee__nid']
    readonly_fields = ['advance_deducted', 'net_paid']
    list_editable = ['base_salary']

    def save_model(self, request, obj, form, change):
        if 'base_salary' in form.changed_data:
            obj.net_paid = obj.base_salary - obj.advance_deducted
        super().save_model(request, obj, form, change)


@admin.register(Tip)
class TipAdmin(admin.ModelAdmin):
    list_display = ['employee', 'amount', 'date', 'reason']
    list_filter = ['date']
    search_fields = ['employee__name', 'reason']