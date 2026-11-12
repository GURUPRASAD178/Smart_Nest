from rest_framework import viewsets
from rest_framework.response import Response
from rest_framework.decorators import action
from apps.sensors.models import MotionEvent, SensorReading
from .models import AutomationRule
from .serializers import AutomationRuleSerializer
from .services import evaluate_motion, evaluate_reading

class AutomationRuleViewSet(viewsets.ModelViewSet):
    queryset = AutomationRule.objects.select_related("device").all().order_by("id")
    serializer_class = AutomationRuleSerializer

    @action(detail=False, methods=["post"], url_path="evaluate")
    def evaluate(self, request):
        reading = SensorReading.objects.first()
        motion_event = MotionEvent.objects.first()
        if reading is None and motion_event is None:
            return Response({
                "evaluated": 0,
                "actions": [],
                "skipped_offline": 0,
                "message": "No sensor readings or motion events available yet.",
            })
        results = []
        if reading is not None:
            results.append(evaluate_reading(reading))
        if motion_event is not None:
            results.append(evaluate_motion(motion_event.detected))
        return Response({
            "evaluated": sum(result["evaluated"] for result in results),
            "actions": [action for result in results for action in result["actions"]],
            "skipped_offline": sum(result["skipped_offline"] for result in results),
        })
