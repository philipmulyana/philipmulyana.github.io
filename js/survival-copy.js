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

/**
 * Plain-text report for the WhatsApp reply Philip sends. Every paragraph holds at most two
 * sentences, with a blank line between paragraphs; each moment on the timeline gets its own
 * bold label line instead of sharing a paragraph with others.
 */
export function whatsappReport(result, name) {
  const c = resultCopy(result, { merge: false });
  const block = (s) => {
    const lines = [`*${s.tab}*`, "", ...twoSentenceParagraphs(s.headline).flatMap((x) => [x, ""])];
    // Moments in the same month share one label; each keeps its own paragraph(s) under it.
    s.items.forEach((i, n) => {
      if (n === 0 || s.items[n - 1].when !== i.when) lines.push(`*${i.when}*`);
      else lines.pop(); // join with the label above: one blank line between paragraphs, not a new label
      const paras = twoSentenceParagraphs(i.text);
      if (n > 0 && s.items[n - 1].when === i.when) lines.push("");
      paras.forEach((x, k) => lines.push(...(k ? ["", x] : [x])));
      lines.push("");
    });
    if (s.closing) lines.push(...twoSentenceParagraphs(s.closing).flatMap((x) => [x, ""]));
    return lines;
  };
  return [
    `Halo${name ? ` ${name}` : ""}, ini laporan Survival Test kamu.`,
    "",
    ...block(c.death),
    ...block(c.critical_illness),
    "Angka di atas dihitung dari jawaban kamu dan masih perkiraan kasar.",
    "",
    "Mau dikirimi tips keuangan keluarga sebulan sekali? Balas YA kalau mau.",
  ].join("\n");
}
