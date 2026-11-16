# Kerangka Segmen — 100 Persona Simulasi
Produk: Kelas "Cinta Boleh Buta, Rekening Jangan" (input: `PRODUK.md`)
Status: **DRAFT, menunggu persetujuan Philip.** Revisi: fokus ke yang **sudah menikah, umur 30+** (arahan Philip). PRODUK.md sudah disesuaikan ke target ini. Semua kuota, sebaran, dan alasan di bawah adalah **asumsi/hipotesis desain**, bukan data follower.

## A. Unit persona
- 1 persona = **1 orang** yang melihat offer dan memutuskan beli/tidak. Karena tiket berlaku per pasangan, tiap persona punya kolom **"pasangan ikut setuju?"**.
- SES dihitung dari **pengeluaran rumah tangga** (berdua bila sudah menikah/tinggal bersama; pengeluaran sendiri bila belum — catatan: SES persona yang belum serumah (T1, T2, T8, sebagian T7) jadi kurang sebanding dengan yang sudah serumah).

## B. Tahap hubungan (saling eksklusif — tiap persona masuk tepat 1)

**Aturan penempatan:** cek T7 dulu, lalu T8, lalu T1–T6. Lama nikah dihitung dalam bulan. Tinggal bersama/nikah siri dihitung seperti menikah sesuai lamanya. Pasangan yang sedang pisah/proses cerai **di luar cakupan** simulasi.

| # | Tahap | Kuota | Hipotesis kenapa dimasukkan |
|---|---|---|---|
| T1 | Pacaran serius, rencana nikah ≥ 12 bulan lagi atau belum pasti | 3 | Di luar target utama. Tes apakah mau bayar untuk pencegahan |
| T2 | Persiapan nikah (< 12 bulan) | 5 | Di luar target utama; uang tersedot biaya nikah |
| T3 | Nikah 0–11 bulan | 10 | Sudah menikah, baru mulai (kemungkinan sebagian di bawah 30) |
| T4 | Nikah 12–35 bulan (dengan atau tanpa anak) | 22 | Termasuk target (sudah menikah) |
| T5 | Nikah 36–119 bulan | 30 | Target utama (sudah nikah, umur 30+) |
| T6 | Nikah ≥ 120 bulan | 18 | Target utama |
| T7 | Pernah bercerai atau ditinggal wafat, dan kini punya pasangan (pacaran atau sudah menikah lagi) | 7 | Segmen sensitif (lihat aturan 6). Status target: sebagian (yang mau/baru nikah lagi) |
| T8 | Kontrol: tidak punya pasangan (termasuk yang pernah bercerai) | 5 | Tiket per pasangan → diharapkan mayoritas menolak; dipakai sebagai cek realisme |
| | **Total** | **100** | |

## C. Atribut tambahan (boleh tumpang tindih, ditempel ke persona di tahap mana pun)

Atribut dinilai di tingkat **pasangan/rumah tangga**, bukan hanya persona.

| Atribut | Minimal jumlah persona | Hipotesis |
|---|---|---|
| Sering ribut soal uang | 30 | Pemicu terkuat untuk beli |
| Generasi sandwich (salah satu/keduanya menanggung orang tua/saudara) | 25 | Isu "keluarga tanpa batas" (Modul 2–4) |
| Penghasilan tidak tetap (persona atau pasangannya) | minimal 30 (semua wiraswasta/UMKM & freelance; karyawan berbasis komisi boleh ditambahkan) | Sistem 3 Kantong lebih sulit (Modul 4) |
| Penghasilan beda jauh (salah satu pasangan pencari nafkah utama; 5 persona "tidak bekerja" otomatis termasuk, dan karena itu tidak boleh ditempatkan di T8) | 15 | Isu kontribusi proporsional (Modul 4) |
| Hamil atau punya anak kecil | 20 | Pengeluaran naik, waktu sempit |
| Punya cicilan/paylater/pinjol aktif | 35 | Isu rahasia utang (Modul 3) |

## D. Sebaran silang (seluruh 100)

**Kategori kota** (kategori kerja untuk simulasi, bukan klasifikasi resmi):
- Metro — Jabodetabek, Surabaya, Bandung, Medan: **50**
- Kota tier 2 — ibu kota provinsi lain, mis. Semarang, Makassar, Palembang, Denpasar: **35**
- Kota kecil — kabupaten/kota di luar dua kategori di atas: **15**

**Kelas SES** (patokan rupiah = **asumsi kerja**, bukan definisi resmi lembaga riset mana pun):
| SES | Kuota | Pengeluaran rumah tangga/bulan |
|---|---|---|
| A | 15 | > Rp15 jt |
| B | 35 | Rp7,5–15 jt |
| C1 | 35 | Rp4–7,5 jt |
| C2 | 15 | < Rp4 jt |

**Pekerjaan (asumsi):** Karyawan swasta 50 · PNS/BUMN 15 · Wiraswasta/UMKM 20 · Freelance/kreator 10 · Tidak bekerja (mis. mengurus rumah tangga, mencari kerja) 5

**Umur:** 22–29: 10 · 30–34: 35 · 35–40: 35 · 41+: 20 (fokus 30+ sesuai arahan Philip; harus konsisten dengan tahap — T6 minimal umur 32)

## E. Aturan untuk generator
1. Penghasilan, cicilan, dan sisa uang bebas harus konsisten dengan SES, kota, dan pekerjaan. Kombinasi ekstrem (mis. SES C2 di Metro) boleh, tapi harus masuk akal.
2. **Parameter desain (bukan data):** minimal 30% persona menolak di harga tertinggi yang dites, supaya hasil tidak terlalu positif.
3. Tiap persona wajib punya alternatif gratis yang realistis (YouTube, TikTok, konseling rumah ibadah, curhat teman).
4. Agama/budaya hanya dimasukkan bila relevan dengan masalah uang (mis. keluarga besar, mahar/seserahan), tanpa stereotip.
5. Pakai nama samaran umum, bukan nama orang asli. Bahasa netral gender untuk peran pencari nafkah.
6. T7 (pernah bercerai atau ditinggal wafat): tidak ada penilaian/menyalahkan, dan **tidak dikaitkan dengan cerita pribadi Philip**.

## F. Yang perlu dikonfirmasi Philip
1. Kuota per tahap & atribut — ada yang mau diubah/dihapus?
2. Sebaran kota & SES — sesuai profil follower kamu?
3. Patokan rupiah SES — mau pakai patokan sendiri?
