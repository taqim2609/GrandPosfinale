/* Daftar menu samping aplikasi — SATU sumber kebenaran.
   Dipakai Layout (render menu) & Pengaturan → Menu & Tampilan UI (atur urutan/nama).
   Jangan duplikasi daftar ini di tempat lain. */
import { Ban, BarChart3, Bot, Boxes, CalendarCheck, Clock, FileSpreadsheet, FlaskConical, HandCoins, LayoutDashboard, Package, Printer, Settings, ShoppingCart, Tag, Ticket, Users, Wallet } from "lucide-react";

export const NAV_ITEMS = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard, roles: ["admin", "kasir", "input"], mod: "dashboard" },
  { to: "/pos", label: "POS Kasir", icon: ShoppingCart, roles: ["admin", "kasir"], mod: "pos" },
  { to: "/cash", label: "Pengeluaran & Kas", icon: Wallet, roles: ["admin", "kasir"], mod: "pengeluaran" },
  { to: "/shift", label: "Shift", icon: Clock, roles: ["admin", "kasir"], mod: "shift" },
  { to: "/catalog", label: "Produk & Stok", icon: Package, roles: ["admin", "input"], mod: "produk" },
  { to: "/ingredients", label: "Bahan & Belanja", icon: Boxes, roles: ["admin", "input"], mods: ["produk", "belanja_bahan", "opname_bahan"] },
  { to: "/laporan", label: "Laporan", icon: BarChart3, roles: ["admin", "kasir"], mod: "laporan" },
  { to: "/asisten-ai", label: "AI", icon: Bot, roles: ["admin", "kasir"], mod: "ai" },
  { to: "/members", label: "Member & Poin", icon: Users, roles: ["admin"], mod: "member" },
  { to: "/promo-kupon", label: "Promo & Kupon", icon: Tag, roles: ["admin"], mod: "promo" },
  { to: "/reservations", label: "Reservasi", icon: CalendarCheck, roles: ["admin", "kasir"], mod: "reservasi" },
  { to: "/settlement", label: "Settlement Vendor", icon: HandCoins, roles: ["admin", "kasir"], mod: "settlement" },
  { to: "/orders", label: "Transaksi", icon: FileSpreadsheet, roles: ["admin"], mod: "transaksi" },
  // pembatalan/refund: kasir boleh (hanya shift berjalan) → modul sendiri, bukan "transaksi"
  { to: "/void", label: "Void & Refund", icon: Ban, roles: ["admin", "kasir"], mod: "void" },
  { to: "/device", label: "Perangkat", icon: Printer, roles: ["kasir", "input"] },
  { to: "/settings", label: "Pengaturan", icon: Settings, roles: ["admin"], mods: ["pengaturan", "pengguna", "role_izin"] },
];
