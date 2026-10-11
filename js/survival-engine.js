// Family Financial Survival Test (calculation_version 3).
// Two causes of lost income, death and critical illness, each turned into a dated timeline of
// events the family would face. Pure functions, no I/O, no copy: the page renders the wording.
// Amounts are in juta rupiah. Lump sums are juta; monthly figures are juta per month.
//
// v3: whoever fills the form says who the main earner is (themself or their partner), so nothing
// assumes the respondent is the earner or a husband; every question is single choice; group life
// cover from an employer is no longer asked (uncommon; employer cover is usually health).

export const CALCULATION_VERSION = 3;

/** Assumptions confirmed by Philip on 2026-10-11 (PRD v1.2 §15). */
export const ASSUMPTIONS = {
  ciRecoveryMonths: 24,     // months without the earner's income after a critical illness
  independenceAge: 22,
  universityStartAge: 18,
  noChildHorizonYears: 10,  // dependents but no children (partner, parents)
};

// University cost today, from Philip's education plan research (site js/eduplan.js presets).
export const UNIVERSITY_COST = { ptn: 490, pts: 535, abroad: 3285 };

const B = (label, value) => ({ label, value });

export const BANDS = {
  // earner: who carries the main income · partner: is there a partner in the household
  earner: {
    self: B("Saya", { earner: "self", partner: true }),
    partner: B("Pasangan saya", { earner: "partner", partner: true }),
    both: B("Kami berdua, kurang lebih sama besar", { earner: "self", partner: true }),
    single: B("Saya, dan saya tidak punya pasangan", { earner: "self", partner: false }),
  },
  // value = midpoint age of the youngest child still being supported; null = no children
  children: {
    none: B("Tidak ada", null), "0_5": B("Ada, yang bungsu 0–5 tahun", 3), "6_12": B("Ada, yang bungsu 6–12 tahun", 9),
    "13_17": B("Ada, yang bungsu 13–17 tahun", 15), "18plus": B("Ada, yang bungsu 18 tahun ke atas", 20),
  },
  university: { ptn: B("Negeri dalam negeri", "ptn"), pts: B("Swasta dalam negeri", "pts"), abroad: B("Luar negeri", "abroad"), undecided: B("Belum terpikir", null) },
  other_dependents: { yes: B("Ya", true), no: B("Tidak", false) },
  // income of the other partner, which keeps coming in when the earner's stops
  other_income: { none: B("Tidak ada", 0), lt5: B("Di bawah Rp5 juta", 3), "5_10": B("Rp5–10 juta", 7.5), "10_20": B("Rp10–20 juta", 15), gt20: B("Di atas Rp20 juta", 24) },
  housing: {
    owned: B("Milik sendiri, sudah lunas", null), kpr_lt5: B("KPR, sisa di bawah 5 tahun", 3), kpr_5_10: B("KPR, sisa 5–10 tahun", 7.5),
    kpr_gt10: B("KPR, sisa lebih dari 10 tahun", 13), rent: B("Sewa", null), parents: B("Tinggal dengan orang tua", null),
  },
  mortgage_payment: { lt3: B("Di bawah Rp3 juta", 2), "3_7": B("Rp3–7,5 juta", 5), "7_15": B("Rp7,5–15 juta", 11), gt15: B("Di atas Rp15 juta", 18) },
  credit_life: { yes: B("Ya", "yes"), no: B("Tidak", "no"), unknown: B("Tidak tahu", "unknown") },
  living_cost: { lt5: B("Di bawah Rp5 juta", 4), "5_10": B("Rp5–10 juta", 7.5), "10_15": B("Rp10–15 juta", 12.5), "15_25": B("Rp15–25 juta", 20), "25_40": B("Rp25–40 juta", 32.5), gt40: B("Di atas Rp40 juta", 48) },
  savings: { lt10: B("Di bawah Rp10 juta", 5), "10_50": B("Rp10–50 juta", 30), "50_100": B("Rp50–100 juta", 75), "100_250": B("Rp100–250 juta", 175), "250_500": B("Rp250–500 juta", 375), "500_1000": B("Rp500 juta–1 miliar", 750), gt1000: B("Di atas Rp1 miliar", 1200) },
  // cover on the earner's life; "unknown" counts as 0 and the result says so
  cover_amount: {
    none: B("Tidak ada", 0), unknown: B("Tidak tahu", 0), lt250: B("Di bawah Rp250 juta", 150), "250_500": B("Rp250–500 juta", 375),
    "500_1000": B("Rp500 juta–1 miliar", 750), "1000_2000": B("Rp1–2 miliar", 1500), gt2000: B("Di atas Rp2 miliar", 2400),
  },
};

function band(field, key) {
  const b = BANDS[field]?.[key];
  if (!b) throw new Error(`Unknown band ${field}=${key}`);
  return b.value;
}

/** Normalise raw answers into numbers. Throws on unknown band keys. */
export function readInputs(a) {
  const { earner, partner } = band("earner", a.earner);
  const youngestAge = band("children", a.children);
  const hasChildren = youngestAge !== null;
  const kprYears = band("housing", a.housing);
  const isKpr = kprYears !== null;
  return {
    earner,                         // "self" | "partner": whose income stops
    hasPartner: partner,
    hasChildren,
    youngestAge,
    otherDependents: band("other_dependents", a.other_dependents || "no"),
    university: hasChildren ? band("university", a.university || "undecided") : null,
    otherIncome: partner ? band("other_income", a.other_income || "none") : 0,
    isKpr,
    kprMonthsLeft: isKpr ? Math.round(kprYears * 12) : 0,
    mortgagePayment: isKpr ? band("mortgage_payment", a.mortgage_payment) : 0,
    creditLife: isKpr ? band("credit_life", a.credit_life || "unknown") : null,
    livingCost: band("living_cost", a.living_cost),
    savings: band("savings", a.savings),
    lifeCover: band("cover_amount", a.life_cover),
    ciCover: band("cover_amount", a.ci_cover),
    lifeUnknown: a.life_cover === "unknown",
    ciUnknown: a.ci_cover === "unknown",
  };
}

function horizonMonths(x) {
  if (x.hasChildren) return Math.max(3, Math.min(20, ASSUMPTIONS.independenceAge - x.youngestAge)) * 12;
  if (x.hasPartner || x.otherDependents) return ASSUMPTIONS.noChildHorizonYears * 12;
  return null;
}

const runway = (resources, gap) => (gap <= 0 ? null : Math.floor(resources / gap));

/**
 * @param {object} answers raw answers (band keys)
 * @param {number} currentYear calendar year used for dated events (pass it in; keeps the function pure)
 */
export function calculateSurvival(answers, currentYear) {
  const x = readInputs(answers);
  const horizon = horizonMonths(x);
  const monthsToUniversity = x.hasChildren && x.youngestAge < ASSUMPTIONS.universityStartAge
    ? (ASSUMPTIONS.universityStartAge - x.youngestAge) * 12 : null;
  const universityYear = monthsToUniversity === null ? null : currentYear + Math.round(monthsToUniversity / 12);
  const universityCost = x.university ? UNIVERSITY_COST[x.university] : null;

  // ---- Death: the earner's income stops for good. Bank credit life pays off the mortgage only on death.
  const mortgagePaidOff = x.isKpr && x.creditLife === "yes";
  const deathNeed = x.livingCost - (mortgagePaidOff ? Math.min(x.mortgagePayment, x.livingCost) : 0);
  const deathGap = Math.max(0, deathNeed - x.otherIncome);
  const deathResources = x.savings + x.lifeCover;
  const deathRunway = runway(deathResources, deathGap);
  const deathEvents = [{ at: 1, kind: "income_stops", resources: deathResources, lifeCover: x.lifeCover }];
  if (mortgagePaidOff) deathEvents.push({ at: 1, kind: "mortgage_paid_by_credit_life" });
  if (deathRunway !== null) {
    const outAt = deathRunway + 1;
    deathEvents.push({ at: outAt, kind: "money_runs_out" });
    if (x.isKpr && !mortgagePaidOff && outAt <= x.kprMonthsLeft) {
      deathEvents.push({ at: outAt, kind: "mortgage_unpaid", monthsLeft: x.kprMonthsLeft - deathRunway, creditLifeUnknown: x.creditLife === "unknown" });
    }
    if (x.hasPartner) {
      deathEvents.push({
        at: outAt, kind: x.otherIncome > 0 ? "partner_income_short" : "partner_alone",
        gap: deathGap, need: deathNeed, otherIncome: x.otherIncome,
        youngestAgeThen: x.hasChildren ? Math.floor(x.youngestAge + outAt / 12) : null,
      });
    }
    if (monthsToUniversity !== null && universityCost && deathRunway < monthsToUniversity) {
      deathEvents.push({ at: monthsToUniversity, kind: "university_unfunded", year: universityYear, cost: universityCost, university: x.university });
    }
    if (horizon && deathRunway < horizon) {
      deathEvents.push({ at: horizon, kind: "youngest_independent", monthsUncovered: horizon - deathRunway, hasChildren: x.hasChildren });
    }
  }
  deathEvents.sort((a, b) => a.at - b.at);

  // ---- Critical illness: the earner is alive, no income for the recovery period, mortgage keeps running.
  const ciMonths = ASSUMPTIONS.ciRecoveryMonths;
  const ciGap = Math.max(0, x.livingCost - x.otherIncome);
  const ciResources = x.savings + x.ciCover;
  const ciRunway = runway(ciResources, ciGap);
  const ciEvents = [{ at: 1, kind: "ci_income_stops", recoveryMonths: ciMonths }];
  if (x.lifeCover > 0 && x.ciCover === 0) ciEvents.push({ at: 1, kind: "life_cover_does_not_pay", lifeCover: x.lifeCover });
  if (ciRunway !== null && ciRunway < ciMonths) {
    const outAt = ciRunway + 1;
    ciEvents.push({ at: outAt, kind: "money_runs_out_in_recovery" });
    ciEvents.push({ at: outAt, kind: "ci_family_covers", from: outAt, to: ciMonths, gap: ciGap, hasPartner: x.hasPartner });
  }
  ciEvents.sort((a, b) => a.at - b.at);

  return {
    calculation_version: CALCULATION_VERSION,
    assumptions: { ...ASSUMPTIONS },
    earner: x.earner,
    has_partner: x.hasPartner,
    death: {
      runway_months: deathRunway, monthly_need: deathNeed, monthly_gap: deathGap, resources: deathResources,
      horizon_months: horizon, covered: deathRunway === null || (horizon !== null && deathRunway >= horizon),
      events: deathEvents,
    },
    critical_illness: {
      runway_months: ciRunway, monthly_gap: ciGap, resources: ciResources, recovery_months: ciMonths,
      months_short: ciRunway === null ? 0 : Math.max(0, ciMonths - ciRunway),
      shortfall: ciRunway === null ? 0 : Math.max(0, Math.round(ciMonths * ciGap - ciResources)),
      covered: ciRunway === null || ciRunway >= ciMonths,
      events: ciEvents,
    },
    flags: {
      life_cover_unknown: x.lifeUnknown,
      ci_cover_unknown: x.ciUnknown,
      no_dependents: !x.hasPartner && !x.hasChildren && !x.otherDependents,
      credit_life_unknown: x.isKpr && x.creditLife === "unknown",
    },
  };
}
