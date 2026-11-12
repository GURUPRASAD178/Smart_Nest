from django.test import TestCase
from rest_framework.test import APIClient
class AnalyticsTests(TestCase):
    def test_summary_endpoint(self):
        response = APIClient().get("/api/analytics/summary/")
        self.assertEqual(response.status_code, 200)
        self.assertIn("estimated_active_power_watts", response.data)
