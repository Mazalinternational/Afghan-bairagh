from rest_framework import serializers
from datetime import timedelta
from django.db import transaction
from django.utils import timezone
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
        read_only_fields = ['created_at', 'previous_salary', 'salary_effective_date']

    def create(self, validated_data):
        join_date = validated_data.get('join_date')
        salary = validated_data.get('salary')
        if join_date and not validated_data.get('salary_effective_date'):
            validated_data['salary_effective_date'] = join_date
        if salary is not None and validated_data.get('previous_salary') is None:
            validated_data['previous_salary'] = salary
        if salary is not None and join_date and not validated_data.get('salary_notes'):
            validated_data['salary_notes'] = (
                f'From {join_date.isoformat()} monthly salary: AFN {float(salary):.2f}.'
            )
        return super().create(validated_data)

    @transaction.atomic
    def update(self, instance, validated_data):
        new_salary = validated_data.get('salary')
        if new_salary is not None and new_salary != instance.salary:
            old_salary = instance.salary
            effective = timezone.localdate()
            change_word = 'increased' if new_salary > old_salary else 'decreased'
            prior_from = instance.salary_effective_date or instance.join_date
            line = (
                f'From {prior_from.isoformat()} salary was AFN {float(old_salary):.2f}. '
                f'From {effective.isoformat()} salary {change_word} to AFN {float(new_salary):.2f}.'
            )
            existing = (instance.salary_notes or '').strip()
            validated_data['salary_notes'] = f'{existing}\n{line}'.strip() if existing else line
            validated_data['previous_salary'] = old_salary
            validated_data['salary_effective_date'] = effective
        return super().update(instance, validated_data)
    
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
        read_only_fields = ['advance_deducted', 'net_paid']

    def create(self, validated_data):
        if not validated_data.get('payment_date'):
            validated_data['payment_date'] = timezone.localdate()
        return super().create(validated_data)

    def get_month_display(self, obj):
        # For weekly payments, show week range; for monthly, show month/year
        if getattr(obj, 'period_type', 'monthly') == 'weekly':
          start = obj.month
          end = start + timedelta(days=6)
          return f"Week {start.strftime('%d %b %Y')} - {end.strftime('%d %b %Y')}"
        return obj.month.strftime('%B %Y')
    
    @transaction.atomic
    def update(self, instance, validated_data):
        old_payment_date = instance.payment_date
        new_payment_date = validated_data.get('payment_date', old_payment_date)

        if new_payment_date != old_payment_date and instance.advance_deducted > 0:
            Advance.objects.filter(
                employee_id=instance.employee_id,
                deduction_date=old_payment_date,
                is_deducted=True,
            ).update(deduction_date=new_payment_date)

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
        read_only_fields = ['created_at']

    def create(self, validated_data):
        if not validated_data.get('loan_date'):
            validated_data['loan_date'] = timezone.localdate()
        return super().create(validated_data)


class TipSerializer(serializers.ModelSerializer):
    employee_name = serializers.CharField(source='employee.name', read_only=True)
    
    class Meta:
        model = Tip
        fields = '__all__'
        read_only_fields = ['created_at']