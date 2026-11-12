from rest_framework import serializers
from .models import MotionEvent, SensorReading

class SensorReadingSerializer(serializers.ModelSerializer):
    class Meta:
        model = SensorReading
        fields = ["id", "device_id", "temperature", "humidity", "heat_index", "recorded_at"]
        read_only_fields = ["id", "recorded_at"]

    def validate_temperature(self, value):
        if not -20 <= value <= 80:
            raise serializers.ValidationError("temperature must be between -20 and 80 C.")
        return value

    def validate_humidity(self, value):
        if not 0 <= value <= 100:
            raise serializers.ValidationError("humidity must be between 0 and 100%.")
        return value


class MotionEventSerializer(serializers.ModelSerializer):
    class Meta:
        model = MotionEvent
        fields = ["id", "device_id", "detected", "recorded_at"]
        read_only_fields = ["id", "recorded_at"]
