from django.db import migrations, models


class Migration(migrations.Migration):

    dependencies = [
        ("rent", "0001_initial"),
    ]

    operations = [
        migrations.AddField(
            model_name="shop",
            name="owner_name",
            field=models.CharField(
                blank=True,
                default="",
                help_text="Landlord / property owner you pay rent to",
                max_length=255,
            ),
        ),
    ]
