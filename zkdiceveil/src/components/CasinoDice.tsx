import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Sphere, OrbitControls, Environment } from '@react-three/drei';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

interface CasinoDiceProps {
  position: [number, number, number];
  rolling: boolean;
  onSettled?: (value: number) => void;
  id: number;
}

const DiceDots: React.FC<{ face: number; position: [number, number, number]; rotation: [number, number, number] }> = ({ 
  face, 
  position, 
  rotation 
}) => {
  const getDotPositions = (faceNumber: number): [number, number][] => {
    const offset = 0.15;
    switch (faceNumber) {
      case 1:
        return [[0, 0]];
      case 2:
        return [[-offset, offset], [offset, -offset]];
      case 3:
        return [[-offset, offset], [0, 0], [offset, -offset]];
      case 4:
        return [[-offset, offset], [offset, offset], [-offset, -offset], [offset, -offset]];
      case 5:
        return [[-offset, offset], [offset, offset], [0, 0], [-offset, -offset], [offset, -offset]];
      case 6:
        return [[-offset, offset], [offset, offset], [-offset, 0], [offset, 0], [-offset, -offset], [offset, -offset]];
      default:
        return [[0, 0]];
    }
  };

  const dotPositions = getDotPositions(face);

  return (
    <group position={position} rotation={rotation}>
      {dotPositions.map((dot, index) => (
        <Sphere key={index} args={[0.04]} position={[dot[0], dot[1], 0.01]}>
          <meshStandardMaterial color="#1a1a1a" />
        </Sphere>
      ))}
    </group>
  );
};

const CasinoDiceSingle: React.FC<CasinoDiceProps> = ({ position, rolling, onSettled, id }) => {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    material: {
      friction: 0.6, // Higher friction to stop sliding
      restitution: 0.2, // Lower bounce (more realistic)
    },
  }));

  const [settled, setSettled] = useState(false);
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());

  useEffect(() => {
    if (rolling && !settled) {
      // Apply gentle, realistic forces like rolling dice on a table
      const force: [number, number, number] = [
        (Math.random() - 0.5) * 4 + (id * 0.5), // Much gentler horizontal forces
        Math.random() * 2 + 1, // Small upward push (like lifting and dropping)
        (Math.random() - 0.5) * 4 + (id * 0.5)
      ];
      const torque: [number, number, number] = [
        (Math.random() - 0.5) * 3, // Gentle rotation
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ];
      
      // Add a small delay for multiple dice
      setTimeout(() => {
        api.applyImpulse(force, [0, 0, 0]);
        api.applyTorque(torque);
      }, id * 150);
    }
  }, [rolling, api, settled, id]);

  useFrame(() => {
    if (rolling && !settled) {
      api.velocity.subscribe((velocity) => {
        velocityRef.current.set(velocity[0], velocity[1], velocity[2]);
        
        // Check if dice has settled (more sensitive with gentler physics)
        if (velocityRef.current.length() < 0.05 && Math.abs(velocity[1]) < 0.05) {
          setSettled(true);
          
          api.rotation.subscribe((rotation) => {
            const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
            const result = getDiceValue(euler);
            onSettled?.(result);
          });
        }
      });
    }
  });

  useEffect(() => {
    if (rolling) {
      setSettled(false);
    }
  }, [rolling]);

  const getDiceValue = (rotation: THREE.Euler): number => {
    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(rotation);
    
    const faces = [
      { normal: new THREE.Vector3(0, 1, 0), value: 1 },
      { normal: new THREE.Vector3(0, -1, 0), value: 6 },
      { normal: new THREE.Vector3(1, 0, 0), value: 2 },
      { normal: new THREE.Vector3(-1, 0, 0), value: 5 },
      { normal: new THREE.Vector3(0, 0, 1), value: 3 },
      { normal: new THREE.Vector3(0, 0, -1), value: 4 },
    ];

    let maxDot = -1;
    let result = 1;

    faces.forEach(face => {
      const dot = up.dot(face.normal);
      if (dot > maxDot) {
        maxDot = dot;
        result = face.value;
      }
    });

    return result;
  };

  return (
    <group ref={ref}>
      {/* Main dice cube with rounded appearance */}
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial 
          color="#f8f9fa" 
          roughness={0.2} 
          metalness={0.05}
        />
      </Box>
      
      {/* Dice faces with dots */}
      <DiceDots face={1} position={[0, 0.501, 0]} rotation={[-Math.PI/2, 0, 0]} />
      <DiceDots face={6} position={[0, -0.501, 0]} rotation={[Math.PI/2, 0, 0]} />
      <DiceDots face={2} position={[0.501, 0, 0]} rotation={[0, Math.PI/2, 0]} />
      <DiceDots face={5} position={[-0.501, 0, 0]} rotation={[0, -Math.PI/2, 0]} />
      <DiceDots face={3} position={[0, 0, 0.501]} rotation={[0, 0, 0]} />
      <DiceDots face={4} position={[0, 0, -0.501]} rotation={[0, Math.PI, 0]} />
    </group>
  );
};

const CasinoTable: React.FC = () => {
  const [ref] = usePlane(() => ({
    rotation: [-Math.PI / 2, 0, 0],
    position: [0, -3, 0],
    material: {
      friction: 0.8, // High friction table surface
      restitution: 0.1, // Very low bounce like felt
    },
  }));

  return (
    <mesh ref={ref} receiveShadow>
      <planeGeometry args={[20, 20]} />
      <meshStandardMaterial color="#0d5d2e" roughness={0.8} />
    </mesh>
  );
};

const TableEdges: React.FC = () => {
  // Create padded walls like a casino table
  usePlane(() => ({ position: [6, 0, 0], rotation: [0, -Math.PI / 2, 0] }));
  usePlane(() => ({ position: [-6, 0, 0], rotation: [0, Math.PI / 2, 0] }));
  usePlane(() => ({ position: [0, 0, 6], rotation: [0, 0, 0] }));
  usePlane(() => ({ position: [0, 0, -6], rotation: [0, Math.PI, 0] }));
  
  return null;
};

const CasinoDice: React.FC = () => {
  const [rolling, setRolling] = useState(false);
  const [results, setResults] = useState<number[]>([]);
  const [rollCount, setRollCount] = useState(0);
  const [diceCount, setDiceCount] = useState(2);
  const [settledCount, setSettledCount] = useState(0);

  const rollDice = () => {
    setRolling(true);
    setResults([]);
    setSettledCount(0);
    setRollCount(prev => prev + 1);
  };

  const handleDiceSettled = (value: number) => {
    setResults(prev => {
      const newResults = [...prev, value];
      setSettledCount(newResults.length);
      
      if (newResults.length === diceCount) {
        setRolling(false);
      }
      
      return newResults;
    });
  };

  const total = results.reduce((sum, val) => sum + val, 0);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [8, 8, 8], fov: 60 }}
        style={{ background: 'linear-gradient(to bottom, #1a1a2e, #16213e)' }}
      >
        <ambientLight intensity={0.4} />
        <directionalLight
          position={[15, 15, 10]}
          intensity={1.5}
          castShadow
          shadow-mapSize={2048}
        />
        <pointLight position={[-5, 10, 5]} intensity={0.8} color="#ffffff" />
        
        <Physics gravity={[0, -15, 0]} iterations={20}>
          {Array.from({ length: diceCount }, (_, i) => (
            <CasinoDiceSingle
              key={`dice-${rollCount}-${i}`} // Force remount on new roll
              id={i}
              position={[i * 1.5 - (diceCount - 1) * 0.75, 6, 0]} 
              rolling={rolling}
              onSettled={handleDiceSettled}
            />
          ))}
          <CasinoTable />
          <TableEdges />
        </Physics>
        
        <OrbitControls 
          enablePan={false} 
          enableZoom={true} 
          enableRotate={true}
          maxPolarAngle={Math.PI / 2.1}
          minDistance={5}
          maxDistance={20}
        />
        <Environment preset="night" />
      </Canvas>
      
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px',
        background: 'rgba(0,0,0,0.9)',
        color: 'white',
        padding: '20px',
        borderRadius: '15px',
        fontFamily: 'Arial, sans-serif',
        minWidth: '250px',
        boxShadow: '0 8px 25px rgba(0,0,0,0.4)'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '20px' }}>🎰 Casino Dice</h3>
        
        <div style={{ marginBottom: '15px' }}>
          <label style={{ display: 'block', marginBottom: '5px', fontSize: '14px' }}>
            Number of Dice: {diceCount}
          </label>
          <input
            type="range"
            min="1"
            max="4"
            value={diceCount}
            onChange={(e) => setDiceCount(parseInt(e.target.value))}
            disabled={rolling}
            style={{ width: '100%' }}
          />
        </div>
        
        <button 
          onClick={rollDice}
          disabled={rolling}
          style={{
            background: rolling ? '#666' : 'linear-gradient(45deg, #c0392b, #e74c3c)',
            color: 'white',
            border: 'none',
            padding: '15px 25px',
            borderRadius: '8px',
            cursor: rolling ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px',
            width: '100%',
            boxShadow: rolling ? 'none' : '0 4px 12px rgba(0,0,0,0.3)'
          }}
        >
          {rolling ? `Rolling... (${settledCount}/${diceCount})` : 'Roll Dice!'}
        </button>
        
        {results.length > 0 && (
          <div style={{ marginBottom: '15px' }}>
            <div style={{ 
              fontSize: '16px', 
              fontWeight: 'bold',
              marginBottom: '8px'
            }}>
              Results: {results.join(', ')}
            </div>
            {results.length === diceCount && (
              <div style={{ 
                fontSize: '24px', 
                fontWeight: 'bold',
                textAlign: 'center',
                padding: '10px',
                background: 'linear-gradient(45deg, #27ae60, #2ecc71)',
                borderRadius: '8px'
              }}>
                Total: {total}
              </div>
            )}
          </div>
        )}
        
        <div style={{ 
          fontSize: '12px', 
          opacity: 0.8,
          lineHeight: '1.4'
        }}>
          • Casino-style dice with dots<br/>
          • Realistic physics simulation<br/>
          • Multiple dice support<br/>
          • Rolls: {rollCount}
        </div>
      </div>
    </div>
  );
};

export default CasinoDice; 