# SmartNest

Smart home automation starter: React + Vite dashboard, Django REST API, PostgreSQL, Arduino DHT11 USB-serial gateway, and simulated devices.

## Requirements
- Python 3.11+
- Node.js 20+
- Docker Desktop (recommended)
- Arduino IDE only for physical sensor integration

## Quick start (Docker)
1. Copy `.env.example` to `.env`.
2. Run `docker compose up --build`.
3. API: http://localhost:8000/api/health/
4. Dashboard: http://localhost:5173

The initial API seeds a simulated light and fan when you run:
`docker compose exec backend python manage.py seed_devices`

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
- `POST /api/devices/` body: `{"name":"Desk Light","device_type":"light","is_simulated":true}`
- `POST /api/devices/<id>/command/` body: `{"state":"on"}` or `{"state":"off"}`
- `GET /api/sensors/readings/`
- `POST /api/sensors/readings/` body: `{"device_id":"arduino-dht11","temperature":25.4,"humidity":50.2,"heat_index":25.1}`
- `GET /api/automation/rules/`
- `POST /api/automation/rules/` body: `{"name":"Warm room light","sensor":"temperature","operator":"gte","threshold":28,"device":1,"target_state":"on","enabled":true}`
- `GET /api/analytics/summary/`

## Tests
```bash
cd backend
python manage.py test
```

## Git workflow
Use issues and branches such as `feature/SN-02-device-api`; run tests before opening a PR. GitHub Actions runs Django tests on pushes and pull requests.

## Current implementation boundaries
This is the first working vertical slice. Device control is simulated and persisted in the database; it does not switch physical mains appliances. DHT11 measures temperature and humidity, not occupancy or ambient brightness. Adaptive-lighting inputs should be simulated until appropriate low-voltage sensors are added. Energy is an estimate based on configured wattage and device on-time, not utility-grade measurement.

## Security / deployment
Change `DJANGO_SECRET_KEY`, set `DJANGO_DEBUG=False`, and configure `DJANGO_ALLOWED_HOSTS` before public deployment. Do not expose Django's development server to the public internet. Use a production WSGI server and HTTPS for a real cloud deployment.
