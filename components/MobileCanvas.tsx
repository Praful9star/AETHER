"use client";

import { useEffect, useRef } from "react";
import * as THREE from "three";
import { vertexShader, fragmentShader } from "../lib/shaders";
import { generateForm, FormType } from "../lib/forms";

const MOBILE_N = 60_000;

interface MobileCanvasProps {
  form: FormType;
  palette: [string, string, string];
  energy: number;
}

function hexToVec3(hex: string): [number, number, number] {
  const c = new THREE.Color(hex);
  return [c.r, c.g, c.b];
}

export default function MobileCanvas({ form, palette, energy }: MobileCanvasProps) {
  const mountRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const mount = mountRef.current;
    if (!mount) return;

    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({
        antialias: false,
        powerPreference: "default",
        preserveDrawingBuffer: true,
      });
    } catch {
      return;
    }

    renderer.setSize(mount.clientWidth, mount.clientHeight);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    mount.appendChild(renderer.domElement);

    const scene = new THREE.Scene();
    scene.background = new THREE.Color(0x050308);
    const camera = new THREE.PerspectiveCamera(
      60,
      mount.clientWidth / mount.clientHeight,
      0.1,
      1000
    );
    camera.position.set(0, 10, 40);

    const positions = generateForm(form, MOBILE_N);
    const rand = new Float32Array(MOBILE_N);
    const tArr = new Float32Array(MOBILE_N);
    for (let i = 0; i < MOBILE_N; i++) {
      rand[i] = Math.random();
      tArr[i] = Math.random();
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.BufferAttribute(positions.slice(), 3));
    geo.setAttribute("aFrom", new THREE.BufferAttribute(positions.slice(), 3));
    geo.setAttribute("aTo", new THREE.BufferAttribute(positions.slice(), 3));
    geo.setAttribute("aRand", new THREE.BufferAttribute(rand, 1));
    geo.setAttribute("aT", new THREE.BufferAttribute(tArr, 1));

    const [r0, g0, b0] = hexToVec3(palette[0]);
    const [r1, g1, b1] = hexToVec3(palette[1]);
    const [r2, g2, b2] = hexToVec3(palette[2]);

    const mat = new THREE.ShaderMaterial({
      vertexShader,
      fragmentShader,
      uniforms: {
        uMix: { value: 1.0 },
        uTime: { value: 0 },
        uEnergy: { value: energy },
        uSize: { value: 2.0 },
        uC0: { value: new THREE.Vector3(r0, g0, b0) },
        uC1: { value: new THREE.Vector3(r1, g1, b1) },
        uC2: { value: new THREE.Vector3(r2, g2, b2) },
      },
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      transparent: true,
    });

    const points = new THREE.Points(geo, mat);
    scene.add(points);

    let animId: number;
    const clock = new THREE.Clock();
    let rotY = 0;
    let rotX = 0;
    let isDragging = false;
    let prevX = 0;
    let prevY = 0;

    function animate() {
      animId = requestAnimationFrame(animate);
      mat.uniforms.uTime.value = clock.getElapsedTime();
      if (!isDragging) rotY += 0.0008;
      scene.rotation.y = rotY;
      scene.rotation.x = rotX;
      renderer.render(scene, camera);
    }
    animate();

    function onTouchStart(e: TouchEvent) {
      isDragging = true;
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    }
    function onTouchMove(e: TouchEvent) {
      if (!isDragging) return;
      const dx = e.touches[0].clientX - prevX;
      const dy = e.touches[0].clientY - prevY;
      rotY += dx * 0.005;
      rotX += dy * 0.003;
      rotX = Math.max(-Math.PI / 4, Math.min(Math.PI / 4, rotX));
      prevX = e.touches[0].clientX;
      prevY = e.touches[0].clientY;
    }
    function onTouchEnd() {
      isDragging = false;
    }

    mount.addEventListener("touchstart", onTouchStart, { passive: true });
    mount.addEventListener("touchmove", onTouchMove, { passive: true });
    mount.addEventListener("touchend", onTouchEnd);

    function onResize() {
      if (!mount) return;
      camera.aspect = mount.clientWidth / mount.clientHeight;
      camera.updateProjectionMatrix();
      renderer.setSize(mount.clientWidth, mount.clientHeight);
    }
    window.addEventListener("resize", onResize);

    return () => {
      cancelAnimationFrame(animId);
      window.removeEventListener("resize", onResize);
      mount.removeEventListener("touchstart", onTouchStart);
      mount.removeEventListener("touchmove", onTouchMove);
      mount.removeEventListener("touchend", onTouchEnd);
      renderer.dispose();
      geo.dispose();
      mat.dispose();
      if (mount.contains(renderer.domElement)) {
        mount.removeChild(renderer.domElement);
      }
    };
  }, [form, palette, energy]);

  return (
    <div
      ref={mountRef}
      style={{
        width: "100%",
        height: "100%",
        background: "#050308",
        touchAction: "none",
      }}
    />
  );
}
