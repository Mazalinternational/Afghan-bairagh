# Generated manually for manual serial numbers and cost tracking

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0010_quotation_date_editable_quotationitem_design'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='manual_serial_no',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='Manual order / ledger serial number',
                max_length=100,
            ),
        ),
        migrations.AddField(
            model_name='orderitem',
            name='purchase_unit_cost',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Cost per unit at order time (internal; not printed on customer bill)',
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='quotationitem',
            name='purchase_unit_cost',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Internal purchase/cost per unit; customer line uses price_estimate (sale)',
                max_digits=10,
            ),
        ),
    ]
