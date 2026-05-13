from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0008_purchase_purchase_items'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplier',
            name='manual_serial_no',
            field=models.CharField(
                blank=True,
                db_index=True,
                default='',
                help_text='Manual supplier / ledger serial number',
                max_length=100,
            ),
        ),
    ]
