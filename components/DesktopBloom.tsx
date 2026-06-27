"use client";

import { Component, ReactNode } from "react";
import { EffectComposer, Bloom } from "@react-three/postprocessing";

class Boundary extends Component<{ children: ReactNode }, { crashed: boolean }> {
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

export default function DesktopBloom() {
  return (
    <Boundary>
      <EffectComposer>
        <Bloom
          intensity={1.5}
          luminanceThreshold={0.1}
          luminanceSmoothing={0.9}
          mipmapBlur
        />
      </EffectComposer>
    </Boundary>
  );
}
