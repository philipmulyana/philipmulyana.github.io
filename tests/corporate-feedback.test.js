const test = require('node:test');
const assert = require('node:assert/strict');
const path = require('node:path');

const modulePath = path.join(__dirname, '..', 'js', 'corporate-feedback.js');

function loadModule() {
  delete require.cache[require.resolve(modulePath)];
  return require(modulePath);
}

const validFields = {
  name: '  Nadia Putri  ',
  job_title: 'Learning & Development Manager',
  company: 'Contoh Perusahaan',
  event_program: 'Program Financial Wellbeing',
  testimonial: 'Philip menjelaskan topik dengan jelas dan mudah dipahami oleh peserta.',
};

test('validates exactly the five approved visible fields', () => {
  const api = loadModule();
  assert.deepEqual(api.FIELD_NAMES, [
    'name', 'job_title', 'company', 'event_program', 'testimonial',
  ]);
  assert.deepEqual(api.validateValues(validFields), []);

  const errors = api.validateValues({ ...validFields, company: '   ', testimonial: 'pendek' });
  assert.deepEqual(errors.map((item) => item.name), ['company', 'testimonial']);
  assert.equal(errors[0].message, 'Nama perusahaan wajib diisi.');
});

test('builds a trimmed JSON payload with no contact, consent, or URL data', () => {
  const api = loadModule();
  const payload = api.buildPayload(validFields);
  assert.deepEqual(Object.keys(payload), [
    'name', 'job_title', 'company', 'event_program', 'testimonial',
  ]);
  assert.equal(payload.name, 'Nadia Putri');
  for (const forbidden of ['email', 'phone', 'whatsapp', 'consent', 'rating', 'utm_source', 'fbclid']) {
    assert.equal(forbidden in payload, false);
  }
});

test('submits JSON with credentials omitted and fails closed on non-2xx responses', async () => {
  const api = loadModule();
  const calls = [];
  const okFetch = async (...args) => {
    calls.push(args);
    return { ok: true, json: async () => ({ ok: true }) };
  };

  const payload = api.buildPayload(validFields);
  await api.submitPayload(
    okFetch,
    payload,
    1234567890,
    'f4ee6981-8280-4c18-9a2e-83e1ade48b24',
  );
  assert.equal(calls.length, 1);
  const [url, options] = calls[0];
  assert.match(url, /^https:\/\/philip-mulyana--corporate-testimonial-api-/);
  assert.equal(options.method, 'POST');
  assert.equal(options.credentials, 'omit');
  assert.equal(options.headers['Content-Type'], 'application/json');
  assert.equal(options.headers['X-Form-Started-At'], '1234567890');
  assert.equal(options.headers['X-Submission-ID'], 'f4ee6981-8280-4c18-9a2e-83e1ade48b24');
  assert.deepEqual(JSON.parse(options.body), payload);
  assert.equal(url.includes('?'), false);

  await assert.rejects(
    api.submitPayload(async () => ({ ok: false, json: async () => ({ ok: false }) }), payload, 1234567890, 'f4ee6981-8280-4c18-9a2e-83e1ade48b24'),
    /submission failed/i,
  );
  await assert.rejects(
    api.submitPayload(async () => ({ ok: true, json: async () => ({ ok: false }) }), payload, 1234567890, 'f4ee6981-8280-4c18-9a2e-83e1ade48b24'),
    /submission failed/i,
  );
});
