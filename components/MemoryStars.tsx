"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { Star, useAetherStore } from "../lib/store";

interface MemoryStarsProps {
  stars: Star[];
  onClickStar: (star: Star) => void;
}

export default function MemoryStars({ stars, onClickStar }: MemoryStarsProps) {
  const groupRef = useRef<THREE.Group>(null);
  const activeStarId = useAetherStore((s) => s.activeStarId);

  useFrame(({ clock }) => {
    if (!groupRef.current) return;
    const t = clock.getElapsedTime();
    groupRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.material instanceof THREE.MeshBasicMaterial) {
        mesh.material.opacity = 0.6 + Math.sin(t * 1.5 + i * 0.9) * 0.4;
      }
      child.rotation.y = t * 0.3 + i;
    });
  });

  return (
    <group ref={groupRef}>
      {stars.map((star, i) => {
        const pos = star.pos ?? [
          Math.sin(i * 2.39996) * (15 + i * 0.5),
          (Math.random() - 0.5) * 10,
          Math.cos(i * 2.39996) * (15 + i * 0.5),
        ];
        const color = star.palette[2] ?? "#ffffff";
        const isActive = star.id === activeStarId;

        return (
          <mesh
            key={star.id}
            position={pos as [number, number, number]}
            onClick={(e) => {
              e.stopPropagation();
              onClickStar(star);
            }}
          >
            <sphereGeometry args={[isActive ? 0.35 : 0.2, 8, 8]} />
            <meshBasicMaterial
              color={color}
              transparent
              opacity={0.8}
              blending={THREE.AdditiveBlending}
              depthWrite={false}
            />
          </mesh>
        );
      })}
    </group>
  );
}
