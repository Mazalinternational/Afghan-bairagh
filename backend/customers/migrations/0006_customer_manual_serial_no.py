from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0005_customer_phone_secondary'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='manual_serial_no',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='Manual customer serial / ledger number',
                max_length=100,
            ),
        ),
    ]
