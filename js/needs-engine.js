// Copied from client-service/acquisition-os/needs.mjs (tests live there). Edit there, then copy here.
// Cek Kebutuhan Asuransi (calculation_version 1). Rules agreed with Philip on 15 Oct 2026.
// One priority per family, never a list: life cover when anyone else relies on the income,
// critical illness when nobody does. No sum assured is shown on the page; how much is enough is
// what Philip works out on WhatsApp or the First Call. Pure functions, no I/O, no copy.
//
// Rules:
//   married (now)                          -> life
//   not married, children or other people
//   relying on the income                  -> life
//   not married, nobody relies on it       -> critical illness
//   household income above 20 juta         -> qualified: WhatsApp and booking are offered
//   20 juta or less                        -> result only, no way to reach Philip's number

export const CALCULATION_VERSION = 1;

const B = (label, value) => ({ label, value });

export const BANDS = {
  // "was" = divorced or widowed, living without a partner now
  married: { yes: B("Sudah", true), no: B("Belum", false), was: B("Pernah, sekarang sendiri", false) },
  // value = midpoint age of the youngest child still being supported; null = none
  youngest_child: {
    none: B("Tidak ada anak yang dibiayai", null), "0_5": B("0 sampai 5 tahun", 3), "6_12": B("6 sampai 12 tahun", 9),
    "13_17": B("13 sampai 17 tahun", 15), "18plus": B("18 tahun ke atas, masih dibiayai", 20),
  },
  other_dependents: { yes: B("Ya", true), no: B("Tidak", false) },
  // qualified = strictly above 20 juta a month, so the 10–20 band is the last one below the line
  income: {
    lt10: B("Di bawah Rp10 juta", false), "10_20": B("Rp10 sampai 20 juta", false), "20_35": B("Rp20 sampai 35 juta", true),
    "35_50": B("Rp35 sampai 50 juta", true), gt50: B("Di atas Rp50 juta", true),
  },
  // multi-select; "none" and "unknown" stand alone
  owned: {
    life: B("Asuransi jiwa pribadi", "life"), ci: B("Asuransi sakit kritis", "ci"), health: B("Asuransi kesehatan pribadi", "health"),
    employer: B("Asuransi dari kantor", "employer"), bpjs: B("BPJS Kesehatan", "bpjs"),
    none: B("Belum punya", "none"), unknown: B("Tidak tahu", "unknown"),
  },
};

function band(field, key) {
  const b = BANDS[field]?.[key];
  if (!b) throw new Error(`Unknown band ${field}=${key}`);
  return b.value;
}

/** @param {object} a raw answers (band keys; `owned` is an array of keys) */
export function calculateNeeds(a) {
  const married = band("married", a.married);
  const youngestAge = band("youngest_child", a.youngest_child);
  const hasChildren = youngestAge !== null;
  // Only asked when nobody else is in the picture yet; otherwise it cannot change the result.
  const otherDependents = !married && !hasChildren ? band("other_dependents", a.other_dependents) : false;
  const qualified = band("income", a.income);
  const owned = (Array.isArray(a.owned) ? a.owned : []).map((k) => band("owned", k));
  if (owned.length === 0) throw new Error("owned is required");

  const priority = married || hasChildren || otherDependents ? "life" : "critical_illness";

  // Why this priority, in the order the page reads them.
  const reasons = [];
  if (priority === "life") {
    if (married) reasons.push({ kind: "partner" });
    if (hasChildren) reasons.push({ kind: "children", youngestAge, band: a.youngest_child });
    if (otherDependents) reasons.push({ kind: "other_dependents" });
  } else {
    reasons.push({ kind: "nobody_relies" });
  }

  const has = (k) => owned.includes(k);
  const status = has(priority === "life" ? "life" : "ci") ? "check" : has("unknown") ? "unknown" : "need";
  const notes = [];
  if (has("employer")) notes.push({ kind: "employer_stops" });
  if ((has("bpjs") || has("health")) && status === "need") notes.push({ kind: "health_only" });
  if (priority === "critical_illness" && has("life") && !has("ci")) notes.push({ kind: "life_does_not_pay_ci" });

  return { calculation_version: CALCULATION_VERSION, priority, status, reasons, notes, qualified, has_children: hasChildren, married };
}
