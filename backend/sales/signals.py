from django.db.models.signals import post_save, post_delete
from django.dispatch import receiver
from .models import Sale, SalePayment


@receiver(post_save, sender=SalePayment)
def update_sale_on_payment(sender, instance, **kwargs):
    """When a sale payment is saved, update the sale's due amount"""
    sale = instance.sale
    sale.update_due()


@receiver(post_delete, sender=SalePayment)
def update_sale_due_on_payment_delete(sender, instance, **kwargs):
    """When a sale payment is deleted, update the sale's due amount"""
    if instance.sale_id:
        sale = Sale.objects.filter(pk=instance.sale_id).first()
        if sale:
            sale.update_due()
