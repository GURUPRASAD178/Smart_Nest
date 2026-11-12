from rest_framework import viewsets, status
from rest_framework.decorators import action
from rest_framework.response import Response
from .models import Device
from .serializers import DeviceCommandSerializer, DeviceSerializer

class DeviceViewSet(viewsets.ModelViewSet):
    queryset = Device.objects.all().order_by("id")
    serializer_class = DeviceSerializer

    @action(detail=True, methods=["post"], url_path="command")
    def command(self, request, pk=None):
        device = self.get_object()
        if not device.is_online:
            return Response({"error": "Device is offline."}, status=status.HTTP_409_CONFLICT)
        serializer = DeviceCommandSerializer(data=request.data, context={"device": device})
        serializer.is_valid(raise_exception=True)
        for field, value in serializer.validated_data.items():
            setattr(device, field, value)
        device.save(update_fields=list(serializer.validated_data))
        return Response(self.get_serializer(device).data)

    @action(detail=False, methods=["post"], url_path="bulk-command")
    def bulk_command(self, request):
        state = request.data.get("state")
        if state not in ("on", "off"):
            return Response(
                {"error": "state must be 'on' or 'off'."},
                status=status.HTTP_400_BAD_REQUEST,
            )
        controllable = self.get_queryset().exclude(device_type="sensor")
        updated = controllable.filter(is_online=True).update(state=state)
        skipped_offline = controllable.filter(is_online=False).count()
        return Response({
            "state": state,
            "updated": updated,
            "skipped_offline": skipped_offline,
        })
