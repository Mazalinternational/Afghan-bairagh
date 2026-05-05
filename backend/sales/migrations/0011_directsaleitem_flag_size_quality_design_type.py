from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('sales', '0010_alter_sale_options'),
    ]

    operations = [
        migrations.AddField(
            model_name='directsaleitem',
            name='flag_size',
            field=models.CharField(blank=True, default='', max_length=100),
        ),
        migrations.AddField(
            model_name='directsaleitem',
            name='quality_design_type',
            field=models.CharField(blank=True, default='', max_length=255),
        ),
    ]
