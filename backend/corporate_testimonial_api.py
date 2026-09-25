"""Modal wrapper and Airtable adapter for corporate testimonial submissions."""

from __future__ import annotations

import modal

from backend.corporate_testimonial_airtable import upsert_testimonial
from backend.corporate_testimonial_core import validate_airtable_schema
from backend.corporate_testimonial_web import CorporateTestimonialASGI


APP_NAME = "corporate-testimonial-api"
AIRTABLE_BASE_ID = "app9FkjFzWkgwqQEE"
AIRTABLE_TABLE_NAME = "Corporate Testimonials"

image = modal.Image.debian_slim(python_version="3.12").add_local_python_source("backend")
app = modal.App(APP_NAME, image=image)
airtable_secret = modal.Secret.from_name("corporate-testimonial-airtable")
rate_store = modal.Dict.from_name(
    "corporate-testimonial-rate-guard", create_if_missing=True
)


def _airtable_headers() -> dict[str, str]:
    import os

    return {
        "Authorization": f"Bearer {os.environ['AIRTABLE_TOKEN']}",
        "Content-Type": "application/json",
    }


def _verify_airtable_schema() -> None:
    import json
    from urllib.request import Request, urlopen

    url = f"https://api.airtable.com/v0/meta/bases/{AIRTABLE_BASE_ID}/tables"
    with urlopen(Request(url, headers=_airtable_headers()), timeout=20) as response:
        tables = json.load(response).get("tables", [])
    table = next(
        (item for item in tables if item.get("name") == AIRTABLE_TABLE_NAME),
        None,
    )
    validate_airtable_schema(table)


@app.function(secrets=[airtable_secret])
def verify_schema() -> str:
    """Read-only deployment check; runtime never mutates Airtable schema."""
    import json

    _verify_airtable_schema()
    return json.dumps({"table": AIRTABLE_TABLE_NAME, "verified": True})


def _write_airtable(fields: dict) -> None:
    import os

    upsert_testimonial(
        fields,
        token=os.environ["AIRTABLE_TOKEN"],
        base_id=AIRTABLE_BASE_ID,
        table_name=AIRTABLE_TABLE_NAME,
    )


@app.function(secrets=[airtable_secret], timeout=60)
@modal.concurrent(max_inputs=20)
@modal.asgi_app()
def web():
    import os
    import time

    _verify_airtable_schema()
    return CorporateTestimonialASGI(
        rate_store=rate_store,
        writer=_write_airtable,
        hmac_key=os.environ["AIRTABLE_TOKEN"].encode(),
        now=time.time,
    )
