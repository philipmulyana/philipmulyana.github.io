"""Testable Airtable persistence adapter for corporate testimonials."""

from __future__ import annotations

import json
from typing import Any, Callable
from urllib.parse import quote, urlencode
from urllib.request import Request, urlopen


EXPECTED_FIELDS = frozenset(
    {
        "Name",
        "Job Title",
        "Company",
        "Event/Program",
        "Quote",
        "Status",
        "Submitted at",
        "Submission ID",
    }
)


def upsert_testimonial(
    fields: dict[str, Any],
    *,
    token: str,
    base_id: str,
    table_name: str,
    transport: Callable[..., Any] = urlopen,
) -> None:
    """Persist once and never mutate an existing moderated submission."""
    if set(fields) != EXPECTED_FIELDS or fields.get("Status") != "Pending":
        raise ValueError("Unexpected Airtable testimonial fields")
    submission_id = fields.get("Submission ID")
    if not isinstance(submission_id, str):
        raise ValueError("Missing submission ID")

    table = quote(table_name, safe="")
    records_url = f"https://api.airtable.com/v0/{base_id}/{table}"
    headers = {
        "Authorization": f"Bearer {token}",
        "Content-Type": "application/json",
    }
    formula = f"{{Submission ID}}='{submission_id}'"
    lookup_url = f"{records_url}?{urlencode({'filterByFormula': formula, 'maxRecords': 1})}"
    with transport(Request(lookup_url, headers=headers), timeout=20) as response:
        existing = json.load(response).get("records", [])
    if existing:
        return

    payload = json.dumps(
        {
            "performUpsert": {"fieldsToMergeOn": ["Submission ID"]},
            "records": [{"fields": fields}],
        }
    ).encode()
    request = Request(
        records_url,
        data=payload,
        method="PATCH",
        headers=headers,
    )
    with transport(request, timeout=20) as response:
        if response.status != 200:
            raise RuntimeError("Airtable rejected the submission")
        result = json.load(response)
    if len(result.get("records", [])) != 1:
        raise RuntimeError("Airtable did not confirm one record")
