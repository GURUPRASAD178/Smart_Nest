# Generated for SmartNest initial schema.
import django.db.models.deletion
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = [("devices", "0001_initial")]
    operations = [
        migrations.CreateModel(
            name="AutomationRule",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("name", models.CharField(max_length=120)),
                ("sensor", models.CharField(choices=[("temperature", "Temperature"), ("humidity", "Humidity")], max_length=20)),
                ("operator", models.CharField(choices=[("gt", ">"), ("gte", ">="), ("lt", "<"), ("lte", "<=")], max_length=3)),
                ("threshold", models.FloatField()),
                ("target_state", models.CharField(choices=[("on", "On"), ("off", "Off")], max_length=3)),
                ("enabled", models.BooleanField(default=True)),
                ("created_at", models.DateTimeField(auto_now_add=True)),
                ("device", models.ForeignKey(on_delete=django.db.models.deletion.CASCADE, related_name="automation_rules", to="devices.device")),
            ],
        ),
    ]
