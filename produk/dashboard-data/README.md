# Ekspor data dashboard produk

Snapshot data dari dashboard produk (https://claude.ai/artifact/Fb6ot1RTq8AHfBoPXW8ieV), diekspor 16 Nov 2026.

**Sumber utama tetap dashboard.** File di sini salinan baca-saja supaya session lokal bisa membaca isi produk. Kalau dashboard berubah, ekspor ulang; jangan edit file ini lalu menganggapnya sudah masuk dashboard.

| File | Isi |
|---|---|
| `products.json` | 63 produk (id → data: level, status, masalah, bentuk, deliverables, goalPembeli, goalBisnis, goalLadder, evidence, decisions, dll.). Status `Stop` = arsip. Field masalah/bentuk/deliverables baru terisi di 17 produk (M1); sisanya pakai `problems`, `docs`, `notes`. |
| `problems.json` | 12 masalah M1–M12 |
| `snapshots.json` | snapshot `data-asli` (data nyata dari tools/penjualan) |
| `settings.json` | bobot skor (`scoring`) |

Kode dashboard: `produk/dashboard-produk.html`.
