const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.resolve(__dirname, '..');
const pagePath = path.join(root, 'tools', 'risk-profile', 'index.html');
const uiPath = path.join(root, 'js', 'risk-profile.js');

function read(target) {
  return fs.readFileSync(target, 'utf8');
}

test('risk profile page is Indonesian and exposes an accessible assessment shell', () => {
  const html = read(pagePath);
  assert.match(html, /<html lang="id">/);
  assert.match(html, /<title>Profil Risiko/);
  assert.match(html, /id="risk-profile-form"/);
  assert.match(html, /id="question-fieldset"/);
  assert.match(html, /id="question-options"/);
  assert.match(html, /id="assessment-progress"[^>]*role="progressbar"/);
  assert.match(html, /id="assessment-results"[^>]*aria-live="polite"/);
  assert.match(html, /href="\/privacy-policy\/"/);
  assert.match(html, /<noscript>/);
});

test('page loads the scoring engine before the UI controller', () => {
  const html = read(pagePath);
  const engine = html.indexOf('/js/risk-profile-engine.js');
  const ui = html.indexOf('/js/risk-profile.js');
  assert.ok(engine > -1);
  assert.ok(ui > engine);
});

test('risk profile never requests identity or contact data', () => {
  const combined = `${read(pagePath)}\n${read(uiPath)}`.toLowerCase();
  for (const forbidden of ['type="email"', 'type="tel"', 'nomor whatsapp', 'nama kamu', 'website_calc', 'lead_captured']) {
    assert.equal(combined.includes(forbidden), false, `Found forbidden lead field or event: ${forbidden}`);
  }
});

test('answers are not stored or sent to a backend', () => {
  const ui = read(uiPath);
  for (const forbidden of ['localStorage', 'sessionStorage', 'fetch(', 'XMLHttpRequest', 'sendBeacon', 'document.cookie']) {
    assert.equal(ui.includes(forbidden), false, `Found forbidden storage/network API: ${forbidden}`);
  }
});

test('UI includes explicit navigation, print, restart, and educational boundaries', () => {
  const combined = `${read(pagePath)}\n${read(uiPath)}`;
  assert.match(combined, /Sebelumnya/);
  assert.match(combined, /Lihat Hasil/);
  assert.match(combined, /Cetak \/ Simpan PDF/);
  assert.match(combined, /Ulangi Assessment/);
  assert.match(combined, /Jenis investasi yang dapat dipertimbangkan/);
  assert.match(combined, /bukan rekomendasi produk spesifik/i);
  assert.match(combined, /tidak menjamin hasil/i);
});

test('tools index links to the new risk profile route', () => {
  const html = read(path.join(root, 'tools', 'index.html'));
  assert.match(html, /href="\/tools\/risk-profile\/"/);
  assert.match(html, /Profil Risiko/);
});
