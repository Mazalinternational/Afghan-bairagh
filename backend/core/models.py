from django.contrib.auth.models import AbstractUser, Group
from django.db import models

class TimestampMixin(models.Model):
    created_at = models.DateTimeField(auto_now_add=True)
    updated_at = models.DateTimeField(auto_now=True)

    class Meta:
        abstract = True

class User(AbstractUser, TimestampMixin):
    ADMIN = 'admin'
    STAFF = 'staff'
    
    ROLE_CHOICES = [
        (ADMIN, 'Admin'),
        (STAFF, 'Staff'),
    ]
    
    role = models.CharField(max_length=10, choices=ROLE_CHOICES, default=STAFF)
    permissions = models.JSONField(default=list, blank=True, help_text="List of module permissions for staff users")
    
    def save(self, *args, **kwargs):
        is_new = self.pk is None
        super().save(*args, **kwargs)
        if is_new:
            group, _ = Group.objects.get_or_create(name=self.role)
            self.groups.add(group)
    
    class Meta:
        db_table = 'users'

class AuditLog(TimestampMixin):
    user = models.ForeignKey(User, on_delete=models.SET_NULL, null=True)
    action = models.CharField(max_length=255)
    ip_address = models.GenericIPAddressField(null=True, blank=True)
    details = models.JSONField(default=dict)
    
    class Meta:
        db_table = 'audit_logs'
        ordering = ['-created_at']

class SystemSettings(TimestampMixin):
    # Singleton pattern - only one settings record
    id = models.IntegerField(primary_key=True, default=1, editable=False)
    
    # System Identity
    system_name = models.CharField(max_length=100, default='Afghan Flag')
    system_logo = models.ImageField(upload_to='system/', blank=True, null=True)
    
    # Currency Settings
    primary_currency = models.CharField(max_length=10, default='AFN')
    currency_symbol = models.CharField(max_length=5, default='AFN')
    
    # Regional Settings
    date_format = models.CharField(max_length=20, default='YYYY-MM-DD')
    time_format = models.CharField(max_length=20, default='HH:mm:ss')
    timezone = models.CharField(max_length=50, default='Asia/Kabul')
    
    # Business Settings
    tax_rate = models.DecimalField(max_digits=5, decimal_places=2, default=0.00)
    low_stock_threshold = models.IntegerField(default=10)
    
    # Contact Information
    company_address = models.TextField(blank=True, null=True)
    company_phone = models.CharField(max_length=20, blank=True, null=True)
    company_email = models.EmailField(blank=True, null=True)
    
    class Meta:
        db_table = 'system_settings'
        verbose_name = 'System Settings'
        verbose_name_plural = 'System Settings'
    
    def save(self, *args, **kwargs):
        self.id = 1  # Ensure only one instance
        super().save(*args, **kwargs)
    
    @classmethod
    def get_settings(cls):
        settings, created = cls.objects.get_or_create(id=1)
        return settings
