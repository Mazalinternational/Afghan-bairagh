from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0011_directsaleitem_flag_size_quality_design_type'),
    ]

    operations = [
        migrations.AlterField(
            model_name='directsale',
            name='sale_date',
            field=models.DateTimeField(blank=True, db_index=True, default=django.utils.timezone.now, null=True),
        ),
    ]
