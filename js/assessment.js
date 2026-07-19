// Assessment Kesiapan Pensiun. Scoring mirrors AI Lead Gen assessment_scorer.py.
// Skor = teaser (gratis). Rincian per area = dikunci di balik form (Philip 2026-07-19).

const ASSESSMENT_QUESTIONS = [
    {
        id: 'age',
        question: 'Berapa usia kamu sekarang?',
        options: [
            { label: '< 30 tahun', score: 10 },
            { label: '30 - 35 tahun', score: 10 },
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
        id: 'savings_rate',
        question: 'Berapa persen penghasilan yang kamu tabung/investasikan setiap bulan?',
        options: [
            { label: '0% (belum menabung/investasi)', score: 0 },
            { label: '< 10%', score: 5 },
            { label: '10 - 20%', score: 15 },
            { label: '20 - 30%', score: 20 },
            { label: '> 30%', score: 25 }
        ]
    },
    {
        id: 'emergency_fund',
        question: 'Sudah punya dana darurat?',
        options: [
            { label: 'Belum punya', score: 0 },
            { label: 'Punya, tapi < 6 bulan pengeluaran', score: 5 },
            { label: 'Sudah punya 6+ bulan pengeluaran', score: 15 }
        ]
    },
    {
        id: 'retirement_fund',
        question: 'Apakah kamu sudah punya dana khusus untuk pensiun?',
        options: [
            { label: 'Belum sama sekali', score: 0 },
            { label: 'Sudah mulai, tapi belum konsisten', score: 5 },
            { label: 'Sudah rutin setiap bulan', score: 15 }
        ]
    },
    {
        id: 'total_savings',
        question: 'Berapa total dana pensiun yang sudah terkumpul?',
        options: [
            { label: 'Belum ada', score: 0 },
            { label: '< Rp 50 juta', score: 5 },
            { label: 'Rp 50 - 200 juta', score: 10 },
            { label: 'Rp 200 juta - 1 miliar', score: 20 },
            { label: '> Rp 1 miliar', score: 25 }
        ]
    },
    {
        id: 'target',
        question: 'Apakah kamu sudah tahu berapa target dana pensiun yang dibutuhkan?',
        options: [
            { label: 'Belum pernah menghitung', score: 0 },
            { label: 'Punya gambaran kasar', score: 5 },
            { label: 'Sudah menghitung detail', score: 10 }
        ]
    },
    {
        id: 'health_insurance',
        question: 'Apakah kamu punya asuransi kesehatan?',
        options: [
            { label: 'Tidak punya', score: 0 },
            { label: 'Punya dari kantor saja', score: 3 },
            { label: 'Punya asuransi pribadi', score: 8 }
        ]
    },
    {
        id: 'life_insurance',
        question: 'Apakah kamu punya asuransi jiwa?',
        options: [
            { label: 'Tidak punya', score: 0 },
            { label: 'Punya, tapi tidak yakin cukup', score: 3 },
            { label: 'Punya dengan UP yang memadai', score: 8 }
        ]
    },
    {
        id: 'confidence',
        question: 'Seberapa yakin kamu bisa pensiun nyaman di usia 55?',
        options: [
            { label: 'Tidak yakin sama sekali', score: 0 },
            { label: 'Agak khawatir', score: 3 },
            { label: 'Cukup yakin', score: 7 },
            { label: 'Sangat yakin', score: 10 }
        ]
    }
];

const MAX_SCORE = 131;

const CATEGORIES = [
    { max: 32, label: 'Belum Siap', color: '#dc3545', bg: 'bg-red-50', border: 'border-red-200', text: 'text-red-700' },
    { max: 65, label: 'Perlu Perhatian', color: '#ffc107', bg: 'bg-yellow-50', border: 'border-yellow-200', text: 'text-yellow-700' },
    { max: 98, label: 'Di Jalur yang Tepat', color: '#28a745', bg: 'bg-green-50', border: 'border-green-200', text: 'text-green-700' },
    { max: 131, label: 'Siap', color: '#198754', bg: 'bg-emerald-50', border: 'border-emerald-200', text: 'text-emerald-700' }
];

let currentQuestion = 0;
let answers = {};

function initAssessment() {
    currentQuestion = 0;
    answers = {};
    renderQuestion();
}

function renderQuestion() {
    const container = document.getElementById('assessment-container');
    const q = ASSESSMENT_QUESTIONS[currentQuestion];
    const total = ASSESSMENT_QUESTIONS.length;
    const progress = ((currentQuestion) / total) * 100;

    container.innerHTML = `
        <!-- Progress -->
        <div class="mb-6">
            <div class="flex justify-between text-xs text-gray-400 mb-2">
                <span>Pertanyaan ${currentQuestion + 1} dari ${total}</span>
                <span>${Math.round(progress)}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-1.5">
                <div class="bg-black rounded-full h-1.5 transition-all duration-300" style="width: ${progress}%"></div>
            </div>
        </div>

        <!-- Question -->
        <h3 class="text-lg font-bold mb-5">${q.question}</h3>

        <!-- Options -->
        <div class="space-y-2">
            ${q.options.map((opt, i) => `
                <button onclick="selectAnswer('${q.id}', ${opt.score}, ${i})"
                    class="w-full text-left px-4 py-3 rounded-xl border border-gray-200 hover:border-black hover:bg-gray-50 transition-colors text-sm ${answers[q.id] !== undefined && answers[q.id].index === i ? 'border-black bg-gray-50 font-medium' : ''}">
                    ${opt.label}
                </button>
            `).join('')}
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-6">
            ${currentQuestion > 0 ? `
                <button onclick="prevQuestion()" class="text-sm text-gray-400 hover:text-black transition-colors">
                    &larr; Sebelumnya
                </button>
            ` : '<div></div>'}
            <div></div>
        </div>
    `;
}

function selectAnswer(questionId, score, index) {
    answers[questionId] = { score, index };

    // Brief delay for visual feedback then advance
    setTimeout(() => {
        if (currentQuestion < ASSESSMENT_QUESTIONS.length - 1) {
            currentQuestion++;
            renderQuestion();
        } else {
            showResults();
        }
    }, 200);
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

function getCategory(score) {
    for (const cat of CATEGORIES) {
        if (score <= cat.max) return cat;
    }
    return CATEGORIES[CATEGORIES.length - 1];
}

// --- Findings: DESKRIPSI POSISI, bukan rekomendasi ---
// Aturan Philip (locked): output klien-facing cuma boleh gambarin posisi.
// Resep/rekomendasi = prerogatif Philip live pas konsultasi. JANGAN tambah
// kalimat yang nyuruh ("mulai...", "prioritaskan...", "pertimbangkan...").
function generateFindings() {
    const out = [];

    if (answers.emergency_fund && answers.emergency_fund.score === 0) {
        out.push('Kamu belum punya dana darurat. Artinya kalau ada kejadian tak terduga, dana pensiun yang sedang dikumpulkan berisiko kepakai duluan.');
    } else if (answers.emergency_fund && answers.emergency_fund.score === 5) {
        out.push('Dana darurat kamu ada, tapi belum sampai 6 bulan pengeluaran. Bantalannya masih tipis dibanding standar umum.');
    }

    if (answers.savings_rate && answers.savings_rate.score === 0) {
        out.push('Saat ini belum ada penghasilan yang disisihkan rutin tiap bulan. Ini variabel yang paling besar pengaruhnya ke hasil akhir dana pensiun.');
    } else if (answers.savings_rate && answers.savings_rate.score === 5) {
        out.push('Porsi yang kamu sisihkan masih di bawah 10% dari penghasilan.');
    }

    if (answers.retirement_fund && answers.retirement_fund.score === 0) {
        out.push('Belum ada dana yang dipisahkan khusus untuk pensiun. Tanpa pos terpisah, dana pensiun biasanya ikut terpakai untuk kebutuhan lain.');
    }

    if (answers.target && answers.target.score === 0) {
        out.push('Kamu belum pernah menghitung target dana pensiun. Jadi belum ada angka pembanding untuk menilai posisi sekarang.');
    }

    if (answers.health_insurance && answers.health_insurance.score === 0) {
        out.push('Belum ada asuransi kesehatan. Biaya medis besar adalah salah satu penyebab paling umum tabungan jangka panjang terkuras.');
    } else if (answers.health_insurance && answers.health_insurance.score === 3) {
        out.push('Proteksi kesehatan kamu saat ini menempel pada kantor. Manfaat ini umumnya berhenti ketika kamu pensiun atau pindah kerja.');
    }

    if (answers.life_insurance && answers.life_insurance.score === 0) {
        out.push('Belum ada asuransi jiwa. Kalau ada orang yang bergantung pada penghasilan kamu, risiko itu saat ini belum tertutup.');
    }

    if (answers.confidence && answers.confidence.score <= 3) {
        out.push('Kamu sendiri belum yakin bisa pensiun nyaman di usia 55. Rasa ini biasanya muncul karena angkanya memang belum pernah dipetakan.');
    }

    return out.slice(0, 4);
}

// --- Funnel telemetry (samain pola dengan retirement.js) ---
const WEBSITE_CALC_ENDPOINT = 'https://philip-mulyana--ai-lead-gen-gateway.modal.run/campaign';

function fireAssessmentEvent(stage, score, category) {
    try {
        fetch(WEBSITE_CALC_ENDPOINT, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                action: 'funnel_event',
                calculator: 'assessment',
                stage,
                score,
                category,
            }),
            keepalive: true,
        }).catch(() => { /* non-blocking */ });
    } catch (e) { /* non-blocking */ }
}

let assessmentResults = null;

function showResults() {
    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.score, 0);
    const percentage = Math.round((totalScore / MAX_SCORE) * 100);
    const category = getCategory(totalScore);
    const findings = generateFindings();

    assessmentResults = { totalScore, percentage, category: category.label, findings };
    fireAssessmentEvent('result_shown', totalScore, category.label);

    const container = document.getElementById('assessment-container');
    const resultsEl = document.getElementById('assessment-results');

    // Hide questions, show results
    container.innerHTML = `
        <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background-color: ${category.color}20">
                <svg class="w-8 h-8" fill="none" stroke="${category.color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p class="text-sm text-gray-400 mb-1">Assessment selesai.</p>
            <p class="text-sm text-gray-500">Hasilnya ada di bawah.</p>
        </div>
    `;

    resultsEl.innerHTML = `
        <!-- Skor: TEASER, keliatan gratis -->
        <div class="text-center mb-8">
            <p class="text-6xl font-black" style="color: ${category.color}">${totalScore}</p>
            <p class="text-sm text-gray-400 mt-1">dari ${MAX_SCORE} poin</p>

            <div class="w-full bg-gray-200 rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div class="rounded-full h-3 transition-all duration-500" style="width: ${percentage}%; background-color: ${category.color}"></div>
            </div>

            <div class="inline-block mt-4 px-4 py-1.5 rounded-full text-sm font-bold" style="background-color: ${category.color}20; color: ${category.color}">
                ${category.label}
            </div>
        </div>

        <!-- GATE: rincian dikunci di balik form -->
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

            <!-- Disclosure: transparansi SIAPA sebelum tukar kontak (Philip locked 2026-07-19) -->
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

            <!-- Consent -->
            <label class="flex items-start gap-3 cursor-pointer mb-5 p-4 bg-white rounded-xl border border-gray-200 hover:border-gray-400 transition-colors">
                <input type="checkbox" id="as-consent" class="mt-0.5 w-5 h-5 accent-black flex-shrink-0" onchange="toggleAssessConsent()">
                <span class="text-sm text-gray-700 leading-relaxed">
                    Saya setuju Philip menghubungi saya via WhatsApp untuk membahas hasil assessment ini.
                </span>
            </label>

            <!-- Form -->
            <div id="assess-form" class="space-y-3 max-w-md mx-auto opacity-40 pointer-events-none transition-opacity">
                <input type="text" id="as-nama" placeholder="Nama kamu"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <input type="email" id="as-email" placeholder="Email kamu"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <input type="tel" id="as-whatsapp" placeholder="Nomor WhatsApp (e.g. 081234567890)"
                    class="w-full px-4 py-3 rounded-xl border border-gray-200 focus:border-black focus:ring-0 focus:outline-none transition-colors text-sm">
                <button onclick="revealAssessmentDetail()" id="as-submit"
                    class="w-full bg-black text-white py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Lihat Rincian Skor Saya
                </button>
            </div>
            <p id="assess-error" class="text-red-500 text-xs mt-2 text-center hidden"></p>
        </div>

        <!-- Rincian: dibuka setelah form -->
        <div id="assess-detail" class="hidden"></div>
    `;

    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    // Track kalau gate keliatan di layar
    const gateEl = document.getElementById('assess-gate');
    if (gateEl && 'IntersectionObserver' in window) {
        const obs = new IntersectionObserver((entries) => {
            if (entries[0].isIntersecting) {
                fireAssessmentEvent('gate_seen', totalScore, category.label);
                obs.disconnect();
            }
        }, { threshold: 0.3 });
        obs.observe(gateEl);
    }
}

function isValidEmail(email) {
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email);
}

function toggleAssessConsent() {
    const checked = document.getElementById('as-consent').checked;
    const form = document.getElementById('assess-form');
    if (!form) return;
    if (checked) {
        form.classList.remove('opacity-40', 'pointer-events-none');
        if (assessmentResults && !window._assessConsentFired) {
            window._assessConsentFired = true;
            fireAssessmentEvent('consent_ticked', assessmentResults.totalScore, assessmentResults.category);
        }
    } else {
        form.classList.add('opacity-40', 'pointer-events-none');
    }
}

function revealAssessmentDetail() {
    const consentEl = document.getElementById('as-consent');
    const errorEl = document.getElementById('assess-error');

    if (!consentEl || !consentEl.checked) {
        errorEl.textContent = 'Mohon centang persetujuan di atas dulu sebelum mengirim data.';
        errorEl.classList.remove('hidden');
        return;
    }

    const nama = document.getElementById('as-nama').value.trim();
    const email = document.getElementById('as-email').value.trim();
    const whatsapp = document.getElementById('as-whatsapp').value.trim();
    const submitBtn = document.getElementById('as-submit');

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
    if (!assessmentResults) return;

    submitBtn.disabled = true;
    submitBtn.textContent = 'Mengirim...';

    fetch(WEBSITE_CALC_ENDPOINT, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
            action: 'website_calc_assessment',
            calculator: 'assessment',
            nama,
            email,
            whatsapp,
            score: assessmentResults.totalScore,
            max_score: MAX_SCORE,
            category: assessmentResults.category,
            is_agent: false,
        }),
        keepalive: true,
    }).catch(() => { /* non-blocking */ });

    document.getElementById('assess-gate').style.display = 'none';

    const f = assessmentResults.findings;
    const detailEl = document.getElementById('assess-detail');
    detailEl.innerHTML = `
        <div class="mb-8">
            <h3 class="text-lg font-bold mb-4">Yang menentukan skor kamu</h3>
            <div class="space-y-3">
                ${f.map((item, i) => `
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
                <a href="tool-retirement.html" class="inline-block text-sm text-gray-500 hover:text-black underline transition-colors">
                    Atau hitung dulu target dana pensiun kamu
                </a>
            </div>
        </div>
    `;
    detailEl.classList.remove('hidden');
    detailEl.scrollIntoView({ behavior: 'smooth', block: 'start' });

    fireAssessmentEvent('lead_captured', assessmentResults.totalScore, assessmentResults.category);
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initAssessment);
