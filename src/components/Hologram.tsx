import React, { Suspense, useEffect, useMemo } from 'react';
import { Canvas } from '@react-three/fiber';
import {
  useGLTF,
  Html,
  useProgress,
  Center,
  PerspectiveCamera,
  OrbitControls
} from '@react-three/drei';
import * as THREE from 'three';
import { useDebug } from '../context/DebugContext';

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

function HologramModel() {
  const { scene } = useGLTF('/models/hologram.glb');

  useEffect(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material.transparent = false;
        child.material.depthWrite = true;
        if (child.name === 'object_116') {
          child.material.color.set('gold');
        }
      }
    });
  }, [scene]);

  return (
    <Center>
      <primitive 
        object={scene} 
        scale={1.5}
      />
    </Center>
  );
}

const Hologram: React.FC<HologramProps> = () => {
  return (
    <Canvas
      gl={{
        alpha: true,
        antialias: true,
      }}
      className="fixed inset-0 w-full h-full z-0"
    >
      <PerspectiveCamera makeDefault position={[0, 0, 4]} fov={50} />
      <OrbitControls />
      <ambientLight intensity={2} />
      <directionalLight position={[5, 5, 5]} intensity={2} />
      <Suspense fallback={<LoaderOverlay />}>
        <HologramModel />
      </Suspense>
    </Canvas>
  );
};

export default Hologram;

useGLTF.preload('/models/hologram.glb');
