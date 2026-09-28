(() => {
  'use strict';

  const FIELD_NAMES = [
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

  const TIMING_OPTIONS = new Set(['', 'Dalam 1 bulan', '1–3 bulan lagi', 'Lebih dari 3 bulan lagi', 'specific']);
  const CONTACT_CHANNELS = new Set(['Email', 'WhatsApp']);
  const SUBMISSION_ID_PATTERN = /^[A-Za-z0-9][A-Za-z0-9._:-]{0,127}$/;

  const MESSAGES = {
    name: { empty: 'Masukkan nama lengkap Anda.', invalid: 'Nama perlu berisi 2–120 karakter.' },
    organization: { empty: 'Masukkan nama perusahaan atau organisasi.', invalid: 'Nama organisasi perlu berisi 2–160 karakter.' },
    role_title: { empty: 'Masukkan jabatan atau peran Anda.', invalid: 'Jabatan atau peran perlu berisi 2–160 karakter.' },
    work_email: { empty: 'Masukkan email kerja Anda.', invalid: 'Masukkan alamat email yang valid.' },
    whatsapp: { required: 'Masukkan nomor WhatsApp atau pilih email sebagai saluran yang diutamakan.', invalid: 'Periksa kembali nomor WhatsApp yang dimasukkan.' },
    need_context: { empty: 'Ceritakan kebutuhan atau konteks acara Anda.', short: 'Tambahkan sedikit konteks agar kebutuhan dapat ditinjau.', long: 'Ringkas konteks menjadi maksimal 2.000 karakter.' },
    approximate_timing: { invalid: 'Pilih perkiraan waktu yang tersedia.' },
    timing_detail: { empty: 'Masukkan tanggal atau rentang waktu yang diperkirakan.', invalid: 'Ringkas tanggal atau rentang waktu menjadi maksimal 120 karakter.' },
    preferred_contact_channel: { empty: 'Pilih email atau WhatsApp sebagai saluran kontak yang diutamakan.' },
    consent: { empty: 'Centang persetujuan agar kami dapat menanggapi inquiry Anda.' },
  };

  const textValue = (values, name) => String(values[name] || '').trim();

  function validateValues(values) {
    const errors = [];
    const add = (name, message) => errors.push({ name, message });
    const name = textValue(values, 'name');
    const organization = textValue(values, 'organization');
    const roleTitle = textValue(values, 'role_title');
    const workEmail = textValue(values, 'work_email');
    const whatsapp = textValue(values, 'whatsapp');
    const needContext = textValue(values, 'need_context');
    const timing = textValue(values, 'approximate_timing');
    const timingDetail = textValue(values, 'timing_detail');
    const preferredChannel = textValue(values, 'preferred_contact_channel');

    if (!name) add('name', MESSAGES.name.empty);
    else if (name.length < 2 || name.length > 120) add('name', MESSAGES.name.invalid);

    if (!organization) add('organization', MESSAGES.organization.empty);
    else if (organization.length < 2 || organization.length > 160) add('organization', MESSAGES.organization.invalid);

    if (!roleTitle) add('role_title', MESSAGES.role_title.empty);
    else if (roleTitle.length < 2 || roleTitle.length > 160) add('role_title', MESSAGES.role_title.invalid);

    if (!workEmail) add('work_email', MESSAGES.work_email.empty);
    else if (workEmail.length > 254 || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(workEmail)) add('work_email', MESSAGES.work_email.invalid);

    const whatsappDigits = whatsapp.replace(/[^0-9]/g, '');
    if (preferredChannel === 'WhatsApp' && !whatsapp) add('whatsapp', MESSAGES.whatsapp.required);
    else if (whatsapp && (
      whatsapp.length > 32
      || !/^\+?[0-9().\s-]+$/.test(whatsapp)
      || whatsappDigits.length < 8
      || whatsappDigits.length > 16
    )) add('whatsapp', MESSAGES.whatsapp.invalid);

    if (!needContext) add('need_context', MESSAGES.need_context.empty);
    else if (needContext.length < 20) add('need_context', MESSAGES.need_context.short);
    else if (needContext.length > 2000) add('need_context', MESSAGES.need_context.long);

    if (!TIMING_OPTIONS.has(timing)) add('approximate_timing', MESSAGES.approximate_timing.invalid);
    if (timing === 'specific' && !timingDetail) add('timing_detail', MESSAGES.timing_detail.empty);
    else if (timing === 'specific' && timingDetail.length > 120) add('timing_detail', MESSAGES.timing_detail.invalid);
    if (!CONTACT_CHANNELS.has(preferredChannel)) add('preferred_contact_channel', MESSAGES.preferred_contact_channel.empty);
    if (values.consent !== true) add('consent', MESSAGES.consent.empty);

    return errors;
  }

  function buildPayload(values) {
    return Object.fromEntries(FIELD_NAMES.map((name) => [
      name,
      name === 'consent'
        ? values[name] === true
        : name === 'timing_detail' && textValue(values, 'approximate_timing') !== 'specific'
          ? ''
          : textValue(values, name),
    ]));
  }

  function resolveEndpoint(rawEndpoint, origin) {
    const raw = String(rawEndpoint || '').trim();
    if (!raw) return null;
    try {
      const base = new URL(origin);
      const endpoint = new URL(raw, base);
      const localDevelopment = ['localhost', '127.0.0.1'].includes(endpoint.hostname);
      if (endpoint.origin !== base.origin) return null;
      if (endpoint.protocol !== 'https:' && !(localDevelopment && endpoint.protocol === 'http:')) return null;
      if (endpoint.username || endpoint.password || endpoint.search || endpoint.hash) return null;
      return endpoint.href;
    } catch (_error) {
      return null;
    }
  }

  async function submitPayload(fetchImpl, endpoint, payload, idempotencyKey, signal) {
    const options = {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Idempotency-Key': idempotencyKey,
      },
      body: JSON.stringify(payload),
      credentials: 'omit',
      referrerPolicy: 'no-referrer',
      cache: 'no-store',
    };
    if (signal) options.signal = signal;

    const response = await fetchImpl(endpoint, options);
    let body = null;
    try {
      body = await response.json();
    } catch (_error) {
      body = null;
    }
    const submissionId = typeof body?.submission_id === 'string' ? body.submission_id.trim() : '';
    if (!response.ok || body?.accepted !== true || !SUBMISSION_ID_PATTERN.test(submissionId)) {
      throw new Error('Submission failed');
    }
    return { submissionId };
  }

  function idempotencyAttempt(previousAttempt, payload, randomUUID) {
    const payloadSnapshot = JSON.stringify(payload);
    if (previousAttempt?.payloadSnapshot === payloadSnapshot && previousAttempt.key) return previousAttempt;
    return { payloadSnapshot, key: randomUUID() };
  }

  function init(documentRef, fetchImpl, locationRef, cryptoRef) {
    const form = documentRef.querySelector('#inquiry-form');
    if (!form) return;

    const summary = documentRef.querySelector('#error-summary');
    const summaryList = summary.querySelector('ul');
    const submitButton = documentRef.querySelector('#submit-button');
    const submitLabel = submitButton.querySelector('.button-label');
    const retryButton = documentRef.querySelector('[data-retry]');
    const submissionError = documentRef.querySelector('#submission-error');
    const successState = documentRef.querySelector('#success-state');
    const successHeading = documentRef.querySelector('#success-heading');
    const timing = documentRef.querySelector('#approximate_timing');
    const timingDetailField = documentRef.querySelector('#timing-detail-field');
    const timingDetail = documentRef.querySelector('#timing_detail');
    const whatsapp = documentRef.querySelector('#whatsapp');
    const context = documentRef.querySelector('#need_context');
    const contextCount = documentRef.querySelector('#need-count');
    const editableFields = [...form.querySelectorAll('input,select,textarea')];
    let currentAttempt = null;
    let inFlight = false;

    const preferredChannel = () => form.querySelector('[name="preferred_contact_channel"]:checked')?.value || '';
    const valuesFromForm = () => ({
      name: form.elements.name.value,
      organization: form.elements.organization.value,
      role_title: form.elements.role_title.value,
      work_email: form.elements.work_email.value,
      whatsapp: form.elements.whatsapp.value,
      need_context: form.elements.need_context.value,
      approximate_timing: form.elements.approximate_timing.value,
      timing_detail: form.elements.timing_detail.value,
      preferred_contact_channel: preferredChannel(),
      consent: form.elements.consent.checked,
    });

    const fieldsFor = (name) => name === 'preferred_contact_channel'
      ? [...form.querySelectorAll('[name="preferred_contact_channel"]')]
      : [form.elements[name]].filter(Boolean);

    const addDescribedBy = (field, errorId) => {
      const ids = new Set((field.getAttribute('aria-describedby') || '').split(/\s+/).filter(Boolean));
      ids.add(errorId);
      field.setAttribute('aria-describedby', [...ids].join(' '));
    };

    const removeDescribedBy = (field, errorId) => {
      const ids = (field.getAttribute('aria-describedby') || '').split(/\s+/).filter((id) => id && id !== errorId);
      if (ids.length) field.setAttribute('aria-describedby', ids.join(' '));
      else field.removeAttribute('aria-describedby');
    };

    const clearError = (name) => {
      const error = documentRef.querySelector(`#${name}-error`);
      if (!error) return;
      error.textContent = '';
      fieldsFor(name).forEach((field) => {
        field.removeAttribute('aria-invalid');
        removeDescribedBy(field, error.id);
      });
    };

    const setError = (name, message) => {
      const error = documentRef.querySelector(`#${name}-error`);
      if (!error) return;
      error.textContent = message;
      fieldsFor(name).forEach((field) => {
        field.setAttribute('aria-invalid', 'true');
        addDescribedBy(field, error.id);
      });
    };

    const validateField = (name) => {
      clearError(name);
      const error = validateValues(valuesFromForm()).find((item) => item.name === name);
      if (error) setError(name, error.message);
      return error?.message || '';
    };

    const validate = () => {
      const errors = validateValues(valuesFromForm());
      FIELD_NAMES.forEach(clearError);
      summaryList.replaceChildren();
      errors.forEach(({ name, message }) => {
        setError(name, message);
        const target = name === 'preferred_contact_channel'
          ? form.querySelector('[name="preferred_contact_channel"]')
          : form.elements[name];
        const item = documentRef.createElement('li');
        const link = documentRef.createElement('a');
        link.href = `#${target.id || target.name}`;
        link.textContent = message;
        link.addEventListener('click', (event) => {
          event.preventDefault();
          target.focus();
        });
        item.append(link);
        summaryList.append(item);
      });
      summary.hidden = errors.length === 0;
      if (errors.length) summary.focus();
      return errors.length === 0;
    };

    const setLoading = (loading) => {
      submitButton.disabled = loading;
      retryButton.disabled = loading;
      editableFields.forEach((field) => { field.disabled = loading; });
      form.setAttribute('aria-busy', String(loading));
      submitButton.classList.toggle('is-loading', loading);
      submitButton.setAttribute('aria-busy', String(loading));
      submitLabel.textContent = loading ? 'Sedang mengirim…' : 'Kirim Kebutuhan Organisasi';
    };

    const showSuccess = () => {
      form.hidden = true;
      submissionError.hidden = true;
      successState.hidden = false;
      successHeading.focus();
    };

    const showSubmissionError = () => {
      form.hidden = false;
      submissionError.hidden = false;
      successState.hidden = true;
      submissionError.focus();
    };

    const submitInquiry = async () => {
      if (inFlight) return;
      if (!validate()) return;
      const endpoint = resolveEndpoint(form.dataset.endpoint, locationRef.origin);
      if (!endpoint) {
        showSubmissionError();
        return;
      }

      const payload = buildPayload(valuesFromForm());
      currentAttempt = idempotencyAttempt(currentAttempt, payload, () => cryptoRef.randomUUID());
      const controller = new AbortController();
      const timeout = setTimeout(() => controller.abort(), 12000);
      inFlight = true;
      setLoading(true);
      submissionError.hidden = true;

      try {
        await submitPayload(fetchImpl, endpoint, payload, currentAttempt.key, controller.signal);
        showSuccess();
      } catch (_error) {
        showSubmissionError();
      } finally {
        clearTimeout(timeout);
        inFlight = false;
        setLoading(false);
      }
    };

    const updateTiming = () => {
      const open = timing.value === 'specific';
      timingDetailField.hidden = !open;
      timingDetail.required = open;
      if (!open) {
        timingDetail.value = '';
        clearError('timing_detail');
      }
    };

    const updateWhatsapp = () => {
      const required = preferredChannel() === 'WhatsApp';
      whatsapp.required = required;
      const label = documentRef.querySelector('label[for="whatsapp"]');
      label.textContent = required ? 'Nomor WhatsApp *' : 'Nomor WhatsApp (opsional)';
      if (whatsapp.value || required) validateField('whatsapp');
      else clearError('whatsapp');
    };

    const updateCount = () => {
      contextCount.textContent = `${context.value.length.toLocaleString('id-ID')} / 2.000`;
    };

    timing.addEventListener('change', updateTiming);
    context.addEventListener('input', updateCount);
    form.querySelectorAll('[name="preferred_contact_channel"]').forEach((radio) => radio.addEventListener('change', updateWhatsapp));
    form.querySelectorAll('input,select,textarea').forEach((field) => {
      field.addEventListener('blur', () => {
        if (field.name && field.name !== 'approximate_timing') validateField(field.name);
      });
    });

    form.addEventListener('submit', (event) => {
      event.preventDefault();
      submissionError.hidden = true;
      submitInquiry();
    });

    retryButton.addEventListener('click', () => {
      submissionError.hidden = true;
      submitInquiry();
    });
    documentRef.querySelector('[data-reset]').addEventListener('click', () => {
      form.reset();
      form.hidden = false;
      submissionError.hidden = true;
      successState.hidden = true;
      currentAttempt = null;
      summary.hidden = true;
      FIELD_NAMES.forEach(clearError);
      updateTiming();
      updateWhatsapp();
      updateCount();
      form.elements.name.focus();
    });

    updateTiming();
    updateWhatsapp();
    updateCount();
    submitButton.type = 'submit';
  }

  const api = { FIELD_NAMES, validateValues, buildPayload, resolveEndpoint, submitPayload, idempotencyAttempt, init };
  if (typeof module === 'object' && module.exports) module.exports = api;
  if (typeof document !== 'undefined' && typeof fetch === 'function') {
    init(document, fetch.bind(globalThis), window.location, window.crypto);
  }
})();
