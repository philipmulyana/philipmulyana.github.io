/* ============================================================
   Simulasi Struktur Income — Komisi & Overriding
   Internal recruitment tool (P1 session). Stealth URL.

   RATE TABLE — single source of truth
   Sumber: (C) KB - Prudential Income Stream (Commission, Overriding, Royalty)
   Canonical MD: PM Second Brain/03 Projects/Lead Engine/sub-projects/
                 agent-recruitment/(C) Agent Recruitment & Onboarding - Canonical.md
   Semua angka = ilustratif, bukan compensation schedule resmi.
   ------------------------------------------------------------
   base   : % dari FYP -> komisi dasar
   margin : % dari komisi -> BERLAKU SAMA untuk (a) tambahan margin
            selling pribadi DAN (b) overriding produksi agent langsung.

   PHILIP LOCK 2026-07-20: KB tulis override tim AAB 65% / AB 90%.
   Angka itu SUDAH TERMASUK bonus kuartalan 20% (65-45=20pp, 90-70=20pp).
   Kalkulator ini exclude bonus, jadi yang dipakai = margin murni
   45/30 (AAB) dan 70/40 (AB). JANGAN "koreksi" balik ke 65/90 dari KB.
   ============================================================ */
const BASE = { y1: 0.25, y2: 0.15 };

const RATES = {
  AG:  { name:'Agent',
         desc:'Komisi dari produksi pribadi. Overriding tim terbuka setelah promosi.',
         margin: { y1:null, y2:null } },
  AAB: { name:'AAB',
         desc:'Margin tambahan atas produksi pribadi, ditambah overriding atas produksi agent langsung.',
         margin: { y1:0.45, y2:0.30 } },
  AB:  { name:'AB',
         desc:'Margin tambahan atas produksi pribadi, ditambah overriding atas produksi agent langsung.',
         margin: { y1:0.70, y2:0.40 } }
};

/* ── BASIS MODE 2 (reverse) — PHILIP LOCK 2026-07-20 rev.2: TAHUN 1 SAJA ──
   Sebelumnya steady-state (Y1+Y2); diubah ke Y1-only atas permintaan Philip.
   Konservatif: tidak menghitung komisi Y2 dari produksi tahun sebelumnya,
   jadi angka aktivitas mencerminkan kondisi agent di tahun pertama.
   Untuk balik ke steady-state, tambahkan kembali suku BASE.y2 di bawah.   */
const selfRate = r => BASE.y1 * (1 + (r.margin.y1 || 0));
const ovrRate  = r => r.margin.y1 === null ? 0 : BASE.y1 * r.margin.y1;

const WEEKS = 52, MONTHS = 12;

/* ---------- state ---------- */
let mode = 'fwd';
let roleF = 'AG', roleR = 'AG';
let personalFYP = 360000000;
let agents = [{ name:'Agent 1', omzet:360000000 }];
let goal = 500000000, caseSize = 15000000, closeRate = 0.10;
let teamCount = 0, teamAvg = 360000000;

/* ---------- format ---------- */
const rp       = n => 'Rp ' + Math.round(n).toLocaleString('id-ID');
const fmtNum   = n => (n || 0).toLocaleString('id-ID');
const parseNum = s => +String(s).replace(/\D/g, '') || 0;
const up       = n => Math.ceil(n).toLocaleString('id-ID');
const pct      = n => (n * 100).toFixed(2).replace('.', ',');
const short = n => {
  if (!n) return 'Rp 0';
  if (n >= 1e9) return 'Rp ' + (n/1e9).toFixed(n % 1e9 === 0 ? 0 : 2).replace('.', ',') + ' M';
  return 'Rp ' + Math.round(n/1e6).toLocaleString('id-ID') + ' jt';
};

/* Live thousand-separator. Caret kept stable by counting digits, not chars. */
function attachNumFormat(el, onChange){
  if (!el) return;
  el.addEventListener('input', e => {
    const raw   = e.target.value;
    const caret = e.target.selectionStart;
    const digitsBefore = raw.slice(0, caret).replace(/\D/g, '').length;
    const val   = parseNum(raw);
    const out   = raw.replace(/\D/g, '') === '' ? '' : fmtNum(val);

    e.target.value = out;
    let pos = 0, seen = 0;
    while (pos < out.length && seen < digitsBefore){
      if (/\d/.test(out[pos])) seen++;
      pos++;
    }
    e.target.setSelectionRange(pos, pos);
    onChange(val);
  });
}

const $ = id => document.getElementById(id);

/* ══════════════ MODE 1 — FORWARD ══════════════ */
function computeF(){
  const r = RATES[roleF], fyp = personalFYP;
  const baseY1 = fyp * BASE.y1, baseY2 = fyp * BASE.y2;
  const addY1 = baseY1 * (r.margin.y1 || 0), addY2 = baseY2 * (r.margin.y2 || 0);

  const team = agents.map(a => {
    const cY1 = (a.omzet||0) * BASE.y1, cY2 = (a.omzet||0) * BASE.y2;
    return { name:a.name || 'Agent', omzet:a.omzet||0,
             y1: r.margin.y1 ? cY1 * r.margin.y1 : 0,
             y2: r.margin.y2 ? cY2 * r.margin.y2 : 0 };
  });
  const teamY1 = r.margin.y1 ? team.reduce((s,t)=>s+t.y1,0) : 0;
  const teamY2 = r.margin.y2 ? team.reduce((s,t)=>s+t.y2,0) : 0;

  return { r, fyp, baseY1, baseY2, addY1, addY2, team, teamY1, teamY2,
           y1: baseY1+addY1+teamY1, y2: baseY2+addY2+teamY2 };
}

function renderF(){
  const d = computeF(), total = d.y1 + d.y2;
  const hasTeam = RATES[roleF].margin.y1 !== null;

  $('roledescF').textContent = d.r.desc;
  $('grand').textContent = rp(total);
  $('y1').textContent = rp(d.y1);
  $('y2').textContent = rp(d.y2);

  const share = d.fyp ? (total / d.fyp * 100) : 0;
  $('grandsub').textContent = d.fyp
    ? `Setara ${share.toFixed(0)}% dari FYP pribadi ${short(d.fyp)}` +
      (hasTeam && agents.length ? ` · termasuk overriding ${agents.length} agent` : '')
    : '';

  $('barA').style.cssText = `background:#60a5fa;width:${total? d.y1/total*100:0}%`;
  $('barB').style.cssText = `background:#a78bfa;width:${total? d.y2/total*100:0}%`;

  const rows = [[`Komisi dasar<span class="meta">${BASE.y1*100}% / ${BASE.y2*100}% dari FYP</span>`, d.baseY1, d.baseY2]];
  if (d.r.margin.y1) rows.push([
    `Tambahan margin ${d.r.name}<span class="meta">${d.r.margin.y1*100}% / ${d.r.margin.y2*100}% dari komisi dasar</span>`,
    d.addY1, d.addY2 ]);

  $('tblSelf').innerHTML =
    rows.map(([l,a,b]) => `<tr><td>${l}</td><td class="n">${rp(a)}</td><td class="n">${rp(b)}</td></tr>`).join('')
    + `<tr class="sum"><td>Subtotal pribadi</td><td class="n">${rp(d.baseY1+d.addY1)}</td><td class="n">${rp(d.baseY2+d.addY2)}</td></tr>`;

  const card = $('cardTeam');
  if (!hasTeam || !agents.length){ card.hidden = true; }
  else {
    card.hidden = false;
    $('tblTeam').innerHTML =
      d.team.map(t => `<tr><td>${t.name}<span class="meta">FYP ${short(t.omzet)} · overriding ${d.r.margin.y1*100}% / ${d.r.margin.y2*100}% dari komisinya</span></td><td class="n">${rp(t.y1)}</td><td class="n">${rp(t.y2)}</td></tr>`).join('')
      + `<tr class="sum"><td>Subtotal overriding</td><td class="n">${rp(d.teamY1)}</td><td class="n">${rp(d.teamY2)}</td></tr>`;
  }

  $('teamwrap').hidden   = !hasTeam;
  $('teamlocked').hidden =  hasTeam;
}

function renderAgents(){
  const box = $('agents');
  box.innerHTML = agents.map((a,i)=>`
    <div class="agentrow">
      <input type="text" value="${a.name}" data-i="${i}" data-f="name" placeholder="Nama agent">
      <input type="text" value="${fmtNum(a.omzet)}" data-i="${i}" data-f="omzet" inputmode="numeric" autocomplete="off">
      <button class="del" data-del="${i}" title="Hapus">×</button>
    </div>`).join('');

  box.querySelectorAll('input[data-f="name"]').forEach(el=>{
    el.addEventListener('input', e=>{ agents[e.target.dataset.i].name = e.target.value; renderF(); });
  });
  box.querySelectorAll('input[data-f="omzet"]').forEach(el=>{
    attachNumFormat(el, val => { agents[el.dataset.i].omzet = val; renderF(); });
  });
  box.querySelectorAll('.del').forEach(el=>{
    el.addEventListener('click', e=>{ agents.splice(+e.target.dataset.del,1); renderAgents(); renderF(); });
  });
}

/* ══════════════ MODE 2 — REVERSE (goal seek) ══════════════ */
function computeR(){
  const r  = RATES[roleR];
  const sR = selfRate(r);
  const oR = ovrRate(r);
  const hasTeam = r.margin.y1 !== null;

  const teamFYP  = hasTeam ? teamCount * teamAvg : 0;
  const fromTeam = teamFYP * oR;
  const gap      = Math.max(0, goal - fromTeam);

  const reqFYP   = sR > 0 ? gap / sR : 0;
  const cases    = caseSize > 0 ? reqFYP / caseSize : 0;
  const meetings = closeRate > 0 ? cases / closeRate : 0;

  return { r, sR, oR, hasTeam, teamFYP, fromTeam, gap, reqFYP, cases, meetings,
           fromSelf: reqFYP * sR, covered: fromTeam >= goal && goal > 0 };
}

function renderR(){
  const d = computeR();

  $('roledescR').textContent   = d.r.desc;
  $('cardRevTeam').hidden      = !d.hasTeam;
  $('revTeamLocked').hidden    =  d.hasTeam;

  $('reqFyp').textContent = rp(d.reqFYP);
  $('reqSub').textContent = d.covered
    ? 'Target sudah terpenuhi dari overriding tim.'
    : `FYP pribadi per tahun · sebagai ${d.r.name}, komisi Tahun 1 = ${pct(d.sR)}% dari FYP`;

  $('mtgWeek').textContent  = up(d.meetings / WEEKS);
  $('mtgMonth').textContent = up(d.meetings / MONTHS);
  $('caseMonth').textContent= up(d.cases / MONTHS);
  $('caseYear').textContent = up(d.cases);

  $('revNote').innerHTML = d.covered
    ? `Dengan ${teamCount} agent pada rata-rata FYP ${short(teamAvg)}, overriding tim sudah mencapai ${rp(d.fromTeam)} per tahun.`
    : `Untuk mencapai FYP ${short(d.reqFYP)}, kamu perlu <b>${up(d.cases)} nasabah baru per tahun</b> dengan rata-rata premi ${short(caseSize)} per case. Dengan closing ratio ${(closeRate*100).toFixed(0)}% — <b>${Math.round(1/closeRate)} meeting menghasilkan 1 nasabah</b> — itu berarti ${up(d.meetings)} meeting setahun, atau ${up(d.meetings/WEEKS)} meeting per minggu. Dihitung atas ${WEEKS} minggu per tahun.`;

  const rows = [];
  if (d.hasTeam) rows.push([
    `Overriding tim<span class="meta">${teamCount} agent × FYP ${short(teamAvg)} · ${pct(d.oR)}% dari FYP mereka</span>`,
    d.fromTeam ]);
  rows.push([
    `Produksi pribadi<span class="meta">FYP ${short(d.reqFYP)} × ${pct(d.sR)}%</span>`,
    d.fromSelf ]);

  $('tblRev').innerHTML =
    rows.map(([l,v]) => `<tr><td>${l}</td><td class="n">${rp(v)}</td></tr>`).join('')
    + `<tr class="sum"><td>Total</td><td class="n">${rp(d.fromTeam + d.fromSelf)}</td></tr>`;
}

/* ══════════════ events ══════════════ */
$('modes').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  mode = b.dataset.mode;
  document.querySelectorAll('#modes button').forEach(x=> x.setAttribute('aria-selected', x===b));
  $('paneFwd').hidden = mode !== 'fwd';
  $('paneRev').hidden = mode !== 'rev';
});

$('segF').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  roleF = b.dataset.role;
  document.querySelectorAll('#segF button').forEach(x=> x.setAttribute('aria-selected', x===b));
  renderF();
});

$('segR').addEventListener('click', e=>{
  const b = e.target.closest('button'); if(!b) return;
  roleR = b.dataset.role;
  document.querySelectorAll('#segR button').forEach(x=> x.setAttribute('aria-selected', x===b));
  renderR();
});

$('add').addEventListener('click', ()=>{
  agents.push({ name:`Agent ${agents.length+1}`, omzet:360000000 });
  renderAgents(); renderF();
});

attachNumFormat($('omzet'),     v => { personalFYP = v; renderF(); });
attachNumFormat($('goal'),      v => { goal      = v; renderR(); });
attachNumFormat($('caseSize'),  v => { caseSize  = v; renderR(); });
attachNumFormat($('teamCount'), v => { teamCount = v; renderR(); });
attachNumFormat($('teamAvg'),   v => { teamAvg   = v; renderR(); });

/* closing ratio: plain percent, no thousand separator */
$('closeRate').addEventListener('input', e=>{
  const v = String(e.target.value).replace(/\D/g,'').slice(0,3);
  e.target.value = v;
  closeRate = Math.min(100, +v || 0) / 100;
  renderR();
});

renderAgents();
renderF();
renderR();
