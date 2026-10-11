// Wording for Survival Test v2 results (SKENARIO-v2.md). Turns calculateSurvival() events into
// timeline lines. Shared by the calculator page and Klienku's WhatsApp report draft, so the
// prospect reads the same sentences in both places. Plain strings only, no HTML.

export function rupiah(juta) {
  if (juta === 0) return "Rp0";
  const fmt = n => n.toLocaleString("id-ID", { maximumFractionDigits: 1 });
  return juta >= 1000 ? `Rp${fmt(juta / 1000)} miliar` : `Rp${fmt(juta)} juta`;
}

export function duration(months) {
  if (months < 1) return "kurang dari 1 bulan";
  if (months < 24) return `${months} bulan`;
  const y = Math.floor(months / 12), m = months % 12;
  return `${y} tahun${m ? ` ${m} bulan` : ""}`;
}

const UNIVERSITY = { ptn: "Kampus negeri", pts: "Kampus swasta", abroad: "Kuliah di luar negeri" };
const when = at => `Bulan ${at}`;

function deathCopy(d) {
  if (d.runway_months === null) {
    return {
      headline: "Pemasukan yang tetap ada sudah menutup biaya hidup keluarga.",
      items: [{ when: "Bulan 1", text: "Gaji kamu berhenti masuk, tapi pemasukan lain di rumah masih cukup untuk biaya hidup bulanan." }],
      closing: null,
    };
  }
  const items = [];
  let headline = d.covered
    ? `Dana yang ada cukup sampai anak bungsu kamu mandiri.`
    : `${duration(d.runway_months)}. Setelah itu keluarga kamu menanggung semuanya tanpa penghasilan kamu.`;
  for (const e of d.events) {
    switch (e.kind) {
      case "income_stops":
        items.push({ when: when(1), text: e.lifeCover > 0
          ? "Gaji kamu berhenti masuk. Keluarga mulai membayar cicilan, uang sekolah, dan belanja bulanan dari tabungan dan uang asuransi jiwa kamu."
          : "Gaji kamu berhenti masuk. Keluarga mulai membayar cicilan, uang sekolah, dan belanja bulanan dari tabungan." });
        break;
      case "mortgage_paid_by_credit_life":
        items.push({ when: when(1), text: "Sisa KPR dilunasi asuransi jiwa kredit dari bank. Rumah aman, tapi biaya hidup lainnya tetap berjalan." });
        break;
      case "money_runs_out":
        items.push({ when: when(e.at), text: "Uangnya habis." });
        break;
      case "mortgage_unpaid":
        items.push({ when: when(e.at), text: `Tagihan KPR bulan ini tetap datang, dan masih akan datang setiap bulan selama ${duration(e.monthsLeft)} lagi.` +
          (e.creditLifeUnknown ? " Kalau KPR kamu ternyata ditanggung asuransi jiwa kredit, bagian ini lunas." : "") });
        break;
      case "spouse_alone":
        items.push({ when: when(e.at), text: `Pasangan kamu harus mencari ${rupiah(e.gap)} setiap bulan.` +
          (e.youngestAgeThen !== null && e.youngestAgeThen < 13 ? ` Anak bungsu kamu baru ${e.youngestAgeThen} tahun dan masih perlu ditemani di rumah.` : "") });
        break;
      case "spouse_income_short":
        items.push({ when: when(e.at), text: `Penghasilan pasangan kamu menutup ${rupiah(e.spouseIncome)}. Masih kurang ${rupiah(e.gap)} setiap bulan.` });
        break;
      case "university_unfunded":
        items.push({ when: `Tahun ${e.year}`, text: `Anak bungsu kamu lulus SMA. ${UNIVERSITY[e.university]} yang dulu kalian bicarakan sudah di depan mata, dan belum ada yang menyiapkan biayanya, sekitar ${rupiah(e.cost)} dalam nilai hari ini.` });
        break;
      case "youngest_independent":
        items.push({ when: "Sampai anak bungsu mandiri", text: `Keluarga masih perlu dibiayai ${duration(e.monthsUncovered)} lagi setelah uangnya habis.` });
        break;
    }
  }
  return { headline, items, closing: d.covered ? null : "Semua rencana itu kamu buat dengan satu anggapan: kamu masih ada untuk membiayainya." };
}

function ciCopy(c) {
  const items = [];
  for (const e of c.events) {
    switch (e.kind) {
      case "ci_income_stops":
        items.push({ when: when(1), text: "Kamu fokus pulih. Gaji berhenti, sementara pengeluaran rumah tetap berjalan seperti biasa. Biaya rumah sakit tidak dihitung di sini." });
        break;
      case "life_cover_does_not_pay":
        items.push({ when: "Yang sering tidak disadari", text: "Asuransi jiwa kamu tidak membantu di sini. Uang itu hanya cair kalau kamu meninggal." });
        break;
      case "group_life_ends_with_job":
        items.push({ when: "Yang sering tidak disadari", text: "Asuransi jiwa dari kantor juga biasanya berhenti kalau kamu berhenti bekerja. Kalau pemulihannya lama, perlindungan itu bisa ikut hilang." });
        break;
      case "money_runs_out_in_recovery":
        items.push({ when: when(e.at), text: "Tabungan habis. Kamu masih dalam masa pemulihan, dan sekarang ikut memikirkan dari mana uang bulan depan." });
        break;
      case "ci_family_covers":
        items.push({ when: `Bulan ${e.from} sampai ${e.to}`, text: e.hasSpouse
          ? `Pasangan kamu menutup ${rupiah(e.gap)} per bulan sambil merawat kamu.`
          : `Keluarga harus menutup ${rupiah(e.gap)} per bulan dari tempat lain.` });
        break;
    }
  }
  return {
    headline: c.covered ? `Dana yang ada cukup untuk ${duration(c.recovery_months)} masa pemulihan.` : "Kamu masih ada, tapi tidak bisa bekerja.",
    items,
    closing: c.covered ? null : "Kamu ada di rumah selama semua itu terjadi, dan kamu tahu setiap tagihannya.",
  };
}

/** Events in the same month read as one paragraph instead of three "Bulan 12" labels in a row. */
function mergeSameWhen(section) {
  const items = [];
  for (const it of section.items) {
    const last = items[items.length - 1];
    if (last && last.when === it.when) last.text = `${last.text} ${it.text}`;
    else items.push({ ...it });
  }
  return { ...section, items };
}

export function resultCopy(result) {
  return {
    death: { tab: "Kalau terhenti karena meninggal", ...mergeSameWhen(deathCopy(result.death)) },
    critical_illness: { tab: "Kalau terhenti karena sakit kritis", ...mergeSameWhen(ciCopy(result.critical_illness)) },
    bridge: "Garis waktu ini masih bisa diubah, selama penghasilan kamu masih berjalan.",
  };
}

/** Plain-text report for the WhatsApp reply Philip sends (manual mode). */
export function whatsappReport(result, name) {
  const c = resultCopy(result);
  const block = s => [`*${s.tab}*`, s.headline, ...s.items.map(i => `${i.when}: ${i.text}`), ...(s.closing ? [s.closing] : [])].join("\n");
  return [
    `Halo${name ? ` ${name}` : ""}, ini laporan Survival Test kamu.`,
    "",
    block(c.death),
    "",
    block(c.critical_illness),
    "",
    "Angka di atas dihitung dari jawaban kamu dan masih perkiraan kasar.",
    "",
    "Mau dikirimi tips keuangan keluarga sebulan sekali? Balas YA kalau mau.",
  ].join("\n");
}
