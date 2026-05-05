from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rent", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="tenant_phone",
            field=models.CharField(blank=True, default="", max_length=50),
        ),
    ]

