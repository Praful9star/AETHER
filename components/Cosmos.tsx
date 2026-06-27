"use client";

import { Suspense, Component, ReactNode } from "react";
import { Canvas } from "@react-three/fiber";
import { OrbitControls } from "@react-three/drei";
import { EffectComposer, Bloom } from "@react-three/postprocessing";
import Galaxy from "./Galaxy";
import MemoryStars from "./MemoryStars";
import { useAetherStore, Star } from "../lib/store";
import { N } from "../lib/forms";

interface CosmosProps {
  onStarClick: (star: Star) => void;
}

class PostProcessingBoundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
  constructor(props: { children: ReactNode }) {
    super(props);
    this.state = { crashed: false };
  }
  static getDerivedStateFromError() {
    return { crashed: true };
  }
  render() {
    if (this.state.crashed) return null;
    return this.props.children;
  }
}

function getDeviceProfile() {
  if (typeof window === "undefined") return { isMobile: false, hasWebGL2: true, noWebGLReason: "" };
  const isMobile = window.innerWidth <= 768 && navigator.maxTouchPoints > 0;
  try {
    const testCanvas = document.createElement("canvas");
    const gl = testCanvas.getContext("webgl2");
    if (!gl) return { isMobile, hasWebGL2: false, noWebGLReason: "webgl2 context returned null" };
    return { isMobile, hasWebGL2: true, noWebGLReason: "" };
  } catch (e: unknown) {
    const msg = e instanceof Error ? e.message : "webgl2 check threw";
    return { isMobile, hasWebGL2: false, noWebGLReason: msg };
  }
}

export default function Cosmos({ onStarClick }: CosmosProps) {
  const { form, palette, energy, stars } = useAetherStore();
  const { isMobile, hasWebGL2, noWebGLReason } = getDeviceProfile();

  if (!hasWebGL2) {
    return (
      <div className="absolute inset-0 flex flex-col items-center justify-center bg-[#050308] gap-2">
        <p className="text-white/20 text-xs tracking-widest">THE COSMOS IS RESTING</p>
        <p className="text-red-400/40 text-xs text-center px-4">WebGL2 unavailable: {noWebGLReason}</p>
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
        powerPreference: "high-performance",
        preserveDrawingBuffer: true,
      }}
    >
      <Suspense fallback={null}>
        <Galaxy form={form} palette={palette} energy={energy} particleCount={particleCount} />
        <MemoryStars stars={stars} onClickStar={onStarClick} />

        {!isMobile && (
          <PostProcessingBoundary>
            <EffectComposer>
              <Bloom
                intensity={1.5}
                luminanceThreshold={0.1}
                luminanceSmoothing={0.9}
                mipmapBlur
              />
            </EffectComposer>
          </PostProcessingBoundary>
        )}

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
