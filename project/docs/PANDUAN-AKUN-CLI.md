# Panduan: Membuat Akun dari Command Line (CMD / SSH)

Aplikasi POS tidak lagi memakai email — **login memakai USERNAME**. Ada 3 cara
membuat akun; pilih salah satu.

---

## Cara 1 (disarankan): lewat alat bawaan aplikasi

Jalankan di folder proyek server Anda (Pi/Linux: `~/grand-aceh-pos`, Windows: folder hasil instalasi).

**Buat akun baru**
```bash
docker compose exec backend python create_user.py \
  --username kasir2 --password Rahasia123 --name "Kasir Dua" --role kasir
```

**Lihat role yang tersedia** (termasuk role kustom buatan Super Admin)
```bash
docker compose exec backend python create_user.py --list-roles
```

**Lihat daftar akun**
```bash
docker compose exec backend python create_user.py --list-users
```

**Ubah akun yang sudah ada** (ganti password / role / nama) — wajib `--update`
```bash
docker compose exec backend python create_user.py \
  --username kasir2 --password PasswordBaru123 --update
```

**Nonaktifkan / aktifkan akun**
```bash
docker compose exec backend python create_user.py --username kasir2 --active false
docker compose exec backend python create_user.py --username kasir2 --active true
```

**Uji dulu tanpa menyimpan** (validasi saja)
```bash
docker compose exec backend python create_user.py --username kasir2 \
  --password Rahasia123 --role kasir --dry-run
```

Di **Windows CMD**, perintahnya sama persis (jalankan di folder proyek yang sama).
Bila `docker compose` tidak dikenali, pakai `docker-compose` (versi lama).

Aturan yang divalidasi alat ini:
- username: 3–32 karakter, hanya huruf kecil/angka/titik/garis bawah/minus
- password: minimal 6 karakter
- role: harus role yang dikenal (bawaan atau kustom hasil Pengaturan → Roles & Izin)

### Bila terkunci dari "Roles & Izin" (tidak ada Super Admin)

**Cara termudah (di aplikasi):** bila sistem belum punya Super Admin sama sekali, halaman
Pengaturan → Roles & Izin tetap bisa dibuka oleh admin dan akan menampilkan tombol
**"Jadikan Saya Super Admin"** — klik itu, akun Anda langsung menjadi Super Admin (owner).

Bila halaman itu tidak muncul (mis. sudah ada Super Admin lain, atau akun bukan admin),
pakai salah satu perintah berikut di server:

```bash
# lihat siapa saja Super Admin & akun owner
docker compose exec backend python create_user.py --list-superadmin

# jadikan sebuah akun sebagai Super Admin (mis. akun yang Anda pakai)
docker compose exec backend python create_user.py --make-superadmin admin

# bila akun owner belum ada sama sekali, buat baru
docker compose exec backend python create_user.py \
  --username owner --password Rahasia123 --name "Owner" --role superadmin
```
Setelah itu **login ulang** (keluar–masuk) agar menu Roles & Izin muncul.

---

## Cara 2: lewat API (curl) — misal dari HP/komputer lain

1) Login sebagai Super Admin untuk mengambil token:

```bash
curl -s -X POST http://localhost/api/auth/login \
  -H "Content-Type: application/json" \
  -d '{"username":"admin","password":"PASSWORD_ANDA"}'
```
Salin nilai `token` dari hasilnya, lalu:

```bash
curl -s -X POST http://localhost/api/users \
  -H "Content-Type: application/json" \
  -H "Authorization: Bearer TOKEN_DI_SINI" \
  -d '{"name":"Kasir Dua","username":"kasir2","password":"Rahasia123","role":"kasir"}'
```

Catatan: **admin biasa hanya bisa membuat akun dengan role yang diizinkan
Super Admin** (Pengaturan → Roles & Izin → "Role yang boleh dibuat oleh Admin").
Ganti `localhost` dengan alamat server (mis. `http://192.168.1.100` atau alamat Tailscale).

---

## Cara 3: lewat aplikasi (paling mudah)

Masuk sebagai admin → **Pengaturan → Pengguna → Tambah** → isi Nama, **Username**,
Password, dan pilih Role. Selesai.

---

## Peran (role) penting

| Role | Arti |
|---|---|
| `superadmin` | pemilik/owner — satu-satunya yang bisa **mengubah** Roles & Izin, melihat **daftar akun + password**, dan **menghapus akun** |
| `admin` | admin operasional; pilihan role saat membuat akun dibatasi Super Admin |
| `kasir` | kasir POS |
| `input` | staf input produk/stok |
| `input_pembayaran` | khusus mencatat pembayaran / pengeluaran kas |
| `stok_opname` | stok opname bahan & produk retail — **wajib ganti password** saat login pertama |
| (kustom) | role buatan Super Admin (mis. `gudang`, `supervisor`) |

Kalau akun CLI dibuat dengan role kustom, pastikan role itu sudah dibuat lebih dulu
di **Pengaturan → Roles & Izin** (mengubahnya hanya Super Admin).

### Dua izin yang terpisah: "Akun Pengguna" vs "Roles & Izin"

Di **Pengaturan → Pengguna** ada dua sub-tab yang izinnya **berbeda**:

| Sub-tab | Modul (izin) | Isi |
|---|---|---|
| **Akun Pengguna** | `pengguna` | daftar akun, buat akun, reset password, aktif/nonaktif, ganti role akun |
| **Roles & Izin** | `role_izin` | daftar role + centang modulnya — **HANYA LIHAT** untuk pemegang izin ini |

- Modul `role_izin` ("Roles & Izin (lihat saja)") bisa dicentang untuk role mana pun; pemegangnya
  dapat membuka halaman tersebut tetapi **tidak bisa menyimpan** (tanpa tombol Simpan/Role Baru —
  dan server tetap menolak `PUT /settings/rbac`).
- Halaman manajemen akun **tidak** otomatis ikut: role yang hanya punya `role_izin` tidak bisa
  membuka **Akun Pengguna**, dan sebaliknya.
- Keduanya berbeda juga dari modul `pengaturan` (tab lain di halaman Pengaturan hanya tampil bila
  role punya modul `pengaturan`).

---

## Password terlihat & wajib ganti password

- Setiap akun baru (lewat aplikasi **atau** CLI) dan setiap password yang direset
  **tersimpan terlihat** — Super Admin melihatnya di **Pengaturan → Pengguna**
  (tombol 👁 untuk tampilkan, ikon salin untuk menyalin), dan lewat
  `create_user.py --list-users` (`pw=...`; tanda `-` berarti akun itu dibuat sebelum
  fitur ini ada dan belum pernah direset).
- **Wajib ganti password saat login pertama** menyala otomatis untuk akun baru
  (semua role) dan setiap kali password direset admin. Bisa dinyalakan/dimatikan
  per akun di halaman Pengguna (tombol `Wajib ganti pw: ON/OFF`) atau CLI
  (`--must-change false`). Akun `stok_opname` yang sudah ada ikut dinyalakan otomatis
  saat server diperbarui.
- Selama kewajiban itu menyala, seluruh menu ditahan: pengguna hanya melihat layar
  **Ganti Password Dulu** sampai password barunya disimpan.
- Setelah pengguna mengganti password sendiri, password di daftar akun ikut diperbarui
  (jadi Super Admin selalu melihat password yang berlaku).

## Menghapus akun (Super Admin)

- Akun yang **belum punya riwayat transaksi** → dihapus permanen.
- Akun yang **sudah punya riwayat** (pesanan, shift, kas, catatan audit) → hanya
  **dinonaktifkan** supaya laporan lama tetap utuh; bisa diaktifkan lagi kapan saja.
- Akun sendiri dan akun **Super Admin terakhir** tidak bisa dihapus.
