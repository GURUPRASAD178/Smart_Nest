# Initial Requirements

| ID | Requirement | Priority |
|---|---|---|
| FR-01 | Device CRUD and on/off commands | P0 |
| FR-02 | Sensor reading ingestion and history | P0 |
| FR-03 | React dashboard and error states | P0 |
| FR-04 | Serial gateway with validation and reconnect | P0 |
| FR-05 | Threshold automation rules | P1 |
| FR-06 | Analytics summary | P1 |
| FR-07 | CI and repeatable setup | P0 |
| FR-08 | Cloud deployment | P1 |

## Non-functional
- Invalid input must not mutate device state.
- Configuration and secrets are externalized.
- Core simulated functionality must work without physical hardware.
- Hardware disconnection must not crash the API.
