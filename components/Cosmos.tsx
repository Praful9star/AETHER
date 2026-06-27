"use client";

import { Component, Suspense, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Galaxy from "./Galaxy";
import MemoryStars from "./MemoryStars";
import { useAetherStore, Star } from "../lib/store";
import { N } from "../lib/forms";

class PostProcessingBoundary extends Component<
  { children: ReactNode },
  { failed: boolean }
> {
  state = { failed: false };
  static getDerivedStateFromError() { return { failed: true }; }
  render() {
    return this.state.failed ? null : this.props.children;
  }
}

function getDeviceProfile() {
  if (typeof window === "undefined") return { isMobile: false };
  const isMobile = window.innerWidth <= 768 && navigator.maxTouchPoints > 0;
  return { isMobile };
}

interface CosmosProps {
  onStarClick: (star: Star) => void;
}

export default function Cosmos({ onStarClick }: CosmosProps) {
  const { form, palette, energy, stars } = useAetherStore();
  const { isMobile } = getDeviceProfile();
  const particleCount = isMobile ? 60_000 : N;

  return (
    <Canvas
      style={{ background: "#050308", width: "100%", height: "100%" }}
      camera={{ position: [0, 10, 40], fov: 60, near: 0.1, far: 1000 }}
      gl={{ antialias: false, powerPreference: "high-performance", preserveDrawingBuffer: true }}
    >
      <Suspense fallback={null}>
        <Galaxy form={form} palette={palette} energy={energy} particleCount={particleCount} />
        <MemoryStars stars={stars} onClickStar={onStarClick} />

        {!isMobile && (
          <PostProcessingBoundary>
            <EffectComposer>
              <Bloom intensity={1.5} luminanceThreshold={0.1} luminanceSmoothing={0.9} mipmapBlur />
            </EffectComposer>
          </PostProcessingBoundary>
        )}

        <OrbitControls
          enableDamping dampingFactor={0.05}
          autoRotate autoRotateSpeed={0.3}
          enablePan={false} minDistance={5} maxDistance={80}
        />
      </Suspense>
    </Canvas>
  );
}
