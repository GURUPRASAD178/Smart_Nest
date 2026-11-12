from django.contrib import admin
from django.urls import path, include
from rest_framework.decorators import api_view, permission_classes
from rest_framework.permissions import AllowAny
from rest_framework.response import Response

@api_view(["GET"])
@permission_classes([AllowAny])
def health(_request):
    return Response({"status": "ok", "service": "smartnest-api"})

urlpatterns = [
    path("admin/", admin.site.urls),
    path("api/health/", health),
    path("api/devices/", include("apps.devices.urls")),
    path("api/sensors/", include("apps.sensors.urls")),
    path("api/automation/", include("apps.automation.urls")),
    path("api/analytics/", include("apps.analytics.urls")),
]
