# Konsep Produk M1 — untuk Diuji ke Persona

Tujuan: ringkasan dan detail tiap produk M1 (Gratis & DIY yang masih aktif) supaya bisa diuji ke 100 persona orang tua mampu (`persona-ortu-100.csv`).

- Produk berstatus **Live** memakai detail yang ada di website.
- Produk berstatus **Ide** adalah **usulan konsep** dari Claude (16 Nov 2026), berdasarkan keinginan di `m1-ringkasan-ortu.md`. Isi, bentuk, dan harga belum disetujui Philip.
- **Harga uji** untuk produk Ide: usulan Claude, disetujui Philip (16 Nov) khusus untuk tes. Bukan harga final.
- Asumsi inflasi pendidikan: 8% per tahun.

Format tiap kartu: **Ringkasan** (satu kalimat yang ditunjukkan ke persona), lalu detail yang relevan: Untuk siapa · Masalah · Hasil yang dibawa pulang · Bentuk & isi · Waktu pakai · Harga · Yang bukan.

---

## A. Gratis

### G1. Kalkulator dana kuliah — *Live* (`tools/education/`)
**Ringkasan:** Masukkan umur anak dan biaya kuliah hari ini (total 4 tahun), langsung lihat perkiraan biaya saat anak masuk kuliah.
- **Untuk siapa:** orang tua yang belum tahu angka target kuliah.
- **Masalah:** tidak tahu berapa biaya kuliah nanti.
- **Hasil:** perkiraan biaya kuliah saat anak umur 18 (inflasi 8%), naik berapa kali lipat, dan sisa tahun.
- **Bentuk:** kalkulator online. Hasil langsung tampil tanpa isi nama atau nomor HP; opsional simpan rincian ke WhatsApp.
- **Waktu pakai:** 1 menit.
- **Harga:** gratis.
- **Yang bukan:** belum menghitung setoran per bulan atau dana yang sudah ada.

### G2. Rencana pendidikan anak — *Live* (`tools/eduplan/`)
**Ringkasan:** Isi profil, anak, pilihan kampus (lokal atau internasional), dan kondisi keuangan — dapat target dana kuliah dan setoran per bulan dalam tiga skenario, dikirim sebagai PDF ke email.
- **Untuk siapa:** orang tua yang mau tahu harus menabung berapa.
- **Masalah:** tahu harus menabung, tapi tidak tahu angkanya.
- **Hasil:** PDF berisi target dana dan setoran bulanan untuk satu anak, skenario optimis/base/pesimis.
- **Bentuk:** formulir 5 langkah (profil, anak, pilihan kampus, biaya & modal awal & surplus bulanan, kirim). Email dan nomor WA wajib diisi; Philip menghubungi via WhatsApp dalam 24 jam.
- **Waktu pakai:** 5–10 menit.
- **Harga:** gratis (tukar email + nomor WA).
- **Yang bukan:** satu anak per pengisian; tidak mencakup biaya sekolah sebelum kuliah.

### G3. Artikel biaya kuliah — *Live* (2 artikel di blog)
**Ringkasan:** Rincian biaya kuliah swasta dan 5 kampus top Malaysia, plus berapa yang hilang kalau menunda menabung.
- **Untuk siapa:** orang tua yang mencari gambaran biaya kuliah.
- **Hasil:** gambaran biaya kuliah dan contoh dampak menunda.
- **Bentuk:** artikel blog, menaut ke kalkulator.
- **Harga:** gratis.

### G4. Kalkulator biaya sekolah per jenjang — *Ide*
**Ringkasan:** Pilih kota, jenis sekolah (negeri, swasta nasional, nasional plus, internasional), dan umur anak — lihat perkiraan biaya TK sampai kuliah per tahun.
- **Untuk siapa:** orang tua yang mau tahu total biaya sekolah, bukan cuma kuliah.
- **Masalah:** biaya per jenjang dan per jenis sekolah tidak jelas.
- **Hasil:** tabel biaya per jenjang dan per tahun untuk anak sendiri.
- **Bentuk:** kalkulator online, hasil dikirim ke WA.
- **Waktu pakai:** 3–5 menit.
- **Harga:** gratis (tukar nomor WA).
- **Yang bukan:** angka adalah kisaran, bukan biaya resmi sekolah tertentu.

### G5. Fitur "mulai sekarang vs nunda" — *Ide* (fitur di G1/G2)
**Ringkasan:** Bandingkan setoran bulanan kalau mulai bulan ini vs menunda 1, 2, atau 3 tahun.
- **Hasil:** selisih setoran per bulan karena menunda.
- **Bentuk:** tambahan di kalkulator yang sudah ada.
- **Harga:** gratis.

### G6. Checklist biaya masuk sekolah — *Ide*
**Ringkasan:** Daftar semua biaya saat anak masuk jenjang baru, dari uang pangkal sampai seragam dan kegiatan, supaya tidak ada yang terlewat.
- **Hasil:** checklist yang bisa diisi angka per sekolah incaran.
- **Bentuk:** PDF / spreadsheet.
- **Waktu pakai:** 10 menit.
- **Harga:** gratis (tukar nomor WA).

### G7. Kalender pencairan biaya multi-anak — *Ide*
**Ringkasan:** Satu kalender yang menunjukkan tahun dan bulan kapan biaya besar tiap anak jatuh tempo, supaya tidak menumpuk di tahun yang sama.
- **Untuk siapa:** keluarga dengan 2 anak atau lebih.
- **Hasil:** kalender biaya 10–20 tahun ke depan untuk semua anak.
- **Bentuk:** spreadsheet / generator online.
- **Waktu pakai:** 10 menit.
- **Harga:** gratis (tukar nomor WA).

### G8. Biaya cadangan kalau anak gagal PTN — *Ide*
**Ringkasan:** Berapa biaya kampus swasta dan FK swasta kalau anak tidak lolos PTN, dan berapa selisihnya dari rencana awal.
- **Hasil:** kisaran biaya kampus swasta / FK swasta dan selisih dari target PTN.
- **Bentuk:** artikel + tabel / mini kalkulator.
- **Waktu pakai:** 5 menit.
- **Harga:** gratis.

### G9. Biaya hidup & biaya tersembunyi kuliah — *Ide*
**Ringkasan:** Daftar biaya di luar uang kuliah — kos, transport, laptop, kegiatan, wisuda — untuk dalam dan luar negeri.
- **Hasil:** checklist biaya tambahan per tahun.
- **Bentuk:** artikel + checklist.
- **Harga:** gratis.

---

## B. DIY berbayar

### D1. Dana Kuliah — *Live* (`product/dana-kuliah/`)
**Ringkasan:** Course mandiri 6 modul + workbook untuk menyusun Rencana Pendidikan Keluarga: hitung kebutuhan sampai kuliah, bandingkan dengan dana yang ada, lihat kekurangan, pilih langkah pertama.
- **Untuk siapa (di halaman):** orang tua dengan anak PAUD–SD yang mau bersiap dari sekarang.
- **Hasil:** Rencana Pendidikan Keluarga tertulis (maks. 2 anak), target biaya, kapan dibayar, gap, dan langkah pertama.
- **Bentuk:** course online mandiri + workbook.
- **Waktu pakai:** sesi pertama ±30 menit, lalu bertahap.
- **Harga:** Rp149.000 sekali bayar, garansi uang kembali 7 hari.
- **Yang bukan:** tidak memilihkan produk keuangan tertentu.

### D2. Add-on Dana Kuliah: 3 anak atau lebih — *Ide*
**Ringkasan:** Tambahan workbook Dana Kuliah untuk keluarga dengan 3 anak atau lebih, lengkap dengan pembagian dana antar anak.
- **Hasil:** rencana pendidikan untuk semua anak dalam satu file.
- **Harga uji:** +Rp49.000 di atas Dana Kuliah (usulan).

### D3. Kelas "tabungan vs reksa dana vs asuransi" untuk dana pendidikan — *Ide*
**Ringkasan:** Rekaman kelas 60–90 menit yang membandingkan cara menyiapkan dana pendidikan, dengan contoh hitungan per jangka waktu.
- **Hasil:** tahu instrumen mana yang cocok untuk tiap jangka waktu anak.
- **Bentuk:** rekaman kelas + lembar ringkasan.
- **Harga uji:** Rp199.000 (usulan).
- **Catatan:** sinyal simulasi untuk produk ini sebagian (±11), dan format kelas hanya dipilih 2 persona. Diuji sebagai pembanding.

### D4. Panduan biaya kuliah luar negeri — *Ide*
**Ringkasan:** Panduan biaya kuliah + biaya hidup di negara tujuan populer, dikonversi ke rupiah dengan skenario kurs, plus setoran bulanan yang dibutuhkan.
- **Untuk siapa:** orang tua yang menargetkan kuliah luar negeri.
- **Hasil:** target dana dalam rupiah per negara, 3 skenario kurs, dan setoran per bulan.
- **Bentuk:** e-book + spreadsheet kalkulator.
- **Harga uji:** Rp249.000 (usulan).

### D5. Workbook "sekolah negeri atau swasta" — *Ide*
**Ringkasan:** Workbook untuk membandingkan total biaya negeri, swasta nasional, nasional plus, dan internasional untuk anak sendiri sampai lulus SMA.
- **Hasil:** perbandingan total biaya per pilihan sekolah dan dampaknya ke dana kuliah.
- **Bentuk:** spreadsheet + panduan singkat.
- **Harga uji:** Rp99.000 (usulan).

### D6. Rencana dana pendidikan untuk penghasilan tidak tetap — *Ide*
**Ringkasan:** Template rencana dana pendidikan untuk pemilik usaha: setoran fleksibel per bulan ramai/sepi, dan cara memisahkan dana anak dari uang usaha.
- **Untuk siapa:** pengusaha dan pemilik bisnis keluarga.
- **Hasil:** aturan setoran minimum dan bonus, plus rekening/pos terpisah untuk dana anak.
- **Bentuk:** spreadsheet + panduan.
- **Harga uji:** Rp149.000 (usulan).

### D7. Rencana dana cadangan sekolah — *Ide*
**Ringkasan:** Template untuk menyiapkan dana cadangan khusus pendidikan, supaya biaya mendadak (pindah sekolah, les, kegiatan) tidak mengganggu tabungan utama.
- **Hasil:** target dana cadangan dan cara mengisinya.
- **Bentuk:** spreadsheet + panduan.
- **Harga uji:** Rp99.000 (usulan).

### D8. Rencana pendidikan yang seimbang dengan pensiun & tanggungan orang tua — *Ide*
**Ringkasan:** Workbook untuk membagi uang antara dana pendidikan anak, dana pensiun sendiri, dan tanggungan orang tua, dengan urutan prioritas yang jelas.
- **Hasil:** pembagian setoran bulanan ke tiga tujuan dan urutan prioritasnya.
- **Bentuk:** spreadsheet + panduan.
- **Harga uji:** Rp199.000 (usulan).

---

## Pertanyaan uji ke persona (usulan)
Untuk setiap kartu, tiap persona diminta menjawab:
1. Relevan untuk kondisi saya? (Ya / Sebagian / Tidak) + alasan.
2. Untuk Gratis: mau pakai dan meninggalkan nomor WA? (Ya / Ragu / Tidak).
3. Untuk DIY: mau beli di harga ini? (Beli / Ragu / Tolak) + alasan.
4. Apa yang kurang atau harus diubah supaya mau pakai/beli.
