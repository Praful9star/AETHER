"use client";

import { Suspense, lazy, useState } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import Galaxy from "./Galaxy";
import MemoryStars from "./MemoryStars";
import MobileCanvas from "./MobileCanvas";
import { useAetherStore, Star } from "../lib/store";
import { N } from "../lib/forms";

const DesktopBloom = lazy(() => import("./DesktopBloom"));

interface CosmosProps {
  onStarClick: (star: Star) => void;
}

function detectMobile() {
  if (typeof window === "undefined") return false;
  return window.innerWidth <= 1024 && navigator.maxTouchPoints > 0;
}

export default function Cosmos({ onStarClick }: CosmosProps) {
  const { form, palette, energy, stars } = useAetherStore();
  const [isMobile] = useState(detectMobile);

  if (isMobile) {
    return <MobileCanvas form={form} palette={palette} energy={energy} />;
  }

  return (
    <Canvas
      style={{ background: "#050308", width: "100%", height: "100%" }}
      camera={{ position: [0, 10, 40], fov: 60, near: 0.1, far: 1000 }}
      gl={{
        antialias: false,
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
    >
      <Suspense fallback={null}>
        <Galaxy form={form} palette={palette} energy={energy} particleCount={N} />
        <MemoryStars stars={stars} onClickStar={onStarClick} />
        <DesktopBloom />
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
