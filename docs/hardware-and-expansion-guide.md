# Hardware and System Expansion Guide

This guide describes the parts required to run SmartNest, how the current hardware and software connect, and a staged way to add sensors or devices without replacing the working simulated setup.

## 1. Current setup

SmartNest is a local-first prototype:

```text
React dashboard
    | same-origin /api requests (Vite proxy)
Django REST API
    |                         \
PostgreSQL or local SQLite    USB serial sensor gateway
                                  |
                            Arduino + DHT11
```

The dashboard also supports simulated devices and demo sensor readings. Device state, brightness, and fan speed are persisted in the API, but the current device commands do not operate physical appliances. The Arduino integration currently reads temperature and humidity only.

Enabled automation rules are evaluated on the server when a sensor reading is accepted, whether the reading comes from the demo endpoint or the USB gateway. Rules and device controls remain simulated.

### Automation triggers, reset thresholds, and output calibration

Each automation has a trigger threshold and a separate reset (`release_threshold`) to create hysteresis. For a high-value trigger such as temperature `>= 25°C`, the rule activates at 25°C and releases at or below 24°C. For a low-value trigger, release happens at or above the reset threshold. Between trigger and reset, the device keeps its current state. The API defaults to a 1°C temperature gap or a 5 percentage-point humidity gap when no reset value is supplied.

Light brightness and fan speed use a proportional response when the rule is active and sets the device on. `calibration_percent` (1–100) caps the output: it starts at 20% of that cap at the trigger and ramps to the cap over 5°C or 20 humidity percentage points beyond the trigger. Fans map the result to their supported speed levels 1–3. Smart plugs remain on/off only. The percentage is a software output scale, not physical sensor calibration; real hardware needs its own calibration and safety tests.

## 2. Required components

### Minimum software-only setup

| Component | Purpose | Required |
|---|---|---|
| Windows, macOS, or Linux computer | Runs the API and dashboard | Yes |
| Python 3.11 or newer | Django API and optional serial gateway | Yes |
| Node.js 20 or newer and npm | React/Vite dashboard | Yes |
| Docker Desktop with Compose | Starts PostgreSQL, API, and dashboard together | Recommended |
| Network access to the computer | Browser access to the local dashboard | Yes |

This is enough to use the dashboard, seven seeded simulated devices, simulated sensor data, and device controls. No Arduino or physical device is required.

### Minimum physical sensor setup

| Component | Notes |
|---|---|
| Arduino Uno/Nano-compatible board | Must expose a USB serial port. |
| DHT11 sensor module | The current firmware uses the DHT11 protocol. A breakout module is simplest. |
| USB data cable | A charge-only cable will not provide a serial connection. |
| Jumper wires | Match the module labels and board pinout. |
| Breadboard | Optional for a low-voltage prototype. |

The firmware reads the DHT data line from Arduino digital pin **D2**. Connect power and ground only according to the specific sensor module and board documentation. A bare DHT11 may require additional components; use a breakout module or follow its datasheet. The firmware uses 9600 baud.

The gateway currently runs on the computer that can access both the serial port and the API. In the Docker setup, run the gateway on the host computer; serial-port passthrough into Docker is not configured.

### Optional future components

Additional temperature/humidity sensors, light sensors, or motion sensors can be added, but they are not currently supported by the firmware/API data model. Check electrical compatibility and the module documentation before connecting them. Each new sensor type needs an explicit data contract and tests (see section 6).

For physical appliance control, use certified smart plugs or a properly rated, isolated actuator installed by a qualified person. Do not connect mains voltage to an Arduino, breadboard, USB port, or low-voltage sensor module. Physical actuation is not implemented by this project.

## 3. Current data contracts

### DHT11 serial contract

The sketch at `firmware/arduino_dht11/arduino_dht11.ino`:

- samples about every two seconds;
- starts serial output at 9600 baud;
- prints a header, then CSV rows in this exact order:

```text
humidity,temperature,heat_index
52.0,24.5,24.6
```

The Python gateway ignores headers, errors, malformed rows, and readings outside its accepted temperature/humidity ranges. It posts valid samples to:

```text
POST /api/sensors/readings/
Content-Type: application/json

{
  "device_id": "arduino-dht11",
  "temperature": 24.5,
  "humidity": 52.0,
  "heat_index": 24.6
}
```

`heat_index` may be null. The API records a server-side timestamp.

### Device contract

Device records currently support `light`, `fan`, `plug`, and `sensor`, with a room, online/simulated flags, estimated rated watts, and on/off state. Lights have a 0-100 brightness control; fans have speed levels 1-3. For example:

```json
{
  "name": "Office Desk Lamp",
  "room": "Office",
  "device_type": "light",
  "rated_power_watts": 7,
  "brightness": 60
}
```

The dashboard uses:

- `GET /api/devices/` to load devices;
- `POST /api/devices/` to add a simulated device;
- `POST /api/devices/<id>/command/` to change state or a supported device control;
- `POST /api/devices/bulk-command/` to switch online controllable devices on or off.

Sensors cannot be switched, and offline devices reject individual commands. The bulk command skips offline devices and sensors.

## 4. Start and verify the existing system first

Before adding hardware or changing the API, confirm the baseline works:

1. Copy `.env.example` to `.env`.
2. Start the stack:

   ```powershell
   docker compose up --build
   ```

3. Open `http://localhost:5173` and confirm the seeded rooms/devices appear.
4. Confirm `http://localhost:8000/api/health/` reports `"status": "ok"`.
5. Try a light brightness or fan-speed control and confirm the displayed value changes.

Compose applies database migrations and idempotently seeds the simulated devices when the backend starts. Keep demo data enabled for a hardware-free demonstration. Set `SMARTNEST_DEMO_DATA=False` in `.env` when using real sensor readings so generated demo samples are not mixed with hardware data.

For local development without Docker, follow the backend and frontend steps in the root [README](../README.md); run `python manage.py migrate` and `python manage.py seed_devices` from `backend`.

## 5. Add the existing DHT11 hardware

1. **Keep the API and dashboard working.** Start them first and check the health endpoint.
2. **Install firmware dependencies.** In Arduino IDE, install the DHT sensor library required by `#include <DHT.h>` and any dependency requested by the library manager.
3. **Connect the low-voltage sensor.** Use D2 for the data signal and follow the board/module labels for power and ground. Do not guess pin order from wire color.
4. **Upload the sketch.** Open `firmware/arduino_dht11/arduino_dht11.ino`, select the matching board/serial port, and upload.
5. **Check serial output.** Open Serial Monitor at 9600 baud. Confirm rows follow `humidity,temperature,heat_index`; close Serial Monitor before starting the gateway because only one program can normally own the port.
6. **Install gateway dependencies** in a Python environment:

   ```powershell
   cd gateway
   python -m venv .venv
   .venv\Scripts\Activate.ps1
   pip install -r requirements.txt
   ```

7. **Start the gateway on the host.** Replace `COM3` with the port shown by the operating system:

   ```powershell
   python serial_reader.py --port COM3 --api-url http://127.0.0.1:8000
   ```

   On Linux, a port such as `/dev/ttyACM0` may be used. The gateway reconnects after serial errors and retries API posts on later samples. It does not keep a durable queue while the API is unavailable.

8. **Verify ingestion** in the dashboard's recent readings, or post a sample directly for diagnosis:

   ```powershell
   Invoke-RestMethod -Method Post `
     -Uri http://127.0.0.1:8000/api/sensors/readings/ `
     -ContentType 'application/json' `
     -Body '{"device_id":"arduino-dht11","temperature":24.5,"humidity":52.0,"heat_index":24.6}'
   ```

   Use `SMARTNEST_DEMO_DATA=False` when the physical feed is active.

## 6. Add a new sensor type without breaking existing readings

Do not repurpose `temperature`, `humidity`, or `heat_index` to carry unrelated measurements. Add the new type additively:

1. Choose a stable sensor identifier and define units, valid ranges, sampling cadence, and timestamp behavior.
2. Extend the firmware/gateway contract. Prefer a versioned or clearly named payload rather than silently changing the existing CSV column order.
3. Add model fields or a separate sensor-specific model/API if the new reading does not fit the existing DHT fields.
4. Add serializer validation for units/ranges and tests for valid, invalid, and missing values.
5. Keep `POST /api/sensors/readings/` backward compatible for DHT11 while the new integration is introduced.
6. Add the new reading to the dashboard only after the API returns it consistently.
7. Test using simulated or recorded values before connecting the new sensor.

For new data fields, create a Django migration (`python manage.py makemigrations`), review it, run `python manage.py migrate`, and verify existing rows still load. Do not remove old fields in the same release that first adds replacements.

## 7. Add devices and controls

For an additional simulated light, fan, plug, or sensor, use the dashboard's **Add device** form or `POST /api/devices/`. The API assigns reasonable default control values and power estimates based on device type. Confirm the new record appears in the correct room and behaves correctly before adding hardware.

When adding a new device type or control:

1. Define its state and safe command range (for example, light brightness 0-100).
2. Extend the model and serializer validation; keep device-specific controls unavailable on unrelated types.
3. Add a migration for persisted fields and tests for valid commands, invalid ranges, offline devices, and non-controllable sensors.
4. Implement the API behavior before wiring the dashboard control.
5. Keep a simulator implementation so API and UI behavior can be tested without physical hardware.
6. Add a hardware adapter only after simulation passes; select the adapter per device rather than putting vendor-specific logic in the React dashboard.

The current UI's **All off** action affects online, non-sensor device records. It is not a physical emergency stop. Never rely on this prototype for safety-critical control.

## 8. Smooth rollout checklist

- Work on a feature branch and keep the existing simulated devices enabled as a fallback.
- Back up important database data before schema changes. Do not use `docker compose down -v`; it deletes the persistent database volume.
- Prefer additive migrations with defaults or nullable fields so existing records remain readable.
- Run backend tests, frontend tests/build, and migration checks before starting the updated stack.
- Apply migrations before using new fields. Compose does this at backend startup; local development requires `python manage.py migrate`.
- Deploy the API/backend change before relying on new dashboard fields. Keep old API fields and routes working during the transition.
- Verify health, device listing, a valid sensor post, device controls, and dashboard refresh after restart.
- Keep the USB gateway separate from the API container unless serial passthrough is deliberately configured and tested.
- Set a unique secret, disable debug/demo data for deployment, restrict allowed hosts, and use authenticated HTTPS APIs before exposing the service beyond a trusted local network. The current prototype API is not an authenticated public service.

## 9. Troubleshooting

| Symptom | Check |
|---|---|
| No sensor readings | Confirm the board appears as a serial port, close Serial Monitor, check 9600 baud and CSV order, and inspect gateway logs. |
| `Access is denied` opening COM port | Close other serial tools and confirm the correct port. On Linux, check user access to the serial device. |
| Gateway reports API errors | Check `http://127.0.0.1:8000/api/health/`, API URL/port, and that the backend is running. |
| Demo values continue while hardware is connected | Set `SMARTNEST_DEMO_DATA=False` and restart the backend. |
| No device controls work | Check the device's online status, API response, and device type. Sensors are intentionally not switchable. |
| Newly added fields fail after upgrade | Apply migrations and check `python manage.py showmigrations devices`; do not delete the database volume. |
| Dashboard has no devices | Check the API response at `/api/devices/`; run `python manage.py seed_devices` from `backend` for the starter set. |

## 10. Current safety and capability boundary

The DHT11 and simulated device workflow are suitable for development and demonstrations. Device on/off, brightness, fan speed, and estimated watts are database/API behavior only. There is no physical actuator driver, electrical interlock, authentication system for end users, or durable gateway queue. Add and validate those capabilities independently before considering real appliance control or remote deployment.
