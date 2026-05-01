// Kalkulator Dana Pensiun — hybrid lead gen version
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

function fireFunnelEvent(eventName, age, cost, isAgent) {
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'funnel_event',
            calculator: 'pension',
            event: eventName,
            session_id: getSessionId(),
            age, cost, is_agent: isAgent,
            user_agent: navigator.userAgent.slice(0, 200),
        }),
        keepalive: true,
    }).catch(() => {});
}
const INFLATION_RATE = 0.05;
const LIFE_EXPECTANCY = 75;
const RETIREMENT_AGE = 55;
const STORAGE_KEY_PEN = 'calc_pension_state_v1';

// --- Preserve form state across reloads ---
function savePenState() {
    try {
        const state = {
            cost: document.getElementById('ret-monthly-cost')?.value || '',
            age: document.getElementById('ret-age')?.value || '',
            agent: document.querySelector('input[name="ret-is-agent"]:checked')?.value || 'no',
            nama: document.getElementById('ret-nama')?.value || '',
            email: document.getElementById('ret-email')?.value || '',
            wa: document.getElementById('ret-whatsapp')?.value || '',
        };
        localStorage.setItem(STORAGE_KEY_PEN, JSON.stringify(state));
    } catch(e) {}
}

function restorePenState() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY_PEN) || '{}');
        const setVal = (id, v, fmt) => {
            const el = document.getElementById(id);
            if (el && v) { el.value = v; if (fmt) formatNumberInput(el); el.addEventListener('input', savePenState); }
        };
        setVal('ret-monthly-cost', s.cost, true);
        setVal('ret-age', s.age, false);
        setVal('ret-nama', s.nama);
        setVal('ret-email', s.email);
        setVal('ret-whatsapp', s.wa);
        if (s.agent) {
            const r = document.querySelector(`input[name="ret-is-agent"][value="${s.agent}"]`);
            if (r) r.checked = true;
        }
    } catch(e) {}
}

function clearPenState() {
    try { localStorage.removeItem(STORAGE_KEY_PEN); } catch(e) {}
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
    const checked = document.querySelector('input[name="ret-is-agent"]:checked');
    return checked ? checked.value === 'yes' : false;
}

function buildBreakdownTableHTML(data) {
    const { monthlyCost, monthlyCostAtRetirement, annualCostAtRetirement, yearsUntilRetirement } = data;
    return `
        <!-- Breakdown Table -->
        <div class="space-y-0 text-sm mb-6">
            <div class="flex justify-between py-3 px-4 bg-gray-50 border-b border-gray-100">
                <span class="text-gray-500">Biaya hidup bulanan saat ini</span>
                <span class="font-bold">${formatRp(monthlyCost)}</span>
            </div>
            <div class="flex justify-between py-3 px-4 border-b border-gray-100">
                <span class="text-gray-500">Biaya hidup bulanan di usia 55</span>
                <span class="font-bold">${formatRp(monthlyCostAtRetirement)}</span>
            </div>
            <div class="flex justify-between py-3 px-4 bg-gray-50 border-b border-gray-100">
                <span class="text-gray-500">Biaya hidup tahunan di usia 55</span>
                <span class="font-bold">${formatRp(annualCostAtRetirement)}</span>
            </div>
            <div class="flex justify-between py-3 px-4">
                <span class="text-gray-500">Waktu yang tersisa untuk mempersiapkan</span>
                <span class="font-bold">${yearsUntilRetirement} tahun</span>
            </div>
        </div>
    `;
}

function buildDisclaimerHTML() {
    return `
        <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center">
                *Perhitungan berdasarkan asumsi inflasi 5%/tahun dan ekspektasi usia 75 tahun.
                Hasil aktual dapat berbeda tergantung kondisi pasar dan gaya hidup.
            </p>
        </div>
    `;
}

function calculateRetirement() {
    const monthlyCost = getRawValue('ret-monthly-cost');
    const currentAge = parseInt(document.getElementById('ret-age').value) || 0;
    const isAgent = getIsAgent();

    const resultsEl = document.getElementById('ret-results');

    if (monthlyCost <= 0 || currentAge <= 0) {
        resultsEl.innerHTML = '<p class="text-red-500 text-sm">Mohon isi biaya hidup bulanan dan usia.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    if (currentAge >= RETIREMENT_AGE) {
        resultsEl.innerHTML = '<p class="text-red-500 text-sm">Usia harus di bawah 55 tahun untuk menggunakan kalkulator ini.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    const yearsUntilRetirement = RETIREMENT_AGE - currentAge;

    // Calculations
    const monthlyCostAtRetirement = monthlyCost * Math.pow(1 + INFLATION_RATE, yearsUntilRetirement);
    const annualCostAtRetirement = monthlyCostAtRetirement * 12;
    const totalNeeded = monthlyCostAtRetirement * 12 * (LIFE_EXPECTANCY - RETIREMENT_AGE);

    // Store for later reveal
    calcResults = { monthlyCost, monthlyCostAtRetirement, annualCostAtRetirement, totalNeeded, yearsUntilRetirement, currentAge, isAgent };

    // Fire-and-forget: log calculator usage event (top-of-funnel metric)
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'calc_view',
            current_age: currentAge,
            monthly_cost: monthlyCost,
            is_agent: isAgent,
        }),
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    const heroHTML = `
        <h3 class="text-lg font-bold text-center mb-1">Hasil Perhitungan Dana Pensiun</h3>
        <p class="text-xs text-gray-400 text-center mb-6">Berdasarkan data yang kamu masukkan</p>

        <!-- Hero: Total Dana Needed -->
        <div class="bg-red-50 rounded-2xl p-6 mb-6 text-center">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Total Dana Pensiun yang Kamu Butuhkan</p>
            <p class="text-3xl md:text-4xl font-black text-red-700">${formatRp(totalNeeded)}</p>
            <p class="text-xs text-gray-400 mt-2">untuk menjalani masa pensiun usia 55 - 75 tahun</p>
        </div>
    `;

    if (isAgent || currentAge >= 45) {
        // Agent or age ≥ 45: numbers only — no urgency, no persuasion, no CTA
        resultsEl.innerHTML = heroHTML + buildBreakdownTableHTML(calcResults) + buildDisclaimerHTML();
    } else {
        // Non-agent: show big number + urgency + consent gate
        resultsEl.innerHTML = heroHTML + `
            <!-- Lead Capture Gate -->
            <div id="lead-gate" class="bg-gray-50 rounded-2xl p-6">
                <!-- Urgency message -->
                <div class="mb-6">
                    <p class="text-base font-bold text-gray-900 mb-3">Bayangkan ${yearsUntilRetirement} tahun dari sekarang.</p>

                    <!-- Emotional scenario -->
                    <div class="border-l-4 border-gray-900 pl-4 mb-5">
                        <p class="text-sm text-gray-800 leading-relaxed mb-3">
                            Anak yang kamu besarkan dan kamu sekolahkan setinggi-tingginya sudah punya karir. Mungkin sudah berkeluarga, mungkin sudah punya anak sendiri.
                        </p>
                        <p class="text-sm text-gray-800 leading-relaxed mb-3">
                            Tapi setiap bulan, dia harus menyisihkan dari gajinya untuk transfer ke kamu — bukan karena ingin memberikan hadiah, tapi karena harus. Untuk biaya hidup kamu. Untuk obat-obatan kamu.
                        </p>
                        <p class="text-sm text-gray-800 leading-relaxed font-medium">
                            Kamu yang dulu jadi sandaran utama mereka, pelan-pelan jadi beban di samping kebutuhan keluarga mereka sendiri.
                        </p>
                    </div>

                    <p class="text-sm text-gray-700 leading-relaxed mb-4">
                        Ini bukan cerita yang dilebih-lebihkan. Ini realita mayoritas keluarga Indonesia hari ini — dan ada alasan struktural kenapa:
                    </p>

                    <!-- Compact data backup -->
                    <div class="bg-gray-100 rounded-xl p-4 mb-2">
                        <p class="text-sm text-gray-700 leading-relaxed mb-2">
                            <strong>Sistem tidak akan menyelamatkan.</strong> Singapura mewajibkan kontribusi pensiun <strong>37% dari gaji</strong>. Indonesia hanya <strong>8,7%</strong> lewat BPJS. Selisih hampir 30% itu adalah tanggung jawab pribadi yang harus kamu siapkan sendiri.
                        </p>
                        <p class="text-sm text-gray-700 leading-relaxed">
                            Hasilnya: <strong>kurang dari 15% pekerja Indonesia</strong> benar-benar siap secara finansial untuk pensiun. Sisanya bekerja jauh lebih lama dari yang seharusnya — atau bergantung pada anak.
                        </p>
                    </div>

                    <p class="text-[10px] text-gray-400 leading-relaxed mb-5">
                        Sumber: CPF Board Singapore (2026), BPJS Ketenagakerjaan, Manulife Asia Care Survey 2025, OECD Pensions at a Glance Asia/Pacific 2024.
                    </p>

                    <!-- Identity closing -->
                    <p class="text-sm text-gray-900 font-bold leading-relaxed mb-2">
                        Pertanyaannya bukan "berapa yang harus saya siapkan."
                    </p>
                    <p class="text-sm text-gray-900 font-bold leading-relaxed">
                        Pertanyaannya: orangtua seperti apa yang ingin kamu jadi di mata anakmu nanti?
                    </p>
                </div>

                <!-- Consent checkbox -->
                <label class="flex items-start gap-3 cursor-pointer mb-5 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors" id="ret-consent-label">
                    <input type="checkbox" id="ret-consent" class="mt-0.5 w-5 h-5 accent-black flex-shrink-0" onchange="toggleConsent()">
                    <span class="text-sm text-gray-700 leading-relaxed">
                        Saya setuju Philip menghubungi saya via WhatsApp untuk <strong>membantu saya memulai langkah pertama</strong> — supaya saya <strong>tidak menjadi beban untuk anak saya</strong> di masa pensiun.
                    </span>
                </label>

                <!-- Form (disabled until consent) -->
                <div id="lead-form" class="space-y-3 max-w-md mx-auto opacity-40 pointer-events-none transition-opacity">
                    <input type="text" id="ret-nama" placeholder="Nama kamu"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <input type="email" id="ret-email" placeholder="Email kamu"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <input type="tel" id="ret-whatsapp" placeholder="Nomor WhatsApp (e.g. 081234567890)"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <button onclick="revealResults()" id="ret-submit"
                        class="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                        Jadwalkan Konsultasi & Lihat Detail
                    </button>
                </div>
                <p id="gate-error" class="text-red-500 text-xs mt-2 text-center hidden"></p>
            </div>

            <!-- Hidden: Full breakdown (revealed after lead capture) -->
            <div id="full-breakdown" class="hidden"></div>
        ` + buildDisclaimerHTML();
    }

    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Restore lead form fields if user previously typed (and wire up listeners)
    restorePenState();

    // Track when lead gate enters viewport (= user scrolled to form)
    const gateEl = document.getElementById('lead-gate');
    if (gateEl && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fireFunnelEvent('gate_seen', currentAge, monthlyCost, isAgent);
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
    const checked = document.getElementById('ret-consent').checked;
    const form = document.getElementById('lead-form');
    if (!form) return;
    if (checked) {
        form.classList.remove('opacity-40', 'pointer-events-none');
        // Fire once per session to avoid spam if they tick/untick
        if (calcResults && !window._consentFired) {
            window._consentFired = true;
            fireFunnelEvent('consent_ticked', calcResults.currentAge, calcResults.monthlyCost, calcResults.isAgent);
        }
    } else {
        form.classList.add('opacity-40', 'pointer-events-none');
    }
}

function revealResults() {
    const consentEl = document.getElementById('ret-consent');
    const errorEl = document.getElementById('gate-error');

    if (!consentEl || !consentEl.checked) {
        errorEl.textContent = 'Mohon centang persetujuan di atas dulu sebelum mengirim data.';
        errorEl.classList.remove('hidden');
        return;
    }

    const nama = document.getElementById('ret-nama').value.trim();
    const email = document.getElementById('ret-email').value.trim();
    const whatsapp = document.getElementById('ret-whatsapp').value.trim();
    const submitBtn = document.getElementById('ret-submit');

    // Validate
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

    // Disable button while sending
    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    // Fire-and-forget POST to backend (email + sheets + Pipedrive)
    const payload = JSON.stringify({
        action: 'website_calc',
        nama,
        email,
        whatsapp,
        monthly_cost: calcResults.monthlyCost,
        current_age: parseInt(document.getElementById('ret-age').value),
        is_agent: false,
    });

    // Send to backend (CORS configured server-side)
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    // Successful submit — clear preserved state
    clearPenState();

    // Show simple confirmation (don't wait for backend)
    document.getElementById('lead-gate').style.display = 'none';

    const confirmEl = document.getElementById('full-breakdown');
    confirmEl.innerHTML = `
        <div class="text-center py-6">
            <p class="text-base font-bold text-gray-900 mb-2">Terima kasih!</p>
            <p class="text-sm text-gray-700 leading-relaxed">
                Philip akan menghubungi kamu via WhatsApp dalam <strong>1×24 jam</strong>.
            </p>
        </div>
    `;
    confirmEl.classList.remove('hidden');
    confirmEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
    initNumberFormatting();
    restorePenState();
    // Hook all calc inputs (initial set) to save on change
    ['ret-monthly-cost', 'ret-age'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', savePenState);
    });
    document.querySelectorAll('input[name="ret-is-agent"]').forEach(r => r.addEventListener('change', savePenState));
});
