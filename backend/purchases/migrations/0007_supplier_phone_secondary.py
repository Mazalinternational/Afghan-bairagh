from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0006_merge_20260415_1211'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplier',
            name='phone_secondary',
            field=models.CharField(blank=True, default='', max_length=15),
        ),
    ]
