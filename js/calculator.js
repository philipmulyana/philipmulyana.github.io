const idrFormat = new Intl.NumberFormat('id-ID', {
    style: 'currency',
    currency: 'IDR',
    maximumFractionDigits: 0
});

function formatIDR(amount) {
    return idrFormat.format(amount);
}

function calculateInsuranceNeeds() {
    const monthlyIncome = parseFloat(document.getElementById('calc-income').value) || 0;
    const dependents = parseInt(document.getElementById('calc-dependents').value) || 0;
    const totalDebt = parseFloat(document.getElementById('calc-debt').value) || 0;
    const currentSavings = parseFloat(document.getElementById('calc-savings').value) || 0;
    const currentCoverage = parseFloat(document.getElementById('calc-coverage').value) || 0;

    if (monthlyIncome === 0) {
        alert('Please enter your monthly income.');
        return;
    }

    const annualIncome = monthlyIncome * 12;

    // DIME Method
    const incomeReplacement = annualIncome * 10;          // 10 years of income
    const dependentAllowance = dependents * annualIncome * 2; // 2 years per dependent
    const debtCoverage = totalDebt;                        // Full debt amount
    const finalExpenses = monthlyIncome * 6;               // 6 months buffer

    const grossNeed = incomeReplacement + dependentAllowance + debtCoverage + finalExpenses;
    const recommendedCoverage = Math.max(grossNeed - currentSavings, 0);
    const coverageGap = recommendedCoverage - currentCoverage;

    // Determine status
    let gapStatus, gapColor, gapLabel;
    if (coverageGap > 0) {
        gapStatus = 'underinsured';
        gapColor = 'text-red-600';
        gapLabel = 'Underinsured';
    } else if (coverageGap === 0) {
        gapStatus = 'adequate';
        gapColor = 'text-green-600';
        gapLabel = 'Adequately Covered';
    } else {
        gapStatus = 'well-covered';
        gapColor = 'text-green-600';
        gapLabel = 'Well Covered';
    }

    const gapPercentage = recommendedCoverage > 0
        ? Math.round((currentCoverage / recommendedCoverage) * 100)
        : 100;

    // Render results
    const resultsEl = document.getElementById('calc-results');
    resultsEl.classList.remove('hidden');
    resultsEl.innerHTML = `
        <div class="space-y-6">
            <div class="text-center p-6 bg-gray-50 rounded-2xl">
                <p class="text-sm text-gray-500 uppercase tracking-wider mb-1">Recommended Coverage</p>
                <p class="text-3xl md:text-4xl font-black">${formatIDR(recommendedCoverage)}</p>
            </div>

            <div class="text-center p-4 rounded-xl ${coverageGap > 0 ? 'bg-red-50' : 'bg-green-50'}">
                <p class="text-sm text-gray-500 mb-1">Coverage Gap</p>
                <p class="text-2xl font-bold ${gapColor}">${coverageGap > 0 ? '+' : ''}${formatIDR(Math.abs(coverageGap))}</p>
                <p class="text-sm ${gapColor} font-medium mt-1">${gapLabel} (${gapPercentage}% covered)</p>
            </div>

            <!-- Progress bar -->
            <div class="w-full bg-gray-200 rounded-full h-3">
                <div class="h-3 rounded-full transition-all duration-500 ${gapPercentage >= 100 ? 'bg-green-500' : gapPercentage >= 60 ? 'bg-yellow-500' : 'bg-red-500'}" style="width: ${Math.min(gapPercentage, 100)}%"></div>
            </div>

            <!-- Breakdown table -->
            <div class="overflow-hidden rounded-xl border border-gray-200">
                <table class="w-full text-sm">
                    <tbody>
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-3 text-gray-500">Income Replacement (10 years)</td>
                            <td class="px-4 py-3 text-right font-medium">${formatIDR(incomeReplacement)}</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-3 text-gray-500">Dependent Allowance (${dependents} dependents)</td>
                            <td class="px-4 py-3 text-right font-medium">${formatIDR(dependentAllowance)}</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-3 text-gray-500">Debt Coverage</td>
                            <td class="px-4 py-3 text-right font-medium">${formatIDR(debtCoverage)}</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-3 text-gray-500">Final Expenses (6 months)</td>
                            <td class="px-4 py-3 text-right font-medium">${formatIDR(finalExpenses)}</td>
                        </tr>
                        <tr class="border-b border-gray-200 bg-gray-50">
                            <td class="px-4 py-3 font-bold">Gross Need</td>
                            <td class="px-4 py-3 text-right font-bold">${formatIDR(grossNeed)}</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-3 text-gray-500">Less: Current Savings</td>
                            <td class="px-4 py-3 text-right font-medium text-green-600">(${formatIDR(currentSavings)})</td>
                        </tr>
                        <tr class="border-b border-gray-200 bg-gray-50">
                            <td class="px-4 py-3 font-bold">Recommended Coverage</td>
                            <td class="px-4 py-3 text-right font-bold">${formatIDR(recommendedCoverage)}</td>
                        </tr>
                        <tr class="border-b border-gray-100">
                            <td class="px-4 py-3 text-gray-500">Your Current Coverage</td>
                            <td class="px-4 py-3 text-right font-medium">${formatIDR(currentCoverage)}</td>
                        </tr>
                        <tr class="bg-gray-50">
                            <td class="px-4 py-3 font-bold">Coverage Gap</td>
                            <td class="px-4 py-3 text-right font-bold ${gapColor}">${coverageGap > 0 ? '+' : ''}${formatIDR(Math.abs(coverageGap))}</td>
                        </tr>
                    </tbody>
                </table>
            </div>

            <div class="text-center pt-4">
                <a href="contact.html" class="inline-flex items-center bg-black text-white px-6 py-3 rounded-full text-sm font-medium hover:bg-gray-800 transition-colors">
                    Consult with me for a personalized plan
                    <svg class="w-4 h-4 ml-2" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path stroke-linecap="round" stroke-linejoin="round" stroke-width="2" d="M17 8l4 4m0 0l-4 4m4-4H3"/></svg>
                </a>
            </div>
        </div>
    `;

    // Scroll to results
    resultsEl.scrollIntoView({ behavior: 'smooth', block: 'start' });
}
