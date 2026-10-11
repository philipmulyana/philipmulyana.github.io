// Wording for Survival Test results (SKENARIO-v2.md). Turns calculateSurvival() events into
// timeline lines. Shared by the calculator page and Klienku's WhatsApp report draft, so the
// prospect reads the same sentences in both places. Plain strings only, no HTML.
//
// The respondent may be the earner ("kamu") or the earner's partner ("pasangan kamu"); every
// sentence is written from that person's side and never says husband or wife.

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

const cap = s => s.charAt(0).toUpperCase() + s.slice(1);
const UNIVERSITY = { ptn: "Kampus negeri", pts: "Kampus swasta", abroad: "Kuliah di luar negeri" };
const when = at => `Bulan ${at}`;

/** Who is who, from the respondent's side. */
function people(result) {
  const self = result.earner !== "partner";
  return {
    earner: self ? "kamu" : "pasangan kamu",          // whose income stops
    other: self ? "pasangan kamu" : "kamu",           // the partner left carrying the house
    otherCarries: self ? "Pasangan kamu harus" : "Kamu harus",
  };
}

function deathCopy(d, p) {
  if (d.runway_months === null) {
    return {
      headline: "Pemasukan yang tetap ada sudah menutup biaya hidup keluarga.",
      items: [{ when: "Bulan 1", text: `Gaji ${p.earner} berhenti masuk, tapi pemasukan lain di rumah masih cukup untuk biaya hidup bulanan.` }],
      closing: null,
    };
  }
  const items = [];
  const headline = d.covered
    ? "Dana yang ada cukup sampai keluarga tidak lagi bergantung pada penghasilan ini."
    : `${duration(d.runway_months)}. Setelah itu keluarga kamu menanggung semuanya tanpa penghasilan ${p.earner}.`;
  for (const e of d.events) {
    switch (e.kind) {
      case "income_stops":
        items.push({ when: when(1), text: e.lifeCover > 0
          ? `Gaji ${p.earner} berhenti masuk. Keluarga mulai membayar cicilan, uang sekolah, dan belanja bulanan dari tabungan dan uang asuransi jiwa ${p.earner}.`
          : `Gaji ${p.earner} berhenti masuk. Keluarga mulai membayar cicilan, uang sekolah, dan belanja bulanan dari tabungan.` });
        break;
      case "mortgage_paid_by_credit_life":
        items.push({ when: when(1), text: "Sisa KPR dilunasi asuransi jiwa kredit dari bank. Rumah aman, tapi biaya hidup lainnya tetap berjalan." });
        break;
      case "money_runs_out":
        items.push({ when: when(e.at), text: "Uangnya habis." });
        break;
      case "mortgage_unpaid":
        items.push({ when: when(e.at), text: `Tagihan KPR bulan ini tetap datang, dan masih akan datang setiap bulan selama ${duration(e.monthsLeft)} lagi.` +
          (e.creditLifeUnknown ? " Kalau KPR ternyata ditanggung asuransi jiwa kredit, bagian ini lunas." : "") });
        break;
      case "partner_alone":
        items.push({ when: when(e.at), text: `${p.otherCarries} mencari ${rupiah(e.gap)} setiap bulan.` +
          (e.youngestAgeThen !== null && e.youngestAgeThen < 13 ? ` Anak bungsu baru ${e.youngestAgeThen} tahun dan masih perlu ditemani di rumah.` : "") });
        break;
      case "partner_income_short":
        items.push({ when: when(e.at), text: `Penghasilan ${p.other} menutup ${rupiah(e.otherIncome)}. Masih kurang ${rupiah(e.gap)} setiap bulan.` });
        break;
      case "university_unfunded":
        items.push({ when: `Tahun ${e.year}`, text: `Anak bungsu lulus SMA. ${UNIVERSITY[e.university]} yang dulu kalian bicarakan sudah di depan mata, dan belum ada yang menyiapkan biayanya, sekitar ${rupiah(e.cost)} dalam nilai hari ini.` });
        break;
      case "youngest_independent":
        items.push({ when: e.hasChildren ? "Sampai anak bungsu mandiri" : "10 tahun ke depan", text: `Keluarga masih perlu dibiayai ${duration(e.monthsUncovered)} lagi setelah uangnya habis.` });
        break;
    }
  }
  return { headline, items, closing: d.covered ? null : `Semua rencana itu dibuat dengan satu anggapan: ${p.earner} masih ada untuk membiayainya.` };
}

function ciCopy(c, p, self) {
  const items = [];
  for (const e of c.events) {
    switch (e.kind) {
      case "ci_income_stops":
        items.push({ when: when(1), text: `${cap(p.earner)} fokus pulih. Gaji berhenti, sementara pengeluaran rumah tetap berjalan seperti biasa. Biaya rumah sakit tidak dihitung di sini.` });
        break;
      case "life_cover_does_not_pay":
        items.push({ when: "Yang sering tidak disadari", text: `Asuransi jiwa ${p.earner} tidak membantu di sini. Uang itu hanya cair kalau ${p.earner} meninggal.` });
        break;
      case "money_runs_out_in_recovery":
        items.push({ when: when(e.at), text: self
          ? "Tabungan habis. Kamu masih dalam masa pemulihan, dan sekarang ikut memikirkan dari mana uang bulan depan."
          : "Tabungan habis. Pasangan kamu masih dalam masa pemulihan, dan kalian mulai memikirkan dari mana uang bulan depan." });
        break;
      case "ci_family_covers":
        items.push({ when: `Bulan ${e.from} sampai ${e.to}`, text: !e.hasPartner
          ? `Keluarga harus menutup ${rupiah(e.gap)} per bulan dari tempat lain.`
          : self
            ? `Pasangan kamu menutup ${rupiah(e.gap)} per bulan sambil merawat kamu.`
            : `Kamu menutup ${rupiah(e.gap)} per bulan sambil merawat pasangan kamu.` });
        break;
    }
  }
  return {
    headline: c.covered
      ? `Dana yang ada cukup untuk ${duration(c.recovery_months)} masa pemulihan.`
      : `${cap(p.earner)} masih ada, tapi tidak bisa bekerja.`,
    items,
    closing: c.covered ? null : self
      ? "Kamu ada di rumah selama semua itu terjadi, dan kamu tahu setiap tagihannya."
      : "Pasangan kamu ada di rumah selama semua itu terjadi, dan tahu setiap tagihannya.",
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

export function resultCopy(result, { merge = true } = {}) {
  const p = people(result);
  const self = result.earner !== "partner";
  const m = merge ? mergeSameWhen : (s) => s;
  return {
    death: { tab: "Kalau terhenti karena meninggal", ...m(deathCopy(result.death, p)) },
    critical_illness: { tab: "Kalau terhenti karena sakit kritis", ...m(ciCopy(result.critical_illness, p, self)) },
    bridge: "Garis waktu ini masih bisa diubah, selama penghasilan itu masih berjalan.",
  };
}

/** Splits text into paragraphs of at most two sentences, so a WhatsApp message stays easy to read. */
export function twoSentenceParagraphs(text) {
  const sentences = text.split(/(?<=[.!?])\s+(?=[A-Z0-9"“])/).filter(Boolean);
  const out = [];
  for (let i = 0; i < sentences.length; i += 2) out.push(sentences.slice(i, i + 2).join(" "));
  return out;
}

// Education costs rise faster than prices; same 10% a year Philip uses on his education plan
// calculator (philipmulyana.com/tools/eduplan, js/eduplan.js INFLASI_PENDIDIKAN).
export const EDUCATION_INFLATION = 0.10;

/**
 * WhatsApp report Philip sends after a prospect asks for it. It does NOT repeat the page: a two-line
 * recap, then what the page did not show (university cost in the year it is due, what the current
 * cover does not pay for), the cost of waiting, and one clear next step. Every paragraph holds at
 * most two sentences, with a blank line between paragraphs.
 *
 * @param {object} result calculateSurvival() output
 * @param {string|null} name first name, or null
 * @param {{ code?: string, bookingUrl?: string, currentYear?: number }} opts
 */
export function whatsappReport(result, name, opts = {}) {
  const p = people(result);
  const year = opts.currentYear ?? new Date().getFullYear();
  const d = result.death, c = result.critical_illness;
  const ev = (s, k) => s.events.find((e) => e.kind === k);
  const out = [];
  const para = (text) => { for (const x of twoSentenceParagraphs(text)) out.push(x, ""); };
  const label = (text) => out.push(`*${text}*`);

  para(`Halo${name ? ` ${name}` : ""}, terima kasih sudah mengisi Survival Test.`);

  // Recap: two sentences, the numbers they already saw.
  const deathLine = d.runway_months === null
    ? `Kalau penghasilan ${p.earner} terhenti, pemasukan lain di rumah masih menutup biaya hidup bulanan.`
    : d.covered
      ? `Kalau penghasilan ${p.earner} terhenti, dana yang ada cukup sampai keluarga tidak lagi bergantung padanya.`
      : `Kalau penghasilan ${p.earner} terhenti, keluarga kamu bertahan sekitar ${duration(d.runway_months)}.`;
  const ciOut = ev(c, "money_runs_out_in_recovery");
  const ciLine = ciOut
    ? `Kalau terhentinya karena sakit kritis, tabungan habis di bulan ${ciOut.at}, saat ${p.earner} masih dalam pemulihan.`
    : "Kalau terhentinya karena sakit kritis, dana yang ada cukup untuk masa pemulihan.";
  label("Ringkasnya");
  para(`${deathLine} ${ciLine}`);

  // What the page did not show.
  const extra = [];
  const uni = ev(d, "university_unfunded");
  if (uni) {
    const yearsLeft = Math.max(1, uni.year - year);
    const future = Math.round(uni.cost * Math.pow(1 + EDUCATION_INFLATION, yearsLeft));
    extra.push(`Biaya kuliah anak bungsu hari ini sekitar ${rupiah(uni.cost)}. Dengan kenaikan biaya kuliah sekitar 10% per tahun, di ${uni.year} angkanya jadi sekitar ${rupiah(future)}.`);
    extra.push(`Waktu untuk menyiapkannya tinggal ${yearsLeft} tahun. Setiap tahun yang lewat tanpa rencana, waktunya berkurang satu tahun dan biayanya naik lagi.`);
  }
  if (ev(c, "life_cover_does_not_pay")) {
    extra.push(`Asuransi jiwa ${p.earner} hanya cair kalau ${p.earner} meninggal. Untuk sakit kritis, keluarga hanya bergantung pada tabungan.`);
  }
  const kpr = ev(d, "mortgage_unpaid");
  if (kpr && !uni) {
    extra.push(`Cicilan rumah masih berjalan ${duration(kpr.monthsLeft)} setelah dana habis. Rumah itu ikut dipertaruhkan kalau tidak ada yang menyiapkan.`);
  }
  if (extra.length) {
    label("Yang tidak terlihat di halaman hasil");
    for (const x of extra) para(x);
  }

  // Cost of waiting: true for any life or critical illness cover, no product named.
  const exposed = !d.covered || !c.covered;
  if (exposed) {
    label("Kenapa sebaiknya tidak ditunda");
    para("Perlindungan untuk risiko seperti ini dihitung dari usia dan kondisi kesehatan saat mendaftar. Makin lama ditunda, makin mahal, dan kalau kondisi kesehatan berubah, pengajuannya bisa ditolak.");
  }

  // One clear next step.
  label("Langkah berikutnya");
  para(exposed
    ? "Mau ngobrol 10 menit lewat telepon WhatsApp untuk melihat apa yang bisa disiapkan dari sekarang?"
    : "Kalau mau dicek ulang bersama, kita bisa ngobrol 10 menit lewat telepon WhatsApp.");
  if (opts.bookingUrl) para(`Pilih jamnya di sini: ${opts.bookingUrl}${opts.code ? `?code=${opts.code}` : ""}`);
  para("P.S. Kalau belum mau ngobrol sekarang, balas YA untuk tips keuangan keluarga sebulan sekali.");

  return out.join("\n").trim();
}
