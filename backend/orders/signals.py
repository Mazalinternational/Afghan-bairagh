from django.db.models.signals import post_save, post_delete
from django.db.models import Sum
from django.dispatch import receiver
from .models import Order, Payment
from core.models import AuditLog
from core.context import get_current_user


def _order_due_amount(order):
    """Computed due: total_estimated_amount - sum of payments."""
    total_paid = order.payments.aggregate(s=Sum('amount_paid'))['s'] or 0
    return max(0, float(order.total_estimated_amount) - float(total_paid))


@receiver(post_save, sender=Payment)
def update_order_on_payment(sender, instance, created, **kwargs):
    order = instance.order
    order.update_due()
    if created:
        old_status = order.status
        new_due = _order_due_amount(order)
        try:
            AuditLog.objects.create(
                user=get_current_user(),
                action='ORDER_PAYMENT_RECEIVED',
                details={
                    'order_id': order.id,
                    'payment_id': instance.id,
                    'amount': float(instance.amount_paid),
                    'old_status': old_status,
                    'new_status': order.status,
                    'new_due': new_due,
                }
            )
        except Exception:
            pass


@receiver(post_delete, sender=Payment)
def update_order_due_on_payment_delete(sender, instance, **kwargs):
    if instance.order_id:
        order = Order.objects.filter(pk=instance.order_id).first()
        if order:
            order.update_due()