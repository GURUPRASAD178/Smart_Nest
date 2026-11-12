from django.test import TestCase
from django.test import override_settings
from rest_framework.test import APIClient
from apps.devices.models import Device
from apps.automation.models import AutomationRule
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

    def test_new_sensor_reading_automatically_evaluates_enabled_rules(self):
        fan = Device.objects.create(name="Automatic fan", device_type="fan", state="off")
        AutomationRule.objects.create(
            name="Warm room fan",
            sensor="temperature",
            operator="gte",
            threshold=25,
            device=fan,
            target_state="on",
        )

        response = self.client.post("/api/sensors/readings/", {
            "device_id": "arduino-dht11",
            "temperature": 26,
            "humidity": 50,
        }, format="json")

        self.assertEqual(response.status_code, 201)
        fan.refresh_from_db()
        self.assertEqual(fan.state, "on")

    def test_health_reports_demo_data_availability(self):
        response = self.client.get("/api/health/")

        self.assertEqual(response.status_code, 200)
        self.assertIsInstance(response.data["demo_data_enabled"], bool)

    def test_invalid_humidity_rejected(self):
        response = self.client.post("/api/sensors/readings/", {
            "device_id": "arduino-dht11", "temperature": 26.2, "humidity": 120
        }, format="json")
        self.assertEqual(response.status_code, 400)

    def test_simulate_creates_a_valid_demo_reading(self):
        response = self.client.post("/api/sensors/simulate/", {}, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["device_id"], "demo-dht11")
        self.assertGreaterEqual(response.data["temperature"], 20)
        self.assertLessEqual(response.data["temperature"], 28)
        self.assertGreaterEqual(response.data["humidity"], 44)
        self.assertLessEqual(response.data["humidity"], 60)
        self.assertEqual(SensorReading.objects.count(), 1)

    @override_settings(DEMO_DATA_ENABLED=False)
    def test_simulation_can_be_disabled(self):
        response = self.client.post("/api/sensors/simulate/", {}, format="json")

        self.assertEqual(response.status_code, 403)
        self.assertEqual(SensorReading.objects.count(), 0)
