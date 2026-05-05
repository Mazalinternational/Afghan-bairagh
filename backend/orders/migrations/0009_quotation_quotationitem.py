# Generated migration for quotations

from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0008_orderitem_manual_item_name_alter_orderitem_item'),
        ('customers', '0003_merge_20260312_1544'),
        ('inventory', '0004_alter_item_unit_price'),
    ]

    operations = [
        migrations.CreateModel(
            name='Quotation',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quotation_date', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('total_amount', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('notes', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('customer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='quotations', to='customers.customer')),
            ],
            options={
                'db_table': 'quotations',
                'ordering': ['-quotation_date'],
            },
        ),
        migrations.CreateModel(
            name='QuotationItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('quantity', models.PositiveIntegerField()),
                ('price_estimate', models.DecimalField(decimal_places=2, max_digits=10)),
                ('flag_size', models.CharField(blank=True, max_length=50)),
                ('manual_item_name', models.CharField(blank=True, max_length=200)),
                ('total', models.DecimalField(decimal_places=2, editable=False, max_digits=12)),
                ('item', models.ForeignKey(blank=True, null=True, on_delete=django.db.models.deletion.PROTECT, related_name='quotation_items', to='inventory.item')),
                ('quotation', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='quotation_items', to='orders.quotation')),
            ],
            options={
                'db_table': 'quotation_items',
            },
        ),
    ]
