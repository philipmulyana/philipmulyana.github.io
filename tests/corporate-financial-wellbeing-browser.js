const { chromium } = require('playwright-core');
const fs = require('node:fs');
const path = require('node:path');
const assert = require('node:assert/strict');

const ROOT = path.resolve(__dirname, '..');
const OUTPUT = path.join(ROOT, 'artifacts', 'corporate-financial-wellbeing');
const BASE_URL = process.env.CORPORATE_QA_URL || 'http://127.0.0.1:4174/corporate/';
const AXE_PATH = require.resolve('axe-core/axe.min.js');
fs.mkdirSync(OUTPUT, { recursive: true });

const results = [];
const pass = (name, detail) => {
  results.push({ name, detail });
  console.log(`PASS ${name}: ${detail}`);
};

const loadAllImages = async (page) => {
  await page.evaluate(async () => {
    document.documentElement.style.scrollBehavior = 'auto';
    for (const image of document.images) {
      image.scrollIntoView({ block: 'center' });
      await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
      if (!image.complete) {
        await Promise.race([
          new Promise((resolve) => image.addEventListener('load', resolve, { once: true })),
          new Promise((resolve) => image.addEventListener('error', resolve, { once: true })),
          new Promise((resolve) => setTimeout(resolve, 1000)),
        ]);
      }
    }
    window.scrollTo(0, 0);
    await new Promise((resolve) => requestAnimationFrame(() => requestAnimationFrame(resolve)));
  });
};

const fillValidForm = async (page) => {
  await page.locator('#name').fill('Nama QA');
  await page.locator('#organization').fill('Organisasi QA');
  await page.locator('#role_title').fill('Learning & Development');
  await page.locator('#work_email').fill('qa@example.test');
  await page.locator('#need_context').fill('Kami menyiapkan sesi edukasi finansial untuk peserta internal pada kuartal berikutnya.');
  await page.locator('[name="preferred_contact_channel"][value="Email"]').check();
  await page.locator('#consent').check();
};

(async () => {
  const browser = await chromium.launch({
    executablePath: '/usr/bin/google-chrome',
    headless: true,
    args: ['--no-sandbox', '--disable-dev-shm-usage'],
  });
  const context = await browser.newContext({ reducedMotion: 'reduce' });
  const page = await context.newPage();
  const consoleErrors = [];
  const pageErrors = [];
  const mockedExternalRequests = [];
  const inquiryRequests = [];
  let heldInquiryResponse = null;

  page.on('console', (message) => {
    if (message.type() === 'error') consoleErrors.push(message.text());
  });
  page.on('pageerror', (error) => pageErrors.push(error.message));
  await page.route('**/*', async (route) => {
    const request = route.request();
    const url = new URL(request.url());
    if (url.pathname === '/__qa__/corporate-inquiry') {
      inquiryRequests.push({
        method: request.method(),
        url: request.url(),
        headers: await request.allHeaders(),
        body: request.postDataJSON(),
      });
      if (heldInquiryResponse) await heldInquiryResponse;
      await route.fulfill({
        status: 202,
        contentType: 'application/json',
        body: JSON.stringify({ accepted: true, submission_id: 'qa-accepted-001' }),
      });
      return;
    }
    if (url.origin === new URL(BASE_URL).origin) {
      await route.continue();
      return;
    }
    mockedExternalRequests.push(request.url());
    await route.fulfill({ status: 204, contentType: 'application/javascript', body: '' });
  });

  try {
    const mixedQuery = '?utm_source=meta&utm_medium=paid_social&utm_campaign=cmp_a1b2c3d4e5f6a7b8&utm_content=ad_a1b2c3d4e5f6a7b8&utm_term=kw_a1b2c3d4e5f6a7b8&placement=feed&fbclid=IwAR0abc123xyz456def789&name=Private&email=private%40example.com&phone=081234567890&whatsapp=081234567890&coupon=SECRET';
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(`${BASE_URL}${mixedQuery}`, { waitUntil: 'networkidle' });

    const sanitized = new URL(page.url());
    for (const field of ['name', 'email', 'phone', 'whatsapp', 'coupon']) {
      assert.equal(sanitized.searchParams.has(field), false, `${field} remained in page URL`);
    }
    assert.equal(sanitized.searchParams.get('utm_source'), 'meta');
    assert.equal(sanitized.searchParams.get('utm_campaign'), 'cmp_a1b2c3d4e5f6a7b8');
    const forwardedLinks = await page.locator('[data-forward-attribution]').evaluateAll((links) => links.map((link) => link.href));
    assert.equal(forwardedLinks.length, 2);
    for (const href of forwardedLinks) {
      const destination = new URL(href);
      assert.equal(destination.pathname, '/links/');
      assert.equal(destination.hash, '#collaboration');
      assert.equal(destination.searchParams.get('utm_source'), 'meta');
      assert.equal(destination.searchParams.get('utm_campaign'), 'cmp_a1b2c3d4e5f6a7b8');
      for (const field of ['name', 'email', 'phone', 'whatsapp', 'coupon']) assert.equal(destination.searchParams.has(field), false);
    }
    assert.equal(await page.evaluate(() => window.__PM_PIXEL_NO_AUTOCONFIG__), true);
    assert.equal(await page.locator('.form-shell').getAttribute('data-clarity-mask'), 'true');
    pass('privacy and attribution', 'PII removed before trackers; safe attribution forwarded to both WhatsApp links; form masked');

    for (const [label, width, height] of [
      ['375', 375, 844],
      ['390', 390, 844],
      ['767', 767, 900],
      ['768', 768, 900],
      ['1023', 1023, 900],
      ['1024', 1024, 900],
      ['1440', 1440, 900],
    ]) {
      await page.setViewportSize({ width, height });
      await page.goto(BASE_URL, { waitUntil: 'networkidle' });
      const metrics = await page.evaluate(() => {
        const heroCta = document.querySelector('.hero .button-primary').getBoundingClientRect();
        const headerCta = document.querySelector('.header-cta').getBoundingClientRect();
        return {
          innerWidth,
          clientWidth: document.documentElement.clientWidth,
          scrollWidth: document.documentElement.scrollWidth,
          bodyFont: parseFloat(getComputedStyle(document.body).fontSize),
          barlow: document.fonts.check('16px Barlow'),
          heroCta: { width: heroCta.width, height: heroCta.height, bottom: heroCta.bottom },
          headerCta: { width: headerCta.width, height: headerCta.height },
        };
      });
      assert.equal(metrics.innerWidth, width);
      assert.equal(metrics.scrollWidth, metrics.clientWidth, `${label} horizontal overflow`);
      assert.ok(metrics.bodyFont >= 16);
      assert.equal(metrics.barlow, true);
      assert.ok(metrics.heroCta.width >= 44 && metrics.heroCta.height >= 44);
      assert.ok(metrics.headerCta.height >= 44);
      if (width === 1440) assert.ok(metrics.heroCta.bottom <= 900, 'desktop hero CTA falls below first viewport');
      pass(`${label} responsive`, `${width}×${height}; no overflow; Barlow loaded`);
    }

    await page.setViewportSize({ width: 390, height: 844 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await loadAllImages(page);
    const proof = await page.evaluate(() => {
      const grid = document.querySelector('.logo-grid');
      const tiles = [...grid.children];
      const bank = document.querySelector('.bi-proof');
      const peer = bank.nextElementSibling;
      const bankBox = bank.getBoundingClientRect();
      const peerBox = peer.getBoundingClientRect();
      return {
        columns: getComputedStyle(grid).gridTemplateColumns.split(' ').length,
        count: tiles.length,
        bank: { width: bankBox.width, height: bankBox.height, background: getComputedStyle(bank).backgroundColor },
        peer: { width: peerBox.width, height: peerBox.height, background: getComputedStyle(peer).backgroundColor },
        order: [...document.querySelectorAll('main > section')].slice(0, 3).map((section) => section.id || [...section.classList].find((value) => value !== 'section')),
        imageFailures: [...document.images].filter((image) => !image.complete || image.naturalWidth === 0).map((image) => image.src),
      };
    });
    assert.equal(proof.columns, 3);
    assert.equal(proof.count, 31);
    assert.deepEqual(proof.bank, proof.peer);
    assert.deepEqual(proof.order, ['top', 'audience', 'proof']);
    assert.deepEqual(proof.imageFailures, []);
    pass('proof contract', '31 static tiles; 3 mobile columns; Bank Indonesia matches peer tile; hero → audience → proof');

    const keyboardPage = await context.newPage();
    await keyboardPage.setViewportSize({ width: 390, height: 844 });
    await keyboardPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await keyboardPage.keyboard.press('Tab');
    assert.equal((await keyboardPage.locator(':focus').textContent()).trim(), 'Lewati ke konten utama');
    await keyboardPage.keyboard.press('Enter');
    assert.equal(await keyboardPage.evaluate(() => document.activeElement.id), 'main-content');
    await keyboardPage.keyboard.press('Tab');
    const nextFocus = await keyboardPage.evaluate(() => ({
      tag: document.activeElement.tagName,
      href: document.activeElement.getAttribute('href'),
      insideMain: document.querySelector('main').contains(document.activeElement),
    }));
    assert.deepEqual(nextFocus, { tag: 'A', href: '#inquiry', insideMain: true });
    await keyboardPage.close();
    pass('keyboard skip link', 'Tab → Enter moves focus to main; next Tab continues inside page');

    await page.locator('#inquiry').scrollIntoViewIfNeeded();
    await page.locator('#submit-button').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'error-summary');
    assert.ok(await page.locator('#error-summary li').count() >= 7);
    pass('validation state', `${await page.locator('#error-summary li').count()} linked errors; focus moved to summary`);

    await page.locator('[name="preferred_contact_channel"][value="WhatsApp"]').check();
    assert.equal(await page.locator('#whatsapp').getAttribute('required'), '');
    await page.locator('#approximate_timing').selectOption('specific');
    assert.equal(await page.locator('#timing-detail-field').isVisible(), true);
    assert.equal(await page.locator('#timing_detail').getAttribute('required'), '');
    pass('conditional fields', 'WhatsApp and specific timing requirements activate');

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.locator('#inquiry').scrollIntoViewIfNeeded();
    await fillValidForm(page);
    const urlBefore = page.url();
    const requestsBefore = inquiryRequests.length;
    await page.locator('#submit-button').click();
    await page.locator('#submission-error').waitFor({ state: 'visible' });
    assert.equal(inquiryRequests.length, requestsBefore, 'unconfigured form made a request');
    assert.equal(page.url(), urlBefore);
    assert.equal(await page.locator('#name').inputValue(), 'Nama QA');
    assert.equal(await page.evaluate(() => document.activeElement.id), 'submission-error');
    pass('unconfigured endpoint', 'fails closed without request; values and URL preserved');

    await page.locator('#work_email').fill('invalid');
    await page.locator('[data-retry]').click();
    assert.equal(await page.evaluate(() => document.activeElement.id), 'error-summary');
    assert.equal(inquiryRequests.length, requestsBefore, 'invalid retry made a request');
    await page.locator('#work_email').fill('qa@example.test');
    pass('retry validation', 'edited values are revalidated before any retry request');

    let releaseHeldInquiry;
    heldInquiryResponse = new Promise((resolve) => { releaseHeldInquiry = resolve; });
    await page.locator('#inquiry-form').evaluate((form) => { form.dataset.endpoint = '/__qa__/corporate-inquiry'; });
    await page.evaluate(() => {
      document.querySelector('#submit-button').click();
      document.querySelector('#inquiry-form').dispatchEvent(new Event('submit', { bubbles: true, cancelable: true }));
    });
    await page.waitForTimeout(100);
    assert.equal(inquiryRequests.length, requestsBefore + 1, 'concurrent submit started more than one request');
    assert.equal(await page.locator('#submit-button').isDisabled(), true);
    assert.equal(await page.locator('[data-retry]').isDisabled(), true);
    assert.equal(await page.locator('#inquiry-form').getAttribute('aria-busy'), 'true');
    releaseHeldInquiry();
    heldInquiryResponse = null;
    await page.locator('#success-state').waitFor({ state: 'visible' });
    assert.equal(await page.evaluate(() => document.activeElement.id), 'success-heading');
    assert.equal((await page.locator('#success-heading').textContent()).trim(), 'Terima kasih. Tim kami akan menghubungi Anda.');
    assert.equal(inquiryRequests.length, requestsBefore + 1);
    const acceptedRequest = inquiryRequests.at(-1);
    assert.equal(acceptedRequest.method, 'POST');
    assert.ok(acceptedRequest.headers['idempotency-key']);
    assert.equal(new URL(acceptedRequest.url).search, '');
    assert.equal(acceptedRequest.body.work_email, 'qa@example.test');
    for (const field of ['source_channel', 'active_owner', 'ownership_status', 'sender_persona']) {
      assert.equal(field in acceptedRequest.body, false, `${field} must be server-owned`);
    }
    pass('single-flight submission', 'concurrent submit/retry events produce one request; controls remain locked until completion');
    pass('mocked accepted response', 'success appears only after local 202 accepted response with submission ID');

    await page.addScriptTag({ path: AXE_PATH });
    const axe = await page.evaluate(async () => axe.run(document, { resultTypes: ['violations'] }));
    const serious = axe.violations.filter((violation) => ['critical', 'serious'].includes(violation.impact));
    assert.deepEqual(serious.map((violation) => `${violation.id}:${violation.impact}`), []);
    pass('axe accessibility', `${axe.violations.length} total; 0 serious/critical`);

    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await page.setViewportSize({ width: 390, height: 844 });
    await loadAllImages(page);
    await page.screenshot({ path: path.join(OUTPUT, 'full-page-mobile-390x844.png'), fullPage: true });
    await page.setViewportSize({ width: 1440, height: 900 });
    await page.goto(BASE_URL, { waitUntil: 'networkidle' });
    await loadAllImages(page);
    await page.screenshot({ path: path.join(OUTPUT, 'full-page-desktop-1440x900.png'), fullPage: true });
    pass('screenshots', 'clean full-page mobile and desktop evidence generated');

    assert.deepEqual(consoleErrors, []);
    assert.deepEqual(pageErrors, []);
    for (const url of mockedExternalRequests) {
      assert.ok(!/private|example\.com|081234567890|Nama%20QA|Organisasi%20QA/i.test(url), `PII leaked to mocked tracker URL: ${url}`);
    }
    const storage = await page.evaluate(() => ({ local: localStorage.length, session: sessionStorage.length }));
    assert.deepEqual(storage, { local: 0, session: 0 });
    pass('runtime boundary', `0 console/page errors; ${mockedExternalRequests.length} tracker request(s) intercepted; storage empty`);

    const noJsContext = await browser.newContext({ javaScriptEnabled: false });
    const noJsPage = await noJsContext.newPage();
    const noJsRequests = [];
    await noJsPage.route('**/*', async (route) => {
      const request = route.request();
      const url = new URL(request.url());
      if (request.isNavigationRequest() && request.method() !== 'GET') noJsRequests.push({ method: request.method(), url: request.url() });
      if (url.origin === new URL(BASE_URL).origin) await route.continue();
      else await route.fulfill({ status: 204, contentType: 'text/plain', body: '' });
    });
    await noJsPage.goto(BASE_URL, { waitUntil: 'networkidle' });
    await noJsPage.locator('#name').fill('Native Fallback QA');
    await noJsPage.locator('#organization').fill('Organisasi QA');
    await noJsPage.locator('#role_title').fill('Learning and Development');
    await noJsPage.locator('#work_email').fill('native@example.test');
    await noJsPage.locator('#need_context').fill('Konteks QA untuk memverifikasi fallback POST tanpa JavaScript dan tanpa data di URL.');
    await noJsPage.locator('[name="preferred_contact_channel"][value="Email"]').check({ force: true });
    await noJsPage.locator('#consent').check({ force: true });
    assert.equal(await noJsPage.locator('#submit-button').getAttribute('type'), 'button');
    await noJsPage.locator('#submit-button').click({ force: true });
    await noJsPage.locator('#name').press('Enter');
    await noJsPage.waitForTimeout(100);
    assert.deepEqual(noJsRequests, []);
    assert.equal(new URL(noJsPage.url()).search, '');
    await noJsContext.close();
    pass('JavaScript-disabled boundary', 'submit remains inert; no navigation or request contains form values');

    const report = {
      generatedAt: new Date().toISOString(),
      chrome: await browser.version(),
      baseUrl: 'local corporate route',
      results,
      consoleErrors,
      pageErrors,
      mockedExternalRequestCount: mockedExternalRequests.length,
      inquiryRequestCount: inquiryRequests.length,
    };
    fs.writeFileSync(path.join(OUTPUT, 'qa-results.json'), JSON.stringify(report, null, 2));
    fs.writeFileSync(path.join(OUTPUT, 'axe-results.json'), JSON.stringify(axe, null, 2));
    console.log(`\n${results.length} checks passed.`);
  } finally {
    await browser.close();
  }
})().catch((error) => {
  console.error(error.stack || error);
  process.exit(1);
});
