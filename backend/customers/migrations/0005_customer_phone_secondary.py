from django.core.validators import RegexValidator
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('customers', '0004_merge_20260415_1211'),
    ]

    operations = [
        migrations.AddField(
            model_name='customer',
            name='phone_secondary',
            field=models.CharField(
                blank=True,
                default='',
                max_length=15,
                validators=[RegexValidator(r'^\+?1?\d{9,15}$')],
            ),
        ),
    ]
