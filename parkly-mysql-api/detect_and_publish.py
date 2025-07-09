from ultralytics import YOLO
import cv2
import json
import sys
import paho.mqtt.client as mqtt
from datetime import datetime, timezone

# MQTT Configuration
MQTT_BROKER = 'localhost'     
MQTT_PORT = 8883                      
MQTT_TOPIC = 'parkly/parking-lot/status'

# TLS Certs (update paths as needed)
CA_CERTS = "./certs/ca.crt"
CLIENT_CERT = "./certs/client.crt"
CLIENT_KEY = "./certs/client.key"

# === 1. Car Detection ===
def detect_from_camera(cam_index=1, max_retries =3):
    model = YOLO("yolov8l.pt")
    cap = cv2.VideoCapture(cam_index)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)

    ret, frame = cap.read()
    cap.release()

    if not ret:
        print("[ERROR] Camera failed to capture", file=sys.stderr)
        sys.exit(1)

    results = model.predict(frame, verbose=False)

    for result in results:
        for cls_id in result.boxes.cls:
            if int(cls_id) == 2:  # class ID 2 = car
                return True
    return False

# === 2. MQTT Publish ===
def publish_mqtt(payload):
    try:
        client = mqtt.Client()
        client.tls_set(
            ca_certs=CA_CERTS,
            certfile=CLIENT_CERT,
            keyfile=CLIENT_KEY,
            tls_version=mqtt.ssl.PROTOCOL_TLSv1_2
        )
        client.tls_insecure_set(True)  # Disable hostname check (development only)

        client.connect(MQTT_BROKER, MQTT_PORT, 60)
        client.loop_start()
        client.publish(MQTT_TOPIC, json.dumps(payload))
        client.loop_stop()
        client.disconnect()

        print("[MQTT] Published to broker", file=sys.stderr)
    except Exception as e:
        print(f"[MQTT ERROR] {e}", file=sys.stderr)

# === 3. Main ===
if __name__ == "__main__":
    if len(sys.argv) < 2:
        print("[ERROR] lot_id not provided", file=sys.stderr)
        sys.exit(1)

    lot_id = sys.argv[1]  # get from Node.js argument
    is_occupied = detect_from_camera()
    status = "occupied" if is_occupied else "available"

    payload = {
        "lot_id": lot_id,
        "status": status,
        "timestamp": datetime.now(timezone.utc).isoformat()
    }

    publish_mqtt(payload)
    print(f"[DEBUG] Python is outputting lot_id = {lot_id}", file=sys.stderr)

    # Output for Node.js
    print(json.dumps({
        "lot_id": lot_id,
        "isOccupied": is_occupied
    }))
