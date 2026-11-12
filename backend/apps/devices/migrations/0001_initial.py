# Generated for SmartNest initial schema.
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="Device",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=100)),
                ("device_type", models.CharField(choices=[("light", "Light"), ("fan", "Fan"), ("plug", "Smart Plug"), ("sensor", "Sensor")], default="light", max_length=20)),
                ("state", models.CharField(choices=[("on", "On"), ("off", "Off")], default="off", max_length=3)),
                ("is_simulated", models.BooleanField(default=True)),
                ("is_online", models.BooleanField(default=True)),
                ("rated_power_watts", models.PositiveIntegerField(default=9)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
            ],
        ),
    ]
