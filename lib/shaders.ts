export const vertexShader = /* glsl */ `
  uniform float uMix;
  uniform float uTime;
  uniform float uEnergy;
  uniform float uSize;

  attribute vec3 aFrom;
  attribute vec3 aTo;
  attribute float aRand;
  attribute float aT;

  varying float vT;
  varying float vEnergy;

  vec3 flow(vec3 p, float t) {
    return vec3(
      sin(p.y * 0.15 + t + aRand * 6.28318),
      sin(p.z * 0.15 + t * 1.1 + aRand * 3.14159),
      cos(p.x * 0.15 + t * 0.9 + aRand * 1.5708)
    );
  }

  void main() {
    vT = aT;
    vEnergy = uEnergy;

    float mixVal = smoothstep(0.0, 1.0, uMix);
    vec3 pos = mix(aFrom, aTo, mixVal);
    pos += flow(pos, uTime * 0.6) * (uEnergy * 6.0);

    vec4 mv = modelViewMatrix * vec4(pos, 1.0);
    gl_PointSize = uSize * (300.0 / -mv.z) * (0.6 + uEnergy * 0.8);
    gl_Position = projectionMatrix * mv;
  }
`;

export const fragmentShader = /* glsl */ `
  uniform vec3 uC0;
  uniform vec3 uC1;
  uniform vec3 uC2;

  varying float vT;
  varying float vEnergy;

  void main() {
    vec2 c = gl_PointCoord - 0.5;
    float d = 1.0 - smoothstep(0.0, 0.5, length(c));
    if (d <= 0.0) discard;

    vec3 col = vT < 0.5
      ? mix(uC0, uC1, vT * 2.0)
      : mix(uC1, uC2, (vT - 0.5) * 2.0);

    col *= 1.0 + vEnergy * 0.5;

    gl_FragColor = vec4(col, d);
  }
`;
