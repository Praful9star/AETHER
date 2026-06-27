"use client";

import { Suspense, lazy, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Galaxy from "./Galaxy";
import MemoryStars from "./MemoryStars";
import { useAetherStore, Star } from "../lib/store";
import { N } from "../lib/forms";

// Lazy-load postprocessing so its module code never runs on mobile
const DesktopBloom = lazy(() => import("./DesktopBloom"));

interface CosmosProps {
  onStarClick: (star: Star) => void;
}

function detectDevice() {
  if (typeof window === "undefined") return { isMobile: false, hasWebGL2: true, reason: "" };
  const isMobile = window.innerWidth <= 768 && navigator.maxTouchPoints > 0;
  try {
    const c = document.createElement("canvas");
    const gl = c.getContext("webgl2");
    // Release context immediately to avoid hitting browser limit
    if (gl) {
      const ext = gl.getExtension("WEBGL_lose_context");
      ext?.loseContext();
    }
    if (!gl) return { isMobile, hasWebGL2: false, reason: "webgl2 context null" };
    return { isMobile, hasWebGL2: true, reason: "" };
  } catch (e: unknown) {
    return { isMobile, hasWebGL2: false, reason: e instanceof Error ? e.message : "webgl2 threw" };
  }
}

export default function Cosmos({ onStarClick }: CosmosProps) {
  const { form, palette, energy, stars } = useAetherStore();
  // Run device detection only once (lazy useState init)
  const [{ isMobile, hasWebGL2, reason }] = useState(detectDevice);

  if (!hasWebGL2) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050308] gap-2">
        <p className="text-white/20 text-xs tracking-widest">THE COSMOS IS RESTING</p>
        <p className="text-red-400/40 text-xs text-center px-4">{reason}</p>
      </div>
    );
  }

  const particleCount = isMobile ? 60_000 : N;

  return (
    <Canvas
      style={{ background: "#050308", width: "100%", height: "100%" }}
      camera={{ position: [0, 10, 40], fov: 60, near: 0.1, far: 1000 }}
      gl={{
        antialias: false,
        powerPreference: isMobile ? "default" : "high-performance",
        preserveDrawingBuffer: true,
      }}
    >
      <Suspense fallback={null}>
        <Galaxy form={form} palette={palette} energy={energy} particleCount={particleCount} />
        <MemoryStars stars={stars} onClickStar={onStarClick} />
        {!isMobile && <DesktopBloom />}
        <OrbitControls
          enableDamping
          dampingFactor={0.05}
          autoRotate
          autoRotateSpeed={0.3}
          enablePan={false}
          minDistance={5}
          maxDistance={80}
        />
      </Suspense>
    </Canvas>
  );
}
