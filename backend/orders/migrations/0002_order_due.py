# Generated migration for Order.due

from decimal import Decimal
from django.db import migrations, models


def backfill_order_due(apps, schema_editor):
    Order = apps.get_model('orders', 'Order')
    Payment = apps.get_model('orders', 'Payment')
    for order in Order.objects.all():
        if order.status in ('Delivered', 'Cancelled'):
            order.due = Decimal('0')
        else:
            total_paid = sum(
                p.amount_paid for p in Payment.objects.filter(order_id=order.id)
            )
            order.due = max(Decimal('0'), order.total_estimated_amount - total_paid)
        order.save(update_fields=['due'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='due',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Outstanding amount (total - payments)',
                max_digits=12
            ),
        ),
        migrations.RunPython(backfill_order_due, noop),
    ]
