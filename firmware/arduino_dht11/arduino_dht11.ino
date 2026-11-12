#include <DHT.h>

#define DHTPIN 2
#define DHTTYPE DHT11

DHT dht(DHTPIN, DHTTYPE);

void setup() {
  Serial.begin(9600);
  dht.begin();
  delay(1000);
  // CSV contract: humidity,temperature,heat_index
  Serial.println("humidity,temperature,heat_index");
}

void loop() {
  delay(2000);
  float humidity = dht.readHumidity();
  float temperature = dht.readTemperature();

  if (isnan(humidity) || isnan(temperature)) {
    Serial.println("ERROR");
    return;
  }

  float heatIndex = dht.computeHeatIndex(temperature, humidity, false);
  Serial.print(humidity, 1);
  Serial.print(",");
  Serial.print(temperature, 1);
  Serial.print(",");
  Serial.println(heatIndex, 2);
}
