"use client";

import { useRef, useEffect, useCallback } from "react";
import dynamic from "next/dynamic";
import { useAetherStore, Star } from "../lib/store";
import Overlay from "../components/Overlay";
import Constellation from "../components/Constellation";
import CaptureModal from "../components/CaptureModal";

const Cosmos = dynamic(() => import("../components/Cosmos"), { ssr: false });

export default function Home() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const { setCosmosState, setStars } = useAetherStore();

  useEffect(() => {
    const userId = getOrCreateUserId();
    loadStars(userId).then(setStars);
  }, [setStars]);

  const handleStarClick = useCallback(
    (star: Star) => {
      setCosmosState({
        palette: star.palette,
        form: star.form,
        energy: star.energy,
        whisper: star.whisper,
        thought: star.thought,
        activeStarId: star.id,
      });
    },
    [setCosmosState]
  );

  return (
    <main
      className="relative w-screen h-screen overflow-hidden bg-[#050308]"
      style={{ touchAction: "none" }}
    >
      <div className="absolute inset-0">
        <Cosmos ref={canvasRef} onStarClick={handleStarClick} />
      </div>

      <Overlay />
      <Constellation onSelectStar={handleStarClick} />
      <CaptureModal canvasRef={canvasRef} />

      <a
        href="/void"
        className="absolute bottom-6 left-6 text-white/15 hover:text-white/40 transition-colors text-xs tracking-widest"
      >
        ∞ THE VOID
      </a>
    </main>
  );
}

function getOrCreateUserId(): string {
  if (typeof window === "undefined") return "anon";
  let id = localStorage.getItem("aether_user_id");
  if (!id) {
    id = crypto.randomUUID();
    localStorage.setItem("aether_user_id", id);
  }
  return id;
}

async function loadStars(userId: string): Promise<Star[]> {
  try {
    const res = await fetch(`/api/stars?user_id=${encodeURIComponent(userId)}`);
    if (!res.ok) return [];
    return await res.json();
  } catch {
    return [];
  }
}
