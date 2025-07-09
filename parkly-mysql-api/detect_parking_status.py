from ultralytics import YOLO
import cv2
import json

def capture_image(filename="parking.jpg"):
    cap = cv2.VideoCapture(1)
    cap.set(cv2.CAP_PROP_FRAME_WIDTH, 1280)
    cap.set(cv2.CAP_PROP_FRAME_HEIGHT, 720)
    
    ret, frame = cap.read()
    if ret:
        cv2.imwrite(filename, frame)
    cap.release()

def detect_car(filename="parking.jpg", show_result=False):
    model = YOLO("yolov8l.pt", verbose=False)
    img = cv2.imread(filename)
    results = model.predict(img, verbose=False)

    car_detected = False

    for result in results:
        boxes = result.boxes
        for i in range(len(boxes)):
            cls_id = int(boxes.cls[i])
            if cls_id == 2:  # 2 = car
                car_detected = True
                if show_result:
                    xyxy = boxes.xyxy[i].cpu().numpy().astype(int)
                    x1, y1, x2, y2 = xyxy
                    cv2.rectangle(img, (x1, y1), (x2, y2), (0, 255, 0), 2)
                    cv2.putText(img, "Car", (x1, y1 - 10), cv2.FONT_HERSHEY_SIMPLEX, 0.8, (0, 255, 0), 2)

    if show_result:
        cv2.imshow("YOLOv8 Car Detection (Top View)", img)
        cv2.waitKey(0)
        cv2.destroyAllWindows()

    return car_detected

# MAIN
if __name__ == "__main__":
    capture_image()
    is_car_detected = detect_car(show_result=False)

    # Output result as JSON for Node.js to read
    print(json.dumps({"isOccupied": is_car_detected}))
