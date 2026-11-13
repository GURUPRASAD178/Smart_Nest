#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11
#define IR_SENSOR_PIN 3
#define BUZZER_PIN 5
#define IR_ACTIVE_STATE LOW
#define BUZZER_ACTIVE_STATE LOW

const unsigned long DHT_INTERVAL_MS = 2000;
const unsigned long MOTION_DEBOUNCE_MS = 50;

DHT dht(DHTPIN, DHTTYPE);
bool rawMotionDetected;
bool motionDetected;
unsigned long lastRawMotionChangeAt;
unsigned long lastDhtReadAt;

bool readMotionDetected() {
  return digitalRead(IR_SENSOR_PIN) == IR_ACTIVE_STATE;
}

void setBuzzer(bool enabled) {
  digitalWrite(BUZZER_PIN, enabled ? BUZZER_ACTIVE_STATE : !BUZZER_ACTIVE_STATE);
}

void printMotionEvent(bool detected) {
  Serial.print("MOTION,");
  Serial.println(detected ? 1 : 0);
}

void setup() {
  pinMode(IR_SENSOR_PIN, INPUT);
  pinMode(BUZZER_PIN, OUTPUT);
  setBuzzer(false);

  Serial.begin(9600);
  dht.begin();
  delay(1000);

  rawMotionDetected = readMotionDetected();
  motionDetected = rawMotionDetected;
  lastRawMotionChangeAt = millis();
  setBuzzer(motionDetected);
  lastDhtReadAt = millis() - DHT_INTERVAL_MS;

  // DHT CSV contract: humidity,temperature,heat_index.
  Serial.println("humidity,temperature,heat_index");
  printMotionEvent(motionDetected);
}

void loop() {
  unsigned long now = millis();
  bool currentRawMotion = readMotionDetected();

  if (currentRawMotion != rawMotionDetected) {
    rawMotionDetected = currentRawMotion;
    lastRawMotionChangeAt = now;
  }

  if (rawMotionDetected != motionDetected &&
      now - lastRawMotionChangeAt >= MOTION_DEBOUNCE_MS) {
    motionDetected = rawMotionDetected;
    setBuzzer(motionDetected);
    printMotionEvent(motionDetected);
  }

  if (now - lastDhtReadAt >= DHT_INTERVAL_MS) {
    lastDhtReadAt = now;
    float humidity = dht.readHumidity();
    float temperature = dht.readTemperature();

    if (isnan(humidity) || isnan(temperature)) {
      Serial.println("ERROR");
    } else {
      float heatIndex = dht.computeHeatIndex(temperature, humidity, false);
      Serial.print(humidity, 1);
      Serial.print(",");
      Serial.print(temperature, 1);
      Serial.print(",");
      Serial.println(heatIndex, 2);
    }
  }

  delay(10);
}
