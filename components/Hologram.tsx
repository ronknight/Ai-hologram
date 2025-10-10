import React, { Suspense } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import {
  useGLTF,
  Html,
  useProgress,
  Environment,
  AccumulativeShadows,
  RandomizedLight,
  Center,
  Effects,
  OrbitControls,
  PerspectiveCamera
} from '@react-three/drei';
import { useState, useRef } from 'react';
import * as THREE from 'three';

interface HologramProps {
  isListening: boolean;
  isSpeaking: boolean;
  isIdle: boolean;
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

function HologramModel({ isListening, isSpeaking, isIdle }: HologramProps) {
  const gltf = useGLTF('/models/hologram.glb');
  const groupRef = useRef<THREE.Group>(null);
  const [hovered, setHovered] = useState(false);
  const [isDragging, setIsDragging] = useState(false);

  // Animation effect
  useFrame((state) => {
    if (!groupRef.current || isDragging) return;

    // Gentle floating animation when not being manipulated
    groupRef.current.position.y = Math.sin(state.clock.elapsedTime) * 0.1;

    // Scale effect based on state
    const baseScale = isDragging ? 1.8 : 1.5;
    const targetScale = isListening ? baseScale * 1.1 : 
                       isSpeaking ? baseScale * 1.05 : 
                       hovered ? baseScale * 1.02 : 
                       baseScale;
    groupRef.current.scale.lerp(new THREE.Vector3(targetScale, targetScale, targetScale), 0.1);

    // Auto-rotation only when not interacting
    if (!isDragging && !hovered) {
      if (isListening || isSpeaking) {
        groupRef.current.rotation.y += 0.01;
      } else {
        groupRef.current.rotation.y += 0.002;
      }
    }
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

const Hologram: React.FC<HologramProps> = ({ isListening, isSpeaking, isIdle }) => {
  return (
    <div className="fixed inset-0 w-full h-full z-10">
      <Canvas
        gl={{ 
          alpha: true, 
          antialias: true,
          logarithmicDepthBuffer: true,
          toneMapping: THREE.ACESFilmicToneMapping,
          toneMappingExposure: 1
        }}
        dpr={[1, 2]}
        shadows
        className="touch-none"
      >
        <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />
        <OrbitControls
          enablePan={false}
          enableDamping
          dampingFactor={0.05}
          rotateSpeed={0.5}
          minDistance={2}
          maxDistance={7}
          minPolarAngle={Math.PI / 4}
          maxPolarAngle={Math.PI / 1.5}
        />
        <Suspense fallback={<LoaderOverlay />}>
          <Environment preset="city" />
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