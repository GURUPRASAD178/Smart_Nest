from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Device
from .serializers import DeviceSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all().order_by("id")
    serializer_class = DeviceSerializer

    @action(detail=True, methods=["post"], url_path="command")
    def command(self, request, pk=None):
        device = self.get_object()
        state = request.data.get("state")
        if state not in ("on", "off"):
            return Response({"error": "state must be 'on' or 'off'."}, status=status.HTTP_400_BAD_REQUEST)
        if device.device_type == "sensor":
            return Response({"error": "Sensor devices cannot be switched."}, status=status.HTTP_400_BAD_REQUEST)
        device.state = state
        device.save(update_fields=["state"])
        return Response(self.get_serializer(device).data)
