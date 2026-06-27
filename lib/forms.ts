// Particle position generators — each returns Float32Array of length N*3

export const N = 200_000;

function rand() {
  return Math.random();
}

export function generateSpiral(n: number): Float32Array {
  const arr = new Float32Array(n * 3);
  const arms = 3;
  for (let i = 0; i < n; i++) {
    const t = rand();
    const arm = Math.floor(rand() * arms);
    const angle = t * Math.PI * 8 + (arm * Math.PI * 2) / arms;
    const radius = 3 + t * 22 + rand() * 2;
    const spread = (1 - t) * 3 + rand() * 1.5;
    arr[i * 3] = Math.cos(angle) * radius + (rand() - 0.5) * spread;
    arr[i * 3 + 1] = (rand() - 0.5) * spread * 0.5;
    arr[i * 3 + 2] = Math.sin(angle) * radius + (rand() - 0.5) * spread;
  }
  return arr;
}

export function generateSphere(n: number): Float32Array {
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const theta = rand() * Math.PI * 2;
    const phi = Math.acos(2 * rand() - 1);
    const r = 10 + rand() * 5;
    arr[i * 3] = r * Math.sin(phi) * Math.cos(theta);
    arr[i * 3 + 1] = r * Math.cos(phi);
    arr[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
  }
  return arr;
}

export function generateNebula(n: number): Float32Array {
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const x = (rand() - 0.5) * 50;
    const y = (rand() - 0.5) * 20;
    const z = (rand() - 0.5) * 50;
    const cx = Math.sin(rand() * Math.PI * 2) * 10;
    const cy = (rand() - 0.5) * 4;
    const cz = Math.cos(rand() * Math.PI * 2) * 10;
    const mix = rand();
    arr[i * 3] = x * mix + cx * (1 - mix);
    arr[i * 3 + 1] = y * mix + cy * (1 - mix);
    arr[i * 3 + 2] = z * mix + cz * (1 - mix);
  }
  return arr;
}

export function generateVortex(n: number): Float32Array {
  const arr = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const t = rand();
    const angle = t * Math.PI * 20;
    const radius = t * 20;
    const height = (1 - t * t) * 15 * (rand() > 0.5 ? 1 : -1) * rand();
    arr[i * 3] = Math.cos(angle) * radius + (rand() - 0.5) * 1.5;
    arr[i * 3 + 1] = height;
    arr[i * 3 + 2] = Math.sin(angle) * radius + (rand() - 0.5) * 1.5;
  }
  return arr;
}

export type FormType = "spiral" | "sphere" | "nebula" | "vortex";

export function generateForm(form: FormType, n: number): Float32Array {
  switch (form) {
    case "spiral": return generateSpiral(n);
    case "sphere": return generateSphere(n);
    case "nebula": return generateNebula(n);
    case "vortex": return generateVortex(n);
  }
}
