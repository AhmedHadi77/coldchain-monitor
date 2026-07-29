import argparse
import json
import random
import time
from datetime import datetime, timezone

import paho.mqtt.client as mqtt


def create_reading(sensor_id: str, warehouse_id: str) -> dict:
    """Create one realistic refrigerated-warehouse sensor reading."""
    return {
        "sensorId": sensor_id,
        "warehouseId": warehouse_id,
        "temperatureC": round(random.uniform(2.0, 7.0), 2),
        "humidityPercent": round(random.uniform(65.0, 85.0), 2),
        "recordedAt": datetime.now(timezone.utc).isoformat(),
    }


def main() -> None:
    parser = argparse.ArgumentParser(
        description="Publish simulated ColdChain sensor readings over MQTT."
    )
    parser.add_argument("--host", default="localhost", help="MQTT broker host")
    parser.add_argument("--port", type=int, default=1883, help="MQTT broker port")
    parser.add_argument("--warehouse", default="warehouse-a", help="Warehouse ID")
    parser.add_argument("--sensor-id", default="sensor-01", help="Sensor ID")
    parser.add_argument(
        "--interval",
        type=int,
        default=5,
        help="Seconds between readings",
    )
    args = parser.parse_args()

    topic = f"coldchain/{args.warehouse}/{args.sensor_id}/telemetry"

    client = mqtt.Client(client_id=f"simulator-{args.sensor_id}")
    client.connect(args.host, args.port, keepalive=60)
    client.loop_start()

    print(f"Connected to MQTT broker at {args.host}:{args.port}")
    print(f"Publishing telemetry to: {topic}")
    print("Press Ctrl+C to stop the simulator.")

    try:
        while True:
            reading = create_reading(args.sensor_id, args.warehouse)
            message = json.dumps(reading)

            result = client.publish(topic, message, qos=1)
            result.wait_for_publish()

            print(f"Published: {message}")
            time.sleep(args.interval)
    except KeyboardInterrupt:
        print("\nStopping simulator...")
    finally:
        client.loop_stop()
        client.disconnect()


if __name__ == "__main__":
    main()
