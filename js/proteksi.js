// Kalkulator Kebutuhan Proteksi (Uang Pertanggungan) — income approach + lead gen
const WEBSITE_CALC_ENDPOINT = 'https://philip-mulyana--ai-lead-gen-gateway.modal.run/campaign';

// Session tracking for funnel analysis
function getSessionId() {
    let sid = sessionStorage.getItem('calc_session_id');
    if (!sid) {
        sid = (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random().toString(36).slice(2));
        sessionStorage.setItem('calc_session_id', sid);
    }
    return sid;
}

function fireFunnelEvent(eventName, age, income, isAgent) {
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'funnel_event',
            calculator: 'proteksi',
            event: eventName,
            session_id: getSessionId(),
            age, income, is_agent: isAgent,
            user_agent: navigator.userAgent.slice(0, 200),
        }),
        keepalive: true,
    }).catch(() => {});
}

// Income approach: UP = penghasilan tahunan × sisa tahun produktif (sampai 55). No inflation adjust (disederhanakan).
const PROTECTION_END_AGE = 55;
const STORAGE_KEY_PROT = 'calc_proteksi_state_v1';

// --- Preserve form state across reloads ---
function saveProtState() {
    try {
        const state = {
            income: document.getElementById('prot-monthly-income')?.value || '',
            age: document.getElementById('prot-age')?.value || '',
            agent: document.querySelector('input[name="prot-is-agent"]:checked')?.value || 'no',
            nama: document.getElementById('prot-nama')?.value || '',
            email: document.getElementById('prot-email')?.value || '',
            wa: document.getElementById('prot-whatsapp')?.value || '',
        };
        localStorage.setItem(STORAGE_KEY_PROT, JSON.stringify(state));
    } catch(e) {}
}

function restoreProtState() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY_PROT) || '{}');
        const setVal = (id, v, fmt) => {
            const el = document.getElementById(id);
            if (el && v) { el.value = v; if (fmt) formatNumberInput(el); el.addEventListener('input', saveProtState); }
        };
        setVal('prot-monthly-income', s.income, true);
        setVal('prot-age', s.age, false);
        setVal('prot-nama', s.nama);
        setVal('prot-email', s.email);
        setVal('prot-whatsapp', s.wa);
        if (s.agent) {
            const r = document.querySelector(`input[name="prot-is-agent"][value="${s.agent}"]`);
            if (r) r.checked = true;
        }
    } catch(e) {}
}

function clearProtState() {
    try { localStorage.removeItem(STORAGE_KEY_PROT); } catch(e) {}
}

// --- Comma formatting for number inputs ---
function formatNumberInput(input) {
    const raw = input.value.replace(/[^0-9]/g, '');
    input.dataset.rawValue = raw;
    if (raw === '') { input.value = ''; return; }
    input.value = Number(raw).toLocaleString('en-US');
}

function getRawValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const raw = el.dataset.rawValue || el.value.replace(/[^0-9]/g, '');
    return parseFloat(raw) || 0;
}

function initNumberFormatting() {
    document.querySelectorAll('.formatted-number').forEach(input => {
        input.addEventListener('input', () => formatNumberInput(input));
        if (input.value) formatNumberInput(input);
    });
}

function formatRp(num) {
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

// Store calculation results for reveal after lead capture
let calcResults = null;

function getIsAgent() {
    const checked = document.querySelector('input[name="prot-is-agent"]:checked');
    return checked ? checked.value === 'yes' : false;
}

function buildBreakdownTableHTML(data) {
    const { monthlyIncome, annualIncome, yearsRemaining } = data;
    return `
        <!-- Breakdown Table -->
        <div class="space-y-0 text-sm mb-6">
            <div class="flex justify-between py-3 px-4 bg-gray-50 border-b border-gray-100">
                <span class="text-gray-500">Penghasilan bulanan kamu</span>
                <span class="font-bold">${formatRp(monthlyIncome)}</span>
            </div>
            <div class="flex justify-between py-3 px-4 border-b border-gray-100">
                <span class="text-gray-500">Penghasilan tahunan kamu</span>
                <span class="font-bold">${formatRp(annualIncome)}</span>
            </div>
            <div class="flex justify-between py-3 px-4 bg-gray-50 border-b border-gray-100">
                <span class="text-gray-500">Sisa tahun produktif (sampai usia 55)</span>
                <span class="font-bold">${yearsRemaining} tahun</span>
            </div>
            <div class="flex justify-between py-3 px-4">
                <span class="text-gray-500">Metode</span>
                <span class="font-bold">Income approach</span>
            </div>
        </div>
    `;
}

function buildDisclaimerHTML() {
    return `
        <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center">
                *Perkiraan dengan metode income approach: penghasilan tahunan × sisa tahun produktif sampai usia 55, tanpa penyesuaian inflasi (disederhanakan). Angka aktual bisa berbeda tergantung utang, jumlah tanggungan, dan aset yang sudah ada.
            </p>
        </div>
    `;
}

function calculateProteksi() {
    const monthlyIncome = getRawValue('prot-monthly-income');
    const currentAge = parseInt(document.getElementById('prot-age').value) || 0;
    const isAgent = getIsAgent();

    const resultsEl = document.getElementById('prot-results');

    if (monthlyIncome <= 0 || currentAge <= 0) {
        resultsEl.innerHTML = '<p class="text-red-500 text-sm">Mohon isi penghasilan bulanan dan usia.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    if (currentAge >= PROTECTION_END_AGE) {
        resultsEl.innerHTML = '<p class="text-red-500 text-sm">Usia harus di bawah 55 tahun untuk menggunakan kalkulator ini.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    const yearsRemaining = PROTECTION_END_AGE - currentAge;

    // Income approach
    const annualIncome = monthlyIncome * 12;
    const upNeeded = annualIncome * yearsRemaining;

    // Store for later reveal
    calcResults = { monthlyIncome, annualIncome, upNeeded, yearsRemaining, currentAge, isAgent };

    // Fire-and-forget: log calculator usage event (top-of-funnel metric)
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'calc_view',
            calculator: 'proteksi',
            current_age: currentAge,
            monthly_income: monthlyIncome,
            is_agent: isAgent,
        }),
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    const heroHTML = `
        <h3 class="text-lg font-bold text-center mb-1">Perkiraan Kebutuhan Proteksi Kamu</h3>
        <p class="text-xs text-gray-400 text-center mb-6">Berdasarkan data yang kamu masukkan</p>

        <!-- Hero: UP Needed -->
        <div class="bg-red-50 rounded-2xl p-6 mb-6 text-center">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Nilai Proteksi (Uang Pertanggungan) yang Sepadan</p>
            <p class="text-3xl md:text-4xl font-black text-red-700">${formatRp(upNeeded)}</p>
            <p class="text-xs text-gray-400 mt-2">= nilai ekonomi penghasilan kamu selama ${yearsRemaining} tahun ke depan</p>
        </div>
    `;

    if (isAgent) {
        // Agent: numbers only — no urgency, no persuasion, no CTA
        resultsEl.innerHTML = heroHTML + buildBreakdownTableHTML(calcResults) + buildDisclaimerHTML();
    } else {
        // Non-agent: big number + urgency + consent gate
        resultsEl.innerHTML = heroHTML + `
            <!-- Lead Capture Gate -->
            <div id="lead-gate" class="bg-gray-50 rounded-2xl p-6">
                <div class="mb-6">
                    <p class="text-base font-bold text-gray-900 mb-3">Bayangkan penghasilan kamu berhenti bulan depan.</p>

                    <!-- Emotional scenario -->
                    <div class="border-l-4 border-gray-900 pl-4 mb-5">
                        <p class="text-sm text-gray-800 leading-relaxed mb-3">
                            Bukan berhenti sementara. Permanen. Tapi hidup keluarga kamu tidak ikut berhenti: cicilan tetap jalan, sekolah anak tetap jalan, biaya hidup tetap jalan tiap bulan.
                        </p>
                        <p class="text-sm text-gray-800 leading-relaxed mb-3">
                            Yang hilang bukan cuma sosok kamu, tapi aliran penghasilan yang selama ini menopang semuanya. Dan itu tidak bisa digantikan oleh tabungan beberapa bulan.
                        </p>
                        <p class="text-sm text-gray-800 leading-relaxed font-medium">
                            Angka di atas adalah perkiraan nilai ekonomi kamu buat keluarga — berapa yang dibutuhkan supaya rencana hidup mereka tetap jalan tanpa kamu.
                        </p>
                    </div>

                    <p class="text-sm text-gray-700 leading-relaxed mb-4">
                        Ini bukan soal menakut-nakuti. Ini soal memastikan orang-orang yang bergantung sama kamu tetap berdiri kalau skenario terburuk terjadi di waktu yang tidak bisa kamu pilih.
                    </p>

                    <!-- Identity closing -->
                    <p class="text-sm text-gray-900 font-bold leading-relaxed mb-2">
                        Pertanyaannya bukan "berapa nilai proteksi yang ideal."
                    </p>
                    <p class="text-sm text-gray-900 font-bold leading-relaxed">
                        Pertanyaannya: kalau kamu tidak ada besok, keluarga kamu bisa bertahan berapa lama?
                    </p>
                </div>

                <!-- Consent checkbox -->
                <label class="flex items-start gap-3 cursor-pointer mb-5 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors" id="prot-consent-label">
                    <input type="checkbox" id="prot-consent" class="mt-0.5 w-5 h-5 accent-black flex-shrink-0" onchange="toggleConsent()">
                    <span class="text-sm text-gray-700 leading-relaxed">
                        Saya setuju Philip menghubungi saya via WhatsApp untuk <strong>membantu saya menyiapkan proteksi penghasilan</strong> — supaya keluarga saya <strong>tetap berdiri</strong> kalau terjadi sesuatu pada saya.
                    </span>
                </label>

                <!-- Form (disabled until consent) -->
                <div id="lead-form" class="space-y-3 max-w-md mx-auto opacity-40 pointer-events-none transition-opacity">
                    <input type="text" id="prot-nama" placeholder="Nama kamu"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <input type="email" id="prot-email" placeholder="Email kamu"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <input type="tel" id="prot-whatsapp" placeholder="Nomor WhatsApp (e.g. 081234567890)"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <button onclick="revealResults()" id="prot-submit"
                        class="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                        Jadwalkan Konsultasi & Lihat Detail
                    </button>
                </div>
                <p id="gate-error" class="text-red-500 text-xs mt-2 text-center hidden"></p>
            </div>

            <!-- Hidden: confirmation (revealed after lead capture) -->
            <div id="full-breakdown" class="hidden"></div>
        ` + buildDisclaimerHTML();
    }

    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Restore lead form fields if user previously typed (and wire up listeners)
    restoreProtState();

    // Track when lead gate enters viewport
    const gateEl = document.getElementById('lead-gate');
    if (gateEl && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fireFunnelEvent('gate_seen', currentAge, monthlyIncome, isAgent);
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        obs.observe(gateEl);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleConsent() {
    const checked = document.getElementById('prot-consent').checked;
    const form = document.getElementById('lead-form');
    if (!form) return;
    if (checked) {
        form.classList.remove('opacity-40', 'pointer-events-none');
        if (calcResults && !window._consentFired) {
            window._consentFired = true;
            fireFunnelEvent('consent_ticked', calcResults.currentAge, calcResults.monthlyIncome, calcResults.isAgent);
        }
    } else {
        form.classList.add('opacity-40', 'pointer-events-none');
    }
}

function revealResults() {
    const consentEl = document.getElementById('prot-consent');
    const errorEl = document.getElementById('gate-error');

    if (!consentEl || !consentEl.checked) {
        errorEl.textContent = 'Mohon centang persetujuan di atas dulu sebelum mengirim data.';
        errorEl.classList.remove('hidden');
        return;
    }

    const nama = document.getElementById('prot-nama').value.trim();
    const email = document.getElementById('prot-email').value.trim();
    const whatsapp = document.getElementById('prot-whatsapp').value.trim();
    const submitBtn = document.getElementById('prot-submit');

    const errors = [];
    if (!nama) errors.push('nama');
    if (!isValidEmail(email)) errors.push('email yang valid');
    if (!whatsapp || whatsapp.length < 8) errors.push('nomor WhatsApp');

    if (errors.length > 0) {
        errorEl.textContent = 'Mohon isi ' + errors.join(', ') + '.';
        errorEl.classList.remove('hidden');
        return;
    }

    errorEl.classList.add('hidden');
    if (!calcResults) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    // Fire-and-forget POST to backend (email + sheets + Pipedrive)
    const payload = JSON.stringify({
        action: 'website_calc',
        calculator: 'proteksi',
        nama,
        email,
        whatsapp,
        monthly_income: calcResults.monthlyIncome,
        up_needed: calcResults.upNeeded,
        current_age: parseInt(document.getElementById('prot-age').value),
        is_agent: false,
    });

    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    clearProtState();

    document.getElementById('lead-gate').style.display = 'none';

    const confirmEl = document.getElementById('full-breakdown');
    confirmEl.innerHTML = `
        <div class="text-center py-6">
            <p class="text-base font-bold text-gray-900 mb-2">Terima kasih!</p>
            <p class="text-sm text-gray-700 leading-relaxed mb-5">
                Satu langkah lagi: pilih jam ngobrol yang cocok buat kamu.
                Cuma <strong>10 menit</strong>, gratis, tanpa kewajiban apa pun.
            </p>
            <a href="https://calendly.com/philipmulyana/first-call" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors">
                Pilih Jam Ngobrol — 10 Menit
            </a>
            <p class="text-xs text-gray-400 mt-4">Kalau lebih nyaman, Philip juga akan menghubungi kamu via WhatsApp.</p>
        </div>
    `;
    confirmEl.classList.remove('hidden');
    confirmEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
    initNumberFormatting();
    restoreProtState();
    ['prot-monthly-income', 'prot-age'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', saveProtState);
    });
    document.querySelectorAll('input[name="prot-is-agent"]').forEach(r => r.addEventListener('change', saveProtState));
});
