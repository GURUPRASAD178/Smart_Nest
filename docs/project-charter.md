# SmartNest Project Charter

## Vision
Deliver an affordable, testable smart-home platform for device control, environmental monitoring, automation and energy estimates.

## Scope
React dashboard, Django REST API, PostgreSQL, Arduino Uno + DHT11 via USB serial, Python gateway, simulated devices, basic rules and analytics, Docker and cloud deployment.

## Out of scope
Native mobile apps, microservices, advanced ML, mains wiring, and certified energy measurement.

## Success criteria
- Dashboard lists and controls persisted simulated devices.
- Valid DHT11 readings are stored with timestamps.
- Rules can evaluate a stored reading and update a device.
- Analytics endpoint reports historical aggregates and estimated active load.
- Backend and gateway tests pass.
- Setup and deployment steps are documented.
