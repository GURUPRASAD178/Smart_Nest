from django.urls import path
from .views import SensorReadingListCreateView, simulate_reading

urlpatterns = [
    path("readings/", SensorReadingListCreateView.as_view(), name="sensor-readings"),
    path("simulate/", simulate_reading, name="simulate-reading"),
]
