# Generated manually

from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("inventory", "0004_alter_item_unit_price"),
    ]

    operations = [
        migrations.AddField(
            model_name="item",
            name="cost_price",
            field=models.DecimalField(
                blank=True,
                decimal_places=2,
                help_text="Purchase / cost per unit (for margin)",
                max_digits=10,
                null=True,
            ),
        ),
    ]
