from django.db import models
from django.utils import timezone
from django.core.exceptions import ValidationError
from django.db.models import Sum
from decimal import Decimal
from datetime import date


class Employee(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    father_name = models.CharField(max_length=200)
    nid = models.CharField(max_length=20, unique=True, db_index=True)
    phone = models.CharField(max_length=15)
    address = models.TextField()
    salary = models.DecimalField(max_digits=10, decimal_places=2)
    previous_salary = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text='Salary rate before the latest change',
    )
    salary_effective_date = models.DateField(
        null=True,
        blank=True,
        db_index=True,
        help_text='Date from which the current salary amount applies',
    )
    salary_notes = models.TextField(blank=True, help_text='History of salary changes')
    join_date = models.DateField(db_index=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    @property
    def pending_advances(self):
        return self.advances.filter(is_deducted=False).aggregate(
            total=Sum('amount'))['total'] or Decimal('0')

    @property
    def net_salary(self):
        return self.salary - self.pending_advances
    
    def get_salary_for_month(self, year, month):
        """Return the salary rate owed for a calendar month."""
        effective = self.salary_effective_date or self.join_date
        effective_month = date(effective.year, effective.month, 1)
        target_month = date(year, month, 1)
        if target_month < effective_month:
            rate = self.previous_salary if self.previous_salary is not None else self.salary
        else:
            rate = self.salary
        return rate

    def _unpaid_month_keys(self):
        """(year, month) pairs from join_date through today that have no salary payment."""
        if not self.is_active:
            return []

        today = date.today()
        join_date = self.join_date
        paid = set()
        for payment in self.salary_payments.filter(period_type='monthly'):
            paid.add((payment.month.year, payment.month.month))

        keys = []
        current = date(join_date.year, join_date.month, 1)
        end = date(today.year, today.month, 1)
        while current <= end:
            key = (current.year, current.month)
            if key not in paid:
                keys.append(key)
            if current.month == 12:
                current = date(current.year + 1, 1, 1)
            else:
                current = date(current.year, current.month + 1, 1)
        return keys

    def get_pending_salary_months(self):
        return len(self._unpaid_month_keys())

    def get_accumulated_salary(self):
        return sum(self.get_salary_for_month(y, m) for y, m in self._unpaid_month_keys())
    
    def get_advance_months(self):
        """Calculate how many months of advance salary has been taken"""
        total_advance = self.pending_advances
        if total_advance <= 0:
            return 0
        # Calculate months (can be fractional)
        from decimal import Decimal
        months = total_advance / self.salary if self.salary > 0 else 0
        return float(months)

    def __str__(self):
        return f"{self.name} (NID: {self.nid})"

    @property
    def salary_deposit_balance(self):
        """Net amount held: employee returned salary to company minus amounts paid back."""
        from django.db.models import Sum
        from decimal import Decimal
        held = self.salary_deposit_entries.filter(entry_type='hold').aggregate(
            s=Sum('amount'))['s'] or Decimal('0')
        paid_back = self.salary_deposit_entries.filter(entry_type='payout').aggregate(
            s=Sum('amount'))['s'] or Decimal('0')
        return held - paid_back


class SalaryDepositEntry(models.Model):
    """
    Employee returns part of paid salary to the company to hold; later requests payout.
    """
    ENTRY_HOLD = 'hold'
    ENTRY_PAYOUT = 'payout'
    ENTRY_CHOICES = [
        (ENTRY_HOLD, 'Employee deposited with company'),
        (ENTRY_PAYOUT, 'Paid back to employee'),
    ]
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_deposit_entries')
    entry_type = models.CharField(max_length=10, choices=ENTRY_CHOICES, db_index=True)
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    created_at = models.DateTimeField(auto_now_add=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-created_at']
        db_table = 'employee_salary_deposit_entries'

    def __str__(self):
        return f"{self.get_entry_type_display()} {self.amount} — {self.employee.name}"


class Advance(models.Model):
    STATUS_CHOICES = [
        ('Pending', 'Pending'),
        ('Returned', 'Returned'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='advances')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date_given = models.DateField(auto_now_add=True, db_index=True)
    return_plan = models.TextField(blank=True, help_text="Plan for returning the advance")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Pending', db_index=True)
    is_deducted = models.BooleanField(default=False, db_index=True)
    deduction_date = models.DateField(null=True, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-date_given']

    def clean(self):
        if self.amount <= 0:
            raise ValidationError({'amount': 'Amount must be greater than zero.'})

    def __str__(self):
        return f"Advance {self.amount} for {self.employee.name}"


class SalaryPayment(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='salary_payments')
    month = models.DateField(db_index=True, help_text="Month or week start date for the salary period")
    base_salary = models.DecimalField(max_digits=10, decimal_places=2)
    advance_deducted = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    net_paid = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateField(
        db_index=True,
        default=timezone.localdate,
        help_text='Calendar date this salary was paid (week/month settlement date)',
    )
    notes = models.TextField(blank=True)

    PERIOD_TYPE_CHOICES = [
        ('monthly', 'Monthly'),
        ('weekly', 'Weekly'),
    ]
    period_type = models.CharField(max_length=10, choices=PERIOD_TYPE_CHOICES, default='monthly', db_index=True)

    class Meta:
        ordering = ['-payment_date']
        unique_together = ['employee', 'month', 'period_type']

    def clean(self):
        if self.base_salary <= 0:
            raise ValidationError({'base_salary': 'Base salary must be greater than zero.'})
        if self.net_paid < 0:
            raise ValidationError({'net_paid': 'Net paid cannot be negative.'})

    def save(self, *args, **kwargs):
        is_new = not self.pk
        
        if is_new:  # New payment
            # Auto-deduct pending advances
            pending_advances = self.employee.advances.filter(is_deducted=False)
            total_pending = pending_advances.aggregate(total=Sum('amount'))['total'] or Decimal('0')
            
            self.advance_deducted = min(total_pending, self.base_salary)
            self.net_paid = self.base_salary - self.advance_deducted
        else:  # Editing existing payment
            # Recalculate net_paid when base_salary is edited
            self.net_paid = self.base_salary - self.advance_deducted
            
        super().save(*args, **kwargs)
        
        # Mark advances as deducted (only for new payments)
        if is_new and self.advance_deducted > 0:
            remaining_deduction = self.advance_deducted
            for advance in self.employee.advances.filter(is_deducted=False).order_by('date_given'):
                if remaining_deduction <= 0:
                    break
                if advance.amount <= remaining_deduction:
                    advance.is_deducted = True
                    advance.status = 'Returned'
                    advance.deduction_date = self.payment_date
                    advance.save()
                    remaining_deduction -= advance.amount

    def delete(self, *args, **kwargs):
        # Restore advances that were deducted in this payment
        if self.advance_deducted > 0:
            deducted_advances = self.employee.advances.filter(
                is_deducted=True,
                deduction_date=self.payment_date
            ).order_by('date_given')
            for advance in deducted_advances:
                advance.is_deducted = False
                advance.status = 'Pending'
                advance.deduction_date = None
                advance.save()
        super().delete(*args, **kwargs)

    def __str__(self):
        return f"Salary payment for {self.employee.name} - {self.month.strftime('%B %Y')}"


class Loan(models.Model):
    STATUS_CHOICES = [
        ('Active', 'Active'),
        ('Paid', 'Paid'),
        ('Partial', 'Partial'),
    ]
    
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='loans')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    loan_date = models.DateField(default=timezone.localdate, db_index=True)
    interest_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0, help_text="Interest rate in percentage")
    repayment_plan = models.TextField(blank=True, help_text="Plan for repaying the loan")
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Active', db_index=True)
    amount_paid = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-loan_date']

    @property
    def remaining_amount(self):
        return self.amount - self.amount_paid

    def clean(self):
        if self.amount <= 0:
            raise ValidationError({'amount': 'Loan amount must be greater than zero.'})
        if self.amount_paid > self.amount:
            raise ValidationError({'amount_paid': 'Amount paid cannot exceed loan amount.'})

    def __str__(self):
        return f"Loan {self.amount} for {self.employee.name}"


class Tip(models.Model):
    employee = models.ForeignKey(Employee, on_delete=models.CASCADE, related_name='tips')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    date = models.DateField(db_index=True)
    reason = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-date']

    def __str__(self):
        return f"Tip {self.amount} for {self.employee.name}"