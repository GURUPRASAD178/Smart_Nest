from django.db import transaction

from .models import AutomationRule


@transaction.atomic
def evaluate_reading(reading):
    rules = AutomationRule.objects.select_related("device").filter(enabled=True).order_by("id")
    actions = []
    skipped_offline = 0

    for rule in rules:
        device = rule.device
        if device.device_type == "sensor":
            continue
        if not device.is_online:
            skipped_offline += 1
            continue

        value = getattr(reading, rule.sensor)
        passed = {
            "gt": value > rule.threshold,
            "gte": value >= rule.threshold,
            "lt": value < rule.threshold,
            "lte": value <= rule.threshold,
        }[rule.operator]
        if passed and device.state != rule.target_state:
            device.state = rule.target_state
            device.save(update_fields=["state"])
            actions.append({
                "rule_id": rule.id,
                "device_id": device.id,
                "device_name": device.name,
                "state": rule.target_state,
            })

    return {
        "evaluated": rules.count(),
        "actions": actions,
        "skipped_offline": skipped_offline,
    }
