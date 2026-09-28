const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'js', 'corporate.js');

function loadModule() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

const validValues = {
  name: '  Nadia Putri  ',
  organization: '  Contoh Perusahaan  ',
  role_title: 'Learning & Development Manager',
  work_email: 'nadia@example.test',
  whatsapp: '',
  need_context: 'Kami menyiapkan sesi edukasi finansial untuk peserta internal pada kuartal berikutnya.',
  approximate_timing: '1–3 bulan lagi',
  timing_detail: '',
  preferred_contact_channel: 'Email',
  consent: true,
};

test('validates the exact approved inquiry fields and conditional requirements', () => {
  const api = loadModule();
  assert.deepEqual(api.FIELD_NAMES, [
    'name',
    'organization',
    'role_title',
    'work_email',
    'whatsapp',
    'need_context',
    'approximate_timing',
    'timing_detail',
    'preferred_contact_channel',
    'consent',
  ]);
  assert.deepEqual(api.validateValues(validValues), []);

  assert.deepEqual(
    api.validateValues({ ...validValues, preferred_contact_channel: 'WhatsApp' }).map((error) => error.name),
    ['whatsapp'],
  );
  assert.deepEqual(
    api.validateValues({ ...validValues, approximate_timing: 'specific' }).map((error) => error.name),
    ['timing_detail'],
  );
  assert.deepEqual(
    api.validateValues({ ...validValues, work_email: 'invalid', need_context: 'terlalu pendek', consent: false }).map((error) => error.name),
    ['work_email', 'need_context', 'consent'],
  );
});

test('builds a trimmed payload containing no URL attribution or hidden owner values', () => {
  const api = loadModule();
  const payload = api.buildPayload(validValues);
  assert.deepEqual(Object.keys(payload), api.FIELD_NAMES);
  assert.equal(payload.name, 'Nadia Putri');
  assert.equal(payload.organization, 'Contoh Perusahaan');
  assert.equal(payload.consent, true);
  for (const forbidden of [
    'utm_source', 'utm_medium', 'utm_campaign', 'fbclid', 'landing_url', 'referrer',
    'source_channel', 'active_owner', 'ownership_status', 'sender_persona', 'submission_id',
  ]) assert.equal(forbidden in payload, false, `${forbidden} must remain server-owned or absent`);
});

test('accepts only a same-origin HTTPS endpoint and explicit localhost development endpoint', () => {
  const api = loadModule();
  assert.equal(
    api.resolveEndpoint('/api/corporate-inquiry', 'https://philipmulyana.com'),
    'https://philipmulyana.com/api/corporate-inquiry',
  );
  assert.equal(
    api.resolveEndpoint('http://127.0.0.1:4173/api/corporate-inquiry', 'http://127.0.0.1:4173'),
    'http://127.0.0.1:4173/api/corporate-inquiry',
  );
  assert.equal(api.resolveEndpoint('', 'https://philipmulyana.com'), null);
  assert.equal(api.resolveEndpoint('https://example.com/collect', 'https://philipmulyana.com'), null);
  assert.equal(api.resolveEndpoint('http://philipmulyana.com/api/corporate-inquiry', 'https://philipmulyana.com'), null);
});

test('submits private JSON with a stable idempotency key and requires confirmed acceptance', async () => {
  const api = loadModule();
  const calls = [];
  const payload = api.buildPayload(validValues);
  const endpoint = 'https://philipmulyana.com/api/corporate-inquiry';
  const idempotencyKey = '8f008e07-f2ea-4a8d-92bd-c74ed4d17e8a';

  const result = await api.submitPayload(
    async (...args) => {
      calls.push(args);
      return { ok: true, json: async () => ({ accepted: true, submission_id: 'server-id-123' }) };
    },
    endpoint,
    payload,
    idempotencyKey,
  );
  assert.deepEqual(result, { submissionId: 'server-id-123' });
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.equal(url, endpoint);
  assert.equal(options.method, 'POST');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.referrerPolicy, 'no-referrer');
  assert.equal(options.cache, 'no-store');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.headers['Idempotency-Key'], idempotencyKey);
  assert.deepEqual(JSON.parse(options.body), payload);
  assert.equal(url.includes('?'), false);

  for (const response of [
    { ok: false, json: async () => ({ accepted: true, submission_id: 'server-id-123' }) },
    { ok: true, json: async () => ({ accepted: false, submission_id: 'server-id-123' }) },
    { ok: true, json: async () => ({ accepted: true }) },
    { ok: true, json: async () => { throw new Error('invalid json'); } },
  ]) {
    await assert.rejects(
      api.submitPayload(async () => response, endpoint, payload, idempotencyKey),
      /submission failed/i,
    );
  }
});

test('rejects blank, unbounded, or control-character submission IDs from a malformed endpoint response', async () => {
  const { submitPayload } = loadModule();
  for (const submissionId of [
    ' ',
    '\n\t',
    'x'.repeat(129),
    'abc\nxyz',
    'abc\u0000xyz',
    'abc\u001fxyz',
    'abc\u007fxyz',
    'abc\u202exyz',
  ]) {
    await assert.rejects(
      submitPayload(
        async () => ({ ok: true, json: async () => ({ accepted: true, submission_id: submissionId }) }),
        'https://philipmulyana.com/api/corporate-inquiry',
        { name: 'Nadia' },
        '3d7d1726-4287-4d97-aeab-85184c1fba22'
      ),
      /Submission failed/
    );
  }
});

test('rejects forged enums, overlong contact values, and stale hidden timing detail', () => {
  const api = loadModule();

  const forgedChannel = api.validateValues({ ...validValues, preferred_contact_channel: 'SMS' });
  assert.equal(forgedChannel.some((item) => item.name === 'preferred_contact_channel'), true);

  const forgedTiming = api.validateValues({ ...validValues, approximate_timing: 'tomorrow' });
  assert.equal(forgedTiming.some((item) => item.name === 'approximate_timing'), true);

  const hugeEmail = api.validateValues({ ...validValues, work_email: `${'a'.repeat(245)}@example.com` });
  assert.equal(hugeEmail.some((item) => item.name === 'work_email'), true);

  const punctuationWhatsapp = api.validateValues({ ...validValues, whatsapp: 'call-me-081234567890' });
  assert.equal(punctuationWhatsapp.some((item) => item.name === 'whatsapp'), true);

  const stalePayload = api.buildPayload({
    ...validValues,
    approximate_timing: 'Dalam 1 bulan',
    timing_detail: 'Nilai tersembunyi lama',
  });
  assert.equal(stalePayload.timing_detail, '');
});

test('rejects endpoint URLs containing userinfo, query strings, or fragments', () => {
  const api = loadModule();
  const origin = 'https://philipmulyana.com';
  assert.equal(api.resolveEndpoint('https://user:pass@philipmulyana.com/api', origin), null);
  assert.equal(api.resolveEndpoint('/api?token=value', origin), null);
  assert.equal(api.resolveEndpoint('/api#fragment', origin), null);
});

test('reuses an idempotency key only for the exact same payload snapshot', () => {
  const api = loadModule();
  let counter = 0;
  const randomUUID = () => `key-${++counter}`;
  const payload = api.buildPayload(validValues);
  const first = api.idempotencyAttempt(null, payload, randomUUID);
  const retry = api.idempotencyAttempt(first, { ...payload }, randomUUID);
  const changed = api.idempotencyAttempt(retry, { ...payload, organization: 'Organisasi Baru' }, randomUUID);

  assert.equal(first.key, 'key-1');
  assert.equal(retry, first);
  assert.equal(changed.key, 'key-2');
  assert.notEqual(changed.payloadSnapshot, first.payloadSnapshot);
});
