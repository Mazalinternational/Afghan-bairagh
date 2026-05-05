# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='previous_balance_reference',
            field=models.CharField(blank=True, help_text='Reference number for previous balance', max_length=100),
        ),
    ]
