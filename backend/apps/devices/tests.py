from io import StringIO

from django.core.management import call_command
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
        self.assertIn("room", response.data[0])

    def test_create_light_includes_adjustable_brightness(self):
        response = self.client.post("/api/devices/", {
            "name": "Kitchen Light", "room": "Kitchen", "device_type": "light"
        }, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["room"], "Kitchen")
        self.assertEqual(response.data["brightness"], 100)

    def test_create_fan_includes_adjustable_speed(self):
        response = self.client.post("/api/devices/", {
            "name": "Office Fan", "room": "Office", "device_type": "fan"
        }, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["fan_speed"], 1)

    def test_create_buzzer_device(self):
        response = self.client.post("/api/devices/", {
            "name": "Entry buzzer",
            "room": "Entry",
            "device_type": "buzzer",
        }, format="json")

        self.assertEqual(response.status_code, 201)
        self.assertEqual(response.data["device_type"], "buzzer")
        self.assertEqual(response.data["rated_power_watts"], 2)

    def test_seed_devices_creates_demo_home_idempotently(self):
        legacy_light = Device.objects.create(name="Living Room Light", device_type="light")
        legacy_fan = Device.objects.create(name="Bedroom Fan", device_type="fan", state="on")

        call_command("seed_devices", stdout=StringIO())
        call_command("seed_devices", stdout=StringIO())

        self.assertEqual(Device.objects.count(), 8)
        legacy_light.refresh_from_db()
        legacy_fan.refresh_from_db()
        self.assertEqual(legacy_light.name, "Living Room Main Light")
        self.assertEqual(legacy_fan.name, "Bedroom Ceiling Fan")
        self.assertEqual(legacy_fan.state, "on")
        self.assertEqual(
            Device.objects.get(name="Bedroom Ceiling Fan").fan_speed,
            2,
        )
        self.assertEqual(
            Device.objects.get(name="Indoor Climate Sensor").state,
            "on",
        )

    def test_command_updates_state(self):
        response = self.client.post(f"/api/devices/{self.device.id}/command/", {"state": "on"}, format="json")
        self.assertEqual(response.status_code, 200)
        self.device.refresh_from_db()
        self.assertEqual(self.device.state, "on")

    def test_command_updates_light_brightness(self):
        response = self.client.post(
            f"/api/devices/{self.device.id}/command/",
            {"brightness": 35},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["brightness"], 35)

    def test_command_updates_fan_speed(self):
        fan = Device.objects.create(name="Test fan", device_type="fan")
        response = self.client.post(
            f"/api/devices/{fan.id}/command/",
            {"fan_speed": 3},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["fan_speed"], 3)

    def test_brightness_above_one_hundred_is_rejected(self):
        response = self.client.post(
            f"/api/devices/{self.device.id}/command/",
            {"brightness": 120},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_light_rejects_fan_speed_control(self):
        response = self.client.post(
            f"/api/devices/{self.device.id}/command/",
            {"fan_speed": 3},
            format="json",
        )

        self.assertEqual(response.status_code, 400)

    def test_invalid_command_is_rejected(self):
        response = self.client.post(f"/api/devices/{self.device.id}/command/", {"state": "maybe"}, format="json")
        self.assertEqual(response.status_code, 400)
        self.device.refresh_from_db()
        self.assertEqual(self.device.state, "off")

    def test_sensor_cannot_be_switched(self):
        sensor = Device.objects.create(name="DHT11", device_type="sensor")
        response = self.client.post(f"/api/devices/{sensor.id}/command/", {"state": "on"}, format="json")
        self.assertEqual(response.status_code, 400)

    def test_offline_device_rejects_commands(self):
        self.device.is_online = False
        self.device.save(update_fields=["is_online"])

        response = self.client.post(
            f"/api/devices/{self.device.id}/command/",
            {"state": "on"},
            format="json",
        )

        self.assertEqual(response.status_code, 409)

    def test_bulk_command_skips_sensors_and_offline_devices(self):
        online_fan = Device.objects.create(name="Online fan", device_type="fan")
        offline_plug = Device.objects.create(name="Offline plug", device_type="plug", is_online=False)
        sensor = Device.objects.create(name="Climate sensor", device_type="sensor")

        response = self.client.post(
            "/api/devices/bulk-command/",
            {"state": "off"},
            format="json",
        )

        self.assertEqual(response.status_code, 200)
        self.assertEqual(response.data["updated"], 2)
        self.assertEqual(response.data["skipped_offline"], 1)
        online_fan.refresh_from_db()
        offline_plug.refresh_from_db()
        sensor.refresh_from_db()
        self.assertEqual(online_fan.state, "off")
        self.assertEqual(offline_plug.state, "off")
        self.assertEqual(sensor.state, "off")
