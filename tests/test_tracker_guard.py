import subprocess
import tempfile
import unittest
from pathlib import Path


ROOT = Path(__file__).resolve().parents[1]
GUARD = ROOT / ".github" / "scripts" / "check_trackers.py"


class TrackerGuardRecursiveInventory(unittest.TestCase):
    def test_nested_page_without_pixel_fails_closed(self):
        with tempfile.TemporaryDirectory() as temporary:
            site = Path(temporary)
            nested = site / "links" / "index.html"
            nested.parent.mkdir(parents=True)
            nested.write_text("<!doctype html><title>Nested page</title>", encoding="utf-8")

            missing = subprocess.run(
                ["python3", str(GUARD), str(site)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(missing.returncode, 1, missing.stdout + missing.stderr)
            self.assertIn("links/index.html", missing.stdout)
            self.assertIn("no-pixel", missing.stdout)

            nested.write_text(
                '<!doctype html><title>Nested page</title><script src="/js/pixel.js"></script>',
                encoding="utf-8",
            )
            present = subprocess.run(
                ["python3", str(GUARD), str(site)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(present.returncode, 0, present.stdout + present.stderr)
            self.assertIn("1 html", present.stdout)
            self.assertIn("0 no-pixel", present.stdout)

            nested.write_text(
                '<!doctype html><title>Nested page</title><script src="/js/deferred-trackers.js" defer></script>',
                encoding="utf-8",
            )
            deferred = subprocess.run(
                ["python3", str(GUARD), str(site)],
                check=False,
                capture_output=True,
                text=True,
            )
            self.assertEqual(deferred.returncode, 0, deferred.stdout + deferred.stderr)
            self.assertIn("0 no-pixel", deferred.stdout)


if __name__ == "__main__":
    unittest.main(verbosity=2)
