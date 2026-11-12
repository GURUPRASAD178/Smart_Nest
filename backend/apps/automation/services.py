import math

from django.db import transaction

from .models import AutomationRule


def _matches(value, operator, threshold):
    return {
        "gt": value > threshold,
        "gte": value >= threshold,
        "lt": value < threshold,
        "lte": value <= threshold,
    }[operator]


def _release_reached(value, operator, threshold):
    if operator in ("gt", "gte"):
        return value <= threshold
    return value >= threshold


def _output_percent(rule, value):
    if rule.sensor == "motion":
        return rule.calibration_percent
    response_span = 5 if rule.sensor == "temperature" else 20
    progress = min(1, abs(value - rule.threshold) / response_span)
    return max(1, round(rule.calibration_percent * (0.2 + 0.8 * progress)))


@transaction.atomic
def _evaluate_values(values):
    rules = (
        AutomationRule.objects.select_related("device")
        .filter(enabled=True, sensor__in=values)
        .order_by("id")
    )
    actions = []
    skipped_offline = 0

    for rule in rules:
        device = rule.device
        if device.device_type == "sensor":
            continue
        if not device.is_online:
            skipped_offline += 1
            continue

        value = values[rule.sensor]
        triggered = _matches(value, rule.operator, rule.threshold)
        release_threshold = rule.release_threshold
        if release_threshold is None:
            gap = 1 if rule.sensor in ("temperature", "motion") else 5
            release_threshold = (
                rule.threshold - gap
                if rule.operator in ("gt", "gte")
                else rule.threshold + gap
            )

        if triggered:
            desired_state = rule.target_state
        elif _release_reached(value, rule.operator, release_threshold):
            desired_state = "off" if rule.target_state == "on" else "on"
        else:
            continue

        changes = {}
        if device.state != desired_state:
            changes["state"] = desired_state
        if triggered and desired_state == "on":
            output_percent = _output_percent(rule, value)
            if device.device_type == "light" and device.brightness != output_percent:
                changes["brightness"] = output_percent
            elif device.device_type == "fan":
                speed = max(1, min(3, math.ceil(output_percent / 100 * 3)))
                if device.fan_speed != speed:
                    changes["fan_speed"] = speed

        if changes:
            for field, new_value in changes.items():
                setattr(device, field, new_value)
            device.save(update_fields=list(changes))
            action = {
                "rule_id": rule.id,
                "device_id": device.id,
                "device_name": device.name,
                "state": device.state,
            }
            action.update({
                field: getattr(device, field)
                for field in ("brightness", "fan_speed")
                if field in changes
            })
            actions.append(action)

    return {
        "evaluated": rules.count(),
        "actions": actions,
        "skipped_offline": skipped_offline,
    }


def evaluate_reading(reading):
    return _evaluate_values({
        "temperature": reading.temperature,
        "humidity": reading.humidity,
    })


def evaluate_motion(detected):
    return _evaluate_values({"motion": 1 if detected else 0})
