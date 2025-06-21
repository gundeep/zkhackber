import React, { useState, useRef, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Physics, usePlane, useBox } from '@react-three/cannon';
import * as THREE from 'three';

// Helper to create a texture for a dice face
function createDiceFaceTexture(value: number) {
  const canvas = document.createElement('canvas');
  const context = canvas.getContext('2d');
  canvas.width = 128;
  canvas.height = 128;

  if (context) {
    context.fillStyle = 'white';
    context.fillRect(0, 0, 128, 128);
    context.fillStyle = 'black';
    context.font = 'bold 90px Arial';
    context.textAlign = 'center';
    context.textBaseline = 'middle';
    context.fillText(value.toString(), 64, 64);
  }
  return new THREE.CanvasTexture(canvas);
}

// Helper to get the result based on rotation
function getFaceFromRotation(rotation: [number, number, number]): number {
  const faceNormals = [
    new THREE.Vector3(0, 1, 0),   // Face 1
    new THREE.Vector3(1, 0, 0),   // Face 2
    new THREE.Vector3(0, 0, 1),   // Face 3
    new THREE.Vector3(0, 0, -1),  // Face 4
    new THREE.Vector3(-1, 0, 0),  // Face 5
    new THREE.Vector3(0, -1, 0),  // Face 6
  ];

  const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ');
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
  
  const transformedNormals = faceNormals.map(normal => normal.clone().applyMatrix4(rotationMatrix));
  
  const upVector = new THREE.Vector3(0, 1, 0);
  let maxDot = -Infinity;
  let topFaceIndex = -1;

  transformedNormals.forEach((normal, index) => {
    const dot = normal.dot(upVector);
    if (dot > maxDot) {
      maxDot = dot;
      topFaceIndex = index;
    }
  });

  // This mapping depends on how textures are applied.
  // We can adjust this if the results are incorrect.
  const faceValues = [1, 2, 3, 4, 5, 6];
  return faceValues[topFaceIndex];
}

// The Die component
interface DieProps {
  rolling: boolean;
  onResult: (result: number) => void;
}

function Die({ rolling, onResult }: DieProps) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position: [0, 5, 0],
    rotation: [Math.random() * Math.PI, Math.random() * Math.PI, Math.random() * Math.PI],
    material: { friction: 0.1, restitution: 0.5 },
  }));

  const [settled, setSettled] = useState(false);
  const rotation = useRef<[number, number, number]>([0, 0, 0]);

  const materials = React.useMemo(() => [
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(1) }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(6) }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(2) }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(5) }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(3) }),
      new THREE.MeshStandardMaterial({ map: createDiceFaceTexture(4) }),
  ], []);

  useEffect(() => {
    if (rolling) {
      setSettled(false);
      api.position.set(0, 5, 0);
      api.velocity.set((Math.random() - 0.5) * 5, Math.random() * 5, (Math.random() - 0.5) * 5);
      api.angularVelocity.set((Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10, (Math.random() - 0.5) * 10);
    }
  }, [rolling, api]);

  useEffect(() => api.rotation.subscribe((r) => (rotation.current = r)), [api]);

  useEffect(() => {
    // This effect handles detecting when the die has stopped.
    let hasReported = false;

    const unsubscribe = api.velocity.subscribe((v) => {
      if (rolling && !settled && !hasReported) {
        if (new THREE.Vector3(...v).length() < 0.1) {
          hasReported = true; // Prevent this from firing multiple times
          
          // Wait a moment to ensure physics has stabilized
          setTimeout(() => {
            if (!settled) { // Double check settled state
              const result = getFaceFromRotation(rotation.current);
              onResult(result);
              setSettled(true);
            }
          }, 100);
        }
      }
    });

    return unsubscribe; // Cleanup subscription
  }, [rolling, settled, api, onResult]);

  return (
    <mesh ref={ref} material={materials} castShadow>
      <boxGeometry args={[1, 1, 1]} />
    </mesh>
  );
}

// The floor component
function Plane(props: any) {
  const [ref] = usePlane(() => ({ rotation: [-Math.PI / 2, 0, 0], ...props }));
  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[100, 100]} />
      <shadowMaterial color="#171717" transparent opacity={0.4} />
    </mesh>
  );
}

// Main component
export default function DiceSimulator() {
  const [rolling, setRolling] = useState(false);
  const [rollCount, setRollCount] = useState(0);
  const [allRolls, setAllRolls] = useState<number[]>([]);
  const [currentResult, setCurrentResult] = useState<number | null>(null);

  const handleRoll = () => {
    setRolling(true);
    setCurrentResult(null);
  };

  const handleResult = (result: number) => {
    setRolling(false);
    setCurrentResult(result);
    setRollCount(prev => prev + 1);
    setAllRolls(prev => [...prev, result]);
  };
  
  const averageRoll = allRolls.length > 0
    ? (allRolls.reduce((a, b) => a + b, 0) / allRolls.length).toFixed(1)
    : '0.0';

  return (
    <div className="w-full h-screen bg-yellow-200 flex flex-col items-center justify-center">
      <div className="absolute top-8 left-8 bg-white/70 backdrop-blur-sm p-4 rounded-lg shadow-lg">
        <h2 className="text-lg font-bold">Statistics</h2>
        <p>Total Rolls: <span className="font-bold">{rollCount}</span></p>
        <p>Average Roll: <span className="font-bold">{averageRoll}</span></p>
        {currentResult !== null && <p>Last Roll: <span className="font-bold">{currentResult}</span></p>}
      </div>
      
      <div style={{ width: '100%', height: '80vh' }}>
        <Canvas shadows camera={{ position: [0, 8, 8], fov: 50 }}>
          <ambientLight intensity={0.5} />
          <directionalLight
            position={[10, 10, 5]}
            intensity={1.5}
            castShadow
            shadow-mapSize-width={2048}
            shadow-mapSize-height={2048}
          />
          <Physics gravity={[0, -30, 0]}>
            <Plane position={[0, -1, 0]} />
            <Die rolling={rolling} onResult={handleResult} />
          </Physics>
        </Canvas>
      </div>

      <button
        onClick={handleRoll}
        disabled={rolling}
        className="mt-4 px-8 py-4 bg-red-500 text-white font-bold rounded-lg text-2xl shadow-lg transform hover:scale-105 transition-transform disabled:bg-gray-400"
      >
        {rolling ? 'Rolling...' : 'ROLL'}
      </button>
    </div>
  );
} 