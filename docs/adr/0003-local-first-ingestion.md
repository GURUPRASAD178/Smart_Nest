# ADR 0003: Local-first sensor ingestion

**Status:** Accepted

The Python gateway reads the existing Arduino CSV stream over USB serial and posts readings to Django. AWS IoT Core remains an optional future adapter rather than a prerequisite for local operation.
