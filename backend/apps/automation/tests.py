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

    def test_rule_crud_and_sensor_targets(self):
        client = APIClient()
        light = Device.objects.create(name="Rule target", device_type="light")
        sensor = Device.objects.create(name="Not controllable", device_type="sensor")
        rule_data = {
            "name": "Cool room light",
            "sensor": "temperature",
            "operator": "lte",
            "threshold": 20,
            "device": light.id,
            "target_state": "on",
            "enabled": True,
        }

        created = client.post("/api/automation/rules/", rule_data, format="json")
        self.assertEqual(created.status_code, 201)
        self.assertEqual(created.data["release_threshold"], 21)
        self.assertEqual(created.data["calibration_percent"], 100)
        rule_id = created.data["id"]

        updated = client.patch(
            f"/api/automation/rules/{rule_id}/",
            {"enabled": False},
            format="json",
        )
        self.assertEqual(updated.status_code, 200)
        self.assertFalse(updated.data["enabled"])

        invalid = client.post(
            "/api/automation/rules/",
            {**rule_data, "device": sensor.id},
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)
        invalid_threshold = client.post(
            "/api/automation/rules/",
            {**rule_data, "threshold": 81},
            format="json",
        )
        self.assertEqual(invalid_threshold.status_code, 400)
        invalid_calibration = client.post(
            "/api/automation/rules/",
            {**rule_data, "calibration_percent": 101},
            format="json",
        )
        self.assertEqual(invalid_calibration.status_code, 400)

        deleted = client.delete(f"/api/automation/rules/{rule_id}/")
        self.assertEqual(deleted.status_code, 204)

    def test_evaluation_skips_offline_devices(self):
        client = APIClient()
        device = Device.objects.create(name="Offline light", device_type="light", is_online=False)
        SensorReading.objects.create(device_id="arduino-dht11", temperature=30, humidity=50)
        AutomationRule.objects.create(
            name="Offline light rule",
            sensor="temperature",
            operator="gte",
            threshold=28,
            device=device,
            target_state="on",
        )

        response = client.post("/api/automation/rules/evaluate/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["skipped_offline"], 1)
        device.refresh_from_db()
        self.assertEqual(device.state, "off")

    def test_rule_resets_device_at_release_threshold(self):
        client = APIClient()
        device = Device.objects.create(
            name="Warm room fan",
            device_type="fan",
            state="on",
            fan_speed=3,
        )
        SensorReading.objects.create(device_id="arduino-dht11", temperature=24, humidity=50)
        AutomationRule.objects.create(
            name="Warm room fan rule",
            sensor="temperature",
            operator="gte",
            threshold=25,
            release_threshold=24,
            device=device,
            target_state="on",
        )

        response = client.post("/api/automation/rules/evaluate/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        device.refresh_from_db()
        self.assertEqual(device.state, "off")

    def test_motion_rule_defaults_to_reset_when_beam_clears(self):
        client = APIClient()
        light = Device.objects.create(name="Entry LED", device_type="light")
        rule = client.post(
            "/api/automation/rules/",
            {
                "name": "Entry light",
                "sensor": "motion",
                "operator": "gte",
                "threshold": 1,
                "device": light.id,
                "target_state": "on",
                "enabled": True,
            },
            format="json",
        )
        self.assertEqual(rule.status_code, 201)
        self.assertEqual(rule.data["release_threshold"], 0)

        invalid = client.post(
            "/api/automation/rules/",
            {
                "name": "Invalid motion rule",
                "sensor": "motion",
                "operator": "gte",
                "threshold": 0.5,
                "device": light.id,
                "target_state": "on",
                "enabled": True,
            },
            format="json",
        )
        self.assertEqual(invalid.status_code, 400)

    def test_rule_holds_state_inside_hysteresis_band(self):
        client = APIClient()
        device = Device.objects.create(
            name="Warm room fan",
            device_type="fan",
            state="on",
            fan_speed=2,
        )
        SensorReading.objects.create(device_id="arduino-dht11", temperature=24.5, humidity=50)
        AutomationRule.objects.create(
            name="Warm room fan rule",
            sensor="temperature",
            operator="gte",
            threshold=25,
            release_threshold=24,
            device=device,
            target_state="on",
        )

        response = client.post("/api/automation/rules/evaluate/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["actions"], [])
        device.refresh_from_db()
        self.assertEqual(device.state, "on")

    def test_rule_scales_light_brightness_to_calibration(self):
        client = APIClient()
        device = Device.objects.create(name="Rule light", device_type="light", state="off")
        SensorReading.objects.create(device_id="arduino-dht11", temperature=27.5, humidity=50)
        AutomationRule.objects.create(
            name="Warm room light",
            sensor="temperature",
            operator="gte",
            threshold=25,
            release_threshold=24,
            calibration_percent=50,
            device=device,
            target_state="on",
        )

        response = client.post("/api/automation/rules/evaluate/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        device.refresh_from_db()
        self.assertEqual(device.state, "on")
        self.assertEqual(device.brightness, 30)

    def test_rule_scales_fan_to_discrete_speed(self):
        client = APIClient()
        device = Device.objects.create(name="Rule fan", device_type="fan", state="off")
        SensorReading.objects.create(device_id="arduino-dht11", temperature=27.5, humidity=50)
        AutomationRule.objects.create(
            name="Warm room fan",
            sensor="temperature",
            operator="gte",
            threshold=25,
            release_threshold=24,
            device=device,
            target_state="on",
        )

        response = client.post("/api/automation/rules/evaluate/", {}, format="json")

        self.assertEqual(response.status_code, 200)
        device.refresh_from_db()
        self.assertEqual(device.state, "on")
        self.assertEqual(device.fan_speed, 2)
