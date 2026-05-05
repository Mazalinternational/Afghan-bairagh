# Generated manually

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('purchases', '0002_add_stock_distributions'),
    ]

    operations = [
        migrations.AddField(
            model_name='supplier',
            name='previous_balance',
            field=models.DecimalField(decimal_places=2, default=0, help_text='Balance before system implementation', max_digits=12),
        ),
        migrations.CreateModel(
            name='SupplierBalancePayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_date', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('notes', models.TextField(blank=True)),
                ('supplier', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='balance_payments', to='purchases.supplier')),
            ],
            options={
                'ordering': ['-payment_date'],
            },
        ),
    ]
