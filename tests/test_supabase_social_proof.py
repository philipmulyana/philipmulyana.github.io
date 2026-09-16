import re
import unittest
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
MIGRATIONS = ROOT / "supabase" / "migrations"
WEBHOOK = ROOT / "supabase" / "functions" / "mayar-webhook" / "index.ts"
STATS = ROOT / "supabase" / "functions" / "purchase-stats" / "index.ts"
CONFIG = ROOT / "supabase" / "config.toml"
HTML = ROOT / "product" / "dana-kuliah" / "index.html"
JS = ROOT / "product" / "dana-kuliah" / "script.js"
CSS = ROOT / "product" / "dana-kuliah" / "styles.css"


class SupabaseSocialProofContract(unittest.TestCase):
    def text(self, path):
        self.assertTrue(path.is_file(), path)
        return path.read_text(encoding="utf-8")

    def test_private_idempotent_payment_schema(self):
        sql = "\n".join(p.read_text(encoding="utf-8") for p in sorted(MIGRATIONS.glob("*.sql")))
        self.assertIn("create table public.mayar_verified_payments", sql.lower())
        self.assertRegex(sql.lower(), r"transaction_id\s+text\s+primary key")
        self.assertIn("enable row level security", sql.lower())
        self.assertIn("revoke all on public.mayar_verified_payments from anon", sql.lower())
        self.assertIn("revoke all on public.mayar_verified_payments from authenticated", sql.lower())
        for pii in ("customer_name", "customer_email", "customer_mobile", "raw_payload"):
            self.assertNotIn(pii, sql.lower())

    def test_webhook_fails_closed_and_inserts_idempotently(self):
        source = self.text(WEBHOOK)
        required = [
            "MAYAR_WEBHOOK_SECRET", "MAYAR_MCP_AUTHORIZATION",
            "verifyDanaKuliahAccess", "extractMayarCustomerLookup",
            "get_latest_transactions_by_customer",
            ".insert", "23505", "SUPABASE_SERVICE_ROLE_KEY",
        ]
        for token in required:
            self.assertIn(token, source)
        self.assertNotIn("upsert", source)
        self.assertIn("amount >= 0", "\n".join(p.read_text() for p in MIGRATIONS.glob("*.sql")))
        mcp = self.text(ROOT / "supabase" / "functions" / "_shared" / "mcp-sse.ts")
        self.assertGreaterEqual(mcp.count("controller.signal"), 4)
        self.assertNotRegex(source, r"console\.(log|info)\([^\n]*(body|payload|customer)")

    def test_public_stats_are_aggregate_only(self):
        source = self.text(STATS)
        self.assertIn("paid_count_7d", source)
        self.assertIn("latest_purchase_at", source)
        self.assertIn("interval '7 days'", "\n".join(p.read_text() for p in MIGRATIONS.glob("*.sql")))
        forbidden = ("customer_name", "customer_email", "customer_mobile", "transaction_id")
        response_section = source[source.find("paid_count_7d"):]
        for token in forbidden:
            self.assertNotIn(token, response_section)
        self.assertNotIn("has_recent_purchase", response_section)
        self.assertIn("https://philipmulyana.com", source)
        self.assertIn("Cache-Control", source)

    def test_public_functions_do_not_require_browser_jwt(self):
        config = self.text(CONFIG)
        self.assertRegex(config, r"\[functions\.mayar-webhook\][\s\S]*?verify_jwt\s*=\s*false")
        self.assertRegex(config, r"\[functions\.purchase-stats\][\s\S]*?verify_jwt\s*=\s*false")

    def test_landing_page_has_truthful_accessible_components(self):
        html, js, css = self.text(HTML), self.text(JS), self.text(CSS)
        self.assertIn('id="verified-purchase-count"', html)
        self.assertIn('id="purchase-notification"', html)
        self.assertIn('aria-live="polite"', html)
        self.assertIn('id="purchase-notification-live"', html)
        self.assertIn('aria-hidden="true"', html)
        self.assertIn('aria-label="Tutup notifikasi pembelian"', html)
        self.assertIn("orang tua membeli Online Course ini dalam 7 hari terakhir", html)
        self.assertIn("Seseorang baru saja membeli Online Course Dana Kuliah", html)
        self.assertNotIn("Pembelian terverifikasi", html + js)
        self.assertIn("paid_count_7d", js)
        self.assertIn("latest_purchase_at", js)
        self.assertIn("sessionStorage", js)
        self.assertIn("prefers-reduced-motion", css)
        self.assertRegex(css, r"purchase-notification-close[^}]*min-(?:width|height):44px")
        self.assertIn("max-height:600px", css)
        self.assertIn("orientationchange", js)
        self.assertIn("focusin", js)
        self.assertNotIn("nama pembeli", html.lower())

    def test_privacy_policy_discloses_payment_and_anonymous_social_proof_processing(self):
        policy = self.text(ROOT / "privacy-policy" / "index.html")
        for token in (
            "Mayar", "Supabase", "status pembayaran",
            "statistik pembelian anonim", "16 September 2026"
        ):
            self.assertIn(token, policy)


if __name__ == "__main__":
    unittest.main(verbosity=2)
