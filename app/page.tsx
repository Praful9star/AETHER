"use client";

import dynamic from "next/dynamic";

const AetherCanvas = dynamic(() => import("../components/AetherCanvas"), { ssr: false });

export default function Home() {
  return (
    <main style={{ position: "fixed", inset: 0, overflow: "hidden" }}>
      <AetherCanvas />
    </main>
  );
}
