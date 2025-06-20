import React, { useRef, useState, useEffect } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Text, OrbitControls } from '@react-three/drei';
import { Physics, useBox, usePlane } from '@react-three/cannon';
import * as THREE from 'three';

interface PhysicsDiceProps {
  position: [number, number, number];
  rolling: boolean;
  onSettled?: (value: number) => void;
}

const PhysicsDice: React.FC<PhysicsDiceProps> = ({ position, rolling, onSettled }) => {
  const [ref, api] = useBox(() => ({
    mass: 1,
    position,
    material: {
      friction: 0.6,
      restitution: 0.2,
    },
  }));

  const [settled, setSettled] = useState(false);
  const velocityRef = useRef<THREE.Vector3>(new THREE.Vector3());
  const [currentRotation, setCurrentRotation] = useState<THREE.Euler>(new THREE.Euler());

  useEffect(() => {
    if (rolling && !settled) {
      // Apply gentle random force when rolling starts
      const force: [number, number, number] = [
        (Math.random() - 0.5) * 4,
        Math.random() * 2 + 1,
        (Math.random() - 0.5) * 4
      ];
      const torque: [number, number, number] = [
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3,
        (Math.random() - 0.5) * 3
      ];
      
      api.applyImpulse(force, [0, 0, 0]);
      api.applyTorque(torque);
    }
  }, [rolling, api, settled]);

  useFrame(() => {
    if (rolling && !settled) {
      api.velocity.subscribe((velocity) => {
        velocityRef.current.set(velocity[0], velocity[1], velocity[2]);
        
        // Check if dice has settled (low velocity)
        if (velocityRef.current.length() < 0.1 && Math.abs(velocity[1]) < 0.1) {
          setSettled(true);
          
          // Get the rotation to determine which face is up
          api.rotation.subscribe((rotation) => {
            const euler = new THREE.Euler(rotation[0], rotation[1], rotation[2]);
            setCurrentRotation(euler);
            const result = getDiceValue(euler);
            onSettled?.(result);
          });
        }
      });
    }
  });

  // Reset settled state when rolling starts again
  useEffect(() => {
    if (rolling) {
      setSettled(false);
    }
  }, [rolling]);

  const getDiceValue = (rotation: THREE.Euler): number => {
    // Determine which face is pointing up based on rotation
    const up = new THREE.Vector3(0, 1, 0);
    up.applyEuler(rotation);
    
    const faces = [
      { normal: new THREE.Vector3(0, 1, 0), value: 1 },   // top
      { normal: new THREE.Vector3(0, -1, 0), value: 6 },  // bottom
      { normal: new THREE.Vector3(1, 0, 0), value: 2 },   // right
      { normal: new THREE.Vector3(-1, 0, 0), value: 5 },  // left
      { normal: new THREE.Vector3(0, 0, 1), value: 3 },   // front
      { normal: new THREE.Vector3(0, 0, -1), value: 4 },  // back
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
      {/* Main dice cube */}
      <Box args={[1, 1, 1]}>
        <meshStandardMaterial color="#ffffff" roughness={0.1} metalness={0.1} />
      </Box>
      
      {/* Dice face numbers */}
      <Text position={[0, 0.51, 0]} rotation={[-Math.PI/2, 0, 0]} fontSize={0.3} color="black">1</Text>
      <Text position={[0, -0.51, 0]} rotation={[Math.PI/2, 0, 0]} fontSize={0.3} color="black">6</Text>
      <Text position={[0.51, 0, 0]} rotation={[0, Math.PI/2, 0]} fontSize={0.3} color="black">2</Text>
      <Text position={[-0.51, 0, 0]} rotation={[0, -Math.PI/2, 0]} fontSize={0.3} color="black">5</Text>
      <Text position={[0, 0, 0.51]} rotation={[0, 0, 0]} fontSize={0.3} color="black">3</Text>
      <Text position={[0, 0, -0.51]} rotation={[0, Math.PI, 0]} fontSize={0.3} color="black">4</Text>
    </group>
  );
};

const Ground: React.FC = () => {
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
      <meshStandardMaterial color="#228B22" />
    </mesh>
  );
};

const Walls: React.FC = () => {
  // Create invisible walls to keep dice in bounds
  usePlane(() => ({ position: [5, 0, 0], rotation: [0, -Math.PI / 2, 0] }));
  usePlane(() => ({ position: [-5, 0, 0], rotation: [0, Math.PI / 2, 0] }));
  usePlane(() => ({ position: [0, 0, 5], rotation: [0, 0, 0] }));
  usePlane(() => ({ position: [0, 0, -5], rotation: [0, Math.PI, 0] }));
  
  return null;
};

const DicePhysics: React.FC = () => {
  const [rolling, setRolling] = useState(false);
  const [result, setResult] = useState<number | null>(null);
  const [rollCount, setRollCount] = useState(0);

  const rollDice = () => {
    setRolling(true);
    setResult(null);
    setRollCount(prev => prev + 1);
  };

  const handleDiceSettled = (value: number) => {
    setResult(value);
    setRolling(false);
  };

  return (
    <div style={{ width: '100%', height: '500px', position: 'relative' }}>
      <Canvas
        shadows
        camera={{ position: [5, 5, 5], fov: 75 }}
        style={{ background: 'linear-gradient(to bottom, #87CEEB, #E0F6FF)' }}
      >
        <ambientLight intensity={0.6} />
        <directionalLight
          position={[10, 10, 5]}
          intensity={1}
          castShadow
          shadow-mapSize={2048}
        />
        
        <Physics gravity={[0, -15, 0]}>
          <PhysicsDice 
            position={[0, 5, 0]} 
            rolling={rolling}
            onSettled={handleDiceSettled}
          />
          <Ground />
          <Walls />
        </Physics>
        
        <OrbitControls enablePan={false} enableZoom={true} enableRotate={true} />
      </Canvas>
      
      <div style={{ 
        position: 'absolute', 
        top: '20px', 
        left: '20px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '20px',
        borderRadius: '10px',
        fontFamily: 'Arial, sans-serif',
        minWidth: '200px'
      }}>
        <h3 style={{ margin: '0 0 15px 0', fontSize: '18px' }}>🎲 Step 3: Physics Dice</h3>
        
        <button 
          onClick={rollDice}
          disabled={rolling}
          style={{
            background: rolling ? '#666' : '#e74c3c',
            color: 'white',
            border: 'none',
            padding: '12px 20px',
            borderRadius: '5px',
            cursor: rolling ? 'not-allowed' : 'pointer',
            fontSize: '16px',
            fontWeight: 'bold',
            marginBottom: '15px',
            width: '100%'
          }}
        >
          {rolling ? 'Rolling...' : 'Roll Dice!'}
        </button>
        
        {result !== null && (
          <div style={{ 
            fontSize: '24px', 
            fontWeight: 'bold',
            textAlign: 'center',
            marginBottom: '10px',
            padding: '10px',
            background: '#27ae60',
            borderRadius: '5px'
          }}>
            Result: {result}
          </div>
        )}
        
        <div style={{ fontSize: '12px', opacity: 0.8 }}>
          Rolls: {rollCount}<br/>
          • Dice falls with gravity<br/>
          • Bounces realistically<br/>
          • Detects final face value
        </div>
      </div>
    </div>
  );
};

export default DicePhysics; 