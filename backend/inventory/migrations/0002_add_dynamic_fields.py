# Generated migration for dynamic fields

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('inventory', '0001_initial'),  # Adjust based on your last migration
    ]

    operations = [
        migrations.AddField(
            model_name='item',
            name='flag_size',
            field=models.CharField(blank=True, help_text='For Flag category', max_length=50),
        ),
        migrations.AddField(
            model_name='item',
            name='size',
            field=models.CharField(blank=True, choices=[('small', 'Small'), ('large', 'Large')], help_text='For Flag Stand category', max_length=20),
        ),
    ]
