from django.core.management.base import BaseCommand
from apps.devices.models import Device

class Command(BaseCommand):
    help = "Create a realistic set of simulated home devices."

    def handle(self, *args, **options):
        legacy_names = {
            "Living Room Main Light": "Living Room Light",
            "Bedroom Ceiling Fan": "Bedroom Fan",
        }
        defaults = [
            {
                "name": "Living Room Main Light", "room": "Living Room",
                "device_type": "light", "state": "on", "brightness": 72,
                "rated_power_watts": 9,
            },
            {
                "name": "Bedroom Ceiling Fan", "room": "Bedroom",
                "device_type": "fan", "fan_speed": 2, "rated_power_watts": 55,
            },
            {
                "name": "Kitchen Coffee Maker", "room": "Kitchen",
                "device_type": "plug", "rated_power_watts": 900,
            },
            {
                "name": "Office Desk Lamp", "room": "Office",
                "device_type": "light", "brightness": 55, "rated_power_watts": 7,
            },
            {
                "name": "Hallway Light", "room": "Hallway",
                "device_type": "light", "brightness": 45, "rated_power_watts": 6,
            },
            {
                "name": "Living Room Media Center", "room": "Living Room",
                "device_type": "plug", "rated_power_watts": 120,
            },
            {
                "name": "Indoor Climate Sensor", "room": "Living Room",
                "device_type": "sensor", "state": "on", "rated_power_watts": 1,
            },
        ]
        for item in defaults:
            device = Device.objects.filter(name=item["name"]).first()
            renamed = False
            if device is None and item["name"] in legacy_names:
                device = Device.objects.filter(name=legacy_names[item["name"]]).first()
                if device is not None:
                    device.name = item["name"]
                    renamed = True
            created = device is None
            if created:
                device = Device.objects.create(**item)
            updated_fields = []
            if not created:
                if renamed:
                    updated_fields.append("name")
                for field in ("room", "brightness", "fan_speed", "rated_power_watts"):
                    current_value = getattr(device, field)
                    if current_value in (None, "Unassigned") and item.get(field) is not None:
                        setattr(device, field, item[field])
                        updated_fields.append(field)
                if updated_fields:
                    device.save(update_fields=updated_fields)
            self.stdout.write(f'{"Created" if created else "Exists"}: {device.name}')
