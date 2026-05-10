from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0003_afn_currency_defaults'),
    ]

    operations = [
        migrations.AddField(
            model_name='systemsettings',
            name='backup_auto_enabled',
            field=models.BooleanField(default=False),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='backup_frequency',
            field=models.CharField(
                choices=[
                    ('daily', 'Daily'),
                    ('weekly', 'Weekly'),
                    ('monthly', 'Monthly'),
                    ('yearly', 'Yearly'),
                ],
                default='daily',
                max_length=20,
            ),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='backup_include_excel',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='backup_include_sql',
            field=models.BooleanField(default=True),
        ),
        migrations.AddField(
            model_name='systemsettings',
            name='backup_last_auto_run_at',
            field=models.DateTimeField(blank=True, null=True),
        ),
    ]
