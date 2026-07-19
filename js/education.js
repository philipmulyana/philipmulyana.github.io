// Kalkulator Dana Kuliah — hybrid lead gen version
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
            calculator: 'education',
            event: eventName,
            session_id: getSessionId(),
            age, cost, is_agent: isAgent,
            user_agent: navigator.userAgent.slice(0, 200),
        }),
        keepalive: true,
    }).catch(() => {});
}
const EDU_INFLATION = 0.10;
const KULIAH_START_AGE = 18;
const KULIAH_DURATION = 4;
const STORAGE_KEY_EDU = 'calc_education_state_v1';

// Threshold age for routing — child age 10+ (or agent) shows numbers only, no lead gate
const AGE_TOO_LATE = 10;

// --- Preserve form state across reloads ---
function saveEduState() {
    try {
        const state = {
            childAge: document.getElementById('edu-child-age')?.value || '',
            cost: document.getElementById('edu-kuliah-cost')?.value || '',
            agent: document.querySelector('input[name="edu-is-agent"]:checked')?.value || 'no',
            nama: document.getElementById('edu-nama')?.value || '',
            email: document.getElementById('edu-email')?.value || '',
            wa: document.getElementById('edu-whatsapp')?.value || '',
        };
        localStorage.setItem(STORAGE_KEY_EDU, JSON.stringify(state));
    } catch(e) {}
}

function restoreEduState() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY_EDU) || '{}');
        const setVal = (id, v, fmt) => {
            const el = document.getElementById(id);
            if (el && v) { el.value = v; if (fmt) formatNumberInput(el); el.addEventListener('input', saveEduState); }
        };
        setVal('edu-child-age', s.childAge, false);
        setVal('edu-kuliah-cost', s.cost, true);
        setVal('edu-nama', s.nama);
        setVal('edu-email', s.email);
        setVal('edu-whatsapp', s.wa);
        if (s.agent) {
            const r = document.querySelector(`input[name="edu-is-agent"][value="${s.agent}"]`);
            if (r) r.checked = true;
        }
    } catch(e) {}
}

function clearEduState() {
    try { localStorage.removeItem(STORAGE_KEY_EDU); } catch(e) {}
}

// --- Comma formatting ---
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

function formatRpShort(num) {
    if (num >= 1_000_000_000) return 'Rp ' + (num / 1_000_000_000).toFixed(1).replace('.0', '') + ' miliar';
    if (num >= 1_000_000) return 'Rp ' + (num / 1_000_000).toFixed(0) + ' juta';
    return formatRp(num);
}

let calcResults = null;
// Rincian ditahan sampai lead submit — dibuka di revealResults()
let pendingBreakdownHTML = '';

function getIsAgent() {
    const checked = document.querySelector('input[name="edu-is-agent"]:checked');
    return checked ? checked.value === 'yes' : false;
}

// --- Calculation ---
function calcKuliah(totalCostToday, currentAge) {
    const yearsUntilStart = Math.max(0, KULIAH_START_AGE - currentAge);
    const totalFuture = totalCostToday * Math.pow(1 + EDU_INFLATION, yearsUntilStart);
    return {
        yearsUntilStart,
        startAge: KULIAH_START_AGE,
        duration: KULIAH_DURATION,
        totalToday: totalCostToday,
        totalFuture,
    };
}

// --- HTML builders ---
function buildBreakdownHTML(kuliah) {
    return `
        <div class="space-y-0 text-sm mb-6">
            <div class="flex justify-between py-3 px-4 bg-gray-50 border-b border-gray-100">
                <span class="text-gray-500">Biaya kuliah hari ini (4 tahun)</span>
                <span class="font-bold">${formatRp(kuliah.totalToday)}</span>
            </div>
            <div class="flex justify-between py-3 px-4 border-b border-gray-100">
                <span class="text-gray-500">Biaya kuliah saat anakmu masuk (umur ${kuliah.startAge})</span>
                <span class="font-bold text-amber-700">${formatRp(kuliah.totalFuture)}</span>
            </div>
            <div class="flex justify-between py-3 px-4 bg-gray-50">
                <span class="text-gray-500">Waktu yang tersisa untuk mempersiapkan</span>
                <span class="font-bold">${kuliah.yearsUntilStart} tahun</span>
            </div>
        </div>
    `;
}

function buildHeroHTML(totalNeeded, startAge, showNudge) {
    const nudge = showNudge ? `
        <p class="text-sm text-gray-600 text-center -mt-2 mb-6">
            Di bawah: <strong>kenapa angkanya naik secepat itu</strong> — plus rincian lengkap biaya hari ini vs saat anakmu masuk. ↓
        </p>
    ` : '';
    return `
        <h3 class="text-lg font-bold text-center mb-1">Hasil Perhitungan Dana Kuliah</h3>
        <p class="text-xs text-gray-400 text-center mb-6">Berdasarkan data yang kamu masukkan</p>

        <div class="bg-amber-50 rounded-2xl p-6 mb-6 text-center">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-2">Dana Kuliah yang Kamu Butuhkan</p>
            <p class="text-3xl md:text-4xl font-black text-amber-700">${formatRp(totalNeeded)}</p>
            <p class="text-xs text-gray-400 mt-2">untuk membiayai kuliah anakmu di umur ${startAge}</p>
        </div>
    ` + nudge;
}

function buildLeadGateHTML(currentAge, kuliah) {
    const yearsUntilKuliah = kuliah.yearsUntilStart;

    const scenario = `
        <p class="text-sm text-gray-800 leading-relaxed mb-3">
            Bayangkan ${yearsUntilKuliah} tahun dari sekarang. Anakmu duduk di hadapanmu, matanya berbinar. Dia bilang dia keterima di universitas impiannya. Dia sudah berusaha keras. Dia <em>layak</em>.
        </p>
        <p class="text-sm text-gray-800 leading-relaxed mb-3">
            Tapi kamu harus menatap matanya dan bilang: <em>"Maaf nak, ayah/ibu belum siap."</em>
        </p>
        <p class="text-sm text-gray-800 leading-relaxed font-medium">
            Yang menyakitkan bukan keterbatasannya. Yang menyakitkan: dia akan bilang "nggak apa-apa kok" — dan dia benar-benar maksudnya. Tapi kamu akan tahu. Dan dia akan tahu. Bahwa pintu yang seharusnya terbuka, ditutup bukan karena dia kurang.
        </p>
    `;
    const structuralBacking = `
        <p class="text-sm text-gray-700 leading-relaxed mb-2">
            <strong>Inflasi pendidikan di Indonesia 10–15% per tahun</strong> — 2–3× lipat inflasi umum. Yang hari ini ${formatRpShort(kuliah.totalToday)}, dalam ${yearsUntilKuliah} tahun bisa jadi ${formatRpShort(kuliah.totalFuture)}.
        </p>
        <p class="text-sm text-gray-700 leading-relaxed">
            Kabar baiknya: anakmu masih ${currentAge === 0 ? 'bayi' : `${currentAge} tahun`}. Kamu masih punya waktu yang cukup untuk siapkan kuliahnya — kalau mulai sekarang, kontribusinya bisa terasa masuk akal. Tapi window-nya sudah berjalan.
        </p>
    `;
    const identity = `
        <p class="text-sm text-gray-900 font-bold leading-relaxed mb-2">
            Pertanyaannya bukan "berapa biaya kuliah nanti."
        </p>
        <p class="text-sm text-gray-900 font-bold leading-relaxed">
            Pertanyaannya: <em>seberapa jauh kamu mau pintu terbuka untuk anakmu?</em>
        </p>
    `;
    const consentText = `Saya setuju Philip menghubungi saya via WhatsApp untuk <strong>membantu saya mengunci dana kuliah anak saya</strong> — sebelum window-nya menyempit lebih jauh.`;

    return `
        <div id="lead-gate" class="bg-gray-50 rounded-2xl p-6">
            <div class="mb-6">
                <p class="text-base font-bold text-gray-900 mb-3">Bayangkan ${yearsUntilKuliah} tahun dari sekarang.</p>

                <div class="border-l-4 border-gray-900 pl-4 mb-5">
                    ${scenario}
                </div>

                <p class="text-sm text-gray-700 leading-relaxed mb-4">
                    Ini bukan cerita yang dilebih-lebihkan. Ini realita yang dihadapi mayoritas orangtua Indonesia hari ini — dan ada alasan struktural kenapa:
                </p>

                <div class="bg-gray-100 rounded-xl p-4 mb-2">
                    ${structuralBacking}
                </div>

                <p class="text-[10px] text-gray-400 leading-relaxed mb-5">
                    Sumber: BPS, OJK studies on education inflation Indonesia, Manulife Asia Care Survey 2025.
                </p>

                ${identity}
            </div>

            <label class="flex items-start gap-3 cursor-pointer mb-5 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors" id="edu-consent-label">
                <input type="checkbox" id="edu-consent" class="mt-0.5 w-5 h-5 accent-black flex-shrink-0" onchange="toggleConsent()">
                <span class="text-sm text-gray-700 leading-relaxed">
                    ${consentText}
                </span>
            </label>

            <div id="lead-form" class="space-y-3 max-w-md mx-auto opacity-40 pointer-events-none transition-opacity">
                <input type="text" id="edu-nama" placeholder="Nama kamu"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <input type="email" id="edu-email" placeholder="Email kamu"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <input type="tel" id="edu-whatsapp" placeholder="Nomor WhatsApp (e.g. 081234567890)"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <button onclick="revealResults()" id="edu-submit"
                    class="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Jadwalkan Konsultasi & Lihat Detail
                </button>
            </div>
            <p id="gate-error" class="text-red-500 text-xs mt-2 text-center hidden"></p>
        </div>

        <div id="full-breakdown" class="hidden"></div>
    `;
}

function buildDisclaimerHTML() {
    return `
        <div class="mt-6 pt-4 border-t border-gray-100">
            <p class="text-xs text-gray-400 text-center">
                *Perhitungan berdasarkan asumsi inflasi pendidikan 10%/tahun. Hasil aktual dapat berbeda tergantung jenis universitas, kota, dan kondisi pasar. Untuk perhitungan yang lebih akurat, butuh konsultasi langsung.
            </p>
        </div>
    `;
}

// --- Main flow ---
function calculateEducation() {
    const childAge = parseInt(document.getElementById('edu-child-age').value);
    const kuliahCost = getRawValue('edu-kuliah-cost');
    const isAgent = getIsAgent();

    const resultsEl = document.getElementById('edu-results');

    if (isNaN(childAge) || childAge < 0 || childAge > 17) {
        resultsEl.innerHTML = '<p class="text-red-500 text-sm">Mohon isi usia anak antara 0 sampai 17 tahun.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    if (kuliahCost <= 0) {
        resultsEl.innerHTML = '<p class="text-red-500 text-sm">Mohon isi estimasi biaya kuliah hari ini.</p>';
        resultsEl.classList.remove('hidden');
        return;
    }

    const kuliah = calcKuliah(kuliahCost, childAge);

    calcResults = {
        kuliah,
        kuliahCost,
        childAge,
        isAgent,
    };

    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'calc_view_education',
            child_age: childAge,
            kuliah_cost: kuliahCost,
            is_agent: isAgent,
        }),
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    const breakdownHTML = buildBreakdownHTML(kuliah);
    pendingBreakdownHTML = breakdownHTML;

    if (isAgent || childAge >= AGE_TOO_LATE) {
        // Agen / terlalu telat: angka + rincian langsung, tanpa gate
        resultsEl.innerHTML = buildHeroHTML(kuliah.totalFuture, kuliah.startAge, false)
            + breakdownHTML + buildDisclaimerHTML();
    } else {
        // Rincian DITAHAN di balik form — dibuka setelah submit (revealResults)
        resultsEl.innerHTML =
            buildHeroHTML(kuliah.totalFuture, kuliah.startAge, true) +
            buildLeadGateHTML(childAge, kuliah) +
            buildDisclaimerHTML();
    }

    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Restore lead form fields if user previously typed (and wire up listeners)
    restoreEduState();

    // Track when lead gate enters viewport (= user scrolled to form)
    const gateEl = document.getElementById('lead-gate');
    if (gateEl && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fireFunnelEvent('gate_seen', childAge, kuliahCost, isAgent);
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
    const checked = document.getElementById('edu-consent').checked;
    const form = document.getElementById('lead-form');
    if (!form) return;
    if (checked) {
        form.classList.remove('opacity-40', 'pointer-events-none');
        if (calcResults && !window._consentFired) {
            window._consentFired = true;
            fireFunnelEvent('consent_ticked', calcResults.childAge, calcResults.kuliahCost, calcResults.isAgent);
        }
    } else {
        form.classList.add('opacity-40', 'pointer-events-none');
    }
}

function revealResults() {
    const consentEl = document.getElementById('edu-consent');
    const errorEl = document.getElementById('gate-error');

    if (!consentEl || !consentEl.checked) {
        errorEl.textContent = 'Mohon centang persetujuan di atas dulu sebelum mengirim data.';
        errorEl.classList.remove('hidden');
        return;
    }

    const nama = document.getElementById('edu-nama').value.trim();
    const email = document.getElementById('edu-email').value.trim();
    const whatsapp = document.getElementById('edu-whatsapp').value.trim();
    const submitBtn = document.getElementById('edu-submit');

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

    const payload = JSON.stringify({
        action: 'website_calc_education',
        nama,
        email,
        whatsapp,
        child_age: calcResults.childAge,
        kuliah_cost: calcResults.kuliahCost,
        kuliah_future: Math.round(calcResults.kuliah.totalFuture),
        is_full_breakdown: false,
        total_needed: Math.round(calcResults.kuliah.totalFuture),
        is_agent: false,
    });

    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: payload,
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    // Successful submit — clear preserved state
    clearEduState();

    document.getElementById('lead-gate').style.display = 'none';

    const confirmEl = document.getElementById('full-breakdown');
    confirmEl.innerHTML = `
        <div class="text-center py-6">
            <p class="text-base font-bold text-gray-900 mb-2">Terima kasih!</p>
            <p class="text-sm text-gray-700 leading-relaxed">
                Philip akan menghubungi kamu via WhatsApp dalam <strong>1×24 jam</strong>.
            </p>
        </div>

        <div class="border-t border-gray-100 pt-6">
            <p class="text-sm font-bold text-gray-900 mb-3 text-center">Rincian lengkap perhitungan kamu</p>
            ${pendingBreakdownHTML}
        </div>
    `;
    confirmEl.classList.remove('hidden');
    confirmEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', () => {
    initNumberFormatting();
    restoreEduState();
    ['edu-child-age', 'edu-kuliah-cost'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', saveEduState);
    });
    document.querySelectorAll('input[name="edu-is-agent"]').forEach(r => r.addEventListener('change', saveEduState));
});
