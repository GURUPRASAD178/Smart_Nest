from rest_framework import generics
from rest_framework.permissions import AllowAny
from .models import SensorReading
from .serializers import SensorReadingSerializer

class SensorReadingListCreateView(generics.ListCreateAPIView):
    queryset = SensorReading.objects.all()[:500]
    serializer_class = SensorReadingSerializer
    permission_classes = [AllowAny]
