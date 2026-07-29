# ColdChain Monitor

An IoT monitoring platform for refrigerated storage environments.

## Project Goal

ColdChain Monitor simulates warehouse temperature and humidity sensors. It receives sensor readings over MQTT, stores them in a database, displays operational status in a web dashboard, and sends alerts through n8n when temperatures exceed safe thresholds.

## Planned Technology Stack

- Next.js and TypeScript
- PostgreSQL and Prisma
- MQTT / Eclipse Mosquitto
- Python device simulator
- n8n automation
- Docker Compose

## Planned Features

- Simulated warehouse sensors publish temperature and humidity readings
- MQTT broker receives messages
- Backend stores readings in PostgreSQL
- Dashboard displays current sensor status and measurement history
- n8n sends an alert when a reading exceeds the configured threshold

## Status

Phase 0 — Development environment and project planning.
