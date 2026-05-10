from django.db import migrations


def sync_superuser_roles(apps, schema_editor):
    User = apps.get_model('core', 'User')
    User.objects.filter(is_superuser=True).exclude(role='admin').update(role='admin')


class Migration(migrations.Migration):

    dependencies = [
        ('core', '0004_system_settings_backup_fields'),
    ]

    operations = [
        migrations.RunPython(sync_superuser_roles, migrations.RunPython.noop),
    ]
