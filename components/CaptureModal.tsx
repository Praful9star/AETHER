"use client";

import { useCallback } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAetherStore } from "../lib/store";

interface CaptureModalProps {
  canvasRef: React.RefObject<HTMLCanvasElement>;
}

export default function CaptureModal({ canvasRef }: CaptureModalProps) {
  const { captureModalOpen, setCaptureModalOpen, whisper, thought, form } =
    useAetherStore();

  const handleCapture = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const out = document.createElement("canvas");
    out.width = 1080;
    out.height = 1920;
    const ctx = out.getContext("2d");
    if (!ctx) return;

    ctx.fillStyle = "#050308";
    ctx.fillRect(0, 0, 1080, 1920);

    const aspect = canvas.width / canvas.height;
    let dw = 1080, dh = 1080 / aspect;
    if (dh > 1600) { dh = 1600; dw = dh * aspect; }
    const dx = (1080 - dw) / 2;
    const dy = (1920 - dh) / 2;
    ctx.drawImage(canvas, dx, dy, dw, dh);

    ctx.fillStyle = "rgba(255,255,255,0.4)";
    ctx.font = "32px serif";
    ctx.textAlign = "center";
    ctx.fillText("A WHISPER TO THE VOID", 540, 100);

    ctx.fillStyle = "rgba(255,255,255,0.8)";
    ctx.font = "bold 60px serif";
    ctx.fillText("AETHER", 540, 160);

    if (whisper) {
      ctx.fillStyle = "rgba(255,255,255,0.75)";
      ctx.font = "italic 36px Georgia, serif";
      const words = whisper.split(" ");
      const lines: string[] = [];
      let line = "";
      for (const word of words) {
        const test = line ? `${line} ${word}` : word;
        if (ctx.measureText(`"${test}"`).width > 940) {
          lines.push(line);
          line = word;
        } else {
          line = test;
        }
      }
      if (line) lines.push(line);
      const lineH = 50;
      const startY = 1920 - 200 - lines.length * lineH;
      lines.forEach((l, i) => {
        ctx.fillText(i === 0 ? `"${l}` : i === lines.length - 1 ? `${l}"` : l, 540, startY + i * lineH);
      });
    }

    ctx.fillStyle = "rgba(255,255,255,0.2)";
    ctx.font = "24px monospace";
    ctx.fillText(form.toUpperCase(), 540, 1880);

    const link = document.createElement("a");
    link.download = `aether-${Date.now()}.png`;
    link.href = out.toDataURL("image/png");
    link.click();
  }, [canvasRef, whisper, thought, form]);

  return (
    <>
      <button
        onClick={() => setCaptureModalOpen(true)}
        className="absolute bottom-24 right-6 text-white/30 hover:text-white/70 transition-colors text-xs tracking-widest"
        aria-label="Capture cosmos"
      >
        ⬡ CAPTURE
      </button>

      <AnimatePresence>
        {captureModalOpen && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 bg-black/70 flex items-center justify-center z-50 backdrop-blur-sm"
            onClick={() => setCaptureModalOpen(false)}
          >
            <motion.div
              initial={{ scale: 0.9, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              exit={{ scale: 0.9, opacity: 0 }}
              onClick={(e) => e.stopPropagation()}
              className="bg-black/80 border border-white/10 rounded-2xl p-8 max-w-sm w-full mx-4"
            >
              <h2
                className="text-white/80 text-lg tracking-widest mb-2"
                style={{ fontFamily: "serif" }}
              >
                CAPTURE THE COSMOS
              </h2>
              <p className="text-white/30 text-sm mb-6">
                Download a 1080×1920 portrait of this moment.
              </p>

              {whisper && (
                <p
                  className="text-white/50 text-sm italic mb-6 leading-relaxed"
                  style={{ fontFamily: "Georgia, serif" }}
                >
                  &ldquo;{whisper}&rdquo;
                </p>
              )}

              <div className="flex gap-3">
                <button
                  onClick={handleCapture}
                  className="flex-1 bg-white/10 hover:bg-white/20 text-white/80 rounded-xl py-3 text-sm tracking-widest transition-colors"
                >
                  DOWNLOAD
                </button>
                <button
                  onClick={() => setCaptureModalOpen(false)}
                  className="px-4 text-white/30 hover:text-white/60 transition-colors text-sm"
                >
                  ✕
                </button>
              </div>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
