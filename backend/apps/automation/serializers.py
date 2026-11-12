from rest_framework import serializers
from .models import AutomationRule

class AutomationRuleSerializer(serializers.ModelSerializer):
    class Meta:
        model = AutomationRule
        fields = ["id", "name", "sensor", "operator", "threshold", "device", "target_state", "enabled", "created_at"]
        read_only_fields = ["id", "created_at"]
