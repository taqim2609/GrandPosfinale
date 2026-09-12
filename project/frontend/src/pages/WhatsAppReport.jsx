import WhatsApp from "@/pages/WhatsApp";
import SettingsReport from "@/pages/SettingsReport";
import SettingsWATemplates from "@/pages/SettingsWATemplates";

// Gabungan: konfigurasi WhatsApp Gateway + pengaturan Laporan otomatis + Template WA dalam satu tab.
export default function WhatsAppReport() {
  return (
    <div className="h-full overflow-y-auto" data-testid="wa-report-page">
      <WhatsApp />
      <div className="h-2 bg-[#F4F5F7] border-y" />
      <SettingsReport />
      <div className="h-2 bg-[#F4F5F7] border-y" />
      <SettingsWATemplates />
    </div>
  );
}
