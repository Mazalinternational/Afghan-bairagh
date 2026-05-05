from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ('orders', '0004_remove_order_customer_name_and_more'),
    ]

    operations = [
        migrations.AddField(
            model_name='orderitem',
            name='delivered_quantity',
            field=models.PositiveIntegerField(default=0, help_text='Quantity already delivered to customer'),
        ),
    ]

