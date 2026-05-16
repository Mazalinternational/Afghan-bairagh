from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("sales", "0013_directsale_show_date_on_bill"),
    ]

    operations = [
        migrations.AddField(
            model_name="directsale",
            name="manual_serial_no",
            field=models.CharField(
                blank=True,
                db_index=True,
                default="",
                help_text="Manual ledger / reference serial number (optional)",
                max_length=100,
            ),
        ),
    ]
