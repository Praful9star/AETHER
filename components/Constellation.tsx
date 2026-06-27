"use client";

import { motion, AnimatePresence } from "framer-motion";
import { useAetherStore, Star } from "../lib/store";
import { useState } from "react";

interface ConstellationProps {
  onSelectStar: (star: Star) => void;
}

export default function Constellation({ onSelectStar }: ConstellationProps) {
  const { stars, activeStarId } = useAetherStore();
  const [open, setOpen] = useState(false);

  if (stars.length === 0) return null;

  return (
    <div className="absolute top-20 right-4 z-10">
      <button
        onClick={() => setOpen((v) => !v)}
        className="text-white/30 hover:text-white/70 transition-colors text-xs tracking-widest"
        aria-label="Toggle memory stars"
      >
        ✦ {stars.length} MEMORIES
      </button>

      <AnimatePresence>
        {open && (
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: 20 }}
            className="mt-3 w-64 bg-black/60 border border-white/10 rounded-xl backdrop-blur-sm overflow-hidden"
          >
            <div className="max-h-80 overflow-y-auto">
              {stars.map((star) => (
                <button
                  key={star.id}
                  onClick={() => {
                    onSelectStar(star);
                    setOpen(false);
                  }}
                  className={`w-full text-left px-4 py-3 border-b border-white/5 hover:bg-white/5 transition-colors ${
                    star.id === activeStarId ? "bg-white/10" : ""
                  }`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    <span
                      className="w-2 h-2 rounded-full flex-shrink-0"
                      style={{ backgroundColor: star.palette[2] }}
                    />
                    <span className="text-white/40 text-xs capitalize">{star.form}</span>
                  </div>
                  <p
                    className="text-white/70 text-xs leading-relaxed line-clamp-2"
                    style={{ fontFamily: "serif", fontStyle: "italic" }}
                  >
                    {star.whisper}
                  </p>
                  <p className="text-white/20 text-xs mt-1 line-clamp-1">
                    {star.thought}
                  </p>
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
