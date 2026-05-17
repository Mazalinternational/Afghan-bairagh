from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0013_quotation_manual_serial_no'),
    ]

    operations = [
        migrations.AddField(
            model_name='order',
            name='discount',
            field=models.DecimalField(decimal_places=2, default=0, max_digits=10),
        ),
    ]
