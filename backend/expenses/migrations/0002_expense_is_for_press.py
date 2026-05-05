# Generated migration

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('expenses', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='expense',
            name='is_for_press',
            field=models.BooleanField(default=True, help_text='True if expense is for press, False if for home'),
        ),
    ]
