from django.db import models
from django.core.exceptions import ValidationError
from django.db.models import Sum
from inventory.models import Item, StockTransaction


class Supplier(models.Model):
    name = models.CharField(max_length=200, db_index=True)
    manual_serial_no = models.CharField(
        max_length=100,
        blank=True,
        default='',
        db_index=True,
        help_text='Manual supplier / ledger serial number',
    )
    contact_person = models.CharField(max_length=100, blank=True)
    phone = models.CharField(max_length=15, blank=True)
    phone_secondary = models.CharField(max_length=15, blank=True, default='')
    email = models.EmailField(blank=True)
    address = models.TextField(blank=True)
    balance = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    previous_balance = models.DecimalField(
        max_digits=12,
        decimal_places=2,
        default=0,
        help_text="Balance before system implementation"
    )
    previous_balance_reference = models.CharField(
        max_length=100,
        blank=True,
        help_text="Reference number for previous balance"
    )
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['name']

    @property
    def previous_balance_paid(self):
        from decimal import Decimal
        total = self.balance_payments.aggregate(total=Sum('amount'))['total']
        return total if total is not None else Decimal('0')

    @property
    def previous_balance_remaining(self):
        from decimal import Decimal
        prev_bal = self.previous_balance if self.previous_balance is not None else Decimal('0')
        paid = self.previous_balance_paid
        remaining = prev_bal - paid
        return remaining if remaining > 0 else Decimal('0')

    def __str__(self):
        return self.name


class Purchase(models.Model):
    PAYMENT_STATUS_CHOICES = [
        ('paid', 'Paid'),
        ('partial', 'Partial'),
        ('due', 'Due'),
    ]
    
    STOCK_TYPE_CHOICES = [
        ('press_stock', 'Press Stock'),
        ('home_stock', 'Home Stock'),
    ]

    supplier = models.ForeignKey(Supplier, on_delete=models.PROTECT, related_name='purchases')
    bill_number = models.CharField(max_length=100, blank=True, help_text="Supplier's bill/invoice number")
    item_name = models.CharField(max_length=200)
    quantity = models.PositiveIntegerField()
    cost = models.DecimalField(max_digits=10, decimal_places=2)
    purchase_date = models.DateTimeField(auto_now_add=True, db_index=True)
    updated_at = models.DateTimeField(auto_now=True)
    payment_status = models.CharField(max_length=10, choices=PAYMENT_STATUS_CHOICES, default='due', db_index=True)
    is_for_press = models.BooleanField(default=False, db_index=True)
    stock_type = models.CharField(max_length=20, choices=STOCK_TYPE_CHOICES, default='press_stock', help_text="Which stock to add to (used when stock_distributions is empty)")
    stock_distributions = models.JSONField(
        default=list,
        blank=True,
        help_text='Split of quantity between press and home stock, e.g. [{"stock_type": "press_stock", "quantity": 25}, {"stock_type": "home_stock", "quantity": 25}]'
    )
    description = models.TextField(blank=True)
    item = models.ForeignKey(Item, on_delete=models.SET_NULL, null=True, blank=True, related_name='purchases')
    purchase_items = models.JSONField(
        default=list,
        blank=True,
        help_text='Purchase line items, e.g. [{"item_name":"Cloth","quantity":"2.5","unit_cost":"100","line_total":"250"}]'
    )

    class Meta:
        ordering = ['-purchase_date']
        indexes = [
            models.Index(fields=['supplier', 'payment_status']),
            models.Index(fields=['is_for_press', 'purchase_date']),
        ]

    def clean(self):
        """Enhanced validation for purchase data"""
        if self.quantity <= 0:
            raise ValidationError({'quantity': 'Quantity must be greater than zero.'})
        if self.cost <= 0:
            raise ValidationError({'cost': 'Cost must be greater than zero.'})
        if self.purchase_items and not isinstance(self.purchase_items, list):
            raise ValidationError({'purchase_items': 'Purchase items must be a list.'})
        if not self.is_for_press and not self.description:
            raise ValidationError({'description': 'Description is required for personal purchases.'})
        if self.stock_distributions:
            total = sum(
                int(d.get('quantity', 0))
                for d in self.stock_distributions
                if isinstance(d, dict) and d.get('stock_type') in ('press_stock', 'home_stock')
            )
            if total != self.quantity:
                raise ValidationError({
                    'stock_distributions': f'Sum of stock distribution quantities ({total}) must equal purchase quantity ({self.quantity}).'
                })

    def save(self, *args, **kwargs):
        """Enhanced save method with better stock integration"""
        is_new = self.pk is None
        self.full_clean()  # Run validation
        super().save(*args, **kwargs)
        
        # Stock integration for press purchases
        # StockTransaction is the single source of truth for inventory changes
        # The StockTransaction.post_save signal will update Item.current_stock automatically
        if is_new and self.is_for_press:
            try:
                lines = [x for x in (self.purchase_items or []) if isinstance(x, dict)]
                created_from_lines = False
                for line in lines:
                    raw_id = line.get('item')
                    if raw_id in (None, '', 0, '0'):
                        continue
                    try:
                        item_id = int(raw_id)
                    except (TypeError, ValueError):
                        continue
                    try:
                        qty = int(round(float(line.get('quantity', 0) or 0)))
                    except (TypeError, ValueError):
                        qty = 0
                    if qty <= 0:
                        continue
                    try:
                        inv_item = Item.objects.get(pk=item_id)
                    except Item.DoesNotExist:
                        continue
                    StockTransaction.objects.create(
                        item=inv_item,
                        transaction_type='IN',
                        stock_type=self.stock_type,
                        quantity=qty,
                        reference_number=f'PUR-{self.id}',
                        notes=f'Purchase from {self.supplier.name} - {line.get("item_name") or inv_item.name}',
                    )
                    created_from_lines = True

                if not created_from_lines and self.item:
                    distributions = [
                        d for d in (self.stock_distributions or [])
                        if isinstance(d, dict)
                        and d.get('stock_type') in ('press_stock', 'home_stock')
                        and (int(d.get('quantity', 0)) or 0) > 0
                    ]
                    if distributions:
                        for d in distributions:
                            qty = int(d.get('quantity', 0))
                            if qty <= 0:
                                continue
                            StockTransaction.objects.create(
                                item=self.item,
                                transaction_type='IN',
                                stock_type=d['stock_type'],
                                quantity=qty,
                                reference_number=f'PUR-{self.id}',
                                notes=f'Purchase from {self.supplier.name} - {self.item_name}'
                            )
                    else:
                        StockTransaction.objects.create(
                            item=self.item,
                            transaction_type='IN',
                            stock_type=self.stock_type,
                            quantity=self.quantity,
                            reference_number=f'PUR-{self.id}',
                            notes=f'Purchase from {self.supplier.name} - {self.item_name}'
                        )
            except Exception as e:
                import logging
                logger = logging.getLogger(__name__)
                logger.error(f'Failed to create StockTransaction for purchase {self.id}: {str(e)}')
                if 'item' not in str(e).lower():
                    raise

    @property
    def total_paid(self):
        return self.payments.aggregate(total=Sum('amount'))['total'] or 0

    @property
    def remaining_amount(self):
        return self.cost - self.total_paid

    def update_payment_status(self):
        total_paid = self.total_paid
        if total_paid >= self.cost:
            self.payment_status = 'paid'
        elif total_paid > 0:
            self.payment_status = 'partial'
        else:
            self.payment_status = 'due'
        self.save(update_fields=['payment_status', 'updated_at'])

    def __str__(self):
        return f"Purchase #{self.id} - {self.item_name} from {self.supplier.name}"


class SupplierLedger(models.Model):
    TRANSACTION_TYPES = [
        ('purchase', 'Purchase'),
        ('payment', 'Payment'),
        ('adjustment', 'Adjustment'),
    ]

    supplier = models.ForeignKey(Supplier, on_delete=models.CASCADE, related_name='ledger_entries')
    transaction_type = models.CharField(max_length=15, choices=TRANSACTION_TYPES, db_index=True)
    amount_due = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    amount_paid = models.DecimalField(max_digits=12, decimal_places=2, default=0)
    balance = models.DecimalField(max_digits=12, decimal_places=2)
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, null=True, blank=True, related_name='ledger_entries')
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['supplier', 'transaction_type']),
        ]

    def __str__(self):
        return f"{self.supplier.name} - {self.transaction_type} - Balance: {self.balance}"


class Payment(models.Model):
    purchase = models.ForeignKey(Purchase, on_delete=models.CASCADE, related_name='payments')
    amount = models.DecimalField(max_digits=10, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True)
    payment_method = models.CharField(max_length=50, default='cash')
    reference = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']

    def clean(self):
        """Enhanced validation for payment data"""
        if self.amount <= 0:
            raise ValidationError({'amount': 'Payment amount must be greater than zero.'})
        
        if self.purchase:
            remaining = self.purchase.remaining_amount
            if self.pk:  # Editing existing payment
                original = Payment.objects.get(pk=self.pk)
                remaining += original.amount  # Add back original amount
            
            if self.amount > remaining:
                raise ValidationError({
                    'amount': f'Payment amount cannot exceed remaining balance of {remaining}.'
                })

    def save(self, *args, **kwargs):
        super().save(*args, **kwargs)
        self.purchase.update_payment_status()

    def __str__(self):
        return f"Payment #{self.id} - {self.amount} for Purchase #{self.purchase.id}"


class SupplierBalancePayment(models.Model):
    supplier = models.ForeignKey(
        Supplier,
        on_delete=models.CASCADE,
        related_name='balance_payments'
    )
    amount = models.DecimalField(max_digits=12, decimal_places=2)
    payment_date = models.DateTimeField(auto_now_add=True, db_index=True)
    notes = models.TextField(blank=True)

    class Meta:
        ordering = ['-payment_date']

    def __str__(self):
        return f"Previous balance payment {self.amount} for {self.supplier.name}"
