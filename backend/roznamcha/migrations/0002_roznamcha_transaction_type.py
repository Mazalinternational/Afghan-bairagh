# Generated migration for adding transaction_type field

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('roznamcha', '0001_initial'),
    ]

    operations = [
        migrations.AddField(
            model_name='roznamcha',
            name='transaction_type',
            field=models.CharField(
                choices=[('debit', 'Debit'), ('credit', 'Credit')],
                default='debit',
                max_length=10,
                db_index=True
            ),
        ),
        migrations.AddIndex(
            model_name='roznamcha',
            index=models.Index(fields=['transaction_type', 'date'], name='roznamcha_r_transac_idx'),
        ),
    ]
