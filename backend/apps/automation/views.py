from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.sensors.models import SensorReading
from .models import AutomationRule
from .serializers import AutomationRuleSerializer
from .services import evaluate_reading

class AutomationRuleViewSet(viewsets.ModelViewSet):
    queryset = AutomationRule.objects.select_related("device").all().order_by("id")
    serializer_class = AutomationRuleSerializer

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate(self, request):
        reading = SensorReading.objects.first()
        if reading is None:
            return Response({
                "evaluated": 0,
                "actions": [],
                "skipped_offline": 0,
                "message": "No sensor readings available yet.",
            })
        return Response(evaluate_reading(reading))
