import { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";
import UsersPage from "@/pages/Users";
import Tables from "@/pages/Tables";
import SettingsAI from "@/pages/SettingsAI";
import SettingsData from "@/pages/SettingsData";
import SettingsBusiness from "@/pages/SettingsBusiness";
import SettingsReport from "@/pages/SettingsReport";
import SettingsInstaller from "@/pages/SettingsInstaller";
import SettingsIntegrations from "@/pages/SettingsIntegrations";
import SettingsCustomWidgets from "@/pages/SettingsCustomWidgets";
import SettingsPlatform from "@/pages/SettingsPlatform";
import SettingsUI from "@/pages/SettingsUI";
import SettingsRoles from "@/pages/SettingsRoles";
import WhatsAppReport from "@/pages/WhatsAppReport";
import DeviceSettings from "@/pages/DeviceSettings";
import Diagnostik from "@/pages/Diagnostik";
import Integritas from "@/pages/Integritas";
import AppVersi from "@/pages/AppVersi";
import SubTabs from "@/components/SubTabs";
import ErrorBoundary from "@/components/ErrorBoundary";
import {
  Users, Armchair, Sparkles, Trash2, MessageCircle, Download, Printer, Bug, Box,
  Settings2, SlidersHorizontal, LayoutGrid, Palette, ShieldCheck, LayoutTemplate, Gauge,
} from "lucide-react";
import { useAuth } from "@/context/AuthContext";
import { can } from "@/lib/rbac";

/* ---------------- Pengguna (Pengguna | Roles & Izin) ----------------
   DUA IZIN TERPISAH:
   - "Akun Pengguna" (modul `pengguna`)  : daftar akun, buat akun, reset password, aktif/nonaktif.
   - "Roles & Izin" (modul `role_izin`)  : LIHAT daftar role & izin (read-only).
     Menyimpan role tetap hanya Super Admin (owner) — lihat require_superadmin di backend. */
function UsersTab() {
  const { user } = useAuth();
  const items = [];
  if (can(user, "pengguna")) items.push({ key: "accounts", label: "Akun Pengguna", icon: Users, comp: UsersPage });
  if (can(user, "role_izin") || user?.is_superadmin || user?.bootstrap_owner)
    items.push({ key: "roles", label: "Roles & Izin", icon: ShieldCheck, comp: SettingsRoles });
  if (!items.length)
    return (
      <div className="p-6 text-sm text-[#52525B]" data-testid="users-no-perm">
        Role akun ini tidak punya izin <b>Akun Pengguna</b> maupun <b>Roles &amp; Izin</b>.
      </div>
    );
  return <SubTabs items={items} testid="users-subtab" />;
}

/* ------------- Platform & Tampilan (Identitas & Warna | Menu & Urutan) ------------- */
function PlatformTab() {
  return (
    <SubTabs
      items={[
        { key: "identity", label: "Identitas & Warna", icon: Palette, comp: SettingsPlatform },
        { key: "menu", label: "Menu & Tampilan UI", icon: LayoutTemplate, comp: SettingsUI },
      ]}
      testid="platform-subtab"
    />
  );
}

/* ------------- Fitur & Integrasi (Fitur | Integritas | Diagnostik) ------------- */
const INTG_SUB = { fitur: "fitur", integritas: "integritas", diagnostik: "diagnostik" };

function IntegrationsTab() {
  let initial = "fitur";
  try {
    const t = new URLSearchParams(window.location.search).get("tab");
    if (INTG_SUB[t]) initial = INTG_SUB[t];
  } catch (e) {}
  return (
    <SubTabs
      initial={initial}
      items={[
        { key: "fitur", label: "Fitur & Integrasi", icon: SlidersHorizontal, comp: SettingsIntegrations },
        { key: "integritas", label: "Integritas", icon: ShieldCheck, comp: Integritas },
        { key: "diagnostik", label: "Diagnostik", icon: Bug, comp: Diagnostik },
      ]}
      testid="fitur-subtab"
    />
  );
}

/* Setiap tab punya daftar modul yang membolehkannya dibuka; tab tanpa `mods`
   selalu tampil (mis. Perangkat/Versi = info per-perangkat). Pengguna dengan
   izin parsial hanya melihat tab yang boleh dia buka — bukan daftar penuh yang
   ujungnya ditolak server (403). */
const TABS = [
  { key: "users", label: "Pengguna", icon: Users, comp: UsersTab, mods: ["pengguna", "role_izin"] },
  { key: "app", label: "Aplikasi", icon: Settings2, comp: SettingsBusiness, mods: ["pengaturan"] },
  { key: "widget", label: "Widget Kustom", icon: LayoutGrid, comp: SettingsCustomWidgets, mods: ["pengaturan"] },
  { key: "platform", label: "Platform & Tampilan", icon: Palette, comp: PlatformTab, mods: ["pengaturan"] },
  { key: "tables", label: "Meja", icon: Armchair, comp: Tables, mods: ["meja"] },
  { key: "device", label: "Perangkat", icon: Printer, comp: DeviceSettings },
  { key: "fitur", label: "Fitur & Integrasi", icon: SlidersHorizontal, comp: IntegrationsTab, mods: ["pengaturan"] },
  { key: "ai", label: "Pengaturan AI", icon: Sparkles, comp: SettingsAI, mods: ["pengaturan"] },
  { key: "wa", label: "WhatsApp & Laporan", icon: MessageCircle, comp: WhatsAppReport, mods: ["pengaturan"] },
  { key: "installer", label: "Installer", icon: Download, comp: SettingsInstaller, mods: ["pengaturan"] },
  { key: "versi", label: "Versi", icon: Box, comp: AppVersi },
  { key: "data", label: "Reset Data", icon: Trash2, comp: SettingsData, mods: ["pengaturan"] },
];

// tab lama yang kini jadi SUB-TAB (agar tautan/bookmark lama tetap bekerja)
const LEGACY_TAB_MAP = { roles: "users", ui: "platform", diagnostik: "fitur", integritas: "fitur" };

function tabFromSearch(search) {
  try {
    const t = new URLSearchParams(search || "").get("tab");
    const mapped = LEGACY_TAB_MAP[t] || t;
    if (TABS.some((x) => x.key === mapped)) return mapped;
  } catch (e) {}
  return "users";
}

export default function Settings() {
  const { user } = useAuth();
  // Hanya tampilkan tab yang izinnya benar-benar dimiliki user (admin yang belum
  // dibatasi / Super Admin otomatis melihat semua).
  const visibleTabs = TABS.filter((t) => !t.mods || t.mods.some((m) => can(user, m)));
  const [tab, setTab] = useState(() => tabFromSearch(typeof window !== "undefined" ? window.location.search : ""));
  // Ikuti perubahan ?tab= saat halaman ini SUDAH terbuka (mis. tombol pintasan dari
  // dalam Pengaturan sendiri: Installer → Integritas) — tanpa ini perpindahan tidak terjadi
  // karena React Router hanya mengganti query, komponen tidak dipasang ulang.
  const locSearch = useLocation().search;
  useEffect(() => {
    setTab(tabFromSearch(locSearch));
  }, [locSearch]);
  // Jangan biarkan tab aktif menunjuk tab yang tidak boleh dibuka (mis. bookmark lama)
  const shown = visibleTabs.some((t) => t.key === tab) ? tab : visibleTabs[0]?.key;
  const active = visibleTabs.find((t) => t.key === shown) || visibleTabs[0];
  if (!active) return null;
  const Active = active.comp;

  return (
    <div className="h-full flex flex-col">
      <div className="px-8 pt-6 bg-white border-b">
        <h1 className="text-3xl font-extrabold mb-4">Pengaturan</h1>
        <div className="flex gap-1 flex-wrap">
          {visibleTabs.map((t) => (
            <button
              key={t.key}
              data-testid={`settings-tab-${t.key}`}
              onClick={() => setTab(t.key)}
              className={`tap px-4 h-11 rounded-t-lg font-bold text-sm flex items-center gap-2 border-b-2 -mb-px ${
                shown === t.key ? "border-[#E63946] text-[#E63946]" : "border-transparent text-[#52525B] hover:text-[#0A0A0A]"
              }`}
            >
              <t.icon size={16} /> {t.label}
            </button>
          ))}
        </div>
      </div>
      <div className="flex-1 overflow-hidden">
        <ErrorBoundary key={shown}>
          <Active />
        </ErrorBoundary>
      </div>
    </div>
  );
}
