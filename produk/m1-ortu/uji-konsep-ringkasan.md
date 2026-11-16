# Uji Konsep 17 Produk M1 ke 100 Persona Orang Tua

> ⚠️ **Simulasi AI, bukan data pembeli.** 100 persona orang tua mampu di kota besar (`persona-ortu-100.csv`) membaca 17 kartu di `konsep-produk-m1.md`. Harga produk Ide adalah harga uji yang disetujui Philip khusus untuk tes, bukan harga final. Hasilnya hipotesis untuk diuji ke follower asli.
> Data lengkap: `uji-konsep-m1.csv` (1.700 jawaban). Jawaban persona O041–O050 dibuat ulang karena versi pertama terlalu umum.

## 1. Gratis — mau pakai

| Kartu | Produk | Status | Pakai | Ragu |
|---|---|---|---|---|
| G1 | Kalkulator dana kuliah | Live | **66** | 23 |
| G9 | Biaya hidup & biaya tersembunyi kuliah | Ide | **54** | 34 |
| G7 | Kalender pencairan multi-anak | Ide | **46** | 18 |
| G4 | Kalkulator biaya sekolah per jenjang | Ide | 40 | 33 |
| G6 | Checklist biaya masuk sekolah | Ide | 39 | 50 |
| G5 | Fitur "mulai sekarang vs nunda" | Ide | 38 | 20 |
| G3 | Artikel biaya kuliah | Live | 31 | 47 |
| G8 | Biaya cadangan kalau gagal PTN | Ide | 25 | 36 |
| G2 | Rencana pendidikan anak | Live | **4** | **79** |

- **G2 hampir tidak dipakai** walau relevan: email + nomor WA wajib dan dihubungi via WA dalam 24 jam. ±14 persona minta WA dibuat opsional; ±15 minta bisa untuk beberapa anak sekaligus.
- **G7 kuat di keluarga 3+ anak:** 19 dari 20 mau pakai.

## 2. DIY — mau beli di harga uji

| Kartu | Produk | Harga uji | Beli | Ragu |
|---|---|---|---|---|
| D4 | Panduan biaya kuliah luar negeri | Rp249rb | **26** | 16 |
| D6 | Rencana dana pendidikan untuk penghasilan tidak tetap | Rp149rb | **22** | 29 |
| D5 | Workbook negeri vs swasta | Rp99rb | 12 | 39 |
| D8 | Rencana pendidikan vs pensiun & orang tua | Rp199rb | 10 | 38 |
| D1 | Dana Kuliah (Live) | Rp149rb | **7** | **59** |
| D2 | Add-on 3+ anak | +Rp49rb | 3 | 10 |
| D7 | Dana cadangan sekolah | Rp99rb | 3 | 65 |
| D3 | Kelas tabungan vs reksa dana vs asuransi | Rp199rb | 2 | 46 |

**Pembeli per segmen (Beli):**

| Segmen (jumlah persona) | D1 | D2 | D4 | D6 | D8 |
|---|---|---|---|---|---|
| Rencana kuliah luar negeri (30) | 0 | 1 | **24** | 8 | 4 |
| Penghasilan tidak tetap (30) | 0 | 1 | 8 | **20** | 1 |
| Generasi sandwich (20) | 1 | 1 | 6 | 6 | **6** |
| 3+ anak (20) | 0 | 3 | 6 | 3 | 3 |
| Anak tertua balita/SD (55) | 7 | 3 | 15 | 14 | 6 |

## 3. Temuan utama (hipotesis)
1. **Produk yang paling laku adalah produk untuk segmen yang jelas:** D4 dibeli 24 dari 30 persona yang merencanakan kuliah luar negeri; D6 dibeli 20 dari 30 persona berpenghasilan tidak tetap.
2. **Dana Kuliah Rp149rb (D1) lemah di simulasi ini: 7 beli, 59 ragu.** Alasan yang paling sering: target di halaman hanya anak PAUD–SD dan maks. 2 anak, padahal banyak persona punya anak SMP ke atas atau 3+ anak. Yang diminta untuk diubah: cakupan sampai SMP/SMA/kuliah (±10) dan contoh/preview isi (±10).
3. **Rencana pendidikan anak (G2) terhambat dua hal:** syarat kontak (email + WA wajib, dihubungi dalam 24 jam; disebut di ±67 alasan) dan hanya satu anak per isian (alasan terbesar kedua). 79 ragu.
4. **Gratis yang paling menarik di luar kalkulator yang ada:** biaya tersembunyi kuliah (G9), kalender multi-anak (G7), biaya per jenjang (G4).
5. **Lemah:** kelas instrumen (D3), dana cadangan sekolah (D7), add-on 3+ anak (D2, juga karena harus beli D1 dulu).

## 4. Batasan
- Jawaban ditulis 4 agent berbeda, dan ada **efek penulis** yang jelas di kartu Gratis: batch O051–O075 paling murah hati, batch O076–O100 paling pelit (contoh G1: 20/13/22/11; G4: 10/9/15/6; G7: 14/10/15/7 dari 25). Jadi **baca kartu Gratis sebagai urutan, bukan angka absolut** (urutannya stabil: G1, G9, G7 di atas; G2 selalu paling bawah). Jawaban DIY lebih stabil antar batch.
- Banyak alasan di D2, D4, D8 bunyinya mirip antar persona, jadi alasan di kartu itu kurang beragam.
- Segmen persona ditentukan di `segmen.md`, bukan dari data follower.
- Hitungan "yang harus diubah" memakai pencocokan kata kunci (±).
