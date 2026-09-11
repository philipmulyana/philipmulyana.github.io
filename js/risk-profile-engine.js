(function (root, factory) {
  const api = factory();
  if (typeof module === 'object' && module.exports) module.exports = api;
  root.RiskProfileEngine = api;
})(typeof globalThis !== 'undefined' ? globalThis : this, function () {
  'use strict';

  const DIMENSIONS = {
    willingness: {
      label: 'Kenyamanan menghadapi risiko',
      shortLabel: 'Kenyamanan',
      description: 'Seberapa nyaman kamu menghadapi perubahan nilai dan ketidakpastian tanpa mengambil keputusan impulsif.',
      weight: 0.40,
    },
    capacity: {
      label: 'Kapasitas menanggung risiko',
      shortLabel: 'Kapasitas',
      description: 'Seberapa besar kondisi keuanganmu mampu menyerap kerugian tanpa mengganggu kebutuhan penting.',
      weight: 0.30,
    },
    horizon: {
      label: 'Waktu dan kebutuhan likuiditas',
      shortLabel: 'Waktu & likuiditas',
      description: 'Berapa lama dana dapat ditempatkan dan seberapa fleksibel waktu penggunaannya.',
      weight: 0.25,
    },
    knowledge: {
      label: 'Pemahaman dan pengalaman',
      shortLabel: 'Pemahaman',
      description: 'Seberapa baik kamu memahami hubungan risiko dan hasil serta mengenali responsmu sendiri.',
      weight: 0.05,
    },
  };

  const scale = (labels) => labels.map((label, index) => ({
    value: String(index + 1),
    label,
    score: index + 1,
  }));

  const QUESTIONS = [
    {
      id: 'loss-reaction',
      dimension: 'willingness',
      question: 'Jika nilai dana turun sekitar 15% dalam beberapa bulan, respons yang paling mungkin kamu lakukan?',
      context: 'Bayangkan tujuan dan alasan awal penempatan dana belum berubah.',
      options: [
        ...scale(['Menarik seluruh dana secepatnya', 'Menarik sebagian besar untuk menghentikan penurunan', 'Menunggu sambil mencari informasi tambahan', 'Tetap mengikuti rencana yang sudah dibuat', 'Tetap mengikuti rencana dan siap menambah secara terukur']),
        { value: 'unknown', label: 'Belum tahu—saya belum pernah menghadapi situasi seperti ini', score: 3, uncertain: true },
      ],
    },
    {
      id: 'outcome-range',
      dimension: 'willingness',
      question: 'Untuk mencapai tujuan, pola hasil mana yang paling nyaman buat kamu?',
      context: 'Tidak ada pilihan yang otomatis lebih baik.',
      options: [
        ...scale(['Hasil kecil tetapi perubahan nilainya sangat terbatas', 'Hasil cenderung terbatas dengan sedikit perubahan nilai', 'Keseimbangan antara kestabilan dan pertumbuhan', 'Potensi pertumbuhan lebih besar dengan perubahan nilai yang nyata', 'Potensi pertumbuhan tinggi walau perubahan nilainya dapat sangat besar']),
        { value: 'unknown', label: 'Belum tahu cara membandingkannya', score: 3, uncertain: true },
      ],
    },
    {
      id: 'negative-period',
      dimension: 'willingness',
      question: 'Bagaimana perasaanmu jika hasil investasi negatif selama satu tahun?',
      context: 'Tujuannya menilai kenyamanan, bukan menguji keberanian.',
      options: [
        ...scale(['Sangat tidak nyaman dan ingin berhenti', 'Tidak nyaman; kemungkinan besar mengurangi posisi', 'Cemas, tetapi akan mengecek kembali rencana', 'Cukup tenang selama alasan awal masih berlaku', 'Siap menerima periode negatif sebagai bagian dari rencana jangka panjang']),
        { value: 'unknown', label: 'Sulit membayangkan karena belum pernah mengalaminya', score: 3, uncertain: true },
      ],
    },
    {
      id: 'priority',
      dimension: 'willingness',
      question: 'Saat harus memilih, mana yang paling penting untukmu?',
      context: 'Pilih yang paling mendekati sikapmu sekarang.',
      options: scale(['Menjaga nilai dana sebisa mungkin', 'Lebih mengutamakan kestabilan daripada pertumbuhan', 'Menyeimbangkan kestabilan dan pertumbuhan', 'Lebih mengutamakan pertumbuhan dan menerima fluktuasi', 'Mengejar pertumbuhan jangka panjang dan menerima fluktuasi besar']),
    },
    {
      id: 'goal-impact',
      dimension: 'capacity',
      question: 'Jika dana ini kehilangan 20% nilainya, seberapa besar dampaknya terhadap tujuanmu?',
      context: 'Nilai dampaknya terhadap rencana nyata, bukan hanya perasaan.',
      options: scale(['Tujuan utama gagal atau kebutuhan penting tidak terpenuhi', 'Tujuan harus berubah besar atau tertunda lama', 'Tujuan perlu disesuaikan secara berarti', 'Ada penyesuaian, tetapi tujuan utama masih mungkin berjalan', 'Dampaknya terbatas karena ada cadangan dan fleksibilitas yang memadai']),
    },
    {
      id: 'emergency-buffer',
      dimension: 'capacity',
      question: 'Di luar dana ini, seberapa kuat cadangan untuk kebutuhan tak terduga?',
      context: 'Gunakan pengeluaran rutin keluarga sebagai acuan.',
      options: scale(['Belum ada cadangan', 'Kurang dari 3 bulan pengeluaran', 'Sekitar 3–6 bulan pengeluaran', 'Sekitar 6–12 bulan pengeluaran', 'Lebih dari 12 bulan pengeluaran']),
    },
    {
      id: 'cashflow-stability',
      dimension: 'capacity',
      question: 'Bagaimana kondisi pendapatan dan kewajiban rutinmu saat ini?',
      context: 'Pertimbangkan kestabilan penghasilan, cicilan, dan tanggungan.',
      options: [
        ...scale(['Sering defisit atau kewajiban sulit dipenuhi', 'Sangat ketat dan mudah terganggu', 'Cukup stabil tetapi ruang cadangannya terbatas', 'Stabil dengan ruang cadangan yang cukup', 'Sangat stabil dengan ruang cadangan yang kuat']),
        { value: 'unknown', label: 'Belum pernah menghitungnya dengan jelas', score: 3, uncertain: true },
      ],
    },
    {
      id: 'loss-recovery',
      dimension: 'capacity',
      question: 'Jika terjadi kerugian, seberapa besar kemampuanmu menambah waktu atau dana untuk pulih?',
      context: 'Jawab berdasarkan kapasitas realistis, bukan harapan.',
      options: scale(['Tidak ada ruang untuk menambah waktu atau dana', 'Ruangnya sangat kecil', 'Ada sedikit fleksibilitas', 'Cukup fleksibel', 'Sangat fleksibel dan tujuan tidak bergantung pada satu sumber dana']),
    },
    {
      id: 'time-to-use',
      dimension: 'horizon',
      question: 'Kapan sebagian besar dana ini akan mulai digunakan?',
      context: 'Gunakan tanggal kebutuhan terdekat yang penting.',
      options: scale(['Kurang dari 1 tahun', '1–3 tahun', '3–5 tahun', '5–10 tahun', 'Lebih dari 10 tahun']),
    },
    {
      id: 'date-flexibility',
      dimension: 'horizon',
      question: 'Seberapa fleksibel waktu penggunaan dana tersebut?',
      context: 'Misalnya apakah kebutuhan dapat ditunda jika kondisi tidak mendukung.',
      options: scale(['Harus tersedia pada tanggal tertentu', 'Hanya bisa ditunda beberapa bulan', 'Bisa ditunda sampai sekitar 1 tahun', 'Bisa ditunda 1–3 tahun', 'Sangat fleksibel dan dapat ditunda lebih dari 3 tahun']),
    },
    {
      id: 'liquidity-need',
      dimension: 'horizon',
      question: 'Seberapa mungkin kamu perlu mencairkan dana lebih awal?',
      context: 'Jangan memasukkan dana darurat yang memang sudah dipisahkan.',
      options: scale(['Sangat mungkin sewaktu-waktu', 'Cukup mungkin dalam 1 tahun', 'Mungkin, tetapi tidak dalam waktu dekat', 'Kecil kemungkinan', 'Hampir tidak mungkin sebelum tujuan tiba']),
    },
    {
      id: 'near-term-share',
      dimension: 'horizon',
      question: 'Berapa bagian dari dana ini yang dibutuhkan dalam 3 tahun ke depan?',
      context: 'Jawab sebagai proporsi dari dana yang sedang dinilai.',
      options: scale(['Hampir seluruhnya', 'Lebih dari separuh', 'Sekitar seperempat sampai separuh', 'Kurang dari seperempat', 'Tidak ada']),
    },
    {
      id: 'risk-knowledge',
      dimension: 'knowledge',
      question: 'Seberapa baik kamu memahami hubungan antara potensi hasil dan risiko kerugian?',
      context: 'Pilih berdasarkan kemampuan menjelaskan dengan kata-katamu sendiri.',
      options: scale(['Belum memahami', 'Tahu istilahnya tetapi belum bisa menjelaskan', 'Memahami prinsip dasarnya', 'Dapat membandingkan risiko beberapa pilihan', 'Dapat menjelaskan risiko, biaya, likuiditas, dan ketidakpastian hasil']),
    },
    {
      id: 'experience',
      dimension: 'knowledge',
      question: 'Seberapa banyak pengalamanmu menghadapi perubahan nilai investasi?',
      context: 'Pengalaman tidak otomatis berarti profil risiko lebih tinggi.',
      options: scale(['Belum pernah', 'Kurang dari 1 tahun', '1–3 tahun tetapi belum melewati penurunan besar', 'Lebih dari 3 tahun dan pernah menghadapi penurunan', 'Sudah melewati beberapa siklus naik-turun dan mengevaluasi keputusan sendiri']),
    },
    {
      id: 'decision-process',
      dimension: 'knowledge',
      question: 'Sebelum mengambil keputusan, apa yang biasanya kamu lakukan?',
      context: 'Pilih kebiasaan yang paling sering terjadi.',
      options: scale(['Mengikuti ajakan atau tren tanpa memeriksa', 'Melihat potensi hasil terutama dari materi promosi', 'Membaca ringkasan dan bertanya pada orang lain', 'Membaca dokumen, biaya, risiko, dan aturan pencairan', 'Membandingkan sumber resmi, skenario buruk, dan kesesuaian dengan tujuan']),
    },
  ];

  const CATEGORIES = [
    {
      id: 'sangat-hati-hati', min: 0, max: 24, label: 'Sangat Hati-hati', color: '#2563eb',
      summary: 'Kestabilan nilai, akses dana, dan perlindungan terhadap kerugian menjadi batas utama saat ini.',
    },
    {
      id: 'hati-hati', min: 25, max: 44, label: 'Hati-hati', color: '#0891b2',
      summary: 'Kamu dapat menerima sedikit perubahan nilai, tetapi ruang untuk kerugian atau ketidakpastian masih terbatas.',
    },
    {
      id: 'seimbang', min: 45, max: 64, label: 'Seimbang', color: '#7c3aed',
      summary: 'Kamu menunjukkan keseimbangan antara kebutuhan stabilitas dan kesediaan menghadapi perubahan nilai.',
    },
    {
      id: 'bertumbuh', min: 65, max: 84, label: 'Bertumbuh', color: '#db2777',
      summary: 'Kamu cukup siap menghadapi perubahan nilai untuk mengejar pertumbuhan, selama batas waktu dan kapasitas tetap dijaga.',
    },
    {
      id: 'dinamis', min: 85, max: 100, label: 'Dinamis', color: '#ea580c',
      summary: 'Kamu menunjukkan kenyamanan, kapasitas, dan waktu yang relatif tinggi untuk menghadapi ketidakpastian besar.',
    },
  ];

  const CONFIDENCE = {
    baik: { id: 'baik', label: 'Keyakinan hasil: baik', description: 'Sebagian besar jawaban diberikan secara pasti.' },
    sedang: { id: 'sedang', label: 'Keyakinan hasil: sedang', description: 'Ada beberapa jawaban yang masih belum pasti.' },
    terbatas: { id: 'terbatas', label: 'Keyakinan hasil: terbatas', description: 'Beberapa jawaban penting belum pasti; hasil ini perlu dibaca sebagai indikasi awal.' },
  };

  function categoryForScore(score) {
    const bounded = Math.max(0, Math.min(100, Number(score)));
    return CATEGORIES.find((category) => bounded <= category.max) || CATEGORIES[CATEGORIES.length - 1];
  }

  function normalizeAverage(values) {
    const average = values.reduce((sum, value) => sum + value, 0) / values.length;
    return Math.round(((average - 1) / 4) * 100);
  }

  function evaluate(answerValues) {
    const answers = answerValues || {};
    const missingQuestionIds = QUESTIONS.filter((question) => !Object.prototype.hasOwnProperty.call(answers, question.id))
      .map((question) => question.id);

    if (missingQuestionIds.length) {
      return {
        complete: false,
        missingQuestionIds,
        score: null,
        rawScore: null,
        category: null,
        dimensions: null,
        flags: [],
        uncertainCount: 0,
        uncertainQuestionIds: [],
        confidence: null,
      };
    }

    const selected = {};
    for (const question of QUESTIONS) {
      const option = question.options.find((candidate) => candidate.value === String(answers[question.id]));
      if (!option) {
        return {
          complete: false,
          missingQuestionIds: [question.id],
          invalidQuestionIds: [question.id],
          score: null,
          rawScore: null,
          category: null,
          dimensions: null,
          flags: [],
          uncertainCount: 0,
          uncertainQuestionIds: [],
          confidence: null,
        };
      }
      selected[question.id] = option;
    }

    const dimensions = {};
    for (const [id, meta] of Object.entries(DIMENSIONS)) {
      const values = QUESTIONS.filter((question) => question.dimension === id)
        .map((question) => selected[question.id].score);
      dimensions[id] = { ...meta, score: normalizeAverage(values) };
    }

    const rawScore = Math.round(Object.entries(DIMENSIONS).reduce(
      (sum, [id, meta]) => sum + dimensions[id].score * meta.weight,
      0
    ));

    const constraintCeiling = Math.min(100, dimensions.capacity.score + 15, dimensions.horizon.score + 15);
    const score = Math.round(Math.min(rawScore, constraintCeiling));
    const uncertainQuestionIds = QUESTIONS.filter((question) => selected[question.id].uncertain)
      .map((question) => question.id);
    const uncertainCount = uncertainQuestionIds.length;
    const confidence = uncertainCount >= 3 ? CONFIDENCE.terbatas : uncertainCount >= 2 ? CONFIDENCE.sedang : CONFIDENCE.baik;

    const flags = [];
    if (dimensions.willingness.score - dimensions.capacity.score >= 25) {
      flags.push({
        id: 'willingness-exceeds-capacity',
        title: 'Kenyamanan lebih tinggi daripada kapasitas',
        description: 'Kamu tampak cukup nyaman dengan fluktuasi, tetapi kondisi keuanganmu memiliki ruang yang lebih terbatas untuk menyerap kerugian.',
      });
    }
    if (dimensions.willingness.score - dimensions.horizon.score >= 25) {
      flags.push({
        id: 'willingness-exceeds-horizon',
        title: 'Kenyamanan lebih tinggi daripada waktu yang tersedia',
        description: 'Kesediaan menghadapi fluktuasi lebih tinggi daripada fleksibilitas waktu atau kebutuhan likuiditasmu.',
      });
    }
    if (dimensions.capacity.score - dimensions.willingness.score >= 25) {
      flags.push({
        id: 'capacity-exceeds-willingness',
        title: 'Kapasitas lebih tinggi daripada kenyamanan',
        description: 'Secara keuangan kamu mungkin memiliki ruang, tetapi secara emosional perubahan nilai besar masih terasa tidak nyaman.',
      });
    }
    if (dimensions.knowledge.score < 40 && rawScore >= 65) {
      flags.push({
        id: 'knowledge-gap',
        title: 'Kecenderungan risiko lebih tinggi daripada pemahaman',
        description: 'Kecenderungan menerima risiko cukup tinggi, sementara pemahaman dan pengalaman yang dilaporkan masih terbatas.',
      });
    }
    if (uncertainCount >= 3) {
      flags.push({
        id: 'limited-confidence',
        title: 'Beberapa jawaban masih belum pasti',
        description: 'Hasil tetap dapat dibaca sebagai indikasi awal, tetapi belum cukup kuat untuk menjadi dasar keputusan sendiri.',
      });
    }

    return {
      complete: true,
      missingQuestionIds: [],
      score,
      rawScore,
      constraintApplied: score < rawScore,
      category: categoryForScore(score),
      dimensions,
      flags,
      uncertainCount,
      uncertainQuestionIds,
      confidence,
    };
  }

  return {
    QUESTIONS,
    DIMENSIONS,
    CATEGORIES,
    categoryForScore,
    evaluate,
  };
});
