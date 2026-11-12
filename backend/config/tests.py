from django.core.exceptions import ImproperlyConfigured
from django.test import SimpleTestCase

from .settings import _DEV_SECRET_KEY, _get_secret_key


class SecretKeySettingsTests(SimpleTestCase):
    def test_development_uses_fallback_key(self):
        self.assertEqual(_get_secret_key(None, debug=True), _DEV_SECRET_KEY)

    def test_production_rejects_missing_or_placeholder_key(self):
        for key in (None, "", _DEV_SECRET_KEY, "replace-this-for-any-real-deployment"):
            with self.subTest(key=key):
                with self.assertRaises(ImproperlyConfigured):
                    _get_secret_key(key, debug=False)

    def test_production_accepts_configured_key(self):
        self.assertEqual(_get_secret_key("a-unique-secret", debug=False), "a-unique-secret")
