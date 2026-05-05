# Generated manually — sale_date editable (no longer auto_now_add)

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0007_alter_directsalepayment_payment_method_and_more'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sale',
            name='sale_date',
            field=models.DateTimeField(db_index=True, default=django.utils.timezone.now),
        ),
    ]
