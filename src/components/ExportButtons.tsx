"use client";

import { toPng } from "html-to-image";

export default function ExportButtons({ filename }: { filename: string }) {
  async function downloadPng() {
    const el = document.getElementById("statement-card");
    if (!el) return;
    const dataUrl = await toPng(el, { backgroundColor: "#ffffff", pixelRatio: 2 });
    const a = document.createElement("a");
    a.href = dataUrl;
    a.download = `${filename}.png`;
    a.click();
  }
  return (
    <div className="no-print flex gap-2">
      <button onClick={downloadPng} className="btn">📷 Save image (for WhatsApp)</button>
      <button onClick={() => window.print()} className="btn-secondary">🖨 Print / PDF</button>
    </div>
  );
}
