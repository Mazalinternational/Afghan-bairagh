from django.db import migrations, models
import django.db.models.deletion


class Migration(migrations.Migration):

    initial = True

    dependencies = []

    operations = [
        migrations.CreateModel(
            name='PrintingPrinter',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('name', models.CharField(db_index=True, max_length=200)),
                ('phone', models.CharField(blank=True, max_length=20)),
                ('address', models.TextField(blank=True)),
                ('created_at', models.DateTimeField(auto_now_add=True)),
            ],
            options={'ordering': ['name']},
        ),
        migrations.CreateModel(
            name='PrintingJob',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('bill_number', models.CharField(blank=True, max_length=100)),
                ('job_title', models.CharField(blank=True, max_length=255)),
                ('total_price', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('payment_status', models.CharField(choices=[('paid', 'Paid'), ('partial', 'Partial'), ('due', 'Due')], db_index=True, default='due', max_length=10)),
                ('notes', models.TextField(blank=True)),
                ('job_date', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('updated_at', models.DateTimeField(auto_now=True)),
                ('printer', models.ForeignKey(on_delete=django.db.models.deletion.PROTECT, related_name='jobs', to='printing.printingprinter')),
            ],
            options={'ordering': ['-job_date']},
        ),
        migrations.CreateModel(
            name='PrintingPayment',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('amount', models.DecimalField(decimal_places=2, max_digits=12)),
                ('payment_method', models.CharField(default='cash', max_length=50)),
                ('reference', models.CharField(blank=True, max_length=100)),
                ('notes', models.TextField(blank=True)),
                ('payment_date', models.DateTimeField(auto_now_add=True, db_index=True)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='payments', to='printing.printingjob')),
            ],
            options={'ordering': ['-payment_date']},
        ),
        migrations.CreateModel(
            name='PrintingJobItem',
            fields=[
                ('id', models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name='ID')),
                ('flag_name', models.CharField(max_length=200)),
                ('size', models.CharField(blank=True, max_length=100)),
                ('qty', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('total_meters', models.DecimalField(decimal_places=2, default=0, max_digits=10)),
                ('per_meter_price', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('line_total', models.DecimalField(decimal_places=2, default=0, max_digits=12)),
                ('job', models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name='items', to='printing.printingjob')),
            ],
            options={'ordering': ['id']},
        ),
    ]

