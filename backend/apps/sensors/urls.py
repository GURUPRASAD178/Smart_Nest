from django.urls import path
from .views import (
    MotionEventListCreateView,
    SensorReadingListCreateView,
    simulate_motion,
    simulate_reading,
)

urlpatterns = [
    path("readings/", SensorReadingListCreateView.as_view(), name="sensor-readings"),
    path("simulate/", simulate_reading, name="simulate-reading"),
    path("motion/", MotionEventListCreateView.as_view(), name="motion-events"),
    path("motion/simulate/", simulate_motion, name="simulate-motion"),
]
