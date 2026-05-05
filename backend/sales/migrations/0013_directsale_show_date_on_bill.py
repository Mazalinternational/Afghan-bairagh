from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0012_alter_directsale_sale_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='directsale',
            name='show_date_on_bill',
            field=models.BooleanField(default=True),
        ),
    ]
