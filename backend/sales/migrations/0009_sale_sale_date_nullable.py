# Allow cleared / optional bill date on sale

import django.utils.timezone
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0008_alter_sale_sale_date'),
    ]

    operations = [
        migrations.AlterField(
            model_name='sale',
            name='sale_date',
            field=models.DateTimeField(
                blank=True,
                db_index=True,
                default=django.utils.timezone.now,
                null=True,
            ),
        ),
    ]
