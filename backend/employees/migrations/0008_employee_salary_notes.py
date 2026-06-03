from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0007_employee_salary_effective_and_loan_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='salary_notes',
            field=models.TextField(blank=True, help_text='History of salary changes'),
        ),
    ]
