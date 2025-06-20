import React, { useRef, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Box, Text } from '@react-three/drei';
import * as THREE from 'three';

const DiceCube: React.FC<{ isSpinning: boolean }> = ({ isSpinning }) => {
  const meshRef = useRef<THREE.Mesh>(null!);

  useFrame((state, delta) => {
    if (meshRef.current && isSpinning) {
      meshRef.current.rotation.x += delta * 0.2;
      meshRef.current.rotation.y += delta * 0.2;
    }
  });

  return (
    <group ref={meshRef}>
      {/* Main dice cube */}
      <Box args={[1, 1, 1]} position={[0, 0, 0]}>
        <meshStandardMaterial color="#ffffff" />
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

const SimpleDice: React.FC = () => {
  const [isSpinning, setIsSpinning] = useState(true);

  const toggleSpin = () => {
    setIsSpinning(!isSpinning);
  };

  return (
    <div style={{ width: '100%', height: '400px' }}>
      <Canvas camera={{ position: [3, 3, 3], fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <DiceCube isSpinning={isSpinning} />
      </Canvas>
      
      <div style={{ padding: '10px', textAlign: 'center' }}>
        <h3>Step 2: Controllable Dice Rotation</h3>
        <p>White dice with numbers 1-6. Click button to start/stop rotation.</p>
        <button 
          onClick={toggleSpin}
          style={{
            padding: '10px 20px',
            fontSize: '16px',
            backgroundColor: isSpinning ? '#e74c3c' : '#27ae60',
            color: 'white',
            border: 'none',
            borderRadius: '5px',
            cursor: 'pointer',
            marginTop: '10px'
          }}
        >
          {isSpinning ? 'Stop Spinning' : 'Start Spinning'}
        </button>
      </div>
    </div>
  );
};

export default SimpleDice; 