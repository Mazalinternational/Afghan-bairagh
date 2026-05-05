# Generated manually

import django.db.models.deletion
from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("employees", "0004_alter_salarypayment_month"),
    ]

    operations = [
        migrations.CreateModel(
            name="SalaryDepositEntry",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                (
                    "entry_type",
                    models.CharField(
                        choices=[("hold", "Employee deposited with company"), ("payout", "Paid back to employee")],
                        db_index=True,
                        max_length=10,
                    ),
                ),
                ("amount", models.DecimalField(decimal_places=2, max_digits=12)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("notes", models.TextField(blank=True)),
                (
                    "employee",
                    models.ForeignKey(
                        on_delete=django.db.models.deletion.CASCADE,
                        related_name="salary_deposit_entries",
                        to="employees.employee",
                    ),
                ),
            ],
            options={
                "db_table": "employee_salary_deposit_entries",
                "ordering": ["-created_at"],
            },
        ),
    ]
