from rest_framework import serializers
from .models import Device

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = ["id", "name", "device_type", "state", "is_simulated", "is_online", "rated_power_watts", "created_at"]
        read_only_fields = ["id", "created_at"]
