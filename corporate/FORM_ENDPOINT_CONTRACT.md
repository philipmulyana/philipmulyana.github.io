# Corporate inquiry endpoint contract (not connected)

Status: implementation scaffold only. No production destination is connected, no credential is present, and no live write is authorized.

## Browser request

The page may POST JSON only to a same-origin HTTPS endpoint configured in `data-endpoint` after separate approval. The current candidate HTML leaves `data-endpoint=""`, so a valid submit fails closed and shows the recoverable error state without making a network request. The submit control is inert in source HTML and becomes a submit button only after the JavaScript controller has attached its fail-closed handler, so disabling JavaScript does not create a native POST fallback.

Visible request fields:

- `name`
- `organization`
- `role_title`
- `work_email`
- `whatsapp`
- `need_context`
- `approximate_timing`
- `timing_detail`
- `preferred_contact_channel`
- `consent`

The browser sends an opaque `Idempotency-Key` header. It does not put form data in the URL, analytics, storage, or logs.

## Required server-owned values

The approved endpoint must assign these values on the server. It must not trust replacements supplied by a browser:

- `source_channel = website_b2b_inbound`
- `active_owner = unassigned`
- `ownership_status = needs_assignment`
- `sender_persona = pending`

The endpoint must also generate `submission_id` and timestamps. Vanya or any AI/persona must not be stored or presented as the human owner.

## Accepted response

The page shows the approved success state only after an HTTP success response with this minimal JSON shape:

```json
{
  "accepted": true,
  "submission_id": "opaque server-generated ID, 1–128 characters: ASCII letters/digits followed only by letters, digits, dot, underscore, colon, or hyphen"
}
```

Any timeout, network failure, non-2xx response, malformed JSON, missing ID, or `accepted` value other than `true` must show the recoverable error state and preserve the entered values.

## Blocked production dependencies

Before configuring `data-endpoint`, a separate review and approval must define and verify:

- destination and dedicated B2B inquiry schema;
- credential and access ownership;
- server-side validation that mirrors the browser rules;
- retention, deletion, privacy-policy, and incident handling;
- exact-origin CORS if the architecture later becomes cross-origin;
- privacy-safe rate limit and spam controls;
- idempotency behavior for retries;
- monitoring without PII in logs or alerts;
- human inbox/routing ownership and response process;
- form-field masking for any approved replay tooling.

No autonomous email, WhatsApp message, CRM task, proposal, price, owner assignment, analytics event, or external follow-up is authorized by this contract.
