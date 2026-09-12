import { useEffect, useState } from "react";
import api, { apiError } from "@/lib/api";
import { rupiah, wibToday } from "@/lib/format";
import { toast } from "sonner";
import { CalendarCheck, Plus, Users, Phone, Trash2, Clock } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";

const STATUS_LABEL = { pending: "Menunggu", confirmed: "Dikonfirmasi", arrived: "Datang", cancelled: "Batal", done: "Selesai" };
const STATUS_COLOR = { pending: "bg-[#FEF3C7] text-[#B45309]", confirmed: "bg-[#E0E7FF] text-[#4338CA]", arrived: "bg-[#D1FAE5] text-[#047857]", cancelled: "bg-[#FEE2E2] text-[#EF4444]", done: "bg-[#F4F5F7] text-[#52525B]" };

export default function Reservations() {
  const [date, setDate] = useState(wibToday());
  const [rows, setRows] = useState([]);
  const [tables, setTables] = useState([]);
  const [open, setOpen] = useState(false);
  const [form, setForm] = useState({ table_id: "", customer_name: "", phone: "", pax: 2, time: "12:00", note: "" });

  const load = () => {
    api.get("/reservations", { params: { date } }).then((r) => setRows(r.data.reservations || [])).catch(() => {});
    api.get("/tables").then((r) => setTables(r.data || [])).catch(() => {});
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- refetch on date change
  useEffect(() => { load(); }, [date]);

  const save = async () => {
    if (!form.customer_name.trim()) return toast.error("Nama pemesan wajib");
    if (!form.table_id) return toast.error("Pilih meja");
    try {
      await api.post("/reservations", { ...form, date });
      toast.success("Reservasi dibuat (Dikonfirmasi)");
      setOpen(false); setForm({ table_id: "", customer_name: "", phone: "", pax: 2, time: "12:00", note: "" });
      load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  const setStatus = async (id, status) => {
    try {
      await api.post(`/reservations/${id}/status`, { status });
      load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const del = async (id) => {
    if (!window.confirm("Hapus reservasi ini?")) return;
    try { await api.delete(`/reservations/${id}`); load(); } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <div className="flex items-center justify-between mb-6 flex-wrap gap-3">
        <h1 className="text-3xl font-extrabold flex items-center gap-2"><CalendarCheck /> Reservasi Meja</h1>
        <div className="flex items-center gap-2 flex-wrap">
          <input data-testid="res-date" type="date" value={date} onChange={(e) => setDate(e.target.value)} className="h-11 rounded-xl border px-3 font-num bg-white" />
          <button data-testid="add-reservation-btn" onClick={() => setOpen(true)} className="tap h-11 px-5 rounded-xl bg-[#E63946] hover:bg-[#BE123C] text-white font-bold flex items-center gap-2"><Plus size={18} /> Reservasi</button>
        </div>
      </div>

      <div className="bg-white rounded-2xl border overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-[#F4F5F7] text-[#52525B] text-xs uppercase tracking-wider">
            <tr><th className="text-left p-3">Jam</th><th className="text-left p-3">Pelanggan</th><th className="text-left p-3">Meja</th><th className="text-center p-3">Pax</th><th className="text-left p-3">Status</th><th className="p-3"></th></tr>
          </thead>
          <tbody>
            {rows.length === 0 && <tr><td colSpan={6} className="p-10 text-center text-[#a1a1aa]">Belum ada reservasi untuk tanggal ini.</td></tr>}
            {rows.map((r) => (
              <tr key={r.id} className="border-t" data-testid={`reservation-${r.id}`}>
                <td className="p-3"><span className="font-bold flex items-center gap-1"><Clock size={13} /> {r.time}</span></td>
                <td className="p-3">
                  <div className="font-bold">{r.customer_name}</div>
                  {r.phone && <div className="text-[11px] text-[#52525B] flex items-center gap-1"><Phone size={10} /> {r.phone}</div>}
                  {r.note && <div className="text-[11px] text-[#a1a1aa]">{r.note}</div>}
                </td>
                <td className="p-3">{r.table_name}</td>
                <td className="p-3 text-center"><span className="inline-flex items-center gap-1 font-bold"><Users size={13} /> {r.pax}</span></td>
                <td className="p-3">
                  <select value={r.status} onChange={(e) => setStatus(r.id, e.target.value)}
                    className={`text-xs font-bold px-2 py-1 rounded-full border-0 ${STATUS_COLOR[r.status] || STATUS_COLOR.pending}`}>
                    {Object.entries(STATUS_LABEL).map(([k, v]) => <option key={k} value={k}>{v}</option>)}
                  </select>
                </td>
                <td className="p-3 text-right">
                  <button onClick={() => del(r.id)} className="tap h-8 w-8 rounded-lg bg-[#FEE2E2] text-[#EF4444] grid place-items-center"><Trash2 size={14} /></button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent data-testid="reservation-dialog">
          <DialogHeader><DialogTitle>Buat Reservasi</DialogTitle></DialogHeader>
          <div className="space-y-3 text-sm">
            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Nama Pemesan</label>
              <input data-testid="res-name" value={form.customer_name} onChange={(e) => setForm({ ...form, customer_name: e.target.value })} className="mt-1 w-full h-11 rounded-xl border px-3" />
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">No. HP</label>
              <input data-testid="res-phone" value={form.phone} onChange={(e) => setForm({ ...form, phone: e.target.value })} placeholder="628xxx" className="mt-1 w-full h-11 rounded-xl border px-3 font-num" />
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Meja</label>
                <select data-testid="res-table" value={form.table_id} onChange={(e) => setForm({ ...form, table_id: e.target.value })} className="mt-1 w-full h-11 rounded-xl border px-3 bg-white">
                  <option value="">— pilih —</option>
                  {tables.map((t) => <option key={t.id} value={t.id}>{t.name}</option>)}
                </select>
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Jam</label>
                <input data-testid="res-time" type="time" value={form.time} onChange={(e) => setForm({ ...form, time: e.target.value })} className="mt-1 w-full h-11 rounded-xl border px-3 font-num" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-2">
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Jumlah Orang</label>
                <input data-testid="res-pax" type="number" min="1" value={form.pax} onChange={(e) => setForm({ ...form, pax: e.target.value })} className="mt-1 w-full h-11 rounded-xl border px-3 font-num" />
              </div>
              <div>
                <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Tanggal</label>
                <input type="date" value={date} onChange={(e) => setDate(e.target.value)} className="mt-1 w-full h-11 rounded-xl border px-3 font-num" />
              </div>
            </div>
            <div>
              <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Catatan</label>
              <input data-testid="res-note" value={form.note} onChange={(e) => setForm({ ...form, note: e.target.value })} placeholder="opsional" className="mt-1 w-full h-11 rounded-xl border px-3" />
            </div>
          </div>
          <DialogFooter>
            <button data-testid="save-reservation" onClick={save} className="tap h-11 px-6 rounded-xl bg-[#E63946] text-white font-bold">Simpan</button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
