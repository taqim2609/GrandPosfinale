#!/usr/bin/env python3
"""Buat / ubah akun pengguna POS dari command line (CMD / SSH).

Contoh (jalankan di folder proyek, mis. ~/grand-aceh-pos):

  docker compose exec backend python create_user.py --username kasir2 --password Rahasia123 --name "Kasir Dua" --role kasir

  docker compose exec backend python create_user.py --list-roles          # lihat role yang tersedia
  docker compose exec backend python create_user.py --list-users          # lihat daftar akun
  docker compose exec backend python create_user.py --username kasir2 --password Baru123456 --update   # ganti password/role
  docker compose exec backend python create_user.py --username kasir2 --active false                   # nonaktifkan akun

Opsi lain: --email (opsional, utk login versi lama), --dry-run (uji tanpa menyimpan),
--must-change true|false (wajib ganti password saat login pertama; bawaan: ya untuk akun
baru & setiap password diganti), --role superadmin, serta pemulihan akses owner:
  --make-superadmin <username>   jadikan akun sebagai Super Admin (mis. bila terkunci)
  --list-superadmin              tampilkan akun Super Admin & akun owner (env)

Akun tanpa email: login memakai USERNAME. Script ini memakai validasi yang SAMA
dengan aplikasi (username 3-32 huruf kecil/angka/titik/garis bawah/minus, password min 6).
`--list-users` menampilkan password akun (pw=...; "-" bila akun dibuat sebelum fitur
password terlihat ada) — sama seperti kolom password di halaman Pengguna (Super Admin).
"""
import argparse
import os
import re
import sys
from datetime import datetime, timezone

try:
    import bcrypt
    from pymongo import MongoClient
except ImportError as e:  # dipastikan ada di container backend
    print(f"ERROR: butuh paket {e.name}. Jalankan script ini di dalam container backend.")
    sys.exit(1)

USERNAME_RE = re.compile(r"^[a-z0-9._-]{3,32}$")
# SINKRON dengan BUILTIN_ROLES di backend/server.py — role bawaan yang bisa dipakai CLI.
BUILTIN_ROLES = ("superadmin", "admin", "kasir", "input", "input_pembayaran", "stok_opname")
ROLE_HINT = {"superadmin": "pemilik — semua izin, hanya dia yang boleh atur Role & Izin",
             "admin": "admin operasional (role akun yang boleh dibuat ditentukan Super Admin)",
             "kasir": "kasir POS",
             "input": "staf input produk/stok",
             "input_pembayaran": "khusus mencatat pembayaran / pengeluaran kas",
             "stok_opname": "hitung stok bahan & produk retail (wajib ganti password saat login pertama)"}


def bcrypt_rounds() -> int:
    try:
        return max(8, min(15, int(os.environ.get("BCRYPT_ROUNDS", "11"))))
    except (TypeError, ValueError):
        return 11


def hash_password(p: str) -> str:
    return bcrypt.hashpw(p.encode(), bcrypt.gensalt(rounds=bcrypt_rounds())).decode()


def connect():
    url = os.environ.get("MONGO_URL")
    dbname = os.environ.get("DB_NAME")
    if not url or not dbname:
        print("ERROR: MONGO_URL / DB_NAME tidak terbaca. Jalankan lewat: docker compose exec backend python create_user.py ...")
        sys.exit(1)
    return MongoClient(url, serverSelectionTimeoutMS=5000)[dbname]


def available_roles(db):
    """Role bawaan + role kustom yang dibuat Super Admin di Pengaturan → Roles & Izin."""
    doc = db.settings.find_one({"_id": "rbac"}) or {}
    custom = [r for r in (doc.get("roles") or {}).keys() if r not in BUILTIN_ROLES]
    assignable = doc.get("assignable") if isinstance(doc.get("assignable"), list) else None
    return list(BUILTIN_ROLES) + custom, assignable


def main() -> int:
    ap = argparse.ArgumentParser(description="Buat/ubah akun pengguna POS (tanpa email).", add_help=True)
    ap.add_argument("--username", help="username untuk login (wajib, kecuali --list-*)")
    ap.add_argument("--password", help="password (min 6 karakter; wajib saat membuat akun baru)")
    ap.add_argument("--name", help="nama tampilan (mis. 'Kasir Dua')")
    ap.add_argument("--role", help="role akun (lihat --list-roles)")
    ap.add_argument("--email", default="", help="opsional — hanya untuk kompatibilitas klien lama")
    ap.add_argument("--update", action="store_true", help="izinkan memperbarui akun yang sudah ada")
    ap.add_argument("--active", choices=["true", "false"], help="aktif/nonaktifkan akun")
    ap.add_argument("--must-change", choices=["true", "false"],
                    help="wajib ganti password saat login pertama (bawaan: ya untuk akun baru & setelah password diganti)")
    ap.add_argument("--list-roles", action="store_true", help="tampilkan role yang tersedia")
    ap.add_argument("--list-users", action="store_true", help="tampilkan daftar akun")
    ap.add_argument("--dry-run", action="store_true", help="validasi saja, tidak menyimpan")
    ap.add_argument("--make-superadmin", metavar="USERNAME",
                    help="jadikan akun (username) sebagai Super Admin/owner")
    ap.add_argument("--list-superadmin", action="store_true", help="tampilkan akun Super Admin & akun owner")
    a = ap.parse_args()

    # ---- pulihkan/menetapkan Super Admin ----
    if a.make_superadmin:
        uname = a.make_superadmin.strip().lower()
        db = connect()
        u = db.users.find_one({"$or": [{"username": uname}, {"email": uname}]})
        if not u:
            print(f"ERROR: akun '{uname}' tidak ditemukan. Lihat daftar: --list-users")
            return 4
        if a.dry_run:
            print(f"[dry-run] '{u.get('username') or uname}' akan dijadikan superadmin (role sekarang: {u.get('role')}).")
            return 0
        db.users.update_one({"id": u["id"]}, {"$set": {"role": "superadmin"}})
        print(f"✔ Akun '{u.get('username') or uname}' sekarang SUPER ADMIN (owner).")
        print("  Login ulang di aplikasi, lalu buka Pengaturan → Roles & Izin.")
        return 0

    if a.list_superadmin:
        db = connect()
        rows = list(db.users.find({"role": "superadmin"}, {"_id": 0, "username": 1, "email": 1, "name": 1}))
        owner_email = (os.environ.get("ADMIN_EMAIL") or "").strip().lower()
        print(f"Akun Super Admin di database: {len(rows)}")
        for u in rows:
            print(f"  - {u.get('username') or (u.get('email') or '?').split('@')[0]:<16} {u.get('name','')}")
        if owner_email:
            print(f"Akun OWNER dari env (selalu dianggap Super Admin): {owner_email}")
        if not rows and not owner_email:
            print("PERINGATAN: belum ada Super Admin & ADMIN_EMAIL kosong — jalankan:")
            print("  docker compose exec backend python create_user.py --make-superadmin <username>")
        return 0

    # ---- mode daftar (tidak butuh argumen lain) ----
    if a.list_roles:
        db = connect()
        roles, assignable = available_roles(db)
        print("Role yang tersedia:")
        for r in roles:
            tag = ""
            if r == "superadmin":
                tag = "  ← owner/super admin"
            if assignable is not None and r not in assignable and r != "superadmin":
                tag = "  (tidak boleh dibuat oleh admin biasa)"
            print(f"  - {r:<12} {ROLE_HINT.get(r, 'role kustom')}{tag}")
        if assignable is not None:
            print("\nBoleh dibuat admin biasa:", ", ".join(assignable) or "(belum diatur)")
        return 0

    if a.list_users:
        db = connect()
        rows = list(db.users.find({}, {"_id": 0, "username": 1, "name": 1, "role": 1, "active": 1,
                                       "email": 1, "password_plain": 1, "must_change_password": 1})
                    .sort("created_at", 1))
        print(f"{len(rows)} akun:")
        for u in rows:
            uname = u.get("username") or (u.get("email") or "?").split("@")[0]
            pw = u.get("password_plain") or "-"
            wajib = "wajib-ganti" if u.get("must_change_password") else "bebas"
            print(f"  - {uname:<16} {u.get('name',''):<24} role={u.get('role','?'):<12} "
                  f"{'aktif' if u.get('active', True) else 'NONAKTIF':<8} pw={pw:<16} {wajib}")
        print("\nCatatan: pw=- berarti password akun itu belum terekam (dibuat sebelum fitur ini) — reset lewat UI/CLI untuk melihatnya.")
        return 0

    # ---- mode buat/ubah akun ----
    uname = (a.username or "").strip().lower()
    if not uname:
        print("ERROR: --username wajib. Contoh:\n"
              "  Buat akun : docker compose exec backend python create_user.py --username kasir2 --password Rahasia123 --name \"Kasir Dua\" --role kasir\n"
              "  Jadikan   : docker compose exec backend python create_user.py --make-superadmin admin\n"
              "  Lihat     : --list-users | --list-roles | --list-superadmin")
        return 2
    if not USERNAME_RE.match(uname):
        print("ERROR: username 3-32 karakter, hanya huruf kecil/angka/titik/garis bawah/minus (tanpa spasi).")
        return 2

    # validasi ringan dulu (tanpa perlu database)
    if a.password and len(a.password) < 6:
        print("ERROR: password minimal 6 karakter.")
        return 2

    db = connect()
    roles, assignable = available_roles(db)
    role = (a.role or "").strip() or "kasir"
    if role not in roles:
        print(f"ERROR: role '{role}' tidak dikenal. Role tersedia: {', '.join(roles)}")
        print("       (role kustom dibuat lewat aplikasi: Pengaturan → Roles & Izin — hanya Super Admin)")
        return 2

    existing = db.users.find_one({"$or": [{"username": uname}, {"email": uname}]})
    if existing and not a.update:
        print(f"ERROR: akun '{uname}' sudah ada (role: {existing.get('role')}).")
        print("       Untuk memperbarui, ulangi dengan --update (mis. ganti password/role/nama).")
        return 3

    if not existing and not a.password:
        print("ERROR: akun baru wajib punya --password (min 6 karakter).")
        return 2

    name = (a.name or (existing.get("name") if existing else "") or uname).strip()
    sets = {"username": uname, "name": name, "role": role}
    if a.email:
        sets["email"] = a.email.strip().lower()
    if a.password:
        sets["password_hash"] = hash_password(a.password)
        # password terlihat (dipakai Super Admin di daftar akun) ikut dicatat
        sets["password_plain"] = a.password
    if a.active is not None:
        sets["active"] = (a.active == "true")
    # Wajib ganti password: akun baru & setiap password diganti → ya (kecuali dimatikan eksplisit).
    if a.must_change is not None:
        sets["must_change_password"] = (a.must_change == "true")
    elif not existing or a.password:
        sets["must_change_password"] = True

    if a.dry_run:
        print("[dry-run] validasi lolos — tidak ada perubahan disimpan.")
        print(f"  username={uname} role={role} name={name} "
              f"{'UPDATE' if existing else 'CREATE'} password={'ya' if a.password else 'tidak diubah'}")
        return 0

    if existing:
        db.users.update_one({"id": existing["id"]}, {"$set": sets})
        print(f"✔ Akun '{uname}' diperbarui (role={role}"
              f"{', password diganti' if a.password else ''}"
              f"{', aktif=' + str(sets['active']).lower() if 'active' in sets else ''}"
              f"{', wajib ganti password' if sets.get('must_change_password') else ''}).")
    else:
        import uuid
        doc = {"id": str(uuid.uuid4()), **sets, "created_by": "cli",
               "created_at": datetime.now(timezone.utc).isoformat()}
        db.users.insert_one(doc)
        print(f"✔ Akun '{uname}' dibuat (role={role}, nama={name}"
              f"{', wajib ganti password saat login pertama' if sets.get('must_change_password') else ''}).")
    print(f"  Login di aplikasi memakai username: {uname}")
    return 0


if __name__ == "__main__":
    sys.exit(main())
