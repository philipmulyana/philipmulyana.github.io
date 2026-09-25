(() => {
  const ENDPOINT = 'https://philip-mulyana--corporate-testimonial-api-web.modal.run/submit';
  const FIELD_NAMES = ['name', 'job_title', 'company', 'event_program', 'testimonial'];
  const FIELD_RULES = {
    name: { label: 'Nama', min: 2, max: 120 },
    job_title: { label: 'Jabatan', min: 2, max: 160 },
    company: { label: 'Nama perusahaan', min: 2, max: 160 },
    event_program: { label: 'Acara/program yang diikuti', min: 2, max: 200 },
    testimonial: { label: 'Isi testimonial', min: 20, max: 3000 },
  };

  function validateValues(values) {
    return FIELD_NAMES.flatMap((name) => {
      const rule = FIELD_RULES[name];
      const value = String(values[name] || '').trim();
      if (!value) return [{ name, message: `${rule.label} wajib diisi.` }];
      if (value.length < rule.min) {
        return [{ name, message: `${rule.label} perlu diisi minimal ${rule.min} karakter.` }];
      }
      if (value.length > rule.max) {
        return [{ name, message: `${rule.label} terlalu panjang.` }];
      }
      return [];
    });
  }

  function buildPayload(values) {
    const payload = {};
    FIELD_NAMES.forEach((name) => {
      payload[name] = String(values[name] || '').trim();
    });
    return payload;
  }

  async function submitPayload(fetchImpl, payload, startedAt, submissionId) {
    const response = await fetchImpl(ENDPOINT, {
      method: 'POST',
      credentials: 'omit',
      referrerPolicy: 'strict-origin-when-cross-origin',
      headers: {
        'Content-Type': 'application/json',
        'X-Form-Started-At': String(startedAt),
        'X-Submission-ID': submissionId,
      },
      body: JSON.stringify(payload),
    });
    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }
    if (!response.ok || body?.ok !== true) throw new Error('Submission failed');
  }

  function init(documentRef, fetchImpl, now = () => Date.now()) {
    const form = documentRef.querySelector('[data-corporate-feedback-form]');
    if (!form) return;

    const summary = documentRef.getElementById('form-errors');
    const summaryList = summary.querySelector('ul');
    const submitStatus = documentRef.getElementById('submit-status');
    const successState = documentRef.getElementById('success-state');
    const submitButton = form.querySelector('[type="submit"]');
    const startedAt = now();
    const submissionId = window.crypto.randomUUID();
    let submitting = false;

    function valuesFromForm() {
      return Object.fromEntries(FIELD_NAMES.map((name) => [name, form.elements[name].value]));
    }

    function clearErrors() {
      summary.hidden = true;
      summaryList.replaceChildren();
      FIELD_NAMES.forEach((name) => {
        const field = form.elements[name];
        field.removeAttribute('aria-invalid');
        documentRef.getElementById(`${name}-error`).textContent = '';
      });
      submitStatus.textContent = '';
    }

    function showErrors(errors) {
      summaryList.replaceChildren();
      errors.forEach(({ name, message }) => {
        const field = form.elements[name];
        field.setAttribute('aria-invalid', 'true');
        documentRef.getElementById(`${name}-error`).textContent = message;
        const item = documentRef.createElement('li');
        const link = documentRef.createElement('a');
        link.href = `#${name}`;
        link.textContent = message;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          field.focus();
        });
        item.append(link);
        summaryList.append(item);
      });
      summary.hidden = false;
      summary.focus();
    }

    form.addEventListener('submit', async (event) => {
      event.preventDefault();
      if (submitting) return;
      clearErrors();
      const values = valuesFromForm();
      const errors = validateValues(values);
      if (errors.length) {
        showErrors(errors);
        return;
      }

      submitting = true;
      form.setAttribute('aria-busy', 'true');
      submitButton.disabled = true;
      submitStatus.textContent = 'Sedang mengirim testimonial…';
      try {
        await submitPayload(fetchImpl, buildPayload(values), startedAt, submissionId);
        form.hidden = true;
        successState.hidden = false;
        successState.focus();
      } catch (_error) {
        submitStatus.textContent = 'Kami belum dapat menerima testimonial Anda. Coba lagi beberapa saat.';
        submitStatus.focus();
      } finally {
        submitting = false;
        form.removeAttribute('aria-busy');
        submitButton.disabled = false;
      }
    });
  }

  const api = { ENDPOINT, FIELD_NAMES, validateValues, buildPayload, submitPayload, init };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined' && typeof fetch === 'function') init(document, fetch.bind(globalThis));
})();
