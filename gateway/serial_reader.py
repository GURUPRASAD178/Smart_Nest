"""Read Arduino CSV serial output and post valid DHT11 readings to SmartNest."""
import argparse
import logging
import time
import requests
import serial

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(message)s")
log = logging.getLogger("smartnest-gateway")

def parse_line(line: str):
    parts = [p.strip() for p in line.strip().split(",")]
    if len(parts) == 2 and parts[0] == "MOTION" and parts[1] in ("0", "1"):
        return {
            "event_type": "motion",
            "device_id": "arduino-ir-beam",
            "detected": parts[1] == "1",
        }
    if len(parts) < 2:
        return None
    try:
        # Existing Arduino sketch prints humidity,temperature,heat_index.
        humidity, temperature = float(parts[0]), float(parts[1])
        heat_index = float(parts[2]) if len(parts) >= 3 and parts[2] else None
    except ValueError:
        return None
    if not (-20 <= temperature <= 80 and 0 <= humidity <= 100):
        return None
    return {"device_id": "arduino-dht11", "temperature": temperature,
            "humidity": humidity, "heat_index": heat_index}

def main():
    parser = argparse.ArgumentParser()
    parser.add_argument("--port", required=True, help="Serial port, e.g. COM3 or /dev/ttyACM0")
    parser.add_argument("--baud", type=int, default=9600)
    parser.add_argument("--api-url", default="http://127.0.0.1:8000")
    parser.add_argument("--retry-seconds", type=float, default=3)
    args = parser.parse_args()
    endpoint = args.api_url.rstrip("/") + "/api/sensors/readings/"
    while True:
        try:
            with serial.Serial(args.port, args.baud, timeout=2) as ser:
                log.info("Connected to %s at %s baud", args.port, args.baud)
                time.sleep(2)  # Arduino may reset when serial opens.
                while True:
                    line = ser.readline().decode("utf-8", errors="ignore").strip()
                    if not line:
                        continue
                    message = parse_line(line)
                    if message is None:
                        log.debug("Ignoring non-reading serial line: %r", line)
                        continue
                    try:
                        if message.get("event_type") == "motion":
                            motion_endpoint = args.api_url.rstrip("/") + "/api/sensors/motion/"
                            payload = {
                                "device_id": message["device_id"],
                                "detected": message["detected"],
                            }
                            response = requests.post(motion_endpoint, json=payload, timeout=5)
                            response.raise_for_status()
                            log.info("Posted motion state: %s", payload["detected"])
                            continue

                        response = requests.post(endpoint, json=message, timeout=5)
                        response.raise_for_status()
                        log.info("Posted temperature %.1f C, humidity %.1f%%",
                                 message["temperature"], message["humidity"])
                    except requests.RequestException as exc:
                        log.warning("API post failed; this serial message is not queued: %s", exc)
        except (serial.SerialException, OSError) as exc:
            log.warning("Serial connection unavailable (%s); retrying in %.1fs", exc, args.retry_seconds)
            time.sleep(args.retry_seconds)

if __name__ == "__main__":
    main()
