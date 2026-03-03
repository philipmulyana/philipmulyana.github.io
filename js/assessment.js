// Retirement Readiness Assessment — based on AI Lead Gen assessment_scorer.py

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

function generateRecommendations() {
    const recs = [];

    // Emergency fund
    if (answers.emergency_fund && answers.emergency_fund.score === 0) {
        recs.push('Prioritas pertama: bangun dana darurat minimal 6 bulan pengeluaran. Ini fondasi sebelum investasi apapun.');
    } else if (answers.emergency_fund && answers.emergency_fund.score === 5) {
        recs.push('Dana darurat kamu belum cukup 6 bulan pengeluaran. Lengkapi dulu sebelum fokus investasi jangka panjang.');
    }

    // Savings rate
    if (answers.savings_rate && answers.savings_rate.score === 0) {
        recs.push('Mulai sisihkan minimal 10% dari penghasilan setiap bulan. Automasi transfer di tanggal gajian supaya konsisten.');
    } else if (answers.savings_rate && answers.savings_rate.score === 5) {
        recs.push('Tabungan/investasi masih di bawah 10%. Coba naikkan bertahap — target idealnya 20-30% dari penghasilan.');
    }

    // Retirement fund
    if (answers.retirement_fund && answers.retirement_fund.score === 0) {
        recs.push('Kamu belum mulai menyiapkan dana pensiun secara khusus. Semakin cepat mulai, semakin ringan bebannya berkat compound interest.');
    }

    // Target
    if (answers.target && answers.target.score === 0) {
        recs.push('Kamu belum pernah menghitung target dana pensiun. Coba gunakan Kalkulator Pensiun kami untuk tahu angka pastinya.');
    }

    // Health insurance
    if (answers.health_insurance && answers.health_insurance.score === 0) {
        recs.push('Tanpa asuransi kesehatan, satu kejadian medis bisa menghabiskan tabungan bertahun-tahun. Ini prioritas tinggi.');
    } else if (answers.health_insurance && answers.health_insurance.score === 3) {
        recs.push('Asuransi dari kantor akan hilang saat kamu pensiun atau pindah kerja. Pertimbangkan asuransi kesehatan pribadi.');
    }

    // Life insurance
    if (answers.life_insurance && answers.life_insurance.score === 0) {
        recs.push('Jika ada yang bergantung pada penghasilan kamu, asuransi jiwa bukan pilihan — itu keharusan.');
    }

    // Confidence
    if (answers.confidence && answers.confidence.score <= 3) {
        recs.push('Kabar baiknya: dengan strategi yang tepat dan konsisten, kamu masih punya waktu untuk mempersiapkan pensiun yang nyaman.');
    }

    return recs.slice(0, 3);
}

function showResults() {
    const totalScore = Object.values(answers).reduce((sum, a) => sum + a.score, 0);
    const percentage = Math.round((totalScore / MAX_SCORE) * 100);
    const category = getCategory(totalScore);
    const recommendations = generateRecommendations();

    const container = document.getElementById('assessment-container');
    const resultsEl = document.getElementById('assessment-results');

    // Hide questions, show results
    container.innerHTML = `
        <div class="text-center">
            <div class="w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4" style="background-color: ${category.color}20">
                <svg class="w-8 h-8" fill="none" stroke="${category.color}" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
            </div>
            <p class="text-sm text-gray-400 mb-1">Assessment selesai!</p>
            <p class="text-sm text-gray-500">Lihat hasil lengkap di bawah.</p>
        </div>
    `;

    resultsEl.innerHTML = `
        <!-- Score -->
        <div class="text-center mb-8">
            <p class="text-6xl font-black" style="color: ${category.color}">${totalScore}</p>
            <p class="text-sm text-gray-400 mt-1">dari ${MAX_SCORE} poin</p>

            <!-- Progress bar -->
            <div class="w-full bg-gray-200 rounded-full h-3 mt-4 max-w-xs mx-auto">
                <div class="rounded-full h-3 transition-all duration-500" style="width: ${percentage}%; background-color: ${category.color}"></div>
            </div>

            <!-- Category badge -->
            <div class="inline-block mt-4 px-4 py-1.5 rounded-full text-sm font-bold" style="background-color: ${category.color}20; color: ${category.color}">
                ${category.label}
            </div>
        </div>

        <!-- Recommendations -->
        ${recommendations.length > 0 ? `
        <div class="mb-8">
            <h3 class="text-lg font-bold mb-4">Rekomendasi untuk Kamu</h3>
            <div class="space-y-3">
                ${recommendations.map((rec, i) => `
                    <div class="flex gap-3 bg-gray-50 rounded-xl p-4">
                        <div class="w-6 h-6 bg-black text-white rounded-full flex items-center justify-center text-xs font-bold shrink-0 mt-0.5">${i + 1}</div>
                        <p class="text-sm text-gray-600 leading-relaxed">${rec}</p>
                    </div>
                `).join('')}
            </div>
        </div>
        ` : ''}

        <!-- Next steps -->
        <div class="border-t border-gray-100 pt-6">
            <div class="flex flex-col sm:flex-row gap-3">
                <a href="tool-retirement.html" class="flex-1 text-center border border-gray-200 text-black px-6 py-3 rounded-full text-sm font-medium hover:border-black transition-colors">
                    Hitung Target Pensiun
                </a>
                <a href="services.html#consultation" class="flex-1 text-center bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Book a Call
                </a>
            </div>
            <button onclick="initAssessment(); document.getElementById('assessment-results').classList.add('hidden');"
                class="w-full text-center text-sm text-gray-400 hover:text-black mt-4 transition-colors">
                Ulangi Assessment
            </button>
        </div>
    `;

    resultsEl.classList.remove('hidden');
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Initialize on load
document.addEventListener('DOMContentLoaded', initAssessment);
