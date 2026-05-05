from decimal import Decimal

from django.db import models


class Shop(models.Model):
    PERIOD_CHOICES = [
        ("weekly", "Weekly"),
        ("monthly", "Monthly"),
    ]

    shop_no = models.CharField(max_length=50, unique=True)
    tenant_name = models.CharField(max_length=255)
    tenant_phone = models.CharField(max_length=50, blank=True, default="")
    owner_name = models.CharField(
        max_length=255,
        blank=True,
        default="",
        help_text="Landlord / property owner you pay rent to",
    )
    rent_date = models.DateField(help_text="Contract start date")
    duration_count = models.PositiveIntegerField(default=1, help_text="Number of weeks/months")
    period_type = models.CharField(max_length=10, choices=PERIOD_CHOICES, default="monthly")
    rent_amount = models.DecimalField(max_digits=12, decimal_places=2)
    notes = models.TextField(blank=True)
    is_active = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ["shop_no"]

    def __str__(self):
        return f"Shop {self.shop_no} - {self.tenant_name}"

    @property
    def total_due(self):
        return Decimal(self.duration_count) * self.rent_amount

    @property
    def total_paid(self):
        total = self.payments.aggregate(total=models.Sum("amount"))["total"]
        return total or Decimal("0")

    @property
    def paid_periods(self):
        if self.rent_amount <= 0:
            return 0
        return int(self.total_paid // self.rent_amount)

    @property
    def remaining_periods(self):
        return max(self.duration_count - self.paid_periods, 0)


class RentPayment(models.Model):
    shop = models.ForeignKey(Shop, on_delete=models.CASCADE, related_name="payments")
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateField()
    note = models.CharField(max_length=255, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-payment_date", "-id"]

    def __str__(self):
        return f"Payment {self.amount} for Shop {self.shop.shop_no}"
