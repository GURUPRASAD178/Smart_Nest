from rest_framework import serializers
from .models import AutomationRule

class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = ["id", "name", "sensor", "operator", "threshold", "device", "target_state", "enabled", "created_at"]
        read_only_fields = ["id", "created_at"]

    def validate_device(self, device):
        if device.device_type == "sensor":
            raise serializers.ValidationError("Automation rules must target a controllable device.")
        if not device.is_online:
            raise serializers.ValidationError("Automation rules must target an online device.")
        return device

    def validate(self, attrs):
        sensor = attrs.get("sensor", getattr(self.instance, "sensor", None))
        threshold = attrs.get("threshold", getattr(self.instance, "threshold", None))
        ranges = {"temperature": (-20, 80), "humidity": (0, 100)}
        if sensor in ranges and threshold is not None:
            minimum, maximum = ranges[sensor]
            if not minimum <= threshold <= maximum:
                raise serializers.ValidationError({
                    "threshold": f"Threshold for {sensor} must be between {minimum} and {maximum}."
                })
        return attrs
