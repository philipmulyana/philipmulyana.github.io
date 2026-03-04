const quizQuestions = [
    {
        id: 1,
        category: "emergency_fund",
        label: "Emergency Fund",
        question: "How many months of living expenses do you have saved in an emergency fund?",
        options: [
            { text: "Less than 1 month", score: 1 },
            { text: "1-3 months", score: 2 },
            { text: "3-6 months", score: 3 },
            { text: "More than 6 months", score: 4 }
        ]
    },
    {
        id: 2,
        category: "debt_management",
        label: "Debt Management",
        question: "What percentage of your monthly income goes toward debt repayment (excluding mortgage)?",
        options: [
            { text: "More than 40%", score: 1 },
            { text: "20-40%", score: 2 },
            { text: "10-20%", score: 3 },
            { text: "Less than 10% or no debt", score: 4 }
        ]
    },
    {
        id: 3,
        category: "insurance",
        label: "Insurance Coverage",
        question: "How would you describe your current insurance coverage (life, health, critical illness)?",
        options: [
            { text: "I have no insurance at all", score: 1 },
            { text: "I only have basic employer-provided coverage", score: 2 },
            { text: "I have personal health and life insurance", score: 3 },
            { text: "I have comprehensive coverage including critical illness and disability", score: 4 }
        ]
    },
    {
        id: 4,
        category: "retirement",
        label: "Retirement Planning",
        question: "How much are you actively saving or investing for retirement?",
        options: [
            { text: "Nothing beyond mandatory contributions (BPJS/Jamsostek)", score: 1 },
            { text: "I save occasionally but not consistently", score: 2 },
            { text: "I invest 10-20% of my income regularly", score: 3 },
            { text: "I invest more than 20% and have a clear retirement plan", score: 4 }
        ]
    },
    {
        id: 5,
        category: "budgeting",
        label: "Budgeting",
        question: "How do you manage your monthly budget?",
        options: [
            { text: "I don't track my spending at all", score: 1 },
            { text: "I have a rough idea but no formal budget", score: 2 },
            { text: "I use a budgeting method and track most expenses", score: 3 },
            { text: "I have a detailed budget, track everything, and review monthly", score: 4 }
        ]
    },
    {
        id: 6,
        category: "investment",
        label: "Investment Diversification",
        question: "How diversified are your investments?",
        options: [
            { text: "I don't have any investments", score: 1 },
            { text: "I only have savings deposits or one type of investment", score: 2 },
            { text: "I have 2-3 types (e.g., stocks, mutual funds, deposits)", score: 3 },
            { text: "I have a well-diversified portfolio across multiple asset classes", score: 4 }
        ]
    },
    {
        id: 7,
        category: "financial_literacy",
        label: "Financial Literacy",
        question: "How confident are you in understanding financial products (insurance policies, investment options, loan terms)?",
        options: [
            { text: "I find them very confusing and avoid reading the details", score: 1 },
            { text: "I understand the basics but rely on others for decisions", score: 2 },
            { text: "I can evaluate most products and make informed comparisons", score: 3 },
            { text: "I thoroughly understand financial products and can explain them to others", score: 4 }
        ]
    },
    {
        id: 8,
        category: "estate_planning",
        label: "Estate Planning",
        question: "Have you prepared for the transfer of your assets (will, beneficiary designations, power of attorney)?",
        options: [
            { text: "I haven't thought about it at all", score: 1 },
            { text: "I've thought about it but haven't taken any action", score: 2 },
            { text: "I have some beneficiary designations in place", score: 3 },
            { text: "I have a complete estate plan including a will and updated beneficiaries", score: 4 }
        ]
    }
];

const recommendationMap = {
    emergency_fund: "Build your emergency fund to cover at least 3-6 months of expenses. Start by automatically transferring a fixed amount each payday to a separate savings account.",
    debt_management: "Focus on reducing high-interest debt first. Consider the avalanche method (highest interest rate first) or snowball method (smallest balance first) to systematically eliminate debt.",
    insurance: "Review your insurance coverage gaps. At minimum, ensure you have adequate life insurance (especially with dependents) and health coverage beyond basic employer plans.",
    retirement: "Start or increase your retirement contributions. Even an additional 5% of income invested consistently can make a significant difference over 20-30 years thanks to compound growth.",
    budgeting: "Adopt a budgeting framework like 50/30/20 (needs/wants/savings). Track your spending for one month to identify where your money actually goes.",
    investment: "Diversify your investments across different asset classes. Consider mutual funds (reksa dana) as an accessible starting point if you're new to investing.",
    financial_literacy: "Invest time in financial education. Understanding the products you use (insurance policies, investment vehicles) protects you from unsuitable products and hidden fees.",
    estate_planning: "Start with the basics: update beneficiary designations on all accounts and insurance policies, and consider creating a will, especially if you have dependents."
};

let currentQuestion = 0;
let answers = [];

function initQuiz() {
    currentQuestion = 0;
    answers = new Array(quizQuestions.length).fill(null);
    renderQuestion();
    document.getElementById('quiz-results').classList.add('hidden');
    document.getElementById('quiz-container').classList.remove('hidden');
}

function renderQuestion() {
    const q = quizQuestions[currentQuestion];
    const total = quizQuestions.length;
    const progress = ((currentQuestion) / total) * 100;

    const container = document.getElementById('quiz-questions');
    container.innerHTML = `
        <!-- Progress bar -->
        <div class="mb-8">
            <div class="flex justify-between text-xs text-gray-400 mb-2">
                <span>Question ${currentQuestion + 1} of ${total}</span>
                <span>${Math.round(progress)}%</span>
            </div>
            <div class="w-full bg-gray-200 rounded-full h-2">
                <div class="h-2 rounded-full bg-black transition-all duration-300" style="width: ${progress}%"></div>
            </div>
        </div>

        <!-- Question -->
        <h3 class="text-xl font-bold mb-6">${q.question}</h3>

        <!-- Options -->
        <div class="space-y-3">
            ${q.options.map((opt, i) => `
                <button onclick="selectAnswer(${i}, ${opt.score})"
                    class="quiz-option w-full text-left px-5 py-4 rounded-xl border-2 transition-all text-sm
                    ${answers[currentQuestion] !== null && answers[currentQuestion].index === i
                        ? 'border-black bg-gray-50 font-medium'
                        : 'border-gray-200 hover:border-gray-400'}">
                    ${opt.text}
                </button>
            `).join('')}
        </div>

        <!-- Navigation -->
        <div class="flex justify-between mt-8">
            <button onclick="prevQuestion()"
                class="px-5 py-2 rounded-full text-sm font-medium transition-colors
                ${currentQuestion === 0 ? 'text-gray-300 cursor-not-allowed' : 'text-gray-500 hover:text-black'}"
                ${currentQuestion === 0 ? 'disabled' : ''}>
                Previous
            </button>
            <button id="quiz-next-btn" onclick="nextQuestion()"
                class="px-6 py-2 rounded-full text-sm font-medium transition-colors
                ${answers[currentQuestion] !== null
                    ? 'bg-black text-white hover:bg-gray-800'
                    : 'bg-gray-200 text-gray-400 cursor-not-allowed'}"
                ${answers[currentQuestion] === null ? 'disabled' : ''}>
                ${currentQuestion === total - 1 ? 'See Results' : 'Next'}
            </button>
        </div>
    `;
}

function selectAnswer(index, score) {
    const q = quizQuestions[currentQuestion];
    answers[currentQuestion] = { index, score, category: q.category, label: q.label };
    renderQuestion();
}

function nextQuestion() {
    if (answers[currentQuestion] === null) return;

    if (currentQuestion < quizQuestions.length - 1) {
        currentQuestion++;
        renderQuestion();
    } else {
        showResults();
    }
}

function prevQuestion() {
    if (currentQuestion > 0) {
        currentQuestion--;
        renderQuestion();
    }
}

function showResults() {
    document.getElementById('quiz-container').classList.add('hidden');

    const totalScore = answers.reduce((sum, a) => sum + (a ? a.score : 0), 0);
    const maxScore = quizQuestions.length * 4;

    let category, categoryColor, categoryBg, description;
    if (totalScore <= 12) {
        category = "Needs Attention";
        categoryColor = "text-red-600";
        categoryBg = "bg-red-50";
        description = "Your financial health needs significant improvement. Several critical areas require immediate attention.";
    } else if (totalScore <= 19) {
        category = "Fair";
        categoryColor = "text-yellow-600";
        categoryBg = "bg-yellow-50";
        description = "You have a foundation in place, but there are important gaps that could leave you vulnerable.";
    } else if (totalScore <= 26) {
        category = "Good";
        categoryColor = "text-blue-600";
        categoryBg = "bg-blue-50";
        description = "You're on the right track with solid financial habits. A few optimizations could strengthen your position further.";
    } else {
        category = "Excellent";
        categoryColor = "text-green-600";
        categoryBg = "bg-green-50";
        description = "Outstanding financial health. You've built a strong foundation across all key areas.";
    }

    // Find weak areas (score <= 2)
    const weakAreas = answers.filter(a => a && a.score <= 2);

    const resultsEl = document.getElementById('quiz-results');
    resultsEl.classList.remove('hidden');
    resultsEl.innerHTML = `
        <div class="space-y-6">
            <!-- Score -->
            <div class="text-center p-8 ${categoryBg} rounded-2xl">
                <p class="text-sm text-gray-500 uppercase tracking-wider mb-2">Your Score</p>
                <p class="text-5xl font-black">${totalScore}<span class="text-2xl text-gray-400">/${maxScore}</span></p>
                <p class="text-lg font-bold ${categoryColor} mt-2">${category}</p>
                <p class="text-sm text-gray-500 mt-2 max-w-md mx-auto">${description}</p>
            </div>

            <!-- Category breakdown -->
            <div class="space-y-3">
                <h4 class="font-bold text-sm uppercase tracking-wider text-gray-400">Breakdown</h4>
                ${answers.map(a => {
                    if (!a) return '';
                    const pct = (a.score / 4) * 100;
                    const barColor = a.score <= 1 ? 'bg-red-500' : a.score === 2 ? 'bg-yellow-500' : a.score === 3 ? 'bg-blue-500' : 'bg-green-500';
                    return `
                        <div class="flex items-center gap-3">
                            <span class="text-xs text-gray-500 w-36 shrink-0">${a.label}</span>
                            <div class="flex-1 bg-gray-200 rounded-full h-2">
                                <div class="${barColor} h-2 rounded-full transition-all duration-500" style="width: ${pct}%"></div>
                            </div>
                            <span class="text-xs font-medium w-6 text-right">${a.score}/4</span>
                        </div>
                    `;
                }).join('')}
            </div>

            ${weakAreas.length > 0 ? `
            <!-- Recommendations -->
            <div class="space-y-3">
                <h4 class="font-bold text-sm uppercase tracking-wider text-gray-400">Recommendations</h4>
                ${weakAreas.map(a => `
                    <div class="p-4 bg-gray-50 rounded-xl">
                        <p class="font-medium text-sm mb-1">${a.label}</p>
                        <p class="text-sm text-gray-500">${recommendationMap[a.category]}</p>
                    </div>
                `).join('')}
            </div>
            ` : `
            <div class="p-4 bg-green-50 rounded-xl text-center">
                <p class="text-sm text-green-700">Great job! You're strong across all areas. Keep up the excellent work.</p>
            </div>
            `}

            <!-- Actions -->
            <div class="flex flex-col sm:flex-row gap-3 pt-4">
                <a href="contact.html" class="flex-1 text-center bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Discuss your results with me
                </a>
                <button onclick="initQuiz()" class="flex-1 text-center border border-gray-300 px-6 py-3 rounded-full text-sm font-medium hover:border-black transition-colors">
                    Retake Quiz
                </button>
            </div>
        </div>
    `;

    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

// Auto-init if on the tools page
document.addEventListener('DOMContentLoaded', () => {
    if (document.getElementById('quiz-container')) {
        initQuiz();
    }
});
