const test = require('node:test');
const assert = require('node:assert/strict');
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');

const source = fs.readFileSync(path.join(__dirname, '..', 'js', 'blog-track.js'), 'utf8');

function runTracker(clickedHref) {
  const payloads = [];
  let clickHandler;
  const context = {
    URL,
    location: {
      origin: 'https://philipmulyana.com',
      pathname: '/blog/contoh-artikel.html',
    },
    navigator: { userAgent: 'Test Browser' },
    document: {
      referrer: 'https://example.com/path?email=private@example.com',
      addEventListener(type, handler) {
        if (type === 'click') clickHandler = handler;
      },
    },
    fetch(_url, options) {
      payloads.push(JSON.parse(options.body));
      return Promise.resolve({ ok: true });
    },
  };

  vm.runInNewContext(source, context);
  clickHandler({
    target: {
      closest() {
        return { getAttribute: () => clickedHref };
      },
    },
  });
  return payloads;
}

test('blog click tracking keeps only coarse target and drops query data', () => {
  const payloads = runTracker('https://calendly.com/philipmulyana/first-call?utm_source=meta&fbclid=click123&email=private%40example.com#slot');
  const click = payloads.find((payload) => payload.action === 'blog_click');

  assert.equal(click.target_type, 'calendly');
  assert.equal(click.target, 'calendly.com/philipmulyana/first-call');
  assert.doesNotMatch(JSON.stringify(click), /utm_|fbclid|email|private/i);
});

test('blog view tracking reduces referrer to hostname', () => {
  const payloads = runTracker('/tools/risk-profile/?utm_source=article&name=private');
  const view = payloads.find((payload) => payload.action === 'blog_view');
  const click = payloads.find((payload) => payload.action === 'blog_click');

  assert.equal(view.referrer, 'example.com');
  assert.equal(click.target, '/tools/risk-profile/');
  assert.doesNotMatch(JSON.stringify(payloads), /private@example|name=private/i);
});
