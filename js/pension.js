// ============================================================================
// Pension Plan Advisor Tool — Frontend (Simplified MVP v2)
// ----------------------------------------------------------------------------
// 6 sections, ~25 fields. Klien Risk Profile lookup + auto-fill.
// State persistent via localStorage. Submit stub for now.
// ============================================================================

const STORAGE_KEY_PEN = 'pension_state_v2';
const LOOKUP_ENDPOINT = 'https://philip-mulyana--ai-website-builder-master-plan-checkup.modal.run/pension-klien-lookup';

const state = {
    s1: {
        nama: '', usia: '', gender: '', target_retire: '',
        marital: '',
        pasangan_nama: '', pasangan_usia: '', pasangan_gender: '', pasangan_target_retire: '',
        anak: [],  // [{usia, mandiri_age}]
        domisili: '', lokasi_pensiun: 'same'
    },
    s2: {
        income_household: '', income_passive: '',
        expense_current: '', expense_target_pensiun: ''
    },
    s3: {
        dplk_aktif: '', dplk_nama: '', dplk_saldo: '',
        dppk_aktif: '', dppk_nama: '', dppk_estimasi: '',
        notes: ''
    },
    s4: {
        bpjs_klien: '', bpjs_pasangan: '',
        swasta_klien: '', swasta_pasangan: '',
        ci: '', medical_notes: ''
    },
    s5: {
        inflasi_umum: '3.0', inflasi_healthcare: '12.0',
        inflasi_lifestyle: '5.0', inflasi_sewa: '4.0',
        longevity_klien: '', longevity_pasangan: '',
        swr: '3.25'
    },
    s6: {
        notes: ''
    },
    risk_profile_inherited: null,
    lookup_email: ''
};

// ============================================================================
// Number formatting (Indonesian-style separator 1,000,000)
// ============================================================================
function formatNumberInput(input) {
    const raw = (input.value || '').replace(/[^0-9]/g, '');
    input.dataset.rawValue = raw;
    if (raw === '') { input.value = ''; return; }
    input.value = Number(raw).toLocaleString('en-US');
}

function getRawNumber(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    return el.dataset.rawValue || (el.value || '').replace(/[^0-9]/g, '') || '';
}

function setFormattedNumber(id, value) {
    const el = document.getElementById(id);
    if (!el || value == null || value === '') return;
    const raw = String(value).replace(/[^0-9]/g, '');
    el.dataset.rawValue = raw;
    el.value = raw === '' ? '' : Number(raw).toLocaleString('en-US');
}

// ============================================================================
// DOM helpers
// ============================================================================
function val(id) {
    const el = document.getElementById(id);
    if (!el) return '';
    // Formatted-number inputs: return raw digits
    if (el.classList && el.classList.contains('formatted-number')) {
        return el.dataset.rawValue || (el.value || '').replace(/[^0-9]/g, '') || '';
    }
    return el.value || '';
}
function setVal(id, v) {
    const el = document.getElementById(id);
    if (!el || v == null) return;
    // Formatted-number inputs: format on restore
    if (el.classList && el.classList.contains('formatted-number')) {
        setFormattedNumber(id, v);
        return;
    }
    el.value = v;
}
function radioVal(name) {
    const el = document.querySelector(`input[name="${name}"]:checked`);
    return el ? el.value : '';
}
function setRadio(name, v) {
    if (!v) return;
    const el = document.querySelector(`input[name="${name}"][value="${v}"]`);
    if (el) el.checked = true;
}

// ============================================================================
// State save/restore
// ============================================================================
function saveState() {
    try {
        state.s1.nama = val('s1_nama');
        state.s1.usia = val('s1_usia');
        state.s1.gender = radioVal('s1_gender');
        state.s1.target_retire = val('s1_target_retire');
        state.s1.marital = radioVal('s1_marital');
        state.s1.pasangan_nama = val('s1_pasangan_nama');
        state.s1.pasangan_usia = val('s1_pasangan_usia');
        state.s1.pasangan_gender = radioVal('s1_pasangan_gender');
        state.s1.pasangan_target_retire = val('s1_pasangan_target_retire');
        state.s1.anak = collectAnakRows();
        state.s1.domisili = val('s1_domisili');
        state.s1.lokasi_pensiun = val('s1_lokasi_pensiun');

        state.s2.income_household = val('s2_income_household');
        state.s2.income_passive = val('s2_income_passive');
        state.s2.expense_current = val('s2_expense_current');
        state.s2.expense_target_pensiun = val('s2_expense_target_pensiun');

        state.s3.dplk_aktif = radioVal('s3_dplk_aktif');
        state.s3.dplk_nama = val('s3_dplk_nama');
        state.s3.dplk_saldo = val('s3_dplk_saldo');
        state.s3.dppk_aktif = radioVal('s3_dppk_aktif');
        state.s3.dppk_nama = val('s3_dppk_nama');
        state.s3.dppk_estimasi = val('s3_dppk_estimasi');
        state.s3.notes = val('s3_notes');

        state.s4.bpjs_klien = radioVal('s4_bpjs_klien');
        state.s4.bpjs_pasangan = radioVal('s4_bpjs_pasangan');
        state.s4.swasta_klien = val('s4_swasta_klien');
        state.s4.swasta_pasangan = val('s4_swasta_pasangan');
        state.s4.ci = val('s4_ci');
        state.s4.medical_notes = val('s4_medical_notes');

        state.s5.inflasi_umum = val('s5_inflasi_umum');
        state.s5.inflasi_healthcare = val('s5_inflasi_healthcare');
        state.s5.inflasi_lifestyle = val('s5_inflasi_lifestyle');
        state.s5.inflasi_sewa = val('s5_inflasi_sewa');
        state.s5.longevity_klien = val('s5_longevity_klien');
        state.s5.longevity_pasangan = val('s5_longevity_pasangan');
        state.s5.swr = val('s5_swr');

        state.s6.notes = val('s6_notes');

        state.lookup_email = val('klien_lookup_email');

        localStorage.setItem(STORAGE_KEY_PEN, JSON.stringify(state));
        showSaveStatus('saved', '✓ Saved');
    } catch (e) {
        console.error('Save failed:', e);
    }
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PEN);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.assign(state, data);

        if (state.s1) {
            setVal('s1_nama', state.s1.nama);
            setVal('s1_usia', state.s1.usia);
            setRadio('s1_gender', state.s1.gender);
            setVal('s1_target_retire', state.s1.target_retire);
            setRadio('s1_marital', state.s1.marital);
            setVal('s1_pasangan_nama', state.s1.pasangan_nama);
            setVal('s1_pasangan_usia', state.s1.pasangan_usia);
            setRadio('s1_pasangan_gender', state.s1.pasangan_gender);
            setVal('s1_pasangan_target_retire', state.s1.pasangan_target_retire);
            setVal('s1_domisili', state.s1.domisili);
            setVal('s1_lokasi_pensiun', state.s1.lokasi_pensiun || 'same');
            if (Array.isArray(state.s1.anak)) {
                state.s1.anak.forEach(a => addAnak(a));
            }
        }

        if (state.s2) {
            Object.entries(state.s2).forEach(([k, v]) => setVal('s2_' + k, v));
        }
        if (state.s3) {
            setRadio('s3_dplk_aktif', state.s3.dplk_aktif);
            setVal('s3_dplk_nama', state.s3.dplk_nama);
            setVal('s3_dplk_saldo', state.s3.dplk_saldo);
            setRadio('s3_dppk_aktif', state.s3.dppk_aktif);
            setVal('s3_dppk_nama', state.s3.dppk_nama);
            setVal('s3_dppk_estimasi', state.s3.dppk_estimasi);
            setVal('s3_notes', state.s3.notes);
        }
        if (state.s4) {
            setRadio('s4_bpjs_klien', state.s4.bpjs_klien);
            setRadio('s4_bpjs_pasangan', state.s4.bpjs_pasangan);
            setVal('s4_swasta_klien', state.s4.swasta_klien);
            setVal('s4_swasta_pasangan', state.s4.swasta_pasangan);
            setVal('s4_ci', state.s4.ci);
            setVal('s4_medical_notes', state.s4.medical_notes);
        }
        if (state.s5) {
            Object.entries(state.s5).forEach(([k, v]) => setVal('s5_' + k, v));
        }
        if (state.s6) {
            setVal('s6_notes', state.s6.notes);
        }

        setVal('klien_lookup_email', state.lookup_email);

        refreshConditionals();
    } catch (e) {
        console.error('Restore failed:', e);
    }
}

// ============================================================================
// Anak dynamic rows
// ============================================================================
let _anakCounter = 0;
function addAnak(prefill) {
    _anakCounter++;
    const list = document.getElementById('anak_list');
    if (!list) return;
    const row = document.createElement('div');
    row.className = 'anak-row';
    row.innerHTML = `
        <div>
            <label>Usia anak</label>
            <input type="number" data-anak-field="usia" min="0" max="30" placeholder="contoh: 8" value="${prefill?.usia || ''}">
        </div>
        <div>
            <label>Mandiri usia (default 24)</label>
            <input type="number" data-anak-field="mandiri_age" min="18" max="30" value="${prefill?.mandiri_age || 24}">
        </div>
        <button type="button" class="anak-remove" onclick="this.closest('.anak-row').remove(); saveState();">✕</button>
    `;
    list.appendChild(row);
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveState);
    });
}

function collectAnakRows() {
    return Array.from(document.querySelectorAll('#anak_list .anak-row')).map(row => {
        const fields = {};
        row.querySelectorAll('[data-anak-field]').forEach(input => {
            fields[input.dataset.anakField] = input.value || '';
        });
        return fields;
    }).filter(a => a.usia);
}

// ============================================================================
// Conditional render
// ============================================================================
function refreshConditionals() {
    const isMarried = radioVal('s1_marital') === 'married';
    toggleConditional('s1_pasangan_wrap', isMarried);
    toggleConditional('s4_bpjs_pasangan_wrap', isMarried);
    toggleConditional('s4_swasta_pasangan_wrap', isMarried);
    toggleConditional('s5_longevity_pasangan_wrap', isMarried);

    // S3 DPLK / DPPK conditional detail wraps
    toggleConditional('s3_dplk_detail_wrap', radioVal('s3_dplk_aktif') === 'yes');
    toggleConditional('s3_dppk_detail_wrap', radioVal('s3_dppk_aktif') === 'yes');

    // Auto-suggest longevity placeholders based on gender
    const g = radioVal('s1_gender');
    const lp = document.getElementById('s5_longevity_klien');
    if (lp && !lp.value) {
        lp.placeholder = g === 'F' ? 'default 88 (Perempuan)' : g === 'M' ? 'default 85 (Laki-laki)' : 'default M=85, F=88';
    }
    const gPas = radioVal('s1_pasangan_gender');
    const lpPas = document.getElementById('s5_longevity_pasangan');
    if (lpPas && !lpPas.value) {
        lpPas.placeholder = gPas === 'F' ? 'default 88' : gPas === 'M' ? 'default 85' : 'default M=85, F=88';
    }
}

function toggleConditional(id, show) {
    const el = document.getElementById(id);
    if (el) el.classList.toggle('show', show);
}

// ============================================================================
// Klien Risk Profile lookup
// ============================================================================
function fmtRp(n) {
    if (!n || isNaN(n)) return 'Rp 0';
    return 'Rp ' + Math.round(n).toLocaleString('id-ID');
}

async function lookupKlien() {
    const email = val('klien_lookup_email').trim();
    const resultEl = document.getElementById('klien_lookup_result');
    if (!resultEl) return;

    if (!email || !email.includes('@')) {
        resultEl.className = 'lookup-result show notfound';
        resultEl.innerHTML = '<h4>⚠️ Email invalid</h4><p>Masukkan email klien yang valid.</p>';
        return;
    }

    resultEl.className = 'lookup-result show';
    resultEl.innerHTML = '<h4>⏳ Querying Financial Checkup database...</h4>';

    try {
        const resp = await fetch(LOOKUP_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email})
        });
        const data = await resp.json();
        state.lookup_email = email;

        if (!data.found) {
            resultEl.className = 'lookup-result show notfound';
            resultEl.innerHTML = `<h4>🟡 Tidak ditemukan</h4><p style="font-size:0.75rem;color:#92400e;">${data.message || 'Klien belum isi Financial Checkup.'}</p>`;
            state.risk_profile_inherited = null;
            saveState();
            return;
        }

        const k = data.klien || {};
        const fs = data.financial_snapshot || {};
        const rp = data.risk_profile;

        // Risk Profile section
        let rpSection = '';
        if (data.has_risk_profile && rp) {
            const label = rp.profile_label || '';
            let bgColor = '#f0fdf4', borderColor = '#10b981', textColor = '#065f46';
            if (label.includes('SKILL GAP')) {
                bgColor = '#fef2f2'; borderColor = '#dc2626'; textColor = '#991b1b';
            } else if (label.includes('Aggressive')) {
                bgColor = '#eff6ff'; borderColor = '#3b82f6'; textColor = '#1e40af';
            } else if (label.includes('Moderate')) {
                bgColor = '#fefce8'; borderColor = '#eab308'; textColor = '#854d0e';
            }

            const exp = rp.explanation || {};
            const renderReasons = (arr) => (arr || []).map(r => `<li style="margin-left:1rem;">${r}</li>`).join('');
            const bar = (score) => {
                const pct = Math.max(0, Math.min(100, score));
                return `<div style="display:flex;align-items:center;gap:0.5rem;">
                    <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${borderColor};"></div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:700;color:${textColor};min-width:2.5rem;text-align:right;">${pct}/100</span>
                </div>`;
            };

            rpSection = `
                <div style="margin-top:1rem;padding:1rem 1.125rem;border-radius:0.75rem;background:${bgColor};border:2px solid ${borderColor};">
                    <div style="font-size:0.625rem;font-weight:700;color:${textColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.375rem;">🧠 Profil Risiko (dari Financial Checkup)</div>
                    <div style="font-size:1.5rem;font-weight:900;color:${textColor};letter-spacing:-0.02em;line-height:1.2;margin-bottom:0.875rem;">${label}</div>
                    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:0.875rem;padding:0.625rem 0.875rem;background:rgba(255,255,255,0.6);border-radius:0.5rem;">
                        <div><div style="font-size:0.6875rem;color:${textColor};font-weight:600;margin-bottom:0.125rem;">Kapasitas (kemampuan finansial)</div>${bar(rp.capacity_score)}</div>
                        <div><div style="font-size:0.6875rem;color:${textColor};font-weight:600;margin-bottom:0.125rem;">Skill & Waktu (untuk investasi)</div>${bar(rp.skill_time_score)}</div>
                        <div><div style="font-size:0.6875rem;color:${textColor};font-weight:600;margin-bottom:0.125rem;">Toleransi (tahan banting psikologis)</div>${bar(rp.tolerance_score)}</div>
                    </div>
                    ${exp.what_it_means ? `<div style="padding:0.75rem 0.875rem;background:rgba(255,255,255,0.8);border-radius:0.5rem;font-size:0.8125rem;color:${textColor};border:1px solid ${borderColor};margin-bottom:0.75rem;line-height:1.55;">${exp.what_it_means.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}</div>` : ''}
                    <details style="font-size:0.75rem;color:${textColor};">
                        <summary style="cursor:pointer;font-weight:700;padding:0.375rem 0;user-select:none;">📋 Kenapa profile ini? (berdasarkan jawaban klien)</summary>
                        <div style="margin-top:0.5rem;padding:0.625rem 0.875rem;background:rgba(255,255,255,0.6);border-radius:0.5rem;">
                            <div style="font-weight:700;margin-bottom:0.25rem;">📊 Skor Kapasitas (${rp.capacity_score}/100) dihitung dari:</div>
                            <ul style="margin:0;padding:0;list-style:disc;list-style-position:inside;">${renderReasons(exp.capacity_reasons)}</ul>
                            <div style="font-weight:700;margin:0.625rem 0 0.25rem;">⚙️ Skor Skill & Waktu (${rp.skill_time_score}/100) dihitung dari:</div>
                            <ul style="margin:0;padding:0;list-style:disc;list-style-position:inside;">${renderReasons(exp.skill_time_reasons)}</ul>
                            <div style="font-weight:700;margin:0.625rem 0 0.25rem;">💓 Skor Toleransi (${rp.tolerance_score}/100) dihitung dari:</div>
                            <ul style="margin:0;padding:0;list-style:disc;list-style-position:inside;">${renderReasons(exp.tolerance_reasons)}</ul>
                        </div>
                    </details>
                </div>
            `;
            state.risk_profile_inherited = rp;

            // Auto-fill usia from Risk Profile raw_inputs
            try {
                const raw = JSON.parse(rp.raw_json || '{}');
                const usia = raw?.raw_inputs?.usia;
                if (usia) {
                    const usiaEl = document.getElementById('s1_usia');
                    if (usiaEl && !usiaEl.value) {
                        usiaEl.value = usia;
                        showAutoFillBadge('autofill_usia');
                    }
                }
            } catch (e) { /* silent */ }
        } else {
            rpSection = `<div style="margin-top:1rem;padding:1rem 1.125rem;border-radius:0.75rem;background:#fef3c7;border:2px solid #f59e0b;">
                <div style="font-size:0.625rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.375rem;">⚠️ Risk Profile Belum Ada</div>
                <div style="font-size:1rem;font-weight:800;color:#92400e;margin-bottom:0.5rem;">Klien belum punya Profil Risiko</div>
                <div style="font-size:0.8125rem;color:#78350f;">${data.message || 'Minta klien re-submit Financial Checkup di philipmulyana.com/financial-checkup.html'}</div>
            </div>`;
            state.risk_profile_inherited = null;
        }

        const fsSection = `
            <div style="margin-top:0.875rem;padding-top:0.875rem;border-top:1px solid #d1fae5;">
                <div style="font-size:0.75rem;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem;">💰 Financial Snapshot</div>
                <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.375rem 1rem;font-size:0.75rem;">
                    <div><span style="color:#6b7280;">Net Worth:</span> <strong>${fmtRp(fs.net_worth)}</strong></div>
                    <div><span style="color:#6b7280;">Tabungan/bln:</span> <strong>${fmtRp(fs.tabungan_bulanan)}</strong></div>
                    <div><span style="color:#6b7280;">Total Aset:</span> ${fmtRp(fs.total_aset)}</div>
                    <div><span style="color:#6b7280;">Pemasukan/bln:</span> ${fmtRp(fs.pemasukan_bulanan)}</div>
                    <div><span style="color:#6b7280;">Total Utang:</span> ${fmtRp(fs.total_utang)}</div>
                    <div><span style="color:#6b7280;">Pengeluaran/bln:</span> ${fmtRp(fs.pengeluaran_bulanan)}</div>
                </div>
            </div>
        `;

        resultEl.className = 'lookup-result show found';
        resultEl.innerHTML = `
            <h4>✅ Klien ditemukan: <strong>${k.nama || '(no name)'}</strong></h4>
            <div style="font-size:0.75rem;color:#6b7280;">${k.wa || ''} · Submitted ${(k.submitted_at || '').slice(0, 10)}</div>
            ${rpSection}
            ${fsSection}
            <div style="margin-top:0.875rem;padding-top:0.875rem;border-top:1px solid #d1fae5;font-size:0.75rem;color:#065f46;">
                💡 Field Section 1 yang bisa di-auto-fill sudah di-apply.
            </div>
        `;

        // Auto-fill nama klien
        if (k.nama) {
            const namaEl = document.getElementById('s1_nama');
            if (namaEl && !namaEl.value.trim()) {
                namaEl.value = k.nama;
                showAutoFillBadge('autofill_nama');
            }
        }

        // Auto-fill cashflow + asset dari Financial Snapshot (using formatted-number setter)
        if (fs.pemasukan_bulanan && !val('s2_income_household')) {
            setFormattedNumber('s2_income_household', Math.round(fs.pemasukan_bulanan));
            showAutoFillBadge('autofill_income');
        }
        if (fs.pengeluaran_bulanan && !val('s2_expense_current')) {
            setFormattedNumber('s2_expense_current', Math.round(fs.pengeluaran_bulanan));
            showAutoFillBadge('autofill_expense');
        }
        // Property + Liquid auto-fill removed — Section 3 sekarang = DPLK/DPPK existence check

        saveState();
    } catch (e) {
        console.error('Lookup failed:', e);
        resultEl.className = 'lookup-result show notfound';
        resultEl.innerHTML = `<h4>✗ Lookup failed</h4><p style="font-size:0.75rem;">${e.message || 'Cek koneksi.'}</p>`;
    }
}

function showAutoFillBadge(badgeId) {
    const el = document.getElementById(badgeId);
    if (el) {
        el.style.display = 'inline';
        setTimeout(() => { if (el) el.style.opacity = '0.5'; }, 5000);
    }
}

// ============================================================================
// Save indicator
// ============================================================================
let _saveTimeout = null;
function showSaveStatus(s, text) {
    const ind = document.getElementById('save-indicator');
    const txt = document.getElementById('save-text');
    if (!ind || !txt) return;
    ind.className = 'save-indicator ' + s;
    txt.textContent = text;
    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        txt.textContent = 'Auto-save ready';
        ind.className = 'save-indicator';
    }, 2500);
}

// ============================================================================
// Submit stub
// ============================================================================
function submitPension() {
    saveState();
    const payload = {
        action: 'pension_plan_draft',
        ...state,
        timestamp: new Date().toISOString(),
        stage: 'MVP-v2'
    };
    console.log('[pension] Draft payload:', payload);
    alert('✅ Draft saved to localStorage.\n\nBackend handler + PDF generator akan ship di Stage 3.\n\nPayload logged ke browser console.');
}

// ============================================================================
// Bootstrap
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    restoreState();

    // Initialize formatted-number inputs (saat restore selesai)
    document.querySelectorAll('.formatted-number').forEach(input => {
        if (input.value) formatNumberInput(input);
        input.addEventListener('input', () => {
            formatNumberInput(input);
            saveState();
            refreshConditionals();
        });
    });

    document.querySelectorAll('#pension-form input:not(.formatted-number), #pension-form select, #pension-form textarea').forEach(el => {
        const evt = (el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox') ? 'change' : 'input';
        el.addEventListener(evt, () => {
            saveState();
            refreshConditionals();
        });
    });

    refreshConditionals();

    setTimeout(() => {
        document.querySelectorAll('.fade-up').forEach(el => el.classList.add('animate-in'));
    }, 100);
});
