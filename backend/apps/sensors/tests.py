from django.test import TestCase
from rest_framework.test import APIClient
from .models import SensorReading

class SensorApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()

    def test_create_reading(self):
        response = self.client.post("/api/sensors/readings/", {
            "device_id": "arduino-dht11", "temperature": 26.2, "humidity": 52.0, "heat_index": 26.4
        }, format="json")
        self.assertEqual(response.status_code, 201)
        self.assertEqual(SensorReading.objects.count(), 1)

    def test_invalid_humidity_rejected(self):
        response = self.client.post("/api/sensors/readings/", {
            "device_id": "arduino-dht11", "temperature": 26.2, "humidity": 120
        }, format="json")
        self.assertEqual(response.status_code, 400)
