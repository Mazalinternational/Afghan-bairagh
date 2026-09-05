from django.db import migrations, models
import django.core.validators


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0006_customer_manual_serial_no'),
    ]

    operations = [
        migrations.AlterField(
            model_name='customer',
            name='phone',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                max_length=15,
                validators=[django.core.validators.RegexValidator('^\\+?1?\\d{9,15}$')],
            ),
        ),
    ]
