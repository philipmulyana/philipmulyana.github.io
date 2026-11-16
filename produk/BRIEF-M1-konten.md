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
| Gratis | Kuis "rencana pendidikan anak lu sehat?" | Ide |
| Gratis | Checklist biaya masuk sekolah (uang pangkal, seragam, buku, dll.) | Ide |
| DIY | Dana Kuliah Rp149rb (`product/dana-kuliah/`, mendukung maks. 2 anak) | Live |
| DIY | Template rencana dana pendidikan 3 anak atau lebih / add-on Dana Kuliah | Ide |
| DIY | Kelas "tabungan vs reksa dana vs asuransi" | Ide, **perlu cek kepatuhan** |
| DIY | Panduan biaya kuliah luar negeri | Ide |
| DIY | Workbook "sekolah negeri atau swasta" | Ide |
| DWY | Financial Planning Keluarga ±Rp5jt (produk payung, termasuk Review Polis) | Ide |
| DFY | Polis pendidikan | Ide, belum dicek apakah Philip menjualnya |

Jalur yang sudah disepakati:
- Yang mengisi tool dana kuliah ditawari **Dana Kuliah Rp149rb dulu**.
- Cross-sell: Dana Kuliah → kalkulator proteksi ("kalau orang tua meninggal, siapa yang lanjut bayar kuliah anak?").

## 4. Arah konten (artikel biaya kuliah & keperluan sekolah)
- Tujuan konten: **mengarahkan pembaca ke produk M1 gratis** (kalkulator, kuis, checklist), lalu ke **Dana Kuliah Rp149rb**.
- Contoh topik yang cocok dengan produk di atas. Ini **usulan**, bukan daftar yang sudah disetujui Philip:
  - Biaya kuliah per jurusan / per kampus (melanjutkan dua artikel yang sudah ada).
  - Biaya masuk sekolah selain SPP (uang pangkal, seragam, buku, kegiatan).
  - Sekolah negeri vs swasta: biaya sebenarnya.
  - Biaya kuliah luar negeri.
  - Berapa yang hilang kalau menunda menabung.

## 5. Aturan wajib

Aturan dari `CLAUDE.md` ditandai (CLAUDE.md). Sisanya aturan khusus brief ini.
- **Jangan menebak angka** (CLAUDE.md: never assume). Biaya kampus atau sekolah harus punya sumber yang bisa dicek. Kalau tidak ada, tulis "belum dicek".
- **Asumsi inflasi pendidikan belum diputuskan.** Tool yang ada memakai 8% (`js/education.js`) dan 10% (`js/eduplan.js`). Jangan pakai angka ketiga. Tanyakan Philip dulu.
- **Gaya bahasa Philip:** pakai skill `philip-voice` untuk semua copy Bahasa Indonesia. Untuk artikel blog SEO ada skill `seo-blog-writer`. Kalau salah satu skill tidak ada di session, bilang ke Philip. Jangan diganti dengan cara lain tanpa izin.
- **Tidak boleh merekomendasikan produk investasi tertentu.** Philip agen asuransi; perbandingan instrumen hanya edukasi, dengan pengungkapan dan disclaimer.
- **Setiap hasil dicek sub-agent** (general-purpose, model sonnet) sebelum dilaporkan (CLAUDE.md).
- **Desain visual** (carousel, halaman, gambar) memakai skill `ui-ux-pro-max` dan leaf.id sebagai acuan (CLAUDE.md). Skill ini belum tentu terpasang. Kalau tidak ada, tanya Philip sebelum memasang.

## 6. Yang masih menunggu keputusan Philip
1. Angka asumsi inflasi pendidikan (8%, 10%, atau lain).
2. Kelas "tabungan vs reksa dana vs asuransi": lanjut setelah cek ke agensi, atau dicoret.
3. Template 3 anak atau lebih: produk sendiri atau add-on Dana Kuliah.
4. Format konten dan jumlahnya.
