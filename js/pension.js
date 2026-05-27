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
    f2: {
        // Pemegang
        emp_type_pemegang: '',
        employer_pemegang: '',
        industri_pemegang: '',
        posisi_pemegang: '',
        gaji_gross_pemegang: '',
        gaji_variable_pemegang: '',
        tahun_kerja_pemegang: '',
        tahun_bpjstk_pemegang: '',
        jht_balance_pemegang: '',
        dppk_pemegang: '',
        // Pasangan
        emp_type_pasangan: '',
        employer_pasangan: '',
        gaji_gross_pasangan: '',
        tahun_kerja_pasangan: '',
        tahun_bpjstk_pasangan: '',
        jht_balance_pasangan: '',
        dppk_pasangan: ''
    },
    f3: {
        // Pemegang DPPK
        dppk_nama_pemegang: '',
        scheme_pemegang: '',
        formula_db_pemegang: '',
        dc_saldo_pemegang: '',
        dc_kontribusi_pemegang: '',
        vesting_pemegang: '',
        manfaat_age_pemegang: '55',
        payout_lump_pemegang: false,
        payout_annuity_pemegang: false,
        estimasi_manfaat_pemegang: '',
        // Pasangan DPPK
        dppk_nama_pasangan: '',
        scheme_pasangan: '',
        dc_saldo_pasangan: '',
        dc_kontribusi_pasangan: '',
        estimasi_manfaat_pasangan: ''
    },
    f7: {
        strategy: '',  // bpjs_only / hybrid / swasta_only
        anggota: {}  // {anggota_key: {bpjs_status, bpjs_kelas, asuransi_provider, premi_yr, ci_aktif, ci_provider, ci_sum, disability_rider, kondisi_medical, family_history}}
    },
    risk_profile_inherited: null,  // from Financial Checkup lookup
    lookup_email: ''
};

// ============================================================================
// BPJS-TK access matrix per employment type
// ============================================================================
const BPJS_MATRIX = {
    pns: {
        jht: '❌ (pakai Taspen)',
        jp: '❌ (pakai Taspen)',
        jkk: '❌ (pakai Taspen)',
        jkm: '❌ (pakai Taspen)',
        jkp: '❌',
        dppk: '❌ (Taspen sudah cover)',
        note: 'PNS pakai Taspen, bukan BPJS-TK. JP estimate dari Taspen formula = ~75% gaji pokok terakhir × masa kerja/30.'
    },
    bumn: {
        jht: '✅ Mandatory',
        jp: '✅ Eligible (kalau iuran ≥15 thn)',
        jkk: '✅ Mandatory',
        jkm: '✅ Mandatory',
        jkp: '✅ Mandatory',
        dppk: 'Umumnya ✅ (Pertamina/PLN/Telkom/BCA/Mandiri/BNI/BRI/Astra)',
        note: 'BUMN besar punya DPPK terpisah selain BPJS-TK. Tanyakan klien untuk SK Dapen / annual statement.'
    },
    swasta_tetap: {
        jht: '✅ Mandatory',
        jp: '✅ Eligible (kalau iuran ≥15 thn)',
        jkk: '✅ Mandatory',
        jkm: '✅ Mandatory',
        jkp: '✅ Mandatory',
        dppk: 'Tergantung perusahaan (multinational besar umumnya ya)',
        note: 'Swasta PKWTT (Perjanjian Kerja Waktu Tidak Tertentu / kontrak tetap) full BPJS-TK access.'
    },
    swasta_kontrak: {
        jht: '✅ Mandatory',
        jp: '✅ Eligible (kalau ≥6 bulan kontrak)',
        jkk: '✅ Mandatory',
        jkm: '✅ Mandatory',
        jkp: '✅ Mandatory',
        dppk: 'Jarang',
        note: 'PKWT (Perjanjian Kerja Waktu Tertentu / kontrak). Eligibility JP ada syarat minimum durasi kontrak.'
    },
    bpu: {
        jht: '✅ Voluntary',
        jp: '❌ Tidak eligible',
        jkk: '✅ Voluntary',
        jkm: '✅ Voluntary',
        jkp: '❌',
        dppk: '❌',
        note: 'BPU (Bukan Penerima Upah / Mandiri) tidak eligible JP. JHT voluntary — iuran lower bound = JHT lebih kecil.'
    },
    freelancer: {
        jht: '✅ Voluntary (kalau enrolled BPU)',
        jp: '❌ Tidak eligible',
        jkk: '✅ Voluntary',
        jkm: '✅ Voluntary',
        jkp: '❌',
        dppk: '❌',
        note: 'Same as BPU treatment. Sering klien lupa enroll BPJS-TK Mandiri = no JHT track.'
    },
    business_owner: {
        jht: '✅ Voluntary',
        jp: '❌ Tidak eligible',
        jkk: '✅ Voluntary',
        jkm: '✅ Voluntary',
        jkp: '❌',
        dppk: '❌ (kecuali PT enroll Direksi sebagai karyawan)',
        note: '⚠️ Common gap: business owner sering ga enroll dirinya ke BPJS-TK. Tanyakan: "Apakah PT-nya enroll Anda sebagai Direksi dengan BPJS-TK?"'
    },
    profesional: {
        jht: '✅ Voluntary',
        jp: '❌ Tidak eligible',
        jkk: '✅ Voluntary',
        jkm: '✅ Voluntary',
        jkp: '❌',
        dppk: '❌',
        note: 'Profesional independen (dokter/advokat/konsultan/notaris) = BPU treatment. Income variable typically.'
    },
    not_working: {
        jht: '❌',
        jp: '❌',
        jkk: '❌',
        jkm: '❌',
        jkp: '❌',
        dppk: '❌',
        note: 'Tidak ada coverage BPJS-TK. Healthcare BPJS Kesehatan tetap perlu (terpisah).'
    }
};

function renderBPJSMatrix(earnerSuffix) {
    const select = document.getElementById(`f2_emp_type_${earnerSuffix}`);
    const wrap = document.getElementById(`bpjs_matrix_${earnerSuffix}`);
    const content = document.getElementById(`bpjs_matrix_${earnerSuffix}_content`);
    if (!select || !wrap || !content) return;

    const val = select.value;
    if (!val || !BPJS_MATRIX[val]) {
        wrap.style.display = 'none';
        return;
    }

    const m = BPJS_MATRIX[val];
    wrap.style.display = 'block';
    content.innerHTML = `
        <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.25rem 0.875rem;margin-bottom:0.375rem;">
            <div><strong>JHT:</strong> ${m.jht}</div>
            <div><strong>JP:</strong> ${m.jp}</div>
            <div><strong>JKK:</strong> ${m.jkk}</div>
            <div><strong>JKM:</strong> ${m.jkm}</div>
            <div><strong>JKP:</strong> ${m.jkp}</div>
            <div><strong>DPPK:</strong> ${m.dppk}</div>
        </div>
        <div style="font-size:0.6875rem;color:#1e3a8a;padding-top:0.375rem;border-top:1px solid #bfdbfe;">${m.note}</div>
    `;
}

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

        // F2 Employment Matrix
        state.f2.emp_type_pemegang = val('f2_emp_type_pemegang');
        state.f2.employer_pemegang = val('f2_employer_pemegang');
        state.f2.industri_pemegang = val('f2_industri_pemegang');
        state.f2.posisi_pemegang = val('f2_posisi_pemegang');
        state.f2.gaji_gross_pemegang = val('f2_gaji_gross_pemegang');
        state.f2.gaji_variable_pemegang = val('f2_gaji_variable_pemegang');
        state.f2.tahun_kerja_pemegang = val('f2_tahun_kerja_pemegang');
        state.f2.tahun_bpjstk_pemegang = val('f2_tahun_bpjstk_pemegang');
        state.f2.jht_balance_pemegang = val('f2_jht_balance_pemegang');
        state.f2.dppk_pemegang = radioVal('f2_dppk_pemegang');
        state.f2.emp_type_pasangan = val('f2_emp_type_pasangan');
        state.f2.employer_pasangan = val('f2_employer_pasangan');
        state.f2.gaji_gross_pasangan = val('f2_gaji_gross_pasangan');
        state.f2.tahun_kerja_pasangan = val('f2_tahun_kerja_pasangan');
        state.f2.tahun_bpjstk_pasangan = val('f2_tahun_bpjstk_pasangan');
        state.f2.jht_balance_pasangan = val('f2_jht_balance_pasangan');
        state.f2.dppk_pasangan = radioVal('f2_dppk_pasangan');

        // F3 DPPK Landscape
        state.f3.dppk_nama_pemegang = val('f3_dppk_nama_pemegang');
        state.f3.scheme_pemegang = radioVal('f3_scheme_pemegang');
        state.f3.formula_db_pemegang = val('f3_formula_db_pemegang');
        state.f3.dc_saldo_pemegang = val('f3_dc_saldo_pemegang');
        state.f3.dc_kontribusi_pemegang = val('f3_dc_kontribusi_pemegang');
        state.f3.vesting_pemegang = radioVal('f3_vesting_pemegang');
        state.f3.manfaat_age_pemegang = val('f3_manfaat_age_pemegang') || '55';
        state.f3.payout_lump_pemegang = document.getElementById('f3_payout_lump_pemegang')?.checked || false;
        state.f3.payout_annuity_pemegang = document.getElementById('f3_payout_annuity_pemegang')?.checked || false;
        state.f3.estimasi_manfaat_pemegang = val('f3_estimasi_manfaat_pemegang');
        state.f3.dppk_nama_pasangan = val('f3_dppk_nama_pasangan');
        state.f3.scheme_pasangan = radioVal('f3_scheme_pasangan');
        state.f3.dc_saldo_pasangan = val('f3_dc_saldo_pasangan');
        state.f3.dc_kontribusi_pasangan = val('f3_dc_kontribusi_pasangan');
        state.f3.estimasi_manfaat_pasangan = val('f3_estimasi_manfaat_pasangan');

        // F7 Healthcare
        state.f7.strategy = radioVal('f7_strategy');
        state.f7.anggota = collectF7Anggota();

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

        // F2 Employment Matrix
        if (state.f2) {
            setVal('f2_emp_type_pemegang', state.f2.emp_type_pemegang);
            setVal('f2_employer_pemegang', state.f2.employer_pemegang);
            setVal('f2_industri_pemegang', state.f2.industri_pemegang);
            setVal('f2_posisi_pemegang', state.f2.posisi_pemegang);
            setVal('f2_gaji_gross_pemegang', state.f2.gaji_gross_pemegang);
            setVal('f2_gaji_variable_pemegang', state.f2.gaji_variable_pemegang);
            setVal('f2_tahun_kerja_pemegang', state.f2.tahun_kerja_pemegang);
            setVal('f2_tahun_bpjstk_pemegang', state.f2.tahun_bpjstk_pemegang);
            setVal('f2_jht_balance_pemegang', state.f2.jht_balance_pemegang);
            setRadio('f2_dppk_pemegang', state.f2.dppk_pemegang);
            setVal('f2_emp_type_pasangan', state.f2.emp_type_pasangan);
            setVal('f2_employer_pasangan', state.f2.employer_pasangan);
            setVal('f2_gaji_gross_pasangan', state.f2.gaji_gross_pasangan);
            setVal('f2_tahun_kerja_pasangan', state.f2.tahun_kerja_pasangan);
            setVal('f2_tahun_bpjstk_pasangan', state.f2.tahun_bpjstk_pasangan);
            setVal('f2_jht_balance_pasangan', state.f2.jht_balance_pasangan);
            setRadio('f2_dppk_pasangan', state.f2.dppk_pasangan);
        }

        // F3 DPPK
        if (state.f3) {
            setVal('f3_dppk_nama_pemegang', state.f3.dppk_nama_pemegang);
            setRadio('f3_scheme_pemegang', state.f3.scheme_pemegang);
            setVal('f3_formula_db_pemegang', state.f3.formula_db_pemegang);
            setVal('f3_dc_saldo_pemegang', state.f3.dc_saldo_pemegang);
            setVal('f3_dc_kontribusi_pemegang', state.f3.dc_kontribusi_pemegang);
            setRadio('f3_vesting_pemegang', state.f3.vesting_pemegang);
            setVal('f3_manfaat_age_pemegang', state.f3.manfaat_age_pemegang || '55');
            const lump = document.getElementById('f3_payout_lump_pemegang');
            const ann = document.getElementById('f3_payout_annuity_pemegang');
            if (lump) lump.checked = !!state.f3.payout_lump_pemegang;
            if (ann) ann.checked = !!state.f3.payout_annuity_pemegang;
            setVal('f3_estimasi_manfaat_pemegang', state.f3.estimasi_manfaat_pemegang);
            setVal('f3_dppk_nama_pasangan', state.f3.dppk_nama_pasangan);
            setRadio('f3_scheme_pasangan', state.f3.scheme_pasangan);
            setVal('f3_dc_saldo_pasangan', state.f3.dc_saldo_pasangan);
            setVal('f3_dc_kontribusi_pasangan', state.f3.dc_kontribusi_pasangan);
            setVal('f3_estimasi_manfaat_pasangan', state.f3.estimasi_manfaat_pasangan);
        }

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
    // F1 conditionals
    toggleConditional('f1_domisili_other_wrap', val('f1_domisili_kota') === 'other');
    toggleConditional('f1_anchor_lokasi_kota_wrap', radioVal('f1_anchor_lokasi_same') === 'false');
    toggleConditional('f1_married_wrap', radioVal('f1_marital') === 'married');

    // F2 conditionals
    const marital = radioVal('f1_marital');
    toggleConditional('f2_pasangan_wrap', marital === 'married');

    const pasanganEmpType = val('f2_emp_type_pasangan');
    toggleConditional('f2_pasangan_working_wrap',
        pasanganEmpType && pasanganEmpType !== 'not_working');

    // Render BPJS matrix auto-display
    renderBPJSMatrix('pemegang');
    renderBPJSMatrix('pasangan');

    // F3 conditional rendering (only render kalau F2 set DPPK active)
    const dppkPemegang = radioVal('f2_dppk_pemegang') === 'yes';
    const dppkPasangan = radioVal('f2_dppk_pasangan') === 'yes' && marital === 'married';
    const anyDPPK = dppkPemegang || dppkPasangan;

    toggleConditional('f3_pemegang_wrap', dppkPemegang);
    toggleConditional('f3_pasangan_wrap', dppkPasangan);
    const emptyState = document.getElementById('f3_empty_state');
    if (emptyState) emptyState.style.display = anyDPPK ? 'none' : 'block';

    // F3 sub-conditionals (DB vs DC scheme fields)
    toggleConditional('f3_db_wrap_pemegang', radioVal('f3_scheme_pemegang') === 'db');
    toggleConditional('f3_dc_wrap_pemegang', radioVal('f3_scheme_pemegang') === 'dc' || radioVal('f3_scheme_pemegang') === 'hybrid');
    toggleConditional('f3_dc_wrap_pasangan', radioVal('f3_scheme_pasangan') === 'dc' || radioVal('f3_scheme_pasangan') === 'hybrid');

    // F3 status pill
    if (!anyDPPK) {
        const el = document.getElementById('status-f3');
        if (el) { el.textContent = 'N/A — set di F2'; el.className = 'layer-status placeholder'; }
    } else {
        updateLayerStatus('f3', validateF3Soft());
    }

    // F7 dynamic anggota render + status pill
    renderF7AnggotaList();
    setRadio('f7_strategy', state.f7?.strategy);
    updateLayerStatus('f7', validateF7Soft());

    // Status pills
    updateLayerStatus('f1', validateF1Soft());
    updateLayerStatus('f2', validateF2Soft());
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

function validateF2Soft() {
    const required = [
        state.f2.emp_type_pemegang,
        state.f2.gaji_gross_pemegang
    ];
    const filled = required.filter(v => v && v.toString().trim().length > 0).length;
    return filled === required.length;
}

function validateF3Soft() {
    // Only relevant kalau ada DPPK active
    const dppkPemegangActive = state.f2.dppk_pemegang === 'yes';
    if (!dppkPemegangActive) return true;  // not required if not applicable
    return !!state.f3.scheme_pemegang;
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
            // Color-coded based on label
            const label = rp.profile_label || '';
            let bgColor = '#f0fdf4', borderColor = '#10b981', textColor = '#065f46';
            if (label.includes('SKILL GAP')) {
                bgColor = '#fef2f2'; borderColor = '#dc2626'; textColor = '#991b1b';
            } else if (label.includes('Aggressive')) {
                bgColor = '#eff6ff'; borderColor = '#3b82f6'; textColor = '#1e40af';
            } else if (label.includes('Moderate')) {
                bgColor = '#fefce8'; borderColor = '#eab308'; textColor = '#854d0e';
            }

            // Friendly category mapping
            let categoryHint = '';
            if (label.includes('Konservatif')) categoryHint = 'Klien profile konservatif — asuransi-led product fit.';
            else if (label.includes('Moderate-Conservative')) categoryHint = 'Klien moderate-conservative — asuransi heavy + balanced buffer.';
            else if (label.includes('Moderate') && !label.includes('Conservative')) categoryHint = 'Klien moderate — balanced mix asuransi + investasi.';
            else if (label.includes('SKILL GAP')) categoryHint = '⭐ Klien punya kapasitas tinggi TAPI waktu/skill rendah — refer ke investment partner.';
            else if (label.includes('Aggressive')) categoryHint = 'Klien aggressive + skilled — DIY OK, minimal asuransi layer.';

            const bar = (score) => {
                const pct = Math.max(0, Math.min(100, score));
                return `<div style="display:flex;align-items:center;gap:0.5rem;">
                    <div style="flex:1;height:6px;background:#e5e7eb;border-radius:3px;overflow:hidden;">
                        <div style="width:${pct}%;height:100%;background:${borderColor};"></div>
                    </div>
                    <span style="font-size:0.75rem;font-weight:700;color:${textColor};min-width:2.5rem;text-align:right;">${pct}/100</span>
                </div>`;
            };

            // Build "kenapa" explanation section dari backend
            const exp = rp.explanation || {};
            const renderReasons = (arr) => (arr || []).map(r => `<li style="margin-left:1rem;">${r}</li>`).join('');

            rpSection = `
                <div style="margin-top:1rem;padding:1rem 1.125rem;border-radius:0.75rem;background:${bgColor};border:2px solid ${borderColor};">
                    <div style="font-size:0.625rem;font-weight:700;color:${textColor};text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.375rem;">🧠 Profil Risiko (dari Financial Checkup)</div>

                    <div style="font-size:1.5rem;font-weight:900;color:${textColor};letter-spacing:-0.02em;line-height:1.2;margin-bottom:0.875rem;">
                        ${label}
                    </div>

                    <div style="display:flex;flex-direction:column;gap:0.5rem;margin-bottom:0.875rem;padding:0.625rem 0.875rem;background:rgba(255,255,255,0.6);border-radius:0.5rem;">
                        <div>
                            <div style="font-size:0.6875rem;color:${textColor};font-weight:600;margin-bottom:0.125rem;">Kapasitas (kemampuan finansial)</div>
                            ${bar(rp.capacity_score)}
                        </div>
                        <div>
                            <div style="font-size:0.6875rem;color:${textColor};font-weight:600;margin-bottom:0.125rem;">Skill & Waktu (untuk investasi)</div>
                            ${bar(rp.skill_time_score)}
                        </div>
                        <div>
                            <div style="font-size:0.6875rem;color:${textColor};font-weight:600;margin-bottom:0.125rem;">Toleransi (tahan banting psikologis)</div>
                            ${bar(rp.tolerance_score)}
                        </div>
                    </div>

                    ${exp.what_it_means ? `
                    <div style="padding:0.75rem 0.875rem;background:rgba(255,255,255,0.8);border-radius:0.5rem;font-size:0.8125rem;color:${textColor};border:1px solid ${borderColor};margin-bottom:0.75rem;line-height:1.55;">
                        ${exp.what_it_means.replace(/\*\*([^*]+)\*\*/g, '<strong>$1</strong>')}
                    </div>
                    ` : ''}

                    <details style="font-size:0.75rem;color:${textColor};">
                        <summary style="cursor:pointer;font-weight:700;padding:0.375rem 0;user-select:none;">📋 Kenapa profile ini? (berdasarkan jawaban kamu di Financial Checkup)</summary>

                        <div style="margin-top:0.5rem;padding:0.625rem 0.875rem;background:rgba(255,255,255,0.6);border-radius:0.5rem;">
                            <div style="font-weight:700;margin-bottom:0.25rem;">📊 Skor Kapasitas (${rp.capacity_score}/100) dihitung dari:</div>
                            <ul style="margin:0;padding:0;list-style:disc;list-style-position:inside;">
                                ${renderReasons(exp.capacity_reasons)}
                            </ul>

                            <div style="font-weight:700;margin:0.625rem 0 0.25rem;">⚙️ Skor Skill & Waktu (${rp.skill_time_score}/100) dihitung dari:</div>
                            <ul style="margin:0;padding:0;list-style:disc;list-style-position:inside;">
                                ${renderReasons(exp.skill_time_reasons)}
                            </ul>

                            <div style="font-weight:700;margin:0.625rem 0 0.25rem;">💓 Skor Toleransi (${rp.tolerance_score}/100) dihitung dari:</div>
                            <ul style="margin:0;padding:0;list-style:disc;list-style-position:inside;">
                                ${renderReasons(exp.tolerance_reasons)}
                            </ul>
                        </div>
                    </details>
                </div>
            `;
            state.risk_profile_inherited = rp;
        } else {
            rpSection = `
                <div style="margin-top:1rem;padding:1rem 1.125rem;border-radius:0.75rem;background:#fef3c7;border:2px solid #f59e0b;">
                    <div style="font-size:0.625rem;font-weight:700;color:#92400e;text-transform:uppercase;letter-spacing:0.1em;margin-bottom:0.375rem;">⚠️ Risk Profile Belum Ada</div>
                    <div style="font-size:1rem;font-weight:800;color:#92400e;margin-bottom:0.5rem;">
                        Klien belum punya Profil Risiko
                    </div>
                    <div style="font-size:0.8125rem;color:#78350f;">
                        ${data.message || 'Klien submit Financial Checkup sebelum Step 4 Profil Risiko ship (2026-05-27). Solusi: minta klien re-submit Financial Checkup di philipmulyana.com/financial-checkup.html supaya isi Step 4.'}
                    </div>
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
// F7 Healthcare anggota dynamic rendering
// ============================================================================
function getAnggotaKeluarga() {
    // Returns list of anggota from F1: pemegang + pasangan (if married) + per anak
    const list = [];

    // Pemegang
    const namaP = state.f1?.nama_pemegang || val('f1_nama_pemegang') || 'Klien';
    list.push({key: 'pemegang', label: 'Klien', nama: namaP, role: 'Pemegang'});

    // Pasangan
    if (radioVal('f1_marital') === 'married') {
        const namaPas = state.f1?.pasangan_nama || val('f1_pasangan_nama') || 'Pasangan';
        list.push({key: 'pasangan', label: 'Pasangan', nama: namaPas, role: 'Pasangan'});
    }

    // Anak
    const anakRows = state.f1?.anak || collectAnakRows();
    anakRows.forEach((anak, idx) => {
        if (anak.nama) {
            list.push({key: `anak_${idx}`, label: `Anak ${idx+1}`, nama: anak.nama, role: 'Anak'});
        }
    });

    return list;
}

function renderF7AnggotaList() {
    const container = document.getElementById('f7_anggota_list');
    if (!container) return;

    const anggotaList = getAnggotaKeluarga();
    if (anggotaList.length === 0) {
        container.innerHTML = '<p style="font-size:0.8125rem;color:#9ca3af;padding:1rem;text-align:center;background:#f9fafb;border-radius:0.5rem;">Isi F1 dulu (nama klien minimal) untuk auto-generate anggota healthcare inventory.</p>';
        return;
    }

    container.innerHTML = anggotaList.map(a => buildF7AnggotaCard(a)).join('');

    // Attach listeners to all new inputs
    container.querySelectorAll('input, select').forEach(el => {
        const evt = (el.tagName === 'SELECT' || el.type === 'radio' || el.type === 'checkbox') ? 'change' : 'input';
        el.addEventListener(evt, saveState);
    });

    // Restore saved state for each anggota
    if (state.f7?.anggota) {
        Object.keys(state.f7.anggota).forEach(key => {
            restoreF7AnggotaState(key, state.f7.anggota[key]);
        });
    }
}

function buildF7AnggotaCard(a) {
    const k = a.key;
    return `
        <div class="subsection" style="background:#f9fafb;border-radius:0.75rem;padding:0.875rem 1rem;" data-f7-anggota="${k}">
            <h4 style="font-size:0.8125rem;font-weight:700;margin-bottom:0.625rem;color:#111827;">👤 ${a.label}: <span style="color:#6b7280;font-weight:500;">${a.nama}</span></h4>

            <div style="display:grid;grid-template-columns:1fr 1fr;gap:0.625rem 0.875rem;font-size:0.8125rem;">
                <div>
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">BPJS Kesehatan</label>
                    <select id="f7_${k}_bpjs_status" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                        <option value="">— Pilih —</option>
                        <option value="aktif">Aktif</option>
                        <option value="lapse">Lapse</option>
                        <option value="never">Belum enroll</option>
                    </select>
                </div>
                <div>
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">BPJS Kelas</label>
                    <select id="f7_${k}_bpjs_kelas" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                        <option value="">— Pilih —</option>
                        <option value="1">Kelas I</option>
                        <option value="2">Kelas II</option>
                        <option value="3">Kelas III</option>
                    </select>
                </div>

                <div style="grid-column:1 / -1;">
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Asuransi kesehatan swasta — provider + plan</label>
                    <input type="text" id="f7_${k}_swasta_provider" placeholder="contoh: Allianz SmartMed Premier" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                </div>
                <div>
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Limit tahunan (Rp)</label>
                    <input type="number" id="f7_${k}_swasta_limit" placeholder="contoh: 500000000" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                </div>
                <div>
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Premi tahunan (Rp)</label>
                    <input type="number" id="f7_${k}_swasta_premi" placeholder="contoh: 12000000" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                </div>
                <div>
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Renewable sampai usia</label>
                    <input type="number" id="f7_${k}_swasta_age" min="65" max="100" placeholder="default 75" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                </div>

                <div style="grid-column:1 / -1;">
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Critical Illness (CI) standalone — provider + UP (Rp)</label>
                    <input type="text" id="f7_${k}_ci" placeholder="contoh: Pru CI 1M, UP 1.5jt-an/yr premi" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                </div>

                ${k === 'pemegang' || k === 'pasangan' ? `
                <div style="grid-column:1 / -1;">
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Disability income rider</label>
                    <div class="radio-inline">
                        <label style="font-size:0.75rem;padding:0.25rem 0.5rem;"><input type="radio" name="f7_${k}_disability" value="yes"> Ada</label>
                        <label style="font-size:0.75rem;padding:0.25rem 0.5rem;"><input type="radio" name="f7_${k}_disability" value="no"> Tidak ada</label>
                        <label style="font-size:0.75rem;padding:0.25rem 0.5rem;"><input type="radio" name="f7_${k}_disability" value="unknown"> Belum tahu</label>
                    </div>
                </div>
                ` : ''}

                <div style="grid-column:1 / -1;">
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Kondisi medical pre-existing (kalau ada)</label>
                    <input type="text" id="f7_${k}_kondisi" placeholder="contoh: diabetes T2 (controlled), hipertensi" style="width:100%;padding:0.375rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;font-size:0.75rem;">
                </div>

                ${k === 'pemegang' || k === 'pasangan' ? `
                <div style="grid-column:1 / -1;">
                    <label style="font-size:0.6875rem;color:#374151;font-weight:600;display:block;margin-bottom:0.25rem;">Family history chronic (centang yang relevan untuk ${a.label})</label>
                    <div style="display:flex;flex-wrap:wrap;gap:0.375rem;">
                        ${['Cancer','Jantung','Stroke','Diabetes','Ginjal','Hipertensi','Mental Health'].map(cond => `
                            <label style="font-size:0.75rem;padding:0.25rem 0.5rem;border:1px solid #e5e7eb;border-radius:0.375rem;cursor:pointer;display:inline-flex;align-items:center;gap:0.25rem;">
                                <input type="checkbox" id="f7_${k}_hist_${cond.toLowerCase().replace(' ','_')}" data-f7-hist="${k}">
                                ${cond}
                            </label>
                        `).join('')}
                    </div>
                </div>
                ` : ''}
            </div>
        </div>
    `;
}

function collectF7Anggota() {
    const result = {};
    const cards = document.querySelectorAll('[data-f7-anggota]');
    cards.forEach(card => {
        const k = card.dataset.f7Anggota;
        const data = {
            bpjs_status: val(`f7_${k}_bpjs_status`),
            bpjs_kelas: val(`f7_${k}_bpjs_kelas`),
            swasta_provider: val(`f7_${k}_swasta_provider`),
            swasta_limit: val(`f7_${k}_swasta_limit`),
            swasta_premi: val(`f7_${k}_swasta_premi`),
            swasta_age: val(`f7_${k}_swasta_age`),
            ci: val(`f7_${k}_ci`),
            kondisi: val(`f7_${k}_kondisi`),
        };
        if (k === 'pemegang' || k === 'pasangan') {
            data.disability = radioVal(`f7_${k}_disability`);
            data.family_history = [];
            card.querySelectorAll(`[data-f7-hist="${k}"]:checked`).forEach(cb => {
                const id = cb.id;
                const cond = id.replace(`f7_${k}_hist_`, '');
                data.family_history.push(cond);
            });
        }
        result[k] = data;
    });
    return result;
}

function restoreF7AnggotaState(k, data) {
    if (!data) return;
    setVal(`f7_${k}_bpjs_status`, data.bpjs_status);
    setVal(`f7_${k}_bpjs_kelas`, data.bpjs_kelas);
    setVal(`f7_${k}_swasta_provider`, data.swasta_provider);
    setVal(`f7_${k}_swasta_limit`, data.swasta_limit);
    setVal(`f7_${k}_swasta_premi`, data.swasta_premi);
    setVal(`f7_${k}_swasta_age`, data.swasta_age);
    setVal(`f7_${k}_ci`, data.ci);
    setVal(`f7_${k}_kondisi`, data.kondisi);
    if (data.disability) setRadio(`f7_${k}_disability`, data.disability);
    if (data.family_history && Array.isArray(data.family_history)) {
        data.family_history.forEach(cond => {
            const el = document.getElementById(`f7_${k}_hist_${cond}`);
            if (el) el.checked = true;
        });
    }
}

function validateF7Soft() {
    return !!state.f7?.strategy;
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
