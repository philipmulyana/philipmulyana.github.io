// ============================================================================
// Education Plan Tool — Frontend
// Single-pathway calc: target FV (10% inflation pendidikan), 3-scenario PMT
// ============================================================================

const STORAGE_KEY_EDU = 'eduplan_state_v1';
const TOTAL_STEPS = 5;
const INFLASI_PENDIDIKAN = 0.10; // 10% p.a.

// Pathway preset costs (today's value in IDR) — research-based, sourced from
// vault [[(C) Education Plan SAMPLE - Wijaya Family]]. Tuition + living total 4 thn (3 thn AU).
const PATHWAY_PRESETS = {
    id_ptn:        { name: 'PTN Top Tier (UI/ITB/UGM)',      full: 'PTN Top Tier — UI / ITB / UGM / Unair / IPB',                       flag: '🇮🇩', cost: 360000000  }, // 20jt+60jt × 4 + 10jt
    id_swasta:     { name: 'Swasta Top (BINUS/UPH/Prasmul)', full: 'Universitas Swasta Top — BINUS / UPH / Prasmul / Atma Jaya',        flag: '🇮🇩', cost: 590000000  }, // 80jt+60jt × 4 + 30jt
    cn_tsinghua:   { name: 'Tsinghua / PKU',                  full: 'Tsinghua University / Peking University — Beijing',                flag: '🇨🇳', cost: 708000000  }, // 68jt+104jt × 4 + 20jt
    sg_nus_tgs:    { name: 'NUS/NTU + TGS',                   full: 'NUS / NTU Singapore — dengan beasiswa TGS (3-thn bond)',          flag: '🇸🇬', cost: 2302000000 }, // 257jt+306jt × 4 + 50jt
    sg_nus_no_tgs: { name: 'NUS/NTU tanpa TGS',               full: 'NUS / NTU Singapore — tanpa beasiswa TGS (full international)',   flag: '🇸🇬', cost: 3550000000 }, // 569jt+306jt × 4 + 50jt
    au_top:        { name: 'Australia Top',                   full: 'University of Melbourne / Sydney / UNSW (3 thn BCom)',             flag: '🇦🇺', cost: 3285000000 }, // 759jt+316jt × 3 + 60jt
    custom:        { name: 'Custom',                          full: 'Custom (kamu input sendiri)',                                       flag: '⚙️', cost: 0          }
};

// Risk profile → expected return
const RISK_PROFILES = [
    { min: 5,  max: 8,  name: 'Konservatif',         return: 0.060 },
    { min: 9,  max: 12, name: 'Moderate Konservatif',return: 0.075 },
    { min: 13, max: 16, name: 'Moderate',            return: 0.090 },
    { min: 17, max: 20, name: 'Moderate Agresif',    return: 0.105 }
];

const state = { currentStep: 1, visitedSteps: new Set([1]) };

// ============================================================================
// State persistence
// ============================================================================
function saveState() {
    try {
        const data = {
            currentStep: state.currentStep,
            visitedSteps: Array.from(state.visitedSteps),
            inputs: {
                'parent-nama': document.getElementById('parent-nama')?.value || '',
                'parent-pasangan': document.getElementById('parent-pasangan')?.value || '',
                'anak-nama': document.getElementById('anak-nama')?.value || '',
                'anak-dob': document.getElementById('anak-dob')?.value || '',
                'pathway': document.querySelector('input[name=pathway]:checked')?.value || '',
                'biaya-today': document.getElementById('biaya-today')?.dataset.rawValue || document.getElementById('biaya-today')?.value.replace(/[^0-9]/g, '') || '',
                'modal-awal': document.getElementById('modal-awal')?.dataset.rawValue || document.getElementById('modal-awal')?.value.replace(/[^0-9]/g, '') || '',
                'surplus-bulanan': document.getElementById('surplus-bulanan')?.dataset.rawValue || document.getElementById('surplus-bulanan')?.value.replace(/[^0-9]/g, '') || '',
                risk1: document.querySelector('input[name=risk1]:checked')?.value || '',
                risk2: document.querySelector('input[name=risk2]:checked')?.value || '',
                risk3: document.querySelector('input[name=risk3]:checked')?.value || '',
                risk4: document.querySelector('input[name=risk4]:checked')?.value || '',
                risk5: document.querySelector('input[name=risk5]:checked')?.value || '',
                'lead-email': document.getElementById('lead-email')?.value || '',
                'lead-wa': document.getElementById('lead-wa')?.value || ''
            }
        };
        localStorage.setItem(STORAGE_KEY_EDU, JSON.stringify(data));
    } catch (e) {}
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_EDU);
        if (!raw) return;
        const data = JSON.parse(raw);
        if (data.visitedSteps) state.visitedSteps = new Set(data.visitedSteps);
        if (data.currentStep) state.currentStep = Math.min(data.currentStep, TOTAL_STEPS);

        for (const [id, val] of Object.entries(data.inputs || {})) {
            if (!val) continue;
            const el = document.getElementById(id);
            if (el) {
                el.value = val;
                if (el.classList.contains('formatted-number') || id === 'biaya-today' || id === 'modal-awal' || id === 'surplus-bulanan') {
                    formatNumberInput(el);
                }
            } else {
                // radio buttons
                const radio = document.querySelector(`input[name=${id}][value="${val}"]`);
                if (radio) radio.checked = true;
            }
        }
    } catch (e) {}
}

// ============================================================================
// Helpers
// ============================================================================
function formatNumberInput(input) {
    const raw = (input.value || '').replace(/[^0-9]/g, '');
    input.dataset.rawValue = raw;
    if (raw === '') { input.value = ''; return; }
    input.value = Number(raw).toLocaleString('en-US');
}

function getRawValue(id) {
    const el = document.getElementById(id);
    if (!el) return 0;
    return parseFloat(el.dataset.rawValue || (el.value || '').replace(/[^0-9]/g, '')) || 0;
}

function formatRp(num) {
    if (!num || isNaN(num)) return 'Rp 0';
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatRpCompact(num) {
    // Auto-shorten: 1.234.567 → 1,23 jt, etc.
    if (!num || isNaN(num)) return 'Rp 0';
    num = Math.round(num);
    if (num >= 1000000000) return 'Rp ' + (num / 1000000000).toFixed(2).replace('.', ',') + ' M';
    if (num >= 1000000) return 'Rp ' + (num / 1000000).toFixed(1).replace('.', ',') + ' jt';
    return 'Rp ' + num.toLocaleString('id-ID');
}

// ============================================================================
// Age + Target year derivation from DOB
// ============================================================================
function deriveAgeFromDob(dobStr) {
    if (!dobStr) return { age: null, targetYear: null, yearsToTarget: null };
    const dob = new Date(dobStr);
    const now = new Date();
    let age = now.getFullYear() - dob.getFullYear();
    const m = now.getMonth() - dob.getMonth();
    if (m < 0 || (m === 0 && now.getDate() < dob.getDate())) age--;

    const targetYear = dob.getFullYear() + 18;
    const yearsToTarget = Math.max(0, targetYear - now.getFullYear());
    return { age, targetYear, yearsToTarget };
}

function updateAnakAgeDisplay() {
    const dob = document.getElementById('anak-dob')?.value;
    const display = document.getElementById('anak-age-display');
    if (!display) return;
    const { age, targetYear, yearsToTarget } = deriveAgeFromDob(dob);
    if (age !== null && yearsToTarget > 0) {
        display.style.display = 'block';
        display.innerHTML = `📅 <strong>Umur anak sekarang:</strong> ${age} tahun · <strong>Target masuk kuliah:</strong> ${targetYear} (~${yearsToTarget} tahun lagi)`;
    } else if (age !== null && yearsToTarget <= 0) {
        display.style.display = 'block';
        display.innerHTML = `⚠️ <strong>Anak sudah ≥ 18 tahun</strong> — tool ini untuk planning dana kuliah masa depan, bukan untuk situasi yang sudah berjalan.`;
    } else {
        display.style.display = 'none';
    }
}

// ============================================================================
// Pathway selection
// ============================================================================
function handlePathwayChange() {
    const radio = document.querySelector('input[name=pathway]:checked');
    if (!radio) return;
    const preset = PATHWAY_PRESETS[radio.value];
    if (!preset) return;

    const biayaInput = document.getElementById('biaya-today');
    if (!biayaInput) return;
    if (preset.cost > 0) {
        biayaInput.value = preset.cost.toLocaleString('en-US');
        biayaInput.dataset.rawValue = String(preset.cost);
    } else {
        // Custom — clear so user inputs
        biayaInput.value = '';
        biayaInput.dataset.rawValue = '';
    }
    saveState();
}

// ============================================================================
// Risk profile calculation
// ============================================================================
function computeRiskScore() {
    let total = 0;
    for (let i = 1; i <= 5; i++) {
        const v = document.querySelector(`input[name=risk${i}]:checked`)?.value;
        if (v) total += parseInt(v);
    }
    return total; // range 5-20 if all answered
}

function deriveRiskProfile() {
    const score = computeRiskScore();
    if (score < 5) return null;
    return RISK_PROFILES.find(p => score >= p.min && score <= p.max);
}

function updateRiskDisplay() {
    const profile = deriveRiskProfile();
    const display = document.getElementById('risk-result');
    if (!display) return;
    if (profile) {
        display.style.display = 'block';
        display.innerHTML = `🎯 <strong>Risk Profile:</strong> ${profile.name} → asumsi expected return <strong>${(profile.return * 100).toFixed(1)}% p.a.</strong> untuk perhitungan`;
    } else {
        display.style.display = 'none';
    }
}

// ============================================================================
// Calc engine: 3-scenario FV + PMT
// ============================================================================
function computeEduplan() {
    const dob = document.getElementById('anak-dob')?.value;
    const { age, targetYear, yearsToTarget } = deriveAgeFromDob(dob);
    if (yearsToTarget === null || yearsToTarget <= 0) return null;

    const biayaToday = getRawValue('biaya-today');
    if (biayaToday <= 0) return null;

    const modalAwal = getRawValue('modal-awal');
    const surplus = getRawValue('surplus-bulanan');

    const profile = deriveRiskProfile();
    if (!profile) return null;

    // Future value of education cost (with education inflation)
    const fvTarget = biayaToday * Math.pow(1 + INFLASI_PENDIDIKAN, yearsToTarget);

    // 3-scenario returns
    const scenarios = ['optimis', 'base', 'pesimis'].map((scen) => {
        let returnRate = profile.return;
        if (scen === 'optimis') returnRate += 0.015;
        if (scen === 'pesimis') returnRate -= 0.015;

        // Modal awal projected to target year
        const modalProjected = modalAwal * Math.pow(1 + returnRate, yearsToTarget);
        const gap = Math.max(0, fvTarget - modalProjected);

        // PMT (sinking fund) needed monthly to bridge gap
        const months = yearsToTarget * 12;
        const monthlyRate = returnRate / 12;
        let pmt = 0;
        if (gap > 0 && monthlyRate > 0) {
            pmt = (gap * monthlyRate) / (Math.pow(1 + monthlyRate, months) - 1);
        } else if (gap > 0) {
            pmt = gap / months;
        }
        return { scenario: scen, returnRate, modalProjected, gap, pmt };
    });

    const base = scenarios.find(s => s.scenario === 'base');
    const surplusEnough = surplus >= base.pmt;

    return {
        yearsToTarget,
        targetYear,
        currentAge: age,
        fvTarget,
        biayaToday,
        modalAwal,
        surplus,
        riskProfile: profile,
        scenarios,
        base,
        surplusEnough
    };
}

function renderPreview() {
    const result = computeEduplan();
    const previewBlock = document.getElementById('preview-result');
    if (!previewBlock) return;
    if (!result) {
        previewBlock.style.display = 'none';
        return;
    }
    previewBlock.style.display = 'block';

    document.getElementById('preview-formula').textContent = `Biaya hari ini ${formatRpCompact(result.biayaToday)} × inflasi 10% × ${result.yearsToTarget} tahun`;
    document.getElementById('preview-fv').textContent = formatRpCompact(result.fvTarget);

    const opt = result.scenarios.find(s => s.scenario === 'optimis');
    const base = result.base;
    const pes = result.scenarios.find(s => s.scenario === 'pesimis');

    document.getElementById('preview-pmt-opt').textContent = formatRpCompact(opt.pmt);
    document.getElementById('preview-pmt-base').textContent = formatRpCompact(base.pmt);
    document.getElementById('preview-pmt-pes').textContent = formatRpCompact(pes.pmt);

    const realityEl = document.getElementById('reality-check');
    if (result.surplusEnough) {
        realityEl.className = 'reality-check good';
        realityEl.innerHTML = `✓ <strong>Surplus kamu (${formatRpCompact(result.surplus)}/bln) cukup untuk hit goal di base case (butuh ${formatRpCompact(base.pmt)}/bln).</strong> Bahkan ada buffer ${formatRpCompact(result.surplus - base.pmt)}/bln yang bisa redirect ke goal lain.`;
    } else {
        const shortBy = base.pmt - result.surplus;
        realityEl.className = 'reality-check bad';
        realityEl.innerHTML = `⚠ <strong>Surplus kamu (${formatRpCompact(result.surplus)}/bln) belum cukup untuk goal base case (butuh ${formatRpCompact(base.pmt)}/bln, kurang ${formatRpCompact(shortBy)}/bln).</strong> Pilihan: (1) extend timeline, (2) cut target ke pathway lebih ekonomis, (3) tambah income/redirect cashflow lain. Detail lengkap di PDF.`;
    }
}

// ============================================================================
// Wizard navigation
// ============================================================================
function showStep(n) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    document.getElementById(`step-${n}`)?.classList.add('active');

    const pct = Math.round((n / TOTAL_STEPS) * 100);
    document.getElementById('progress-fill').style.width = pct + '%';
    document.getElementById('step-label').textContent = `Step ${n} of ${TOTAL_STEPS}`;
    document.getElementById('step-pct').textContent = pct + '%';

    document.querySelectorAll('.step-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'visited');
        if (dotStep === n) dot.classList.add('active');
        else if (state.visitedSteps.has(dotStep)) dot.classList.add('visited');
    });

    document.getElementById('btn-back').disabled = (n === 1);
    if (n === TOTAL_STEPS) {
        document.getElementById('btn-next').style.display = 'none';
        document.getElementById('btn-submit').style.display = 'block';
    } else {
        document.getElementById('btn-next').style.display = 'block';
        document.getElementById('btn-submit').style.display = 'none';
    }

    if (n === 4) {
        updateRiskDisplay();
        renderPreview();
    }

    document.getElementById('eduplan-form').scrollIntoView({ behavior: 'smooth', block: 'start' });
    state.currentStep = n;
    state.visitedSteps.add(n);
    saveState();
}

function nextStep() { if (validateStep(state.currentStep) && state.currentStep < TOTAL_STEPS) showStep(state.currentStep + 1); }
function prevStep() { if (state.currentStep > 1) showStep(state.currentStep - 1); }

function goToStep(n) {
    if (n === state.currentStep) return;
    if (state.visitedSteps.has(n) || n < state.currentStep) { showStep(n); return; }
    if (validateStep(state.currentStep)) {
        for (let i = state.currentStep; i <= n; i++) state.visitedSteps.add(i);
        showStep(n);
    }
}

function validateStep(n) {
    clearError();
    if (n === 1) {
        if (!document.getElementById('parent-nama').value.trim()) { showError('Nama lengkap kamu harus diisi.'); return false; }
    }
    if (n === 2) {
        if (!document.getElementById('anak-nama').value.trim()) { showError('Nama anak harus diisi.'); return false; }
        const dob = document.getElementById('anak-dob').value;
        if (!dob) { showError('Tanggal lahir anak harus diisi.'); return false; }
        const { yearsToTarget } = deriveAgeFromDob(dob);
        if (yearsToTarget !== null && yearsToTarget <= 0) {
            showError('Anak sudah ≥ 18 tahun. Tool ini untuk planning ke depan, bukan situasi yang sudah berjalan.');
            return false;
        }
    }
    if (n === 3) {
        const pathway = document.querySelector('input[name=pathway]:checked');
        if (!pathway) { showError('Pilih satu pathway universitas.'); return false; }
        if (getRawValue('biaya-today') <= 0) { showError('Biaya kuliah harus diisi (atau pilih pathway preset di atas).'); return false; }
    }
    if (n === 4) {
        if (getRawValue('surplus-bulanan') <= 0) { showError('Surplus bulanan harus diisi — required untuk hitung PMT.'); return false; }
        for (let i = 1; i <= 5; i++) {
            if (!document.querySelector(`input[name=risk${i}]:checked`)) { showError(`Risk question ${i} belum dijawab.`); return false; }
        }
    }
    if (n === 5) {
        const email = document.getElementById('lead-email').value.trim();
        const wa = document.getElementById('lead-wa').value.trim();
        if (!email || !email.includes('@') || !email.includes('.')) { showError('Email valid harus diisi.'); return false; }
        if (!wa || wa.replace(/[^0-9]/g, '').length < 8) { showError('Nomor WhatsApp harus diisi (min 8 digit).'); return false; }
    }
    return true;
}

function showError(msg) { const el = document.getElementById('step-error'); if (el) { el.textContent = msg; el.classList.add('show'); } }
function clearError() { const el = document.getElementById('step-error'); if (el) { el.classList.remove('show'); el.textContent = ''; } }

// ============================================================================
// Submit
// ============================================================================
async function submitEduplan() {
    if (!validateStep(5)) return;

    const result = computeEduplan();
    if (!result) { showError('Belum bisa hitung — pastikan semua step terisi.'); return; }

    const dobStr = document.getElementById('anak-dob').value;
    const pathway = document.querySelector('input[name=pathway]:checked')?.value || 'custom';
    const pathwayPreset = PATHWAY_PRESETS[pathway];

    const payload = {
        lead: {
            nama_klien: document.getElementById('parent-nama').value.trim(),
            nama_pasangan: document.getElementById('parent-pasangan').value.trim(),
            email: document.getElementById('lead-email').value.trim(),
            wa: document.getElementById('lead-wa').value.trim()
        },
        anak: {
            nama: document.getElementById('anak-nama').value.trim(),
            dob: dobStr,
            current_age: result.currentAge,
            target_year: result.targetYear,
            years_to_target: result.yearsToTarget
        },
        pathway: {
            key: pathway,
            name: pathwayPreset.name,
            full_name: pathwayPreset.full,
            flag: pathwayPreset.flag,
            biaya_today: result.biayaToday
        },
        cashflow: {
            modal_awal: result.modalAwal,
            surplus_bulanan: result.surplus
        },
        risk_profile: {
            name: result.riskProfile.name,
            return_rate: result.riskProfile.return,
            score: computeRiskScore()
        },
        computed: {
            fv_target: result.fvTarget,
            scenarios: result.scenarios,
            base: result.base,
            surplus_enough: result.surplusEnough
        },
        submitted_at: new Date().toISOString(),
        source: 'philipmulyana.com/education-plan'
    };

    const submitBtn = document.getElementById('btn-submit');
    submitBtn.disabled = true;
    submitBtn.textContent = '⏳ Sedang mengirim...';

    try {
        const BACKEND_ENDPOINT = 'https://philip-mulyana--ai-website-builder-master-plan-checkup.modal.run/education-plan';
        const response = await fetch(BACKEND_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });
        if (!response.ok) throw new Error(`Backend returned ${response.status}`);

        document.getElementById('eduplan-form').style.display = 'none';
        document.querySelector('.progress-wrap').style.display = 'none';
        document.getElementById('success-state').classList.add('show');
        try { localStorage.removeItem(STORAGE_KEY_EDU); } catch (e) {}
    } catch (err) {
        console.error('Submit failed:', err);
        showError('Maaf, sistem sedang ada gangguan. Coba lagi dalam beberapa menit, atau hubungi philip.mulyana@gmail.com langsung.');
        submitBtn.disabled = false;
        submitBtn.textContent = '✉️ Kirim PDF ke Email Saya';
    }
}

// ============================================================================
// Bootstrap
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Number formatting
    ['biaya-today', 'modal-awal', 'surplus-bulanan'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => { formatNumberInput(el); saveState(); renderPreview(); });
            if (el.value) formatNumberInput(el);
        }
    });

    // DOB auto-derive
    document.getElementById('anak-dob')?.addEventListener('change', () => { updateAnakAgeDisplay(); saveState(); renderPreview(); });

    // Pathway change
    document.querySelectorAll('input[name=pathway]').forEach(r => r.addEventListener('change', () => { handlePathwayChange(); renderPreview(); }));

    // Risk question change
    for (let i = 1; i <= 5; i++) {
        document.querySelectorAll(`input[name=risk${i}]`).forEach(r => r.addEventListener('change', () => { updateRiskDisplay(); saveState(); renderPreview(); }));
    }

    // Text fields persistence
    ['parent-nama', 'parent-pasangan', 'anak-nama', 'lead-email', 'lead-wa'].forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('input', saveState);
    });

    restoreState();
    updateAnakAgeDisplay();
    updateRiskDisplay();
    renderPreview();
    showStep(state.currentStep);
    setTimeout(() => document.querySelectorAll('.fade-up').forEach(el => el.classList.add('animate-in')), 100);
});
