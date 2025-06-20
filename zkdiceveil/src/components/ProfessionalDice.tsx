import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { OrbitControls, Environment } from '@react-three/drei';
import { Physics, usePlane, useBox } from '@react-three/cannon';
import * as THREE from 'three';
import * as BufferGeometryUtils from 'three/addons/utils/BufferGeometryUtils.js';

// Dice parameters
const params = {
  segments: 40,
  edgeRadius: 0.07,
  notchRadius: 0.12,
  notchDepth: 0.1
};

// Create custom dice geometry with rounded edges and notches
function createDiceGeometry() {
  let boxGeometry = new THREE.BoxGeometry(1, 1, 1, params.segments, params.segments, params.segments);
  const positionAttribute = boxGeometry.attributes.position;
  
  const subCubeHalfSize = 0.5 - params.edgeRadius;

  for (let i = 0; i < positionAttribute.count; i++) {
    let position = new THREE.Vector3().fromBufferAttribute(positionAttribute, i);
    
    const subCube = new THREE.Vector3(
      Math.sign(position.x),
      Math.sign(position.y), 
      Math.sign(position.z)
    ).multiplyScalar(subCubeHalfSize);
    
    const addition = new THREE.Vector3().subVectors(position, subCube);

    if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
      addition.normalize().multiplyScalar(params.edgeRadius);
      position = subCube.add(addition);
    } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.y) > subCubeHalfSize) {
      addition.z = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.y = subCube.y + addition.y;
    } else if (Math.abs(position.x) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
      addition.y = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.x = subCube.x + addition.x;
      position.z = subCube.z + addition.z;
    } else if (Math.abs(position.y) > subCubeHalfSize && Math.abs(position.z) > subCubeHalfSize) {
      addition.x = 0;
      addition.normalize().multiplyScalar(params.edgeRadius);
      position.y = subCube.y + addition.y;
      position.z = subCube.z + addition.z;
    }

    // Add notches for dice faces
    const notchWave = (v: number) => {
      v = (1 / params.notchRadius) * v;
      v = Math.PI * Math.max(-1, Math.min(1, v));
      return params.notchDepth * (Math.cos(v) + 1.);
    };
    
    const notch = (pos: [number, number]) => notchWave(pos[0]) * notchWave(pos[1]);
    
    const offset = 0.23;

    if (Math.abs(position.y - 0.5) < 0.01) {
      // Face 1 (top)
      position.y -= notch([position.x, position.z]);
    } else if (Math.abs(position.x - 0.5) < 0.01) {
      // Face 2 (right)
      position.x -= notch([position.y + offset, position.z + offset]);
      position.x -= notch([position.y - offset, position.z - offset]);
    } else if (Math.abs(position.z - 0.5) < 0.01) {
      // Face 3 (front)
      position.z -= notch([position.x - offset, position.y + offset]);
      position.z -= notch([position.x, position.y]);
      position.z -= notch([position.x + offset, position.y - offset]);
    } else if (Math.abs(position.z + 0.5) < 0.01) {
      // Face 4 (back)
      position.z += notch([position.x + offset, position.y + offset]);
      position.z += notch([position.x + offset, position.y - offset]);
      position.z += notch([position.x - offset, position.y + offset]);
      position.z += notch([position.x - offset, position.y - offset]);
    } else if (Math.abs(position.x + 0.5) < 0.01) {
      // Face 5 (left)
      position.x += notch([position.y + offset, position.z + offset]);
      position.x += notch([position.y + offset, position.z - offset]);
      position.x += notch([position.y, position.z]);
      position.x += notch([position.y - offset, position.z + offset]);
      position.x += notch([position.y - offset, position.z - offset]);
    } else if (Math.abs(position.y + 0.5) < 0.01) {
      // Face 6 (bottom)
      position.y += notch([position.x + offset, position.z + offset]);
      position.y += notch([position.x + offset, position.z]);
      position.y += notch([position.x + offset, position.z - offset]);
      position.y += notch([position.x - offset, position.z + offset]);
      position.y += notch([position.x - offset, position.z]);
      position.y += notch([position.x - offset, position.z - offset]);
    }

    positionAttribute.setXYZ(i, position.x, position.y, position.z);
  }

  // Update normals
  boxGeometry.deleteAttribute('normal');
  boxGeometry.deleteAttribute('uv');
  const mergedGeometry = BufferGeometryUtils.mergeVertices(boxGeometry);
  mergedGeometry.computeVertexNormals();

  return mergedGeometry;
}

// Create inner geometry for notch faces
function createInnerGeometry() {
  const baseGeometry = new THREE.PlaneGeometry(1 - 2 * params.edgeRadius, 1 - 2 * params.edgeRadius);
  const offset = 0.48;

  return BufferGeometryUtils.mergeGeometries([
    baseGeometry.clone().translate(0, 0, offset),
    baseGeometry.clone().translate(0, 0, -offset),
    baseGeometry.clone().rotateX(0.5 * Math.PI).translate(0, -offset, 0),
    baseGeometry.clone().rotateX(0.5 * Math.PI).translate(0, offset, 0),
    baseGeometry.clone().rotateY(0.5 * Math.PI).translate(-offset, 0, 0),
    baseGeometry.clone().rotateY(0.5 * Math.PI).translate(offset, 0, 0),
  ], false);
}

interface ProfessionalDiceSingleProps {
  position: [number, number, number];
  rolling: boolean;
  onResult: (result: number) => void;
  id: number;
}

function ProfessionalDiceSingle({ position, rolling, onResult, id }: ProfessionalDiceSingleProps) {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    material: {
      friction: 0.6,
      restitution: 0.2,
    },
    sleepTimeLimit: 0.1,
  }));

  const [settled, setSettled] = useState(false);
  const diceGeometry = useRef(createDiceGeometry());
  const innerGeometry = useRef(createInnerGeometry());

  useEffect(() => {
    if (rolling) {
      setSettled(false);
      
      // Reset velocity
      api.velocity.set(0, 0, 0);
      api.angularVelocity.set(0, 0, 0);
      
      // Set random initial rotation
      const randomRotation = [
        2 * Math.PI * Math.random(),
        0,
        2 * Math.PI * Math.random()
      ];
      api.rotation.set(randomRotation[0], randomRotation[1], randomRotation[2]);
      
      // Apply gentle impulse with delay
      setTimeout(() => {
        const force = 3 + 5 * Math.random();
        const impulse: [number, number, number] = [-force, force, 0];
        const point: [number, number, number] = [0, 0, 0.2];
        
        api.applyImpulse(impulse, point);
      }, id * 100);
    }
  }, [rolling, api, id]);

  // Sleep event listener for result detection
  useEffect(() => {
    const unsubscribe = api.velocity.subscribe((velocity) => {
      if (rolling && !settled) {
        const speed = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
        if (speed < 0.1) {
          // Get rotation and determine face
          api.rotation.subscribe((rotation) => {
            const result = getFaceFromRotation(rotation);
            if (result > 0) {
              setSettled(true);
              onResult(result);
            }
          })();
        }
      }
    });

    return unsubscribe;
  }, [rolling, settled, api, onResult]);

  return (
    <group ref={ref}>
      <mesh geometry={diceGeometry.current}>
        <meshStandardMaterial color={0xeeeeee} />
      </mesh>
      <mesh geometry={innerGeometry.current}>
        <meshStandardMaterial 
          color={0x000000} 
          roughness={0}
          metalness={1}
          side={THREE.DoubleSide}
        />
      </mesh>
    </group>
  );
}

// Helper function to determine dice face from rotation
function getFaceFromRotation(rotation: [number, number, number]): number {
  const [x, y, z] = rotation;
  const eps = 0.1;
  
  const isZero = (angle: number) => Math.abs(angle) < eps;
  const isHalfPi = (angle: number) => Math.abs(angle - 0.5 * Math.PI) < eps;
  const isMinusHalfPi = (angle: number) => Math.abs(0.5 * Math.PI + angle) < eps;
  const isPiOrMinusPi = (angle: number) => (Math.abs(Math.PI - angle) < eps || Math.abs(Math.PI + angle) < eps);

  if (isZero(z)) {
    if (isZero(x)) return 1;
    else if (isHalfPi(x)) return 4;
    else if (isMinusHalfPi(x)) return 3;
    else if (isPiOrMinusPi(x)) return 6;
  } else if (isHalfPi(z)) {
    return 2;
  } else if (isMinusHalfPi(z)) {
    return 5;
  }
  
  return 0; // Still rolling
}

// Floor component
function Floor() {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -3, 0],
    material: {
      friction: 0.8,
      restitution: 0.1,
    },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#2d5a27" />
    </mesh>
  );
}

export default function ProfessionalDice() {
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [diceCount, setDiceCount] = useState(2);

  const handleRoll = () => {
    setRolling(true);
    setResults([]);
    
    setTimeout(() => {
      setRolling(false);
    }, 100);
  };

  const handleResult = (result: number, index: number) => {
    setResults(prev => {
      const newResults = [...prev];
      newResults[index] = result;
      return newResults;
    });
  };

  const totalResult = results.reduce((sum, result) => sum + result, 0);
  const allSettled = results.length === diceCount && results.every(r => r > 0);

  return (
    <div className="w-full bg-gradient-to-br from-slate-100 to-slate-200 rounded-xl shadow-2xl overflow-hidden">
      {/* Header */}
      <div className="bg-gradient-to-r from-slate-800 to-slate-900 text-white p-6">
        <h2 className="text-2xl font-bold text-center">🎲 Professional Dice Simulator</h2>
        <p className="text-slate-300 text-center mt-2">Realistic physics-based dice rolling with custom geometry</p>
      </div>

      <div className="flex flex-col lg:flex-row">
        {/* 3D Viewport */}
        <div className="flex-1 relative">
          <div className="h-[500px] bg-gradient-to-b from-gray-800 to-black">
            <Canvas
              shadows
              camera={{ position: [0, 5, 8], fov: 50 }}
              gl={{ antialias: true }}
            >
              <color attach="background" args={['#1a1a1a']} />
              
              <ambientLight intensity={0.3} />
              <directionalLight
                position={[10, 10, 5]}
                intensity={1}
                castShadow
                shadow-mapSize-width={2048}
                shadow-mapSize-height={2048}
              />
              <pointLight position={[-5, 10, 5]} intensity={0.8} color="#ffffff" />
              
              <Physics gravity={[0, -25, 0]} allowSleep={true}>
                {Array.from({ length: diceCount }, (_, i) => (
                  <ProfessionalDiceSingle
                    key={i}
                    id={i}
                    position={[i * 1.2 - (diceCount - 1) * 0.6, 5, 0]}
                    rolling={rolling}
                    onResult={(result) => handleResult(result, i)}
                  />
                ))}
                <Floor />
              </Physics>

              <OrbitControls 
                enablePan={false}
                minDistance={3}
                maxDistance={15}
                maxPolarAngle={Math.PI / 2}
              />
              <Environment preset="warehouse" />
            </Canvas>
          </div>
          
          {/* Status overlay */}
          {rolling && (
            <div className="absolute inset-0 bg-black/20 flex items-center justify-center">
              <div className="bg-black/80 text-white px-6 py-3 rounded-lg text-xl font-bold">
                🎲 Rolling Dice...
              </div>
            </div>
          )}
        </div>

        {/* Controls Panel */}
        <div className="lg:w-80 bg-white border-l border-slate-200">
          <div className="p-6 space-y-6">
            {/* Dice Count Control */}
            <div className="bg-slate-50 p-4 rounded-lg">
              <label className="block text-slate-700 font-semibold mb-3">
                Number of Dice: <span className="text-blue-600">{diceCount}</span>
              </label>
              <input
                type="range"
                min="1"
                max="6"
                value={diceCount}
                onChange={(e) => setDiceCount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-200 rounded-lg appearance-none cursor-pointer slider"
                disabled={rolling}
              />
              <div className="flex justify-between text-xs text-slate-500 mt-1">
                <span>1</span>
                <span>6</span>
              </div>
            </div>

            {/* Roll Button */}
            <button
              onClick={handleRoll}
              disabled={rolling}
              className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-400 disabled:to-gray-500 text-white px-6 py-4 rounded-lg font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100"
            >
              {rolling ? (
                <span className="flex items-center justify-center gap-2">
                  <span className="animate-spin">🎲</span>
                  Rolling...
                </span>
              ) : (
                <span className="flex items-center justify-center gap-2">
                  🎲 Roll Dice
                </span>
              )}
            </button>

            {/* Results Display */}
            {allSettled && (
              <div className="bg-gradient-to-r from-green-50 to-emerald-50 border border-green-200 p-4 rounded-lg">
                <div className="text-slate-700 font-semibold mb-3">🎯 Results:</div>
                <div className="grid grid-cols-3 gap-2 mb-3">
                  {results.map((result, i) => (
                    <div key={i} className="bg-white border border-green-300 text-center py-2 px-3 rounded font-bold text-lg text-slate-800 shadow-sm">
                      {result}
                    </div>
                  ))}
                </div>
                <div className="bg-white border-2 border-green-400 text-center py-3 px-4 rounded-lg">
                  <div className="text-sm text-slate-600 mb-1">Total</div>
                  <div className="text-2xl font-bold text-green-600">{totalResult}</div>
                </div>
              </div>
            )}

            {/* Instructions */}
            <div className="bg-blue-50 border border-blue-200 p-4 rounded-lg">
              <div className="text-blue-800 font-semibold mb-2">💡 How to Use:</div>
              <ul className="text-sm text-blue-700 space-y-1">
                <li>• Adjust dice count with slider</li>
                <li>• Click "Roll Dice" to start</li>
                <li>• Drag to rotate camera view</li>
                <li>• Scroll to zoom in/out</li>
              </ul>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
} 