# Generated migration for Sale.due

from decimal import Decimal
from django.db import migrations, models


def backfill_sale_due(apps, schema_editor):
    Sale = apps.get_model('sales', 'Sale')
    SalePayment = apps.get_model('sales', 'SalePayment')
    for sale in Sale.objects.all():
        if sale.status == 'Cancelled':
            sale.due = Decimal('0')
        else:
            total_paid = sum(
                p.amount_paid for p in SalePayment.objects.filter(sale_id=sale.id)
            )
            sale.due = max(Decimal('0'), sale.net_amount - total_paid)
        sale.save(update_fields=['due'])


def noop(apps, schema_editor):
    pass


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='sale',
            name='due',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Outstanding amount (net_amount - payments)',
                max_digits=12
            ),
        ),
        migrations.RunPython(backfill_sale_due, noop),
    ]
