const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'corporate', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'site', 'corporate.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'corporate.js'), 'utf8');
const provenance = fs.readFileSync(path.join(root, 'assets', 'partners', 'corporate', 'PROVENANCE.md'), 'utf8');
const endpointContractPath = path.join(root, 'corporate', 'FORM_ENDPOINT_CONTRACT.md');

const normalize = (value) => value.replace(/\s+/g, ' ').trim();
const indexOfOrFail = (source, value) => {
  const index = source.indexOf(value);
  assert.notEqual(index, -1, `Missing required value: ${value}`);
  return index;
};

test('corporate page uses the approved Financial Wellbeing hierarchy and exact primary copy', () => {
  assert.match(html, /<title>Corporate Financial Wellbeing — Philip Mulyana<\/title>/);
  assert.match(html, /<link rel="canonical" href="https:\/\/philipmulyana\.com\/corporate\/">/);
  assert.ok(html.includes('Bantu karyawan menghadapi keputusan keuangan dengan lebih tenang dan jelas.'));
  assert.ok(html.includes('Isi Form Kebutuhan Organisasi'));
  assert.ok(html.includes('href="/links/#collaboration"'));

  const hero = indexOfOrFail(html, 'id="top"');
  const audience = indexOfOrFail(html, 'class="audience"');
  const proof = indexOfOrFail(html, 'id="proof"');
  const approach = indexOfOrFail(html, 'class="section approach"');
  const format = indexOfOrFail(html, 'id="format"');
  const modules = indexOfOrFail(html, 'id="modules"');
  const boundaries = indexOfOrFail(html, 'class="section boundaries"');
  const process = indexOfOrFail(html, 'class="section process"');
  const speaker = indexOfOrFail(html, 'class="section speaker"');
  const faq = indexOfOrFail(html, 'id="faq"');
  const inquiry = indexOfOrFail(html, 'id="inquiry"');
  assert.deepEqual([...new Set([hero, audience, proof, approach, format, modules, boundaries, process, speaker, faq, inquiry])].sort((a, b) => a - b), [hero, audience, proof, approach, format, modules, boundaries, process, speaker, faq, inquiry]);

  assert.ok(html.includes('Mindful Spending'));
  assert.ok(html.includes('Mengelola Gaji, Tagihan, dan Cicilan'));
  assert.ok(html.includes('Menjaga Keuangan Saat Kondisi Berubah'));
  assert.ok(!html.includes('productivity'));
  assert.ok(!html.includes('ROI'));
});

test('corporate proof is a static 31-tile grid with neutral Bank Indonesia treatment', () => {
  const gridMatch = html.match(/<ul class="logo-grid"[\s\S]*?<\/ul>/);
  assert.ok(gridMatch, 'static logo grid is required');
  const tiles = gridMatch[0].match(/<li(?:\s|>)/g) || [];
  assert.equal(tiles.length, 31);
  assert.equal((gridMatch[0].match(/alt="Bank Indonesia"/g) || []).length, 1);
  assert.ok(gridMatch[0].includes('/assets/partners/corporate/bank-indonesia.png'));
  assert.ok(html.includes('Nama dan logo ditampilkan sebagai catatan kolaborasi, bukan sebagai pernyataan dukungan terhadap penawaran ini.'));
  assert.match(css, /\.logo-grid\{[^}]*grid-template-columns:repeat\(4,1fr\)/);
  assert.match(css, /@media \(max-width:767px\)[\s\S]*\.logo-grid\{grid-template-columns:repeat\(3,1fr\)\}/);
  assert.ok(!html.includes('data-logo-marquee'));
  assert.ok(!script.includes('cloneNode'));

  assert.ok(provenance.includes('Bank Indonesia'));
  assert.ok(provenance.includes('https://www.bi.go.id/id/SiteAssets/bi-b.png?rev=43'));
  assert.ok(provenance.includes('78eb8cc9ea226e3d7cfa8dcafa794e3549e076cdb73682cd3117af292534da26'));
});

test('inquiry form has approved fields, privacy boundary, and no live destination', () => {
  const formMatch = html.match(/<form id="inquiry-form"[\s\S]*?<\/form>/);
  assert.ok(formMatch, 'inquiry form is required');
  const form = formMatch[0];
  const expectedNames = [
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
  ];
  for (const name of expectedNames) assert.ok(form.includes(`name="${name}"`), `missing field ${name}`);
  assert.ok(form.includes('data-endpoint=""'));
  assert.ok(form.includes('data-clarity-mask="true"'));
  assert.match(form, /<form[^>]+method="post"/i);
  assert.ok(!/<form[^>]+action=/i.test(form));
  assert.match(form, /id="work_email"[^>]+maxlength="254"/);
  assert.match(form, /id="whatsapp"[^>]+maxlength="32"/);
  assert.match(form, /id="timing_detail"[^>]+maxlength="120"/);
  assert.match(form, /id="submit-button" type="button"/);
  assert.match(form, /<span aria-hidden="true">\*<\/span> wajib diisi/);
  assert.ok(html.includes('window.__PM_PIXEL_NO_AUTOCONFIG__ = true'));
  assert.ok(html.indexOf('window.__PM_PIXEL_NO_AUTOCONFIG__ = true') < html.indexOf('/js/deferred-trackers.js'));
  assert.ok(html.includes('Jangan cantumkan data keuangan pribadi milik Anda, karyawan, atau peserta.'));
  assert.ok(html.includes('Terima kasih. Tim kami akan menghubungi Anda.'));
  assert.ok(html.includes('Form belum berhasil dikirim.'));
  assert.ok(!html.includes('Kontrol review lokal'));
  assert.ok(!html.includes('Mockup untuk review'));
  assert.ok(!html.includes('data-fixture='));
  assert.ok(!html.includes('data-mock-route'));
  assert.ok(!script.includes('Alya Contoh'));
  assert.ok(!script.includes('setTimeout(showSuccess'));
});

test('server-owned routing contract remains unconnected and explicit', () => {
  assert.equal(fs.existsSync(endpointContractPath), true, 'endpoint contract document is required');
  const contract = fs.readFileSync(endpointContractPath, 'utf8');
  for (const value of [
    'source_channel = website_b2b_inbound',
    'active_owner = unassigned',
    'ownership_status = needs_assignment',
    'sender_persona = pending',
  ]) assert.ok(contract.includes(value), `missing routing contract: ${value}`);
  assert.ok(contract.includes('No production destination is connected'));
  assert.ok(contract.includes('idempotency'));
  assert.ok(contract.includes('rate limit'));
});

test('approved success copy appears only after the tested accepted-response path', () => {
  assert.ok(script.includes('async function submitPayload'));
  assert.ok(script.includes("body?.accepted !== true"));
  assert.ok(script.includes("const submissionId = typeof body?.submission_id === 'string' ? body.submission_id.trim() : ''"));
  assert.ok(script.includes('SUBMISSION_ID_PATTERN.test(submissionId)'));
  assert.ok(script.includes('showSuccess'));
  assert.ok(script.includes('showSubmissionError'));
  assert.ok(script.includes('resolveEndpoint'));
  assert.ok(script.includes("credentials: 'omit'"));
  assert.ok(script.includes("referrerPolicy: 'no-referrer'"));
  assert.ok(script.includes("submitButton.type = 'submit'"));
  assert.ok(!script.includes('localStorage'));
  assert.ok(!script.includes('sessionStorage'));
  assert.ok(!script.includes('sendBeacon'));
  assert.ok(!script.includes('URLSearchParams'));
  assert.ok(normalize(html).includes('Terima kasih. Tim kami akan menghubungi Anda.'));
});
