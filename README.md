# SmartNest

Smart home automation starter: React + Vite dashboard, Django REST API, PostgreSQL, Arduino DHT11 USB-serial gateway, and simulated devices.

## Requirements
- Python 3.11+
- Node.js 20+
- Docker Desktop (recommended)
- Arduino IDE only for physical sensor integration

See the [Hardware and System Expansion Guide](docs/hardware-and-expansion-guide.md) for the bill of materials, sensor setup, API contracts, and a safe staged integration process.

## Quick start (Docker)
1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. API: http://localhost:8000/api/health/
4. Dashboard: http://localhost:5173

Docker Compose seeds seven simulated devices across five rooms automatically. For local backend development, run `python manage.py seed_devices` after migrations.

## Local development without Docker

### Backend
```bash
cd backend
python -m venv .venv
# Windows: .venv\\Scripts\\activate
# macOS/Linux: source .venv/bin/activate
pip install -r requirements.txt
python manage.py migrate
python manage.py seed_devices
python manage.py runserver
```

### Frontend
```bash
cd frontend
npm install
npm run dev
```
The Vite dev server proxies `/api` requests to `http://127.0.0.1:8000` by default. Set `SMARTNEST_BACKEND_URL` if the backend runs at a different address. Docker Compose configures the proxy to reach its backend service automatically.

### Gateway
```bash
cd gateway
python -m venv .venv
# activate the environment, then:
pip install -r requirements.txt
python serial_reader.py --port COM3 --api-url http://127.0.0.1:8000
```
Replace `COM3` with your Arduino serial port (e.g. `/dev/ttyACM0`). Close Arduino Serial Monitor first.

## Arduino DHT11 serial format
Upload `firmware/arduino_dht11/arduino_dht11.ino`. It emits CSV:
`humidity,temperature,heat_index`
at 9600 baud. The gateway sends valid readings to `POST /api/sensors/readings/`.

## API
- `GET /api/health/`
- `GET /api/devices/`
- `POST /api/devices/` body: `{"name":"Desk Light","room":"Office","device_type":"light"}`
- `POST /api/devices/<id>/command/` accepts `{"state":"on"}`, `{"brightness":45}` for lights, or `{"fan_speed":2}` for fans
- `POST /api/devices/bulk-command/` body: `{"state":"off"}` to switch off all online controllable devices
- `GET /api/sensors/readings/`
- `POST /api/sensors/readings/` body: `{"device_id":"arduino-dht11","temperature":25.4,"humidity":50.2,"heat_index":25.1}`
- `POST /api/sensors/simulate/` creates a bounded demo reading when demo mode is enabled
- `GET /api/automation/rules/`
- `POST /api/automation/rules/` body: `{"name":"Warm room fan","sensor":"temperature","operator":"gte","threshold":25,"release_threshold":24,"calibration_percent":100,"device":1,"target_state":"on","enabled":true}`
- Enabled rules run on each accepted sensor reading. High-value rules release at or below `release_threshold`; low-value rules release at or above it. Defaults are 1°C for temperature and 5 percentage points for humidity, and the device holds its current state inside the hysteresis band.
- Lights scale brightness and fans map proportional output to speed levels 1–3. Output starts at 20% of `calibration_percent` at the trigger and ramps to that configured cap over the next 5°C or 20 humidity points. Plugs remain on/off only.
- The dashboard can create, pause, resume, and delete rules, and edit the reset threshold and output calibration
- `POST /api/automation/rules/evaluate/` manually evaluates the latest reading
- `GET /api/analytics/summary/`

## Tests
```bash
cd backend
python manage.py test config.tests apps.devices apps.sensors apps.automation apps.analytics
```

## Git workflow
Use issues and branches such as `feature/SN-02-device-api`; run tests before opening a PR. GitHub Actions runs Django tests on pushes and pull requests.

## Current implementation boundaries
This is the first working vertical slice. Device control is simulated and persisted in the database; it does not switch physical mains appliances. DHT11 measures temperature and humidity, not occupancy or ambient brightness. Adaptive-lighting inputs should be simulated until appropriate low-voltage sensors are added. Energy is an estimate based on configured wattage and device on-time, not utility-grade measurement.

## Security / deployment
Set a unique `DJANGO_SECRET_KEY`, set `DJANGO_DEBUG=False`, set `SMARTNEST_DEMO_DATA=False`, and configure `DJANGO_ALLOWED_HOSTS` before deployment. The API refuses to start with a missing or example secret when debug mode is disabled. Demo sensor generation defaults to the debug setting and can be disabled independently. Do not expose Django's development server to the public internet. Use a production WSGI server and HTTPS for a real cloud deployment.
