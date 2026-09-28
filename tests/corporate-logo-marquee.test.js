const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');

const root = path.join(__dirname, '..');
const html = fs.readFileSync(path.join(root, 'corporate', 'index.html'), 'utf8');
const css = fs.readFileSync(path.join(root, 'assets', 'site', 'corporate.css'), 'utf8');
const script = fs.readFileSync(path.join(root, 'js', 'corporate.js'), 'utf8');

test('renders one semantic static corporate proof group without marquee behavior', () => {
  const grid = html.match(/<ul class="logo-grid"[\s\S]*?<\/ul>/);
  assert.ok(grid, 'static proof grid must exist');
  assert.equal((grid[0].match(/<li(?:\s|>)/g) || []).length, 31);
  assert.equal((html.match(/<ul class="logo-grid"/g) || []).length, 1);
  assert.equal(html.includes('data-logo-marquee'), false);
  assert.equal(html.includes('corporate-partner-track'), false);
  assert.equal(script.includes('cloneNode'), false);
  assert.equal(script.includes('IntersectionObserver'), false);
});

test('uses four desktop columns and the approved compact three-column mobile grid', () => {
  assert.match(css, /\.logo-grid\{[^}]*grid-template-columns:repeat\(4,1fr\)/);
  assert.match(css, /@media \(max-width:767px\)[\s\S]*\.logo-grid\{grid-template-columns:repeat\(3,1fr\)\}/);
  assert.match(css, /\.logo-grid li\{[^}]*height:132px/);
  assert.match(css, /@media \(max-width:767px\)[\s\S]*\.logo-grid li\{height:88px/);
});
