# Brief: isi detail 100 persona orang tua (simulasi)
Persona SIMULASI untuk produk seputar biaya pendidikan anak. Target: keluarga mampu (SES atas) di kota besar Indonesia, 2026. Bahasa Indonesia.
Input satu-satunya: alokasi.csv di folder ini. Kolom id, kota, jumlah_anak, jenjang_anak_tertua, pekerjaan, jenis_sekolah, rentang_umur, rentang_pengeluaran_jt, atribut SUDAH DIKUNCI; salin persis. Jangan pakai sumber lain. Jangan menyebut produk, merek keuangan tertentu, atau nama Philip.

Tulis CSV (UTF-8, QUOTE_ALL) ke file di tugasmu, satu baris per id, header persis:
id,kota,jumlah_anak,jenjang_anak_tertua,pekerjaan,jenis_sekolah,rentang_umur,rentang_pengeluaran_jt,atribut,nama_samaran,umur,kota_detail,pekerjaan_detail,pekerjaan_pasangan,umur_anak,sekolah_anak_detail,penghasilan_rt_rp,pengeluaran_rt_rp,biaya_pendidikan_bulanan_rp,cicilan_rp,kirim_keluarga_rp,sisa_uang_bebas_rp,tabungan_pendidikan_rp,instrumen_keuangan,rencana_kuliah_anak,pengambil_keputusan_keuangan,sumber_info_keuangan,kanal_media,kekhawatiran_situasi

Aturan:
1. umur di dalam rentang_umur. umur_anak: daftar umur semua anak (mis. "11, 7"), jumlah sesuai jumlah_anak ("3+" = 3 atau 4 anak), anak tertua sesuai jenjang_anak_tertua (Balita/TK 0–5, SD 6–11, SMP 12–14, SMA 15–17, Kuliah 18–22). Kalau ada yang sedang hamil, tulis "hamil" di umur_anak.
2. pengeluaran_rt_rp (per bulan) HARUS di dalam rentang_pengeluaran_jt (juta). penghasilan_rt_rp per bulan harus masuk akal untuk pekerjaan & kota dan cukup menutup pengeluaran; sisa_uang_bebas_rp = penghasilan - pengeluaran - cicilan - kirim_keluarga (boleh kecil/negatif, tapi jarang).
3. biaya_pendidikan_bulanan_rp konsisten dengan jenis_sekolah, jumlah dan jenjang anak, dan kota (sekolah internasional jauh lebih mahal). Termasuk SPP + les/kegiatan rata-rata per bulan. Merupakan bagian dari pengeluaran_rt_rp.
4. sekolah_anak_detail: jenis sekolah per anak (boleh campur; anak balita bisa "belum sekolah"/"daycare").
5. Atribut wajib tercermin: "Rencana kuliah luar negeri" → rencana_kuliah_anak menyebut negara/opsi luar negeri; "Generasi sandwich" → kirim_keluarga_rp > 0; "Penghasilan tidak tetap" → penghasilan naik-turun disebut di pekerjaan_detail; "Sudah punya asuransi/investasi" → instrumen_keuangan menyebut asuransi dan/atau investasi (jenis umum, bukan merek). Persona TANPA atribut itu boleh punya instrumen sederhana (tabungan, deposito) atau tidak punya.
6. tabungan_pendidikan_rp: saldo yang sudah khusus disiapkan untuk pendidikan (boleh 0). Realistis dan bervariasi; banyak keluarga mampu pun belum terencana.
7. pengambil_keputusan_keuangan: "Suami", "Istri", "Berdua", atau "Persona sendiri". Netral gender, variasikan.
8. kekhawatiran_situasi: 1–2 kalimat spesifik soal biaya pendidikan anak dari sudut pandang persona, jangan template, jangan terlalu positif.
9. Nama samaran umum Indonesia, beragam daerah, tidak mirip tokoh publik, unik di antara id yang ditugaskan.
Setelah selesai, cek sendiri: jumlah baris, header, aturan 1–3 dan 5. Laporkan singkat.
