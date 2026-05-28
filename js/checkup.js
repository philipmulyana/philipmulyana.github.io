// ============================================================================
// Financial Check-up Tool — Frontend
// ----------------------------------------------------------------------------
// 17 items × 3 columns (Saya / Pasangan / Bersama) → Net Worth + 4 ratios.
// State persistent via localStorage. Wizard 5-step navigation.
// Submit posts to Modal backend (stub for now — will email PDF when backend ready).
// ============================================================================

const STORAGE_KEY_CHK = 'checkup_state_v2';  // bumped v1→v2 saat add Step 4 Profil Risiko 2026-05-27
const TOTAL_STEPS = 6;  // was 5 — added Step 4 Profil Risiko, Review moved to 5, Lead Capture to 6

// Risk Profile question IDs (Step 4)
const RP_EXP_IDS = [
    'rp_exp_deposito', 'rp_exp_rd', 'rp_exp_saham', 'rp_exp_obligasi',
    'rp_exp_properti', 'rp_exp_emas', 'rp_exp_crypto', 'rp_exp_derivatif', 'rp_exp_none'
];
const RP_SLIDER_IDS = ['rp_skill_rd', 'rp_skill_prospectus', 'rp_skill_saham'];

// --- Item definitions: 17 items, grouped by section ---
const ITEMS = {
    pemasukan:    ['i1', 'i2'],
    cicilan:      ['i3', 'i4', 'i5'],
    pengeluaran:  ['i6', 'i7'],
    tabungan:     ['i8'],
    likuid:       ['i9', 'i10'],
    investasi:    ['i11', 'i12', 'i13', 'i14'],
    pribadi:      ['i15', 'i16'],
    utang:        ['i17']
};
const COLS = ['saya', 'pasangan', 'bersama'];
const ALL_INPUT_IDS = [];
Object.values(ITEMS).flat().forEach(item => {
    COLS.forEach(col => ALL_INPUT_IDS.push(`${item}_${col}`));
});

const state = {
    currentStep: 1,
    visitedSteps: new Set([1]),
    formMode: 'single',  // 'single' = hide pasangan/bersama cols; 'couple' = show all 3
    skippedItems: new Set(),  // item IDs (e.g. 'i11') that klien marked "Saya belum punya ini"
    lead: { nama: '', wa: '', email: '' },
    financialGoal: { type: '', other: '' },  // type: pensiun | pendidikan | lainnya; other: free-text saat lainnya
    riskProfile: {
        usia: '',
        experience: [],  // array of selected instrument keys
        drawdown: '',    // jual / hold / beli / freeze
        time: '',        // <1 / 1-3 / 3-5 / 5+
        skill_rd: 1,
        skill_prospectus: 1,
        skill_saham: 1,
        loss_tolerance: '' // 5 / 15 / 30 / 50
    }
};

// ============================================================================
// "Saya belum punya ini" skip toggle (asset items 11–16)
// ============================================================================
function toggleSkip(checkbox) {
    const itemId = checkbox.dataset.item;
    if (!itemId) return;
    const row = checkbox.closest('.item-row') || document.querySelector(`[data-item-row="${itemId}"]`);
    if (checkbox.checked) {
        state.skippedItems.add(itemId);
        if (row) row.classList.add('is-skipped');
        // Zero out + disable all 3 cols for this item
        ['saya', 'pasangan', 'bersama'].forEach(col => {
            const input = document.getElementById(`${itemId}_${col}`);
            if (input) {
                input.value = '';
                input.dataset.rawValue = '';
                input.disabled = true;
            }
        });
    } else {
        state.skippedItems.delete(itemId);
        if (row) row.classList.remove('is-skipped');
        ['saya', 'pasangan', 'bersama'].forEach(col => {
            const input = document.getElementById(`${itemId}_${col}`);
            if (input) input.disabled = false;
        });
    }
    if (typeof recalculate === 'function') recalculate();
    if (typeof saveState === 'function') saveState();
}

function restoreSkippedItems(skippedArr) {
    if (!Array.isArray(skippedArr)) return;
    state.skippedItems = new Set(skippedArr);
    skippedArr.forEach(itemId => {
        const cb = document.querySelector(`input[type="checkbox"][data-item="${itemId}"]`);
        if (cb) {
            cb.checked = true;
            const row = cb.closest('.item-row') || document.querySelector(`[data-item-row="${itemId}"]`);
            if (row) row.classList.add('is-skipped');
            ['saya', 'pasangan', 'bersama'].forEach(col => {
                const input = document.getElementById(`${itemId}_${col}`);
                if (input) input.disabled = true;
            });
        }
    });
}

// ============================================================================
// Form Mode (single vs couple) — toggle visibility of Pasangan/Bersama cols
// ============================================================================
function setFormMode(mode) {
    state.formMode = mode === 'couple' ? 'couple' : 'single';
    if (state.formMode === 'single') {
        document.body.classList.add('form-mode-single');
    } else {
        document.body.classList.remove('form-mode-single');
    }
    // Re-sync radio button (if called programmatically from state restore)
    const radio = document.querySelector(`input[name="form-mode"][value="${state.formMode}"]`);
    if (radio) radio.checked = true;
    if (typeof saveState === 'function') saveState();
}

// ============================================================================
// Financial Goal collection (Step 6 Lead Capture)
// ============================================================================
function collectFinancialGoal() {
    const sel = document.querySelector('input[name="financial_goal"]:checked');
    const other = document.getElementById('fg_lainnya_text');
    return {
        type: sel ? sel.value : '',
        other: (sel && sel.value === 'lainnya' && other) ? (other.value || '').trim() : ''
    };
}

function restoreFinancialGoal(fg) {
    if (!fg) return;
    if (fg.type) {
        const el = document.querySelector(`input[name="financial_goal"][value="${fg.type}"]`);
        if (el) {
            el.checked = true;
            if (fg.type === 'lainnya') {
                const wrap = document.getElementById('fg_lainnya_text_wrap');
                if (wrap) wrap.style.display = 'block';
            }
        }
    }
    if (fg.other) {
        const txt = document.getElementById('fg_lainnya_text');
        if (txt) txt.value = fg.other;
    }
}

// ============================================================================
// Risk Profile state collection (Step 4)
// ============================================================================
function collectRiskProfile() {
    const usiaEl = document.getElementById('rp_usia');
    const experience = [];
    RP_EXP_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el && el.checked) experience.push(id.replace('rp_exp_', ''));
    });
    const drawdownEl = document.querySelector('input[name="rp_drawdown"]:checked');
    const timeEl = document.querySelector('input[name="rp_time"]:checked');
    const lossEl = document.querySelector('input[name="rp_loss"]:checked');

    return {
        usia: usiaEl ? parseInt(usiaEl.value, 10) || '' : '',
        experience: experience,
        drawdown: drawdownEl ? drawdownEl.value : '',
        time: timeEl ? timeEl.value : '',
        skill_rd: parseInt(document.getElementById('rp_skill_rd')?.value || 1, 10),
        skill_prospectus: parseInt(document.getElementById('rp_skill_prospectus')?.value || 1, 10),
        skill_saham: parseInt(document.getElementById('rp_skill_saham')?.value || 1, 10),
        loss_tolerance: lossEl ? lossEl.value : ''
    };
}

function restoreRiskProfile(rp) {
    if (!rp) return;
    const usiaEl = document.getElementById('rp_usia');
    if (usiaEl && rp.usia) usiaEl.value = rp.usia;
    if (rp.experience && Array.isArray(rp.experience)) {
        rp.experience.forEach(key => {
            const el = document.getElementById('rp_exp_' + key);
            if (el) el.checked = true;
        });
    }
    if (rp.drawdown) {
        const el = document.querySelector(`input[name="rp_drawdown"][value="${rp.drawdown}"]`);
        if (el) el.checked = true;
    }
    if (rp.time) {
        const el = document.querySelector(`input[name="rp_time"][value="${rp.time}"]`);
        if (el) el.checked = true;
    }
    if (rp.loss_tolerance) {
        const el = document.querySelector(`input[name="rp_loss"][value="${rp.loss_tolerance}"]`);
        if (el) el.checked = true;
    }
    RP_SLIDER_IDS.forEach(id => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(id + '_val');
        if (el && rp[id.replace('rp_', '')]) {
            el.value = rp[id.replace('rp_', '')];
            if (valEl) valEl.textContent = el.value;
        }
    });
}

// ============================================================================
// State persistence
// ============================================================================
function saveState() {
    try {
        const data = {
            inputs: {},
            currentStep: state.currentStep,
            visitedSteps: Array.from(state.visitedSteps),
            formMode: state.formMode,
            skippedItems: Array.from(state.skippedItems),
            lead: state.lead,
            riskProfile: collectRiskProfile(),
            financialGoal: collectFinancialGoal()
        };
        ALL_INPUT_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el) data.inputs[id] = el.dataset.rawValue || el.value.replace(/[^0-9]/g, '') || '';
        });
        localStorage.setItem(STORAGE_KEY_CHK, JSON.stringify(data));
    } catch (e) { /* silent */ }
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_CHK);
        if (!raw) return;
        const data = JSON.parse(raw);

        // Restore numeric inputs
        ALL_INPUT_IDS.forEach(id => {
            const el = document.getElementById(id);
            if (el && data.inputs && data.inputs[id]) {
                el.value = data.inputs[id];
                formatNumberInput(el);
            }
        });

        // Restore lead info
        if (data.lead) {
            state.lead = data.lead;
            const nama = document.getElementById('lead-nama');
            const wa = document.getElementById('lead-wa');
            const email = document.getElementById('lead-email');
            if (nama) nama.value = data.lead.nama || '';
            if (wa) wa.value = data.lead.wa || '';
            if (email) email.value = data.lead.email || '';
        }

        // Restore step state
        if (data.visitedSteps) state.visitedSteps = new Set(data.visitedSteps);
        if (data.currentStep) {
            state.currentStep = Math.min(data.currentStep, TOTAL_STEPS);
        }

        // Restore Risk Profile (Step 4)
        if (data.riskProfile) {
            restoreRiskProfile(data.riskProfile);
        }

        // Restore Financial Goal (Step 6 Lead Capture)
        if (data.financialGoal) {
            restoreFinancialGoal(data.financialGoal);
        }

        // Restore Form Mode (single/couple)
        if (data.formMode) {
            setFormMode(data.formMode);
        }

        // Restore Skipped Items (asset items 11-16 yang klien tandain "belum punya")
        if (data.skippedItems) {
            restoreSkippedItems(data.skippedItems);
        }
    } catch (e) { /* silent */ }
}

// ============================================================================
// Number formatting (mirror education.js helper)
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
    const raw = el.dataset.rawValue || (el.value || '').replace(/[^0-9]/g, '');
    return parseFloat(raw) || 0;
}

function formatRp(num) {
    if (!num || isNaN(num)) return 'Rp 0';
    return 'Rp ' + Math.round(num).toLocaleString('id-ID');
}

function formatRpCompact(num) {
    // Compact format for display: 1.234.567 with thousands separator
    if (!num || isNaN(num)) return '—';
    return Math.round(num).toLocaleString('id-ID');
}

// ============================================================================
// Calculations
// ============================================================================
function sumItemsByCol(itemIds, col) {
    return itemIds.reduce((acc, item) => acc + getRawValue(`${item}_${col}`), 0);
}

function computeSubtotals() {
    const subs = {};
    Object.keys(ITEMS).forEach(section => {
        subs[section] = {};
        COLS.forEach(col => {
            subs[section][col] = sumItemsByCol(ITEMS[section], col);
        });
        subs[section].gabungan = COLS.reduce((acc, col) => acc + subs[section][col], 0);
    });
    return subs;
}

function computeTotals(subs) {
    return {
        pemasukan_bulanan: subs.pemasukan.gabungan,
        cicilan_bulanan: subs.cicilan.gabungan,
        pengeluaran_bulanan: subs.pengeluaran.gabungan,
        tabungan_bulanan: subs.tabungan.gabungan,
        aset_likuid: subs.likuid.gabungan,
        aset_investasi: subs.investasi.gabungan,
        aset_pribadi: subs.pribadi.gabungan,
        total_aset: subs.likuid.gabungan + subs.investasi.gabungan + subs.pribadi.gabungan,
        total_utang: subs.utang.gabungan
    };
}

function computeNetWorth(totals) {
    return totals.total_aset - totals.total_utang;
}

function computeRatios(totals, netWorth) {
    const expenseBase = totals.cicilan_bulanan + totals.pengeluaran_bulanan;
    return {
        danaDarurat: {
            value: expenseBase > 0 ? totals.aset_likuid / expenseBase : 0,
            unit: 'bulan',
            ideal: [3, 6],
            isGood: function() {
                return this.value >= 3;
            }
        },
        rasioTabungan: {
            value: totals.pemasukan_bulanan > 0 ? (totals.tabungan_bulanan / totals.pemasukan_bulanan) * 100 : 0,
            unit: '%',
            ideal: [10, null],
            isGood: function() {
                return this.value >= 10;
            }
        },
        investasiNW: {
            value: netWorth > 0 ? (totals.aset_investasi / netWorth) * 100 : 0,
            unit: '%',
            ideal: [50, null],
            isGood: function() {
                return this.value >= 50;
            }
        },
        cicilanUtang: {
            value: totals.pemasukan_bulanan > 0 ? (totals.cicilan_bulanan / totals.pemasukan_bulanan) * 100 : 0,
            unit: '%',
            ideal: [null, 35],
            isGood: function() {
                return this.value <= 35;
            }
        }
    };
}

// ============================================================================
// Render: subtotals, results, review
// ============================================================================
function renderSubtotal(id, value) {
    const el = document.getElementById(id);
    if (!el) return;
    if (value > 0) {
        el.classList.remove('empty');
        el.textContent = formatRpCompact(value);
    } else {
        el.classList.add('empty');
        el.textContent = '—';
    }
}

function renderAll() {
    const subs = computeSubtotals();

    // Render subtotals per section per column
    const sectionMap = {
        pemasukan: 'sub_pemasukan',
        cicilan: 'sub_cicilan',
        pengeluaran: 'sub_pengeluaran',
        tabungan: 'sub_tabungan',
        likuid: 'sub_likuid',
        investasi: 'sub_investasi',
        pribadi: 'sub_pribadi',
        utang: 'sub_utang'
    };
    Object.keys(sectionMap).forEach(section => {
        const prefix = sectionMap[section];
        COLS.forEach(col => {
            renderSubtotal(`${prefix}_${col}`, subs[section][col]);
        });
    });

    // Render Net Worth + Ratios on Step 4
    const totals = computeTotals(subs);
    const netWorth = computeNetWorth(totals);
    const ratios = computeRatios(totals, netWorth);

    // Net Worth Hero
    const nwValueEl = document.getElementById('nw-value');
    const nwFormulaEl = document.getElementById('nw-formula');
    if (nwValueEl) {
        nwValueEl.textContent = formatRp(netWorth);
    }
    if (nwFormulaEl) {
        nwFormulaEl.textContent = `${formatRp(totals.total_aset)} (Aset) − ${formatRp(totals.total_utang)} (Utang)`;
    }

    // Ratio cards
    setRatioCard('r1', ratios.danaDarurat.value.toFixed(1) + ' bulan', ratios.danaDarurat.isGood(), 'Ideal 3-6');
    setRatioCard('r2', ratios.rasioTabungan.value.toFixed(1) + ' %', ratios.rasioTabungan.isGood(), 'Ideal min 10%');
    setRatioCard('r3', ratios.investasiNW.value.toFixed(1) + ' %', ratios.investasiNW.isGood(), 'Ideal min 50%');
    setRatioCard('r4', ratios.cicilanUtang.value.toFixed(1) + ' %', ratios.cicilanUtang.isGood(), 'Ideal max 35%');

    // Render Step 4 review summary
    renderReviewSummary(totals, netWorth);
}

function setRatioCard(prefix, valueText, isGood, idealText) {
    const valueEl = document.getElementById(`${prefix}-value`);
    const statusEl = document.getElementById(`${prefix}-status`);
    if (valueEl) valueEl.textContent = valueText;
    if (statusEl) {
        const hasData = !valueText.startsWith('NaN') && !valueText.startsWith('—');
        if (hasData) {
            statusEl.style.display = 'inline-block';
            statusEl.textContent = isGood ? '✓ Ideal' : '✗ Kurang ideal';
            statusEl.className = 'r-status ' + (isGood ? 'good' : 'bad');
        } else {
            statusEl.style.display = 'none';
        }
    }
}

function renderReviewSummary(totals, netWorth) {
    const el = document.getElementById('review-summary');
    if (!el) return;

    const rows = [
        ['Pemasukan bulanan', totals.pemasukan_bulanan],
        ['Cicilan bulanan', totals.cicilan_bulanan],
        ['Pengeluaran hidup bulanan', totals.pengeluaran_bulanan],
        ['Tabungan bulanan', totals.tabungan_bulanan],
        ['Total aset likuid', totals.aset_likuid],
        ['Total aset investasi', totals.aset_investasi],
        ['Total aset pribadi', totals.aset_pribadi],
        ['Total aset (gabungan)', totals.total_aset],
        ['Total utang (gabungan)', totals.total_utang]
    ];

    el.innerHTML = rows.map(([label, val]) => `
        <div class="flex justify-between border-b border-gray-100 pb-1">
            <span class="text-gray-500">${label}</span>
            <span class="font-semibold tabular-nums">${formatRp(val)}</span>
        </div>
    `).join('');
}

// ============================================================================
// Wizard navigation
// ============================================================================
function showStep(n) {
    document.querySelectorAll('.wizard-step').forEach(el => el.classList.remove('active'));
    const stepEl = document.getElementById(`step-${n}`);
    if (stepEl) stepEl.classList.add('active');

    // Update progress UI
    const pct = Math.round((n / TOTAL_STEPS) * 100);
    const fill = document.getElementById('progress-fill');
    const label = document.getElementById('step-label');
    const pctEl = document.getElementById('step-pct');
    if (fill) fill.style.width = pct + '%';
    if (label) label.textContent = `Step ${n} of ${TOTAL_STEPS}`;
    if (pctEl) pctEl.textContent = pct + '%';

    // Update step dots
    document.querySelectorAll('.step-dot').forEach(dot => {
        const dotStep = parseInt(dot.dataset.step);
        dot.classList.remove('active', 'visited');
        if (dotStep === n) {
            dot.classList.add('active');
        } else if (state.visitedSteps.has(dotStep)) {
            dot.classList.add('visited');
        }
    });

    // Nav button state
    const backBtn = document.getElementById('btn-back');
    const nextBtn = document.getElementById('btn-next');
    const submitBtn = document.getElementById('btn-submit');
    if (backBtn) backBtn.disabled = (n === 1);
    if (n === TOTAL_STEPS) {
        if (nextBtn) nextBtn.style.display = 'none';
        if (submitBtn) submitBtn.style.display = 'block';
    } else {
        if (nextBtn) nextBtn.style.display = 'block';
        if (submitBtn) submitBtn.style.display = 'none';
    }

    // If step 5 (Review — moved from old step 4), re-render results
    if (n === 5) renderAll();

    // Scroll to top of form
    document.getElementById('checkup-form').scrollIntoView({ behavior: 'smooth', block: 'start' });

    state.currentStep = n;
    state.visitedSteps.add(n);
    saveState();
}

function nextStep() {
    if (!validateStep(state.currentStep)) return;
    if (state.currentStep < TOTAL_STEPS) {
        showStep(state.currentStep + 1);
    }
}

function prevStep() {
    if (state.currentStep > 1) {
        showStep(state.currentStep - 1);
    }
}

function goToStep(n) {
    if (n === state.currentStep) return;
    if (state.visitedSteps.has(n) || n < state.currentStep) {
        showStep(n);
        return;
    }
    // Forward to unvisited — validate current step first
    if (validateStep(state.currentStep)) {
        // Mark all intermediate steps visited so user can jump forward through them
        for (let i = state.currentStep; i <= n; i++) {
            state.visitedSteps.add(i);
        }
        showStep(n);
    }
}

function validateStep(n) {
    clearError();

    if (n === 6) {
        // Lead capture validation (was step 5 pre-Risk Profile)
        const nama = (document.getElementById('lead-nama').value || '').trim();
        const wa = (document.getElementById('lead-wa').value || '').trim();
        const email = (document.getElementById('lead-email').value || '').trim();
        if (!nama || nama.length < 2) { showError('Nama harus diisi.'); return false; }
        if (!wa || wa.replace(/[^0-9]/g, '').length < 8) { showError('Nomor WhatsApp harus diisi (minimal 8 digit).'); return false; }
        if (!email || !email.includes('@') || !email.includes('.')) { showError('Email harus diisi dengan format yang benar.'); return false; }
        return true;
    }

    if (n === 4) {
        // Risk Profile validation — Q1, Q2, Q3, Q4, Q6 required (Q5 sliders default = 1 OK)
        const rp = collectRiskProfile();
        if (!rp.usia || rp.usia < 17 || rp.usia > 80) {
            showError('Isi usia kamu (Q1) — angka antara 17-80.');
            return false;
        }
        if (!rp.experience || rp.experience.length === 0) {
            showError('Pilih minimal 1 instrumen investasi pengalaman kamu (Q2) — atau pilih "Belum pernah investasi".');
            return false;
        }
        if (!rp.drawdown) {
            showError('Pilih reaksi kamu kalau portfolio turun -25% (Q3).');
            return false;
        }
        if (!rp.time) {
            showError('Pilih estimasi waktu kamu untuk monitor investasi (Q4).');
            return false;
        }
        if (!rp.loss_tolerance) {
            showError('Pilih maksimum % kerugian yang masih bisa kamu hold (Q6).');
            return false;
        }
        return true;
    }

    // For data-entry steps (1-3): soft validation — at minimum some pemasukan needed before moving past step 1
    if (n === 1) {
        const pemasukan = sumItemsByCol(ITEMS.pemasukan, 'saya')
                        + sumItemsByCol(ITEMS.pemasukan, 'pasangan')
                        + sumItemsByCol(ITEMS.pemasukan, 'bersama');
        if (pemasukan === 0) {
            showError('Isi minimal angka pemasukan kamu — diperlukan untuk hitung rasio tabungan & rasio cicilan.');
            return false;
        }
    }
    return true;
}

function showError(msg) {
    const el = document.getElementById('step-error');
    if (el) {
        el.textContent = msg;
        el.classList.add('show');
    }
}

function clearError() {
    const el = document.getElementById('step-error');
    if (el) {
        el.classList.remove('show');
        el.textContent = '';
    }
}

// ============================================================================
// Submit
// ============================================================================
async function submitCheckup() {
    if (!validateStep(6)) return;

    // Collect all data
    const inputs = {};
    ALL_INPUT_IDS.forEach(id => { inputs[id] = getRawValue(id); });
    const subs = computeSubtotals();
    const totals = computeTotals(subs);
    const netWorth = computeNetWorth(totals);
    const ratios = computeRatios(totals, netWorth);

    // Collect Risk Profile (Step 4)
    const riskProfile = collectRiskProfile();

    state.lead = {
        nama: document.getElementById('lead-nama').value.trim(),
        wa: document.getElementById('lead-wa').value.trim(),
        email: document.getElementById('lead-email').value.trim()
    };
    state.riskProfile = riskProfile;
    saveState();

    const payload = {
        action: 'checkup_submit',
        lead: state.lead,
        inputs: inputs,
        subtotals: subs,
        totals: totals,
        net_worth: netWorth,
        ratios: {
            danaDarurat: ratios.danaDarurat.value,
            danaDaruratIdeal: ratios.danaDarurat.isGood(),
            rasioTabungan: ratios.rasioTabungan.value,
            rasioTabunganIdeal: ratios.rasioTabungan.isGood(),
            investasiNW: ratios.investasiNW.value,
            investasiNWIdeal: ratios.investasiNW.isGood(),
            cicilanUtang: ratios.cicilanUtang.value,
            cicilanUtangIdeal: ratios.cicilanUtang.isGood()
        },
        risk_profile: riskProfile,  // raw inputs — backend computes scores + label
        submitted_at: new Date().toISOString(),
        source: 'philipmulyana.com/financial-checkup'
    };

    // Disable submit button
    const submitBtn = document.getElementById('btn-submit');
    if (submitBtn) {
        submitBtn.disabled = true;
        submitBtn.textContent = '⏳ Sedang mengirim...';
    }

    try {
        const BACKEND_ENDPOINT = 'https://philip-mulyana--ai-website-builder-master-plan-checkup.modal.run';
        const response = await fetch(BACKEND_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        });

        if (!response.ok) {
            throw new Error(`Backend returned ${response.status}`);
        }

        // Success — show success state, hide form
        document.getElementById('checkup-form').style.display = 'none';
        document.querySelector('.progress-wrap').style.display = 'none';
        const successEl = document.getElementById('success-state');
        if (successEl) successEl.classList.add('show');

        // Clear stored state after successful submit (so klien yang isi ulang ga keep old data)
        try { localStorage.removeItem(STORAGE_KEY_CHK); } catch (e) {}

    } catch (err) {
        console.error('Submit failed:', err);
        showError('Maaf, sistem sedang ada gangguan. Coba lagi dalam beberapa menit, atau hubungi philip.mulyana@gmail.com langsung.');
        if (submitBtn) {
            submitBtn.disabled = false;
            submitBtn.textContent = '✉️ Kirim PDF ke Email Saya';
        }
    }
}

// ============================================================================
// Bootstrap
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Initialize formatted-number inputs
    document.querySelectorAll('.formatted-number').forEach(input => {
        input.addEventListener('input', () => {
            formatNumberInput(input);
            saveState();
            renderAll();
        });
        if (input.value) formatNumberInput(input);
    });

    // Lead capture input listeners
    ['lead-nama', 'lead-wa', 'lead-email'].forEach(id => {
        const el = document.getElementById(id);
        if (el) {
            el.addEventListener('input', () => {
                state.lead = {
                    nama: document.getElementById('lead-nama').value,
                    wa: document.getElementById('lead-wa').value,
                    email: document.getElementById('lead-email').value
                };
                saveState();
            });
        }
    });

    // Risk Profile Step 4 listeners
    const rpUsiaEl = document.getElementById('rp_usia');
    if (rpUsiaEl) rpUsiaEl.addEventListener('input', saveState);

    RP_EXP_IDS.forEach(id => {
        const el = document.getElementById(id);
        if (el) el.addEventListener('change', saveState);
    });

    document.querySelectorAll('input[name="rp_drawdown"], input[name="rp_time"], input[name="rp_loss"]').forEach(el => {
        el.addEventListener('change', saveState);
    });

    // Risk Profile sliders — update display value + save
    RP_SLIDER_IDS.forEach(id => {
        const el = document.getElementById(id);
        const valEl = document.getElementById(id + '_val');
        if (el) {
            el.addEventListener('input', () => {
                if (valEl) valEl.textContent = el.value;
                saveState();
            });
        }
    });

    // Restore prior state
    restoreState();

    // Initial render
    renderAll();
    showStep(state.currentStep);

    // Trigger fade-up
    setTimeout(() => {
        document.querySelectorAll('.fade-up').forEach(el => el.classList.add('animate-in'));
    }, 100);
});
