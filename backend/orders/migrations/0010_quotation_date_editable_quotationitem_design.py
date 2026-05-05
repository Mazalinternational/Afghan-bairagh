from django.db import migrations, models
import django.utils.timezone


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0009_quotation_quotationitem'),
    ]

    operations = [
        migrations.AddField(
            model_name='quotationitem',
            name='quality_design_type',
            field=models.CharField(blank=True, max_length=200),
        ),
        migrations.AlterField(
            model_name='quotation',
            name='quotation_date',
            field=models.DateTimeField(db_index=True, default=django.utils.timezone.now),
        ),
    ]
