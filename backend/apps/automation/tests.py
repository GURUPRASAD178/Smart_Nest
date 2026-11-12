from django.test import TestCase
from rest_framework.test import APIClient
from apps.devices.models import Device
from apps.sensors.models import SensorReading
from .models import AutomationRule

class AutomationTests(TestCase):
    def test_evaluate_rule_turns_light_on(self):
        client = APIClient()
        device = Device.objects.create(name="Rule light", device_type="light", state="off")
        SensorReading.objects.create(device_id="arduino-dht11", temperature=30, humidity=50, heat_index=31)
        AutomationRule.objects.create(name="Hot room", sensor="temperature", operator="gte",
            threshold=28, device=device, target_state="on")
        response = client.post("/api/automation/rules/evaluate/", {}, format="json")
        self.assertEqual(response.status_code, 200)
        device.refresh_from_db()
        self.assertEqual(device.state, "on")
