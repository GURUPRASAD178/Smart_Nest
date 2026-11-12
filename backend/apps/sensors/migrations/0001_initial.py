# Generated for SmartNest initial schema.
from django.db import migrations, models

class Migration(migrations.Migration):
    initial = True
    dependencies = []
    operations = [
        migrations.CreateModel(
            name="SensorReading",
            fields=[
                ("id", models.BigAutoField(auto_created=True, primary_key=True, serialize=False, verbose_name="ID")),
                ("device_id", models.CharField(db_index=True, max_length=100)),
                ("temperature", models.FloatField()),
                ("humidity", models.FloatField()),
                ("heat_index", models.FloatField(blank=True, null=True)),
                ("recorded_at", models.DateTimeField(auto_now_add=True)),
            ],
            options={"ordering": ["-recorded_at"]},
        ),
    ]
