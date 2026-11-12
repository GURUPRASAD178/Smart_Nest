from django.db.models import Avg, Min, Max, Count
from rest_framework.decorators import api_view
from rest_framework.response import Response
from apps.sensors.models import SensorReading
from apps.devices.models import Device

@api_view(["GET"])
def summary(_request):
    readings = SensorReading.objects.all()
    aggregate = readings.aggregate(
        count=Count("id"), avg_temperature=Avg("temperature"),
        avg_humidity=Avg("humidity"), min_temperature=Min("temperature"),
        max_temperature=Max("temperature"),
    )
    devices = Device.objects.all()
    estimated_watts = sum(d.rated_power_watts for d in devices if d.state == "on")
    return Response({
        "readings": aggregate,
        "device_count": devices.count(),
        "devices_on": devices.filter(state="on").count(),
        "estimated_active_power_watts": estimated_watts,
        "energy_note": "Active power estimate only; kWh requires tracking on-time. Not a meter reading."
    })
