from django.db import models, transaction
from django.core.exceptions import ValidationError
from django.contrib.auth import get_user_model
from .models import Item, StockTransaction

User = get_user_model()


class Production(models.Model):
    STATUS_CHOICES = [
        ('Planned', 'Planned'),
        ('In Progress', 'In Progress'),
        ('Completed', 'Completed'),
        ('Cancelled', 'Cancelled'),
    ]

    finished_product = models.ForeignKey(
        Item, 
        on_delete=models.CASCADE, 
        related_name='productions',
        limit_choices_to={'item_type': 'finished_product'}
    )
    quantity_to_produce = models.PositiveIntegerField()
    quantity_produced = models.PositiveIntegerField(default=0)
    production_date = models.DateField(auto_now_add=True, db_index=True)
    completion_date = models.DateField(null=True, blank=True)
    status = models.CharField(max_length=20, choices=STATUS_CHOICES, default='Planned', db_index=True)
    production_cost = models.DecimalField(max_digits=10, decimal_places=2, default=0)
    notes = models.TextField(blank=True)
    created_by = models.ForeignKey(User, on_delete=models.CASCADE)
    created_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ['-production_date']

    def __str__(self):
        return f"Production #{self.id} - {self.finished_product.name} ({self.quantity_to_produce})"

    def complete_production(self):
        """Complete production and update stock"""
        if self.status == 'Completed':
            raise ValidationError('Production is already completed.')
        
        with transaction.atomic():
            # Update finished product stock
            self.finished_product.current_stock += self.quantity_to_produce
            self.finished_product.save()
            
            # Create stock transaction
            StockTransaction.objects.create(
                item=self.finished_product,
                transaction_type='IN',
                quantity=self.quantity_to_produce,
                reference_number=f'PROD-{self.id}',
                notes=f'Production completed - {self.notes}',
                created_by=self.created_by
            )
            
            # Update production status
            self.status = 'Completed'
            self.quantity_produced = self.quantity_to_produce
            self.completion_date = models.DateField.auto_now_add
            self.save()


class ProductionMaterial(models.Model):
    """Raw materials used in production"""
    production = models.ForeignKey(Production, on_delete=models.CASCADE, related_name='materials')
    raw_material = models.ForeignKey(
        Item,
        on_delete=models.CASCADE,
        limit_choices_to={'item_type': 'raw_material'}
    )
    quantity_required = models.PositiveIntegerField()
    quantity_used = models.PositiveIntegerField(default=0)
    cost_per_unit = models.DecimalField(max_digits=10, decimal_places=2)

    class Meta:
        unique_together = ['production', 'raw_material']

    def __str__(self):
        return f"{self.raw_material.name} for Production #{self.production.id}"

    @property
    def total_cost(self):
        return self.quantity_used * self.cost_per_unit