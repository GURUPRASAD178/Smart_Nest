from django.db import models

class SensorReading(models.Model):
    device_id = models.CharField(max_length=100, db_index=True)
    temperature = models.FloatField()
    humidity = models.FloatField()
    heat_index = models.FloatField(null=True, blank=True)
    recorded_at = models.DateTimeField(auto_now_add=True)

    class Meta:
        ordering = ["-recorded_at"]

    def __str__(self):
        return f"{self.device_id}: {self.temperature} C"
