"use client";

import { useRef, useEffect, useState, useCallback } from "react";
import * as THREE from "three";
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from "three/examples/jsm/postprocessing/RenderPass.js";
import { UnrealBloomPass } from "three/examples/jsm/postprocessing/UnrealBloomPass.js";
import { AfterimagePass } from "three/examples/jsm/postprocessing/AfterimagePass.js";
import { ShaderPass } from "three/examples/jsm/postprocessing/ShaderPass.js";
import { motion, AnimatePresence } from "framer-motion";

// ─── Constants ────────────────────────────────────────────────────────────────

const BG_STARS = 1400;
const CAP = 120;
const MAXR = 38;
const IDLE_SAVER = 60000;

const FORMS = [
  "spiral", "barred", "elliptical", "ring", "merger",
  "quasar", "supernova", "filament", "hourglass", "tidal",
  "irregular", "lenticular", "sphere", "nebula", "vortex",
  "polar_ring", "cartwheel", "starburst", "jellyfish", "shell",
  "accretion", "pulsar", "void", "magnetar", "einstein",
  "relic", "lorenz", "cymatics", "plasma", "protostar",
] as const;
type FormType = (typeof FORMS)[number];

const FORM_LABELS: Record<FormType, string> = {
  spiral:     "SPIRAL GALAXY",
  barred:     "BARRED SPIRAL",
  elliptical: "ELLIPTICAL GALAXY",
  ring:       "RING GALAXY",
  merger:     "GALAXY MERGER",
  quasar:     "ACTIVE QUASAR",
  supernova:  "SUPERNOVA REMNANT",
  filament:   "COSMIC FILAMENT",
  hourglass:  "HOURGLASS NEBULA",
  tidal:      "TIDAL STREAM",
  irregular:  "IRREGULAR GALAXY",
  lenticular: "LENTICULAR GALAXY",
  sphere:     "GLOBULAR CLUSTER",
  nebula:     "EMISSION NEBULA",
  vortex:     "COSMIC VORTEX",
  polar_ring: "POLAR RING GALAXY",
  cartwheel:  "CARTWHEEL GALAXY",
  starburst:  "STARBURST GALAXY",
  jellyfish:  "JELLYFISH GALAXY",
  shell:      "SHELL GALAXY",
  accretion:  "ACCRETION DISK",
  pulsar:     "PULSAR WIND NEBULA",
  void:       "COSMIC VOID",
  magnetar:   "MAGNETAR FIELD",
  einstein:   "EINSTEIN RING",
  relic:      "RELIC GALAXY",
  lorenz:     "LORENZ ATTRACTOR",
  cymatics:   "CHLADNI CYMATICS",
  plasma:     "PLASMA FILAMENT",
  protostar:  "PROTOSTELLAR DISK",
};

const FALLBACK_PALETTES: [string, string, string][] = [
  ["#050318", "#2d1b69", "#b892ff"],
  ["#150005", "#881133", "#ff4488"],
  ["#021510", "#0a6640", "#55ffaa"],
  ["#001025", "#004466", "#22aaee"],
  ["#100200", "#882200", "#ff7722"],
  ["#010108", "#100a45", "#4433ff"],
  ["#0d0600", "#774400", "#ffcc22"],
  ["#080010", "#550088", "#ee22ff"],
  ["#021010", "#006655", "#22ffee"],
  ["#0a0500", "#993300", "#ffaa00"],
  ["#050518", "#0a2266", "#4466ff"],
  ["#100011", "#660033", "#ff3388"],
  ["#001010", "#004444", "#00ffdd"],
  ["#080501", "#443300", "#ffaa22"],
  ["#050511", "#221166", "#aa88ff"],
];

const FALLBACK_LINES = [
  "Even a single thought bends the dark into light.",
  "What you wonder, the stars rearrange to answer.",
  "Every question is a seed of some unmade galaxy.",
  "The void was only waiting for you to say something.",
  "You are made of the same restless stuff as these suns.",
  "In the silence between heartbeats, galaxies are born.",
  "Your thought ripples outward across a billion light-years.",
  "Every whisper you speak becomes a constellation.",
  "The cosmos exhales, and your words become stars.",
  "You are the universe becoming aware of itself.",
];

// ─── Cinematic lens shader — gravitational warp, chromatic aberration, grain ──

const CinematicShader = {
  uniforms: {
    tDiffuse: { value: null as THREE.Texture|null },
    uTime:    { value: 0 },
    uWarp:    { value: 0 },
    uTod:     { value: 0 }, // -1 cold midnight … +1 warm golden hour
  },
  vertexShader: `
    varying vec2 vUv;
    void main(){ vUv=uv; gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.0); }`,
  fragmentShader: `
    uniform sampler2D tDiffuse;
    uniform float uTime;
    uniform float uWarp;
    uniform float uTod;
    varying vec2 vUv;
    void main(){
      vec2 c=vUv-0.5;
      float r=length(c);
      // gravitational lens pulse — space bends inward during morphs
      vec2 uv=vUv - c*(uWarp*0.30*exp(-r*3.5));
      // anamorphic chromatic aberration, stronger at frame edges
      float ca=0.0011*(0.4+r*2.4)+uWarp*0.005;
      vec2 dir=r>0.0001?c/r:vec2(0.0);
      float rr=texture2D(tDiffuse,uv+dir*ca).r;
      float gg=texture2D(tDiffuse,uv).g;
      float bb=texture2D(tDiffuse,uv-dir*ca).b;
      vec3 col=vec3(rr,gg,bb);
      // time-of-day grade — warm amber by day, cool indigo at night
      col.r*=1.0+uTod*0.06;
      col.b*=1.0-uTod*0.06;
      col.g*=1.0+uTod*0.015;
      // animated film grain
      float g=fract(sin(dot(vUv+fract(uTime)*vec2(1.7,9.1),vec2(12.9898,78.233)))*43758.5453);
      col+=(g-0.5)*0.028;
      // cinematic vignette
      col*=1.0-r*r*0.45;
      gl_FragColor=vec4(col,1.0);
    }`,
};

// ─── Utilities ────────────────────────────────────────────────────────────────

function hexToRGB(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [parseInt(h.slice(0,2),16)/255, parseInt(h.slice(2,4),16)/255, parseInt(h.slice(4,6),16)/255];
}

function lerp3(c0: number[], c1: number[], c2: number[], t: number): [number,number,number] {
  if (t < 0.5) { const k=t*2; return [c0[0]+(c1[0]-c0[0])*k, c0[1]+(c1[1]-c0[1])*k, c0[2]+(c1[2]-c0[2])*k]; }
  const k=(t-0.5)*2; return [c1[0]+(c2[0]-c1[0])*k, c1[1]+(c2[1]-c1[1])*k, c1[2]+(c2[2]-c1[2])*k];
}

function rn() { return (Math.random()+Math.random()+Math.random()-1.5)*0.9; }
function hashStr(s: string) { let h=0; for (let i=0;i<s.length;i++) h=(h*31+s.charCodeAt(i))|0; return Math.abs(h); }
function starPos(): [number,number,number] {
  const a=Math.random()*Math.PI*2, b=Math.acos(2*Math.random()-1), r=52+Math.random()*26;
  return [r*Math.sin(b)*Math.cos(a), r*Math.cos(b), r*Math.sin(b)*Math.sin(a)];
}

function getN(): number {
  if (typeof window==="undefined") return 8000;
  const ua=navigator.userAgent;
  const isMobile=/Android|iPhone|iPad|iPod/i.test(ua)||(navigator.maxTouchPoints>0&&window.innerWidth<=1366);
  if (isMobile) return window.innerWidth<768 ? 8000 : 14000;
  return 40000;
}

// ─── Galaxy Form Generators ───────────────────────────────────────────────────

function genSpiral(arr: Float32Array, tArr: Float32Array|null, N: number) {
  for (let i=0;i<N;i++) {
    const r=Math.pow(Math.random(),1.7)*MAXR;
    const branch=(i%3)/3;
    const angle=branch*Math.PI*2+r*0.09;
    const sp=0.6+r*0.05;
    arr[i*3]  =Math.cos(angle)*r+rn()*sp;
    arr[i*3+1]=rn()*(MAXR*0.05)*(1-(r/MAXR)*0.7);
    arr[i*3+2]=Math.sin(angle)*r+rn()*sp;
    if (tArr) tArr[i]=r/MAXR;
  }
}

function genBarred(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.12) {
      const t=(Math.random()-0.5)*30;
      arr[i*3]=t+rn()*1.5; arr[i*3+1]=rn()*1.2; arr[i*3+2]=rn()*(3+Math.abs(t)*0.1);
    } else if (roll<0.6) {
      const side=roll<0.36?1:-1;
      const r=14+Math.pow(Math.random(),1.4)*22;
      const angle=side*Math.PI/2+r*0.07;
      arr[i*3]=Math.cos(angle)*r+rn()*2.5; arr[i*3+1]=rn()*1.0; arr[i*3+2]=Math.sin(angle)*r+rn()*2.5;
    } else {
      const r=6+Math.pow(Math.random(),0.8)*30;
      const angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*r+rn()*2.5; arr[i*3+1]=rn()*0.7; arr[i*3+2]=Math.sin(angle)*r+rn()*2.5;
    }
  }
}

function genElliptical(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const r=Math.pow(Math.random(),2.2)*34;
    const theta=Math.random()*Math.PI*2;
    const phi=Math.acos(2*Math.random()-1);
    arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.55; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta)*0.85;
  }
}

function genRing(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.14) {
      const r=Math.pow(Math.random(),2)*8;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.4; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      const ringR=26+rn()*2, width=4+Math.random()*5, theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*(ringR+(Math.random()-0.5)*width); arr[i*3+1]=rn()*1.8; arr[i*3+2]=Math.sin(theta)*(ringR+(Math.random()-0.5)*width);
    }
  }
}

function genMerger(arr: Float32Array, N: number) {
  const offset=13;
  for (let i=0;i<N;i++) {
    const gal=i%2, cx=gal===0?-offset:offset;
    if (Math.random()<0.6) {
      const r=Math.pow(Math.random(),1.7)*16, angle=Math.random()*Math.PI*2+(gal===0?0.04:-0.04)*r;
      arr[i*3]=cx+Math.cos(angle)*r+rn()*2; arr[i*3+1]=rn()*1.8; arr[i*3+2]=Math.sin(angle)*r+rn()*2;
    } else {
      const t=Math.random(), dir=gal===0?1:-1;
      arr[i*3]=cx+dir*t*24+rn()*5; arr[i*3+1]=(t-0.5)*18+rn()*3; arr[i*3+2]=(Math.random()-0.5)*14*(1-t*0.5);
    }
  }
}

function genQuasar(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.35) {
      const r=2+Math.pow(Math.random(),0.5)*18, angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*r+rn()*0.8; arr[i*3+1]=rn()*1.0; arr[i*3+2]=Math.sin(angle)*r+rn()*0.8;
    } else {
      const dir=Math.random()>0.5?1:-1, t=Math.pow(Math.random(),0.5)*36, spread=1+t*0.1;
      arr[i*3]=rn()*spread; arr[i*3+1]=dir*t; arr[i*3+2]=rn()*spread;
    }
  }
}

function genSupernova(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const isShell=Math.random()<0.65;
    const r=isShell?(24+rn()*4.5):(10+Math.random()*16);
    const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1), scatter=isShell?0:rn()*4;
    arr[i*3]=r*Math.sin(phi)*Math.cos(theta)+scatter; arr[i*3+1]=r*Math.cos(phi)+scatter; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta)+scatter;
  }
}

function genFilament(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const f=i%5, theta=(f/5)*Math.PI*2, t=Math.random(), jitter=3+t*5;
    arr[i*3]=Math.cos(theta)*t*34+rn()*jitter; arr[i*3+1]=(Math.random()-0.5)*10; arr[i*3+2]=Math.sin(theta)*t*34+rn()*jitter;
  }
}

function genHourglass(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.08) { arr[i*3]=rn()*3; arr[i*3+1]=rn()*2; arr[i*3+2]=rn()*3; }
    else {
      const side=roll<0.54?1:-1, t=Math.pow(Math.random(),0.9), h=side*(7+t*26), r=3+t*14+rn()*1.5, angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*r; arr[i*3+1]=h; arr[i*3+2]=Math.sin(angle)*r;
    }
  }
}

function genTidal(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.25) {
      const r=Math.pow(Math.random(),1.5)*12, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=-20+r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.5; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      const t=Math.random(), arc=t*Math.PI*1.4-0.3;
      arr[i*3]=Math.cos(arc)*28+rn()*3; arr[i*3+1]=(t-0.5)*8+rn()*1.5; arr[i*3+2]=Math.sin(arc)*28+rn()*3;
    }
  }
}

function genIrregular(arr: Float32Array, N: number) {
  const clumps: [number,number,number][] = [];
  for (let c=0;c<9;c++) { const a=Math.random()*Math.PI*2, r=Math.random()*24; clumps.push([Math.cos(a)*r,(Math.random()-0.5)*8,Math.sin(a)*r]); }
  for (let i=0;i<N;i++) {
    const c=clumps[Math.floor(Math.random()*clumps.length)], sp=5+Math.random()*9;
    arr[i*3]=c[0]+rn()*sp; arr[i*3+1]=c[1]+rn()*sp*0.3; arr[i*3+2]=c[2]+rn()*sp;
  }
}

function genLenticular(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.3) {
      const r=Math.pow(Math.random(),2.2)*14, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.75; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      const r=8+Math.pow(Math.random(),0.9)*28, angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*r+rn()*1.2; arr[i*3+1]=rn()*0.6*(1-r/40); arr[i*3+2]=Math.sin(angle)*r+rn()*1.2;
    }
  }
}

function genSphere(arr: Float32Array, N: number) {
  const R=30, gold=Math.PI*(1+Math.sqrt(5));
  for (let i=0;i<N;i++) {
    const k=i+0.5, phi=Math.acos(1-(2*k)/N), th=gold*k;
    const inner=Math.random()<0.18?0.35+Math.random()*0.4:0.85+Math.random()*0.15;
    const rad=R*inner;
    arr[i*3]=rad*Math.sin(phi)*Math.cos(th); arr[i*3+1]=rad*Math.cos(phi); arr[i*3+2]=rad*Math.sin(phi)*Math.sin(th);
  }
}

function genNebula(arr: Float32Array, N: number) {
  const c: [number,number,number][] = [];
  for (let i=0;i<6;i++) { const a=Math.random()*Math.PI*2, r=5+Math.random()*22; c.push([Math.cos(a)*r,rn()*9,Math.sin(a)*r]); }
  for (let i=0;i<N;i++) {
    const k=c[i%c.length], s=6+Math.random()*10;
    arr[i*3]=k[0]+rn()*s; arr[i*3+1]=k[1]+rn()*s*0.65; arr[i*3+2]=k[2]+rn()*s;
  }
}

function genVortex(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const tt=i/N, angle=tt*Math.PI*18, rad=4+(1-tt)*34;
    arr[i*3]=Math.cos(angle)*rad+rn()*1.2; arr[i*3+1]=(tt-0.5)*62+rn()*1.0; arr[i*3+2]=Math.sin(angle)*rad+rn()*1.2;
  }
}

// ─── 15 New Premium Galaxy Forms ──────────────────────────────────────────────

function genPolarRing(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.35) {
      // Flat host disk in XZ plane
      const r=Math.pow(Math.random(),0.8)*18, angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*r+rn()*1.4; arr[i*3+1]=rn()*0.8; arr[i*3+2]=Math.sin(angle)*r+rn()*1.4;
    } else {
      // Perpendicular polar ring in YZ plane (very thin in X)
      const r=26+rn()*4, angle=Math.random()*Math.PI*2;
      arr[i*3]=rn()*1.2; arr[i*3+1]=Math.cos(angle)*r+rn()*1.5; arr[i*3+2]=Math.sin(angle)*r+rn()*1.5;
    }
  }
}

function genCartwheel(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.15) {
      // Dense core
      const r=Math.pow(Math.random(),2)*8, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.45; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else if (roll<0.45) {
      // Outer ring — bright sharp rim
      const r=30+rn()*2.5, theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*r+rn()*0.8; arr[i*3+1]=rn()*1.0; arr[i*3+2]=Math.sin(theta)*r+rn()*0.8;
    } else if (roll<0.65) {
      // Radial spokes connecting core to outer ring
      const spoke=Math.floor(Math.random()*8), spokeAngle=(spoke/8)*Math.PI*2;
      const t=Math.random();
      const r=8+t*22;
      arr[i*3]=Math.cos(spokeAngle)*r+rn()*1.5; arr[i*3+1]=rn()*0.7; arr[i*3+2]=Math.sin(spokeAngle)*r+rn()*1.5;
    } else {
      // Diffuse haze
      const r=Math.random()*30, theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*r+rn()*4; arr[i*3+1]=rn()*1.8; arr[i*3+2]=Math.sin(theta)*r+rn()*4;
    }
  }
}

function genStarburst(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.25) {
      // Explosive dense core — packed star formation
      const r=Math.pow(Math.random(),0.4)*5;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.6; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else if (roll<0.6) {
      // Star-forming knots scattered across disk
      const knotAngle=Math.random()*Math.PI*2, knotR=6+Math.random()*20;
      arr[i*3]=Math.cos(knotAngle)*knotR+rn()*3; arr[i*3+1]=rn()*1.2; arr[i*3+2]=Math.sin(knotAngle)*knotR+rn()*3;
    } else if (roll<0.85) {
      // Bipolar superwind outflows — long narrow cones in ±Y
      const dir=Math.random()>0.5?1:-1, t=Math.pow(Math.random(),0.6)*32, spread=1+t*0.06;
      arr[i*3]=rn()*spread; arr[i*3+1]=dir*t; arr[i*3+2]=rn()*spread;
    } else {
      // Galactic disk
      const r=5+Math.pow(Math.random(),1.2)*30, angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*r+rn()*2; arr[i*3+1]=rn()*0.6; arr[i*3+2]=Math.sin(angle)*r+rn()*2;
    }
  }
}

function genJellyfish(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.30) {
      // Compact bell/head of the jellyfish, centered at y=-14
      const r=Math.pow(Math.random(),0.9)*14, theta=Math.random()*Math.PI*2;
      const phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=-14+r*Math.cos(phi)*0.55; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      // Trailing tentacles going in +Y direction
      const tentacle=Math.floor(Math.random()*10);
      const tAngle=(tentacle/10)*Math.PI*2;
      const tR=2+Math.random()*9;
      const t=Math.random();
      const baseX=Math.cos(tAngle)*tR, baseZ=Math.sin(tAngle)*tR;
      const wander=t*5;
      arr[i*3]=baseX+rn()*wander; arr[i*3+1]=-2+t*32+rn()*2; arr[i*3+2]=baseZ+rn()*wander;
    }
  }
}

function genShell(arr: Float32Array, N: number) {
  const shells=[8,14,20,26,32];
  for (let i=0;i<N;i++) {
    if (Math.random()<0.10) {
      // Core
      const r=Math.pow(Math.random(),0.6)*5, theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi); arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      // Concentric spherical shells — each a past merger event
      const s=shells[Math.floor(Math.random()*shells.length)];
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1), scatter=0.9;
      const r=s+rn()*scatter;
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.85; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    }
  }
}

function genAccretion(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.04) {
      // Compact singularity core
      const r=Math.pow(Math.random(),0.3)*2;
      const theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*r; arr[i*3+1]=rn()*0.4; arr[i*3+2]=Math.sin(theta)*r;
    } else if (roll<0.82) {
      // Extremely thin accretion disk
      const r=2+Math.pow(Math.random(),1.1)*34, theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*r+rn()*0.6; arr[i*3+1]=rn()*0.18*(1+r*0.02); arr[i*3+2]=Math.sin(theta)*r+rn()*0.6;
    } else {
      // Relativistic jets — ultra-narrow bipolar
      const dir=Math.random()>0.5?1:-1, t=Math.pow(Math.random(),0.55)*36, spread=0.3+t*0.04;
      arr[i*3]=rn()*spread; arr[i*3+1]=dir*t; arr[i*3+2]=rn()*spread;
    }
  }
}

function genPulsar(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.05) {
      // Tiny neutron star core
      const r=Math.pow(Math.random(),0.5)*1.5;
      arr[i*3]=rn()*r; arr[i*3+1]=rn()*r; arr[i*3+2]=rn()*r;
    } else if (roll<0.30) {
      // Two narrow polar beams (half-angle ~10°)
      const dir=Math.random()>0.5?1:-1, t=Math.pow(Math.random(),0.6)*36;
      const halfAngle=0.18+Math.random()*0.12;
      const spread=t*Math.tan(halfAngle);
      const angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*spread*rn(); arr[i*3+1]=dir*t; arr[i*3+2]=Math.sin(angle)*spread*rn();
    } else if (roll<0.72) {
      // Pulsar wind nebula — oblate expanding sphere
      const r=12+Math.pow(Math.random(),1.2)*20;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.7; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      // Termination shock ellipse
      const a=32, b=22, theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*a+rn()*1.2; arr[i*3+1]=rn()*2; arr[i*3+2]=Math.sin(theta)*b+rn()*1.2;
    }
  }
}

function genVoid(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    if (Math.random()<0.95) {
      // Nearly all particles on the outer spherical shell — the wall of the void
      const r=30+Math.random()*7;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi); arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else {
      // A few lonely filaments inside
      const t=Math.random(), angle=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(angle)*t*12+rn()*4; arr[i*3+1]=(t-0.5)*14+rn()*4; arr[i*3+2]=Math.sin(angle)*t*12+rn()*4;
    }
  }
}

function genMagnetar(arr: Float32Array, N: number) {
  // Dipole field lines: r = L * sin²(θ), 12 azimuthal directions × 5 L values
  const Ls=[5,10,16,24,32];
  const nPhi=12;
  const nPerLine=Math.max(1,Math.floor(N/(Ls.length*nPhi)));
  let idx=0;
  for (const L of Ls) {
    for (let p=0;p<nPhi;p++) {
      const phi=(p/nPhi)*Math.PI*2;
      for (let k=0;k<nPerLine&&idx<N;k++) {
        const theta=(k/(Math.max(nPerLine-1,1)))*Math.PI;
        const r=L*Math.sin(theta)*Math.sin(theta);
        const scatter=L*0.03;
        arr[idx*3]  =r*Math.sin(theta)*Math.cos(phi)+rn()*scatter;
        arr[idx*3+1]=r*Math.cos(theta)+rn()*scatter;
        arr[idx*3+2]=r*Math.sin(theta)*Math.sin(phi)+rn()*scatter;
        idx++;
      }
    }
  }
  // Fill remaining with core plasma
  while (idx<N) {
    const r=Math.pow(Math.random(),0.5)*3;
    const theta=Math.random()*Math.PI*2, phi=Math.random()*Math.PI;
    arr[idx*3]=r*Math.sin(phi)*Math.cos(theta); arr[idx*3+1]=r*Math.cos(phi); arr[idx*3+2]=r*Math.sin(phi)*Math.sin(theta);
    idx++;
  }
}

function genEinstein(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.12) {
      // Compact background source core
      const r=Math.pow(Math.random(),2)*4;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.4; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else if (roll<0.52) {
      // Perfect Einstein ring — lensed arcs
      const r=22+rn()*1.5, theta=Math.random()*Math.PI*2;
      arr[i*3]=Math.cos(theta)*r+rn()*0.9; arr[i*3+1]=rn()*0.9; arr[i*3+2]=Math.sin(theta)*r+rn()*0.9;
    } else {
      // Four lensed image points at 90° intervals plus diffraction
      const img=Math.floor(Math.random()*4), imgAngle=(img/4)*Math.PI*2;
      const r=22, arcSpread=Math.PI/7;
      const a=imgAngle+(Math.random()-0.5)*arcSpread;
      arr[i*3]=Math.cos(a)*r+rn()*1.8; arr[i*3+1]=rn()*1.2; arr[i*3+2]=Math.sin(a)*r+rn()*1.8;
    }
  }
}

function genRelic(arr: Float32Array, N: number) {
  // Ultra-compact ancient galaxy — power-law concentration, oblate sphere
  for (let i=0;i<N;i++) {
    const r=Math.pow(Math.random(),4)*14; // steep power law = most stars in tiny core
    const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
    arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi)*0.6; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta)*0.8;
  }
}

function genLorenz(arr: Float32Array, N: number) {
  // Lorenz strange attractor — σ=10, ρ=28, β=8/3
  const sigma=10, rho=28, beta=8/3, dt=0.008;
  let x=0.1, y=0, z=0;
  // Burn transient
  for (let i=0;i<1200;i++) {
    const dx=sigma*(y-x)*dt, dy=(x*(rho-z)-y)*dt, dz=(x*y-beta*z)*dt;
    x+=dx; y+=dy; z+=dz;
  }
  for (let i=0;i<N;i++) {
    const dx=sigma*(y-x)*dt, dy=(x*(rho-z)-y)*dt, dz=(x*y-beta*z)*dt;
    x+=dx; y+=dy; z+=dz;
    // x ≈ ±20, y ≈ ±28, z ≈ 0..50 → map to [-MAXR, MAXR]
    arr[i*3]  =x/20*MAXR+rn()*0.3;
    arr[i*3+1]=(z-25)/25*MAXR*0.7+rn()*0.3;
    arr[i*3+2]=y/28*MAXR+rn()*0.3;
  }
}

function genCymatics(arr: Float32Array, N: number) {
  // Chladni nodal line pattern: particles cluster on zero lines of sin(mπx/R)*cos(nπz/R)
  // m=3 vertical lines, n=4 horizontal lines
  const m=3, n=4, R=MAXR;
  let idx=0;
  const halfV=Math.floor(N*0.5); // vertical line particles
  const halfH=N-halfV;           // horizontal line particles
  // Vertical lines: x = k*R/m
  for (let i=0;i<halfV;i++,idx++) {
    const k=Math.floor(Math.random()*(m*2+1))-m; // k in [-m, m]
    const x=k*(R/m)+rn()*0.7;
    const z=(Math.random()*2-1)*R;
    const distToEdge=R-Math.abs(z);
    if (distToEdge<0) { arr[idx*3]=rn()*2; arr[idx*3+1]=rn()*0.4; arr[idx*3+2]=rn()*2; continue; }
    arr[idx*3]=x; arr[idx*3+1]=rn()*0.5; arr[idx*3+2]=z;
  }
  // Horizontal lines: z = (k+0.5)*R/n
  for (let i=0;i<halfH&&idx<N;i++,idx++) {
    const k=Math.floor(Math.random()*(n*2))-n;
    const z=(k+0.5)*(R/n)+rn()*0.7;
    const x=(Math.random()*2-1)*R;
    arr[idx*3]=x; arr[idx*3+1]=rn()*0.5; arr[idx*3+2]=z;
  }
  // Clamp to disk
  for (let i=0;i<N;i++) {
    const dx=arr[i*3], dz=arr[i*3+2], d=Math.sqrt(dx*dx+dz*dz);
    if (d>R) { const s=R/d; arr[i*3]*=s; arr[i*3+2]*=s; }
  }
}

function genPlasma(arr: Float32Array, N: number) {
  // 14 branching plasma arcs — random walk with increasing jitter
  const nArcs=14;
  const nPerArc=Math.floor(N/nArcs);
  for (let a=0;a<nArcs;a++) {
    const startAngle=(a/nArcs)*Math.PI*2;
    let px=0, py=0, pz=0;
    for (let k=0;k<nPerArc;k++) {
      const t=k/nPerArc;
      const step=0.8+t*1.2;
      const jitter=(0.3+t*2.5)*step;
      px+=Math.cos(startAngle)*step+rn()*jitter;
      py+=rn()*jitter*0.4;
      pz+=Math.sin(startAngle)*step+rn()*jitter;
      const i=a*nPerArc+k;
      if (i<N) { arr[i*3]=px; arr[i*3+1]=py; arr[i*3+2]=pz; }
    }
  }
  // Fill remaining
  for (let i=nArcs*nPerArc;i<N;i++) {
    arr[i*3]=rn()*MAXR*0.6; arr[i*3+1]=rn()*MAXR*0.2; arr[i*3+2]=rn()*MAXR*0.6;
  }
}

function genProtostar(arr: Float32Array, N: number) {
  for (let i=0;i<N;i++) {
    const roll=Math.random();
    if (roll<0.08) {
      // Protostellar core — embryonic star
      const r=Math.pow(Math.random(),0.4)*3;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta); arr[i*3+1]=r*Math.cos(phi); arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta);
    } else if (roll<0.43) {
      // Circumstellar disk — flat, radial power law
      const r=3+Math.pow(Math.random(),0.7)*19, angle=Math.random()*Math.PI*2;
      const h=0.08+r*0.015; // flared disk
      arr[i*3]=Math.cos(angle)*r+rn()*0.5; arr[i*3+1]=rn()*h; arr[i*3+2]=Math.sin(angle)*r+rn()*0.5;
    } else if (roll<0.68) {
      // Bipolar outflow jets
      const dir=Math.random()>0.5?1:-1, t=Math.pow(Math.random(),0.65)*28, spread=0.5+t*0.05;
      arr[i*3]=rn()*spread; arr[i*3+1]=dir*t; arr[i*3+2]=rn()*spread;
    } else {
      // Infalling envelope — oblate sphere with inward density gradient
      const r=18+Math.pow(Math.random(),0.5)*16;
      const theta=Math.random()*Math.PI*2, phi=Math.acos(2*Math.random()-1);
      arr[i*3]=r*Math.sin(phi)*Math.cos(theta)+rn()*3; arr[i*3+1]=r*Math.cos(phi)*0.7+rn()*2; arr[i*3+2]=r*Math.sin(phi)*Math.sin(theta)+rn()*3;
    }
  }
}

function buildForm(name: FormType, N: number, tArr?: Float32Array): Float32Array {
  const a=new Float32Array(N*3);
  switch (name) {
    case "spiral":     genSpiral(a, tArr??null, N); break;
    case "barred":     genBarred(a, N); break;
    case "elliptical": genElliptical(a, N); break;
    case "ring":       genRing(a, N); break;
    case "merger":     genMerger(a, N); break;
    case "quasar":     genQuasar(a, N); break;
    case "supernova":  genSupernova(a, N); break;
    case "filament":   genFilament(a, N); break;
    case "hourglass":  genHourglass(a, N); break;
    case "tidal":      genTidal(a, N); break;
    case "irregular":  genIrregular(a, N); break;
    case "lenticular": genLenticular(a, N); break;
    case "sphere":     genSphere(a, N); break;
    case "nebula":     genNebula(a, N); break;
    case "vortex":     genVortex(a, N); break;
    case "polar_ring": genPolarRing(a, N); break;
    case "cartwheel":  genCartwheel(a, N); break;
    case "starburst":  genStarburst(a, N); break;
    case "jellyfish":  genJellyfish(a, N); break;
    case "shell":      genShell(a, N); break;
    case "accretion":  genAccretion(a, N); break;
    case "pulsar":     genPulsar(a, N); break;
    case "void":       genVoid(a, N); break;
    case "magnetar":   genMagnetar(a, N); break;
    case "einstein":   genEinstein(a, N); break;
    case "relic":      genRelic(a, N); break;
    case "lorenz":     genLorenz(a, N); break;
    case "cymatics":   genCymatics(a, N); break;
    case "plasma":     genPlasma(a, N); break;
    case "protostar":  genProtostar(a, N); break;
  }
  return a;
}

// ─── Audio — per-galaxy soundscapes ──────────────────────────────────────────

function makeAudio() {
  const Ctx=(window as any).AudioContext||(window as any).webkitAudioContext;
  if (!Ctx) return null;
  const ac=new Ctx() as AudioContext;
  const master=ac.createGain(); master.gain.value=0; master.connect(ac.destination);
  const delay=ac.createDelay(2.0); delay.delayTime.value=0.36;
  const fb=ac.createGain(); fb.gain.value=0.28;
  delay.connect(fb); fb.connect(delay); delay.connect(master);
  const lp=ac.createBiquadFilter(); lp.type="lowpass"; lp.frequency.value=420; lp.Q.value=2.5;
  const dOut=ac.createGain(); dOut.gain.value=0.18;
  lp.connect(dOut); dOut.connect(master);
  [55,82.4,110].forEach(f => {
    const o=ac.createOscillator(); o.type="sine"; o.frequency.value=f;
    const g=ac.createGain(); g.gain.value=0.10; o.connect(g); g.connect(lp); o.start();
  });
  const analyser=ac.createAnalyser();
  analyser.fftSize=128; analyser.smoothingTimeConstant=0.78;
  master.connect(analyser);
  const aData=new Uint8Array(analyser.frequencyBinCount);

  const nBuf=ac.createBuffer(1,2*ac.sampleRate,ac.sampleRate);
  const nData=nBuf.getChannelData(0); for (let i=0;i<nData.length;i++) nData[i]=Math.random()*2-1;
  const nSrc=ac.createBufferSource(); nSrc.buffer=nBuf; nSrc.loop=true;
  const nFilt=ac.createBiquadFilter(); nFilt.type="bandpass"; nFilt.frequency.value=800; nFilt.Q.value=0.7;
  const nGain=ac.createGain(); nGain.gain.value=0.022;
  nSrc.connect(nFilt); nFilt.connect(nGain); nGain.connect(master); nSrc.start();

  const tNote=(freq:number, type:OscillatorType, t:number, atk:number, dec:number, vol:number)=>{
    const o=ac.createOscillator(); o.type=type; o.frequency.value=freq;
    const g=ac.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+atk); g.gain.exponentialRampToValueAtTime(0.0001,t+atk+dec);
    o.connect(g); g.connect(master); g.connect(delay); o.start(t); o.stop(t+atk+dec+0.1);
  };
  const tGlide=(f0:number, f1:number, type:OscillatorType, t:number, dur:number, vol:number)=>{
    const o=ac.createOscillator(); o.type=type;
    o.frequency.setValueAtTime(f0,t); o.frequency.linearRampToValueAtTime(f1,t+dur);
    const g=ac.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.04); g.gain.linearRampToValueAtTime(0,t+dur);
    o.connect(g); g.connect(master); o.start(t); o.stop(t+dur+0.1);
  };
  const tNoise=(t:number, dur:number, vol:number, freq:number)=>{
    const len=Math.ceil(ac.sampleRate*Math.max(0.05,dur));
    const buf=ac.createBuffer(1,len,ac.sampleRate);
    const d=buf.getChannelData(0); for (let i=0;i<d.length;i++) d[i]=Math.random()*2-1;
    const src=ac.createBufferSource(); src.buffer=buf;
    const flt=ac.createBiquadFilter(); flt.type="bandpass"; flt.frequency.value=freq; flt.Q.value=2;
    const g=ac.createGain();
    g.gain.setValueAtTime(0,t); g.gain.linearRampToValueAtTime(vol,t+0.01); g.gain.exponentialRampToValueAtTime(0.0001,t+dur);
    src.connect(flt); flt.connect(g); g.connect(master); src.start(t); src.stop(t+dur+0.1);
  };

  return {
    ac,
    on()  { if (ac.state==="suspended") ac.resume(); master.gain.setTargetAtTime(0.5,ac.currentTime,0.6); },
    off() { master.gain.setTargetAtTime(0,ac.currentTime,0.4); },
    level() {
      analyser.getByteFrequencyData(aData);
      let s=0; for (let i=0;i<aData.length;i++) s+=aData[i];
      return s/(aData.length*255);
    },

    transition(form: FormType, energy: number) {
      if (ac.state==="suspended") ac.resume();
      const t=ac.currentTime;
      const v=0.038+energy*0.055;

      const LP: Record<FormType,number> = {
        spiral:400+energy*900, barred:270, elliptical:120, ring:1900,
        merger:660, quasar:2500, supernova:1200, filament:1800,
        hourglass:490, tidal:300, irregular:1000, lenticular:190,
        sphere:1600, nebula:570, vortex:730,
        polar_ring:1600, cartwheel:550, starburst:1800, jellyfish:200, shell:800,
        accretion:1400, pulsar:300, void:80, magnetar:2400, einstein:2200,
        relic:140, lorenz:600, cymatics:1800, plasma:1600, protostar:400,
      };
      const NF: Record<FormType,number> = {
        spiral:1100, barred:560, elliptical:150, ring:3400,
        merger:980, quasar:4800, supernova:7000, filament:2500,
        hourglass:840, tidal:360, irregular:1700, lenticular:300,
        sphere:2200, nebula:730, vortex:1400,
        polar_ring:2400, cartwheel:800, starburst:6000, jellyfish:400, shell:1800,
        accretion:4000, pulsar:500, void:200, magnetar:8000, einstein:3600,
        relic:280, lorenz:1200, cymatics:3000, plasma:5000, protostar:1600,
      };
      lp.frequency.setTargetAtTime(LP[form],t,0.8);
      nFilt.frequency.setTargetAtTime(NF[form],t,0.5);
      dOut.gain.setTargetAtTime(0.10+energy*0.16,t,0.8);
      nGain.gain.setTargetAtTime(0.012+energy*0.045,t,0.6);

      switch (form) {
        case "spiral":
          [261.6,329.6,392,523.2,659.3].forEach((f,i)=>tNote(f,"sine",t+i*0.12,0.06,1.8,v)); break;
        case "barred":
          [220,261.6,329.6].forEach((f,i)=>tNote(f,"sawtooth",t+i*0.07,0.02,0.5,v*0.38));
          [220,261.6,329.6].forEach((f,i)=>tNote(f,"sawtooth",t+0.38+i*0.07,0.02,0.5,v*0.3));
          tNote(110,"sawtooth",t+0.76,0.02,0.5,v*0.22); break;
        case "elliptical":
          tNote(36.7,"sine",t+0.1,1.1,3.2,v*0.75); tNote(55,"sine",t,0.9,2.8,v*1.3); tNote(82.4,"sine",t+0.5,0.8,2.4,v*0.9); break;
        case "ring":
          tNote(523.2,"triangle",t,0.006,3.5,v*1.0); tNote(1046.5,"sine",t+0.01,0.006,2.2,v*0.55);
          tNote(2093,"sine",t+0.02,0.006,1.4,v*0.28); tNote(3136,"sine",t+0.03,0.006,0.8,v*0.14);
          tNote(4186,"sine",t+0.04,0.006,0.4,v*0.07); break;
        case "merger":
          [261.6,329.6,392.0].forEach((f,i)=>tNote(f,"sine",t+i*0.06,0.05,2.4,v*0.7));
          [277.2,349.2,415.3].forEach((f,i)=>tNote(f,"sine",t+0.25+i*0.06,0.05,2.4,v*0.65));
          tNote(196,"sine",t+0.5,0.1,3.0,v*0.5); break;
        case "quasar":
          tNoise(t,0.28,v*0.9,2200); tNoise(t+0.06,0.18,v*0.6,5000);
          tNote(880,"sawtooth",t,0.01,1.2,v*0.65); tNote(1760,"sawtooth",t+0.05,0.01,0.85,v*0.42);
          tGlide(3400,700,"sawtooth",t+0.3,0.9,v*0.35); break;
        case "supernova":
          tNoise(t,0.6,v*1.3,1600); tNoise(t+0.08,0.45,v*0.8,3800); tNoise(t+0.2,0.3,v*0.5,8000);
          [523.2,659.3,783.9,1046.5].forEach((f,i)=>tNote(f,"sine",t+0.85+i*0.18,0.14,3.0,v*0.52)); break;
        case "filament":
          [1046.5,1318.5,1568,2093,2637].forEach((f,i)=>tNote(f,"triangle",t+i*0.24,0.03,1.4,v*0.4)); break;
        case "hourglass":
          tGlide(320,1400,"sine",t,1.7,v*0.75); tGlide(1400,260,"sine",t+0.06,1.7,v*0.68);
          tNote(440,"sine",t+0.85,0.05,1.2,v*0.45); break;
        case "tidal":
          tGlide(174,440,"sine",t,2.4,v*0.78); tGlide(220,110,"sine",t+0.38,2.4,v*0.58);
          tNote(73.4,"sine",t+0.8,0.4,2.5,v*0.6); break;
        case "irregular": {
          const bases=[200,440,320,580,170,760,260];
          bases.forEach(f=>tNote(f*(0.82+Math.random()*0.36),"square",t+Math.random()*0.52,0.01,0.26+Math.random()*0.38,v*0.48)); break;
        }
        case "lenticular":
          [220,277.2,329.6,415.3].forEach((f,i)=>tNote(f,"sine",t+i*0.22,0.32,3.2,v*0.68));
          tNote(110,"sine",t+0.6,0.5,3.5,v*0.45); break;
        case "sphere":
          [261.6,392,523.2,784].forEach((f,i)=>tNote(f,"sine",t+i*0.09,0.07,3.4,v*(0.85-i*0.12)));
          tNote(1046.5,"sine",t+0.38,0.05,2.4,v*0.38); break;
        case "nebula":
          tNoise(t,0.95,v*0.55,600); tNoise(t+0.3,0.65,v*0.35,1200);
          [261.6,329.6,392,493.9].forEach((f,i)=>tNote(f,"sine",t+0.28+i*0.24,0.35,3.0,v*0.62)); break;
        case "vortex":
          tGlide(1600,55,"sine",t,3.0,v*1.0); tGlide(800,36.7,"sine",t+0.18,2.7,v*0.68);
          tNoise(t,1.8,v*0.35,430); tNote(36.7,"sine",t+2.0,0.2,2.0,v*0.55); break;

        // ── 15 New Premium Soundscapes ───────────────────────────────────────

        case "polar_ring":
          // Two perpendicular chord clusters — a galaxy tilted against its host
          [261.6,392,523.2].forEach((f,i)=>tNote(f,"sine",t+i*0.14,0.08,2.6,v*0.7));
          [329.6,493.9,659.3].forEach((f,i)=>tNote(f,"triangle",t+0.38+i*0.14,0.08,2.4,v*0.55));
          tNote(164.8,"sine",t+0.9,0.3,3.0,v*0.45); break;

        case "cartwheel":
          // Percussion ring hit — metallic resonance rippling outward
          tNoise(t,0.08,v*1.1,3200); tNote(523.2,"triangle",t+0.04,0.004,3.8,v*1.2);
          [1046.5,1568,2093,2637,3136].forEach((f,i)=>tNote(f,"sine",t+0.04+i*0.06,0.004,2.5-i*0.3,v*(0.8-i*0.12)));
          break;

        case "starburst":
          // Explosive rapid percussion + rising harmonic bloom
          tNoise(t,0.15,v*1.1,4000); tNoise(t+0.05,0.12,v*0.9,6000); tNoise(t+0.1,0.09,v*0.7,9000);
          [392,523.2,659.3,783.9,1046.5].forEach((f,i)=>tNote(f,"sine",t+0.3+i*0.1,0.08,2.5,v*0.55));
          break;

        case "jellyfish":
          // Slow pulsing low sine + ethereal high harmonics drifting up
          tNote(55,"sine",t,0.5,4.0,v*0.9); tNote(82.4,"sine",t+0.3,0.5,3.5,v*0.65);
          tGlide(880,1760,"sine",t+0.5,3.0,v*0.22); tGlide(660,1320,"triangle",t+0.7,2.8,v*0.18);
          break;

        case "shell":
          // Concentric sine waves — each shell a resonant ring
          [110,165,220,293,392].forEach((f,i)=>tNote(f,"sine",t+i*0.28,0.15,3.2-i*0.3,v*0.6));
          tNote(73.4,"sine",t+1.2,0.5,4.0,v*0.5); break;

        case "accretion":
          // Low rumble + high-pitched disk friction whine
          tNote(27.5,"sine",t,0.2,4.0,v*1.0); tNote(36.7,"sine",t+0.1,0.2,3.5,v*0.8);
          tGlide(2400,1800,"sawtooth",t+0.2,3.0,v*0.25); tNoise(t,2.0,v*0.18,3600);
          break;

        case "pulsar":
          // Precise rhythmic ping + cosmic static wind
          [0,0.4,0.8,1.2,1.6,2.0].forEach(dt2=>tNote(1760,"sine",t+dt2,0.005,0.38,v*0.85));
          tNoise(t,2.0,v*0.3,700); tNote(880,"triangle",t+0.2,0.006,0.6,v*0.4); break;

        case "void":
          // Near-silence — barely audible resonance of absolute emptiness
          tNote(27.5,"sine",t,1.5,6.0,v*0.35); tNote(36.7,"sine",t+0.8,1.2,5.0,v*0.22);
          tNoise(t,3.5,v*0.08,120); break;

        case "magnetar":
          // Electromagnetic fury — harsh metallic overtones + deep field hum
          tNoise(t,0.4,v*0.8,5500); tNoise(t+0.08,0.3,v*0.6,8000);
          [110,220,440,880,1760].forEach((f,i)=>tNote(f,"sawtooth",t+i*0.04,0.02,1.4,v*(0.9-i*0.15)));
          tNote(36.7,"sine",t,0.3,5.0,v*1.1); break;

        case "einstein":
          // Perfectly tuned harmonic overtone series — mathematical beauty
          const base=82.4;
          [1,2,3,4,5,6,7,8].forEach((n,i)=>tNote(base*n,"sine",t+i*0.06,0.08,3.5-i*0.2,v*(0.95-i*0.1)));
          break;

        case "relic":
          // Ancient deep chord — faded, compressed, the oldest sound in the cosmos
          tNote(27.5,"sine",t,1.8,6.0,v*0.8); tNote(41.2,"sine",t+0.4,1.5,5.5,v*0.6);
          tNote(55,"sine",t+0.9,1.2,5.0,v*0.45); break;

        case "lorenz":
          // Deterministic chaos — never repeating glide that always stays bounded
          tGlide(440,329.6,"sine",t,0.9,v*0.65); tGlide(329.6,493.9,"sine",t+0.7,0.9,v*0.6);
          tGlide(493.9,369.9,"sine",t+1.4,0.9,v*0.55); tGlide(369.9,440,"sine",t+2.1,0.9,v*0.5);
          tNoise(t,1.8,v*0.12,600); break;

        case "cymatics":
          // Standing wave resonance — pure nodal harmonics, geometric sound
          [110,220,330,440,550,660].forEach((f,i)=>
            tNote(f,"triangle",t+i*0.08,0.05,3.0,v*(0.8-i*0.1)));
          tNote(880,"sine",t+0.5,0.04,2.2,v*0.35); break;

        case "plasma":
          // Crackling electric arc — branching noise bursts
          [0,0.06,0.14,0.24,0.36,0.5,0.66].forEach(dt2=>
            tNoise(t+dt2,0.05+Math.random()*0.08,v*(0.5+Math.random()*0.5),1500+Math.random()*3000));
          tNote(55,"sawtooth",t,0.1,3.0,v*0.4); break;

        case "protostar":
          // Gentle birth hum + slow crescendo — a sun coming to life
          tNoise(t,1.5,v*0.4,400); tNoise(t+0.5,1.2,v*0.3,800);
          tGlide(82.4,110,"sine",t+0.3,3.0,v*0.7); tGlide(110,164.8,"sine",t+1.5,3.0,v*0.55);
          [261.6,329.6,392].forEach((f,i)=>tNote(f,"sine",t+2.5+i*0.3,0.4,3.5,v*0.45)); break;
      }
    },
  };
}

// ─── Types ────────────────────────────────────────────────────────────────────

interface SavedStar {
  id: number;
  thought: string;
  whisper: string;
  palette: string[];
  form: FormType;
  energy: number;
  pos: [number,number,number];
}

// ─── Component ───────────────────────────────────────────────────────────────

export default function AetherCanvas() {
  const mountRef     = useRef<HTMLDivElement>(null);
  const sceneRef     = useRef<any>({});
  const audioRef     = useRef<ReturnType<typeof makeAudio>|null>(null);
  const burstRef     = useRef(0);
  const lastEnergy   = useRef(0.35);
  const starsRef     = useRef<SavedStar[]>([]);
  const morphCounter = useRef(0);
  const mouseRef     = useRef({ x: 0, y: 0, active: false });
  const lastActRef   = useRef(performance.now());
  const gyroRef      = useRef({ beta: 0, gamma: 0 });
  const voiceRef     = useRef<any>(null);

  const [thought,      setThought]      = useState("");
  const [whisper,      setWhisper]      = useState("I am Aether. Whisper a thought, and watch it become a galaxy.");
  const [loading,      setLoading]      = useState(false);
  const [form,         setForm]         = useState<FormType>("spiral");
  const [accentColor,  setAccentColor]  = useState("#b892ff");
  const [count,        setCount]        = useState(0);
  const [show,         setShow]         = useState(false);
  const [sound,        setSound]        = useState(false);
  const [panel,        setPanel]        = useState(false);
  const [captureURL,   setCaptureURL]   = useState<string|null>(null);
  const [list,         setList]         = useState<SavedStar[]>([]);
  const [inputFocused, setInputFocused] = useState(false);
  const [morphLabel,   setMorphLabel]   = useState<{label:string;id:number}|null>(null);
  const [screensaver,  setScreensaver]  = useState(false);
  const [voiceActive,  setVoiceActive]  = useState(false);
  const [hasVoice,     setHasVoice]     = useState(false);
  const [streak,       setStreak]       = useState(0);
  const [shareId,      setShareId]      = useState<string|null>(null);
  const [copied,       setCopied]       = useState(false);
  const [explore,      setExplore]      = useState(false);
  const [zen,          setZen]          = useState(false);
  const [firstContact, setFirstContact] = useState(false);

  // ── Three.js setup ──────────────────────────────────────────────────────────
  useEffect(() => {
    const mount=mountRef.current;
    if (!mount) return;

    const N=getN();
    let renderer: THREE.WebGLRenderer;
    try { renderer=new THREE.WebGLRenderer({antialias:true,alpha:false,preserveDrawingBuffer:true}); } catch { return; }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio,2));
    renderer.setSize(mount.clientWidth,mount.clientHeight);
    renderer.setClearColor(0x050308,1);
    mount.appendChild(renderer.domElement);

    const scene=new THREE.Scene();
    scene.fog=new THREE.FogExp2(0x050308,0.003);
    const camera=new THREE.PerspectiveCamera(60,mount.clientWidth/mount.clientHeight,0.1,600);

    // Cinematic bloom post-processing
    const composer=new EffectComposer(renderer);
    composer.addPass(new RenderPass(scene,camera));
    // Dreamy motion trails — length reacts to energy and morph warps
    const afterimage=new AfterimagePass(0.3);
    composer.addPass(afterimage);
    const bloom=new UnrealBloomPass(
      new THREE.Vector2(mount.clientWidth,mount.clientHeight),
      0.4,   // strength — subtle halo, not blowout
      0.45,  // radius
      0.42,  // threshold — only bright cores bloom
    );
    composer.addPass(bloom);
    const cinematic=new ShaderPass(CinematicShader as any);
    composer.addPass(cinematic);

    const cv=document.createElement("canvas"); cv.width=cv.height=128;
    const c2=cv.getContext("2d")!;
    const g=c2.createRadialGradient(64,64,0,64,64,64);
    g.addColorStop(0,"rgba(255,255,255,1)"); g.addColorStop(0.04,"rgba(255,255,255,0.95)");
    g.addColorStop(0.12,"rgba(210,200,255,0.75)"); g.addColorStop(0.3,"rgba(160,120,255,0.35)");
    g.addColorStop(0.6,"rgba(100,80,200,0.1)"); g.addColorStop(1,"rgba(0,0,0,0)");
    c2.fillStyle=g; c2.fillRect(0,0,128,128);
    const sprite=new THREE.CanvasTexture(cv);

    const tArr=new Float32Array(N);
    const forms: Record<FormType,Float32Array>={} as any;
    forms.spiral=buildForm("spiral",N,tArr);
    for (const f of FORMS) { if (f!=="spiral") forms[f]=buildForm(f,N); }

    const base=new Float32Array(N*3); base.set(forms.spiral);
    const phase=new Float32Array(N); for (let i=0;i<N;i++) phase[i]=Math.random()*Math.PI*2;
    const colCur=new Float32Array(N*3);
    const colTgt=new Float32Array(N*3);

    const applyPalette=(pal:string[],into:Float32Array)=>{
      const a=hexToRGB(pal[0]),b=hexToRGB(pal[1]),c=hexToRGB(pal[2]);
      for (let i=0;i<N;i++) { const k=lerp3(a,b,c,tArr[i]); into[i*3]=k[0]; into[i*3+1]=k[1]; into[i*3+2]=k[2]; }
    };
    applyPalette(FALLBACK_PALETTES[0],colCur);
    colTgt.set(colCur);

    const geo=new THREE.BufferGeometry();
    const live=new Float32Array(N*3); live.set(forms.spiral);
    geo.setAttribute("position",new THREE.BufferAttribute(live,3));
    geo.setAttribute("color",new THREE.BufferAttribute(colCur,3));
    // Per-particle star character: size class + twinkle phase
    const aSize=new Float32Array(N), aPhase2=new Float32Array(N);
    for (let i=0;i<N;i++) {
      const roll=Math.random();
      aSize[i]=roll<0.86?0.6+Math.random()*0.6:roll<0.97?1.3+Math.random()*0.9:2.4+Math.random()*1.6;
      aPhase2[i]=Math.random()*Math.PI*2;
    }
    geo.setAttribute("aSize",new THREE.BufferAttribute(aSize,1));
    geo.setAttribute("aPhase",new THREE.BufferAttribute(aPhase2,1));
    const matUniforms={
      uTime:{value:0},
      uSize:{value:0.95},
      uMap:{value:sprite},
    };
    const mat=new THREE.ShaderMaterial({
      uniforms:matUniforms,
      vertexColors:true,
      transparent:true,
      depthWrite:false,
      blending:THREE.AdditiveBlending,
      vertexShader:`
        attribute float aSize;
        attribute float aPhase;
        uniform float uTime;
        uniform float uSize;
        varying vec3 vColor;
        varying float vTwinkle;
        void main(){
          vColor=color;
          vTwinkle=0.72+0.28*sin(uTime*(1.2+aPhase*0.35)+aPhase*7.0);
          vec4 mv=modelViewMatrix*vec4(position,1.0);
          gl_PointSize=uSize*aSize*vTwinkle*(340.0/-mv.z);
          gl_Position=projectionMatrix*mv;
        }`,
      fragmentShader:`
        uniform sampler2D uMap;
        varying vec3 vColor;
        varying float vTwinkle;
        void main(){
          vec4 tex=texture2D(uMap,gl_PointCoord);
          gl_FragColor=vec4(vColor*(0.66+0.34*vTwinkle),tex.a*0.92);
        }`,
    });
    const points=new THREE.Points(geo,mat);
    scene.add(points);

    const coreMat=new THREE.SpriteMaterial({map:sprite,color:0x9b6bff,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false});
    const core=new THREE.Sprite(coreMat); core.scale.set(16,16,1);
    scene.add(core);

    const sGeo=new THREE.BufferGeometry();
    const sPos=new Float32Array(BG_STARS*3);
    for (let i=0;i<BG_STARS;i++) {
      const a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1),r=130+Math.random()*130;
      sPos[i*3]=r*Math.sin(b)*Math.cos(a); sPos[i*3+1]=r*Math.cos(b); sPos[i*3+2]=r*Math.sin(b)*Math.sin(a);
    }
    sGeo.setAttribute("position",new THREE.BufferAttribute(sPos,3));
    const bgStars=new THREE.Points(sGeo,new THREE.PointsMaterial({size:0.65,color:0x8899cc,map:sprite,transparent:true,opacity:0.55,depthWrite:false,blending:THREE.AdditiveBlending}));
    scene.add(bgStars);

    // Shooting stars — comet streaks that occasionally cross the sky
    const METEORS=5;
    const meteorGeo=new THREE.BufferGeometry();
    const meteorPos=new Float32Array(METEORS*2*3).fill(1e5);
    meteorGeo.setAttribute("position",new THREE.BufferAttribute(meteorPos,3));
    const meteorMat=new THREE.LineBasicMaterial({color:0xcfd8ff,transparent:true,opacity:0,blending:THREE.AdditiveBlending,depthWrite:false});
    const meteors=new THREE.LineSegments(meteorGeo,meteorMat);
    scene.add(meteors);
    const meteorState=Array.from({length:METEORS},()=>({active:false,life:0,x:0,y:0,z:0,vx:0,vy:0,vz:0}));
    let nextMeteor=performance.now()+4000+Math.random()*6000;
    const spawnMeteor=()=>{
      const m=meteorState.find(s=>!s.active); if (!m) return;
      const a=Math.random()*Math.PI*2, r=90+Math.random()*40;
      m.x=Math.cos(a)*r; m.y=30+Math.random()*40; m.z=Math.sin(a)*r;
      const sp=55+Math.random()*45;
      const ta=a+Math.PI+(Math.random()-0.5)*0.9;
      m.vx=Math.cos(ta)*sp; m.vy=-(14+Math.random()*22); m.vz=Math.sin(ta)*sp;
      m.life=1; m.active=true;
    };

    // Nebula clouds — huge soft palette-tinted gas sprites drifting behind the galaxy
    const NEBULAE=9;
    const nebulaGroup=new THREE.Group();
    const nebulaMats: THREE.SpriteMaterial[]=[];
    for (let i=0;i<NEBULAE;i++) {
      const nm=new THREE.SpriteMaterial({map:sprite,color:0x2d1b69,transparent:true,blending:THREE.AdditiveBlending,depthWrite:false,opacity:0.018+Math.random()*0.022});
      const ns=new THREE.Sprite(nm);
      const a=Math.random()*Math.PI*2, r=34+Math.random()*46;
      ns.position.set(Math.cos(a)*r,(Math.random()-0.5)*36,Math.sin(a)*r);
      const sc=34+Math.random()*40;
      ns.scale.set(sc,sc*(0.6+Math.random()*0.5),1);
      nebulaGroup.add(ns); nebulaMats.push(nm);
    }
    scene.add(nebulaGroup);
    const tintNebulae=(pal:string[])=>{
      nebulaMats.forEach((nm,i)=>nm.color.set(pal[i%2===0?1:2]));
    };

    const memPos=new Float32Array(CAP*3).fill(1e5);
    const memCol=new Float32Array(CAP*3).fill(1);
    const memGeo=new THREE.BufferGeometry();
    memGeo.setAttribute("position",new THREE.BufferAttribute(memPos,3));
    memGeo.setAttribute("color",new THREE.BufferAttribute(memCol,3));
    memGeo.setDrawRange(0,0);
    const memMat=new THREE.PointsMaterial({size:3.6,map:sprite,vertexColors:true,transparent:true,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true,opacity:0.95});
    const memPoints=new THREE.Points(memGeo,memMat);
    scene.add(memPoints);

    // Constellation lines — the emotional journey drawn between memory stars
    const memLinePos=new Float32Array((CAP-1)*2*3).fill(1e5);
    const memLineGeo=new THREE.BufferGeometry();
    memLineGeo.setAttribute("position",new THREE.BufferAttribute(memLinePos,3));
    memLineGeo.setDrawRange(0,0);
    const memLineMat=new THREE.LineBasicMaterial({color:0x93a0e0,transparent:true,opacity:0.2,blending:THREE.AdditiveBlending,depthWrite:false});
    const memLines=new THREE.LineSegments(memLineGeo,memLineMat);
    scene.add(memLines);

    const cam={theta:0.6,phi:1.15,radius:150,targetRadius:62,lastInput:performance.now()};
    // Ambient cursor parallax — the cosmos leans gently toward the pointer
    let parX=0,parY=0;
    const updateCam=()=>{
      const gyro=gyroRef.current;
      const gyroTheta=gyro.gamma*(Math.PI/180)*0.04;
      const gyroPhi=gyro.beta*(Math.PI/180)*0.03;
      const m=mouseRef.current;
      const tx=m.active&&!dragging?m.x*0.14:0;
      const ty=m.active&&!dragging?m.y*0.10:0;
      parX+=(tx-parX)*0.045; parY+=(ty-parY)*0.045;
      const ph=Math.max(0.14,Math.min(Math.PI-0.14,cam.phi+gyroPhi-parY));
      camera.position.set(
        cam.radius*Math.sin(ph)*Math.cos(cam.theta+gyroTheta+parX),
        cam.radius*Math.cos(ph),
        cam.radius*Math.sin(ph)*Math.sin(cam.theta+gyroTheta+parX),
      );
      camera.lookAt(0,0,0);
    };

    // Pre-allocate objects for cursor gravity (no GC in render loop)
    const mouseV=new THREE.Vector2();
    const gravRay=new THREE.Raycaster();
    const gravPlane=new THREE.Plane(new THREE.Vector3(0,1,0),0);
    const gravTarget=new THREE.Vector3();

    let dragging=false,px=0,py=0,pinchD=0,downX=0,downY=0,downT=0,moved=0;
    const el=renderer.domElement;
    const ray=new THREE.Raycaster(); (ray.params as any).Points={threshold:3.5};

    const markAct=()=>{ lastActRef.current=performance.now(); if (screensaver) setScreensaver(false); };

    const onDown=(e:PointerEvent)=>{ dragging=true; px=e.clientX; py=e.clientY; downX=px; downY=py; downT=performance.now(); moved=0; cam.lastInput=downT; markAct(); };
    const onMove=(e:PointerEvent)=>{
      if (!dragging) return;
      moved+=Math.abs(e.clientX-px)+Math.abs(e.clientY-py);
      cam.theta-=(e.clientX-px)*0.005;
      cam.phi=Math.max(0.18,Math.min(Math.PI-0.18,cam.phi-(e.clientY-py)*0.005));
      px=e.clientX; py=e.clientY; cam.lastInput=performance.now(); markAct();
    };
    const onMouseMove=(e:MouseEvent)=>{
      const rect=el.getBoundingClientRect();
      mouseRef.current.x=((e.clientX-rect.left)/rect.width)*2-1;
      mouseRef.current.y=-((e.clientY-rect.top)/rect.height)*2+1;
      mouseRef.current.active=true;
    };
    const onMouseLeave=()=>{ mouseRef.current.active=false; };
    const onUp=()=>{
      dragging=false;
      if (moved<8&&performance.now()-downT<400) {
        const rect=el.getBoundingClientRect();
        const nx=((downX-rect.left)/rect.width)*2-1;
        const ny=-((downY-rect.top)/rect.height)*2+1;
        ray.setFromCamera({x:nx,y:ny} as THREE.Vector2,camera);
        const hits=ray.intersectObject(memPoints);
        if (hits.length&&hits[0].index!==undefined&&hits[0].index<starsRef.current.length&&sceneRef.current.onStarTap) {
          sceneRef.current.onStarTap(hits[0].index);
        } else {
          // Empty-space tap — drop a gravity well where the click lands.
          gravRay.setFromCamera({x:nx,y:ny} as THREE.Vector2,camera);
          if (gravRay.ray.intersectPlane(gravPlane,gravTarget)) {
            if (wells.length>=MAX_WELLS) wells.shift();
            wells.push({x:gravTarget.x,y:gravTarget.y,z:gravTarget.z,born:performance.now()});
            markAct();
          }
        }
      }
    };
    el.addEventListener("pointerdown",onDown);
    el.addEventListener("mousemove",onMouseMove);
    el.addEventListener("mouseleave",onMouseLeave);
    window.addEventListener("pointermove",onMove);
    window.addEventListener("pointerup",onUp);
    window.addEventListener("keydown",markAct);

    const onTS=(e:TouchEvent)=>{ if (e.touches.length===2) pinchD=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY); };
    const onTM=(e:TouchEvent)=>{
      if (e.touches.length===2) {
        const d=Math.hypot(e.touches[0].clientX-e.touches[1].clientX,e.touches[0].clientY-e.touches[1].clientY);
        cam.targetRadius=Math.max(30,Math.min(120,cam.targetRadius-(d-pinchD)*0.25));
        pinchD=d; cam.lastInput=performance.now(); e.preventDefault();
      }
    };
    el.addEventListener("touchstart",onTS,{passive:false});
    el.addEventListener("touchmove",onTM,{passive:false});

    // Gyroscope
    const onDeviceOrientation=(e:DeviceOrientationEvent)=>{
      gyroRef.current.beta=e.beta??0;
      gyroRef.current.gamma=e.gamma??0;
    };
    window.addEventListener("deviceorientation",onDeviceOrientation);

    let energyCur=0.35,energyTgt=0.35,colorFrames=0,spin=0,burst=0;
    let currentTarget=forms.spiral;
    let saverArmed=false;
    let warp=0; // supernova pulse during form transitions

    // Click-to-spawn gravity wells — tap empty space to drop a temporary
    // black hole that pulls nearby stars into orbit before releasing them.
    // Lifespan is fixed at spawn time, so total pull strength can never
    // accumulate or run away — it only ever counts down to zero.
    const WELL_LIFE=3200, WELL_RADIUS=16, MAX_WELLS=4;
    type Well={x:number,y:number,z:number,born:number};
    const wells: Well[]=[];

    // Text-to-stars: whisper's key word spelled by all particles, then detonated
    const textTarget=new Float32Array(N*3);
    let spellUntil=0;
    let pendingForm: Float32Array|null=null;
    const fillTextTarget=(word:string):boolean=>{
      const cw=1024,ch=256;
      const tc=document.createElement("canvas"); tc.width=cw; tc.height=ch;
      const tx=tc.getContext("2d"); if (!tx) return false;
      tx.fillStyle="#000"; tx.fillRect(0,0,cw,ch);
      tx.fillStyle="#fff"; tx.textAlign="center"; tx.textBaseline="middle";
      let fs=190;
      tx.font=`900 ${fs}px Arial, sans-serif`;
      const tw=tx.measureText(word).width;
      if (tw>cw*0.88) fs=Math.floor(fs*(cw*0.88)/tw);
      tx.font=`900 ${fs}px Arial, sans-serif`;
      tx.fillText(word,cw/2,ch/2);
      const img=tx.getImageData(0,0,cw,ch).data;
      const pts:number[]=[];
      for (let py=0;py<ch;py+=3) for (let px=0;px<cw;px+=3) {
        if (img[(py*cw+px)*4]>128) pts.push(px,py);
      }
      if (pts.length<60) return false;
      const scale=62/cw;
      const nPts=pts.length/2;
      for (let i=0;i<N;i++) {
        const k=Math.floor(Math.random()*nPts)*2;
        textTarget[i*3]  =(pts[k]-cw/2)*scale+rn()*0.3;
        textTarget[i*3+1]=-(pts[k+1]-ch/2)*scale+rn()*0.3;
        textTarget[i*3+2]=rn()*0.9;
      }
      return true;
    };

    // Foreground stardust — close parallax layer for depth
    const DUST=260;
    const dustGeo=new THREE.BufferGeometry();
    const dustPos=new Float32Array(DUST*3);
    for (let i=0;i<DUST;i++) {
      const a=Math.random()*Math.PI*2,b=Math.acos(2*Math.random()-1),r=16+Math.random()*38;
      dustPos[i*3]=r*Math.sin(b)*Math.cos(a); dustPos[i*3+1]=r*Math.cos(b); dustPos[i*3+2]=r*Math.sin(b)*Math.sin(a);
    }
    dustGeo.setAttribute("position",new THREE.BufferAttribute(dustPos,3));
    const dustMat=new THREE.PointsMaterial({size:0.28,color:0xaab4dd,map:sprite,transparent:true,opacity:0.4,depthWrite:false,blending:THREE.AdditiveBlending,sizeAttenuation:true});
    const dust=new THREE.Points(dustGeo,dustMat);
    scene.add(dust);

    sceneRef.current={
      morph(pal:string[],fname:string,energy:number,spellWord?:string) {
        const f=FORMS.includes(fname as FormType)?(fname as FormType):"spiral";
        applyPalette(pal,colTgt); colorFrames=100;
        energyTgt=Math.max(0,Math.min(1,energy)); burst=Math.min(1,energy+0.35); coreMat.color.set(pal[2]);
        tintNebulae(pal);
        if (spellWord&&fillTextTarget(spellWord)) {
          // Stage 1: every particle flies into the word; stage 2 detonates into the galaxy
          currentTarget=textTarget; spellUntil=performance.now()+2600; pendingForm=forms[f]; warp=0.3;
          points.rotation.y=Math.PI/2-cam.theta; // face the viewer immediately
        } else {
          currentTarget=forms[f]; pendingForm=null; warp=1;
        }
      },
      rebuildStars(arr:SavedStar[]) {
        const n=Math.min(arr.length,CAP);
        for (let i=0;i<CAP;i++) {
          if (i<n) {
            const s=arr[i];
            memPos[i*3]=s.pos[0]; memPos[i*3+1]=s.pos[1]; memPos[i*3+2]=s.pos[2];
            const rgb=hexToRGB(s.palette[2]);
            memCol[i*3]=rgb[0]; memCol[i*3+1]=rgb[1]; memCol[i*3+2]=rgb[2];
          } else { memPos[i*3]=memPos[i*3+1]=memPos[i*3+2]=1e5; }
        }
        memGeo.setDrawRange(0,n);
        memGeo.attributes.position.needsUpdate=true;
        memGeo.attributes.color.needsUpdate=true;
        // Chronological constellation lines
        for (let i=0;i<CAP-1;i++) {
          if (i<n-1) {
            for (let k=0;k<3;k++) {
              memLinePos[i*6+k]  =arr[i].pos[k];
              memLinePos[i*6+3+k]=arr[i+1].pos[k];
            }
          } else {
            for (let k=0;k<6;k++) memLinePos[i*6+k]=1e5;
          }
        }
        memLineGeo.setDrawRange(0,Math.max(0,(n-1)*2));
        memLineGeo.attributes.position.needsUpdate=true;
      },
      snapshot(whisperText:string) {
        const W=mount.clientWidth,H=mount.clientHeight;
        renderer.setSize(1080,1920); composer.setSize(1080,1920);
        camera.aspect=1080/1920; camera.updateProjectionMatrix();
        composer.render();
        const out=document.createElement("canvas"); out.width=1080; out.height=1920;
        const o=out.getContext("2d")!;
        o.fillStyle="#050308"; o.fillRect(0,0,1080,1920);
        o.drawImage(renderer.domElement,0,0,1080,1920);
        const vg=o.createRadialGradient(540,760,200,540,960,1100);
        vg.addColorStop(0,"rgba(5,3,8,0)"); vg.addColorStop(1,"rgba(5,3,8,.72)");
        o.fillStyle=vg; o.fillRect(0,0,1080,1920);
        o.textAlign="center";
        o.fillStyle="rgba(220,216,255,.5)"; o.font="300 24px 'Helvetica Neue', Arial, sans-serif";
        o.fillText("A   WHISPER   TO   THE   VOID",540,250);
        o.fillStyle="#f3f0ff"; o.font="italic 400 54px Georgia, 'Times New Roman', serif";
        o.shadowColor="rgba(130,100,230,.85)"; o.shadowBlur=38;
        const words=(whisperText||"").split(" "); let line=""; const lines:string[]=[];
        for (const w of words) {
          if (o.measureText(line+w).width>880&&line){lines.push(line.trim());line=w+" ";}
          else line+=w+" ";
        }
        if (line.trim()) lines.push(line.trim());
        const startY=820-(lines.length-1)*36;
        lines.forEach((ln,i)=>o.fillText(ln,540,startY+i*72));
        o.shadowBlur=0;
        o.fillStyle="rgba(233,228,255,.92)"; o.font="300 34px 'Helvetica Neue', Arial, sans-serif";
        o.fillText("✦  AETHER",540,1770);
        o.fillStyle="rgba(200,196,235,.45)"; o.font="300 18px 'Helvetica Neue', Arial, sans-serif";
        o.fillText("A LIVING COSMOS",540,1812);
        const url=out.toDataURL("image/png");
        renderer.setSize(W,H); composer.setSize(W,H);
        camera.aspect=W/H; camera.updateProjectionMatrix();
        composer.render();
        return url;
      },
    };

    const onResize=()=>{
      if (!mountRef.current) return;
      const w=mountRef.current.clientWidth,h=mountRef.current.clientHeight;
      camera.aspect=w/h; camera.updateProjectionMatrix(); renderer.setSize(w,h);
      composer.setSize(w,h);
    };
    window.addEventListener("resize",onResize);

    let raf: number, lastT=performance.now();
    const posArr=geo.attributes.position.array as Float32Array;

    const loop=()=>{
      raf=requestAnimationFrame(loop);
      const now=performance.now();
      const dt=Math.min(0.05,(now-lastT)/1000);
      lastT=now;
      const t=now/1000;

      // Screensaver idle check
      const idle=now-lastActRef.current;
      if (!saverArmed&&idle>IDLE_SAVER) { saverArmed=true; setScreensaver(true); }
      if (idle<IDLE_SAVER&&saverArmed) { saverArmed=false; }

      if (burstRef.current>0) { burst=Math.max(burst,burstRef.current); burstRef.current=0; }
      burst=Math.max(0,burst-1.2*dt);

      cam.radius+=(cam.targetRadius-cam.radius)*(1-Math.exp(-2.8*dt));
      // Screensaver: faster auto-rotate
      const rotSpeed=saverArmed?0.18:0.04;
      if (!dragging&&now-cam.lastInput>2500) cam.theta+=rotSpeed*dt;
      updateCam();

      energyCur+=(energyTgt-energyCur)*(1-Math.exp(-1.5*dt));
      const displayEnergy=Math.max(energyCur,burst);
      warp=Math.max(0,warp-dt*0.8);
      // Stage 2 of text-to-stars: the word detonates into the galaxy
      if (pendingForm&&now>spellUntil) {
        currentTarget=pendingForm; pendingForm=null; warp=1;
        spin=points.rotation.y;
      }
      const spelling=pendingForm!==null;
      // Supernova pulse: expands mid-transition, swirls extra while warping
      const warpScale=1+Math.sin(warp*Math.PI)*0.42;
      if (spelling) {
        // Billboard the word toward the camera, hold steady
        let targetRot=Math.PI/2-cam.theta;
        const cur=points.rotation.y;
        targetRot=cur+Math.atan2(Math.sin(targetRot-cur),Math.cos(targetRot-cur));
        points.rotation.y=cur+(targetRot-cur)*0.14;
      } else {
        spin+=(0.06+displayEnergy*0.5+warp*1.6)*dt;
        points.rotation.y=spin;
      }
      bgStars.rotation.y=spin*0.06;
      memPoints.rotation.y=spin*0.12;
      memLines.rotation.y=spin*0.12;
      memLineMat.opacity=0.14+Math.sin(t*0.7)*0.07;
      nebulaGroup.rotation.y=-spin*0.045;
      dust.rotation.y=-spin*0.22;
      dust.rotation.x=Math.sin(t*0.05)*0.1;

      // Sound-reactive: the galaxy physically pulses to its own soundscape
      const aLvl=spelling?0:(sceneRef.current.getAudioLevel?.()??0);
      // Particles calm down to hold the word legibly, then resume breathing
      const amp=displayEnergy*8*(spelling?0.08:1)+aLvl*7;
      // Framerate-independent convergence — same speed on 30fps phones and 144Hz displays
      const morphRate=spelling?5.4:2.4+warp*1.9;
      const morphK=1-Math.exp(-morphRate*dt);
      for (let i=0;i<N;i++) {
        const j=i*3, spd=0.5+tArr[i]*0.4;
        base[j]  +=(currentTarget[j]  -base[j]  )*morphK;
        base[j+1]+=(currentTarget[j+1]-base[j+1])*morphK;
        base[j+2]+=(currentTarget[j+2]-base[j+2])*morphK;
        const ph=phase[i];
        posArr[j]  =base[j]  *warpScale+Math.sin(t*spd      +ph      )*amp;
        posArr[j+1]=base[j+1]*warpScale+Math.sin(t*spd*1.3  +ph*1.7  )*amp;
        posArr[j+2]=base[j+2]*warpScale+Math.cos(t*spd*0.9  +ph      )*amp;
      }

      // Cursor gravity — particles attracted toward mouse world position
      if (mouseRef.current.active&&displayEnergy>0.05) {
        mouseV.x=mouseRef.current.x;
        mouseV.y=mouseRef.current.y;
        gravRay.setFromCamera(mouseV,camera);
        if (gravRay.ray.intersectPlane(gravPlane,gravTarget)) {
          const GR=20, GS=0.0015*(0.3+displayEnergy*0.7);
          const gx=gravTarget.x, gy=gravTarget.y, gz=gravTarget.z;
          for (let i=0;i<N;i+=3) { // every 3rd particle for performance
            const j=i*3;
            const dx=gx-posArr[j], dy=gy-posArr[j+1], dz=gz-posArr[j+2];
            const d2=dx*dx+dy*dy+dz*dz;
            if (d2<GR*GR&&d2>0.01) {
              const k=GS*(1-Math.sqrt(d2)/GR);
              posArr[j]  +=dx*k;
              posArr[j+1]+=dy*k;
              posArr[j+2]+=dz*k;
            }
          }
        }
      }

      // Gravity wells — orbital pull (radial attract + tangential swirl) that
      // fades out over a fixed lifespan. `env` is a pure function of age vs.
      // life, always in [0,1] by construction (clamped), so there is no path
      // for this to accumulate or brighten over time the way the old trail
      // shader bug did — it only ever counts down.
      if (wells.length) {
        for (let w=wells.length-1;w>=0;w--) {
          const well=wells[w];
          const age=now-well.born;
          if (age>WELL_LIFE) { wells.splice(w,1); continue; }
          const tNorm=age/WELL_LIFE;
          // Quick attack, slow release — snaps in, drifts apart at the end.
          const env=Math.max(0,Math.min(1, tNorm<0.12 ? tNorm/0.12 : 1-((tNorm-0.12)/0.88) ));
          const pull=0.0026*env, swirl=0.0016*env;
          const wx=well.x, wy=well.y, wz=well.z;
          for (let i=0;i<N;i+=2) {
            const j=i*3;
            const dx=wx-posArr[j], dy=wy-posArr[j+1], dz=wz-posArr[j+2];
            const d2=dx*dx+dy*dy+dz*dz;
            if (d2<WELL_RADIUS*WELL_RADIUS&&d2>0.04) {
              const dist=Math.sqrt(d2);
              const falloff=1-dist/WELL_RADIUS;
              const k=pull*falloff;
              posArr[j]  +=dx*k;
              posArr[j+1]+=dy*k;
              posArr[j+2]+=dz*k;
              // Tangential component (around the well's local "up") for orbit,
              // not just collapse straight into the point.
              const sk=swirl*falloff;
              posArr[j]  += dz*sk;
              posArr[j+2]+= -dx*sk;
            }
          }
        }
      }

      geo.attributes.position.needsUpdate=true;

      if (colorFrames>0) {
        const colK=1-Math.exp(-3.3*dt);
        for (let i=0;i<N*3;i++) colCur[i]+=(colTgt[i]-colCur[i])*colK;
        geo.attributes.color.needsUpdate=true;
        colorFrames--;
      }

      const pulse=1+Math.sin(t*(1.5+displayEnergy*3))*(0.12+displayEnergy*0.28);
      core.scale.set(14*pulse,14*pulse,1);
      coreMat.opacity=0.5+displayEnergy*0.45;
      (memMat as any).size=3.2+Math.sin(t*1.3)*0.5;
      memMat.opacity=0.8+Math.sin(t*0.9)*0.18;
      matUniforms.uTime.value=t;
      // Tiny crisp particles while spelling so letterforms stay readable
      matUniforms.uSize.value=(0.9+displayEnergy*0.6+aLvl*0.5)*(spelling?0.42:1);
      bloom.strength=spelling?0.2:0.3+displayEnergy*0.35+warp*0.35+aLvl*0.3;
      (afterimage.uniforms as any).damp.value=spelling?0.05:Math.min(0.82,0.28+displayEnergy*0.15+warp*0.45);
      cinematic.uniforms.uTime.value=t;
      cinematic.uniforms.uWarp.value=Math.sin(warp*Math.PI);
      // Real local time → warm midday (+1), cold small-hours (-1)
      const hr=new Date().getHours()+new Date().getMinutes()/60;
      cinematic.uniforms.uTod.value=Math.cos((hr-14)/24*Math.PI*2);

      // Shooting stars
      if (now>nextMeteor) { spawnMeteor(); nextMeteor=now+5000+Math.random()*11000; }
      let anyMeteor=false;
      meteorState.forEach((m,i)=>{
        const j=i*6;
        if (!m.active) { meteorPos[j]=1e5; meteorPos[j+3]=1e5; return; }
        anyMeteor=true;
        m.x+=m.vx*dt; m.y+=m.vy*dt; m.z+=m.vz*dt;
        m.life-=dt*0.55;
        if (m.life<=0) { m.active=false; meteorPos[j]=1e5; meteorPos[j+3]=1e5; return; }
        const trail=0.09;
        meteorPos[j]  =m.x; meteorPos[j+1]=m.y; meteorPos[j+2]=m.z;
        meteorPos[j+3]=m.x-m.vx*trail; meteorPos[j+4]=m.y-m.vy*trail; meteorPos[j+5]=m.z-m.vz*trail;
      });
      meteorMat.opacity=anyMeteor?0.75:0;
      meteorGeo.attributes.position.needsUpdate=true;

      composer.render();
    };
    loop();

    setTimeout(()=>setShow(true),350);

    // Voice recognition availability check
    if (typeof window!=="undefined"&&("SpeechRecognition" in window||"webkitSpeechRecognition" in window)) {
      setHasVoice(true);
    }

    return ()=>{
      cancelAnimationFrame(raf);
      window.removeEventListener("resize",onResize);
      window.removeEventListener("pointermove",onMove);
      window.removeEventListener("pointerup",onUp);
      window.removeEventListener("keydown",markAct);
      window.removeEventListener("deviceorientation",onDeviceOrientation);
      el.removeEventListener("pointerdown",onDown);
      el.removeEventListener("mousemove",onMouseMove);
      el.removeEventListener("mouseleave",onMouseLeave);
      el.removeEventListener("touchstart",onTS);
      el.removeEventListener("touchmove",onTM);
      geo.dispose(); mat.dispose(); sGeo.dispose(); sprite.dispose();
      (bgStars.material as THREE.Material).dispose();
      memGeo.dispose(); memMat.dispose(); memLineGeo.dispose(); memLineMat.dispose(); coreMat.dispose();
      meteorGeo.dispose(); meteorMat.dispose();
      nebulaMats.forEach(nm=>nm.dispose());
      dustGeo.dispose(); dustMat.dispose();
      composer.dispose(); renderer.dispose();
      if (el.parentNode) el.parentNode.removeChild(el);
      if (voiceRef.current) { try { voiceRef.current.stop(); } catch {} }
    };
  }, []);

  // ── React logic ─────────────────────────────────────────────────────────────

  const showMorphLabel=useCallback((fm:FormType)=>{
    const id=++morphCounter.current;
    setMorphLabel({label:FORM_LABELS[fm],id});
    setTimeout(()=>setMorphLabel(m=>(m?.id===id?null:m)),2400);
  },[]);

  const bumpStreak=useCallback(()=>{
    try {
      const today=new Date().toISOString().slice(0,10);
      const raw=localStorage.getItem("aether_streak");
      const st=raw?JSON.parse(raw):{last:"",n:0};
      if (st.last===today) { setStreak(st.n); return; }
      const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
      const n=st.last===y?st.n+1:1;
      localStorage.setItem("aether_streak",JSON.stringify({last:today,n}));
      setStreak(n);
    } catch {}
  },[]);

  const remember=useCallback((s:SavedStar)=>{
    starsRef.current=[...starsRef.current,s].slice(-CAP);
    sceneRef.current.rebuildStars?.(starsRef.current);
    setList([...starsRef.current].reverse());
    setCount(starsRef.current.length);
    try { localStorage.setItem("aether_stars",JSON.stringify(starsRef.current)); } catch {}
    bumpStreak();
    fetch("/api/save",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify(s)})
      .then(r=>r.json())
      .then(d=>{ if (d?.ok&&d.id) setShareId(d.id); })
      .catch(()=>{});
  },[bumpStreak]);

  // Cinematic intro — the cosmos introduces itself, spelled in stars
  useEffect(()=>{
    const t=setTimeout(()=>{
      sceneRef.current.morph?.(FALLBACK_PALETTES[0],"spiral",0.5,"AETHER");
    },1100);
    return ()=>clearTimeout(t);
  },[]);

  // First Contact — gently guide brand-new visitors to their first whisper
  useEffect(()=>{
    try {
      if (localStorage.getItem("aether_visited")) return;
    } catch { return; }
    const t=setTimeout(()=>setFirstContact(true),7000);
    return ()=>clearTimeout(t);
  },[]);

  // Restore constellation + streak from previous visits
  useEffect(()=>{
    try {
      const raw=localStorage.getItem("aether_stars");
      if (raw) {
        const arr=JSON.parse(raw) as SavedStar[];
        if (Array.isArray(arr)&&arr.length) {
          starsRef.current=arr.slice(-CAP);
          setList([...starsRef.current].reverse());
          setCount(starsRef.current.length);
          // Scene may still be booting on first tick
          const t=setTimeout(()=>sceneRef.current.rebuildStars?.(starsRef.current),400);
          return ()=>clearTimeout(t);
        }
      }
    } catch {}
  },[]);
  useEffect(()=>{
    try {
      const raw=localStorage.getItem("aether_streak");
      if (raw) {
        const st=JSON.parse(raw);
        const today=new Date().toISOString().slice(0,10);
        const y=new Date(Date.now()-864e5).toISOString().slice(0,10);
        if (st.last===today||st.last===y) setStreak(st.n);
      }
    } catch {}
  },[]);

  const applyResult=useCallback((pal:string[],fm:FormType,en:number,text:string,save?:string)=>{
    // Spell the thought's most powerful word in stars before the galaxy forms
    const word=save
      ?save.split(/\s+/).map(w=>w.replace(/[^a-zA-Z0-9]/g,"")).sort((a,b)=>b.length-a.length)[0]?.toUpperCase().slice(0,12)
      :undefined;
    sceneRef.current.morph?.(pal,fm,en,word&&word.length>=2?word:undefined);
    setForm(fm); setAccentColor(pal[2]||"#b892ff"); lastEnergy.current=en;
    if (audioRef.current) audioRef.current.transition(fm,en);
    showMorphLabel(fm);
    if (save) remember({id:Date.now(),thought:save,whisper:text,palette:pal,form:fm,energy:en,pos:starPos()});
    setWhisper(text);
  },[remember,showMorphLabel]);

  const fallback=useCallback((text:string)=>{
    const h=hashStr(text||"void");
    applyResult(FALLBACK_PALETTES[h%FALLBACK_PALETTES.length],FORMS[h%FORMS.length],Math.min(1,0.25+(text.length%80)/90),FALLBACK_LINES[h%FALLBACK_LINES.length],text);
  },[applyResult]);

  const release=useCallback(async(raw:string)=>{
    const text=raw.trim();
    if (!text||loading) return;
    setLoading(true); setThought(""); burstRef.current=0.8;
    setFirstContact(false);
    try{localStorage.setItem("aether_visited","1");}catch{}
    lastActRef.current=performance.now();
    try{navigator.vibrate?.(25);}catch{}
    try {
      const res=await fetch("/api/whisper",{method:"POST",headers:{"Content-Type":"application/json"},body:JSON.stringify({thought:text})});
      if (!res.ok) throw new Error("api");
      const data=await res.json();
      const pal:string[]=Array.isArray(data.palette)&&data.palette.length>=3?data.palette.slice(0,3):FALLBACK_PALETTES[0];
      const fm:FormType=FORMS.includes(data.form)?data.form:"spiral";
      applyResult(pal,fm,typeof data.energy==="number"?data.energy:0.5,String(data.whisper||FALLBACK_LINES[0]).slice(0,180),text);
    } catch { fallback(text); }
    finally { setLoading(false); }
  },[loading,applyResult,fallback]);

  const ask=useCallback(()=>release(thought),[release,thought]);

  const toggleSound=()=>{
    if (!audioRef.current) audioRef.current=makeAudio();
    if (!audioRef.current) return;
    if (sound){audioRef.current.off();setSound(false);}
    else{
      audioRef.current.on();setSound(true);
      sceneRef.current.getAudioLevel=()=>audioRef.current?.level()??0;
    }
  };

  const revisit=useCallback((s:SavedStar)=>{
    sceneRef.current.morph?.(s.palette,s.form,s.energy);
    setForm(s.form); setAccentColor(s.palette[2]||"#b892ff"); setWhisper(s.whisper);
    lastEnergy.current=s.energy;
    if (audioRef.current) audioRef.current.transition(s.form,s.energy);
    showMorphLabel(s.form); setPanel(false);
  },[showMorphLabel]);

  useEffect(()=>{sceneRef.current.onStarTap=(i:number)=>{const s=starsRef.current[i];if(s)revisit(s);};});

  const capture=()=>{ try{setCaptureURL(sceneRef.current.snapshot?.(whisper)??null);}catch{} };

  // "Week in Stars" — shareable recap card drawn from your constellation
  const weekCard=useCallback(()=>{
    const stars=starsRef.current;
    if (!stars.length) return;
    const c=document.createElement("canvas"); c.width=1080; c.height=1920;
    const o=c.getContext("2d"); if (!o) return;
    const bg=o.createLinearGradient(0,0,0,1920);
    bg.addColorStop(0,"#050310"); bg.addColorStop(0.6,"#0a0620"); bg.addColorStop(1,"#050310");
    o.fillStyle=bg; o.fillRect(0,0,1080,1920);
    for (let i=0;i<170;i++) {
      o.globalAlpha=0.08+Math.random()*0.4;
      o.fillStyle="#cfd3ff";
      o.beginPath(); o.arc(Math.random()*1080,Math.random()*1920,0.5+Math.random()*1.3,0,Math.PI*2); o.fill();
    }
    o.globalAlpha=1; o.textAlign="center";
    o.fillStyle="rgba(220,216,255,.55)"; o.font="300 26px 'Helvetica Neue', Arial, sans-serif";
    o.fillText("M Y   W E E K   I N   T H E   C O S M O S",540,210);
    // Constellation plot — most recent 14 stars, connected chronologically
    const recent=stars.slice(-14);
    const px=(p:[number,number,number])=>540+p[0]*4.6;
    const py=(p:[number,number,number])=>830+p[1]*4.6;
    o.strokeStyle="rgba(150,160,230,.4)"; o.lineWidth=1.6;
    o.beginPath();
    recent.forEach((s,i)=>{ const x=px(s.pos),y=py(s.pos); i===0?o.moveTo(x,y):o.lineTo(x,y); });
    o.stroke();
    recent.forEach(s=>{
      const col=s.palette[2]||"#b892ff";
      o.shadowColor=col; o.shadowBlur=26; o.fillStyle=col;
      o.beginPath(); o.arc(px(s.pos),py(s.pos),9,0,Math.PI*2); o.fill();
    });
    o.shadowBlur=0;
    // Stats
    o.fillStyle="#f3f0ff"; o.font="100 130px Georgia, serif";
    o.fillText(String(stars.length),540,1420);
    o.fillStyle="rgba(200,196,235,.5)"; o.font="300 24px 'Helvetica Neue', Arial, sans-serif";
    o.fillText(`THOUGHT${stars.length===1?"":"S"} BECAME STARS${streak>1?`   ·   DAY ${streak} STREAK`:""}`,540,1478);
    // Best whisper
    const best=[...stars].sort((a,b)=>b.whisper.length-a.whisper.length)[0];
    if (best) {
      o.fillStyle="rgba(233,228,255,.85)"; o.font="italic 400 40px Georgia, serif";
      o.shadowColor="rgba(130,100,230,.8)"; o.shadowBlur=28;
      const words=best.whisper.split(" "); let line=""; const lines:string[]=[];
      for (const w of words) {
        if (o.measureText(line+w).width>860&&line){lines.push(line.trim());line=w+" ";}
        else line+=w+" ";
      }
      if (line.trim()) lines.push(line.trim());
      lines.slice(0,3).forEach((ln,i)=>o.fillText(ln,540,1580+i*56));
      o.shadowBlur=0;
    }
    o.fillStyle="rgba(233,228,255,.92)"; o.font="300 32px 'Helvetica Neue', Arial, sans-serif";
    o.fillText("✦  AETHER",540,1800);
    o.fillStyle="rgba(200,196,235,.4)"; o.font="300 17px 'Helvetica Neue', Arial, sans-serif";
    o.fillText("A LIVING COSMOS",540,1840);
    setCaptureURL(c.toDataURL("image/png"));
    setPanel(false);
  },[streak]);
  const clearStars=()=>{ starsRef.current=[];sceneRef.current.rebuildStars?.([]);setList([]);setCount(0); try{localStorage.removeItem("aether_stars");}catch{} };

  const shareWhisper=useCallback(async()=>{
    const link=shareId?`${window.location.origin}/w/${shareId}`:window.location.origin;
    // Native share sheet with the image when supported (mobile)
    if (captureURL&&navigator.share) {
      try {
        const blob=await (await fetch(captureURL)).blob();
        const file=new File([blob],"aether-whisper.png",{type:"image/png"});
        if (navigator.canShare?.({files:[file]})) {
          await navigator.share({title:"AETHER",text:`"${whisper}" — my galaxy on Aether`,url:link,files:[file]});
          return;
        }
        await navigator.share({title:"AETHER",text:`"${whisper}"`,url:link});
        return;
      } catch {}
    }
    // Desktop fallback: copy link
    try {
      await navigator.clipboard.writeText(`"${whisper}" — ${link}`);
      setCopied(true); setTimeout(()=>setCopied(false),2200);
    } catch {}
  },[shareId,captureURL,whisper]);

  const toggleVoice=useCallback(()=>{
    if (!hasVoice) return;
    if (voiceActive) {
      try{voiceRef.current?.stop();}catch{}
      setVoiceActive(false);
      return;
    }
    const SpeechRec=(window as any).SpeechRecognition||(window as any).webkitSpeechRecognition;
    if (!SpeechRec) return;
    const rec=new SpeechRec();
    rec.lang="en-US"; rec.continuous=false; rec.interimResults=false;
    rec.onresult=(e:any)=>{
      const transcript=e.results[0]?.[0]?.transcript||"";
      if (transcript.trim()) { setThought(transcript); }
      setVoiceActive(false);
    };
    rec.onerror=()=>setVoiceActive(false);
    rec.onend=()=>setVoiceActive(false);
    try{rec.start(); voiceRef.current=rec; setVoiceActive(true);}catch{setVoiceActive(false);}
  },[hasVoice,voiceActive]);

  const wakeFromSaver=useCallback(()=>{ lastActRef.current=performance.now(); setScreensaver(false); },[]);

  // Galaxy Explorer — browse all 30 forms directly
  const exploreForm=useCallback((fm:FormType,i:number)=>{
    const pal=FALLBACK_PALETTES[i%FALLBACK_PALETTES.length];
    sceneRef.current.morph?.(pal,fm,0.55);
    setForm(fm); setAccentColor(pal[2]);
    if (audioRef.current) audioRef.current.transition(fm,0.55);
    showMorphLabel(fm);
    lastActRef.current=performance.now();
  },[showMorphLabel]);

  // Ambient tour — while the screensaver runs, drift through random galaxies
  useEffect(()=>{
    if (!screensaver) return;
    const iv=setInterval(()=>{
      const i=Math.floor(Math.random()*FORMS.length);
      const fm=FORMS[i];
      const pal=FALLBACK_PALETTES[i%FALLBACK_PALETTES.length];
      sceneRef.current.morph?.(pal,fm,0.4);
      setForm(fm); setAccentColor(pal[2]);
      showMorphLabel(fm);
    },11000);
    return ()=>clearInterval(iv);
  },[screensaver,showMorphLabel]);

  // Step through the 30 forms with arrow keys
  const stepForm=useCallback((dir:number)=>{
    const cur=FORMS.indexOf(form);
    const i=((cur<0?0:cur)+dir+FORMS.length)%FORMS.length;
    exploreForm(FORMS[i],i);
  },[form,exploreForm]);

  // Global keyboard shortcuts (ignored while typing in the whisper box)
  useEffect(()=>{
    const onKey=(e:KeyboardEvent)=>{
      if (e.key==="Escape") { setZen(false); setExplore(false); setPanel(false); setCaptureURL(null); return; }
      const el=document.activeElement;
      if (el&&(el.tagName==="TEXTAREA"||el.tagName==="INPUT")) return;
      if (e.metaKey||e.ctrlKey||e.altKey) return;
      switch (e.key) {
        case "ArrowRight": case "ArrowDown": e.preventDefault(); stepForm(1); break;
        case "ArrowLeft":  case "ArrowUp":   e.preventDefault(); stepForm(-1); break;
        case "z": case "Z": setZen(v=>!v); break;
        case "e": case "E": setExplore(v=>!v); break;
        case "s": case "S": toggleSound(); break;
        case "c": case "C": capture(); break;
        case " ": e.preventDefault(); { const i=Math.floor(Math.random()*FORMS.length); exploreForm(FORMS[i],i); } break;
      }
    };
    window.addEventListener("keydown",onKey);
    return ()=>window.removeEventListener("keydown",onKey);
  },[stepForm,exploreForm,toggleSound,capture]);

  const ui={opacity:show&&!zen?1:0,transition:"opacity 1.2s ease",pointerEvents:(show&&!zen?"auto":"none") as React.CSSProperties["pointerEvents"]};
  const a44=accentColor+"44";
  const a66=accentColor+"66";
  const a88=accentColor+"88";
  const abb=accentColor+"bb";

  // ── Render ──────────────────────────────────────────────────────────────────
  return (
    <div style={{position:"absolute",inset:0,overflow:"hidden",background:"#050308",fontFamily:"'Helvetica Neue', Arial, sans-serif"}}>
      <div ref={mountRef} style={{position:"absolute",inset:0,touchAction:"none",cursor:"grab"}} />

      {/* Vignette */}
      <div style={{position:"absolute",inset:0,pointerEvents:"none",background:"radial-gradient(circle at 50% 42%, transparent 32%, rgba(5,3,8,.62) 100%)"}} />

      {/* Screensaver overlay — click anywhere to wake */}
      <AnimatePresence>
        {screensaver&&(
          <motion.div
            key="screensaver"
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            transition={{duration:2}}
            onClick={wakeFromSaver}
            style={{position:"absolute",inset:0,zIndex:20,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",flexDirection:"column",gap:8}}
          >
            <div style={{color:"rgba(200,196,235,.25)",fontSize:10,letterSpacing:"0.45em",pointerEvents:"none"}}>AETHER</div>
            <div style={{color:"rgba(200,196,235,.13)",fontSize:8,letterSpacing:"0.28em",marginTop:4,pointerEvents:"none"}}>TOUCH TO RETURN</div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Galaxy type morph reveal */}
      <AnimatePresence>
        {morphLabel&&(
          <motion.div
            key={morphLabel.id}
            initial={{opacity:0,scale:0.93}} animate={{opacity:1,scale:1}}
            exit={{opacity:0,scale:1.06,transition:{duration:1.8,ease:"easeIn"}}}
            transition={{duration:0.38}}
            style={{position:"absolute",inset:0,display:"flex",alignItems:"center",justifyContent:"center",pointerEvents:"none",zIndex:3,padding:"0 24px"}}
          >
            {/* Dark scrim so the label reads over any galaxy brightness */}
            <div style={{position:"absolute",inset:0,background:"radial-gradient(ellipse 70% 30% at 50% 50%, rgba(3,2,8,0.72) 0%, rgba(3,2,8,0.35) 55%, transparent 100%)"}} />
            <div style={{position:"relative",color:"#ffffff",fontSize:"clamp(18px, 5vw, 60px)",letterSpacing:"0.46em",fontWeight:200,textShadow:`0 0 24px ${accentColor}, 0 0 70px ${abb}, 0 0 130px ${a66}, 0 2px 6px rgba(0,0,0,0.9)`,fontFamily:"'Helvetica Neue', Arial, sans-serif",textAlign:"center"}}>
              {morphLabel.label}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Header */}
      <div style={{position:"absolute",top:22,left:24,...ui,pointerEvents:"none"}}>
        <div style={{color:"#eceaff",fontSize:13,letterSpacing:"0.62em",fontWeight:300,textShadow:`0 0 28px ${a66}`}}>
          A E T H E R
        </div>
        <div style={{color:"rgba(200,196,235,.38)",fontSize:9,letterSpacing:"0.32em",marginTop:5}}>
          A LIVING COSMOS
        </div>
        {streak>0&&(
          <div style={{color:accentColor,fontSize:8.5,letterSpacing:"0.26em",marginTop:7,opacity:0.75,textShadow:`0 0 12px ${a66}`}}>
            ✦ DAY {streak} IN YOUR COSMOS
          </div>
        )}
      </div>

      {/* Controls — top right */}
      <div style={{position:"absolute",top:22,right:24,display:"flex",flexDirection:"column",alignItems:"flex-end",...ui}}>
        <div style={{color:accentColor,fontSize:9,letterSpacing:"0.28em",marginBottom:5,pointerEvents:"none",fontWeight:400,textShadow:`0 0 14px ${a88}`,transition:"color 0.8s ease, text-shadow 0.8s ease"}}>
          {FORM_LABELS[form]}
        </div>
        {([
          ["SOUND · "+(sound?"ON":"OFF"),toggleSound],
          ["STARS · "+count,()=>setPanel(p=>!p)],
          ["EXPLORE · 30",()=>setExplore(e=>!e)],
          ["ZEN MODE",()=>setZen(true)],
          ["CAPTURE ✦",capture],
        ] as [string,()=>void][]).map(([label,fn])=>(
          <button key={label} onClick={fn}
            style={{display:"block",background:"none",border:"none",color:"rgba(214,210,245,.6)",fontSize:10,letterSpacing:"0.2em",padding:"5px 0",cursor:"pointer",textAlign:"right",fontFamily:"inherit"}}>
            {label}
          </button>
        ))}
      </div>

      {/* Whisper */}
      <div style={{position:"absolute",left:0,right:0,top:"18%",display:"flex",justifyContent:"center",padding:"0 36px",pointerEvents:"none",opacity:zen?0:1,transition:"opacity 1.2s ease"}}>
        <AnimatePresence mode="wait">
          <motion.div
            key={loading?"__loading__":whisper}
            initial={{opacity:0,y:14}} animate={{opacity:1,y:0}} exit={{opacity:0,y:-10}}
            transition={{duration:1.2,ease:[0.22,1,0.36,1]}}
            style={{maxWidth:660,textAlign:"center",color:"#f5f2ff",fontFamily:"Georgia, 'Times New Roman', 'Palatino Linotype', serif",fontStyle:"italic",fontSize:"clamp(19px, 3.4vw, 34px)",lineHeight:1.62,letterSpacing:"0.012em",textShadow:`0 0 44px ${a66}, 0 0 90px ${a44}, 0 2px 4px rgba(0,0,0,.5)`,transition:"text-shadow 0.9s ease"}}
          >
            {loading?"Aether is contemplating…":whisper}
          </motion.div>
        </AnimatePresence>
      </div>

      {/* First Contact — guided first whisper */}
      <AnimatePresence>
        {firstContact&&!zen&&!loading&&(
          <motion.div
            initial={{opacity:0,y:16}} animate={{opacity:1,y:0}} exit={{opacity:0,y:10}}
            transition={{duration:1.4,ease:[0.22,1,0.36,1]}}
            style={{position:"absolute",left:0,right:0,bottom:96,display:"flex",flexDirection:"column",alignItems:"center",gap:12,padding:"0 18px",zIndex:2}}
          >
            <div style={{color:"rgba(200,196,235,.5)",fontSize:12,fontFamily:"Georgia, serif",fontStyle:"italic",textShadow:"0 1px 8px rgba(0,0,0,.8)"}}>
              Try whispering one of these to the void…
            </div>
            <div style={{display:"flex",gap:10,flexWrap:"wrap",justifyContent:"center"}}>
              {["the calm before a storm","someone I still miss","infinite possibility"].map(chip=>(
                <button key={chip} onClick={()=>release(chip)}
                  style={{background:"rgba(14,10,28,.72)",backdropFilter:"blur(12px)",border:`1px solid ${a44}`,color:"rgba(226,222,255,.85)",borderRadius:999,padding:"9px 18px",fontSize:12.5,fontFamily:"Georgia, serif",fontStyle:"italic",cursor:"pointer",boxShadow:`0 0 16px ${a44}`,transition:"all 0.35s ease"}}
                  onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.borderColor=a88;(e.currentTarget as HTMLElement).style.color="#fff";}}
                  onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.borderColor=a44;(e.currentTarget as HTMLElement).style.color="rgba(226,222,255,.85)";}}>
                  {chip}
                </button>
              ))}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Input */}
      <div style={{position:"absolute",left:0,right:0,bottom:28,display:"flex",justifyContent:"center",padding:"0 18px",...ui}}>
        <div style={{width:"100%",maxWidth:580,display:"flex",gap:8,alignItems:"center"}}>
          {hasVoice&&(
            <button
              onClick={toggleVoice}
              title={voiceActive?"Stop listening":"Speak your thought"}
              style={{
                background:voiceActive?`rgba(255,80,80,0.2)`:`rgba(14,10,28,.65)`,
                backdropFilter:"blur(14px)",
                border:`1px solid ${voiceActive?"rgba(255,80,80,.55)":a44}`,
                color:voiceActive?"rgba(255,140,140,.9)":accentColor,
                borderRadius:999,
                width:46,height:46,
                display:"flex",alignItems:"center",justifyContent:"center",
                cursor:"pointer",
                fontSize:16,
                flexShrink:0,
                boxShadow:voiceActive?`0 0 20px rgba(255,80,80,.3)`:undefined,
                transition:"all 0.3s ease",
              }}
            >
              {voiceActive?"◉":"🎙"}
            </button>
          )}
          <textarea
            value={thought}
            disabled={loading}
            rows={1}
            onChange={e=>setThought(e.target.value)}
            onKeyDown={e=>{if(e.key==="Enter"&&!e.shiftKey){e.preventDefault();ask();}}}
            onFocus={()=>setInputFocused(true)}
            onBlur={()=>setInputFocused(false)}
            placeholder="whisper a thought to the cosmos…"
            style={{flex:1,background:"rgba(14,10,28,.65)",backdropFilter:"blur(14px)",border:`1px solid ${inputFocused?a66:"rgba(150,130,230,.26)"}`,borderRadius:999,color:"#eee9ff",fontSize:15,padding:"13px 22px",fontFamily:"inherit",resize:"none",outline:"none",lineHeight:1.4,boxShadow:inputFocused?`0 0 24px ${a44}, inset 0 0 12px rgba(0,0,0,.3)`:"none",transition:"border-color 0.4s ease, box-shadow 0.4s ease"}}
          />
          <button
            onClick={ask}
            disabled={loading}
            style={{background:`linear-gradient(135deg, ${a44}, ${a88}22)`,border:`1px solid ${a66}`,color:"#ece8ff",borderRadius:999,padding:"13px 24px",fontSize:13,letterSpacing:"0.18em",cursor:loading?"default":"pointer",whiteSpace:"nowrap",fontFamily:"inherit",boxShadow:loading?"none":`0 0 22px ${a44}`,transition:"all 0.4s ease"}}
          >
            {loading?"···":"RELEASE"}
          </button>
        </div>
      </div>

      {/* Hint */}
      <div style={{position:"absolute",bottom:8,left:0,right:0,textAlign:"center",color:"rgba(190,186,225,.25)",fontSize:9,letterSpacing:"0.22em",pointerEvents:"none",opacity:zen?0:1,transition:"opacity 1.2s ease"}}>
        DRAG TO ORBIT · PINCH TO ZOOM · TAP A STAR TO REVISIT
      </div>

      {/* Zen mode exit */}
      {zen&&(
        <button onClick={()=>setZen(false)}
          style={{position:"absolute",top:20,right:20,zIndex:6,background:"rgba(10,6,22,0.4)",backdropFilter:"blur(8px)",border:"1px solid rgba(184,146,255,0.14)",color:"rgba(200,196,235,0.3)",borderRadius:999,padding:"8px 16px",fontSize:8.5,letterSpacing:"0.3em",cursor:"pointer",fontFamily:"inherit",transition:"all 0.4s ease"}}
          onMouseEnter={e=>{(e.currentTarget as HTMLElement).style.color="rgba(200,196,235,0.75)";}}
          onMouseLeave={e=>{(e.currentTarget as HTMLElement).style.color="rgba(200,196,235,0.3)";}}>
          EXIT ZEN
        </button>
      )}

      {/* Galaxy Explorer panel — browse all 30 forms */}
      <AnimatePresence>
        {explore&&(
          <motion.div
            initial={{x:-340}} animate={{x:0}} exit={{x:-340}}
            transition={{type:"spring",damping:28,stiffness:280}}
            style={{position:"absolute",top:0,left:0,bottom:0,width:"min(300px, 82vw)",background:"rgba(7,4,14,.9)",backdropFilter:"blur(20px)",borderRight:`1px solid ${a44}`,display:"flex",flexDirection:"column",zIndex:5}}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 22px 6px"}}>
              <div style={{color:"#e9e6ff",fontSize:11,letterSpacing:"0.3em"}}>GALAXY EXPLORER</div>
              <button onClick={()=>setExplore(false)} style={{background:"none",border:"none",color:"rgba(220,216,255,.55)",fontSize:18,cursor:"pointer"}}>&times;</button>
            </div>
            <div style={{color:"rgba(200,196,235,.34)",fontSize:11,padding:"0 22px 12px",fontStyle:"italic",fontFamily:"Georgia, serif"}}>
              30 living forms. Tap any to become it.
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"0 10px 16px"}}>
              {FORMS.map((f,i)=>{
                const c=FALLBACK_PALETTES[i%FALLBACK_PALETTES.length][2];
                const active=f===form;
                return (
                  <button key={f} onClick={()=>exploreForm(f,i)}
                    style={{display:"flex",alignItems:"center",gap:11,width:"100%",textAlign:"left",background:active?`${c}18`:"none",border:"none",borderLeft:active?`2px solid ${c}`:"2px solid transparent",padding:"9px 12px",cursor:"pointer",borderRadius:6}}>
                    <span style={{width:7,height:7,borderRadius:99,background:c,boxShadow:`0 0 9px ${c}`,flexShrink:0}}/>
                    <span style={{color:active?"#fff":"rgba(216,212,242,.72)",fontSize:10.5,letterSpacing:"0.22em",fontFamily:"'Helvetica Neue', Arial, sans-serif"}}>
                      {FORM_LABELS[f]}
                    </span>
                  </button>
                );
              })}
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      {/* Stars panel */}
      <AnimatePresence>
        {panel&&(
          <motion.div
            initial={{x:340}} animate={{x:0}} exit={{x:340}}
            transition={{type:"spring",damping:28,stiffness:280}}
            style={{position:"absolute",top:0,right:0,bottom:0,width:"min(320px, 84vw)",background:"rgba(7,4,14,.9)",backdropFilter:"blur(20px)",borderLeft:`1px solid ${a44}`,display:"flex",flexDirection:"column",zIndex:5}}
          >
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",padding:"20px 22px 12px"}}>
              <div style={{color:"#e9e6ff",fontSize:11,letterSpacing:"0.3em"}}>YOUR CONSTELLATION</div>
              <button onClick={()=>setPanel(false)} style={{background:"none",border:"none",color:"rgba(220,216,255,.55)",fontSize:18,cursor:"pointer"}}>&times;</button>
            </div>
            <div style={{flex:1,overflowY:"auto",padding:"0 12px"}}>
              {list.length===0&&(
                <div style={{color:"rgba(200,196,235,.36)",fontSize:13,padding:"22px 12px",fontStyle:"italic",fontFamily:"Georgia, serif",lineHeight:1.6}}>
                  No stars yet. Every thought you release becomes one.
                </div>
              )}
              {list.map(s=>(
                <div key={s.id} onClick={()=>revisit(s)} style={{padding:"12px 12px",borderRadius:10,cursor:"pointer",marginBottom:3}}>
                  <div style={{display:"flex",gap:8,alignItems:"center",marginBottom:5}}>
                    <span style={{width:8,height:8,borderRadius:8,background:s.palette[2],boxShadow:`0 0 10px ${s.palette[2]}`,display:"inline-block",flexShrink:0}}/>
                    <span style={{color:s.palette[2],fontSize:8,letterSpacing:"0.22em",opacity:0.8}}>{FORM_LABELS[s.form]??s.form.toUpperCase()}</span>
                  </div>
                  <div style={{color:"#ece8ff",fontSize:13.5,fontFamily:"Georgia, serif",fontStyle:"italic",lineHeight:1.5}}>{s.whisper}</div>
                </div>
              ))}
            </div>
            {list.length>0&&(
              <>
                <button onClick={weekCard}
                  style={{margin:"10px 22px 0",background:`linear-gradient(135deg,${a44},${a66}33)`,border:`1px solid ${a66}`,color:"#ece8ff",borderRadius:999,padding:10,fontSize:9.5,letterSpacing:"0.2em",cursor:"pointer",fontFamily:"inherit",boxShadow:`0 0 18px ${a44}`}}>
                  ✦ MY WEEK IN STARS
                </button>
                <button onClick={clearStars}
                  style={{margin:"10px 22px 20px",background:"none",border:"1px solid rgba(180,120,140,.28)",color:"rgba(230,170,190,.6)",borderRadius:999,padding:9,fontSize:9.5,letterSpacing:"0.2em",cursor:"pointer",fontFamily:"inherit"}}>
                  DISSOLVE ALL STARS
                </button>
              </>
            )}
          </motion.div>
        )}
      </AnimatePresence>

      {/* Capture overlay */}
      <AnimatePresence>
        {captureURL&&(
          <motion.div
            initial={{opacity:0}} animate={{opacity:1}} exit={{opacity:0}}
            style={{position:"absolute",inset:0,background:"rgba(3,2,6,.94)",backdropFilter:"blur(12px)",zIndex:10,display:"flex",flexDirection:"column",alignItems:"center",justifyContent:"center",padding:20}}
          >
            <img src={captureURL} alt="A whisper to the void" style={{maxHeight:"72vh",maxWidth:"92vw",borderRadius:14,boxShadow:`0 0 80px ${a44}`}}/>
            <div style={{color:"rgba(220,216,255,.6)",fontSize:12,letterSpacing:"0.1em",marginTop:16,textAlign:"center"}}>
              Long-press to save · ready for stories & reels
            </div>
            <div style={{display:"flex",gap:12,marginTop:16,flexWrap:"wrap",justifyContent:"center"}}>
              <button onClick={shareWhisper}
                style={{background:`linear-gradient(135deg,${a66},${a44})`,border:`1px solid ${a88}`,color:"#fff",borderRadius:999,padding:"11px 26px",fontSize:12,letterSpacing:"0.16em",cursor:"pointer",fontFamily:"inherit",boxShadow:`0 0 24px ${a44}`}}>
                {copied?"LINK COPIED ✦":"SHARE ✦"}
              </button>
              <a href={captureURL} download="aether-whisper.png"
                style={{background:a44,border:`1px solid ${a66}`,color:"#e9e4ff",borderRadius:999,padding:"11px 24px",fontSize:12,letterSpacing:"0.16em",textDecoration:"none"}}>
                DOWNLOAD
              </a>
              <button onClick={()=>setCaptureURL(null)}
                style={{background:"none",border:"1px solid rgba(150,130,230,.28)",color:"rgba(220,216,255,.62)",borderRadius:999,padding:"11px 22px",fontSize:12,letterSpacing:"0.16em",cursor:"pointer",fontFamily:"inherit"}}>
                CLOSE
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
