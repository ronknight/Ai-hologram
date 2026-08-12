import React, { Suspense, useMemo, useRef } from 'react';
import { useFrame } from '@react-three/fiber';
import { Environment } from '@react-three/drei';
import * as THREE from 'three';
import type { BackdropTheme } from '../types';
import { BACKDROP_PRESETS, FALLBACK_LIGHTING_PRESET, type BackdropPreset } from './backdropPresets';

// The scene used to sit on a flat CSS grid. Most themes now put the figure in a
// real place instead: drei's environment presets are photographic HDRI
// panoramas, so the same image both lights the model and surrounds it, and
// orbiting parallaxes a real location rather than sliding the figure across a
// static picture.
//
// Two themes have no photograph that fits — Space and Futuristic — and fall
// back to the hand-drawn dome and mote field below. That dome does double duty
// as the stand-in shown while a panorama downloads from the CDN, so the scene
// is never empty and never blocks on the network.
//
// Both shader materials are ShaderMaterials, which the renderer does not
// post-process for us, so each fragment shader ends with the tone mapping and
// output-colour-space chunks the rest of the scene gets automatically. Without
// them the backdrop would not match the model's exposure.

const DOME_RADIUS = 40;
const MOTE_INNER = 7;
const MOTE_OUTER = 22;

const domeVertexShader = /* glsl */ `
  varying vec3 vDirection;
  void main() {
    vDirection = normalize(position);
    gl_Position = projectionMatrix * modelViewMatrix * vec4(position, 1.0);
  }
`;

const domeFragmentShader = /* glsl */ `
  uniform vec3 uHigh;
  uniform vec3 uLow;
  uniform vec3 uGlow;
  uniform float uGlowStrength;
  uniform float uBandStrength;
  uniform float uTime;
  varying vec3 vDirection;

  void main() {
    float h = vDirection.y;
    vec3 color = mix(uLow, uHigh, smoothstep(-0.7, 0.9, h));

    // A band of light at eye level. Keyed off height alone so it stays put as
    // the camera orbits, reading as atmosphere around the figure.
    color += uGlow * exp(-h * h * 14.0) * uGlowStrength;

    // Faint drifting scan bands, the 3D echo of the old CSS grid.
    color += uGlow * uBandStrength * sin(h * 90.0 - uTime * 0.6);

    gl_FragColor = vec4(color, 1.0);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

const moteVertexShader = /* glsl */ `
  uniform float uTime;
  uniform float uPixelRatio;
  uniform float uSize;
  uniform float uBob;
  uniform float uRise;
  uniform float uRange;
  attribute float aScale;
  attribute float aPhase;
  varying float vFade;

  void main() {
    vec3 pos = position;
    // Each mote bobs on its own phase so the field never pulses in unison.
    pos.y += sin(uTime * 0.25 + aPhase) * uBob;
    // Themes with a rise wrap their motes back to the bottom of the shell.
    // (Not named "half" — GLSL reserves that word.)
    float halfRange = uRange * 0.5;
    pos.y = mod(pos.y + uTime * uRise + halfRange, uRange) - halfRange;

    vec4 mvPosition = modelViewMatrix * vec4(pos, 1.0);
    gl_Position = projectionMatrix * mvPosition;
    gl_PointSize = aScale * uPixelRatio * uSize / max(-mvPosition.z, 0.001);

    // Twinkle, and drop off the ones nearest the camera so motes never sit
    // distractingly on top of the model.
    float twinkle = 0.55 + 0.45 * sin(uTime * 0.9 + aPhase * 2.0);
    vFade = twinkle * smoothstep(4.0, 9.0, -mvPosition.z);
  }
`;

const moteFragmentShader = /* glsl */ `
  uniform vec3 uColor;
  varying float vFade;

  void main() {
    float d = length(gl_PointCoord - 0.5);
    if (d > 0.5) discard;
    float alpha = smoothstep(0.5, 0.0, d) * vFade;

    gl_FragColor = vec4(uColor, alpha);

    #include <tonemapping_fragment>
    #include <colorspace_fragment>
  }
`;

function Dome({ preset }: { preset: BackdropPreset }) {
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  // Built once; the effect below retints them so switching theme does not
  // recompile the shader program.
  const uniforms = useMemo(
    () => ({
      uHigh: { value: new THREE.Color() },
      uLow: { value: new THREE.Color() },
      uGlow: { value: new THREE.Color() },
      uGlowStrength: { value: 0 },
      uBandStrength: { value: 0 },
      uTime: { value: 0 },
    }),
    []
  );

  React.useEffect(() => {
    uniforms.uHigh.value.set(preset.domeHigh);
    uniforms.uLow.value.set(preset.domeLow);
    uniforms.uGlow.value.set(preset.glow);
    uniforms.uGlowStrength.value = preset.glowStrength;
    uniforms.uBandStrength.value = preset.bandStrength;
  }, [preset, uniforms]);

  useFrame((state) => {
    if (materialRef.current) materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
  });

  return (
    // renderOrder keeps the dome first in the queue; depthWrite off stops it
    // from occluding anything drawn after it.
    <mesh renderOrder={-1} frustumCulled={false}>
      <sphereGeometry args={[DOME_RADIUS, 32, 16]} />
      <shaderMaterial
        ref={materialRef}
        side={THREE.BackSide}
        depthWrite={false}
        uniforms={uniforms}
        vertexShader={domeVertexShader}
        fragmentShader={domeFragmentShader}
      />
    </mesh>
  );
}

function Motes({ preset }: { preset: BackdropPreset }) {
  const pointsRef = useRef<THREE.Points>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { moteCount, moteFlatten } = preset;

  const geometry = useMemo(() => {
    const positions = new Float32Array(moteCount * 3);
    const scales = new Float32Array(moteCount);
    const phases = new Float32Array(moteCount);

    for (let i = 0; i < moteCount; i++) {
      // Even distribution through a spherical shell, so the field has depth
      // from every orbit angle rather than clumping on a surface.
      const u = Math.random();
      const radius = Math.cbrt(u * (MOTE_OUTER ** 3 - MOTE_INNER ** 3) + MOTE_INNER ** 3);
      const theta = Math.random() * Math.PI * 2;
      const cosPhi = Math.random() * 2 - 1;
      const sinPhi = Math.sqrt(1 - cosPhi * cosPhi);

      positions[i * 3] = radius * sinPhi * Math.cos(theta);
      positions[i * 3 + 1] = radius * cosPhi * moteFlatten;
      positions[i * 3 + 2] = radius * sinPhi * Math.sin(theta);
      scales[i] = 0.5 + Math.random() * 1.4;
      phases[i] = Math.random() * Math.PI * 2;
    }

    const geo = new THREE.BufferGeometry();
    geo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geo.setAttribute('aScale', new THREE.BufferAttribute(scales, 1));
    geo.setAttribute('aPhase', new THREE.BufferAttribute(phases, 1));
    return geo;
  }, [moteCount, moteFlatten]);

  const uniforms = useMemo(
    () => ({
      uColor: { value: new THREE.Color() },
      uSize: { value: 0 },
      uBob: { value: 0 },
      uRise: { value: 0 },
      uRange: { value: 1 },
      uTime: { value: 0 },
      uPixelRatio: { value: 1 },
    }),
    []
  );

  React.useEffect(() => {
    uniforms.uColor.value.set(preset.moteColor);
    uniforms.uSize.value = preset.moteSize;
    uniforms.uBob.value = preset.moteBob;
    uniforms.uRise.value = preset.moteRise;
    // The shell's full vertical span, so a rising mote wraps at the far edge.
    // Never zero: the shader takes a mod() by this.
    uniforms.uRange.value = Math.max(1, 2 * MOTE_OUTER * preset.moteFlatten + 2 * preset.moteBob);
  }, [preset, uniforms]);

  useFrame((state) => {
    const t = state.clock.elapsedTime;
    if (materialRef.current) {
      materialRef.current.uniforms.uTime.value = t;
      materialRef.current.uniforms.uPixelRatio.value = state.gl.getPixelRatio();
    }
    if (pointsRef.current) pointsRef.current.rotation.y = t * preset.spin;
  });

  // Dispose each hand-built geometry, including the ones replaced on a theme change.
  React.useEffect(() => () => geometry.dispose(), [geometry]);

  if (moteCount === 0) return null;

  return (
    <points ref={pointsRef} geometry={geometry} frustumCulled={false}>
      <shaderMaterial
        ref={materialRef}
        transparent
        depthWrite={false}
        blending={THREE.AdditiveBlending}
        uniforms={uniforms}
        vertexShader={moteVertexShader}
        fragmentShader={moteFragmentShader}
      />
    </points>
  );
}

export default function HologramBackdrop({ theme }: { theme: BackdropTheme }) {
  const preset = BACKDROP_PRESETS[theme] ?? BACKDROP_PRESETS.futuristic;

  return (
    <>
      <Dome preset={preset} />
      <Motes preset={preset} />
      {/* Rim light tinted to the backdrop so the figure sits in its scene
          instead of being lit for a different one. */}
      <directionalLight position={[-5, 3, -6]} intensity={1.4} color={preset.glow} />
    </>
  );
}
