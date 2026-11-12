from django.db import models

class Device(models.Model):
    DEVICE_TYPES = [
        ("light", "Light"),
        ("fan", "Fan"),
        ("plug", "Smart Plug"),
        ("buzzer", "Buzzer"),
        ("sensor", "Sensor"),
    ]
    STATES = [("on", "On"), ("off", "Off")]
    name = models.CharField(max_length=100)
    room = models.CharField(max_length=60, default="Unassigned")
    device_type = models.CharField(max_length=20, choices=DEVICE_TYPES, default="light")
    state = models.CharField(max_length=3, choices=STATES, default="off")
    is_simulated = models.BooleanField(default=True)
    is_online = models.BooleanField(default=True)
    rated_power_watts = models.PositiveIntegerField(default=9)
    brightness = models.PositiveSmallIntegerField(null=True, blank=True)
    fan_speed = models.PositiveSmallIntegerField(null=True, blank=True)
    created_at = models.DateTimeField(auto_now_add=True)

    def __str__(self):
        return self.name
