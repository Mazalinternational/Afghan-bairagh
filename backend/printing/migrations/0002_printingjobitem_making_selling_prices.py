from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('printing', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='printingjobitem',
            name='making_unit_price',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Cost / making price per unit (AFN)',
                max_digits=12,
            ),
        ),
        migrations.AddField(
            model_name='printingjobitem',
            name='selling_unit_price',
            field=models.DecimalField(
                decimal_places=2,
                default=0,
                help_text='Selling price per unit (AFN); line subtotal = qty × this when set',
                max_digits=12,
            ),
        ),
    ]
