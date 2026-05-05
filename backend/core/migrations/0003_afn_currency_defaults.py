from django.db import migrations, models


def normalize_currency_to_afn(apps, schema_editor):
    SystemSettings = apps.get_model('core', 'SystemSettings')
    for row in SystemSettings.objects.all():
        updated = False
        if row.currency_symbol == '$':
            row.currency_symbol = 'AFN'
            updated = True
        if row.primary_currency == 'USD':
            row.primary_currency = 'AFN'
            updated = True
        if updated:
            row.save()


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0002_user_permissions'),
    ]

    operations = [
        migrations.AlterField(
            model_name='systemsettings',
            name='primary_currency',
            field=models.CharField(default='AFN', max_length=10),
        ),
        migrations.AlterField(
            model_name='systemsettings',
            name='currency_symbol',
            field=models.CharField(default='AFN', max_length=5),
        ),
        migrations.RunPython(normalize_currency_to_afn, migrations.RunPython.noop),
    ]
