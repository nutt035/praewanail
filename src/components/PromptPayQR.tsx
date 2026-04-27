"use client";

import { QRCodeSVG } from "qrcode.react";
import { generatePromptPayPayload } from "@/lib/promptpay";
import { Banknote, Download } from "lucide-react";
import { useRef } from "react";

interface PromptPayQRProps {
  id: string; // PromptPay ID (Phone or ID card)
  amount?: number;
  label?: string;
  className?: string;
}

export default function PromptPayQR({ id, amount, label, className }: PromptPayQRProps) {
  const qrRef = useRef<SVGSVGElement>(null);

  if (!id) return null;

  const payload = generatePromptPayPayload(id, amount);

  const downloadQR = () => {
    const svg = qrRef.current;
    if (!svg) return;

    const svgData = new XMLSerializer().serializeToString(svg);
    const canvas = document.createElement("canvas");
    const ctx = canvas.getContext("2d");
    const img = new Image();

    img.onload = () => {
      canvas.width = img.width + 40;
      canvas.height = img.height + 100;
      if (ctx) {
        // Background
        ctx.fillStyle = "white";
        ctx.fillRect(0, 0, canvas.width, canvas.height);
        
        // Draw Image
        ctx.drawImage(img, 20, 20);
        
        // Text
        ctx.fillStyle = "#1e293b";
        ctx.font = "bold 16px sans-serif";
        ctx.textAlign = "center";
        ctx.fillText(amount ? `฿${amount.toLocaleString()}` : "สแกนจ่าย", canvas.width / 2, img.height + 50);
        ctx.font = "12px sans-serif";
        ctx.fillStyle = "#64748b";
        ctx.fillText(id, canvas.width / 2, img.height + 75);
      }
      
      const pngFile = canvas.toDataURL("image/png");
      const downloadLink = document.createElement("a");
      downloadLink.download = `PromptPay-${amount || "QR"}.png`;
      downloadLink.href = pngFile;
      downloadLink.click();
    };

    img.src = "data:image/svg+xml;base64," + btoa(unescape(encodeURIComponent(svgData)));
  };

  return (
    <div className={`flex flex-col items-center p-4 bg-white rounded-2xl border border-pink-100 shadow-sm ${className}`}>
      <div className="flex items-center gap-2 mb-3">
        <div className="w-8 h-8 rounded-full bg-blue-500 flex items-center justify-center text-white">
          <Banknote size={16} />
        </div>
        <p className="text-sm font-bold text-slate-700">{label || "PromptPay QR"}</p>
      </div>

      <div className="bg-white p-2 rounded-xl border border-slate-50 mb-3">
        <QRCodeSVG
          ref={qrRef}
          value={payload}
          size={180}
          level="M"
          includeMargin={true}
        />
      </div>

      <div className="text-center mb-3">
        {amount && (
          <p className="text-xl font-bold text-brand-dark">฿{amount.toLocaleString()}</p>
        )}
        <p className="text-xs text-slate-400 font-mono">{id}</p>
      </div>

      <button
        onClick={downloadQR}
        className="flex items-center gap-2 px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 text-xs font-semibold rounded-xl transition-all"
      >
        <Download size={14} />
        บันทึกรูป QR
      </button>
    </div>
  );
}
