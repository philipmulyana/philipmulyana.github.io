// Financial Vitals Check — comprehensive intake + personalized return via risk profile
// Architecture:
//   Section 0 = Life Vision (textarea, displayed as header above results)
//   Section A = Profil & Cash Flow (THP-based)
//   Section B = Inventaris Aset (line items with auto-sum subtotals)
//   Section C = Proteksi (line items, total UP)
//   Section D = Risk Profile (5 Qs → score → expected return)
// Results free-flow: composite score + 6 vital cards + Calendly CTA.

const WEBSITE_CALC_ENDPOINT = 'https://philip-mulyana--ai-lead-gen-gateway.modal.run/campaign';
const STORAGE_KEY_VITALS = 'calc_vitals_state_v4';

// --- Constants ---
const INFLATION_RATE = 0.05;            // 5% p.a. (general)
const INFLATION_PENDIDIKAN = 0.10;      // 10% p.a.
const RETIREMENT_AGE = 55;
const LIFE_EXPECTANCY = 75;
const RETIREMENT_YEARS = LIFE_EXPECTANCY - RETIREMENT_AGE;

// --- Goal categories ---
const GOAL_DEFAULTS = {
    pendidikan: { label: 'Pendidikan Anak', inflationPct: 10 },
    pensiun:    { label: 'Pensiun',         inflationPct: 5 },
    custom:     { label: 'Custom',          inflationPct: 5 },
};

let goalsState = [];
let nextGoalId = 1;

// --- Anak (children) registry state ---
let anakState = [];
let nextAnakId = 1;

// --- Profile field IDs (Section P) ---
const PROFILE_FIELDS = [
    'vt-prof-nama', 'vt-prof-dob', 'vt-prof-profesi', 'vt-prof-kota',
    'vt-prof-hp', 'vt-prof-sesi-date', 'vt-prof-status', 'vt-prof-pasangan-nama',
];

// --- Risk profile → expected return mapping ---
// Score range: 5-20 (5 questions × 1-4 pts each)
function mapRiskToProfile(score) {
    if (score <= 8)  return { profile: 'Konservatif',         rate: 0.060, allocation: '70% FI / 30% saham' };
    if (score <= 12) return { profile: 'Moderate Konservatif', rate: 0.075, allocation: '60% FI / 40% saham' };
    if (score <= 16) return { profile: 'Moderate',             rate: 0.090, allocation: '40% FI / 60% saham' };
    return                    { profile: 'Moderate Agresif',  rate: 0.105, allocation: '30% FI / 70% saham' };
}

// --- Field IDs ---
const VT_FIELDS = [
    'vt-vision', 'vt-income', 'vt-expense', 'vt-invest-monthly', 'vt-debt-monthly',
    // B1
    'vt-asset-tabungan', 'vt-asset-deposito', 'vt-asset-emas',
    // B2
    'vt-asset-reksadana', 'vt-asset-saham', 'vt-asset-obligasi', 'vt-asset-kripto',
    // B3
    'vt-asset-property-invest', 'vt-asset-property-utama', 'vt-asset-tanah',
    // B4
    'vt-asset-unitlink', 'vt-asset-kendaraan', 'vt-asset-bisnis',
    // B5
    'vt-debt-kpr', 'vt-debt-kkb', 'vt-debt-cc', 'vt-debt-kta',
    // C
    'vt-life-term', 'vt-life-unitlink', 'vt-life-whole',
];

const RISK_QS = ['vt-risk-q1', 'vt-risk-q2', 'vt-risk-q3', 'vt-risk-q4', 'vt-risk-q5'];

// --- Subtotal groupings (auto-sum per category) ---
const SUBTOTAL_GROUPS = {
    'vt-sum-liquid':  ['vt-asset-tabungan', 'vt-asset-deposito', 'vt-asset-emas'],
    'vt-sum-invest':  ['vt-asset-reksadana', 'vt-asset-saham', 'vt-asset-obligasi', 'vt-asset-kripto'],
    'vt-sum-property': ['vt-asset-property-invest', 'vt-asset-property-utama', 'vt-asset-tanah'],
    'vt-sum-other':   ['vt-asset-unitlink', 'vt-asset-kendaraan', 'vt-asset-bisnis'],
    'vt-sum-debt':    ['vt-debt-kpr', 'vt-debt-kkb', 'vt-debt-cc', 'vt-debt-kta'],
    'vt-sum-life-sa': ['vt-life-term', 'vt-life-unitlink', 'vt-life-whole'],
};

// --- Session / funnel tracking ---
function getSessionId() {
    let sid = sessionStorage.getItem('calc_session_id');
    if (!sid) {
        sid = (crypto.randomUUID && crypto.randomUUID()) || (Date.now() + '-' + Math.random().toString(36).slice(2));
        sessionStorage.setItem('calc_session_id', sid);
    }
    return sid;
}

function fireFunnelEvent(eventName, payload = {}) {
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'funnel_event',
            calculator: 'vitals',
            event: eventName,
            session_id: getSessionId(),
            ...payload,
            user_agent: navigator.userAgent.slice(0, 200),
        }),
        keepalive: true,
    }).catch(() => {});
}

// --- LocalStorage persistence ---
function saveVtState() {
    try {
        const state = {};
        VT_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) state[id] = el.value || '';
        });
        PROFILE_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) state[id] = el.value || '';
        });
        const agent = document.querySelector('input[name="vt-is-agent"]:checked');
        state['agent'] = agent ? agent.value : 'no';
        const wealth = document.querySelector('input[name="vt-prof-wealth"]:checked');
        state['vt-prof-wealth'] = wealth ? wealth.value : 'joint';
        RISK_QS.forEach(name => {
            const r = document.querySelector(`input[name="${name}"]:checked`);
            if (r) state[name] = r.value;
        });
        state.goals = goalsState;
        state.nextGoalId = nextGoalId;
        state.anak = anakState;
        state.nextAnakId = nextAnakId;
        state.currentStep = currentStep;
        state.visitedSteps = Array.from(visitedSteps);
        localStorage.setItem(STORAGE_KEY_VITALS, JSON.stringify(state));
    } catch (e) {}
}

function restoreVtState() {
    try {
        const s = JSON.parse(localStorage.getItem(STORAGE_KEY_VITALS) || '{}');
        VT_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && s[id]) {
                el.value = s[id];
                if (el.classList.contains('formatted-number')) formatNumberInput(el);
            }
        });
        PROFILE_FIELDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && s[id]) el.value = s[id];
        });
        if (s.agent) {
            const r = document.querySelector(`input[name="vt-is-agent"][value="${s.agent}"]`);
            if (r) r.checked = true;
        }
        if (s['vt-prof-wealth']) {
            const r = document.querySelector(`input[name="vt-prof-wealth"][value="${s['vt-prof-wealth']}"]`);
            if (r) r.checked = true;
        }
        RISK_QS.forEach(name => {
            if (s[name]) {
                const r = document.querySelector(`input[name="${name}"][value="${s[name]}"]`);
                if (r) r.checked = true;
            }
        });
        if (Array.isArray(s.goals)) goalsState = s.goals;
        if (typeof s.nextGoalId === 'number' && s.nextGoalId > 0) nextGoalId = s.nextGoalId;
        if (Array.isArray(s.anak)) anakState = s.anak;
        if (typeof s.nextAnakId === 'number' && s.nextAnakId > 0) nextAnakId = s.nextAnakId;
        if (typeof s.currentStep === 'number' && s.currentStep >= 1 && s.currentStep <= 5) {
            currentStep = s.currentStep;
        }
        if (Array.isArray(s.visitedSteps)) {
            visitedSteps = new Set(s.visitedSteps.filter(n => typeof n === 'number'));
            visitedSteps.add(1);
            visitedSteps.add(currentStep);
        }
        renderAnak();
        renderGoals();
        updateAgeDisplay();
        onStatusChange();
        onWealthChange();
        recomputeSubtotals();
    } catch (e) {}
}

function clearVtState() {
    try { localStorage.removeItem(STORAGE_KEY_VITALS); } catch (e) {}
}

// --- Number formatting ---
function formatNumberInput(input) {
    const raw = input.value.replace(/[^0-9]/g, '');
    input.dataset.rawValue = raw;
    if (raw === '') { input.value = ''; return; }
    input.value = Number(raw).toLocaleString('en-US');
}

function getRawValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    const raw = el.dataset.rawValue || (el.value || '').replace(/[^0-9]/g, '');
    return parseFloat(raw) || 0;
}

function initNumberFormatting() {
    document.querySelectorAll('.formatted-number').forEach(input => {
        input.addEventListener('input', () => {
            formatNumberInput(input);
            recomputeSubtotals();
            saveVtState();
        });
        if (input.value) formatNumberInput(input);
    });
}

function recomputeSubtotals() {
    for (const [sumId, fieldIds] of Object.entries(SUBTOTAL_GROUPS)) {
        const total = fieldIds.reduce((s, id) => s + getRawValue(id), 0);
        const el = document.getElementById(sumId);
        if (el) el.textContent = total.toLocaleString('id-ID');
    }
}

function formatRp(num) {
    if (!isFinite(num)) return 'Rp 0';
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatPct(num, digits = 1) {
    if (!isFinite(num)) return '0%';
    return (num * 100).toFixed(digits) + '%';
}

function formatRatio(num, digits = 1) {
    if (!isFinite(num)) return '0×';
    return num.toFixed(digits) + '×';
}

function getIsAgent() {
    const checked = document.querySelector('input[name="vt-is-agent"]:checked');
    return checked ? checked.value === 'yes' : false;
}

function getRiskScore() {
    return RISK_QS.reduce((sum, name) => {
        const r = document.querySelector(`input[name="${name}"]:checked`);
        return sum + (r ? parseInt(r.value) : 0);
    }, 0);
}

// --- Vital flag mapping ---
function flag(color) {
    const map = {
        green:  { label: 'SEHAT',   bg: 'flag-green',  emoji: '🟢' },
        yellow: { label: 'WASPADA', bg: 'flag-yellow', emoji: '🟡' },
        red:    { label: 'KRITIS',  bg: 'flag-red',    emoji: '🔴' },
    };
    return map[color];
}

// --- Core compute ---
function computeVitals(d) {
    const annualIncome = d.income * 12; // THP-based
    const surplus = d.income - d.expense;

    // --- Asset aggregation ---
    const liquidTotal   = d.assetTabungan + d.assetDeposito + d.assetEmas;
    const investTotal   = d.assetReksadana + d.assetSaham + d.assetObligasi + d.assetKripto;
    const propertyInvestTotal = d.assetPropertyInvest + d.assetTanah; // tanah = treated as investment-equivalent
    const propertyUtama = d.assetPropertyUtama;
    const otherTotal    = d.assetUnitlink + d.assetKendaraan + d.assetBisnis;

    const totalAssets   = liquidTotal + investTotal + propertyInvestTotal + propertyUtama + otherTotal;
    // Investable for retirement projection: EXCLUDES rumah tinggal
    const investableAssets = liquidTotal + investTotal + propertyInvestTotal + otherTotal;
    const totalDebt     = d.debtKpr + d.debtKkb + d.debtCc + d.debtKta;
    const totalLifeSA   = d.lifeTerm + d.lifeUnitlink + d.lifeWhole;
    const netWorth      = totalAssets - totalDebt;

    // --- Vital 1: Net Worth Status (Stanley & Danko, gross-equivalent estimate) ---
    // Note: Stanley equation uses gross. Since user provides THP, we approximate gross ≈ THP × 1.18
    // (accounts for typical Indo tax + BPJS deductions on mass-affluent income).
    const grossIncomeEstimate = annualIncome * 1.18;
    const expectedNW = (d.age * grossIncomeEstimate) / 10;
    const nwRatio = expectedNW > 0 ? netWorth / expectedNW : 0;
    let nwColor;
    if (nwRatio >= 1.5) nwColor = 'green';
    else if (nwRatio >= 0.5) nwColor = 'yellow';
    else nwColor = 'red';

    // --- Vital 2: Cash Flow Surplus (% of THP) ---
    const surplusPct = d.income > 0 ? surplus / d.income : 0;
    let surplusColor;
    if (surplusPct >= 0.20) surplusColor = 'green';
    else if (surplusPct >= 0.05) surplusColor = 'yellow';
    else surplusColor = 'red';

    // --- Vital 3: Savings Rate (monthly invest / THP) ---
    const savingsRate = d.income > 0 ? d.investMonthly / d.income : 0;
    let savingsColor;
    if (savingsRate >= 0.20) savingsColor = 'green';
    else if (savingsRate >= 0.10) savingsColor = 'yellow';
    else savingsColor = 'red';

    // --- Vital 4: DTI (cicilan bulanan / THP) ---
    // Threshold calibrated for THP (tighter than gross convention).
    const dti = d.income > 0 ? d.debtMonthly / d.income : 0;
    let dtiColor;
    if (dti < 0.30) dtiColor = 'green';
    else if (dti < 0.40) dtiColor = 'yellow';
    else dtiColor = 'red';

    // --- Vital 5: Insurance Coverage Ratio ---
    // Note: ideally use gross income (income replacement principle). Using THP × 1.18 estimate.
    const coverageRatio = grossIncomeEstimate > 0 ? totalLifeSA / grossIncomeEstimate : 0;
    let coverageColor;
    if (coverageRatio >= 10) coverageColor = 'green';
    else if (coverageRatio >= 5) coverageColor = 'yellow';
    else coverageColor = 'red';

    // --- Vital 6: Retirement Readiness ---
    const yearsToRetire = Math.max(0, RETIREMENT_AGE - d.age);
    const inflatedMonthly = d.expense * Math.pow(1 + INFLATION_RATE, yearsToRetire);
    const requiredCorpus = inflatedMonthly * 12 * RETIREMENT_YEARS;

    // Personalized return rate from risk profile
    const returnRate = d.returnRate;
    const fvCurrent = investableAssets * Math.pow(1 + returnRate, yearsToRetire);
    const monthlyRate = returnRate / 12;
    const months = yearsToRetire * 12;
    const fvContrib = monthlyRate > 0 && months > 0
        ? d.investMonthly * ((Math.pow(1 + monthlyRate, months) - 1) / monthlyRate)
        : d.investMonthly * months;
    const projectedCorpus = fvCurrent + fvContrib;

    const readinessScore = requiredCorpus > 0 ? projectedCorpus / requiredCorpus : 0;
    let readinessColor;
    if (readinessScore >= 1.0) readinessColor = 'green';
    else if (readinessScore >= 0.5) readinessColor = 'yellow';
    else readinessColor = 'red';

    // --- Composite (0-100) ---
    const colorScore = (c) => c === 'green' ? 100 : c === 'yellow' ? 60 : 25;
    const composite = Math.round(
        (colorScore(nwColor) + colorScore(surplusColor) + colorScore(savingsColor)
            + colorScore(dtiColor) + colorScore(coverageColor) + colorScore(readinessColor)) / 6
    );
    let compositeColor;
    if (composite >= 80) compositeColor = 'green';
    else if (composite >= 50) compositeColor = 'yellow';
    else compositeColor = 'red';

    return {
        annualIncome, grossIncomeEstimate,
        totalAssets, investableAssets, netWorth, surplus, totalDebt, totalLifeSA,
        propertyUtama, // tracked separately for display
        expectedNW, inflatedMonthly, requiredCorpus, projectedCorpus,
        riskProfile: d.riskProfile, returnRate, riskScore: d.riskScore, allocation: d.allocation,
        v1: { name: 'Net Worth Status', actual: netWorth, expected: expectedNW, ratio: nwRatio, color: nwColor },
        v2: { name: 'Cash Flow Surplus', actual: surplus, pct: surplusPct, color: surplusColor },
        v3: { name: 'Savings Rate', rate: savingsRate, color: savingsColor },
        v4: { name: 'Debt-to-Income', ratio: dti, color: dtiColor },
        v5: { name: 'Insurance Coverage', ratio: coverageRatio, sa: totalLifeSA, color: coverageColor },
        v6: { name: 'Retirement Readiness', score: readinessScore, projected: projectedCorpus, required: requiredCorpus, yearsToRetire, color: readinessColor },
        composite, compositeColor,
    };
}

// --- Result rendering ---
function buildVisionHeaderHTML(vision) {
    if (!vision || !vision.trim()) return '';
    const safe = vision.trim().replace(/[<>&]/g, c => ({ '<': '&lt;', '>': '&gt;', '&': '&amp;' }[c]));
    return `
        <div class="bg-violet-50 border border-violet-100 rounded-2xl p-6 mb-6">
            <p class="text-[10px] text-violet-700 font-bold uppercase tracking-wider mb-2">Visi Hidup Kamu</p>
            <p class="text-sm text-gray-800 leading-relaxed italic">"${safe}"</p>
            <p class="text-xs text-gray-500 mt-3">6 vitals di bawah dievaluasi dalam konteks visi ini — angkanya hanya berguna kalau melayani visi ini.</p>
        </div>
    `;
}

function buildTeaserHTML(v) {
    const cf = flag(v.compositeColor);
    return `
        <h3 class="text-lg font-bold text-center mb-1">Skor Kesehatan Finansial Kamu</h3>
        <p class="text-xs text-gray-400 text-center mb-6">Berdasarkan data yang kamu masukkan</p>

        <div class="bg-gray-50 rounded-2xl p-8 mb-6 text-center">
            <p class="text-xs text-gray-500 uppercase tracking-wider mb-3">Composite Vitals Score</p>
            <p class="text-6xl font-black mb-2">${v.composite}<span class="text-2xl text-gray-400">/100</span></p>
            <span class="inline-block ${cf.bg} rounded-full px-4 py-1 text-xs font-bold uppercase tracking-wider">
                ${cf.emoji} ${cf.label}
            </span>
            <p class="text-xs text-gray-500 mt-4 max-w-sm mx-auto">
                Skor gabungan dari 6 indikator kesehatan finansial. Detail per indikator di bawah.
            </p>
        </div>

        <div class="bg-white border border-gray-200 rounded-2xl p-5 mb-6">
            <div class="flex items-center justify-between flex-wrap gap-2 mb-2">
                <p class="text-xs text-gray-500 uppercase tracking-wider">Profil Risiko</p>
                <span class="text-xs font-bold text-gray-900">${v.riskProfile} <span class="text-gray-400 font-normal">(${v.riskScore}/20)</span></span>
            </div>
            <p class="text-xs text-gray-600 leading-relaxed">
                Alokasi acuan: ${v.allocation}. Asumsi return untuk Vital #6 (Retirement Readiness): <strong>${formatPct(v.returnRate)}/tahun</strong>.
            </p>
        </div>
    `;
}

function buildVitalCard(num, title, mainValue, subText, color, insight) {
    const f = flag(color);
    return `
        <div class="vital-card">
            <div class="flex items-start justify-between mb-3">
                <div>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">Vital ${num}</p>
                    <h4 class="text-sm font-bold text-gray-900">${title}</h4>
                </div>
                <span class="${f.bg} text-[10px] font-bold uppercase tracking-wider rounded-full px-2 py-1 whitespace-nowrap">
                    ${f.emoji} ${f.label}
                </span>
            </div>
            <p class="text-2xl font-black text-gray-900 mb-1">${mainValue}</p>
            <p class="text-xs text-gray-500 mb-3">${subText}</p>
            <p class="text-xs text-gray-700 leading-relaxed border-t border-gray-100 pt-3">${insight}</p>
        </div>
    `;
}

function buildFullBreakdownHTML(v) {
    // Insights
    const v1Insight = v.v1.color === 'green'
        ? `Net worth ${formatRatio(v.v1.ratio)} dari benchmark wealth-equation untuk usia & income kamu — kamu di atas rata-rata akumulasi.`
        : v.v1.color === 'yellow'
        ? `Net worth di range average. Untuk catch up, savings rate perlu dinaikkan secara berkelanjutan.`
        : `Net worth jauh di bawah benchmark (under-accumulator). Pertanyaan: ke mana income kamu selama ini? Lifestyle inflation atau leakage di tempat yang tidak kelihatan.`;

    const v2Insight = v.v2.color === 'green'
        ? `Surplus ${formatPct(v.v2.pct)} — ruang sehat untuk akselerasi wealth-building.`
        : v.v2.color === 'yellow'
        ? `Surplus ada tapi tipis. 1-2 expense shock (anak masuk RS, rumah bocor) bisa hapus seluruh surplus.`
        : `Surplus mendekati nol atau negatif — paycheck to paycheck. Tanpa surplus, tidak ada modal untuk apa-apa.`;

    const v3Insight = v.v3.color === 'green'
        ? `Savings rate di zona top performer. Pertahankan & diversifikasi vehicle-nya.`
        : v.v3.color === 'yellow'
        ? `Savings rate di range "okay" tapi belum cukup untuk akselerasi retirement. Target idealnya 20%+ dari THP.`
        : `Savings rate < 10%. Bahkan kalau income kamu naik, tanpa naikin savings rate, wealth tidak akan tumbuh signifikan.`;

    const v4Insight = v.v4.color === 'green'
        ? `DTI sehat (THP basis). Posisi fleksibel untuk leverage produktif kalau ada peluang.`
        : v.v4.color === 'yellow'
        ? `DTI di zona waspada. Income drop 20% mulai bikin cicilan jadi beban berat. Hindari nambah utang baru.`
        : `DTI > 40% dari THP — overleveraged. Lebih dari 4 dari 10 rupiah take-home udah committed ke cicilan sebelum lihat tagihan listrik.`;

    const v5Insight = v.v5.color === 'green'
        ? `Coverage memadai (${formatRatio(v.v5.ratio)} annual income). Untuk family dengan dependents bisa di-review dengan DIME method untuk presisi.`
        : v.v5.color === 'yellow'
        ? `Coverage di zona tipis. Cukup untuk pelunasan jangka pendek, tapi tidak cukup untuk income replacement keluarga 5-10 tahun.`
        : `Coverage < 5× annual income — bahaya untuk keluarga kalau ada apa-apa. Risk gap yang paling sering tidak disadari sampai terlambat.`;

    const v6Sub = v.v6.yearsToRetire > 0
        ? `Proyeksi ${formatRp(v.v6.projected)} vs kebutuhan ${formatRp(v.v6.required)} · ${v.v6.yearsToRetire} tahun ke 55 · return ${formatPct(v.returnRate)}`
        : `Sudah lewat usia 55 — perhitungan terbatas`;

    const v6Insight = v.v6.color === 'green'
        ? `Trajectory on track untuk pensiun nyaman di 55 dengan profil risiko ${v.riskProfile}. Fokus: jangan kena lifestyle creep.`
        : v.v6.color === 'yellow'
        ? `Trajectory ${formatPct(v.v6.score, 0)} dari kebutuhan. Gap bisa di-close dengan: naikin kontribusi, geser usia pensiun, atau naikin risk profile (kalau cocok).`
        : `Trajectory ${formatPct(v.v6.score, 0)} dari kebutuhan. Tanpa intervensi serius (naik kontribusi 2-3×, revisi lifestyle, atau extend horizon), tidak akan bisa pensiun di 55 dengan gaya hidup sekarang.`;

    const v1 = buildVitalCard(1, 'Net Worth Status',
        formatRp(v.v1.actual),
        `Expected: ${formatRp(v.v1.expected)} (${formatRatio(v.v1.ratio)} dari benchmark)`,
        v.v1.color, v1Insight);

    const v2 = buildVitalCard(2, 'Cash Flow Surplus',
        formatRp(v.v2.actual) + '/bln',
        `${formatPct(v.v2.pct)} dari THP bulanan`,
        v.v2.color, v2Insight);

    const v3 = buildVitalCard(3, 'Savings Rate',
        formatPct(v.v3.rate),
        `% THP yang konsisten masuk investasi/tabungan`,
        v.v3.color, v3Insight);

    const v4 = buildVitalCard(4, 'Debt-to-Income',
        formatPct(v.v4.ratio),
        `Cicilan bulanan vs THP`,
        v.v4.color, v4Insight);

    const v5 = buildVitalCard(5, 'Insurance Coverage Ratio',
        formatRatio(v.v5.ratio),
        `UP ${formatRp(v.v5.sa)} vs annual income`,
        v.v5.color, v5Insight);

    const v6 = buildVitalCard(6, 'Retirement Readiness',
        formatPct(v.v6.score, 0),
        v6Sub,
        v.v6.color, v6Insight);

    const colors = [v.v1.color, v.v2.color, v.v3.color, v.v4.color, v.v5.color, v.v6.color];
    const greens = colors.filter(c => c === 'green').length;
    const yellows = colors.filter(c => c === 'yellow').length;
    const reds = colors.filter(c => c === 'red').length;

    return `
        <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 mt-6">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Detail Breakdown</p>
            <h3 class="text-xl font-black mb-1">6 Vitals Kamu</h3>
            <p class="text-sm text-gray-500 mb-6">
                ${greens > 0 ? `🟢 ${greens} sehat` : ''}${yellows > 0 ? ` · 🟡 ${yellows} waspada` : ''}${reds > 0 ? ` · 🔴 ${reds} kritis` : ''}
            </p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${v1}${v2}${v3}${v4}${v5}${v6}
            </div>

            ${v.propertyUtama > 0 ? `
            <div class="mt-6 p-4 bg-gray-50 rounded-xl">
                <p class="text-xs text-gray-500 leading-relaxed">
                    <strong>Catatan:</strong> Properti utama (${formatRp(v.propertyUtama)}) sudah dihitung di Net Worth, tapi <em>tidak</em> dimasukkan ke proyeksi Retirement Readiness — karena rumah tinggal tidak generate income dan tidak bisa di-monetize tanpa pindah/downsize.
                </p>
            </div>` : ''}

            <div class="mt-8 pt-6 border-t border-gray-100">
                <p class="text-sm font-bold text-gray-900 mb-2">Mau tahu cara fix yang merah?</p>
                <p class="text-sm text-gray-700 leading-relaxed mb-4">
                    Vitals Check ini diagnosa, bukan resep. Untuk dapat <strong>resep konkret</strong> yang link balik ke visi hidup yang kamu tulis di atas — action mingguan, prioritas, sequencing — Philip ada layanan <strong>Master Plan Klinik</strong>: sesi diagnosa 1.5 jam yang menghasilkan dokumen action plan personal.
                </p>
                <a href="https://calendly.com/philipmulyana/first-call" target="_blank"
                    class="inline-flex items-center bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Diskusi hasil dengan Philip
                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </a>
            </div>
        </div>

        <div class="mt-6">
            <p class="text-xs text-gray-400 leading-relaxed">
                <strong>Assumptions:</strong> Inflasi 5%/tahun. Return investasi dipersonalisasi berdasarkan profil risiko (kamu: ${formatPct(v.returnRate)}/tahun, ${v.riskProfile}). Pensiun di 55, life expectancy 75. Net worth benchmark: Stanley &amp; Danko wealth equation (Age × Gross Income ÷ 10). Insurance coverage = UP ÷ Annual Income (simple ratio; DIME method untuk analisa yang lebih presisi). Income yang dimasukkan adalah THP (take-home), sehingga benchmark NW &amp; Coverage Ratio di-adjust dengan estimasi gross (×1.18) untuk apples-to-apples dengan industry standard. Hasil aktual akan berbeda tergantung kondisi pasar, lifestyle changes, dan keputusan personal. Bukan financial advice.
            </p>
        </div>
    `;
}

// ====== PROFILE (Section P) ======

function getAgeFromDOB(dobStr) {
    if (!dobStr) return 0;
    const dob = new Date(dobStr);
    if (isNaN(dob.getTime())) return 0;
    const today = new Date();
    let age = today.getFullYear() - dob.getFullYear();
    const m = today.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && today.getDate() < dob.getDate())) age--;
    return age >= 0 ? age : 0;
}

function updateAgeDisplay() {
    const dobEl = document.getElementById('vt-prof-dob');
    const display = document.getElementById('vt-prof-age-display');
    if (!dobEl || !display) return;
    const age = getAgeFromDOB(dobEl.value);
    if (age > 0) {
        display.textContent = `Usia saat ini: ${age} tahun`;
        display.classList.remove('hidden');
    } else {
        display.classList.add('hidden');
    }
}

function onStatusChange() {
    const status = document.getElementById('vt-prof-status');
    const group = document.getElementById('vt-prof-pasangan-group');
    if (!status || !group) return;
    if (status.value === 'menikah') group.classList.remove('hidden');
    else group.classList.add('hidden');
}

function onWealthChange() {
    const wealth = document.querySelector('input[name="vt-prof-wealth"]:checked');
    const helper = document.getElementById('vt-prof-wealth-helper');
    if (!helper) return;
    if (wealth && wealth.value === 'separate') helper.classList.remove('hidden');
    else helper.classList.add('hidden');
}

function initSesiDateDefault() {
    const el = document.getElementById('vt-prof-sesi-date');
    if (el && !el.value) {
        el.value = new Date().toISOString().slice(0, 10);
    }
}

// --- Anak management ---
function addAnak() {
    const id = nextAnakId++;
    anakState.push({ id, nama: '', dob: '' });
    renderAnak();
    saveVtState();
}

function removeAnak(id) {
    anakState = anakState.filter(a => a.id !== id);
    renderAnak();
    saveVtState();
}

function renderAnakCard(a) {
    return `
        <div class="subsection" data-anak-id="${a.id}">
            <div class="flex items-center justify-between mb-3">
                <h3 class="!mb-0">Anak <span class="text-gray-400 font-normal">#${a.id}</span></h3>
                <button type="button" onclick="removeAnak(${a.id})" class="text-xs text-red-500 hover:text-red-700 font-medium">✕ Hapus</button>
            </div>
            <div class="input-row">
                <div><label>Nama</label></div>
                <input type="text" data-anak-id="${a.id}" data-field="nama" placeholder="Nama anak">
            </div>
            <div class="input-row">
                <div><label>Tanggal lahir</label></div>
                <input type="date" data-anak-id="${a.id}" data-field="dob">
            </div>
        </div>
    `;
}

function populateAnakInputs(a) {
    const listEl = document.getElementById('vt-prof-anak-list');
    if (!listEl) return;
    Object.keys(a).forEach(field => {
        if (field === 'id') return;
        const el = listEl.querySelector(`[data-anak-id="${a.id}"][data-field="${field}"]`);
        if (el) el.value = a[field] || '';
    });
}

function attachAnakListeners() {
    const listEl = document.getElementById('vt-prof-anak-list');
    if (!listEl) return;
    listEl.querySelectorAll('[data-anak-id][data-field]').forEach(el => {
        el.addEventListener('input', () => {
            const id = parseInt(el.dataset.anakId);
            const field = el.dataset.field;
            const a = anakState.find(x => x.id === id);
            if (!a) return;
            a[field] = el.value;
            saveVtState();
        });
    });
}

function renderAnak() {
    const listEl = document.getElementById('vt-prof-anak-list');
    const emptyHint = document.getElementById('vt-prof-anak-empty-hint');
    if (!listEl) return;
    if (anakState.length === 0) {
        listEl.innerHTML = '';
        if (emptyHint) emptyHint.classList.remove('hidden');
        return;
    }
    if (emptyHint) emptyHint.classList.add('hidden');
    listEl.innerHTML = anakState.map(a => renderAnakCard(a)).join('');
    anakState.forEach(a => populateAnakInputs(a));
    attachAnakListeners();
}

function getProfileData() {
    const get = (id) => (document.getElementById(id) || {}).value || '';
    const wealthEl = document.querySelector('input[name="vt-prof-wealth"]:checked');
    return {
        nama:        get('vt-prof-nama').trim(),
        dob:         get('vt-prof-dob'),
        profesi:     get('vt-prof-profesi').trim(),
        kota:        get('vt-prof-kota').trim(),
        hp:          get('vt-prof-hp').trim(),
        sesiDate:    get('vt-prof-sesi-date'),
        status:      get('vt-prof-status'),
        pasanganNama: get('vt-prof-pasangan-nama').trim(),
        wealthMode:  wealthEl ? wealthEl.value : 'joint',
        anak:        anakState.map(a => ({ nama: (a.nama || '').trim(), dob: a.dob || '' })),
    };
}

function buildClientHeaderHTML(profile, age) {
    if (!profile.nama && !profile.dob) return '';
    const statusLabel = {
        single: 'Single',
        menikah: profile.pasanganNama ? `Menikah dengan ${escapeAttr(profile.pasanganNama)}` : 'Menikah',
        cerai: 'Cerai',
        'janda-duda': 'Janda / Duda',
    }[profile.status] || '—';
    let sesiDate = '—';
    if (profile.sesiDate) {
        try {
            sesiDate = new Date(profile.sesiDate).toLocaleDateString('id-ID', { day: 'numeric', month: 'long', year: 'numeric' });
        } catch (e) {}
    }
    const meta = [
        age > 0 ? `${age} tahun` : null,
        statusLabel,
        `Sesi ${sesiDate}`,
    ].filter(Boolean).join(' · ');
    const secondaryMeta = [profile.profesi, profile.kota].filter(Boolean).join(' · ');
    const anakSummary = profile.anak.length > 0
        ? profile.anak.filter(a => a.nama).map(a => escapeAttr(a.nama)).join(', ')
        : '';
    return `
        <div class="bg-gray-900 text-white rounded-2xl p-6 mb-6">
            <p class="text-[10px] text-gray-400 uppercase tracking-wider mb-2">Master Plan untuk</p>
            <h2 class="text-2xl md:text-3xl font-black mb-2">${escapeAttr(profile.nama || 'Klien')}</h2>
            <p class="text-xs text-gray-300">${meta}</p>
            ${secondaryMeta ? `<p class="text-xs text-gray-500 mt-1">${escapeAttr(secondaryMeta)}</p>` : ''}
            ${anakSummary ? `<p class="text-xs text-gray-500 mt-1">Anak: ${anakSummary}</p>` : ''}
            ${profile.wealthMode === 'separate' ? `<p class="text-[10px] text-amber-300 mt-2 uppercase tracking-wider">⚠ Wealth Separate — plan ini untuk ${escapeAttr(profile.nama || 'klien')} saja</p>` : ''}
        </div>
    `;
}

// ====== GOALS ======

function escapeAttr(s) {
    return (s || '').toString().replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}

function addGoal(category) {
    if (!GOAL_DEFAULTS[category]) return;
    const id = nextGoalId++;
    const goal = {
        id,
        category,
        name: '',
        targetYear: '',
        targetAmount: 0,
        currentAllocation: 0,
    };
    if (category === 'pendidikan') {
        goal.usiaAnak = '';
    } else if (category === 'pensiun') {
        goal.usiaPensiun = 55;
        goal.monthlyTarget = 0;
    } else if (category === 'custom') {
        goal.inflationPct = 5;
    }
    goalsState.push(goal);
    renderGoals();
    saveVtState();
}

function removeGoal(id) {
    goalsState = goalsState.filter(g => g.id !== id);
    renderGoals();
    saveVtState();
}

function renderGoalCard(g) {
    const def = GOAL_DEFAULTS[g.category];
    let fields = '';

    if (g.category === 'pendidikan') {
        fields = `
            <div class="input-row">
                <div><label>Nama anak</label></div>
                <input type="text" data-goal-id="${g.id}" data-field="name" placeholder="e.g. Aiden">
            </div>
            <div class="input-row">
                <div>
                    <label>Usia anak sekarang</label>
                    <p class="field-hint">Default target dana = saat anak umur 18 (masuk universitas). Boleh override pakai field "Tahun butuh dana" di bawah.</p>
                </div>
                <input type="number" data-goal-id="${g.id}" data-field="usiaAnak" min="0" max="22" placeholder="e.g. 5">
            </div>
            <div class="input-row">
                <div>
                    <label>Tahun butuh dana <span class="text-gray-300">(optional)</span></label>
                    <p class="field-hint">Kosongkan kalau ikut default (anak umur 18).</p>
                </div>
                <input type="number" data-goal-id="${g.id}" data-field="targetYear" min="2026" max="2070" placeholder="e.g. 2042">
            </div>
            <div class="input-row">
                <div>
                    <label>Total biaya pendidikan (nilai hari ini)</label>
                    <p class="field-hint">Total estimasi biaya kuliah (4 tahun) dalam Rupiah saat ini. Inflasi pendidikan 10% di-apply otomatis.</p>
                </div>
                <input type="text" class="formatted-number" inputmode="numeric" data-goal-id="${g.id}" data-field="targetAmount" placeholder="0">
            </div>
            <div class="input-row">
                <div>
                    <label>Dana sudah terkumpul untuk goal ini</label>
                    <p class="field-hint">Yang udah di-set aside khusus pendidikan anak ini. Isi 0 kalau belum ada.</p>
                </div>
                <input type="text" class="formatted-number" inputmode="numeric" data-goal-id="${g.id}" data-field="currentAllocation" placeholder="0">
            </div>
        `;
    } else if (g.category === 'pensiun') {
        fields = `
            <div class="input-row">
                <div><label>Nama goal <span class="text-gray-300">(optional)</span></label></div>
                <input type="text" data-goal-id="${g.id}" data-field="name" placeholder="e.g. Pensiun nyaman">
            </div>
            <div class="input-row">
                <div>
                    <label>Target usia pensiun</label>
                    <p class="field-hint">Default 55, sama dengan asumsi Vital #6.</p>
                </div>
                <input type="number" data-goal-id="${g.id}" data-field="usiaPensiun" min="40" max="70" placeholder="55">
            </div>
            <div class="input-row">
                <div>
                    <label>Target pendapatan bulanan pensiun (nilai hari ini)</label>
                    <p class="field-hint">Berapa per bulan yang kamu mau pakai di masa pensiun, dalam nilai saat ini. Inflasi 5% di-apply, asumsi 20 tahun pensiun (55-75).</p>
                </div>
                <input type="text" class="formatted-number" inputmode="numeric" data-goal-id="${g.id}" data-field="monthlyTarget" placeholder="0">
            </div>
            <div class="input-row">
                <div>
                    <label>Dana pensiun sudah terkumpul</label>
                    <p class="field-hint">Aset yang sudah <em>didedikasikan</em> untuk pensiun (subset dari investable assets di Section B). Isi 0 atau jumlah dedicated.</p>
                </div>
                <input type="text" class="formatted-number" inputmode="numeric" data-goal-id="${g.id}" data-field="currentAllocation" placeholder="0">
            </div>
        `;
    } else if (g.category === 'custom') {
        fields = `
            <div class="input-row">
                <div><label>Nama goal</label></div>
                <input type="text" data-goal-id="${g.id}" data-field="name" placeholder="e.g. Liburan keluarga Eropa">
            </div>
            <div class="input-row">
                <div><label>Tahun target</label></div>
                <input type="number" data-goal-id="${g.id}" data-field="targetYear" min="2026" max="2070" placeholder="e.g. 2030">
            </div>
            <div class="input-row">
                <div>
                    <label>Total target (nilai hari ini)</label>
                </div>
                <input type="text" class="formatted-number" inputmode="numeric" data-goal-id="${g.id}" data-field="targetAmount" placeholder="0">
            </div>
            <div class="input-row">
                <div>
                    <label>Dana sudah terkumpul</label>
                </div>
                <input type="text" class="formatted-number" inputmode="numeric" data-goal-id="${g.id}" data-field="currentAllocation" placeholder="0">
            </div>
            <div class="input-row">
                <div>
                    <label>Inflasi tahunan (%)</label>
                    <p class="field-hint">Bebas. Default 5%. Lifestyle umum 5%, haji/umroh 6%, properti 8%, pendidikan 10%.</p>
                </div>
                <input type="number" data-goal-id="${g.id}" data-field="inflationPct" min="0" max="20" step="0.5" placeholder="5">
            </div>
        `;
    }

    return `
        <div class="subsection" data-goal-id="${g.id}">
            <div class="flex items-center justify-between mb-3">
                <h3 class="!mb-0">${def.label} <span class="text-gray-400 font-normal">#${g.id}</span></h3>
                <button type="button" onclick="removeGoal(${g.id})" class="text-xs text-red-500 hover:text-red-700 font-medium">✕ Hapus</button>
            </div>
            ${fields}
        </div>
    `;
}

function populateGoalInputs(g) {
    const listEl = document.getElementById('vt-goals-list');
    if (!listEl) return;
    Object.keys(g).forEach(field => {
        if (field === 'id' || field === 'category') return;
        const el = listEl.querySelector(`[data-goal-id="${g.id}"][data-field="${field}"]`);
        if (!el) return;
        const val = g[field];
        if (el.classList.contains('formatted-number')) {
            const num = Number(val) || 0;
            el.dataset.rawValue = String(num);
            el.value = num > 0 ? num.toLocaleString('en-US') : '';
        } else if (val !== undefined && val !== null && val !== '') {
            el.value = val;
        }
    });
}

function attachGoalListeners() {
    const listEl = document.getElementById('vt-goals-list');
    if (!listEl) return;
    listEl.querySelectorAll('[data-goal-id][data-field]').forEach(el => {
        const handler = () => {
            const id = parseInt(el.dataset.goalId);
            const field = el.dataset.field;
            const goal = goalsState.find(x => x.id === id);
            if (!goal) return;
            if (el.classList.contains('formatted-number')) {
                formatNumberInput(el);
                goal[field] = parseFloat(el.dataset.rawValue || '0') || 0;
            } else if (el.type === 'number') {
                goal[field] = el.value === '' ? '' : parseFloat(el.value);
            } else {
                goal[field] = el.value;
            }
            saveVtState();
        };
        el.addEventListener('input', handler);
    });
}

function renderGoals() {
    const listEl = document.getElementById('vt-goals-list');
    const emptyHint = document.getElementById('vt-goals-empty-hint');
    if (!listEl) return;
    if (goalsState.length === 0) {
        listEl.innerHTML = '';
        if (emptyHint) emptyHint.classList.remove('hidden');
        return;
    }
    if (emptyHint) emptyHint.classList.add('hidden');
    listEl.innerHTML = goalsState.map(g => renderGoalCard(g)).join('');
    goalsState.forEach(g => populateGoalInputs(g));
    attachGoalListeners();
}

function isValidGoal(g) {
    if (g.category === 'pensiun') return (Number(g.monthlyTarget) || 0) > 0;
    return (Number(g.targetAmount) || 0) > 0;
}

function computeGoalGap(g, returnRate, currentAge, currentYear) {
    let label, targetFV, yearsToTarget, inflation;

    if (g.category === 'pensiun') {
        const targetAge = Number(g.usiaPensiun) || 55;
        yearsToTarget = Math.max(0, targetAge - currentAge);
        inflation = INFLATION_RATE;
        const monthlyAtRetirement = (Number(g.monthlyTarget) || 0) * Math.pow(1 + inflation, yearsToTarget);
        targetFV = monthlyAtRetirement * 12 * RETIREMENT_YEARS;
        label = g.name || 'Pensiun';
    } else if (g.category === 'pendidikan') {
        inflation = INFLATION_PENDIDIKAN;
        if (Number(g.targetYear) > 0) {
            yearsToTarget = Math.max(0, Number(g.targetYear) - currentYear);
        } else {
            const anakAge = Number(g.usiaAnak) || 0;
            yearsToTarget = Math.max(0, 18 - anakAge);
        }
        targetFV = (Number(g.targetAmount) || 0) * Math.pow(1 + inflation, yearsToTarget);
        label = `Pendidikan ${g.name || 'Anak'}`;
    } else {
        // custom
        inflation = (Number(g.inflationPct) || 5) / 100;
        yearsToTarget = Number(g.targetYear) > 0 ? Math.max(0, Number(g.targetYear) - currentYear) : 0;
        targetFV = (Number(g.targetAmount) || 0) * Math.pow(1 + inflation, yearsToTarget);
        label = g.name || 'Custom goal';
    }

    const currentAlloc = Number(g.currentAllocation) || 0;
    const pvGrown = currentAlloc * Math.pow(1 + returnRate, yearsToTarget);
    const gap = Math.max(0, targetFV - pvGrown);

    const monthlyRate = returnRate / 12;
    const months = yearsToTarget * 12;
    let pmt;
    if (months <= 0) {
        pmt = gap; // due now (one-time)
    } else if (monthlyRate > 0) {
        pmt = gap * monthlyRate / (Math.pow(1 + monthlyRate, months) - 1);
    } else {
        pmt = gap / months;
    }

    return {
        id: g.id,
        category: g.category,
        label,
        targetFV,
        yearsToTarget,
        currentAllocation: currentAlloc,
        pvGrown,
        gap,
        pmt,
        inflation,
    };
}

function buildVerdict(totalPMT, surplus) {
    const gap = totalPMT - surplus;
    if (totalPMT <= 0) {
        return null;
    }
    if (gap <= 0) {
        return {
            headline: 'Math jalan. Plan ini feasible.',
            body: `Total kebutuhan bulanan untuk semua goal: <strong>${formatRp(totalPMT)}</strong>. Surplus bulanan kamu: <strong>${formatRp(surplus)}</strong>. Yang sering bocor di sini bukan math — tapi disiplin eksekusi bulan demi bulan.`,
            bg: 'bg-emerald-50',
            border: 'border-emerald-200',
            textColor: 'text-emerald-900',
        };
    }
    return {
        headline: 'Dengan kondisi current, plan ini belum tertutup.',
        body: `Kebutuhan total <strong>${formatRp(totalPMT)}/bulan</strong>, surplus kamu <strong>${formatRp(surplus)}/bulan</strong>. Gap <strong>${formatRp(gap)}/bulan</strong>. Tiga opsi realistic: <strong>extend timeline</strong> (mundurin tahun target), <strong>cut target</strong> (turunin nominal), atau <strong>tambah income</strong> (raise / bisnis sampingan). Skip satu goal = opsi keempat. Realistic plan biasanya = kombinasi dari ketiganya.`,
        bg: 'bg-amber-50',
        border: 'border-amber-200',
        textColor: 'text-amber-900',
    };
}

function buildGoalResultCard(g) {
    const catLabel = g.category === 'pensiun' ? 'Pensiun' : g.category === 'pendidikan' ? 'Pendidikan' : 'Custom';
    const horizonText = g.yearsToTarget > 0 ? `${g.yearsToTarget} tahun lagi` : 'Due now';
    return `
        <div class="vital-card">
            <div class="flex items-start justify-between mb-3">
                <div>
                    <p class="text-[10px] text-gray-400 uppercase tracking-wider">${catLabel}</p>
                    <h4 class="text-sm font-bold text-gray-900">${escapeAttr(g.label)}</h4>
                </div>
                <span class="text-[10px] text-gray-500 font-medium whitespace-nowrap">${horizonText}</span>
            </div>
            <div class="grid grid-cols-2 gap-x-3 gap-y-3 mt-3 text-xs">
                <div>
                    <p class="text-gray-400 uppercase tracking-wider text-[10px]">Target di tahun pencairan</p>
                    <p class="font-bold text-gray-900 mt-0.5">${formatRp(g.targetFV)}</p>
                </div>
                <div>
                    <p class="text-gray-400 uppercase tracking-wider text-[10px]">Dana current akan jadi</p>
                    <p class="font-bold text-gray-900 mt-0.5">${formatRp(g.pvGrown)}</p>
                </div>
                <div>
                    <p class="text-gray-400 uppercase tracking-wider text-[10px]">Gap untuk ditutup</p>
                    <p class="font-bold text-gray-900 mt-0.5">${formatRp(g.gap)}</p>
                </div>
                <div>
                    <p class="text-gray-400 uppercase tracking-wider text-[10px]">Kebutuhan bulanan</p>
                    <p class="font-black text-violet-700 mt-0.5">${formatRp(g.pmt)}</p>
                </div>
            </div>
        </div>
    `;
}

function buildGapAnalysisHTML(goals, totalPMT, surplus, returnRate) {
    if (goals.length === 0) {
        return `
            <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 mt-6">
                <p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Master Plan</p>
                <h3 class="text-xl font-black mb-1">Gap Analysis</h3>
                <p class="text-sm text-gray-500 mt-3">Belum ada goal yang valid (target ≥ 0). Tambahin minimal 1 goal di Section E untuk lihat gap analysis & required monthly contribution.</p>
            </div>
        `;
    }

    const verdict = buildVerdict(totalPMT, surplus);
    const surplusCoverage = surplus > 0 && totalPMT > 0 ? Math.min(1, surplus / totalPMT) : 0;

    return `
        <div class="bg-white border border-gray-200 rounded-3xl p-6 md:p-8 mt-6">
            <p class="text-xs text-gray-400 uppercase tracking-wider mb-2">Master Plan</p>
            <h3 class="text-xl font-black mb-1">Gap Analysis</h3>
            <p class="text-sm text-gray-500 mb-6">Berapa per bulan yang harus disisihkan untuk hit setiap goal, pakai return profil risiko kamu (${formatPct(returnRate)}/thn).</p>

            <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                ${goals.map(g => buildGoalResultCard(g)).join('')}
            </div>

            <div class="mt-6 pt-6 border-t border-gray-100">
                <div class="grid grid-cols-1 md:grid-cols-2 gap-3">
                    <div class="vital-card">
                        <p class="text-xs text-gray-500 uppercase tracking-wider">Total Kebutuhan Bulanan</p>
                        <p class="text-2xl font-black text-gray-900 mt-1">${formatRp(totalPMT)}</p>
                        <p class="text-xs text-gray-500 mt-1">Untuk capai semua ${goals.length} goal</p>
                    </div>
                    <div class="vital-card">
                        <p class="text-xs text-gray-500 uppercase tracking-wider">Surplus Bulanan</p>
                        <p class="text-2xl font-black text-gray-900 mt-1">${formatRp(surplus)}</p>
                        <p class="text-xs text-gray-500 mt-1">THP minus pengeluaran (${formatPct(surplusCoverage, 0)} tutup kebutuhan)</p>
                    </div>
                </div>

                ${verdict ? `
                <div class="mt-4 p-5 ${verdict.bg} border ${verdict.border} rounded-2xl">
                    <p class="text-sm font-bold ${verdict.textColor} mb-2">${verdict.headline}</p>
                    <p class="text-sm ${verdict.textColor} leading-relaxed">${verdict.body}</p>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

// ====== END GOALS ======

// ============================================================
// Wizard / Multi-step state + navigation
// ============================================================
const TOTAL_STEPS = 5;
const STEP_LABELS = ['Profil Klien', 'Visi Hidup', 'Financial Vitals', 'Goals & Target', 'Review & Generate'];
let currentStep = 1;
let visitedSteps = new Set([1]);

function showStepError(step, msg) {
    const el = document.getElementById(`step${step}-error`);
    if (el) { el.textContent = msg; el.classList.add('show'); }
}
function clearStepError(step) {
    const el = document.getElementById(`step${step}-error`);
    if (el) { el.textContent = ''; el.classList.remove('show'); }
}

function validateStep(step) {
    if (step === 1) {
        const profile = getProfileData();
        if (!profile.nama) return 'Mohon isi: Nama Lengkap';
        if (!profile.dob) return 'Mohon isi: Tanggal Lahir';
        const age = getAgeFromDOB(profile.dob);
        if (age < 18 || age > 80) return 'Usia hasil DOB harus 18-80 tahun';
        if (!profile.status) return 'Mohon pilih: Status Pernikahan';
        return null;
    }
    if (step === 2) return null; // soft
    if (step === 3) {
        if (getRawValue('vt-income') <= 0) return 'Mohon isi: Pendapatan Bulanan (Section A)';
        if (getRawValue('vt-expense') <= 0) return 'Mohon isi: Pengeluaran Bulanan (Section A)';
        if (getRiskScore() === 0) return 'Mohon jawab 5 pertanyaan Profil Risiko (Section D)';
        return null;
    }
    if (step === 4) return null; // soft
    if (step === 5) return null;
    return null;
}

function goToStep(n) {
    if (n < 1 || n > TOTAL_STEPS) return;

    // Forward to unvisited step → validate current first
    if (n > currentStep && !visitedSteps.has(n)) {
        const err = validateStep(currentStep);
        if (err) { showStepError(currentStep, err); return; }
    }
    clearStepError(currentStep);

    visitedSteps.add(n);
    currentStep = n;

    document.querySelectorAll('.wizard-step').forEach(panel => {
        const s = parseInt(panel.dataset.step, 10);
        panel.classList.toggle('active', s === n);
    });

    updateProgressUI();

    if (n === TOTAL_STEPS) renderReview();

    // Scroll: smooth to top of progress bar
    const wrap = document.querySelector('.progress-wrap');
    if (wrap) wrap.scrollIntoView({ behavior: 'smooth', block: 'start' });

    saveVtState();
}

function updateProgressUI() {
    const pct = Math.round((currentStep / TOTAL_STEPS) * 100);
    const fill = document.getElementById('wiz-fill');
    if (fill) fill.style.width = pct + '%';
    const pctEl = document.getElementById('wiz-pct');
    if (pctEl) pctEl.textContent = pct + '%';
    const labelEl = document.getElementById('wiz-step-label');
    if (labelEl) labelEl.textContent = `Step ${currentStep} of ${TOTAL_STEPS} · ${STEP_LABELS[currentStep - 1]}`;
    document.querySelectorAll('.step-dot').forEach(d => {
        const s = parseInt(d.dataset.step, 10);
        d.classList.toggle('active', s === currentStep);
        d.classList.toggle('visited', s !== currentStep && visitedSteps.has(s));
    });
}

function escapeHTML(s) {
    return String(s).replace(/[&<>"']/g, c => ({
        '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
    })[c]);
}

function fmtRpReview(n) {
    if (!n || n === 0) return 'Rp 0';
    return 'Rp ' + Number(Math.round(n)).toLocaleString('id-ID');
}

function renderReview() {
    const wrap = document.getElementById('vt-review-content');
    if (!wrap) return;
    const profile = getProfileData();
    const age = getAgeFromDOB(profile.dob);
    const vision = (document.getElementById('vt-vision').value || '').trim();
    const income = getRawValue('vt-income');
    const expense = getRawValue('vt-expense');
    const invest = getRawValue('vt-invest-monthly');
    const debtMonthly = getRawValue('vt-debt-monthly');
    const riskScore = getRiskScore();
    const riskMapping = riskScore ? mapRiskToProfile(riskScore) : null;

    const statusLabel = ({
        single: 'Single',
        menikah: 'Menikah',
        cerai: 'Cerai',
        'janda-duda': 'Janda / Duda',
    })[profile.status] || '—';

    const wealthLabel = profile.wealthMode === 'separate' ? 'Separate (pisah)' : 'Joint (gabung)';
    const anakStr = profile.anak.length === 0
        ? '<span class="empty">Belum ada</span>'
        : profile.anak.map(a => {
            const an = getAgeFromDOB(a.dob);
            return `${escapeHTML(a.nama || '—')} (${an} thn)`;
        }).join(', ');

    const validGoalCount = goalsState.filter(isValidGoal).length;
    const totalGoalsLabel = validGoalCount === 0
        ? '<span class="empty">Belum ada goal</span>'
        : `${validGoalCount} goal${validGoalCount > 1 ? 's' : ''} aktif`;

    const fmtV = (v) => v ? escapeHTML(v) : '<span class="empty">—</span>';

    wrap.innerHTML = `
        <div class="review-block">
            <h4>Profil Klien <button type="button" class="review-edit" onclick="goToStep(1)">Edit</button></h4>
            <div class="review-row"><span class="k">Nama</span><span class="v">${fmtV(profile.nama)}</span></div>
            <div class="review-row"><span class="k">Usia</span><span class="v">${age > 0 ? age + ' thn' : '<span class="empty">—</span>'}</span></div>
            <div class="review-row"><span class="k">Profesi</span><span class="v">${fmtV(profile.profesi)}</span></div>
            <div class="review-row"><span class="k">Kota</span><span class="v">${fmtV(profile.kota)}</span></div>
            <div class="review-row"><span class="k">Status</span><span class="v">${statusLabel}</span></div>
            ${profile.status === 'menikah' ? `
                <div class="review-row"><span class="k">Pasangan</span><span class="v">${fmtV(profile.pasanganNama)}</span></div>
                <div class="review-row"><span class="k">Wealth mode</span><span class="v">${wealthLabel}</span></div>
            ` : ''}
            <div class="review-row"><span class="k">Anak</span><span class="v">${anakStr}</span></div>
        </div>
        <div class="review-block">
            <h4>Visi Hidup <button type="button" class="review-edit" onclick="goToStep(2)">Edit</button></h4>
            <div class="review-row"><span class="k">Visi @ usia 60</span><span class="v" style="max-width:75%">${vision ? '<em>"' + escapeHTML(vision.slice(0, 140)) + (vision.length > 140 ? '…' : '') + '"</em>' : '<span class="empty">Belum diisi</span>'}</span></div>
        </div>
        <div class="review-block">
            <h4>Financial Vitals <button type="button" class="review-edit" onclick="goToStep(3)">Edit</button></h4>
            <div class="review-row"><span class="k">Pendapatan bulanan</span><span class="v">${fmtRpReview(income)}</span></div>
            <div class="review-row"><span class="k">Pengeluaran bulanan</span><span class="v">${fmtRpReview(expense)}</span></div>
            <div class="review-row"><span class="k">Investasi bulanan</span><span class="v">${fmtRpReview(invest)}</span></div>
            <div class="review-row"><span class="k">Cicilan utang bulanan</span><span class="v">${fmtRpReview(debtMonthly)}</span></div>
            <div class="review-row"><span class="k">Profil risiko</span><span class="v">${riskMapping ? riskMapping.profile + ' · ' + (riskMapping.rate * 100).toFixed(1) + '% p.a.' : '<span class="empty">Belum dijawab</span>'}</span></div>
        </div>
        <div class="review-block">
            <h4>Goals & Target <button type="button" class="review-edit" onclick="goToStep(4)">Edit</button></h4>
            <div class="review-row"><span class="k">Total goal aktif</span><span class="v">${totalGoalsLabel}</span></div>
        </div>
    `;

    // Soft warnings
    const warnings = [];
    if (!vision) warnings.push('Visi Hidup belum diisi');
    if (validGoalCount === 0) warnings.push('Belum ada Goal — Gap Analysis akan kosong');
    const warnEl = document.getElementById('vt-review-warning');
    if (warnEl) {
        if (warnings.length > 0) {
            warnEl.innerHTML = '<strong>⚠ Catatan:</strong> ' + warnings.join('. ') + '. Tetap bisa generate, atau klik Edit untuk lengkapi.';
            warnEl.classList.remove('hidden');
        } else {
            warnEl.classList.add('hidden');
        }
    }
}

// --- Main entry ---
function calculateVitals() {
    const errEl = document.getElementById('form-error');
    errEl.classList.add('hidden');

    // Validate via wizard step gates — jump to first failing step
    for (let s = 1; s <= 4; s++) {
        const err = validateStep(s);
        if (err) {
            goToStep(s);
            showStepError(s, err);
            return;
        }
    }

    // Read profile + raw data
    const profile = getProfileData();
    const ageFromDOB = getAgeFromDOB(profile.dob);

    const d = {
        vision: (document.getElementById('vt-vision').value || '').trim(),
        age: ageFromDOB,
        income: getRawValue('vt-income'),
        expense: getRawValue('vt-expense'),
        investMonthly: getRawValue('vt-invest-monthly'),
        debtMonthly: getRawValue('vt-debt-monthly'),

        assetTabungan:  getRawValue('vt-asset-tabungan'),
        assetDeposito:  getRawValue('vt-asset-deposito'),
        assetEmas:      getRawValue('vt-asset-emas'),
        assetReksadana: getRawValue('vt-asset-reksadana'),
        assetSaham:     getRawValue('vt-asset-saham'),
        assetObligasi:  getRawValue('vt-asset-obligasi'),
        assetKripto:    getRawValue('vt-asset-kripto'),
        assetPropertyInvest: getRawValue('vt-asset-property-invest'),
        assetPropertyUtama:  getRawValue('vt-asset-property-utama'),
        assetTanah:     getRawValue('vt-asset-tanah'),
        assetUnitlink:  getRawValue('vt-asset-unitlink'),
        assetKendaraan: getRawValue('vt-asset-kendaraan'),
        assetBisnis:    getRawValue('vt-asset-bisnis'),

        debtKpr: getRawValue('vt-debt-kpr'),
        debtKkb: getRawValue('vt-debt-kkb'),
        debtCc:  getRawValue('vt-debt-cc'),
        debtKta: getRawValue('vt-debt-kta'),

        lifeTerm:     getRawValue('vt-life-term'),
        lifeUnitlink: getRawValue('vt-life-unitlink'),
        lifeWhole:    getRawValue('vt-life-whole'),

        isAgent: getIsAgent(),
    };

    // Risk profile
    const riskScore = getRiskScore();
    const riskMapping = mapRiskToProfile(riskScore || 13); // default to Moderate if not answered
    d.riskScore = riskScore;
    d.riskProfile = riskMapping.profile;
    d.returnRate = riskMapping.rate;
    d.allocation = riskMapping.allocation;

    // Validation
    const errors = [];
    if (!profile.nama) errors.push('Nama klien (Section P)');
    if (!profile.dob) errors.push('Tanggal lahir klien (Section P)');
    else if (d.age < 18 || d.age > 80) errors.push('Usia hasil DOB harus 18-80');
    if (!profile.status) errors.push('Status pernikahan (Section P)');
    if (d.income <= 0) errors.push('Pendapatan bulanan');
    if (d.expense <= 0) errors.push('Pengeluaran bulanan');
    if (riskScore === 0) errors.push('Profil Risiko (Section D, 5 pertanyaan)');

    if (errors.length > 0) {
        errEl.textContent = 'Mohon lengkapi: ' + errors.join(', ') + '.';
        errEl.classList.remove('hidden');
        errEl.scrollIntoView({ behavior: 'smooth', block: 'center' });
        return;
    }

    // Compute Vitals
    const result = computeVitals(d);

    // Compute Goals
    const currentYear = new Date().getFullYear();
    const goalsComputed = goalsState
        .filter(isValidGoal)
        .map(g => computeGoalGap(g, d.returnRate, d.age, currentYear));
    const totalPMT = goalsComputed.reduce((s, g) => s + g.pmt, 0);

    // Anonymous funnel event
    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'vitals_calc_view',
            session_id: getSessionId(),
            age: d.age,
            income: d.income,
            is_agent: d.isAgent,
            risk_profile: d.riskProfile,
            risk_score: d.riskScore,
            return_rate: d.returnRate,
            composite_score: result.composite,
            v1_color: result.v1.color,
            v2_color: result.v2.color,
            v3_color: result.v3.color,
            v4_color: result.v4.color,
            v5_color: result.v5.color,
            v6_color: result.v6.color,
            has_vision: d.vision.length > 0,
            has_profile: !!profile.nama,
            client_status: profile.status,
            wealth_mode: profile.wealthMode,
            anak_count: profile.anak.length,
            goals_count: goalsComputed.length,
            goals_total_pmt: Math.round(totalPMT),
            goals_gap_vs_surplus: Math.round(totalPMT - result.surplus),
        }),
        keepalive: true,
    }).catch(() => {});

    // Render
    const resultsEl = document.getElementById('vt-results');
    resultsEl.innerHTML = buildClientHeaderHTML(profile, d.age)
        + buildVisionHeaderHTML(d.vision)
        + buildTeaserHTML(result)
        + buildFullBreakdownHTML(result)
        + buildGapAnalysisHTML(goalsComputed, totalPMT, result.surplus, d.returnRate);
    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Track engagement
    const firstCard = resultsEl.querySelector('.vital-card');
    if (firstCard && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fireFunnelEvent('results_seen', {
                    age: d.age,
                    composite: result.composite,
                    risk_profile: d.riskProfile,
                });
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        obs.observe(firstCard);
    }
}

document.addEventListener('DOMContentLoaded', () => {
    initSesiDateDefault();
    initNumberFormatting();
    restoreVtState();

    // Wire up state-save listeners for all non-formatted inputs and radios
    VT_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && !el.classList.contains('formatted-number')) {
            el.addEventListener('input', saveVtState);
        }
    });
    PROFILE_FIELDS.forEach(id => {
        const el = document.getElementById(id);
        if (!el) return;
        el.addEventListener('input', saveVtState);
        el.addEventListener('change', saveVtState);
    });
    // Profile-specific reactive handlers
    const dobEl = document.getElementById('vt-prof-dob');
    if (dobEl) dobEl.addEventListener('input', updateAgeDisplay);
    const statusEl = document.getElementById('vt-prof-status');
    if (statusEl) statusEl.addEventListener('change', onStatusChange);
    document.querySelectorAll('input[name="vt-prof-wealth"]').forEach(r => {
        r.addEventListener('change', () => { onWealthChange(); saveVtState(); });
    });

    document.querySelectorAll('input[name="vt-is-agent"]').forEach(r => r.addEventListener('change', saveVtState));
    RISK_QS.forEach(name => {
        document.querySelectorAll(`input[name="${name}"]`).forEach(r => r.addEventListener('change', saveVtState));
    });

    recomputeSubtotals();

    // Apply restored step (if any). Default to step 1.
    document.querySelectorAll('.wizard-step').forEach(panel => {
        const s = parseInt(panel.dataset.step, 10);
        panel.classList.toggle('active', s === currentStep);
    });
    updateProgressUI();
    if (currentStep === TOTAL_STEPS) renderReview();
});
