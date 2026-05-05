from rest_framework import serializers
from datetime import timedelta
from .models import Employee, Advance, SalaryPayment, Loan, Tip, SalaryDepositEntry


class EmployeeSerializer(serializers.ModelSerializer):
    pending_advances = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    net_salary = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    pending_salary_months = serializers.SerializerMethodField()
    accumulated_salary = serializers.SerializerMethodField()
    advance_months = serializers.SerializerMethodField()
    salary_deposit_balance = serializers.SerializerMethodField()
    
    class Meta:
        model = Employee
        fields = '__all__'
        read_only_fields = ['created_at']
    
    def get_pending_salary_months(self, obj):
        return obj.get_pending_salary_months()
    
    def get_accumulated_salary(self, obj):
        return float(obj.get_accumulated_salary())
    
    def get_advance_months(self, obj):
        return obj.get_advance_months()

    def get_salary_deposit_balance(self, obj):
        return obj.salary_deposit_balance


class SalaryDepositEntrySerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)

    class Meta:
        model = SalaryDepositEntry
        fields = '__all__'
        read_only_fields = ['created_at']

    def validate_amount(self, value):
        if value is not None and value <= 0:
            raise serializers.ValidationError('Amount must be greater than zero.')
        return value

    def validate(self, data):
        instance = getattr(self, 'instance', None)
        entry_type = data.get('entry_type', getattr(instance, 'entry_type', None) if instance else None)
        amount = data.get('amount', getattr(instance, 'amount', None) if instance else None)
        emp = data.get('employee', getattr(instance, 'employee', None) if instance else None)
        if emp is None or amount is None or entry_type is None:
            return data
        pk = emp.pk if hasattr(emp, 'pk') else emp
        emp_obj = Employee.objects.get(pk=pk)
        # Balance as if this row were removed (so edits replace cleanly).
        bal = emp_obj.salary_deposit_balance
        if instance and instance.pk:
            if instance.entry_type == SalaryDepositEntry.ENTRY_HOLD:
                bal -= instance.amount
            else:
                bal += instance.amount
        if entry_type == SalaryDepositEntry.ENTRY_PAYOUT and amount > bal:
            raise serializers.ValidationError({
                'amount': f'Amount exceeds available deposit balance ({bal}).'
            })
        return data


class AdvanceSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    
    class Meta:
        model = Advance
        fields = '__all__'
        read_only_fields = ['date_given', 'deduction_date']


class SalaryPaymentSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    month_display = serializers.SerializerMethodField()
    
    class Meta:
        model = SalaryPayment
        fields = '__all__'
        read_only_fields = ['advance_deducted', 'net_paid', 'payment_date']
    
    def get_month_display(self, obj):
        # For weekly payments, show week range; for monthly, show month/year
        if getattr(obj, 'period_type', 'monthly') == 'weekly':
          start = obj.month
          end = start + timedelta(days=6)
          return f"Week {start.strftime('%d %b %Y')} - {end.strftime('%d %b %Y')}"
        return obj.month.strftime('%B %Y')
    
    def update(self, instance, validated_data):
        if 'base_salary' in validated_data:
            instance.base_salary = validated_data['base_salary']
            instance.net_paid = instance.base_salary - instance.advance_deducted
        return super().update(instance, validated_data)


class LoanSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    remaining_amount = serializers.DecimalField(max_digits=10, decimal_places=2, read_only=True)
    
    class Meta:
        model = Loan
        fields = '__all__'
        read_only_fields = ['loan_date', 'created_at']


class TipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    
    class Meta:
        model = Tip
        fields = '__all__'
        read_only_fields = ['created_at']