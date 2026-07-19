// Assessment Kesiapan Proteksi Jiwa.
// Sibling of assessment.js (pensiun). Same shape on purpose: 10 pertanyaan,
// skor = teaser gratis, rincian per area dikunci di balik form.
//
// Dasar pertanyaan: metode DIME (Debt / Income / Mortgage / Education) +
// income replacement, sesuai KB Philip. TIDAK meresepkan produk apa pun.
// Output klien-facing = deskripsi posisi saja (aturan Philip, locked).

const JIWA_QUESTIONS = [
    {
        id: 'tanggungan',
        question: 'Siapa yang bergantung pada penghasilan kamu saat ini?',
        options: [
            { label: 'Tidak ada, saya sendiri', score: 15 },
            { label: 'Pasangan saja', score: 10 },
            { label: 'Pasangan dan anak', score: 5 },
            { label: 'Pasangan, anak, dan orang tua', score: 3 }
        ]
    },
    {
        id: 'age',
        question: 'Berapa usia kamu sekarang?',
        options: [
            { label: '< 30 tahun', score: 12 },
            { label: '30 - 35 tahun', score: 12 },
            { label: '36 - 40 tahun', score: 10 },
            { label: '41 - 45 tahun', score: 8 },
            { label: '> 45 tahun', score: 5 }
        ]
    },
    {
        id: 'income',
        question: 'Berapa penghasilan bulanan kamu saat ini?',
        options: [
            { label: '< Rp 5 juta', score: 5 },
            { label: 'Rp 5 - 10 juta', score: 10 },
            { label: 'Rp 10 - 20 juta', score: 15 },
            { label: 'Rp 20 - 50 juta', score: 20 },
            { label: '> Rp 50 juta', score: 25 }
        ]
    },
    {
        id: 'pasangan_income',
        question: 'Kalau punya pasangan, apakah pasangan juga berpenghasilan?',
        options: [
            { label: 'Saya belum berpasangan', score: 12 },
            { label: 'Ya, penghasilannya setara atau lebih besar', score: 12 },
            { label: 'Ya, tapi lebih kecil dari saya', score: 8 },
            { label: 'Tidak, keluarga bergantung penuh pada saya', score: 3 }
        ]
    },
    {
        id: 'utang',
        question: 'Berapa sisa utang kamu saat ini (KPR, kendaraan, dan lainnya)?',
        options: [
            { label: 'Tidak punya utang', score: 15 },
            { label: '< Rp 100 juta', score: 10 },
            { label: 'Rp 100 - 500 juta', score: 6 },
            { label: '> Rp 500 juta', score: 3 }
        ]
    },
    {
        id: 'up_sekarang',
        question: 'Berapa Uang Pertanggungan asuransi jiwa yang kamu miliki sekarang?',
        options: [
            { label: 'Belum punya asuransi jiwa', score: 0 },
            { label: 'Ada, tapi di bawah 1x penghasilan setahun', score: 3 },
            { label: 'Sekitar 1 sampai 5x penghasilan setahun', score: 8 },
            { label: 'Sekitar 5 sampai 10x penghasilan setahun', score: 15 },
            { label: 'Di atas 10x penghasilan setahun', score: 20 }
        ]
    },
    {
        id: 'emergency_fund',
        question: 'Sudah punya dana darurat?',
        options: [
            { label: 'Belum punya', score: 0 },
            { label: 'Punya, tapi < 6 bulan pengeluaran', score: 5 },
            { label: 'Sudah punya 6+ bulan pengeluaran', score: 12 }
        ]
    },
    {
        id: 'pendidikan',
        question: 'Kalau punya anak, apakah dana pendidikannya sudah disiapkan terpisah?',
        options: [
            { label: 'Saya belum punya anak', score: 10 },
            { label: 'Sudah disiapkan dan berjalan rutin', score: 10 },
            { label: 'Baru sebagian', score: 5 },
            { label: 'Belum disiapkan sama sekali', score: 3 }
        ]
    },
    {
        id: 'tahu_up',
        question: 'Apakah kamu sudah tahu berapa Uang Pertanggungan yang sebenarnya kamu butuhkan?',
        options: [
            { label: 'Belum pernah menghitung', score: 0 },
            { label: 'Punya gambaran kasar', score: 5 },
            { label: 'Sudah menghitung detail', score: 10 }
        ]
    },
    {
        id: 'bertahan',
        question: 'Kalau penghasilan kamu berhenti hari ini, keluarga bisa bertahan berapa lama dengan aset yang ada?',
        options: [
            { label: 'Kurang dari 3 bulan', score: 0 },
            { label: '3 sampai 12 bulan', score: 4 },
            { label: '1 sampai 3 tahun', score: 8 },
            { label: 'Lebih dari 3 tahun', score: 12 }
        ]
    }
];

const JIWA_MAX_SCORE = 143;

const JIWA_CATEGORIES = [
    { max: 40, label: 'Belum Terlindungi', color: '#dc3545' },
    { max: 80, label: 'Perlu Perhatian', color: '#ffc107' },
    { max: 115, label: 'Cukup Terlindungi', color: '#28a745' },
    { max: 143, label: 'Terlindungi', color: '#198754' }
];

const WEBSITE_CALC_ENDPOINT = 'https://philip-mulyana--ai-lead-gen-gateway.modal.run/campaign';

let jiwaCurrent = 0;
let jiwaAnswers = {};
let jiwaResults = null;

function fireJiwaEvent(stage, score, category) {
    try {
        fetch(WEBSITE_CALC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'funnel_event',
                calculator: 'assessment_jiwa',
                stage, score, category,
            }),
            keepalive: true,
        }).catch(() => { /* non-blocking */ });
    } catch (e) { /* non-blocking */ }
}

function initJiwa() {
    jiwaCurrent = 0;
    jiwaAnswers = {};
    renderJiwaQuestion();
}

function renderJiwaQuestion() {
    const container = document.getElementById('assessment-container');
    const q = JIWA_QUESTIONS[jiwaCurrent];
    const total = JIWA_QUESTIONS.length;
    const progress = (jiwaCurrent / total) * 100;

    container.innerHTML = `
        <div class="mb-6">
            <div class="flex justify-between text-xs text-gray-400 mb-2">
                <span>Pertanyaan ${jiwaCurrent + 1} dari ${total}</span>
                <span>${Math.round(progress)}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5">
                <div class="bg-black rounded-full h-1.5 transition-all duration-300" style="width: ${progress}%"></div>
            </div>
        </div>

        <h3 class="text-lg font-bold mb-5">${q.question}</h3>

        <div class="space-y-2">
            ${q.options.map((opt, i) => `
                <button onclick="selectJiwaAnswer('${q.id}', ${opt.score}, ${i})"
                    class="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-sm ${jiwaAnswers[q.id] !== undefined && jiwaAnswers[q.id].index === i ? 'border-black bg-gray-50 font-medium' : ''}">
                    ${opt.label}
                </button>
            `).join('')}
        </div>

        <div class="flex justify-between mt-6">
            ${jiwaCurrent > 0 ? `
                <button onclick="prevJiwaQuestion()" class="text-sm text-gray-400 hover:text-black transition-colors">
                    &larr; Sebelumnya
                </button>
            ` : '<div></div>'}
            <div></div>
        </div>
    `;
}

function selectJiwaAnswer(questionId, score, index) {
    jiwaAnswers[questionId] = { score, index };
    setTimeout(() => {
        if (jiwaCurrent < JIWA_QUESTIONS.length - 1) {
            jiwaCurrent++;
            renderJiwaQuestion();
        } else {
            showJiwaResults();
        }
    }, 200);
}

function prevJiwaQuestion() {
    if (jiwaCurrent > 0) {
        jiwaCurrent--;
        renderJiwaQuestion();
    }
}

function getJiwaCategory(score) {
    for (const cat of JIWA_CATEGORIES) {
        if (score <= cat.max) return cat;
    }
    return JIWA_CATEGORIES[JIWA_CATEGORIES.length - 1];
}

// DESKRIPSI POSISI, bukan resep. Jangan tambah kalimat yang nyuruh.
function generateJiwaFindings() {
    const a = jiwaAnswers;
    const out = [];

    if (a.up_sekarang && a.up_sekarang.score === 0) {
        out.push('Kamu belum punya asuransi jiwa. Artinya kalau penghasilan kamu berhenti mendadak, tidak ada dana pengganti yang masuk untuk keluarga.');
    } else if (a.up_sekarang && a.up_sekarang.score <= 3) {
        out.push('Uang Pertanggungan kamu saat ini masih di bawah satu tahun penghasilan. Sebagai pembanding, kebutuhan umumnya dihitung dari sisa tahun produktif, bukan satu tahun.');
    }

    if (a.utang && a.utang.score <= 6) {
        out.push('Sisa utang kamu cukup besar. Utang tidak ikut hilang kalau penghasilan berhenti, jadi beban ini otomatis berpindah ke keluarga.');
    }

    if (a.pasangan_income && a.pasangan_income.score === 3) {
        out.push('Keluarga kamu bergantung penuh pada satu sumber penghasilan. Tidak ada penghasilan kedua yang menahan kalau yang pertama berhenti.');
    }

    if (a.bertahan && a.bertahan.score === 0) {
        out.push('Dengan aset yang ada sekarang, keluarga kamu bertahan kurang dari 3 bulan. Ini jarak waktu yang sangat pendek untuk menyesuaikan hidup.');
    } else if (a.bertahan && a.bertahan.score === 4) {
        out.push('Keluarga kamu bisa bertahan di bawah satu tahun dengan aset yang ada.');
    }

    if (a.pendidikan && a.pendidikan.score <= 5) {
        out.push('Dana pendidikan anak belum sepenuhnya disiapkan terpisah. Kalau penghasilan berhenti, biaya sekolah termasuk yang paling cepat terdampak karena tanggalnya tidak bisa ditunda.');
    }

    if (a.emergency_fund && a.emergency_fund.score === 0) {
        out.push('Belum ada dana darurat. Tanpa bantalan ini, guncangan kecil sekalipun langsung mengenai kebutuhan harian keluarga.');
    }

    if (a.tahu_up && a.tahu_up.score === 0) {
        out.push('Kamu belum pernah menghitung berapa Uang Pertanggungan yang dibutuhkan. Jadi belum ada angka pembanding untuk menilai cukup atau tidaknya proteksi sekarang.');
    }

    return out.slice(0, 4);
}

function showJiwaResults() {
    const totalScore = Object.values(jiwaAnswers).reduce((s, x) => s + x.score, 0);
    const percentage = Math.round((totalScore / JIWA_MAX_SCORE) * 100);
    const category = getJiwaCategory(totalScore);
    const findings = generateJiwaFindings();

    jiwaResults = { totalScore, category: category.label, findings };
    fireJiwaEvent('result_shown', totalScore, category.label);

    document.getElementById('assessment-container').innerHTML = `
        <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background-color: ${category.color}20">
                <svg class="w-8 h-8" fill="none" stroke="${category.color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p class="text-sm text-gray-400 mb-1">Assessment selesai.</p>
            <p class="text-sm text-gray-500">Hasilnya ada di bawah.</p>
        </div>
    `;

    const resultsEl = document.getElementById('assessment-results');
    resultsEl.innerHTML = `
        <div class="text-center mb-8">
            <p class="text-6xl font-black" style="color: ${category.color}">${totalScore}</p>
            <p class="text-sm text-gray-400 mt-1">dari ${JIWA_MAX_SCORE} poin</p>
            <div class="w-full bg-gray-200 rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div class="rounded-full h-3 transition-all duration-500" style="width: ${percentage}%; background-color: ${category.color}"></div>
            </div>
            <div class="inline-block mt-4 px-4 py-1.5 rounded-full text-sm font-bold" style="background-color: ${category.color}20; color: ${category.color}">
                ${category.label}
            </div>
        </div>

        <div id="assess-gate" class="bg-gray-50 rounded-2xl p-6 mb-6">
            <div class="text-center mb-5">
                <p class="text-base font-bold text-gray-900 mb-2">
                    Skor kamu sudah keluar. Yang belum: kenapa angkanya di situ.
                </p>
                <p class="text-sm text-gray-700 leading-relaxed">
                    Ada <strong>${findings.length} hal</strong> dari jawaban kamu yang menentukan posisi ini.
                    Isi data di bawah untuk melihat rinciannya.
                </p>
            </div>

            <div class="bg-white border border-gray-300 rounded-xl p-4 mb-4">
                <p class="text-sm text-gray-800 leading-relaxed mb-2">
                    <strong>Biar jelas sebelum kamu isi:</strong> saya agen asuransi, tapi ini bukan sesi jualan.
                    Obrolan 10 menit ini murni diskusi, dan <strong>kamu tidak wajib beli apa pun.</strong>
                </p>
                <p class="text-sm text-gray-800 leading-relaxed mb-2">
                    Kalau ternyata kamu belum perlu, saya bilang apa adanya. Kalau ternyata cocok dan kamu mau
                    lanjut, silakan. Dua-duanya sama-sama oke.
                </p>
                <p class="text-sm text-gray-800 leading-relaxed">
                    Biar tidak salah paham juga: yang saya bahas di sini <strong>bukan unit link.</strong>
                </p>
            </div>

            <label class="flex items-start gap-3 cursor-pointer mb-5 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors">
                <input type="checkbox" id="jw-consent" class="mt-0.5 w-5 h-5 accent-black flex-shrink-0" onchange="toggleJiwaConsent()">
                <span class="text-sm text-gray-700 leading-relaxed">
                    Saya setuju Philip menghubungi saya via WhatsApp untuk membahas hasil assessment ini.
                </span>
            </label>

            <div id="assess-form" class="space-y-3 max-w-md mx-auto opacity-40 pointer-events-none transition-opacity">
                <input type="text" id="jw-nama" placeholder="Nama kamu"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <input type="email" id="jw-email" placeholder="Email kamu"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <input type="tel" id="jw-whatsapp" placeholder="Nomor WhatsApp (e.g. 081234567890)"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <button onclick="revealJiwaDetail()" id="jw-submit"
                    class="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Lihat Rincian Skor Saya
                </button>
            </div>
            <p id="assess-error" class="text-red-500 text-xs mt-2 text-center hidden"></p>
        </div>

        <div id="assess-detail" class="hidden"></div>
    `;

    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    const gateEl = document.getElementById('assess-gate');
    if (gateEl && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fireJiwaEvent('gate_seen', totalScore, category.label);
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        obs.observe(gateEl);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleJiwaConsent() {
    const checked = document.getElementById('jw-consent').checked;
    const form = document.getElementById('assess-form');
    if (!form) return;
    if (checked) {
        form.classList.remove('opacity-40', 'pointer-events-none');
        if (jiwaResults && !window._jwConsentFired) {
            window._jwConsentFired = true;
            fireJiwaEvent('consent_ticked', jiwaResults.totalScore, jiwaResults.category);
        }
    } else {
        form.classList.add('opacity-40', 'pointer-events-none');
    }
}

function revealJiwaDetail() {
    const consentEl = document.getElementById('jw-consent');
    const errorEl = document.getElementById('assess-error');

    if (!consentEl || !consentEl.checked) {
        errorEl.textContent = 'Mohon centang persetujuan di atas dulu sebelum mengirim data.';
        errorEl.classList.remove('hidden');
        return;
    }

    const nama = document.getElementById('jw-nama').value.trim();
    const email = document.getElementById('jw-email').value.trim();
    const whatsapp = document.getElementById('jw-whatsapp').value.trim();
    const submitBtn = document.getElementById('jw-submit');

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
    if (!jiwaResults) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'website_calc_assessment',
            topic: 'jiwa',
            calculator: 'assessment_jiwa',
            nama, email, whatsapp,
            score: jiwaResults.totalScore,
            max_score: JIWA_MAX_SCORE,
            category: jiwaResults.category,
            is_agent: false,
        }),
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    document.getElementById('assess-gate').style.display = 'none';

    const detailEl = document.getElementById('assess-detail');
    detailEl.innerHTML = `
        <div class="mb-8">
            <h3 class="text-lg font-bold mb-4">Yang menentukan skor kamu</h3>
            <div class="space-y-3">
                ${jiwaResults.findings.map((item, i) => `
                    <div class="flex gap-3 bg-gray-50 rounded-xl p-4">
                        <div class="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${i + 1}</div>
                        <p class="text-sm text-gray-600 leading-relaxed">${item}</p>
                    </div>
                `).join('')}
            </div>
        </div>

        <div class="border-t border-gray-100 pt-6 text-center">
            <p class="text-base font-bold text-gray-900 mb-2">Terima kasih.</p>
            <p class="text-sm text-gray-700 leading-relaxed mb-5">
                Satu langkah lagi: pilih jam ngobrol yang cocok buat kamu.
                Cuma <strong>10 menit</strong>, gratis, tanpa kewajiban apa pun.
            </p>
            <a href="https://calendly.com/philipmulyana/first-call" target="_blank" rel="noopener noreferrer"
               class="inline-flex items-center gap-2 bg-black text-white px-8 py-3.5 rounded-full text-sm font-bold hover:bg-gray-800 transition-colors">
                Pilih Jam Ngobrol (10 Menit)
            </a>
            <p class="text-xs text-gray-400 mt-4">Kalau lebih nyaman, Philip juga akan menghubungi kamu via WhatsApp.</p>

            <div class="mt-6">
                <a href="/tools/proteksi/" class="inline-block text-sm text-gray-500 hover:text-black underline transition-colors">
                    Atau hitung dulu Uang Pertanggungan yang kamu butuhkan
                </a>
            </div>
        </div>
    `;
    detailEl.classList.remove('hidden');
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    fireJiwaEvent('lead_captured', jiwaResults.totalScore, jiwaResults.category);
}

document.addEventListener('DOMContentLoaded', initJiwa);
