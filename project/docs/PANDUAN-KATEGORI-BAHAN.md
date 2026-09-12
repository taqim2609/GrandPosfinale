# Panduan — Kategori Bahan & Izin Isi Stok Opname per Akun

Fitur ini membatasi **siapa yang boleh mengisi stok opname bahan**: setiap bahan diberi
kategori, dan setiap akun diberi daftar kategori yang boleh diisinya.

> Aturan ketat (sesuai permintaan pemilik): **akun yang belum diatur kategorinya tidak bisa
> mengisi opname bahan apa pun.** Hanya **Super Admin / akun owner** yang bebas semua kategori.

## 1. Buat kategori bahan

Aplikasi → **Bahan & Belanja** → tab **Master Bahan** → tombol **Kategori Bahan**
(hanya untuk role yang punya modul **Produk & Stok**, module code `produk`).

- Tambah kategori (mis. `Dapur`, `Minuman`, `Kemasan`).
- Ubah nama dengan ikon pensil — bahan & akun yang memakai kategori itu **otomatis ikut**
  (kategori disimpan per id, jadi mengganti nama tidak melepas apa pun).
- Hapus kategori → otomatis dilepas dari bahan & akun yang memakainya (jumlahnya dilaporkan).

## 2. Beri kategori pada bahan

Boleh **lebih dari satu kategori** per bahan:

- **Satu-satu**: Master Bahan → Edit bahan → pilih chip kategori → Simpan.
- **Sekaligus (Excel)**: Import Excel dengan kolom **Kategori**, isi beberapa kategori
  dipisah koma/titik-koma, mis. `Minuman; Kemasan` — kategori baru dibuat otomatis.
  Sel kategori dibiarkan kosong = kategori bahan itu tidak diubah.

Bahan **tanpa kategori** ditandai kuning *"belum ada kategori"* di Master Bahan: bahan itu
hanya bisa diopname oleh Super Admin. Bahan baru hasil **Scan Faktur (AI)** juga masuk tanpa
kategori — beri kategorinya dulu bila ingin staf bisa mengopname.

## 3. Atur izin per akun

**Pengaturan → Pengguna** (sub-tab **Akun Pengguna**) → pada kartu akun tekan
**Kategori Bahan** → centang kategori yang boleh diisi → **Simpan**.

- Kartu akun menampilkan jumlah & nama kategori yang diizinkan, atau tanda kuning
  *"belum diatur — tidak bisa isi stok opname bahan"*.
- Mengosongkan semua centang = akun itu tidak boleh mengisi opname bahan apa pun.
- Akun **Super Admin** hanya bisa diubah oleh Super Admin (sama seperti aturan role/akun lain).

Endpoint: `PATCH /api/users/{uid}/ingredient-categories` `{ "categories": ["<id kategori>"] }`.

## 4. Yang terjadi di lapangan

| Tempat | Perilaku |
|---|---|
| Bahan & Belanja → **Stok Opname** | hanya bahan dalam kategori yang diizinkan; ada filter kategori; akun tanpa izin melihat layar keterangan, tanpa tabel & tanpa tombol simpan |
| Master Bahan → ikon opname per baris | terkunci (ikon perisai) untuk bahan di luar izin |
| APK **Grand Opname** | daftar bahan ikut tersaring (`allowed_opname`) |
| **Pembelian Bahan** & **Daftar Belanja** | **tidak dibatasi** kategori (hanya stok opname yang dibatasi) |
| API | `POST /api/ingredients/opname-bulk` & `POST /api/ingredients/{id}/opname` **ditolak** (400/403) bila ada bahan di luar izin — pemeriksaan dilakukan **sebelum** menyimpan, jadi tidak ada yang setengah tersimpan |

## 5. Endpoint & data

| Endpoint | Keterangan |
|---|---|
| `GET /api/ingredient-categories` | daftar kategori (`items`, `ingredient_count`), izin akun ini (`mine`), `allow_all`, `can_manage` |
| `POST /api/ingredient-categories` | buat kategori (modul `produk`) |
| `PUT /api/ingredient-categories/{id}` | ubah nama |
| `DELETE /api/ingredient-categories/{id}` | hapus + lepas dari bahan & akun |
| `GET /api/ingredients` | tiap baris ditambah `categories`, `category_names`, `allowed_opname` |

- Koleksi: `ingredient_categories` (id, name) • `ingredients.categories` = daftar id kategori
  • `users.ingredient_categories` = daftar id kategori yang boleh diisi akun.
- Indeks: `ingredient_categories.id` & `.name` (unik), `ingredients.categories`.
- Cek integritas (**Pengaturan → Fitur & Integrasi → Integritas**) punya pemeriksaan
  *"Bahan/akun menunjuk kategori bahan yang sudah dihapus"* dengan tombol perbaikan
  **"Lepas kategori bahan yatim"**.

## 6. Uji

```bash
cd POS-grand
../.verify-tmp/venv-test/bin/python ../gak-repro/test_ing_cat_backend.py   # 55 pemeriksaan backend
cd .. && node gak-repro/repro-ing-cat.js                                   # 26 pemeriksaan UI
```
