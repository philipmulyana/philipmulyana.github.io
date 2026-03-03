// Kalkulator Dana Pensiun — hybrid lead gen version
const WEBSITE_CALC_ENDPOINT = 'https://philip-mulyana--ai-lead-gen-campaign-tools.modal.run';
const INFLATION_RATE = 0.05;
const LIFE_EXPECTANCY = 75;
const RETIREMENT_AGE = 55;

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

function buildBreakdownHTML(data) {
    const { monthlyCost, monthlyCostAtRetirement, annualCostAtRetirement, totalNeeded, yearsUntilRetirement } = data;
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

        <!-- Persuasive Copy -->
        <div class="mb-6">
            <p class="text-sm text-gray-600 leading-relaxed mb-3">
                Angka di atas mungkin terlihat besar, tapi kabar baiknya: dengan perencanaan
                yang tepat dan strategi yang sesuai, target ini bisa dicapai secara bertahap.
            </p>
            <p class="text-sm text-gray-600 leading-relaxed">
                Pertanyaannya bukan <em>apakah</em> kamu perlu mulai, tapi <strong>bagaimana
                cara terbaik untuk memulainya</strong>.
            </p>
        </div>

        <!-- CTA -->
        <div class="text-center">
            <p class="text-sm text-gray-700 font-medium mb-3">Mau tau langkah pertama yang bisa kamu ambil sekarang?</p>
            <a href="https://calendly.com/philipmulyana/first-call" target="_blank"
                class="inline-flex items-center bg-black text-white px-8 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                Konsultasi Gratis 10 Menit
                <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
            </a>
            <p class="text-xs text-gray-400 mt-3">Via WhatsApp call, tanpa biaya, tanpa komitmen.</p>
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
    calcResults = { monthlyCost, monthlyCostAtRetirement, annualCostAtRetirement, totalNeeded, yearsUntilRetirement, isAgent };

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

    if (isAgent) {
        // Agent: show everything immediately, no lead capture
        resultsEl.innerHTML = heroHTML + buildBreakdownHTML(calcResults) + buildDisclaimerHTML();
    } else {
        // Non-agent: show big number + lead capture gate
        resultsEl.innerHTML = heroHTML + `
            <!-- Lead Capture Gate -->
            <div id="lead-gate" class="bg-gray-50 rounded-2xl p-6">
                <p class="text-sm font-medium text-gray-700 mb-1 text-center">Mau lihat breakdown lengkapnya?</p>
                <p class="text-xs text-gray-400 mb-5 text-center">Isi data singkat di bawah untuk melihat detail perhitungan dan langkah selanjutnya.</p>
                <div class="space-y-3 max-w-md mx-auto">
                    <input type="text" id="ret-nama" placeholder="Nama kamu"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <input type="email" id="ret-email" placeholder="Email kamu"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <input type="tel" id="ret-whatsapp" placeholder="Nomor WhatsApp (e.g. 081234567890)"
                        class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                    <button onclick="revealResults()"
                        class="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                        Lihat Detail Lengkap
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
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function revealResults() {
    const nama = document.getElementById('ret-nama').value.trim();
    const email = document.getElementById('ret-email').value.trim();
    const whatsapp = document.getElementById('ret-whatsapp').value.trim();
    const errorEl = document.getElementById('gate-error');
    const submitBtn = document.querySelector('#lead-gate button');

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

    // Use sendBeacon for reliable fire-and-forget (works even if user navigates away)
    const sent = navigator.sendBeacon(WEBSITE_CALC_ENDPOINT, new Blob([payload], { type: 'application/json' }));
    if (!sent) {
        // Fallback: fetch with no-cors
        fetch(WEBSITE_CALC_ENDPOINT, { method: 'POST', mode: 'no-cors', body: payload }).catch(() => {});
    }
    console.log('Lead submitted to backend:', sent ? 'sendBeacon' : 'fetch fallback');

    // Show results immediately (don't wait for backend)
    document.getElementById('lead-gate').style.display = 'none';

    const breakdownEl = document.getElementById('full-breakdown');
    breakdownEl.innerHTML = buildBreakdownHTML(calcResults);
    breakdownEl.classList.remove('hidden');
    breakdownEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

document.addEventListener('DOMContentLoaded', initNumberFormatting);
