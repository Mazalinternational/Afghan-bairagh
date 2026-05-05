from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('employees', '0002_tip'),
    ]

    operations = [
        migrations.AddField(
            model_name='salarypayment',
            name='period_type',
            field=models.CharField(
                max_length=10,
                choices=[('monthly', 'Monthly'), ('weekly', 'Weekly')],
                default='monthly',
                db_index=True,
            ),
        ),
        migrations.AlterUniqueTogether(
            name='salarypayment',
            unique_together={('employee', 'month', 'period_type')},
        ),
    ]

