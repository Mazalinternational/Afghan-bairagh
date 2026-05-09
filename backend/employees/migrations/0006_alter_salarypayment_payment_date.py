import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0005_salarydepositentry'),
    ]

    operations = [
        migrations.AlterField(
            model_name='salarypayment',
            name='payment_date',
            field=models.DateField(
                db_index=True,
                default=django.utils.timezone.localdate,
                help_text='Calendar date this salary was paid (week/month settlement date)',
            ),
        ),
    ]
