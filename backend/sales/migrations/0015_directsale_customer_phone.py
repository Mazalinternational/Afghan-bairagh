from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0014_directsale_manual_serial_no'),
    ]

    operations = [
        migrations.AddField(
            model_name='directsale',
            name='customer_phone',
            field=models.CharField(blank=True, default='', max_length=15),
        ),
    ]
