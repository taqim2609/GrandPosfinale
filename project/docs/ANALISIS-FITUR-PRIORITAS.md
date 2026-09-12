# Analisis Fitur Optimasi — Grand Aceh Kuliner POS

Tanggal: 2026-09-08. Basis analisis: `backend/server.py` (FastAPI + Motor/MongoDB single node
di Raspberry Pi, docker compose: mongo + backend + nginx), frontend React (web + APK Capacitor).
Asumsi skala saat ini: 1 outlet, puluhan–ratusan order/hari, ribuan produk, 1–4 perangkat
(kasir/admin), akses lokal LAN + remote (Tailscale/Funnel) + APK.

Kriteria peringkat: (1) nilai operasional harian, (2) biaya/risiko implementasi di Pi,
(3) beban server saat fitur AKTIF, (4) kecocokan dengan arsitektur saat ini.
Tier A = kerjakan sekarang · Tier B = berikutnya/bertahap · Tier C = tunda / tidak relevan sekarang.

---

## 1. Peringkat penuh (36 item)

| # | Fitur | Tier | Penilaian singkat | Dampak beban server |
|---|---|---|---|---|
| 1 | Feature flag terpusat (on/off tanpa deploy) | A | Pengungkit semua item lain; sebagian pola sudah ada (settings "business"/"report") | Kontrol langsung; dengan semua OFF beban turun ke minimum |
| 2 | Denormalisasi terkontrol laporan (snapshot harian) | A | Laporan/dashboard = query terberat; hari lampau immutable → aman di-cache | Baca orders utk laporan >90% ↓ (lihat §3) |
| 3 | Cache-first master data (produk/kategori/meja/metode/outlet) | A | Katalog = mayoritas request GET POS; jarang berubah; TTL 15–30 dtk | Baca DB katalog ↓ 70–90%, total baca DB ±sepertiga ↓ |
| 4 | Master switch AI + per-fitur (deskripsi/gambar/summary/vision/asisten) | A | AI = latensi 3–20 dtk & biaya kuota eksternal; saat ini manual (klik tombol) + include_ai di WA harian | Off = 0 panggilan eksternal, 0 risiko gagal |
| 5 | Integrasi terpusat & aman (API key AI/Gemini/WA/cron-secret, masked) | A | Kunci tersebar di beberapa settings + env; konsolidasi 1 halaman + audit | Tidak langsung (tata kelola) |
| 6 | Validasi integritas terjadwal (orphan records) | A | Mencegah laporan salah & data menggunung tak terpakai | 1× scan penuh per minggu (jam sepi), 0 saat off |
| 7 | Webhook keluar (order.paid / shift.closed / stock.low) | B | Butuh penerima (Apps Script/Telegram/bot); WA sudah jadi kanal notifikasi | Kecil; OFF default |
| 8 | Retry & idempotency (pay & sync offline) | A/B | client_ref unique sudah ada utk create/sync; pay belum idempotent (retry jaringan putus bisa error dobel) | Tidak hemat server; cegah duplikat finansial |
| 9 | Locking optimistik (master: produk/kategori/vendor) | B | Dua admin edit bersamaan jarang, tapi murah dicegah (updated_at + conditional update) | Tidak signifikan |
| 10 | Slow query log + laporan ringkas | B | Mongo profiler memberatkan; pilih logger aplikasi (threshold) + ringkasan mingguan via WA | <1–3% saat ON; default OFF |
| 11 | Metrics middleware (response time/error/throughput) | B | Dashboard "Kesehatan Server" di Pengaturan; ringan (counter) | ~0,1–0,5% per request; default ON |
| 12 | Circuit breaker WA/AI/update-center | B | Cegah request hang 30 dtk × retry saat layanan luar down | Menyelamatkan waktu request; bukan CPU besar |
| 13 | Pooling koneksi DB (tuning env motor) | B | Motor sudah pool (default 100); cukup set maxPoolSize/min + timeout | Pencegahan "too many connections", bukan beban harian |
| 14 | Pagination & proyeksi list besar (orders, log) | B | list_orders mengirim sampai 1000 dok lengkap dgn items | Payload & CPU serialisasi ↓ 40–70% utk daftar |
| 15 | Gzip/Brotli | B | **Gzip SUDAH AKTIF** di nginx (level 5, termasuk JSON via gzip_proxied any). Sisanya: verifikasi /api, opsional brotli | Gzip: payload internet ↓ ±70–85%; brotli ±10–20% lagi (perlu module) |
| 16 | Service worker offline | B | Sudah ada sw.js v3 + mode offline device; cukup poles app-shell & cache-first katalog | Offline = 0 request; LAN kecil |
| 17 | Optimasi ukuran index & audit pemakaian | B | Index baru (4bd1878) cukup; audit $indexStats sesekali, hapus yg tak terpakai | Index yg tak terpakai membebani tulis |
| 18 | Monitoring render komponen / CWV (RUM) | C | Perangkat utama Sunmi Android 7 lemah; instrumentasi menambah berat; ukur manual (Lighthouse/Diagnostik) | Berpotensi TAMBAH beban frontend |
| 19 | Halaman query read-only adhoc | C | Risiko keamanan tinggi utk 1 admin; ganti dgn ekspor Excel + Diagnostik | Berbahaya bila salah → tunda |
| 20 | ER diagram skema (otomatis) | B | Mongo tak punya skema kaku; introspeksi koleksi+index → render Mermaid di halaman dev; 0 beban runtime | Tidak ada |
| 21 | Redis cache | C | Infra baru di Pi (RAM+proses); Mongo sudah <5 ms utk data segini; snapshot laporan (#2) memberi efek sama tanpa Redis | Redis justru menambah beban |
| 22 | Replikasi baca / read replica | C | Butuh ≥2 node; Pi single → tidak mungkin; saat pindah cloud & data besar, baru layak | — |
| 23 | Auto-scaling server | C | Single Pi; solusi = pindah cloud (bukan skala di Pi) | — |
| 24 | Multi-tenant isolasi organisasi | C | 1 outlet = 1 tenant; isolasi sudah alami. Rancang ulang hanya saat waralaba/cabang | Kompleksitas besar, 0 manfaat sekarang |
| 25 | Relasi many-to-many + pivot (tag/kategori ganda) | B | Mongo: array `tags` di produk + multikey index = "pivot" embedded; kategori utama tetap 1 (sudah dipakai laporan) | Index multikey kecil; sedang |
| 26 | Constraint DB (unique/FK) | A(unique)/C(FK) | Unique sudah (id/email/sku/order_number/client_ref/kupon); "foreign key" di Mongo tak ada → referential check terjadwal (#6) + validasi write path | — |
| 27 | Transaksi all-or-nothing | B/C | Mongo single node TANPA multi-doc transaction; opsi ubah ke single-node replSet (berat). Saat ini alur kritis memakai kompensasi manual — audit dulu | ReplSet: overhead oplog; baru bila butuh |
| 28 | Sinkronisasi dua arah realtime web↔mobile | B | Sudah: offline queue + client_ref + sync push/master. "Realtime" cukup polling ringan 10 dtk (index baru mendukung); websocket tak perlu | Polling murah dgn index; websocket = keepalive terus |
| 29 | Full-text search | C | Data <10 rb produk: filter client-side cukup; bila tumbuh: `$text` index Mongo (aktifkan via flag) | Index $text membebani tulis → OFF default |
| 30 | Cache berjenjang (browser/CDN/server) | B/C | Browser: sw cache utk statis; server: #2/#3; CDN utk dinamis tak cocok (auth) & domain funnel | — |
| 31 | Optimasi response JSON (nested/proyeksi) | B | Sebagian sudah (_id:0); padukan #14 | Lihat #14 |
| 32 | Bundle analyzer rutin | C | Alat developer (sekali jalan, webpack-bundle-analyzer); 0 beban server | Tidak ada |
| 33 | Monitoring performa menyeluruh (satu dashboard) | B | Gabung #10 + #11 + status layanan (WA/AI/update-center/Mongo ping) di tab Pengaturan | Ringan |
| 34 | Integrasi API AI asisten | A(selesaikan) | Fitur Asisten AI SUDAH ada; tinggal master switch & tarik ke halaman Integrasi (#4/#5) | Lihat #4 |
| 35 | Circuit breaker → (duplikat #12) | — | — | — |
| 36 | Optimasi index agar tak berlebihan (#17) | B | — | — |

*Item nomor 7 pada daftar asli user (multi-tenant) muncul dua kali — dinilai satu kali.*

---

## 2. Rancangan Feature Flag terpusat

Pola yang sudah dipakai (`settings._id:"business"`, `_id:"report"`, `_id:"ai"`) diperluas jadi
satu dokumen: `db.settings._id = "features"`.

- **Sumber kebenaran backend**: konstanta `FEATURE_DEFAULTS` + `_feat(key)` (cache in-memory 5 dtk),
  mirip `BIZ_DEFAULTS` yang sudah ada. Endpoint `GET/PUT /settings/features` (PUT admin saja).
- **Gate di backend**: tiap blok yang bisa dimatikan cek `_feat()` — AI master & per-fitur,
  WA, webhook, cache, slow-log, breaker, integrity-check scheduler.
- **Gate di frontend**: `lib/features.js` fetch sekali + context; menyembunyikan menu/tombol
  (AI, webhook, dll) & menghentikan auto-poll (OTA) sesuai flag. Simpan salinan lokal utk
  render instan.
- **Semua fitur yang ADA sekarang ikut dapat saklar** (tanpa menghapus konfigurasi yang tersimpan):

| Saklar | Default | Saat OFF |
|---|---|---|
| `ai.enabled` (master) | ON | Semua panggilan AI berhenti (deskripsi, gambar, summary, vision, asisten) — konfigurasi key tetap tersimpan |
| `ai.summary / vision / description / image / assistant` | ON | Per-fitur; menu/tombol disembunyikan |
| `wa.enabled` (master) | ON | Semua kirim WA manual & otomatis berhenti |
| `wa.daily_report` (pakai `report.whatsapp_enabled` yg ada) | ON | Scheduler laporan harian skip |
| `ota.autocheck` (frontend) | ON | Tidak polling versi OTA saat app aktif |
| `update.banner` | ON | Banner "versi baru" di dashboard disembunyikan |
| `offline.mode` (per perangkat, sudah ada) | OFF | — |
| `perf.cache_master` | ON | Cache katalog TTL dimatikan (data selalu fresh dari DB) |
| `perf.cache_reports` | ON | Snapshot laporan hari lampau nonaktif (laporan selalu scan orders) |
| `maint.orphan_auto` | OFF | Cek orphan hanya manual (tombol) |
| `webhook.enabled` | OFF | Tidak ada kiriman event keluar |
| `dbg.slowlog` | OFF | Logger query lambat nonaktif |
| `dbg.metrics` | ON | Ringkasan performa endpoint dikumpulkan |
| `guard.breaker` | ON | Circuit breaker layanan luar aktif |
| `guard.lock_optimistic` | ON | Cek versi saat update master |

Kombinasi paling hemat (outlet tutup / Pi lemah / kuota AI habis): matikan `ai.*`, `wa.daily_report`,
aktifkan semua `perf.*` → beban server tinggal transaksi POS murni + laporan ringan.

---

## 3. Estimasi penghematan server (orde besar, berbasis asumsi di atas)

> Estimasi relatif, bukan pengukuran. Basis: Mongo di Pi; baca = query DB, request = HTTP masuk.

| Fitur | Yang dihemat | Perkiraan penghematan |
|---|---|---|
| Cache katalog (produk/kategori/meja/metode/outlet) TTL 20 dtk | Baca DB endpoint katalog (POS buka layar/refresh berulang) | Baca katalog ↓ 70–90%; **total baca DB ±30–50% ↓** |
| Snapshot laporan harian | Scan orders utk dashboard & laporan (hari lalu s/d 30+ hari) | Baca orders utk tanggal lampau **>90% ↓**; muat dashboard 3–6 bulan data ±10–50× lebih cepat |
| AI master OFF | Request keluar (latensi 3–20 dtk), kuota Gemini/chenzk, risiko error | Panggilan AI = 0 (100%); saat ON tapi jarang dipakai, beban server sendiri kecil — penghematan terbesar di kuota & keandalan |
| WA daily report OFF | 1× report_summary + 1× AI + kirim WA per hari | ±1–3% dari kerja harian; scheduler cek 10 mnt tetap jalan (1 query kecil) |
| Pagination/proyeksi orders | Payload & serialisasi daftar | Response daftar ↓ 40–70% ukuran |
| Gzip (sudah aktif) | Bandwidth internet (APK/remote) | Payload ↓ ±70–85%; di LAN efek kecil |
| Slow-log / metrics | — | Overhead <1–3%; slow-log default OFF = 0 |
| Breaker WA/AI | Waktu request hang (30 dtk × retry) saat layanan luar down | Kasir tak menunggu; ketersediaan POS naik |
| Orphan check (mingguan) | Konsistensi data, bukan CPU | 1× scan penuh per minggu; nonaktif = 0 |
| Index tak terpakai (audit) | Beban tulis tiap insert/update | Tulis kembali normal bila ada index yatim |
| **TIDAK dipasang sekarang** (Redis, replSet/transaksi, $text, websocket, CDN, RUM, read-replica, auto-scale) | — | **Justru menambah beban** (RAM/proses/oplog/index/keepalive) → penghematan negatif di skala ini |

**Kesimpulan hemat**: kombinasi A-item paling realistis menurunkan beban DB Pi ±50–70% pada
pemakaian normal (katalog + laporan), menghilangkan 100% biaya & risiko AI saat dimatikan,
dan menambah beban nyata ≤1% untuk monitoring/breaker — semua dapat dimatikan.

---

## 4. Urutan eksekusi yang disarankan

1. Dokumen `settings.features` + halaman "Fitur & Integrasi" (flag + API key masked + webhook + audit) → seluruh daftar #1–#5, #34.
2. Cache katalog TTL + snapshot laporan harian (`perf.*`) → #2, #3.
3. Master switch AI/WA & sambungkan ke blok yang ada → #4.
4. Idempotency pay + retry sync → #8.
5. Orphan check terjadwal → #6.
6. Metrics + slow-log + breaker + status layanan (halaman Kesehatan) → #10–#12, #33.
7. Pagination/proyeksi, locking optimistik, tags array → #9, #14, #25.
8. Tunda (C): Redis, replica, auto-scale, multi-tenant, RUM, query adhoc, transaksi replSet — sampai
   outlet pindah cloud / multi-cabang / data > 5–10 juta dokumen. Saat itu, lihat lagi §1.
