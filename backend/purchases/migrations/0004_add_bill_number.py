# Generated migration for adding bill_number field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0003_add_supplier_previous_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='purchase',
            name='bill_number',
            field=models.CharField(blank=True, help_text="Supplier's bill/invoice number", max_length=100),
        ),
    ]
