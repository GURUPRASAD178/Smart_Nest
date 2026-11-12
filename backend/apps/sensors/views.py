import math
import random
import time

from django.conf import settings
from django.db import transaction
from rest_framework import generics
from rest_framework import status
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response
from apps.automation.services import evaluate_reading
from .models import SensorReading
from .serializers import SensorReadingSerializer


class SensorReadingListCreateView(generics.ListCreateAPIView):
    queryset = SensorReading.objects.all()[:500]
    serializer_class = SensorReadingSerializer
    permission_classes = [AllowAny]

    @transaction.atomic
    def perform_create(self, serializer):
        reading = serializer.save()
        evaluate_reading(reading)


@api_view(["POST"])
@permission_classes([AllowAny])
def simulate_reading(_request):
    if not settings.DEMO_DATA_ENABLED:
        return Response(
            {"detail": "Demo sensor data is disabled."},
            status=status.HTTP_403_FORBIDDEN,
        )

    phase = time.time() / 30
    temperature = round(24 + math.sin(phase) * 2 + random.uniform(-0.2, 0.2), 1)
    humidity = round(52 + math.sin(phase + 1.5) * 7 + random.uniform(-1, 1), 1)
    with transaction.atomic():
        reading = SensorReading.objects.create(
            device_id="demo-dht11",
            temperature=temperature,
            humidity=humidity,
            heat_index=temperature,
        )
        evaluate_reading(reading)

        stale_ids = list(
            SensorReading.objects.filter(device_id="demo-dht11")
            .order_by("-recorded_at")
            .values_list("id", flat=True)[300:]
        )
        if stale_ids:
            SensorReading.objects.filter(id__in=stale_ids).delete()

    return Response(
        SensorReadingSerializer(reading).data,
        status=status.HTTP_201_CREATED,
    )
