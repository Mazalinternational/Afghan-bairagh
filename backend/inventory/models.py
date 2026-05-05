from django.db import models
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model

User = get_user_model()


class Category(models.Model):
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        verbose_name_plural = "Categories"
        ordering = ['name']

    def __str__(self):
        return self.name


class FlagDesignType(models.Model):
    """Model to store custom flag design types"""
    name = models.CharField(max_length=100, unique=True, db_index=True)
    description = models.TextField(blank=True)
    created_at = models.DateTimeField(auto_now_add=True)
    
    class Meta:
        ordering = ['name']
        verbose_name = 'Flag Design Type'
        verbose_name_plural = 'Flag Design Types'
    
    def __str__(self):
        return self.name


class Item(models.Model):
    ITEM_TYPES = [
        ('raw_material', 'Raw Material'),
        ('finished_product', 'Finished Product'),
    ]
    
    SIZE_CHOICES = [
        ('small', 'Small'),
        ('large', 'Large'),
    ]

    name = models.CharField(max_length=200, db_index=True)
    sku = models.CharField(max_length=50, unique=True, db_index=True, blank=True)
    item_type = models.CharField(max_length=20, choices=ITEM_TYPES, db_index=True)
    category = models.ForeignKey(Category, on_delete=models.CASCADE, related_name='items')
    description = models.TextField(blank=True)
    unit_price = models.DecimalField(max_digits=10, decimal_places=2, null=True, blank=True, help_text="Selling price per unit")
    cost_price = models.DecimalField(
        max_digits=10,
        decimal_places=2,
        null=True,
        blank=True,
        help_text="Purchase / cost per unit (for margin)",
    )
    # Dual stock system
    press_stock = models.PositiveIntegerField(default=0, db_index=True, help_text="Stock for press operations")
    home_stock = models.PositiveIntegerField(default=0, db_index=True, help_text="Stock for home sales (controlled by home admin)")
    current_stock = models.PositiveIntegerField(default=0, db_index=True, editable=False, help_text="Total stock (press_stock + home_stock)")
    minimum_stock = models.PositiveIntegerField(default=10)
    # Dynamic fields based on category
    flag_design_type = models.ForeignKey(FlagDesignType, on_delete=models.SET_NULL, null=True, blank=True, related_name='items', help_text="For Flag category")
    flag_size = models.CharField(max_length=50, blank=True, help_text="For Flag category")
    size = models.CharField(max_length=20, choices=SIZE_CHOICES, blank=True, help_text="For Flag Stand category")
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        ordering = ['name']
        indexes = [
            models.Index(fields=['item_type', 'current_stock']),
            models.Index(fields=['category', 'item_type']),
        ]

    def __str__(self):
        return f"{self.name} ({self.sku})"

    def save(self, *args, **kwargs):
        # Auto-generate SKU if not provided
        if not self.sku:
            self.sku = self.generate_sku()
        
        # Update current_stock as sum of press_stock and home_stock
        self.current_stock = self.press_stock + self.home_stock
        
        super().save(*args, **kwargs)
    
    def generate_sku(self):
        """Auto-generate SKU based on category and item type"""
        from django.utils.text import slugify
        import random
        import string
        
        # Get prefix from category name (first 3 letters, uppercase)
        category_prefix = self.category.name[:3].upper() if self.category else 'ITM'
        
        # Get item type prefix
        type_prefix = 'RM' if self.item_type == 'raw_material' else 'FP'
        
        # Generate random suffix
        random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
        
        # Create SKU: CAT-TYPE-XXXX
        sku = f"{category_prefix}-{type_prefix}-{random_suffix}"
        
        # Ensure uniqueness
        while Item.objects.filter(sku=sku).exists():
            random_suffix = ''.join(random.choices(string.ascii_uppercase + string.digits, k=4))
            sku = f"{category_prefix}-{type_prefix}-{random_suffix}"
        
        return sku

    @property
    def is_low_stock(self):
        return self.current_stock <= self.minimum_stock

    def clean(self):
        if self.press_stock < 0 or self.home_stock < 0:
            raise ValidationError("Stock cannot be negative")


class StockTransaction(models.Model):
    TRANSACTION_TYPES = [
        ('IN', 'Stock In'),
        ('OUT', 'Stock Out'),
    ]
    
    STOCK_TYPE_CHOICES = [
        ('press_stock', 'Press Stock'),
        ('home_stock', 'Home Stock'),
        ('both', 'Both Stocks'),  # For transactions affecting both
    ]
    
    REFERENCE_TYPES = [
        ('SALE', 'Sale'),
        ('SALE_CANCEL', 'Sale Cancellation'),
        ('ORDER', 'Order'),
        ('ORDER_CANCEL', 'Order Cancellation'),
        ('PURCHASE', 'Purchase'),
        ('PRODUCTION', 'Production'),
        ('ADJUSTMENT', 'Manual Adjustment'),
    ]

    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='transactions')
    transaction_type = models.CharField(max_length=10, choices=TRANSACTION_TYPES, db_index=True)
    stock_type = models.CharField(max_length=20, choices=STOCK_TYPE_CHOICES, default='press_stock', help_text="Which stock to affect")
    quantity = models.PositiveIntegerField()
    reference_type = models.CharField(max_length=20, choices=REFERENCE_TYPES, blank=True, db_index=True, help_text="Type of transaction reference")
    reference_id = models.PositiveIntegerField(null=True, blank=True, help_text="ID of the related sale, order, or purchase")
    reference_number = models.CharField(max_length=100, blank=True)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE, null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['item', 'transaction_type']),
            models.Index(fields=['created_at', 'transaction_type']),
        ]

    def __str__(self):
        return f"{self.item.name} - {self.transaction_type} ({self.quantity})"

    def clean(self):
        if self.transaction_type == 'OUT':
            if self.stock_type == 'press_stock':
                if self.item.press_stock < self.quantity:
                    raise ValidationError(f"Insufficient press stock. Available: {self.item.press_stock}")
            elif self.stock_type == 'home_stock':
                if self.item.home_stock < self.quantity:
                    raise ValidationError(f"Insufficient home stock. Available: {self.item.home_stock}")
            elif self.stock_type == 'both':
                if self.item.current_stock < self.quantity:
                    raise ValidationError(f"Insufficient total stock. Available: {self.item.current_stock}")


class LowStockAlert(models.Model):
    item = models.ForeignKey(Item, on_delete=models.CASCADE, related_name='alerts')
    current_stock = models.PositiveIntegerField()
    minimum_stock = models.PositiveIntegerField()
    is_resolved = models.BooleanField(default=False, db_index=True)
    created_at = models.DateTimeField(auto_now_add=True, db_index=True)
    resolved_at = models.DateTimeField(null=True, blank=True)

    class Meta:
        ordering = ['-created_at']
        indexes = [
            models.Index(fields=['is_resolved', 'created_at']),
        ]

    def __str__(self):
        return f"Low stock alert for {self.item.name}"