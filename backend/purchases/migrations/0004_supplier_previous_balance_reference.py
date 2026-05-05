# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0003_add_supplier_previous_balance'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplier',
            name='previous_balance_reference',
            field=models.CharField(blank=True, help_text='Reference number for previous balance', max_length=100),
        ),
    ]
