"""Pure validation and Airtable mapping for corporate testimonial submissions."""

from __future__ import annotations

import unicodedata
from typing import Any


FIELD_NAMES = ("name", "job_title", "company", "event_program", "testimonial")
EXPECTED_KEYS = frozenset(FIELD_NAMES)
LIMITS = {
    "name": (2, 120),
    "job_title": (2, 160),
    "company": (2, 160),
    "event_program": (2, 200),
    "testimonial": (20, 3000),
}
AIRTABLE_FIELD_TYPES = {
    "Name": "singleLineText",
    "Job Title": "singleLineText",
    "Company": "singleLineText",
    "Event/Program": "singleLineText",
    "Quote": "multilineText",
    "Status": "singleSelect",
    "Submitted at": "dateTime",
    "Submission ID": "singleLineText",
}


class SubmissionError(ValueError):
    """Raised when a public submission or storage schema is invalid."""


def _contains_disallowed_character(value: str, *, allow_newline: bool) -> bool:
    for character in value:
        if allow_newline and character == "\n":
            continue
        if unicodedata.category(character) in {"Cc", "Cf"}:
            return True
    return False


def _clean_single_line(value: Any, field: str) -> str:
    if not isinstance(value, str) or _contains_disallowed_character(
        value, allow_newline=False
    ):
        raise SubmissionError(f"Invalid {field}")
    return " ".join(value.split())


def _clean_testimonial(value: Any) -> str:
    if not isinstance(value, str) or _contains_disallowed_character(
        value, allow_newline=True
    ):
        raise SubmissionError("Invalid testimonial")
    return "\n".join(line.rstrip() for line in value.strip().split("\n"))


def validate_submission(
    data: Any, *, now_ms: int, started_at: int
) -> dict[str, str]:
    """Validate, normalize, and return only the five approved public fields."""
    if not isinstance(data, dict) or set(data) != EXPECTED_KEYS:
        raise SubmissionError("Unexpected submission fields")

    if isinstance(started_at, bool) or not isinstance(started_at, int):
        raise SubmissionError("Invalid form start time")
    if started_at > now_ms + 5_000:
        raise SubmissionError("Invalid form start time")
    elapsed = now_ms - started_at
    if elapsed < 1_500 or elapsed > 86_400_000:
        raise SubmissionError("Invalid form completion time")

    cleaned = {
        "name": _clean_single_line(data["name"], "name"),
        "job_title": _clean_single_line(data["job_title"], "job title"),
        "company": _clean_single_line(data["company"], "company"),
        "event_program": _clean_single_line(data["event_program"], "event/program"),
        "testimonial": _clean_testimonial(data["testimonial"]),
    }
    for field, value in cleaned.items():
        minimum, maximum = LIMITS[field]
        if not minimum <= len(value) <= maximum:
            raise SubmissionError(f"Invalid length for {field}")
    return cleaned


def validate_airtable_schema(table: Any) -> None:
    """Fail closed when the dedicated Airtable schema has drifted."""
    if not isinstance(table, dict) or not isinstance(table.get("fields"), list):
        raise SubmissionError("Invalid Airtable table metadata")
    fields = {
        field.get("name"): field
        for field in table["fields"]
        if isinstance(field, dict) and isinstance(field.get("name"), str)
    }
    if set(fields) != set(AIRTABLE_FIELD_TYPES):
        raise SubmissionError("Unexpected Airtable fields")
    for name, expected_type in AIRTABLE_FIELD_TYPES.items():
        if fields.get(name, {}).get("type") != expected_type:
            raise SubmissionError(f"Invalid Airtable field: {name}")

    choices = fields["Status"].get("options", {}).get("choices", [])
    if {
        choice.get("name") for choice in choices if isinstance(choice, dict)
    } != {"Pending", "Approved", "Rejected"}:
        raise SubmissionError("Status field choices are invalid")

    timestamp_options = fields["Submitted at"].get("options", {})
    if (
        timestamp_options.get("dateFormat", {}).get("name") != "iso"
        or timestamp_options.get("timeFormat", {}).get("name") != "24hour"
        or timestamp_options.get("timeZone") != "utc"
    ):
        raise SubmissionError("Submitted at field options are invalid")


def to_airtable_fields(
    cleaned: dict[str, str], *, submitted_at: str, submission_id: str
) -> dict[str, Any]:
    """Map the approved form fields to a server-owned pending record."""
    return {
        "Name": cleaned["name"],
        "Job Title": cleaned["job_title"],
        "Company": cleaned["company"],
        "Event/Program": cleaned["event_program"],
        "Quote": cleaned["testimonial"],
        "Status": "Pending",
        "Submitted at": submitted_at,
        "Submission ID": submission_id,
    }
