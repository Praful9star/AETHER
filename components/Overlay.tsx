"use client";

import { useState, useRef } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useAetherStore } from "../lib/store";
import { initAudio, playWhisperChord, setAudioEnergy } from "../lib/audio";
import { FormType } from "../lib/forms";

const FALLBACK_PALETTES: Record<string, [string, string, string]> = {
  spiral: ["#0d0221", "#4c1d95", "#a78bfa"],
  sphere: ["#031220", "#164e63", "#67e8f9"],
  nebula: ["#1a0a2e", "#7c3aed", "#f0abfc"],
  vortex: ["#100b00", "#78350f", "#fbbf24"],
};

function hashString(s: string): number {
  let h = 0;
  for (let i = 0; i < s.length; i++) h = (Math.imul(31, h) + s.charCodeAt(i)) >>> 0;
  return h;
}

function fallback(thought: string) {
  const forms: FormType[] = ["spiral", "sphere", "nebula", "vortex"];
  const form = forms[hashString(thought) % 4];
  return {
    whisper: "In the quiet between stars, your thought becomes light.",
    palette: FALLBACK_PALETTES[form],
    form,
    energy: ((hashString(thought) % 100) / 100) * 0.7 + 0.2,
  };
}

export default function Overlay() {
  const [input, setInput] = useState("");
  const { whisper, isLoading, soundEnabled, setCosmosState, setSoundEnabled } =
    useAetherStore();
  const inputRef = useRef<HTMLTextAreaElement>(null);
  const audioReady = useRef(false);

  const enableSound = async () => {
    if (audioReady.current) return;
    audioReady.current = true;
    await initAudio();
    setSoundEnabled(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!input.trim() || isLoading) return;

    await enableSound();
    setCosmosState({ isLoading: true, thought: input });

    try {
      const res = await fetch("/api/whisper", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ thought: input }),
      });

      let data: any;
      if (!res.ok) throw new Error("API error");
      data = await res.json();

      setCosmosState({
        whisper: data.whisper,
        palette: data.palette as [string, string, string],
        form: data.form as FormType,
        energy: data.energy,
        isLoading: false,
      });

      if (soundEnabled || audioReady.current) {
        await setAudioEnergy(data.energy);
        await playWhisperChord(data.energy);
      }

      fetch("/api/save", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...data, thought: input }),
      }).catch(() => {});
    } catch {
      const fb = fallback(input);
      setCosmosState({ ...fb, isLoading: false });
    }

    setInput("");
  };

  return (
    <div
      className="absolute inset-0 pointer-events-none flex flex-col"
      onClick={enableSound}
    >
      <div className="pointer-events-none flex items-center justify-between p-6">
        <div>
          <h1
            className="text-2xl font-light tracking-[0.3em] text-white/70"
            style={{ fontFamily: "serif" }}
          >
            AETHER
          </h1>
          <p className="text-xs tracking-[0.2em] text-white/30 mt-0.5">
            A WHISPER TO THE VOID
          </p>
        </div>

        <button
          className="pointer-events-auto text-white/30 hover:text-white/70 transition-colors text-xs tracking-widest"
          onClick={(e) => {
            e.stopPropagation();
            enableSound();
          }}
        >
          {soundEnabled ? "◎ SOUND" : "○ SOUND"}
        </button>
      </div>

      <div className="flex-1 flex items-center justify-center px-8">
        <AnimatePresence mode="wait">
          {whisper && (
            <motion.p
              key={whisper}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -20 }}
              transition={{ duration: 1.5, ease: "easeInOut" }}
              className="text-center text-white/80 text-lg md:text-2xl leading-relaxed max-w-2xl"
              style={{ fontFamily: "'Georgia', serif", fontStyle: "italic" }}
            >
              &ldquo;{whisper}&rdquo;
            </motion.p>
          )}
        </AnimatePresence>
      </div>

      <AnimatePresence>
        {isLoading && (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="absolute inset-0 flex items-center justify-center pointer-events-none"
          >
            <div className="flex gap-1">
              {[0, 1, 2].map((i) => (
                <motion.div
                  key={i}
                  className="w-1.5 h-1.5 rounded-full bg-white/50"
                  animate={{ scale: [1, 1.5, 1], opacity: [0.3, 1, 0.3] }}
                  transition={{ duration: 1.2, repeat: Infinity, delay: i * 0.2 }}
                />
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <div className="pointer-events-auto px-6 pb-8">
        <form onSubmit={handleSubmit} className="relative max-w-xl mx-auto">
          <textarea
            ref={inputRef}
            value={input}
            onChange={(e) => setInput(e.target.value)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && !e.shiftKey) {
                e.preventDefault();
                handleSubmit(e as any);
              }
            }}
            placeholder="Whisper a thought to the cosmos…"
            rows={1}
            disabled={isLoading}
            className="w-full bg-white/5 border border-white/10 rounded-xl px-5 py-3.5 text-white/80 placeholder-white/20 text-sm tracking-wide resize-none focus:outline-none focus:border-white/30 transition-all backdrop-blur-sm"
            style={{ fontFamily: "serif" }}
            aria-label="Whisper to the cosmos"
          />
          <button
            type="submit"
            disabled={!input.trim() || isLoading}
            className="absolute right-3 top-1/2 -translate-y-1/2 text-white/30 hover:text-white/70 disabled:opacity-20 transition-colors text-lg"
            aria-label="Send whisper"
          >
            ↑
          </button>
        </form>
        <p className="text-center text-white/15 text-xs mt-3 tracking-widest">
          PRESS ENTER TO WHISPER
        </p>
      </div>
    </div>
  );
}
