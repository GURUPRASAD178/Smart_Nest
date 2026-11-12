from rest_framework import serializers
from .models import Device

class DeviceSerializer(serializers.ModelSerializer):
    class Meta:
        model = Device
        fields = [
            "id", "name", "room", "device_type", "state", "is_simulated",
            "is_online", "rated_power_watts", "brightness", "fan_speed", "created_at",
        ]
        read_only_fields = ["id", "created_at"]

    def validate(self, attrs):
        device_type = attrs.get("device_type", getattr(self.instance, "device_type", "light"))
        brightness = attrs.get("brightness", getattr(self.instance, "brightness", None))
        fan_speed = attrs.get("fan_speed", getattr(self.instance, "fan_speed", None))

        if brightness is not None:
            if device_type != "light":
                raise serializers.ValidationError({"brightness": "Brightness is only available for lights."})
            if not 0 <= brightness <= 100:
                raise serializers.ValidationError({"brightness": "Brightness must be between 0 and 100."})
        if fan_speed is not None:
            if device_type != "fan":
                raise serializers.ValidationError({"fan_speed": "Fan speed is only available for fans."})
            if not 1 <= fan_speed <= 3:
                raise serializers.ValidationError({"fan_speed": "Fan speed must be between 1 and 3."})
        return attrs

    def create(self, validated_data):
        device_type = validated_data.get("device_type", "light")
        power_defaults = {"light": 9, "fan": 55, "plug": 120, "buzzer": 2, "sensor": 1}
        validated_data.setdefault("rated_power_watts", power_defaults[device_type])
        if device_type == "light":
            validated_data.setdefault("brightness", 100)
        elif device_type == "fan":
            validated_data.setdefault("fan_speed", 1)
        elif device_type == "sensor":
            validated_data.setdefault("state", "on")
        return super().create(validated_data)


class DeviceCommandSerializer(serializers.Serializer):
    state = serializers.ChoiceField(choices=("on", "off"), required=False)
    brightness = serializers.IntegerField(min_value=0, max_value=100, required=False)
    fan_speed = serializers.IntegerField(min_value=1, max_value=3, required=False)

    def validate(self, attrs):
        device = self.context["device"]
        if not attrs:
            raise serializers.ValidationError("Provide a state or device control.")
        if device.device_type == "sensor":
            raise serializers.ValidationError({"error": "Sensor devices cannot be controlled."})
        if "brightness" in attrs and device.device_type != "light":
            raise serializers.ValidationError({"brightness": "Brightness is only available for lights."})
        if "fan_speed" in attrs and device.device_type != "fan":
            raise serializers.ValidationError({"fan_speed": "Fan speed is only available for fans."})
        return attrs
