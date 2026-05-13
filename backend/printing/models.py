from decimal import Decimal
from django.db import models
from django.db.models import Sum


class PrintingPrinter(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    phone = models.CharField(max_length=20, blank=True)
    address = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    def __str__(self):
        return self.name


class PrintingJob(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('due', 'Due'),
    ]

    printer = models.ForeignKey(PrintingPrinter, on_delete=models.PROTECT, related_name='jobs')
    bill_number = models.CharField(max_length=100, blank=True)
    job_title = models.CharField(max_length=255, blank=True)
    total_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='due', db_index=True)
    notes = models.TextField(blank=True)
    job_date = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['-job_date']

    @property
    def total_paid(self):
        return self.payments.aggregate(total=Sum('amount'))['total'] or Decimal('0')

    @property
    def remaining_amount(self):
        remaining = Decimal(self.total_price or 0) - Decimal(self.total_paid or 0)
        return remaining if remaining > 0 else Decimal('0')

    def update_payment_status(self):
        paid = Decimal(self.total_paid or 0)
        total = Decimal(self.total_price or 0)
        if total <= 0 or paid >= total:
            self.payment_status = 'paid'
        elif paid > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'due'
        self.save(update_fields=['payment_status', 'updated_at'])

    def __str__(self):
        return f'Printing Job #{self.id} - {self.printer.name}'


class PrintingJobItem(models.Model):
    job = models.ForeignKey(PrintingJob, on_delete=models.CASCADE, related_name='items')
    flag_name = models.CharField(max_length=200)
    size = models.CharField(max_length=100, blank=True)
    qty = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    making_unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Cost / making price per unit (AFN)',
    )
    selling_unit_price = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text='Selling price per unit (AFN); subtotal = qty × selling when set',
    )
    total_meters = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    per_meter_price = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    line_total = models.DecimalField(max_digits=12, decimal_places=2, default=0)

    class Meta:
        ordering = ['id']

    def __str__(self):
        return f'{self.flag_name} ({self.qty})'


class PrintingPayment(models.Model):
    job = models.ForeignKey(PrintingJob, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_method = models.CharField(max_length=50, default='cash')
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    payment_date = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-payment_date']

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.job.update_payment_status()

    def __str__(self):
        return f'Payment #{self.id} for Printing Job #{self.job_id}'

