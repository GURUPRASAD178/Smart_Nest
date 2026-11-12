from django.db import models
from apps.devices.models import Device

class AutomationRule(models.Model):
    SENSORS = [("temperature", "Temperature"), ("humidity", "Humidity")]
    OPERATORS = [("gt", ">"), ("gte", ">="), ("lt", "<"), ("lte", "<=")]
    STATES = [("on", "On"), ("off", "Off")]
    name = models.CharField(max_length=120)
    sensor = models.CharField(max_length=20, choices=SENSORS)
    operator = models.CharField(max_length=3, choices=OPERATORS)
    threshold = models.FloatField()
    release_threshold = models.FloatField(null=True, blank=True)
    calibration_percent = models.PositiveSmallIntegerField(default=100)
    device = models.ForeignKey(Device, on_delete=models.CASCADE, related_name="automation_rules")
    target_state = models.CharField(max_length=3, choices=STATES)
    enabled = models.BooleanField(default=True)
    created_at = models.DateTimeField(auto_now_add=True)
