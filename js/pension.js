// ============================================================================
// Pension Plan Advisor Tool — Frontend
// ----------------------------------------------------------------------------
// Stage 2 BATCH 1 build. F1 Identity & Household active.
// F2-F11 placeholder, to be built progressively in next sessions.
// State persistent via localStorage. Submit stub for now.
// ============================================================================

const STORAGE_KEY_PEN = 'pension_state_v1';

const state = {
    f1: {
        nama_pemegang: '',
        gender_pemegang: '',
        dob_pemegang: '',
        domisili_kota: '',
        domisili_other: '',
        anchor_pensiun_usia: '',
        anchor_lokasi_same: 'true',
        anchor_lokasi_kota: '',
        marital: '',
        pasangan_nama: '',
        gender_pasangan: '',
        dob_pasangan: '',
        anchor_pensiun_usia_pasangan: '',
        perjanjian_kawin: 'none',
        anak: [],  // array of {nama, dob, expected_mandiri_age}
        dependents_lain: ''
    },
    risk_profile_inherited: null,  // from Financial Checkup lookup
    lookup_email: ''
};

// ============================================================================
// State persistence
// ============================================================================
function saveState() {
    try {
        // Collect F1 from DOM
        state.f1.nama_pemegang = val('f1_nama_pemegang');
        state.f1.gender_pemegang = radioVal('f1_gender_pemegang');
        state.f1.dob_pemegang = val('f1_dob_pemegang');
        state.f1.domisili_kota = val('f1_domisili_kota');
        state.f1.domisili_other = val('f1_domisili_other');
        state.f1.anchor_pensiun_usia = val('f1_anchor_pensiun_usia');
        state.f1.anchor_lokasi_same = radioVal('f1_anchor_lokasi_same') || 'true';
        state.f1.anchor_lokasi_kota = val('f1_anchor_lokasi_kota');
        state.f1.marital = radioVal('f1_marital');
        state.f1.pasangan_nama = val('f1_pasangan_nama');
        state.f1.gender_pasangan = radioVal('f1_gender_pasangan');
        state.f1.dob_pasangan = val('f1_dob_pasangan');
        state.f1.anchor_pensiun_usia_pasangan = val('f1_anchor_pensiun_usia_pasangan');
        state.f1.perjanjian_kawin = val('f1_perjanjian_kawin') || 'none';
        state.f1.dependents_lain = val('f1_dependents_lain');
        state.f1.anak = collectAnakRows();
        state.lookup_email = val('klien_lookup_email');

        localStorage.setItem(STORAGE_KEY_PEN, JSON.stringify(state));
        showSaveStatus('saved', '✓ Saved');
    } catch (e) {
        console.error('Save failed:', e);
        showSaveStatus('error', '✗ Save error');
    }
}

function restoreState() {
    try {
        const raw = localStorage.getItem(STORAGE_KEY_PEN);
        if (!raw) return;
        const data = JSON.parse(raw);
        Object.assign(state, data);

        // Restore F1 DOM
        if (state.f1) {
            setVal('f1_nama_pemegang', state.f1.nama_pemegang);
            setRadio('f1_gender_pemegang', state.f1.gender_pemegang);
            setVal('f1_dob_pemegang', state.f1.dob_pemegang);
            setVal('f1_domisili_kota', state.f1.domisili_kota);
            setVal('f1_domisili_other', state.f1.domisili_other);
            setVal('f1_anchor_pensiun_usia', state.f1.anchor_pensiun_usia);
            setRadio('f1_anchor_lokasi_same', state.f1.anchor_lokasi_same || 'true');
            setVal('f1_anchor_lokasi_kota', state.f1.anchor_lokasi_kota);
            setRadio('f1_marital', state.f1.marital);
            setVal('f1_pasangan_nama', state.f1.pasangan_nama);
            setRadio('f1_gender_pasangan', state.f1.gender_pasangan);
            setVal('f1_dob_pasangan', state.f1.dob_pasangan);
            setVal('f1_anchor_pensiun_usia_pasangan', state.f1.anchor_pensiun_usia_pasangan);
            setVal('f1_perjanjian_kawin', state.f1.perjanjian_kawin);
            setVal('f1_dependents_lain', state.f1.dependents_lain);

            // Restore anak rows
            if (Array.isArray(state.f1.anak)) {
                state.f1.anak.forEach(anak => addAnak(anak));
            }
        }

        setVal('klien_lookup_email', state.lookup_email);

        // Re-evaluate conditional rendering
        refreshConditionals();
    } catch (e) {
        console.error('Restore failed:', e);
    }
}

// ============================================================================
// DOM helpers
// ============================================================================
function val(id) {
    const el = document.getElementById(id);
    return el ? (el.value || '') : '';
}

function setVal(id, v) {
    const el = document.getElementById(id);
    if (el && v != null) el.value = v;
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
// Conditional render
// ============================================================================
function refreshConditionals() {
    // Domisili "Other" wrap
    toggleConditional('f1_domisili_other_wrap', val('f1_domisili_kota') === 'other');

    // Anchor lokasi kota wrap (if not same)
    toggleConditional('f1_anchor_lokasi_kota_wrap', radioVal('f1_anchor_lokasi_same') === 'false');

    // Married fields wrap
    toggleConditional('f1_married_wrap', radioVal('f1_marital') === 'married');

    // Update F1 status pill
    updateLayerStatus('f1', validateF1Soft());
}

function toggleConditional(id, show) {
    const el = document.getElementById(id);
    if (!el) return;
    el.classList.toggle('show', show);
}

// ============================================================================
// Anak dynamic rows
// ============================================================================
let _anakCounter = 0;
function addAnak(prefill) {
    _anakCounter++;
    const idx = _anakCounter;
    const list = document.getElementById('anak_list');
    if (!list) return;

    const row = document.createElement('div');
    row.className = 'anak-row';
    row.dataset.anakIdx = idx;
    row.innerHTML = `
        <div>
            <label>Nama anak</label>
            <input type="text" data-anak-field="nama" placeholder="contoh: Aira" value="${prefill?.nama || ''}">
        </div>
        <div>
            <label>Tanggal lahir</label>
            <input type="date" data-anak-field="dob" value="${prefill?.dob || ''}">
        </div>
        <div>
            <label>Mandiri usia</label>
            <input type="number" data-anak-field="expected_mandiri_age" min="18" max="30" value="${prefill?.expected_mandiri_age || 24}">
        </div>
        <button type="button" class="anak-remove" onclick="this.closest('.anak-row').remove(); saveState();">✕</button>
    `;
    list.appendChild(row);

    // Attach listeners
    row.querySelectorAll('input').forEach(input => {
        input.addEventListener('input', saveState);
    });
}

function collectAnakRows() {
    const rows = document.querySelectorAll('#anak_list .anak-row');
    return Array.from(rows).map(row => {
        const fields = {};
        row.querySelectorAll('[data-anak-field]').forEach(input => {
            const k = input.dataset.anakField;
            fields[k] = input.value || '';
        });
        return fields;
    }).filter(a => a.nama || a.dob);  // skip empty rows
}

// ============================================================================
// Validation (soft — shows status pill, doesn't block)
// ============================================================================
function validateF1Soft() {
    const required = [
        state.f1.nama_pemegang,
        state.f1.gender_pemegang,
        state.f1.dob_pemegang,
        state.f1.domisili_kota,
        state.f1.anchor_pensiun_usia,
        state.f1.marital
    ];

    if (state.f1.marital === 'married') {
        required.push(state.f1.pasangan_nama, state.f1.gender_pasangan, state.f1.dob_pasangan);
    }
    if (state.f1.domisili_kota === 'other') {
        required.push(state.f1.domisili_other);
    }

    const filled = required.filter(v => v && v.toString().trim().length > 0).length;
    return filled === required.length;
}

function updateLayerStatus(layerId, isComplete) {
    const el = document.getElementById(`status-${layerId}`);
    if (!el) return;
    if (isComplete) {
        el.textContent = '✓ Complete';
        el.className = 'layer-status complete';
    } else {
        el.textContent = 'Pending';
        el.className = 'layer-status pending';
    }
}

// ============================================================================
// Klien Risk Profile lookup (from Financial Checkup)
// ============================================================================
const LOOKUP_ENDPOINT = 'https://philip-mulyana--ai-website-builder-master-plan-checkup.modal.run/pension-klien-lookup';

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
        resultEl.innerHTML = '<h4>⚠️ Email invalid</h4><p>Masukkan email klien yang valid (format: nama@domain.com).</p>';
        return;
    }

    resultEl.className = 'lookup-result show';
    resultEl.innerHTML = '<h4>⏳ Querying Financial Checkup database...</h4>';

    try {
        const resp = await fetch(LOOKUP_ENDPOINT, {
            method: 'POST',
            headers: {'Content-Type': 'application/json'},
            body: JSON.stringify({email: email})
        });

        const data = await resp.json();
        state.lookup_email = email;

        if (!data.found) {
            resultEl.className = 'lookup-result show notfound';
            resultEl.innerHTML = `
                <h4>🟡 Tidak ditemukan</h4>
                <p style="font-size:0.75rem;color:#92400e;">${data.message || data.error || 'Klien belum isi Financial Checkup.'}</p>
            `;
            state.risk_profile_inherited = null;
            saveState();
            return;
        }

        // Found
        const k = data.klien || {};
        const fs = data.financial_snapshot || {};
        const rp = data.risk_profile;

        let rpSection = '';
        if (data.has_risk_profile && rp) {
            rpSection = `
                <div style="margin-top:0.875rem;padding-top:0.875rem;border-top:1px solid #d1fae5;">
                    <div style="font-size:0.75rem;font-weight:700;color:#065f46;text-transform:uppercase;letter-spacing:0.08em;margin-bottom:0.5rem;">🧠 Risk Profile (inherited)</div>
                    <div style="font-size:0.8125rem;line-height:1.6;">
                        <div><strong>${rp.profile_label}</strong></div>
                        <div style="color:#374151;margin-top:0.25rem;">
                            Capacity ${rp.capacity_score}/100 ·
                            Skill+Time ${rp.skill_time_score}/100 ·
                            Tolerance ${rp.tolerance_score}/100
                        </div>
                        <div style="margin-top:0.5rem;padding:0.5rem 0.625rem;background:#f0fdf4;border-radius:0.375rem;font-size:0.75rem;color:#065f46;">
                            <strong>Sale direction:</strong> ${rp.sale_direction}
                        </div>
                    </div>
                </div>
            `;
            state.risk_profile_inherited = rp;
        } else {
            rpSection = `
                <div style="margin-top:0.875rem;padding-top:0.875rem;border-top:1px solid #fcd34d;font-size:0.75rem;color:#92400e;">
                    ⚠️ ${data.message || 'Financial Checkup ada tapi belum ada Risk Profile data — klien re-submit kalau perlu.'}
                </div>
            `;
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
                <div style="display:grid;grid-template-columns:repeat(4,1fr);gap:0.25rem;margin-top:0.5rem;font-size:0.6875rem;">
                    <div style="padding:0.25rem 0.375rem;background:#f9fafb;border-radius:0.25rem;text-align:center;">
                        DD: ${(fs.rasio_dana_darurat || 0).toFixed(1)}bln
                    </div>
                    <div style="padding:0.25rem 0.375rem;background:#f9fafb;border-radius:0.25rem;text-align:center;">
                        Tab: ${(fs.rasio_tabungan_pct || 0).toFixed(0)}%
                    </div>
                    <div style="padding:0.25rem 0.375rem;background:#f9fafb;border-radius:0.25rem;text-align:center;">
                        Inv/NW: ${(fs.rasio_investasi_nw_pct || 0).toFixed(0)}%
                    </div>
                    <div style="padding:0.25rem 0.375rem;background:#f9fafb;border-radius:0.25rem;text-align:center;">
                        Cicilan: ${(fs.rasio_cicilan_pct || 0).toFixed(0)}%
                    </div>
                </div>
            </div>
        `;

        resultEl.className = 'lookup-result show found';
        resultEl.innerHTML = `
            <h4>✅ Klien ditemukan: <strong>${k.nama || '(no name)'}</strong></h4>
            <div style="font-size:0.75rem;color:#6b7280;">
                ${k.wa || '(no WA)'} · Submitted ${(k.submitted_at || '').slice(0, 10)}
            </div>
            ${rpSection}
            ${fsSection}
            <div style="margin-top:0.875rem;padding-top:0.875rem;border-top:1px solid #d1fae5;font-size:0.75rem;color:#065f46;">
                💡 Field F1 yang bisa di-auto-fill sudah di-apply ke form di bawah.
            </div>
        `;

        // ====================================================================
        // Auto-fill F1 fields dari lookup data
        // ====================================================================
        autoFillF1FromLookup(k, rp);

        saveState();
    } catch (e) {
        console.error('Lookup failed:', e);
        resultEl.className = 'lookup-result show notfound';
        resultEl.innerHTML = `<h4>✗ Lookup failed</h4><p style="font-size:0.75rem;">${e.message || 'Cek koneksi atau coba lagi.'}</p>`;
    }
}

// ============================================================================
// Auto-fill F1 fields dari Risk Profile lookup
// ============================================================================
function autoFillF1FromLookup(klien, riskProfile) {
    // Fill nama klien (from Financial Checkup nama)
    if (klien && klien.nama) {
        const namaEl = document.getElementById('f1_nama_pemegang');
        if (namaEl && !namaEl.value.trim()) {  // only fill kalau kosong
            namaEl.value = klien.nama;
            showAutoFillBadge('autofill_nama');
        } else if (namaEl && namaEl.value.trim() !== klien.nama) {
            // Show note kalau ada conflict (Philip already filled different name)
            console.log(`[pension] Nama klien from lookup (${klien.nama}) ≠ existing F1 nama (${namaEl.value}). Not overriding.`);
        }
    }

    // Show usia from Risk Profile as DOB reference hint
    if (riskProfile && riskProfile.raw_json) {
        try {
            const raw = JSON.parse(riskProfile.raw_json);
            const usia = raw?.raw_inputs?.usia;
            if (usia) {
                const hintEl = document.getElementById('usia_hint_rp');
                if (hintEl) {
                    hintEl.textContent = `Usia dari Risk Profile: ${usia} thn`;
                    hintEl.style.display = 'inline';
                }
            }
        } catch (e) { /* silent */ }
    }
}

function showAutoFillBadge(badgeId) {
    const el = document.getElementById(badgeId);
    if (el) {
        el.style.display = 'inline';
        // Fade after 5 seconds
        setTimeout(() => {
            if (el) el.style.opacity = '0.5';
        }, 5000);
    }
}

// ============================================================================
// Save status indicator
// ============================================================================
let _saveTimeout = null;
function showSaveStatus(state, text) {
    const ind = document.getElementById('save-indicator');
    const txt = document.getElementById('save-text');
    if (!ind || !txt) return;

    ind.className = 'save-indicator ' + state;
    txt.textContent = text;

    if (_saveTimeout) clearTimeout(_saveTimeout);
    _saveTimeout = setTimeout(() => {
        txt.textContent = 'Auto-save ready';
        ind.className = 'save-indicator';
    }, 2500);
}

// ============================================================================
// Submit stub (Stage 2 Batch 1 — no backend yet)
// ============================================================================
function submitPension() {
    saveState();

    if (!validateF1Soft()) {
        alert('F1 (Identity & Household) belum lengkap.\n\nFill required fields:\n- Nama pemegang\n- Gender\n- DOB\n- Domisili kota\n- Anchor usia pensiun\n- Marital status\n(+ pasangan fields kalau married)');
        return;
    }

    // Build payload preview (Stage 2 Batch 1 — local preview only)
    const payload = {
        action: 'pension_plan_draft',
        f1_identity: state.f1,
        risk_profile_lookup_email: state.lookup_email,
        timestamp: new Date().toISOString(),
        stage: 'BATCH-1-F1-only'
    };

    console.log('[pension] Draft payload (F1 only):', payload);

    alert(
        '✅ F1 Identity saved to localStorage.\n\n' +
        'Stage 2 BATCH 1 progress: F1 ✓ Complete.\n\n' +
        'Next session: build F2 Employment Matrix + F3 DPPK + F7 Healthcare (Batch 2 medium layers).\n\n' +
        'Backend handler + PDF generator akan ship setelah all 11 layers done.\n\n' +
        'Payload logged ke browser console untuk inspeksi.'
    );
}

// ============================================================================
// Bootstrap
// ============================================================================
document.addEventListener('DOMContentLoaded', () => {
    // Restore from localStorage
    restoreState();

    // Add 1 empty anak row if list is empty (for UX prompt)
    const anakList = document.getElementById('anak_list');
    if (anakList && anakList.children.length === 0) {
        // no auto-add — let Philip click button explicitly
    }

    // Attach listeners for all F1 inputs
    document.querySelectorAll('#pension-form input, #pension-form select').forEach(el => {
        const evt = (el.tagName === 'SELECT' || el.type === 'radio') ? 'change' : 'input';
        el.addEventListener(evt, () => {
            saveState();
            refreshConditionals();
        });
    });

    // Initial render
    refreshConditionals();

    // Fade-up animation
    setTimeout(() => {
        document.querySelectorAll('.fade-up').forEach(el => el.classList.add('animate-in'));
    }, 100);
});
