from datetime import date
from decimal import Decimal

from django.db import migrations, models
from django.utils import timezone


def set_salary_effective_dates(apps, schema_editor):
    Employee = apps.get_model('employees', 'Employee')
    for emp in Employee.objects.all():
        if not emp.salary_effective_date:
            emp.salary_effective_date = emp.join_date
        if emp.previous_salary is None:
            emp.previous_salary = emp.salary
        emp.save(update_fields=['salary_effective_date', 'previous_salary'])


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0006_alter_salarypayment_payment_date'),
    ]

    operations = [
        migrations.AddField(
            model_name='employee',
            name='previous_salary',
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text='Salary rate before the latest change',
                max_digits=10,
                null=True,
            ),
        ),
        migrations.AddField(
            model_name='employee',
            name='salary_effective_date',
            field=models.DateField(
                blank=True,
                db_index=True,
                help_text='Date from which the current salary amount applies',
                null=True,
            ),
        ),
        migrations.AlterField(
            model_name='loan',
            name='loan_date',
            field=models.DateField(db_index=True, default=timezone.localdate),
        ),
        migrations.RunPython(set_salary_effective_dates, migrations.RunPython.noop),
    ]
