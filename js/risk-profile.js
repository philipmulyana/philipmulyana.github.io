(function () {
  'use strict';

  const engine = window.RiskProfileEngine;
  if (!engine) return;

  const state = { current: 0, answers: {} };
  const intro = document.getElementById('intro-panel');
  const form = document.getElementById('risk-profile-form');
  const results = document.getElementById('assessment-results');
  const startButton = document.getElementById('start-assessment');
  const fieldset = document.getElementById('question-fieldset');
  const dimension = document.getElementById('question-dimension');
  const title = document.getElementById('question-title');
  const context = document.getElementById('question-context');
  const options = document.getElementById('question-options');
  const previousButton = document.getElementById('previous-question');
  const nextButton = document.getElementById('next-question');
  const validation = document.getElementById('question-validation');
  const progress = document.getElementById('assessment-progress');
  const progressQuestion = document.getElementById('progress-question');
  const progressPercent = document.getElementById('progress-percent');
  const progressFill = document.getElementById('progress-fill');

  function selectedValue(questionId) {
    return Object.prototype.hasOwnProperty.call(state.answers, questionId) ? state.answers[questionId] : null;
  }

  function renderQuestion() {
    const question = engine.QUESTIONS[state.current];
    const total = engine.QUESTIONS.length;
    const percent = Math.round(((state.current + 1) / total) * 100);
    const existing = selectedValue(question.id);

    progress.setAttribute('aria-valuenow', String(state.current + 1));
    progressQuestion.textContent = `Pertanyaan ${state.current + 1} dari ${total}`;
    progressPercent.textContent = `${percent}%`;
    progressFill.style.width = `${percent}%`;
    dimension.textContent = engine.DIMENSIONS[question.dimension].shortLabel;
    title.textContent = question.question;
    context.textContent = question.context;
    validation.textContent = '';
    previousButton.disabled = state.current === 0;
    nextButton.textContent = state.current === total - 1 ? 'Lihat Hasil' : 'Berikutnya →';
    nextButton.disabled = existing === null;

    options.replaceChildren();
    question.options.forEach((option, index) => {
      const label = document.createElement('label');
      label.className = `option${existing === option.value ? ' selected' : ''}`;

      const input = document.createElement('input');
      input.type = 'radio';
      input.name = question.id;
      input.value = option.value;
      input.checked = existing === option.value;
      input.setAttribute('aria-describedby', 'question-context');

      const copy = document.createElement('span');
      copy.className = 'option-copy';
      copy.textContent = option.label;

      input.addEventListener('change', () => {
        state.answers[question.id] = option.value;
        options.querySelectorAll('.option').forEach((item) => item.classList.remove('selected'));
        label.classList.add('selected');
        nextButton.disabled = false;
        validation.textContent = '';
      });

      label.append(input, copy);
      options.append(label);

      if (index === 0 && existing === null) input.setAttribute('data-first-option', 'true');
    });

    title.setAttribute('tabindex', '-1');
    title.focus({ preventScroll: true });
  }

  function goPrevious() {
    if (state.current === 0) return;
    state.current -= 1;
    renderQuestion();
  }

  function goNext(event) {
    event.preventDefault();
    const question = engine.QUESTIONS[state.current];
    if (selectedValue(question.id) === null) {
      validation.textContent = 'Pilih satu jawaban sebelum melanjutkan.';
      const first = options.querySelector('input');
      if (first) first.focus();
      return;
    }

    if (state.current < engine.QUESTIONS.length - 1) {
      state.current += 1;
      renderQuestion();
      return;
    }

    showResults();
  }

  function createDimensionCard(item) {
    const card = document.createElement('article');
    card.className = 'dimension-card';
    card.innerHTML = `
      <div class="dimension-head">
        <span class="dimension-name">${item.shortLabel}</span>
        <span class="dimension-score">${item.score}/100</span>
      </div>
      <div class="mini-track" aria-hidden="true"><div class="mini-fill" style="width:${item.score}%"></div></div>
      <p class="dimension-desc">${item.description}</p>`;
    return card;
  }

  function showResults() {
    const result = engine.evaluate(state.answers);
    if (!result.complete) {
      validation.textContent = 'Ada jawaban yang belum lengkap. Periksa kembali assessment.';
      return;
    }

    form.classList.add('hidden');
    results.classList.remove('hidden');
    results.replaceChildren();

    const hero = document.createElement('section');
    hero.className = 'result-hero';
    hero.innerHTML = `
      <p class="result-kicker">Indikasi profil risiko</p>
      <div class="result-grid">
        <div class="score-ring" style="border-color:${result.category.color}">${result.score}</div>
        <div>
          <h1 class="result-label">${result.category.label}</h1>
          <p class="result-summary">${result.category.summary}</p>
          <span class="confidence">${result.confidence.label}</span>
        </div>
      </div>`;
    results.append(hero);

    const dimensionsSection = document.createElement('section');
    dimensionsSection.className = 'result-section';
    dimensionsSection.innerHTML = `
      <h2>Empat dimensi profilmu</h2>
      <p class="section-intro">Skor akhir tidak hanya merata-ratakan jawaban. Kapasitas keuangan serta waktu dan kebutuhan likuiditas dapat membatasi profil efektifmu.</p>
      <div class="dimension-list"></div>`;
    const dimensionList = dimensionsSection.querySelector('.dimension-list');
    Object.values(result.dimensions).forEach((item) => dimensionList.append(createDimensionCard(item)));
    if (result.constraintApplied) {
      const note = document.createElement('p');
      note.className = 'constraint-note';
      note.textContent = `Skor kecenderungan awalmu ${result.rawScore}/100, tetapi hasil efektif dibatasi menjadi ${result.score}/100 karena kapasitas atau waktu dan likuiditas memiliki batas yang lebih rendah.`;
      dimensionsSection.append(note);
    }
    results.append(dimensionsSection);

    const flagsSection = document.createElement('section');
    flagsSection.className = 'result-section';
    flagsSection.innerHTML = `
      <h2>Hal yang perlu diperhatikan</h2>
      <p class="section-intro">Perbedaan antardimensi sering kali lebih penting daripada label akhirnya.</p>
      <div class="flag-list"></div>`;
    const flagList = flagsSection.querySelector('.flag-list');
    if (result.flags.length) {
      result.flags.forEach((item) => {
        const flag = document.createElement('article');
        flag.className = 'flag';
        flag.innerHTML = `<strong>${item.title}</strong><p>${item.description}</p>`;
        flagList.append(flag);
      });
    } else {
      flagList.innerHTML = '<p class="no-flags">Tidak ada perbedaan besar antardimensi yang terdeteksi dari jawabanmu. Ini bukan berarti keputusan apa pun otomatis sesuai; tujuan dan karakteristik pilihan tetap perlu diperiksa.</p>';
    }
    results.append(flagsSection);

    const boundarySection = document.createElement('section');
    boundarySection.className = 'result-section';
    boundarySection.innerHTML = `
      <h2>Cara membaca hasil</h2>
      <p class="disclaimer">Assessment ini bersifat edukatif dan menggambarkan jawabanmu saat ini. Hasil dapat berubah ketika tujuan, pendapatan, tanggungan, kondisi pasar, horizon, atau kebutuhan likuiditas berubah. Hasil ini bukan rekomendasi produk, bukan penawaran, bukan diagnosis, dan tidak menjamin hasil investasi. Jangan mengambil keputusan hanya berdasarkan satu skor.</p>
      <p class="source-links">Kerangka faktor merujuk pada prinsip profil investor yang mencakup situasi keuangan, tujuan, pengalaman, horizon waktu, kebutuhan likuiditas, dan toleransi risiko. Baca juga <a href="https://www.investor.gov/introduction-investing/getting-started/assessing-your-risk-tolerance" target="_blank" rel="noopener noreferrer">Investor.gov tentang risk tolerance</a>, <a href="https://www.finra.org/rules-guidance/key-topics/suitability" target="_blank" rel="noopener noreferrer">FINRA tentang investment profile</a>, serta <a href="/privacy-policy/">Kebijakan Privasi</a>.</p>
      <div class="button-row result-actions">
        <button id="print-results" class="button" type="button">Cetak / Simpan PDF</button>
        <button id="restart-assessment" class="button secondary" type="button">Ulangi Assessment</button>
        <a href="/tools/" class="button secondary" style="text-decoration:none;display:inline-flex;align-items:center">Kembali ke Tools</a>
      </div>`;
    results.append(boundarySection);

    document.getElementById('print-results').addEventListener('click', () => window.print());
    document.getElementById('restart-assessment').addEventListener('click', restart);
    results.scrollIntoView({ behavior: 'smooth', block: 'start' });
    hero.setAttribute('tabindex', '-1');
    hero.focus({ preventScroll: true });
  }

  function restart() {
    state.current = 0;
    state.answers = {};
    results.classList.add('hidden');
    results.replaceChildren();
    form.classList.remove('hidden');
    renderQuestion();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  function start() {
    intro.classList.add('hidden');
    form.classList.remove('hidden');
    renderQuestion();
    form.scrollIntoView({ behavior: 'smooth', block: 'start' });
  }

  startButton.addEventListener('click', start);
  previousButton.addEventListener('click', goPrevious);
  form.addEventListener('submit', goNext);
})();
