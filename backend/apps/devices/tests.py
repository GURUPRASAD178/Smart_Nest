from django.test import TestCase
from rest_framework.test import APIClient
from .models import Device

class DeviceApiTests(TestCase):
    def setUp(self):
        self.client = APIClient()
        self.device = Device.objects.create(name="Test light", device_type="light")

    def test_list_devices(self):
        response = self.client.get("/api/devices/")
        self.assertEqual(response.status_code, 200)
        self.assertEqual(len(response.data), 1)

    def test_command_updates_state(self):
        response = self.client.post(f"/api/devices/{self.device.id}/command/", {"state": "on"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.device.refresh_from_db()
        self.assertEqual(self.device.state, "on")

    def test_invalid_command_is_rejected(self):
        response = self.client.post(f"/api/devices/{self.device.id}/command/", {"state": "maybe"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.device.refresh_from_db()
        self.assertEqual(self.device.state, "off")

    def test_sensor_cannot_be_switched(self):
        sensor = Device.objects.create(name="DHT11", device_type="sensor")
        response = self.client.post(f"/api/devices/{sensor.id}/command/", {"state": "on"}, format="json")
        self.assertEqual(response.status_code, 400)
