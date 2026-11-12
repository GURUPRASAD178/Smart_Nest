from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.sensors.models import SensorReading
from .models import AutomationRule
from .serializers import AutomationRuleSerializer

class AutomationRuleViewSet(viewsets.ModelViewSet):
    queryset = AutomationRule.objects.select_related("device").all().order_by("id")
    serializer_class = AutomationRuleSerializer

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate(self, request):
        reading = SensorReading.objects.first()
        if reading is None:
            return Response({"evaluated": 0, "actions": [], "message": "No sensor readings available yet."})
        actions = []
        for rule in self.get_queryset().filter(enabled=True):
            value = getattr(reading, rule.sensor)
            passed = {"gt": value > rule.threshold, "gte": value >= rule.threshold,
                      "lt": value < rule.threshold, "lte": value <= rule.threshold}[rule.operator]
            if passed and rule.device.state != rule.target_state:
                rule.device.state = rule.target_state
                rule.device.save(update_fields=["state"])
                actions.append({"rule_id": rule.id, "device_id": rule.device_id, "state": rule.target_state})
        return Response({"evaluated": self.get_queryset().filter(enabled=True).count(), "actions": actions})
