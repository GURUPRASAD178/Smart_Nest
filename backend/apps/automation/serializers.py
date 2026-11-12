from rest_framework import serializers
from .models import AutomationRule

class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = [
            "id", "name", "sensor", "operator", "threshold", "release_threshold",
            "calibration_percent", "device", "target_state", "enabled", "created_at",
        ]
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
        operator = attrs.get("operator", getattr(self.instance, "operator", None))
        release_threshold = attrs.get(
            "release_threshold",
            getattr(self.instance, "release_threshold", None),
        )
        calibration_percent = attrs.get(
            "calibration_percent",
            getattr(self.instance, "calibration_percent", 100),
        )
        ranges = {"temperature": (-20, 80), "humidity": (0, 100)}

        if sensor in ranges and threshold is not None:
            minimum, maximum = ranges[sensor]
            if not minimum <= threshold <= maximum:
                raise serializers.ValidationError({
                    "threshold": f"Threshold for {sensor} must be between {minimum} and {maximum}."
                })

            if release_threshold is None and operator:
                gap = 1 if sensor == "temperature" else 5
                if operator in ("gt", "gte"):
                    release_threshold = max(minimum, threshold - gap)
                else:
                    release_threshold = min(maximum, threshold + gap)
                attrs["release_threshold"] = release_threshold
            elif release_threshold is not None:
                if not minimum <= release_threshold <= maximum:
                    raise serializers.ValidationError({
                        "release_threshold": f"Reset threshold for {sensor} must be between {minimum} and {maximum}."
                    })
                if operator in ("gt", "gte") and release_threshold > threshold:
                    raise serializers.ValidationError({
                        "release_threshold": "For a high-value trigger, the reset threshold must not exceed the trigger."
                    })
                if operator in ("lt", "lte") and release_threshold < threshold:
                    raise serializers.ValidationError({
                        "release_threshold": "For a low-value trigger, the reset threshold must not be below the trigger."
                    })

        if not 1 <= calibration_percent <= 100:
            raise serializers.ValidationError({
                "calibration_percent": "Calibration must be between 1 and 100 percent."
            })
        return attrs
