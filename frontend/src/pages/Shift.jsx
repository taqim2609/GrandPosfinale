import { useEffect, useState } from "react";
import { useNavigate } from "react-router-dom";
import api, { apiError } from "@/lib/api";
import { rupiah } from "@/lib/format";
import { toast } from "sonner";
import { Clock, Play, Square, Loader2, Wallet, Users, MessageCircle, ChevronDown, ChevronRight, Printer, Ban } from "lucide-react";
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogFooter } from "@/components/ui/dialog";
import { bizCache, loadBusiness, labelsOf } from "@/lib/business";
import { printText as printText_ } from "@/lib/print";

export default function Shift() {
  const nav = useNavigate();
  const [biz, setBiz] = useState(bizCache());
  useEffect(() => { loadBusiness().then(setBiz); }, []);
  const lb = labelsOf(biz);
  const [shift, setShift] = useState(null);
  const [loading, setLoading] = useState(true);
  const [opening, setOpening] = useState("");
  const [closing, setClosing] = useState("");
  const [report, setReport] = useState(null);
  const [viewShift, setViewShift] = useState("fnb"); // fnb | retail
  const [history, setHistory] = useState([]);
  const [showHistory, setShowHistory] = useState(false);
  const [sendingWa, setSendingWa] = useState(false);
  const [vendorPreview, setVendorPreview] = useState([]);
  const [cashDay, setCashDay] = useState(null);
  // paid[row.vendor_id] = berapa yang diberikan ke vendor
  const [paid, setPaid] = useState({});
  // openDetail[group] = true -> tampilkan detail per produk (preview / laporan penutupan)
  const [openDetail, setOpenDetail] = useState({});

  const loadHistory = () =>
    api.get("/shifts/history").then((r) => setHistory(r.data.shifts || [])).catch(() => {});

  const sendWa = async () => {
    if (!report) return;
    setSendingWa(true);
    const t = toast.loading("Mengirim laporan shift ke WhatsApp...");
    try {
      // perlu shift id — ambil dari report (tidak tersimpan) -> pakai history terbaru
      const { data } = await api.post(`/shifts/${latestShiftId}/send-wa`);
      toast.success(`Laporan terkirim ke ${data.recipients.length} nomor`, { id: t });
    } catch (e) { toast.error(apiError(e.response?.data?.detail), { id: t, duration: 9000 }); }
    finally { setSendingWa(false); }
  };

  const load = async () => {
    try {
      const r = await api.get("/shifts/current");
      setShift(r.data);
      if (r.data) {
        // preview bagian vendor + kas harian (digabung ke shift)
        try {
          const v = await api.get("/shifts/current/vendor");
          const rows = v.data.vendors || [];
          setVendorPreview(rows);
          // Isi otomatis "Diberikan" dengan SISA yang belum dibayar (bagian hari ini). Pembayaran
          // lewat Settlement sudah dikurangkan server, jadi kasir tidak membayar dua kali; nominal
          // tetap bebas diubah (kelebihannya mengurangi utang/saldo vendor).
          const pre = {};
          rows.forEach((r) => {
            const sisa = Number(r.remaining || 0);
            if (sisa > 0.009) pre[r.vendor_id] = String(sisa);
          });
          setPaid(pre);
        } catch (_) {}
        try { const c = await api.get("/cash"); setCashDay(c.data); } catch (_) {}
      } else {
        setVendorPreview([]); setCashDay(null);
      }
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
    finally { setLoading(false); }
  };
  // eslint-disable-next-line react-hooks/exhaustive-deps -- fetch on mount
  useEffect(() => { load(); loadHistory(); }, []);

  const open = async () => {
    try {
      const { data } = await api.post("/shifts/open", { opening_cash: Number(opening || 0) });
      setShift(data); setReport(null); setPaid({}); toast.success("Shift dibuka");
      load();
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const close = async () => {
    try {
      const vendor_payments = vendorPreview.map((v) => ({ vendor_id: v.vendor_id, paid: Number(paid[v.vendor_id] || 0) }));
      const { data } = await api.post("/shifts/close", { closing_cash: Number(closing || 0), vendor_payments });
      setReport(data.report); setLatestShiftId(data.id); setShift(null); toast.success("Shift ditutup");
      loadHistory();
      // Pengingat daftar belanja (bila diaktifkan di Pengaturan → WhatsApp & Laporan)
      try {
        const s = await api.get("/settings/shopping");
        if (s.data?.request_on_close) {
          toast("Buat daftar belanja bahan untuk besok?", {
            action: { label: "Buat Sekarang", onClick: () => nav("/ingredients?tab=belanja") },
            duration: 15000,
          });
        }
      } catch (_) {}
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); }
  };
  const [latestShiftId, setLatestShiftId] = useState("");
  const [printText, setPrintText] = useState(null);
  const [printLoading, setPrintLoading] = useState(false);

  // Pratinjau cetak laporan shift — format mengikuti TEMPLATE laporan shift
  // (bisa dirancang sendiri di Pengaturan → WhatsApp & Laporan → Template WhatsApp).
  const loadPrint = async (sid) => {
    setPrintLoading(true);
    try {
      const { data } = await api.get(`/shifts/${sid}/print`);
      setPrintText(data.text);
    } catch (e) { toast.error(apiError(e.response?.data?.detail)); setPrintText(null); }
    finally { setPrintLoading(false); }
  };
  // Cetak laporan shift (helper bersama di lib/print.js — dipakai juga bukti settlement vendor).
  const doPrintText = () => {
    if (printText == null) return;
    printText_(printText, "Laporan Shift");
  };

  if (loading) return <div className="h-full grid place-items-center"><Loader2 className="animate-spin text-[#E63946]" /></div>;

  return (
    <div className="h-full overflow-y-auto p-6 lg:p-8">
      <h1 className="text-3xl font-extrabold flex items-center gap-2"><Clock /> Manajemen Shift</h1>
      <p className="text-[#52525B] mt-1 mb-6">Buka shift sebelum mulai transaksi; tutup shift menampilkan kas harian + bagi hasil vendor & uang bersih.</p>

      {shift ? (
        <div className="max-w-lg bg-white rounded-2xl border p-6 space-y-5">
          <div className="inline-flex items-center gap-2 bg-[#D1FAE5] text-[#047857] font-bold px-3 py-1 rounded-full text-sm">
            <span className="h-2 w-2 rounded-full bg-[#047857] animate-pulse" /> Shift Aktif
          </div>
          <div className="text-sm text-[#52525B]">
            Dibuka: <b>{new Date(shift.opened_at).toLocaleString("id-ID")}</b>
            <br />Kas Awal: <b className="font-num">{rupiah(shift.opening_cash)}</b>
          </div>

          {/* Kas harian (digabung) */}
          {cashDay && (
            <div className="rounded-xl border border-[#E4E4E7] p-3">
              <div className="flex items-center gap-2 font-extrabold text-sm mb-2"><Wallet size={15} className="text-[#E63946]" /> Pengeluaran (Kas Keluar)</div>
              <Row l={lb.fnb} v={rupiah(cashDay.out_fnb || 0)} />
              <Row l={lb.retail} v={rupiah(cashDay.out_retail || 0)} />
              <Row l="Total Keluar" v={rupiah(cashDay.cash_out || 0)} />
            </div>
          )}

          {/* Pembatalan/refund pada shift ini — penjelas kenapa kas laci bisa lebih kecil
              dari penjualan (transaksi batal otomatis keluar dari penjualan). */}
          {cashDay && (cashDay.void_count || 0) > 0 && (
            <div data-testid="shift-void-card" className="rounded-xl border border-[#FDE68A] bg-[#FFFBEB] p-3">
              <div className="flex items-center gap-2 font-extrabold text-sm mb-2 text-[#92400E]"><Ban size={15} /> Pembatalan / Refund</div>
              <Row l="Jumlah transaksi" v={`${cashDay.void_count}×`} />
              <Row l="Nilai dibatalkan" v={rupiah(cashDay.void_amount || 0)} />
              {(cashDay.void_rows || []).slice(0, 5).map((v) => (
                <div key={v.id || v.order_number} className="text-[11px] text-[#92400E] border-t border-[#FDE68A] pt-1 mt-1">
                  {v.order_number} · {v.kind === "refund" ? "REFUND" : "VOID"} · <b className="font-num">{rupiah(v.amount)}</b>
                  {v.reason ? ` · ${v.reason}` : ""}
                </div>
              ))}
            </div>
          )}

          {/* Bagi hasil vendor (preview) */}
          {vendorPreview.length > 0 && (
            <div className="rounded-xl border border-[#E4E4E7] p-3">
              <div className="flex items-center gap-2 font-extrabold text-sm mb-1"><Users size={15} className="text-[#E63946]" /> Bagi Hasil Vendor</div>
              <div className="text-[11px] text-[#52525B] mb-2">
                Nominal yang diisi otomatis dicatat sebagai <b>pembayaran/settlement vendor</b> (bukti + kas keluar),
                jadi saldo utang vendor langsung berkurang dan tidak bisa terhitung dua kali.
              </div>
              {vendorPreview.map((v) => (
                <div key={v.vendor_id} className="py-1.5 border-b last:border-0 text-sm">
                  <div className="flex items-center gap-2">
                    <div className="flex-1 min-w-0">
                      <div className="font-bold truncate">{v.vendor_name}</div>
                      <div className="text-[11px] text-[#52525B]">Bagian vendor: <b className="font-num">{rupiah(v.share)}</b> · Omzet {rupiah(v.gross)}</div>
                      {v.paid_settled > 0 && (
                        <div className="text-[11px] text-[#15803D] font-bold" data-testid={`vendor-settled-${v.vendor_id}`}>
                          Sudah dibayar via Settlement (hari ini): {rupiah(v.paid_settled)} · sisa {rupiah(v.remaining)}
                        </div>
                      )}
                      {(v.carry_in || 0) > 0.009 && (
                        <div className="text-[11px] text-[#B45309] font-bold" data-testid={`vendor-debt-${v.vendor_id}`}>
                          Utang hari sebelumnya: {rupiah(v.carry_in)} (boleh ikut dibayar sekarang)
                        </div>
                      )}
                      {(() => {
                        const val = Number(paid[v.vendor_id] || 0);
                        const sisa = Number(v.remaining || 0);
                        const selisih = Math.round((val - sisa) * 100) / 100;
                        if (Math.abs(selisih) < 0.01) return null;
                        return (
                          <div data-testid={`vendor-diff-${v.vendor_id}`}
                            className={`text-[11px] font-bold ${selisih > 0 ? "text-[#B45309]" : "text-[#52525B]"}`}>
                            {selisih > 0
                              ? `Lebih ${rupiah(selisih)} dari sisa — kelebihannya mengurangi utang/saldo vendor`
                              : `Kurang ${rupiah(Math.abs(selisih))} — sisanya jadi utang vendor berikutnya`}
                          </div>
                        );
                      })()}
                    </div>
                    <div className="text-right">
                      <div className="text-[10px] text-[#52525B] font-bold uppercase">Diberikan</div>
                      <input data-testid={`vendor-paid-${v.vendor_id}`} type="number" min="0" value={paid[v.vendor_id] ?? 0}
                        onChange={(e) => setPaid((p) => ({ ...p, [v.vendor_id]: e.target.value }))}
                        className="w-28 h-9 rounded-lg border px-2 font-num text-sm" />
                      <button data-testid={`vendor-fill-${v.vendor_id}`}
                        onClick={() => setPaid((p) => ({ ...p, [v.vendor_id]: String(Math.max(0, Number(v.remaining || 0))) }))}
                        className="tap mt-1 text-[10px] font-bold text-[#E63946]">Isi sisa</button>
                    </div>
                  </div>
                  {(v.items || []).length > 0 && (
                    <>
                      <button data-testid={`preview-toggle-${v.vendor_id}`} onClick={() => setOpenDetail((o) => ({ ...o, [`pv-${v.vendor_id}`]: !o[`pv-${v.vendor_id}`] }))}
                        className="tap mt-1.5 text-[11px] font-bold text-[#E63946] flex items-center gap-1">
                        {openDetail[`pv-${v.vendor_id}`] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {openDetail[`pv-${v.vendor_id}`] ? "Sembunyikan detail produk" : `${(v.items || []).length} produk — lihat detail`}
                      </button>
                      {openDetail[`pv-${v.vendor_id}`] && (
                        <div className="mt-1.5 rounded-lg bg-[#FAFAFA] border border-[#F1F1F4] px-3 py-1.5 space-y-1">
                          {v.items.map((im) => (
                            <div key={im.product_id || im.name} className="flex justify-between text-[11px] gap-2">
                              <span className="font-bold truncate">{im.name} <span className="text-[#a1a1aa] font-normal">×{im.qty}</span></span>
                              <span className="font-num shrink-0">{rupiah(im.gross)} <span className="text-[#E63946]">(vendor {rupiah(im.vendor_share)})</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
            </div>
          )}

          <div>
            <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Kas Akhir (hitung fisik)</label>
            <input data-testid="closing-cash" type="number" value={closing} onChange={(e) => setClosing(e.target.value)}
              className="w-full h-12 rounded-xl border px-3 mt-1.5 font-num" placeholder="0" />
          </div>
          <button data-testid="close-shift-btn" onClick={close} className="tap w-full h-13 py-3 rounded-xl bg-[#0A0A0A] text-white font-bold flex items-center justify-center gap-2">
            <Square size={16} /> Tutup Shift
          </button>
        </div>
      ) : (
        <div className="max-w-md bg-white rounded-2xl border p-6">
          <label className="text-xs uppercase tracking-wider font-bold text-[#52525B]">Kas Awal</label>
          <input data-testid="opening-cash" type="number" value={opening} onChange={(e) => setOpening(e.target.value)}
            className="w-full h-12 rounded-xl border px-3 mt-1.5 font-num" placeholder="0" />
          <button data-testid="open-shift-btn" onClick={open} className="tap w-full h-13 py-3 mt-4 rounded-xl bg-[#E63946] hover:bg-[#BE123C] text-white font-bold flex items-center justify-center gap-2">
            <Play size={16} /> Buka Shift
          </button>
        </div>
      )}

      {report && (
        <div className="max-w-lg bg-white rounded-2xl border p-6 mt-6" data-testid="shift-report">
          <h3 className="font-extrabold text-lg mb-3">Laporan Shift</h3>
          <Row l="Total Order" v={report.order_count} />
          <div className="flex gap-2 mb-2">
            <button data-testid="shift-view-fnb" onClick={() => setViewShift("fnb")} className={`tap h-9 px-4 rounded-lg font-bold text-xs ${viewShift === "fnb" ? "bg-[#E63946] text-white" : "bg-[#F4F5F7]"}`}>🍽️ {lb.fnb}</button>
            <button data-testid="shift-view-retail" onClick={() => setViewShift("retail")} className={`tap h-9 px-4 rounded-lg font-bold text-xs ${viewShift === "retail" ? "bg-[#E63946] text-white" : "bg-[#F4F5F7]"}`}>🛒 {lb.retail}</button>
          </div>
          <Row l="Total Penjualan" v={rupiah(report.total_sales)} />
          {viewShift === "fnb" ? (
            <>
              <div className="text-[11px] font-extrabold text-[#52525B] uppercase tracking-wider pt-1">{lb.fnb}</div>
              <Row l="Dine-In" v={rupiah(report.by_type.dine_in)} />
              <Row l="Take Away" v={rupiah(report.by_type.take_away)} />
              <Row l={`Subtotal ${lb.fnb}`} v={rupiah(report.fnb_total)} accent />
            </>
          ) : (
            <>
              <div className="text-[11px] font-extrabold text-[#52525B] uppercase tracking-wider pt-1">{lb.retail}</div>
              <Row l={lb.retail} v={rupiah(report.retail_total)} accent />
            </>
          )}
          <div className="pt-2"><div className="text-xs font-extrabold text-[#52525B] uppercase tracking-wider mb-1">Laba Kotor</div></div>
          <Row l={`Laba ${lb.fnb}`} v={rupiah(report.gross_profit_fnb)} accent />
          <Row l={`Laba ${lb.retail}`} v={rupiah(report.gross_profit_retail)} accent />
          {(report.void_count || 0) > 0 && (
            <>
              <div className="pt-2"><div className="text-xs font-extrabold text-[#52525B] uppercase tracking-wider mb-1">Pembatalan / Refund</div></div>
              <Row l="Jumlah transaksi" v={`${report.void_count}×`} />
              <Row l="Nilai dibatalkan (tidak masuk penjualan)" v={rupiah(report.void_amount || 0)} warn />
            </>
          )}
          <div className="pt-2"><div className="text-xs font-extrabold text-[#52525B] uppercase tracking-wider mb-1">Pengeluaran</div></div>
          <Row l={lb.fnb} v={rupiah(report.cash_out_fnb)} />
          <Row l={lb.retail} v={rupiah(report.cash_out_retail)} />
          <div className="pt-2"><div className="text-xs font-extrabold text-[#52525B] uppercase tracking-wider mb-1">Perkiraan Kas</div></div>
          <Row l="Perkiraan Kas (awal + tunai − keluar)" v={rupiah(report.expected_cash)} />
          {(report.vendor_share || []).length > 0 && (
            <>
              <div className="pt-2"><div className="text-xs font-extrabold text-[#52525B] uppercase tracking-wider mb-1">Bagi Hasil Vendor</div></div>
              {(report.vendor_share || []).map((v) => (
                <div key={v.vendor_id} className="rounded-lg bg-[#FAFAFA] border border-[#E4E4E7] px-3 py-2 my-1.5">
                  <div className="font-bold text-sm">{v.vendor_name}</div>
                  <Row l="Omzet vendor" v={rupiah(v.gross)} />
                  <Row l="Bagi hasil (expected)" v={rupiah(v.share)} />
                  <Row l="Bagi hasil (real, diberikan)" v={rupiah(v.paid)} />
                  <Row l="Selisih" v={`${v.difference >= 0 ? "" : "-"}${rupiah(Math.abs(v.difference))}`} warn={v.difference !== 0} />
                  <Row l="Bagian outlet (omzet − bagi hasil)" v={rupiah(v.outlet_share ?? 0)} />
                  {(v.items || []).length > 0 && (
                    <>
                      <button data-testid={`report-toggle-${v.vendor_id}`} onClick={() => setOpenDetail((o) => ({ ...o, [`rp-${v.vendor_id}`]: !o[`rp-${v.vendor_id}`] }))}
                        className="tap mt-1 text-[11px] font-bold text-[#E63946] flex items-center gap-1">
                        {openDetail[`rp-${v.vendor_id}`] ? <ChevronDown size={13} /> : <ChevronRight size={13} />}
                        {openDetail[`rp-${v.vendor_id}`] ? "Sembunyikan detail produk" : `${(v.items || []).length} produk — lihat detail penjualan`}
                      </button>
                      {openDetail[`rp-${v.vendor_id}`] && (
                        <div className="mt-1.5 space-y-1 border-t border-[#F1F1F4] pt-1.5" data-testid={`report-items-${v.vendor_id}`}>
                          {v.items.map((im) => (
                            <div key={im.product_id || im.name} className="flex justify-between text-[11px] gap-2">
                              <span className="font-bold truncate">{im.name} <span className="text-[#a1a1aa] font-normal">×{im.qty}</span></span>
                              <span className="font-num shrink-0">{rupiah(im.gross)} <span className="text-[#E63946]">(vendor {rupiah(im.vendor_share)})</span></span>
                            </div>
                          ))}
                        </div>
                      )}
                    </>
                  )}
                </div>
              ))}
              <Row l="Total Omzet Vendor" v={rupiah((report.vendor_share || []).reduce((a, v) => a + (v.gross || 0), 0))} />
              <Row l="Total Bagi Hasil (expected)" v={rupiah(report.vendor_total_share)} />
              <Row l="Total Diberikan (real)" v={rupiah(report.vendor_total_paid)} />
              <Row l="Total Selisih" v={`${report.vendor_total_difference >= 0 ? "" : "-"}${rupiah(Math.abs(report.vendor_total_difference))}`} warn={report.vendor_total_difference !== 0} />
              <Row l="Total Bagian Outlet" v={rupiah(report.vendor_total_outlet ?? 0)} />
              {(report.vendor_settled_paid || 0) > 0 && (
                <Row l="Sudah dibayar via Settlement (masuk pengeluaran)" v={rupiah(report.vendor_settled_paid)} />
              )}
              {(report.vendor_settlements_created || []).length > 0 && (
                <div className="text-[11px] text-[#15803D] font-bold mt-1" data-testid="shift-settlements-created">
                  {(report.vendor_settlements_created || []).map((x) => (
                    <div key={x.id || x.settlement_no}>
                      Bukti {x.settlement_no}: {x.vendor_name} {rupiah(x.paid)} (utang setelahnya {rupiah(x.carry_out)})
                    </div>
                  ))}
                </div>
              )}
            </>
          )}
          <div className="pt-3 mt-1 border-t-2 border-dashed">
            <div className="text-xs font-extrabold text-[#52525B] uppercase tracking-wider mb-1">Uang Bersih (setelah bagi hasil vendor)</div>
            <Row l={lb.fnb} v={rupiah(report.net_cash_fnb)} accent />
            <Row l={lb.retail} v={rupiah(report.net_cash_retail)} accent />
            <div className="flex justify-between items-center pt-1">
              <span className="font-extrabold text-base">Total ({lb.fnb} + {lb.retail})</span>
              <span className="font-num font-extrabold text-lg text-[#047857]">{rupiah(report.net_cash)}</span>
            </div>
            <button data-testid="shift-print" onClick={() => latestShiftId && loadPrint(latestShiftId)}
              disabled={printLoading || !latestShiftId}
              className="tap mt-3 w-full h-11 rounded-xl bg-[#0A0A0A] hover:bg-[#27272A] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {printLoading ? <Loader2 size={16} className="animate-spin" /> : <Printer size={16} />} Cetak Laporan Shift
            </button>
            <button data-testid="shift-send-wa" onClick={sendWa} disabled={sendingWa || !latestShiftId}
              className="tap mt-2 w-full h-11 rounded-xl bg-[#25D366] hover:bg-[#1EBE5B] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              {sendingWa ? <Loader2 size={16} className="animate-spin" /> : <MessageCircle size={16} />} Kirim Laporan Shift ke WhatsApp
            </button>
          </div>
        </div>
      )}

      {/* Histori shift */}
      <div className="max-w-lg mt-6">
        <button data-testid="toggle-shift-history" onClick={() => setShowHistory((v) => !v)}
          className="tap w-full h-11 rounded-xl bg-white border font-bold text-sm flex items-center justify-center gap-2">
          {showHistory ? "Sembunyikan" : "Lihat"} Histori Laporan Shift ({history.length})
        </button>
        {showHistory && (
          <div className="mt-3 space-y-3">
            {history.length === 0 && <div className="text-center text-[#a1a1aa] py-6 bg-white rounded-2xl border">Belum ada shift ditutup.</div>}
            {history.map((s) => (
              <div key={s.id} className="bg-white rounded-2xl border p-4 text-sm" data-testid={`shift-history-${s.id}`}>
                <div className="flex justify-between items-center">
                  <span className="font-extrabold">{s.cashier_name}</span>
                  <span className="flex items-center gap-2">
                    <button onClick={() => loadPrint(s.id)} className="tap h-7 px-2.5 rounded-lg bg-[#F4F5F7] font-bold text-xs flex items-center gap-1" title="Cetak laporan shift ini"><Printer size={12} /> Cetak</button>
                    <span className="text-[11px] text-[#52525B]">{new Date(s.opened_at).toLocaleString("id-ID")}</span>
                  </span>
                </div>
                <div className="mt-1.5 grid grid-cols-2 gap-x-3 text-[13px]">
                  <Row l="Penjualan" v={rupiah(s.total_sales)} />
                  <Row l="Order" v={s.order_count} />
                  <Row l={lb.fnb} v={rupiah(s.fnb_total)} />
                  <Row l={lb.retail} v={rupiah(s.retail_total)} />
                  <Row l="Perkiraan kas" v={rupiah(s.expected_cash)} />
                  <Row l="Uang bersih" v={rupiah(s.net_cash)} />
                </div>
                {s.vendor_total_share > 0 && (
                  <div className="text-[11px] text-[#52525B] mt-1">Vendor: share {rupiah(s.vendor_total_share)} · diberikan {rupiah(s.vendor_total_paid)}{s.vendor_settled_paid ? ` · settlement ${rupiah(s.vendor_settled_paid)}` : ""}</div>
                )}
              </div>
            ))}
          </div>
        )}
      </div>

      {/* Dialog pratinjau cetak laporan shift */}
      <Dialog open={printText != null || printLoading} onOpenChange={(o) => { if (!o) setPrintText(null); }}>
        <DialogContent className="max-w-xl max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="flex items-center gap-2"><Printer size={17} /> Cetak Laporan Shift</DialogTitle>
          </DialogHeader>
          <p className="text-xs text-[#52525B] -mt-1">
            Format ini mengikuti <b>Template Laporan Shift</b> — ubah susunan/teksnya di Pengaturan → WhatsApp &amp; Laporan → Template WhatsApp, lalu cetak lagi.
          </p>
          {printLoading ? (
            <div className="h-32 grid place-items-center"><Loader2 className="animate-spin text-[#E63946]" /></div>
          ) : (
            <pre className="rounded-xl bg-[#FAFAFB] border p-4 text-xs leading-relaxed whitespace-pre-wrap font-mono max-h-[50vh] overflow-y-auto">{printText}</pre>
          )}
          <DialogFooter className="flex-col gap-2 sm:flex-col">
            <button onClick={doPrintText} disabled={printText == null} className="tap w-full h-12 rounded-xl bg-[#0A0A0A] text-white font-bold flex items-center justify-center gap-2 disabled:opacity-50">
              <Printer size={17} /> Cetak Sekarang
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
const Row = ({ l, v, warn, accent }) => (
  <div className="flex justify-between py-1 border-b last:border-0 text-sm">
    <span className="text-[#52525B]">{l}</span>
    <span className={`font-num font-bold ${warn ? "text-[#B45309]" : accent ? "text-[#E63946]" : ""}`}>{v}</span>
  </div>
);
