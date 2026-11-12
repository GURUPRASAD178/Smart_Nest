# Architecture

React/Vite browser UI -> Django REST API -> PostgreSQL.
Python gateway reads Arduino CSV over USB serial and POSTs validated readings to Django.
Simulated devices provide a hardware-independent first milestone. Optional AWS IoT integration is deferred behind an adapter.
The sensor ingestion API evaluates enabled automation rules server-side for each accepted reading.

## ADR summary
1. Modular monolith to fit the delivery window.
2. Shared device API for simulator and physical adapters.
3. Local-first ingestion; AWS optional.
4. Threshold rules before ML.
5. Docker Compose for repeatable local environment.
