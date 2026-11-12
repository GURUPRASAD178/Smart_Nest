from django.urls import path
from .views import SensorReadingListCreateView
urlpatterns = [path("readings/", SensorReadingListCreateView.as_view(), name="sensor-readings")]
