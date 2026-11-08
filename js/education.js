// Kalkulator Dana Kuliah (rebuilt 8 Nov 2026 on the current site standard).
// The result shows right away, no gate. After it: a 10-minute First Call (the sale, Philip 8 Nov 2026: no course
// upsell here) and an optional "send this to my WhatsApp" form (the lead). Meta Pixel: ViewContent on result, Lead on the form,
// Schedule on First Call. Funnel events still go to the gateway.
const WEBSITE_CALC_ENDPOINT = 'https://philip-mulyana--ai-lead-gen-gateway.modal.run/campaign';
const FIRST_CALL = 'https://leaf.id/jadwal/first-call';
// 8% a year: the defensible upper bound in the knowledge bank (PTS premium ~8%, PTN/PTS ~2 to 5%). Do not raise to 10%.
const EDU_INFLATION = 0.08;
const KULIAH_START_AGE = 18;
const STORAGE_KEY_EDU = 'calc_education_state_v2';

const $ = (id) => document.getElementById(id);
const px = (...a) => { try { if (window.fbq) window.fbq(...a); } catch (e) {} };
const post = (body) => fetch(WEBSITE_CALC_ENDPOINT, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body), keepalive: true }).catch(() => {});
const esc = (s) => String(s).replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

function sessionId() {
  try {
    let sid = sessionStorage.getItem('calc_session_id');
    if (!sid) { sid = (crypto.randomUUID && crypto.randomUUID()) || Date.now() + '-' + Math.random().toString(36).slice(2); sessionStorage.setItem('calc_session_id', sid); }
    return sid;
  } catch (e) { return 'na'; }
}
const funnel = (event, r) => post({ action: 'funnel_event', calculator: 'education', event, session_id: sessionId(), age: r?.childAge, cost: r?.cost, is_agent: r?.isAgent, user_agent: navigator.userAgent.slice(0, 200) });

const rp = (n) => 'Rp' + Math.round(n).toLocaleString('id-ID');
const rpShort = (n) => n >= 1e9 ? 'Rp' + (n / 1e9).toFixed(1).replace('.0', '').replace('.', ',') + ' miliar' : n >= 1e6 ? 'Rp' + Math.round(n / 1e6).toLocaleString('id-ID') + ' juta' : rp(n);

function formatInput(el) {
  const raw = el.value.replace(/[^0-9]/g, '');
  el.dataset.raw = raw;
  el.value = raw ? Number(raw).toLocaleString('id-ID') : '';
}
const rawOf = (el) => parseFloat(el.dataset.raw || el.value.replace(/[^0-9]/g, '')) || 0;

function save() {
  try { localStorage.setItem(STORAGE_KEY_EDU, JSON.stringify({ age: $('edu-child-age').value, cost: $('edu-kuliah-cost').dataset.raw || '', agent: document.querySelector('input[name="edu-is-agent"]:checked')?.value || 'no' })); } catch (e) {}
}
function restore() {
  try {
    const s = JSON.parse(localStorage.getItem(STORAGE_KEY_EDU) || '{}');
    if (s.age) $('edu-child-age').value = s.age;
    if (s.cost) { $('edu-kuliah-cost').value = s.cost; formatInput($('edu-kuliah-cost')); }
    if (s.agent) { const r = document.querySelector(`input[name="edu-is-agent"][value="${s.agent}"]`); if (r) r.checked = true; }
  } catch (e) {}
}

let last = null;

function calculate(e) {
  e.preventDefault();
  const err = $('edu-error');
  const age = parseInt($('edu-child-age').value, 10);
  const cost = rawOf($('edu-kuliah-cost'));
  const isAgent = document.querySelector('input[name="edu-is-agent"]:checked')?.value === 'yes';
  if (isNaN(age) || age < 0 || age > 17) { err.textContent = 'Isi umur anak antara 0 sampai 17 tahun.'; err.hidden = false; $('edu-child-age').focus(); return; }
  if (cost <= 0) { err.textContent = 'Isi perkiraan biaya kuliah hari ini, atau pilih salah satu perkiraan di bawahnya.'; err.hidden = false; $('edu-kuliah-cost').focus(); return; }
  err.hidden = true;

  const years = Math.max(0, KULIAH_START_AGE - age);
  const future = cost * Math.pow(1 + EDU_INFLATION, years);
  last = { childAge: age, cost, isAgent, years, future };
  save();
  post({ action: 'calc_view_education', child_age: age, kuliah_cost: cost, is_agent: isAgent });
  px('track', 'ViewContent', { content_name: 'kalkulator-dana-kuliah', content_category: 'tool' });

  const times = future / cost;
  const out = $('edu-results');
  out.innerHTML = `
    <div class="result-hero">
      <span class="eyebrow">Hasil kamu</span>
      <p class="result-big">${rp(future)}</p>
      <p>Perkiraan total biaya kuliah 4 tahun saat anak kamu masuk kuliah di umur ${KULIAH_START_AGE}, ${years} tahun lagi.</p>
    </div>
    <div class="tool-card">
      <h2>Rinciannya</h2>
      <ul class="result-rows">
        <li><span>Biaya kuliah hari ini</span><b>${rp(cost)}</b></li>
        <li><span>Biaya saat anak masuk kuliah</span><b class="red">${rp(future)}</b></li>
        <li><span>Naik berapa kali lipat</span><b>${times.toFixed(1).replace('.', ',')}×</b></li>
        <li><span>Waktu persiapan yang tersisa</span><b>${years} tahun</b></li>
      </ul>
    </div>
    <div class="tool-card tool-copy">
      <h2>Kenapa angkanya bisa sebesar itu</h2>
      <p>Biaya kuliah di sini dihitung naik 8% per tahun. Dengan kenaikan segitu, biayanya jadi dua kali lipat kira-kira tiap 9 tahun.</p>
      <p>Jadi yang hari ini ${rpShort(cost)}, ${years} tahun lagi jadi sekitar ${rpShort(future)}. ${years >= 9 ? 'Makin awal kamu mulai, makin ringan yang perlu disisihkan tiap bulan.' : years > 0 ? 'Waktunya tinggal sedikit, jadi yang perlu disisihkan tiap bulan lebih besar.' : 'Anak kamu sudah di usia masuk kuliah, jadi biayanya sudah di depan mata.'}</p>
      <p class="tool-note">Hasil nyata bisa beda, tergantung kampus, kota, dan jurusan. Angka ini gambaran awal, belum rencana.</p>
    </div>
    ${isAgent ? '' : `
    <div class="cta-card">
      <h2>Mau dibantu nyusun rencananya?</h2>
      <p>Telepon 10 menit lewat WhatsApp dengan Philip Mulyana, CFP®, agen asuransi jiwa berlisensi Prudential. Kamu cerita kondisi keluarga dan hasil ini, lalu Philip melihat apa yang bisa dibantu. Gratis, dan kamu tidak wajib membeli apa pun.</p>
      <a class="button" id="edu-first-call" href="${FIRST_CALL}" target="_blank" rel="noopener" data-forward-attribution>Pilih jadwal ngobrol 10 menit</a>
    </div>
    <form class="tool-card" id="edu-lead" novalidate>
      <h2>Simpan hasil ini di WhatsApp kamu</h2>
      <p class="tool-sub">Philip kirim rinciannya lewat WhatsApp, supaya bisa kamu buka lagi atau bahas bareng pasangan.</p>
      <div class="field"><label for="edu-nama">Nama</label><input type="text" id="edu-nama" autocomplete="name" placeholder="Nama kamu"></div>
      <div class="field"><label for="edu-whatsapp">Nomor WhatsApp</label><input type="tel" id="edu-whatsapp" autocomplete="tel" inputmode="tel" placeholder="Contoh: 0812 3456 7890"></div>
      <label class="consent"><input type="checkbox" id="edu-consent"><span>Saya setuju Philip menghubungi saya lewat WhatsApp soal hasil ini. Lihat <a href="/privacy-policy/">kebijakan privasi</a>.</span></label>
      <p class="tool-error" id="edu-lead-error" hidden></p>
      <button type="submit" class="button" id="edu-submit">Kirim ke WhatsApp saya</button>
    </form>`}
    <p class="tool-note"><a href="#edu-form" id="edu-again">Hitung ulang dengan angka lain</a></p>`;
  out.hidden = false;
  out.scrollIntoView({ behavior: 'smooth', block: 'start' });

  if (!isAgent) {
    $('edu-first-call').addEventListener('click', () => { px('track', 'Schedule', { content_name: 'kalkulator-dana-kuliah' }); funnel('first_call_click', last); });
    $('edu-lead').addEventListener('submit', sendLead);
  }
}

function sendLead(e) {
  e.preventDefault();
  const err = $('edu-lead-error');
  const nama = $('edu-nama').value.trim();
  const whatsapp = $('edu-whatsapp').value.replace(/[^0-9+]/g, '');
  const missing = [];
  if (!nama) missing.push('nama');
  if (whatsapp.length < 9) missing.push('nomor WhatsApp');
  if (missing.length) { err.textContent = 'Isi ' + missing.join(' dan ') + ' dulu ya.'; err.hidden = false; return; }
  if (!$('edu-consent').checked) { err.textContent = 'Centang persetujuan dulu sebelum kirim.'; err.hidden = false; return; }
  err.hidden = true;
  $('edu-submit').disabled = true;
  post({ action: 'website_calc_education', nama, email: '', whatsapp, child_age: last.childAge, kuliah_cost: last.cost, kuliah_future: Math.round(last.future), total_needed: Math.round(last.future), is_full_breakdown: true, is_agent: false });
  px('track', 'Lead', { content_name: 'kalkulator-dana-kuliah' });
  $('edu-lead').innerHTML = `<h2>Terkirim</h2><p class="done-box">Philip kirim rinciannya ke WhatsApp ${esc(whatsapp)} paling lambat 1×24 jam. Kalau mau langsung ngobrol, <a href="${FIRST_CALL}" target="_blank" rel="noopener" data-forward-attribution>pilih jadwal 10 menit di sini</a>.</p>`;
}

document.addEventListener('DOMContentLoaded', () => {
  const costEl = $('edu-kuliah-cost');
  costEl.addEventListener('input', () => { formatInput(costEl); save(); });
  $('edu-child-age').addEventListener('input', save);
  document.querySelectorAll('input[name="edu-is-agent"]').forEach((r) => r.addEventListener('change', save));
  document.querySelectorAll('.chip[data-cost]').forEach((b) => b.addEventListener('click', () => { costEl.value = b.dataset.cost; formatInput(costEl); save(); }));
  $('edu-form').addEventListener('submit', calculate);
  restore();
});
