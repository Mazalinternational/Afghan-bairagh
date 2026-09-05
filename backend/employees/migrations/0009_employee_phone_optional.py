from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0008_employee_salary_notes'),
    ]

    operations = [
        migrations.AlterField(
            model_name='employee',
            name='phone',
            field=models.CharField(blank=True, default='', max_length=15),
        ),
    ]
