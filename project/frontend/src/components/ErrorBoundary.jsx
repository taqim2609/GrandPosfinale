import { Component } from "react";
import { AlertTriangle, RefreshCw } from "lucide-react";

/* Menahan error render agar tidak mematikan seluruh aplikasi/halaman.
   Dipakai membungkus isi sub-tab & halaman Pengaturan. */
export default class ErrorBoundary extends Component {
  constructor(p) { super(p); this.state = { err: null }; }
  static getDerivedStateFromError(err) { return { err }; }
  componentDidCatch(err, info) {
    try { console.error("[gak] render error:", err, info?.componentStack?.slice(0, 400)); } catch (e) {}
  }
  render() {
    if (!this.state.err) return this.props.children;
    return (
      <div className="h-full overflow-y-auto p-6" data-testid="render-error">
        <div className="max-w-xl rounded-2xl border-2 border-[#F59E0B] bg-[#FFFBEB] p-5">
          <div className="font-extrabold text-[#92400E] flex items-center gap-2"><AlertTriangle size={18} /> Bagian ini gagal dimuat</div>
          <p className="text-sm text-[#92400E] mt-1">
            Sisa aplikasi tetap bisa dipakai (kolom lain tidak terpengaruh). Bila berulang, kirim pesan di bawah
            lewat Pengaturan → Fitur &amp; Integrasi → Diagnostik.
          </p>
          <pre className="mt-3 rounded-xl bg-white border p-3 text-[11px] overflow-x-auto whitespace-pre-wrap">{String(this.state.err?.message || this.state.err)}</pre>
          <button onClick={() => this.setState({ err: null })}
            className="tap mt-3 h-10 px-4 rounded-xl bg-[#B45309] text-white font-bold text-sm inline-flex items-center gap-2">
            <RefreshCw size={14} /> Coba Muat Ulang Bagian Ini
          </button>
        </div>
      </div>
    );
  }
}
