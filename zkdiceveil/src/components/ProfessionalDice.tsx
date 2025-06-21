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
  const currentRotation = useRef<[number, number, number]>([0, 0, 0]);
  const meshRef = useRef<THREE.Mesh>(null);

  useEffect(() => {
    if (rolling) {
      setSettled(false);
      console.log(`Dice ${id} starting new roll, resetting state`);
      
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
      
      // Apply realistic impulse with delay
      setTimeout(() => {
        const forceX = (Math.random() - 0.5) * 3;
        const forceY = 8 + Math.random() * 4;
        const forceZ = (Math.random() - 0.5) * 3;
        
        const impulse: [number, number, number] = [forceX, forceY, forceZ];
        const torque: [number, number, number] = [
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8,
          (Math.random() - 0.5) * 8
        ];
        
        api.applyImpulse(impulse, [0, 0, 0]);
        api.applyTorque(torque);
      }, id * 150);

      // Fallback timeout - ensure dice settles after 5 seconds
      const fallbackTimeout = setTimeout(() => {
        if (!settled) {
          console.log(`Dice ${id} forced to settle after timeout`);
          const randomResult = Math.floor(Math.random() * 6) + 1;
          setSettled(true);
          onResult(randomResult);
        }
      }, 5000);

      return () => clearTimeout(fallbackTimeout);
    }
  }, [rolling, api, id, settled, onResult]);

  // Track rotation changes
  useEffect(() => {
    const unsubscribeRotation = api.rotation.subscribe((rotation) => {
      currentRotation.current = rotation;
    });
    return unsubscribeRotation;
  }, [api]);

  // Sleep event listener for result detection
  useEffect(() => {
    let hasReported = false; // Flag to ensure we only report once per roll
    
    const unsubscribe = api.velocity.subscribe((velocity) => {
      if (rolling && !settled && !hasReported) {
        const speed = Math.sqrt(velocity[0] ** 2 + velocity[1] ** 2 + velocity[2] ** 2);
        console.log(`Dice ${id} speed: ${speed.toFixed(3)}`);
        if (speed < 0.1) {
          console.log(`Dice ${id} settled, checking rotation...`);
          hasReported = true; // Mark as reported to prevent multiple calls
          
          // Use a timeout to ensure the rotation has stabilized
                      setTimeout(() => {
              if (!settled) { // Double-check we haven't already settled
                const rotation = currentRotation.current;
                console.log(`Dice ${id} rotation:`, rotation);
                
                const result = getFaceFromRotation(rotation, meshRef.current || undefined);
                console.log(`Dice ${id} face result: ${result}`);
                
                if (result > 0) {
                  console.log(`Dice ${id} final result: ${result}`);
                  setSettled(true);
                  onResult(result);
                }
              }
            }, 100); // Small delay to ensure rotation has stabilized
        }
      }
    });

    return unsubscribe;
  }, [rolling, settled, api, onResult, id]);

  return (
    <group ref={ref}>
      <mesh ref={meshRef} geometry={diceGeometry.current} castShadow receiveShadow>
        <meshStandardMaterial 
          color="#fafafa" 
          roughness={0.05}
          metalness={0.02}
        />
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
function getFaceFromRotation(rotation: [number, number, number], mesh?: THREE.Mesh): number {
  // Define the face normals for a standard dice
  // These correspond to the faces created in the dice geometry
  const faceNormals = [
    new THREE.Vector3(0, 1, 0),   // Face 1 (top) - 1 dot
    new THREE.Vector3(1, 0, 0),   // Face 2 (right) - 2 dots  
    new THREE.Vector3(0, 0, 1),   // Face 3 (front) - 3 dots
    new THREE.Vector3(0, 0, -1),  // Face 4 (back) - 4 dots
    new THREE.Vector3(-1, 0, 0),  // Face 5 (left) - 5 dots
    new THREE.Vector3(0, -1, 0),  // Face 6 (bottom) - 6 dots
  ];
  
  // Create rotation matrix from Euler angles
  const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2], 'XYZ');
  const rotationMatrix = new THREE.Matrix4().makeRotationFromEuler(euler);
  
  // Transform face normals by rotation
  const transformedNormals = faceNormals.map(normal => {
    const transformed = normal.clone();
    transformed.applyMatrix4(rotationMatrix);
    return transformed;
  });
  
  // Find which face normal is closest to pointing up (0, 1, 0)
  const upVector = new THREE.Vector3(0, 1, 0);
  let maxDot = -1;
  let topFace = 1;
  
  transformedNormals.forEach((normal, index) => {
    const dot = normal.dot(upVector);
    if (dot > maxDot) {
      maxDot = dot;
      topFace = index + 1; // Face numbers are 1-indexed
    }
  });
  
  console.log('Face detection (improved):', {
    rotation,
    topFace,
    maxDot: maxDot.toFixed(3),
    transformedNormals: transformedNormals.map(n => ({
      x: n.x.toFixed(3),
      y: n.y.toFixed(3), 
      z: n.z.toFixed(3)
    }))
  });
  
  return topFace;
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

interface ProfessionalDiceProps {
  onClose?: () => void;
  onCommitToChain?: (rollCount: number, averageRoll: number, highestRoll: number) => void;
}

export default function ProfessionalDice({ onClose, onCommitToChain }: ProfessionalDiceProps) {
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [diceCount, setDiceCount] = useState(2);
  const [rollCount, setRollCount] = useState(0);
  const [allRolls, setAllRolls] = useState<number[]>([]);
  const [committing, setCommitting] = useState(false);
  const [lastCompletedRoll, setLastCompletedRoll] = useState<number | null>(null);

  const handleRoll = () => {
    setRolling(true);
    setResults([]);
    setRollCount(prev => prev + 1);
    setLastCompletedRoll(null); // Reset last completed roll
    
    setTimeout(() => {
      setRolling(false);
    }, 100);
  };

  const handleResult = (result: number, index: number) => {
    console.log(`Dice ${index} result: ${result}`);
    setResults(prev => {
      const newResults = [...prev];
      // Only update if this dice hasn't already reported a result
      if (newResults[index] === undefined || newResults[index] === 0) {
        newResults[index] = result;
        console.log('Updated results array:', newResults);
        return newResults;
      } else {
        console.log(`Dice ${index} already has result ${newResults[index]}, ignoring new result ${result}`);
        return prev; // Return previous state unchanged
      }
    });
  };

  const totalResult = results.reduce((sum, result) => sum + result, 0);
  const allSettled = results.length === diceCount && results.every(r => r > 0);
  
  // Calculate statistics
  const averageRoll = allRolls.length > 0 ? (allRolls.reduce((sum, roll) => sum + roll, 0) / allRolls.length).toFixed(1) : '0.0';
  const highestRoll = allRolls.length > 0 ? Math.max(...allRolls) : 0;
  
  // Debug: Log the calculation details
  console.log('Average calculation debug:', {
    allRolls,
    allRollsLength: allRolls.length,
    sum: allRolls.length > 0 ? allRolls.reduce((sum, roll) => sum + roll, 0) : 0,
    rawAverage: allRolls.length > 0 ? allRolls.reduce((sum, roll) => sum + roll, 0) / allRolls.length : 0,
    formattedAverage: averageRoll
  });

  // Use useEffect to track when all dice have settled and add to allRolls
  useEffect(() => {
    console.log('useEffect triggered:', { allSettled, totalResult, results, diceCount, lastCompletedRoll });
    if (allSettled && totalResult > 0 && lastCompletedRoll !== totalResult) {
      console.log('Conditions met, updating allRolls');
      setLastCompletedRoll(totalResult);
      setAllRolls(prevRolls => {
        const newRolls = [...prevRolls, totalResult];
        console.log('Adding roll to history:', totalResult, 'New history:', newRolls);
        return newRolls;
      });
    } else {
      console.log('Conditions not met for adding roll:', {
        allSettled,
        totalResult,
        lastCompletedRoll,
        alreadyRecorded: lastCompletedRoll === totalResult
      });
    }
  }, [allSettled, totalResult, lastCompletedRoll]);

  // Debug logging for statistics
  useEffect(() => {
    console.log('Statistics update:', {
      allRolls,
      rollCount,
      averageRoll,
      highestRoll,
      allRollsLength: allRolls.length
    });
  }, [allRolls, rollCount, averageRoll, highestRoll]);

  return (
    <div className="fixed inset-0 w-full h-full bg-gradient-to-b from-gray-900 to-black overflow-hidden z-10">
      {/* Full Screen 3D Canvas */}
      <Canvas
        shadows
        camera={{ position: [0, 4, 8], fov: 65 }}
        gl={{ antialias: true }}
        className="w-full h-full"
        style={{ width: '100vw', height: '100vh' }}
      >
        <color attach="background" args={['#0a0a0a']} />
        
        <ambientLight intensity={0.3} />
        <directionalLight
          position={[10, 15, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize-width={4096}
          shadow-mapSize-height={4096}
          shadow-camera-far={25}
          shadow-camera-left={-10}
          shadow-camera-right={10}
          shadow-camera-top={10}
          shadow-camera-bottom={-10}
        />
        <pointLight position={[-10, 8, 10]} intensity={0.8} color="#ffffff" />
        <pointLight position={[10, 8, -8]} intensity={0.5} color="#4a90e2" />
        <spotLight 
          position={[0, 15, 0]} 
          intensity={0.7}
          angle={0.4}
          penumbra={0.5}
          castShadow
          shadow-mapSize-width={2048}
          shadow-mapSize-height={2048}
        />
        
        <Physics gravity={[0, -30, 0]} allowSleep={true}>
          {Array.from({ length: diceCount }, (_, i) => (
            <ProfessionalDiceSingle
              key={i}
              id={i}
              position={[i * 1.5 - (diceCount - 1) * 0.75, 4, 0]}
              rolling={rolling}
              onResult={(result) => handleResult(result, i)}
            />
          ))}
          <Floor />
        </Physics>

        <OrbitControls 
          enablePan={false}
          minDistance={4}
          maxDistance={25}
          maxPolarAngle={Math.PI / 2.1}
          enableDamping={true}
          dampingFactor={0.05}
        />
        <Environment preset="city" />
      </Canvas>
      
      {/* Floating Controls Panel - Top Left */}
      <div className="absolute top-6 left-6 bg-black/90 backdrop-blur-md text-white p-6 rounded-2xl shadow-2xl border border-white/20 min-w-80">
        <div className="flex items-center justify-between mb-6">
          <div className="flex items-center gap-3">
            <div className="w-3 h-3 bg-red-500 rounded-full"></div>
            <div className="w-3 h-3 bg-yellow-500 rounded-full"></div>
            <div className="w-3 h-3 bg-green-500 rounded-full"></div>
            <h2 className="text-xl font-bold ml-4">🎲 Professional Dice</h2>
          </div>
          {onClose && (
            <button
              onClick={onClose}
              className="text-white/60 hover:text-white transition-colors text-2xl leading-none"
              title="Close dice simulator"
            >
              ×
            </button>
          )}
        </div>
        
        {/* Dice Count Control */}
        <div className="mb-6">
          <label className="block text-white/90 font-semibold mb-3">
            Number of Dice: <span className="text-blue-400">{diceCount}</span>
          </label>
          <input
            type="range"
            min="1"
            max="6"
            value={diceCount}
            onChange={(e) => setDiceCount(parseInt(e.target.value))}
            className="w-full h-2 bg-white/20 rounded-lg appearance-none cursor-pointer slider"
            disabled={rolling}
          />
          <div className="flex justify-between text-xs text-white/60 mt-1">
            <span>1</span>
            <span>6</span>
          </div>
        </div>

        {/* Roll Counter Display */}
        <div className="mb-4 text-center">
          <div className="bg-white/10 border border-white/20 rounded-lg p-3 backdrop-blur-sm">
            <div className="text-white/70 text-sm font-medium mb-1">Total Rolls</div>
            <div className="text-2xl font-bold text-blue-400">{rollCount}</div>
          </div>
        </div>

        {/* Roll Button */}
        <button
          onClick={handleRoll}
          disabled={rolling}
          className="w-full bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 disabled:from-gray-600 disabled:to-gray-700 text-white px-6 py-4 rounded-xl font-bold text-lg transition-all duration-200 shadow-lg hover:shadow-xl transform hover:scale-105 disabled:transform-none disabled:hover:scale-100 mb-4"
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

        {/* Action Buttons */}
        <div className="grid grid-cols-2 gap-2 mb-4">
          <button
            onClick={() => {
              setRollCount(0);
              setResults([]);
              setAllRolls([]);
              setLastCompletedRoll(null);
            }}
            disabled={rolling || committing}
            className="bg-gradient-to-r from-gray-600 to-gray-700 hover:from-gray-700 hover:to-gray-800 disabled:from-gray-500 disabled:to-gray-600 text-white px-3 py-2 rounded-lg font-semibold text-xs transition-all duration-200"
          >
            🔄 Reset
          </button>
          
          {onCommitToChain && rollCount > 0 && (
            <button
              onClick={async () => {
                if (onCommitToChain) {
                  setCommitting(true);
                  try {
                    await onCommitToChain(rollCount, parseFloat(averageRoll), highestRoll);
                  } catch (error) {
                    console.error('Failed to commit to chain:', error);
                  } finally {
                    setCommitting(false);
                  }
                }
              }}
              disabled={rolling || committing || rollCount === 0}
              className="bg-gradient-to-r from-green-600 to-green-700 hover:from-green-700 hover:to-green-800 disabled:from-gray-500 disabled:to-gray-600 text-white px-3 py-2 rounded-lg font-semibold text-xs transition-all duration-200"
            >
              {committing ? '⏳' : '🔗'} {committing ? 'Saving...' : 'To Chain'}
            </button>
          )}
        </div>

        {/* Statistics Display */}
        {rollCount > 0 && (
          <div className="bg-gradient-to-r from-purple-900/50 to-indigo-900/50 border border-purple-400/30 p-4 rounded-xl backdrop-blur-sm mb-4">
            <div className="text-purple-300 font-semibold mb-3">📊 Statistics</div>
            <div className="grid grid-cols-2 gap-3">
              <div className="bg-white/10 border border-purple-300/30 text-center py-2 px-3 rounded-lg backdrop-blur-sm">
                <div className="text-xs text-purple-200 mb-1">Average</div>
                <div className="text-lg font-bold text-purple-300">{averageRoll}</div>
              </div>
              <div className="bg-white/10 border border-purple-300/30 text-center py-2 px-3 rounded-lg backdrop-blur-sm">
                <div className="text-xs text-purple-200 mb-1">Highest</div>
                <div className="text-lg font-bold text-purple-300">{highestRoll}</div>
              </div>
            </div>
          </div>
        )}

        {/* Results Display */}
        {allSettled && (
          <div className="bg-gradient-to-r from-green-900/50 to-emerald-900/50 border border-green-400/30 p-4 rounded-xl backdrop-blur-sm">
            <div className="text-green-300 font-semibold mb-3">🎯 Results:</div>
            <div className="grid grid-cols-3 gap-2 mb-3">
              {results.map((result, i) => (
                <div key={i} className="bg-white/20 border border-green-300/50 text-center py-2 px-3 rounded-lg font-bold text-lg text-white backdrop-blur-sm">
                  {result}
                </div>
              ))}
            </div>
            <div className="bg-white/20 border-2 border-green-400/50 text-center py-3 px-4 rounded-lg backdrop-blur-sm">
              <div className="text-sm text-green-300 mb-1">Total</div>
              <div className="text-2xl font-bold text-green-400">{totalResult}</div>
            </div>
          </div>
        )}
      </div>

      {/* Large Sum Display - Top Center */}
      {allSettled && (
        <div className="absolute top-6 left-1/2 transform -translate-x-1/2 bg-gradient-to-r from-yellow-400 via-orange-500 to-red-500 backdrop-blur-md text-white p-8 rounded-3xl shadow-2xl border-4 border-yellow-300 animate-pulse">
          <div className="text-center">
            <div className="text-lg font-bold text-yellow-100 mb-3 uppercase tracking-wider">🎲 DICE TOTAL 🎲</div>
            <div className="text-8xl font-black text-white mb-3 drop-shadow-2xl">{totalResult}</div>
            <div className="text-lg text-yellow-100 font-semibold">
              {results.join(' + ')} = {totalResult}
            </div>
          </div>
        </div>
      )}

      {/* Always Visible Sum Display - Bottom Center */}
      <div className="absolute bottom-6 left-1/2 transform -translate-x-1/2 bg-black/90 backdrop-blur-md text-white p-6 rounded-2xl shadow-2xl border-2 border-blue-400/50 min-w-80">
        <div className="text-center">
          <div className="flex justify-between items-center mb-3">
            <div className="text-blue-300 font-semibold">🎯 Current Results</div>
            <div className="text-white/70 text-sm">
              Rolls: <span className="text-blue-400 font-bold">{rollCount}</span>
            </div>
          </div>
          
          {results.length > 0 ? (
            <div>
              <div className="flex justify-center gap-3 mb-4">
                {Array.from({ length: diceCount }, (_, i) => (
                  <div key={i} className={`w-12 h-12 rounded-lg border-2 flex items-center justify-center font-bold text-lg ${
                    results[i] ? 'bg-green-500/80 border-green-300 text-white' : 'bg-gray-600/50 border-gray-400 text-gray-300'
                  }`}>
                    {results[i] || '?'}
                  </div>
                ))}
              </div>
              
              <div className="bg-gradient-to-r from-blue-600 to-purple-600 text-center py-4 px-6 rounded-xl">
                <div className="text-sm text-blue-200 mb-2">TOTAL SUM</div>
                <div className="text-4xl font-bold text-white">{totalResult}</div>
                {allSettled && (
                  <div className="text-sm text-blue-200 mt-2">
                    {results.join(' + ')} = {totalResult}
                  </div>
                )}
              </div>
            </div>
          ) : (
            <div className="text-gray-400 py-4">
              Roll the dice to see results!
            </div>
          )}
        </div>
      </div>

      {/* Floating Instructions Panel - Bottom Right */}
      <div className="absolute bottom-6 right-6 bg-black/80 backdrop-blur-md text-white p-4 rounded-xl border border-white/20">
        <div className="text-blue-300 font-semibold mb-2">💡 Controls:</div>
        <ul className="text-sm text-white/80 space-y-1">
          <li>• Drag to rotate view</li>
          <li>• Scroll to zoom</li>
          <li>• Adjust dice count</li>
          <li>• Click roll to play</li>
        </ul>
      </div>

      {/* Rolling Status Overlay */}
      {rolling && (
        <div className="absolute inset-0 bg-black/20 flex items-center justify-center pointer-events-none">
          <div className="bg-black/90 backdrop-blur-md text-white px-8 py-4 rounded-2xl text-2xl font-bold border border-white/20">
            <span className="flex items-center gap-3">
              <span className="animate-spin text-3xl">🎲</span>
              Rolling Dice...
            </span>
          </div>
        </div>
      )}
    </div>
  );
} 