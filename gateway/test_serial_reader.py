import unittest
from serial_reader import parse_line

class ParseLineTests(unittest.TestCase):
    def test_parses_existing_csv_order(self):
        self.assertEqual(parse_line("56.0,29.3,30.91"), {
            "device_id": "arduino-dht11", "temperature": 29.3,
            "humidity": 56.0, "heat_index": 30.91
        })
    def test_ignores_header_and_sensor_error(self):
        self.assertIsNone(parse_line("Humidity,Temperature,HeatIndex"))
        self.assertIsNone(parse_line("Failed to read from DHT sensor!"))
    def test_rejects_out_of_range_values(self):
        self.assertIsNone(parse_line("150,29.3,30.91"))
    def test_parses_motion_transitions(self):
        self.assertEqual(parse_line("MOTION,1"), {
            "event_type": "motion", "device_id": "arduino-ir-beam", "detected": True
        })
        self.assertEqual(parse_line("MOTION,0"), {
            "event_type": "motion", "device_id": "arduino-ir-beam", "detected": False
        })
    def test_ignores_invalid_motion_events(self):
        self.assertIsNone(parse_line("MOTION,2"))
if __name__ == "__main__":
    unittest.main()
