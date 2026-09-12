/* Cetak teks polos (laporan/struk/bukti pembayaran) dari WebView/APK & browser.
   Blob URL lebih andal daripada document.write; bila jendela baru diblokir,
   cetak lewat iframe tersembunyi. Dipakai laporan shift & bukti settlement vendor. */

const esc = (s) =>
  String(s ?? "").replace(/[&<>"']/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[c]));

/** Buka jendela cetak berisi teks apa adanya (font monospace, kertas A5). */
export function printText(text, title = "Cetak") {
  const html = `<!doctype html><html><head><meta charset="utf-8"><title>${esc(title)}</title><style>
      @page { size: A5; margin: 10mm } body{font-family:'Courier New',monospace;font-size:12px;white-space:pre-wrap;color:#000;margin:0}
      .bar{position:sticky;top:0;background:#fff;padding:8px 0;border-bottom:1px solid #ddd;margin-bottom:10px;font-family:system-ui,sans-serif}
      button{padding:8px 18px;border:0;border-radius:8px;background:#111;color:#fff;font-weight:700;font-family:system-ui,sans-serif}
      @media print{.bar{display:none}}</style></head><body>
      <div class="bar"><button onclick="window.print()">Cetak</button></div>
      <div>${esc(text)}</div>
    </body></html>`;
  const blob = new Blob([html], { type: "text/html" });
  const url = URL.createObjectURL(blob);
  const w = window.open(url, "_blank", "width=560,height=760");
  if (!w) {
    const fr = document.createElement("iframe");
    fr.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    fr.src = url;
    document.body.appendChild(fr);
    fr.onload = () => { try { fr.contentWindow.focus(); fr.contentWindow.print(); } catch (e) {} };
  }
  setTimeout(() => URL.revokeObjectURL(url), 60000);
}
