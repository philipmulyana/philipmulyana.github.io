# Demand 4 Masalah — Simulasi + Data Asli

## A. Simulasi 100 persona (bukan data pembeli)

> ⚠️ Persona dan jawabannya dibuat model AI. Persona-nya **sama dengan yang dibuat untuk kelas Uang & Relasi** (`uang-dan-relasi/persona-100.csv`): mayoritas sudah menikah, umur 30+, dan 30 persona sengaja diberi atribut "sering ribut soal uang". Jadi hasil M2 (ribut uang) **kemungkinan terlalu tinggi** dibanding audiens umum: **29 dari 35** persona dengan urgensi tinggi di M2 berasal dari 30 persona yang sengaja diberi atribut itu; dari 70 persona lainnya hanya 6. Data per persona: `uang-dan-relasi/demand-4-masalah.csv`.

| Masalah | Sadar punya masalah | Rata-rata urgensi (yang sadar, skala 1–5) | Urgensi tinggi (4–5) | Mau bayar: Ya / Ragu / Tidak |
|---|---|---|---|---|
| M1 Biaya pendidikan anak | 64 | 2,6 | 11 | 9 / 29 / 62 |
| M2 Ribut / tidak sepakat soal uang dengan pasangan | 80 | 3,1 | 35 | 7 / 46 / 47 |
| M3 Keluarga kacau kalau pencari nafkah meninggal/sakit | 70 | 2,2 | 3 | 5 / 33 / 62 |
| M4 Pensiun | 40 | 2,0 | 2 | 4 / 13 / 83 |

- **"Mau bayar: Ya"** hampir semuanya dari SES A dan B.
- 17 persona bilang "Ya" mau bayar untuk minimal satu masalah. 69 persona bilang "Ya" atau "Ragu" untuk minimal satu masalah.

**Cara membaca (hipotesis, perlu dites):**
1. **M2 terlihat paling mendesak** (35 urgensi tinggi), tapi angka ini **hampir seluruhnya akibat cara persona dibuat** (lihat catatan di atas). Di luar persona itu, M2 tidak menonjol. Sebagian besar juga masih **ragu** untuk bayar.
2. **M3 (proteksi) disadari banyak orang (70) tapi hampir tidak mendesak** (3 urgensi tinggi). Hipotesis: proteksi dirasa penting tapi terus ditunda. Perlu dites.
3. **M1 (pendidikan anak)** ada di tengah: cukup disadari, urgensi sedang.
4. **M4 (pensiun)** paling lemah secara keseluruhan karena 80% persona berumur di bawah 41. Di persona umur 41+, 19 dari 20 sadar masalah pensiun; di bawah 41 hanya 21 dari 80.

## B. Data asli yang bisa dibaca dari sesi ini

**1. Tools proteksi & survival** (tersimpan di database Supabase; hanya hitungan, tanpa data pribadi)
Periode 11 Okt – 13 Nov 2026, dihitung per sesi unik:

| Langkah | Sesi |
|---|---|
| Membuka tool | 22 |
| Mulai mengisi | 9 |
| Selesai | 6 |
| Minta laporan | 3 |
| Booking dibuat | 4 |

- Belum ada data sumber trafik (UTM kosong). Catatan: booking (4) lebih banyak dari permintaan laporan (3), kemungkinan ada booking yang tidak lewat langkah laporan. Belum dicek.
- Sebagian sesi di 11–14 Okt kemungkinan uji coba internal. **Belum bisa dibedakan dari data.**

**2. Penjualan di Mayar** (hanya tanggal, nama link, nominal)

| Tanggal | Link | Nominal |
|---|---|---|
| 16 Sep 2026 | Dana Kuliah | 5× Rp0, 1× Rp149.000 |
| 26 Okt 2026 | Pro Plan | Rp99.000 |
| 8 Nov 2026 | Invoice | Rp10.000 |
| 10 Nov 2026 | Invoice | 3× Rp499.000 |

- Lima transaksi Dana Kuliah Rp0 di hari yang sama kemungkinan tes atau kupon. **Belum dicek.**
- Isi "Invoice" dan "Pro Plan" tidak terlihat dari data ini. **Perlu konfirmasi Philip.**

**3. Yang tidak bisa dibaca dari sesi ini**
Tool dana kuliah, pensiun, kesiapan pensiun, rencana pendidikan, financial check-up, dan Master Plan mengirim data ke server lain (`modal.run`), bukan ke database yang terhubung. Tool proteksi & survival mengirim lewat `klienku.vercel.app`; datanya kemungkinan yang terbaca di Supabase (hubungannya tidak bisa dicek dari repo). Data demand untuk M1 dan M4 dari tools **belum bisa dilihat**.

## C. Kesimpulan sementara
- **Data asli masih sangat tipis** (puluhan sesi, 1 penjualan Dana Kuliah berbayar). Belum cukup untuk menyimpulkan demand.
- **Simulasi** memberi urutan hipotesis: M3 banyak disadari tapi ditunda, M1 sedang, M4 kuat hanya di umur 41+, dan M2 belum bisa dinilai karena bias persona.
- Alasan per persona di CSV untuk yang "tidak sadar" banyak yang generik (mis. "Belum punya anak"), jadi jangan dikutip sebagai bukti. Urutan ini perlu dites ke follower asli, dan sebaiknya dengan persona yang tidak dibuat khusus untuk satu produk.
