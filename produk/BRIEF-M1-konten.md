# Brief: Konten M1 — Biaya Pendidikan Anak

Untuk session Claude mana pun (cloud atau lokal) yang mengerjakan konten Philip. Baca juga `CLAUDE.md` di root repo sebelum mulai.

> **Lokasi file:** brief ini, `CLAUDE.md`, dan folder `produk/` per 16 Nov 2026 ada di branch `claude/youthful-noether-343ekn` repo `philipmulyana/philipmulyana.github.io`, belum di `main`. Checkout branch itu, atau tanya Philip apakah sudah di-merge.

**Istilah:**
- **M1–M12:** 12 masalah audiens yang dipetakan di dashboard. M1 = biaya pendidikan anak.
- **Level produk:**
  - **Gratis:** konten, kalkulator, checklist.
  - **DIY:** produk berbayar yang dikerjakan pembeli sendiri.
  - **DWY:** dikerjakan bersama Philip.
  - **DFY:** Philip yang mengerjakan, misalnya polis.
- **Konteks tambahan:** `produk/demand-ringkasan.md` (demand per masalah) dan `produk/dashboard-produk.html` (kode dashboard).

## 1. Fokus
- Keputusan Philip (16 Nov 2026): **fokus ke satu masalah dulu, M1 Biaya pendidikan anak**, dan produknya diperbanyak.
- **Target: orang tua mampu di kota besar** (pengeluaran rumah tangga ±Rp30jt/bulan untuk 1 anak, ±Rp50jt untuk 2 anak), bukan SES menengah ke bawah. Keputusan Philip 16 Nov 2026.
- Konten yang akan dibuat **sebagian besar artikel tentang biaya kuliah dan keperluan sekolah**.
- Format persis (blog, carousel, Reels, dll.) belum ditentukan. Tanyakan ke Philip sebelum mulai.

## 2. Pusat product management
- Dashboard produk: https://claude.ai/artifact/Fb6ot1RTq8AHfBoPXW8ieV (perlu login claude.ai Philip).
- Setiap produk atau keputusan baru dicatat di sana dulu (lihat aturan di `CLAUDE.md`). Kalau session tidak punya akses ke dashboard, tulis usulan/keputusan di laporan untuk Philip agar dimasukkan.

## 3. Produk M1 (status per 16 Nov 2026)

| Level | Produk | Status |
|---|---|---|
| Gratis | Kalkulator dana kuliah (`tools/education/`) | Live |
| Gratis | Rencana pendidikan anak (`tools/eduplan/`) | Live |
| Gratis | Artikel biaya kuliah: `blog/biaya-kuliah-swasta-non-kedokteran.html` (termasuk cost of delay), `blog/biaya-kuliah-5-universitas-top-malaysia-2026.html` | Live |
| Gratis | Kalkulator biaya sekolah per jenjang (TK–kuliah) | Ide |
| Gratis | Fitur "mulai sekarang vs nunda N tahun" di kalkulator dana kuliah | Ide |
| Gratis | ~~Kuis "rencana pendidikan anak lu sehat?"~~ | Stop (dicoret 16 Nov: tidak dicari di simulasi) |
| Gratis | Checklist biaya masuk sekolah (uang pangkal, seragam, buku, dll.) | Ide |
| DIY | Dana Kuliah Rp149rb (`product/dana-kuliah/`, mendukung maks. 2 anak) | Live |
| DIY | Add-on Dana Kuliah: template 3 anak atau lebih | Ide (keputusan 16 Nov: jadi add-on Dana Kuliah, bukan produk sendiri) |
| DIY | Kelas "tabungan vs reksa dana vs asuransi" | Ide |
| DIY | Panduan biaya kuliah luar negeri | Ide |
| DIY | Workbook "sekolah negeri atau swasta" | Ide |
| DIY | Rencana dana pendidikan untuk penghasilan tidak tetap | Ide (simulasi orang tua: didukung, ±38) |
| DIY | Rencana dana cadangan sekolah | Ide (celah simulasi orang tua, ±16) |
| DIY | Rencana pendidikan yang seimbang dengan pensiun & tanggungan orang tua | Ide (celah simulasi orang tua, ±16) |
| Gratis | Kalender pencairan biaya pendidikan multi-anak | Ide (celah simulasi orang tua, ±15) |
| Gratis | Biaya cadangan kalau anak gagal PTN (kampus swasta / FK swasta) | Ide (celah simulasi orang tua, ±15) |
| Gratis | Daftar biaya hidup & biaya tersembunyi kuliah | Ide (celah simulasi orang tua, ±14) |
| ~~Gratis/DIY~~ | ~~Panduan beasiswa · Nyicil uang pangkal · Rencana sambil bayar cicilan~~ | Stop (dicoret 16 Nov: tidak cocok dengan target orang tua mampu) |
| DWY | Financial Planning Keluarga ±Rp5jt (produk payung, termasuk Review Polis) | Ide |
| DFY | Polis pendidikan | Ide, belum dicek apakah Philip menjualnya |

Jalur yang sudah disepakati:
- Yang mengisi tool dana kuliah ditawari **Dana Kuliah Rp149rb dulu**.
- Cross-sell: Dana Kuliah → kalkulator proteksi ("kalau orang tua meninggal, siapa yang lanjut bayar kuliah anak?").

## 4. Arah konten (artikel biaya kuliah & keperluan sekolah)
- Tujuan konten: **mengarahkan pembaca ke produk M1 gratis** (kalkulator, daftar biaya, panduan kuliah luar negeri), lalu ke **Dana Kuliah Rp149rb**.
- **Dasar arah topik:** simulasi 100 persona orang tua mampu di kota besar (`produk/m1-ortu/m1-ringkasan-ortu.md`, kerangka di `produk/m1-ortu/segmen.md`). Ini hipotesis yang dibuat AI, bukan data pembaca. Simulasi lama (`produk/m1-ringkasan.md`, SES campur) tidak lagi dipakai untuk arah konten.
- Temuan simulasi yang dipakai:
  - Kekhawatiran teratas: **kuliah luar negeri dan kurs (±29)**, penghasilan tidak tetap/uang anak tercampur uang usaha (±16), uang pangkal/SPP (±13), gagal PTN atau FK swasta mahal (±12).
  - Yang paling diinginkan gratis: **biaya kuliah luar negeri dalam rupiah, termasuk skenario kurs (±32)**, daftar biaya sekolah per jenjang/kota (±20), biaya kampus swasta/FK sebagai cadangan (±19).
  - Yang diinginkan dari DIY murah: **rencana tertulis per anak dengan setoran bulanan (±37)**, setoran fleksibel terpisah dari uang usaha (±20).
  - Bentuk yang disukai: **template/spreadsheet (42), chat/konsultasi (38), kalkulator online (35)**. Video singkat 21; kelas live hanya 2.
- Contoh topik, diurutkan sesuai temuan di atas. Ini **usulan**, bukan daftar yang sudah disetujui Philip:
  1. Biaya kuliah luar negeri dalam rupiah per negara (biaya kuliah + hidup), termasuk dampak kurs.
  2. Biaya cadangan kalau anak tidak lolos PTN: kampus swasta dan FK swasta.
  3. Menyiapkan dana pendidikan saat penghasilan tidak tetap / pemilik usaha.
  4. Biaya sekolah per jenjang dan per kota (nasional plus, internasional, swasta nasional, negeri).
  5. Biaya hidup dan biaya tersembunyi saat kuliah.
  6. Kalender biaya pendidikan untuk dua anak atau lebih.
  7. Dana pendidikan anak vs pensiun dan tanggungan orang tua.
- Format yang diutamakan: konten yang mengarah ke **kalkulator atau template**, bukan video panjang atau kelas live.

## 5. Aturan wajib

Aturan dari `CLAUDE.md` ditandai (CLAUDE.md). Sisanya aturan khusus brief ini.
- **Jangan menebak angka** (CLAUDE.md: never assume). Biaya kampus atau sekolah harus punya sumber yang bisa dicek. Kalau tidak ada, tulis "belum dicek".
- **Asumsi inflasi pendidikan: 8% per tahun** (keputusan Philip, 16 Nov 2026). Dipakai di semua konten dan tool M1 (`js/education.js` dan `js/eduplan.js`).
- **Gaya bahasa Philip:** pakai skill `philip-voice` untuk semua copy Bahasa Indonesia. Untuk artikel blog SEO ada skill `seo-blog-writer`. Kalau salah satu skill tidak ada di session, bilang ke Philip. Jangan diganti dengan cara lain tanpa izin.
- **Setiap hasil dicek sub-agent** (general-purpose, model sonnet) sebelum dilaporkan (CLAUDE.md).
- **Desain visual** (carousel, halaman, gambar) memakai skill `ui-ux-pro-max` dan leaf.id sebagai acuan (CLAUDE.md). Skill ini belum tentu terpasang. Kalau tidak ada, tanya Philip sebelum memasang.

## 6. Yang masih menunggu keputusan Philip
1. Format konten dan jumlahnya.
