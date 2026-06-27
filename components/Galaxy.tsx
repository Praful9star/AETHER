"use client";

import { useRef, useMemo, useEffect, useLayoutEffect } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "../lib/shaders";
import { generateForm, FormType, N } from "../lib/forms";

function hexToVec3(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

interface GalaxyProps {
  form: FormType;
  palette: [string, string, string];
  energy: number;
  particleCount?: number;
}

export default function Galaxy({ form, palette, energy, particleCount = N }: GalaxyProps) {
  const count = particleCount;
  const meshRef = useRef<THREE.Points>(null);
  const geoRef = useRef<THREE.BufferGeometry>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const { positions, randArr, tArr } = useMemo(() => {
    const pos = generateForm("spiral", count);
    const rand = new Float32Array(count);
    const t = new Float32Array(count);
    for (let i = 0; i < count; i++) {
      rand[i] = Math.random();
      t[i] = Math.random();
    }
    return { positions: pos, randArr: rand, tArr: t };
  }, [count]);

  const fromRef = useRef<Float32Array>(positions.slice());
  const toRef = useRef<Float32Array>(positions.slice());
  const mixProgressRef = useRef(1);
  const prevFormRef = useRef<FormType>("spiral");

  useLayoutEffect(() => {
    const geo = geoRef.current;
    if (!geo) return;
    geo.setAttribute("position", new THREE.BufferAttribute(positions, 3));
    geo.setAttribute("aFrom", new THREE.BufferAttribute(fromRef.current, 3));
    geo.setAttribute("aTo", new THREE.BufferAttribute(toRef.current, 3));
    geo.setAttribute("aRand", new THREE.BufferAttribute(randArr, 1));
    geo.setAttribute("aT", new THREE.BufferAttribute(tArr, 1));
  }, [positions, randArr, tArr]);

  useEffect(() => {
    if (form === prevFormRef.current) return;
    prevFormRef.current = form;

    const geo = geoRef.current;
    if (!geo) return;

    const currentMix = mixProgressRef.current;
    const currentFrom = fromRef.current;
    const currentTo = toRef.current;
    const snapped = new Float32Array(count * 3);
    for (let i = 0; i < count * 3; i++) {
      const t = Math.min(1, currentMix);
      snapped[i] = currentFrom[i] + (currentTo[i] - currentFrom[i]) * t;
    }
    fromRef.current = snapped;
    toRef.current = generateForm(form, count);
    mixProgressRef.current = 0;

    const fromAttr = geo.getAttribute("aFrom") as THREE.BufferAttribute;
    const toAttr = geo.getAttribute("aTo") as THREE.BufferAttribute;
    if (fromAttr) { fromAttr.array.set(fromRef.current); fromAttr.needsUpdate = true; }
    if (toAttr) { toAttr.array.set(toRef.current); toAttr.needsUpdate = true; }
  }, [form, count]);

  useEffect(() => {
    if (!materialRef.current) return;
    const [c0, c1, c2] = palette.map(hexToVec3);
    materialRef.current.uniforms.uC0.value.set(...c0);
    materialRef.current.uniforms.uC1.value.set(...c1);
    materialRef.current.uniforms.uC2.value.set(...c2);
  }, [palette]);

  useEffect(() => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uEnergy.value = energy;
  }, [energy]);

  const uniforms = useMemo(() => {
    const [c0, c1, c2] = palette.map(hexToVec3);
    return {
      uMix: { value: 1.0 },
      uTime: { value: 0 },
      uEnergy: { value: energy },
      uSize: { value: 1.5 },
      uC0: { value: new THREE.Color(...c0) },
      uC1: { value: new THREE.Color(...c1) },
      uC2: { value: new THREE.Color(...c2) },
    };
  }, []); // eslint-disable-line react-hooks/exhaustive-deps

  useFrame(({ clock }) => {
    if (!materialRef.current) return;
    materialRef.current.uniforms.uTime.value = clock.getElapsedTime();
    if (mixProgressRef.current < 1) {
      mixProgressRef.current = Math.min(1, mixProgressRef.current + 0.008);
      materialRef.current.uniforms.uMix.value = mixProgressRef.current;
    }
  });

  return (
    <points ref={meshRef}>
      <bufferGeometry ref={geoRef} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={vertexShader}
        fragmentShader={fragmentShader}
        uniforms={uniforms}
        blending={THREE.AdditiveBlending}
        depthWrite={false}
        transparent={true}
      />
    </points>
  );
}
