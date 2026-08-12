import React, { Suspense } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import {
  useGLTF,
  Html,
  useProgress,
  AccumulativeShadows,
  RandomizedLight,
  Center,
  OrbitControls,
  PerspectiveCamera
} from '@react-three/drei';
import { useState, useRef } from 'react';
import * as THREE from 'three';
import { capBoundaryHoles } from './capHoles';
import HologramBackdrop from './HologramBackdrop';
import type { BackdropTheme } from '../types';

interface HologramProps {
  isListening: boolean;
  isSpeaking: boolean;
  isIdle: boolean;
}

interface HologramViewProps extends HologramProps {
  /** Passed down as a prop, not read from context: React context does not
      cross the react-three-fiber Canvas boundary. */
  backdropTheme: BackdropTheme;
}

function LoaderOverlay() {
  const { active, progress } = useProgress();
  
  if (!active) return null;
  
  return (
    <Html center>
      <div className="text-center bg-black/50 px-3 py-2 rounded-md">
        <p className="text-accent/90 text-sm">Loading...</p>
      </div>
    </Html>
  );
}

type BoneEntry = { bone: THREE.Object3D; rest: THREE.Euler };

function HologramModel({ isListening, isSpeaking, isIdle }: HologramProps) {
  const gltf = useGLTF('/models/hologram.glb');
  const groupRef = useRef<THREE.Group>(null);
  const bonesRef = useRef<Record<string, BoneEntry>>({});
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // The GLB ships a full skeleton but no animation clips, so idle motion is
  // driven procedurally. Collect the joints we animate and their rest pose.
  React.useEffect(() => {
    const targets: Record<string, RegExp> = {
      hips: /root hips/,
      spineMiddle: /spine middle/,
      spineUpper: /spine upper/,
      neckLower: /head neck lower/,
      neckUpper: /head neck upper/,
      leftShoulder: /arm left shoulder 2/,
      rightShoulder: /arm right shoulder 2/,
      leftElbow: /arm left elbow/,
      rightElbow: /arm right elbow/,
      leftThigh: /leg left thigh/,
      rightThigh: /leg right thigh/,
      leftKnee: /leg left knee/,
      rightKnee: /leg right knee/,
    };
    const found: Record<string, BoneEntry> = {};
    gltf.scene.traverse((child) => {
      // GLTFLoader replaces spaces in node names with underscores
      const norm = child.name.toLowerCase().replace(/[_\s]+/g, ' ');
      for (const key of Object.keys(targets)) {
        if (!found[key] && targets[key].test(norm)) {
          found[key] = { bone: child, rest: child.rotation.clone() };
        }
      }
    });
    bonesRef.current = found;
  }, [gltf.scene]);

  // The GLB's meshes are not watertight — the palms, and the shoulder and elbow
  // sockets, stop at an open rim. Because the materials are DoubleSide those
  // rims read as solid black voids (you see the unlit inside of the part), so
  // close them before the model is ever shown. See capHoles.ts.
  React.useEffect(() => {
    gltf.scene.traverse((child) => {
      if (child instanceof THREE.Mesh && child.geometry) capBoundaryHoles(child.geometry);
    });
  }, [gltf.scene]);

  // Process materials on load to ensure gold/metallic materials render correctly
  React.useEffect(() => {
    if (gltf.scene) {
      gltf.scene.traverse((child) => {
        if (child instanceof THREE.Mesh && child.material) {
          const material = child.material as THREE.MeshStandardMaterial;

          // The model (an XPS conversion) is built from a base skin (25_*,
          // black with emissive green chest core and eyes) plus two
          // duplicate-geometry trim layers (26_/27_ gold and red) whose RGBA
          // textures are cutout decals. Gold and red are not alternate
          // choices per body part — each covers a near-disjoint slice of the
          // surface (verified against the actual texture alpha channels:
          // base+gold+red union to ~100% coverage per part, with <10%
          // overlap between gold and red). Hiding either one leaves the
          // part's uncovered slice showing through as a hole, so all three
          // layers must render together.
          const matName = material.name.toLowerCase();
          const isBase = matName.startsWith('25_');
          const isOverlay = !isBase;
          const isGoldOverlay = isOverlay && matName.includes('gold');

          // Render the layers as alpha-tested cutouts instead of the exported
          // BLEND mode (which disables depth-write and looks ghosted). The
          // overlays get a polygon offset so they beat the co-planar base in
          // the depth test wherever their texture is opaque. Gold and red
          // get distinct offsets so their small mutual overlap doesn't
          // z-fight.
          material.transparent = false;
          material.opacity = 1;
          material.depthWrite = true;
          material.alphaTest = isOverlay ? 0.5 : 0.01;
          if (isOverlay) {
            material.polygonOffset = true;
            material.polygonOffsetFactor = isGoldOverlay ? -1 : -2;
            material.polygonOffsetUnits = isGoldOverlay ? -1 : -2;
          }
          // The source textures are authored for matte diffuse shading, but
          // glTF defaults metalness to 1, which renders as dark chrome.
          material.metalness = 0.15;
          material.roughness = 0.75;
          material.envMapIntensity = 0.8;
          material.needsUpdate = true;
        }
      });
    }
  }, [gltf.scene]);

  // Animation effect
  useFrame((state) => {
    if (!groupRef.current || isDragging) return;

    // Gentle floating animation when not being manipulated
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime * 1.5) * 0.25;

    // Scale effect based on state
    const baseScale = isDragging ? 1.8 : 1.5;
    const targetScale = isListening ? baseScale * 1.1 : 
                       isSpeaking ? baseScale * 1.05 : 
                       hovered ? baseScale * 1.02 : 
                       baseScale;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    const t = state.clock.elapsedTime;

    // Procedural skeletal idle animation, livelier while listening/speaking
    const energy = isSpeaking ? 2 : isListening ? 1.5 : 1;
    const bones = bonesRef.current;
    // oscillate around the rest pose: rest + sin(t * speed + phase) * amount
    const sway = (key: string, axis: 'x' | 'y' | 'z', amount: number, speed: number, phase = 0) => {
      const entry = bones[key];
      if (entry) entry.bone.rotation[axis] = entry.rest[axis] + Math.sin(t * speed + phase) * amount;
    };
    // one-directional bend in [0, amount], for joints like knees
    const bend = (key: string, axis: 'x' | 'y' | 'z', amount: number, speed: number, phase = 0) => {
      const entry = bones[key];
      if (entry) entry.bone.rotation[axis] = entry.rest[axis] + (Math.sin(t * speed + phase) + 1) * 0.5 * amount;
    };

    // breathing through the torso
    sway('spineMiddle', 'x', 0.03 * energy, 1.4);
    sway('spineUpper', 'x', 0.045 * energy, 1.4, 0.4);
    sway('hips', 'y', 0.04, 0.6);
    // head looks around
    sway('neckLower', 'y', 0.12 * energy, 0.5);
    sway('neckUpper', 'y', 0.22 * energy, 0.5, 0.5);
    sway('neckUpper', 'x', 0.07, 0.8, 1.2);
    // arms: shoulder sway only. A chunk of the 25_Body (torso) mesh near
    // the shoulder is skin-weighted 100% to the elbow joint instead of the
    // shoulder joint (a weight-painting defect in the source asset), so any
    // elbow rotation drags that torso patch away from the rest of the body
    // and tears a visible hole open at the shoulder/upper-arm. Don't animate
    // the elbow bone until the asset's skin weights are fixed.
    sway('leftShoulder', 'z', 0.09 * energy, 1.1);
    sway('rightShoulder', 'z', 0.09 * energy, 1.1, Math.PI);
    // legs: subtle weight shifting
    sway('leftThigh', 'z', 0.035, 0.6);
    sway('rightThigh', 'z', -0.035, 0.6);
    bend('leftKnee', 'x', 0.06, 0.6);
    bend('rightKnee', 'x', 0.06, 0.6, Math.PI);
  });

  return (
    <Center>
      <group 
        ref={groupRef} 
        dispose={null}
        onPointerOver={() => setHovered(true)}
        onPointerOut={() => setHovered(false)}
      >
        <primitive 
          object={gltf.scene} 
          scale={1.5}
        />
        {(isListening || isSpeaking) && (
          <pointLight
            color={isListening ? '#00ff00' : '#0088ff'}
            intensity={2}
            distance={3}
            position={[0, 1, 0]}
          />
        )}
      </group>
    </Center>
  );
}

// A 50° vertical fov shows about 0.93 × distance of world height. The posed
// model stands ~4.3 units tall and ~2.8 wide at the scale used above, so a
// landscape window frames it at 5.5 but a portrait phone has to pull back or the
// arms and boots fall outside the frame.
const FIT_DISTANCE_HEIGHT = 5.5;
const FIT_DISTANCE_WIDTH = 3.45;

function Rig() {
  const camera = useThree((state) => state.camera);
  const size = useThree((state) => state.size);
  const controlsRef = useRef<React.ElementRef<typeof OrbitControls>>(null);
  const appliedRef = useRef(0);

  const aspect = size.width / Math.max(size.height, 1);
  const distance = Math.max(FIT_DISTANCE_HEIGHT, FIT_DISTANCE_WIDTH / Math.max(aspect, 0.2));

  React.useEffect(() => {
    // Re-frame on a real layout change (rotation, window resize) but ignore the
    // small height wobble a mobile address bar makes as it hides and reappears,
    // which would otherwise nudge the camera every time the user scrolls.
    if (Math.abs(distance - appliedRef.current) < 0.35) return;
    appliedRef.current = distance;
    // setLength keeps whatever angle the user has orbited to and changes only
    // how far back the camera sits.
    camera.position.setLength(distance);
    controlsRef.current?.update();
  }, [distance, camera]);

  return (
    <>
      <PerspectiveCamera makeDefault position={[0, 0, FIT_DISTANCE_HEIGHT]} fov={50} />
      <OrbitControls
        ref={controlsRef}
        enablePan={false}
        enableDamping
        dampingFactor={0.05}
        rotateSpeed={0.5}
        minDistance={2}
        maxDistance={Math.max(7, distance + 2)}
        minPolarAngle={Math.PI / 4}
        maxPolarAngle={Math.PI / 1.5}
      />
    </>
  );
}

const Hologram: React.FC<HologramViewProps> = ({ isListening, isSpeaking, isIdle, backdropTheme }) => {
  return (
    <div className="fixed inset-0 w-full h-full z-10">
      <Canvas
        gl={{
          alpha: true,
          antialias: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1.6,
          outputColorSpace: THREE.SRGBColorSpace
        }}
        dpr={[1, 1.75]}
        shadows
        className="touch-none"
      >
        <Rig />
        <ambientLight intensity={0.9} />
        <directionalLight position={[5, 8, 5]} intensity={2.8} />
        {/* Outside Suspense so the backdrop is already there while the model
            streams in. It also supplies the theme-tinted rim light. */}
        <HologramBackdrop theme={backdropTheme} />
        <Suspense fallback={<LoaderOverlay />}>
          <AccumulativeShadows temporal frames={60} alphaTest={0.85} opacity={0.8}>
            <RandomizedLight amount={8} radius={10} ambient={0.5} position={[5, 5, -10]} />
          </AccumulativeShadows>
          <HologramModel isListening={isListening} isSpeaking={isSpeaking} isIdle={isIdle} />
        </Suspense>
      </Canvas>
    </div>
  );
};

export default Hologram;

useGLTF.preload('/models/hologram.glb');