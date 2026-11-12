from django.core.management.base import BaseCommand
from apps.devices.models import Device

class Command(BaseCommand):
    help = "Create demo devices if they do not exist."
    def handle(self, *args, **options):
        defaults = [
            {"name": "Living Room Light", "device_type": "light", "rated_power_watts": 9},
            {"name": "Bedroom Fan", "device_type": "fan", "rated_power_watts": 55},
        ]
        for item in defaults:
            device, created = Device.objects.get_or_create(name=item["name"], defaults=item)
            self.stdout.write(f'{"Created" if created else "Exists"}: {device.name}')
