from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0007_supplier_phone_secondary'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchase',
            name='purchase_items',
            field=models.JSONField(blank=True, default=list, help_text='Purchase line items, e.g. [{"item_name":"Cloth","quantity":"2.5","unit_cost":"100","line_total":"250"}]'),
        ),
    ]

