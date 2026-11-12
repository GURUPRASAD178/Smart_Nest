# Test Plan

- Device list endpoint returns registered devices.
- Valid on/off commands update state and persist.
- Invalid command returns HTTP 400 without changing state.
- Sensor device cannot be switched.
- Sensor readings accept valid temperature/humidity and reject out-of-range humidity.
- Automation evaluation turns a target device on when a stored reading crosses a threshold.
- Sensor ingestion automatically evaluates enabled rules; offline targets are skipped.
- Automation rules can be created, updated, deleted, and cannot target sensors or use out-of-range thresholds.
- Analytics summary returns aggregate and estimated active power fields.
- Gateway parser handles valid CSV, header/error lines and out-of-range data.
- Manual integration: start stack, seed devices, operate dashboard, post sensor reading, evaluate rule.
