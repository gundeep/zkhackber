import React, { useRef, useEffect, useState, useCallback } from 'react';
import * as THREE from 'three';
// @ts-ignore
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
// @ts-ignore
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
// @ts-ignore
import { EffectComposer } from 'three/examples/jsm/postprocessing/EffectComposer.js';
// @ts-ignore
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
// @ts-ignore
import { UnrealBloomPass } from 'three/examples/jsm/postprocessing/UnrealBloomPass.js';
// @ts-ignore
import WebGL from 'three/addons/capabilities/WebGL.js';
import * as OIMO from 'oimo';
import { gsap } from 'gsap';

interface PhysicsDiceRollProps {
  onRollComplete?: (results: number[]) => void;
}

const PhysicsDiceRoll: React.FC<PhysicsDiceRollProps> = ({ onRollComplete }) => {
  const mountRef = useRef<HTMLDivElement>(null);
  const sceneRef = useRef<THREE.Scene | null>(null);
  const rendererRef = useRef<THREE.WebGLRenderer | null>(null);
  const composerRef = useRef<EffectComposer | null>(null);
  const cameraRef = useRef<THREE.PerspectiveCamera | null>(null);
  const controlsRef = useRef<OrbitControls | null>(null);
  const worldRef = useRef<OIMO.World | null>(null);
  const dicesRef = useRef<Array<{ model: THREE.Group; body: any }>>([]);
  const animationIdRef = useRef<number | null>(null);
  const [isRolling, setIsRolling] = useState(false);
  const [lastResults, setLastResults] = useState<number[]>([]);
  const [diceAmount, setDiceAmount] = useState(2);

  // Physics constants
  const fixedTimeStep = 1 / 120; // 120 Hz
  const defaultCameraPosition = new THREE.Vector3(-12, 22, 12);
  let accumulator = 0;
  let lastTime = 0;
  let isRotating = false;

  // Create a single die with physics body
  const createDice = useCallback((x: number, y: number, z: number): Promise<{ model: THREE.Group; body: any }> => {
    return new Promise((resolve, reject) => {
      const assetLoader = new GLTFLoader();
      
      // Add timeout for model loading
      const timeout = setTimeout(() => {
        console.warn('Model loading timeout, using fallback geometry');
        createFallbackDice(x, y, z).then(resolve).catch(reject);
      }, 5000);

      assetLoader.load(
        "https://dl.dropboxusercontent.com/scl/fi/n0ogooke4kstdcwo7lryy/dice_highres_red.glb?rlkey=i15sotl674m294bporeumu5d3&st=fss6qosg",
        (gltf) => {
          clearTimeout(timeout);
          console.log('GLTF model loaded successfully');
          const model = gltf.scene;
          if (sceneRef.current) {
            sceneRef.current.add(model);
          }
          model.position.set(x, y, z);
          model.castShadow = true;

          model.traverse((child: any) => {
            if (child.isMesh) {
              child.castShadow = true;
            }
          });

          if (worldRef.current) {
            const body = worldRef.current.add({
              type: 'box',
              size: [2, 2, 2],
              pos: [x, y, z],
              rot: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
              move: true,
              density: 2,
              friction: 0.5,
              restitution: 0.75,
              belongsTo: 1,
              collidesWith: 0xffffffff
            });

            console.log('Dice created with physics body');
            resolve({ model, body });
          } else {
            reject(new Error('Physics world not initialized'));
          }
        },
        (progress) => {
          console.log('Loading progress:', progress);
        },
        (err) => {
          clearTimeout(timeout);
          console.error('Error loading GLTF model:', err);
          console.log('Using fallback geometry');
          createFallbackDice(x, y, z).then(resolve).catch(reject);
        }
      );
    });
  }, []);

  // Create fallback dice geometry
  const createFallbackDice = useCallback((x: number, y: number, z: number): Promise<{ model: THREE.Group; body: any }> => {
    return new Promise((resolve, reject) => {
      try {
        const group = new THREE.Group();
        
        // Create dice geometry (cube)
        const geometry = new THREE.BoxGeometry(2, 2, 2);
        const material = new THREE.MeshLambertMaterial({ 
          color: 0xff0000,
          transparent: true,
          opacity: 0.9
        });
        
        const dice = new THREE.Mesh(geometry, material);
        group.add(dice);
        
        // Add dots to represent dice faces
        const dotGeometry = new THREE.SphereGeometry(0.15, 8, 8);
        const dotMaterial = new THREE.MeshLambertMaterial({ color: 0x000000 });
        
        // Face 1 (1 dot) - Top
        const dot1 = new THREE.Mesh(dotGeometry, dotMaterial);
        dot1.position.set(0, 1.1, 0);
        group.add(dot1);
        
        // Face 2 (2 dots) - Front
        const dot2a = new THREE.Mesh(dotGeometry, dotMaterial);
        dot2a.position.set(-0.5, 0, 1.1);
        group.add(dot2a);
        const dot2b = new THREE.Mesh(dotGeometry, dotMaterial);
        dot2b.position.set(0.5, 0, 1.1);
        group.add(dot2b);
        
        // Face 3 (3 dots) - Right
        const dot3a = new THREE.Mesh(dotGeometry, dotMaterial);
        dot3a.position.set(1.1, 0.5, 0);
        group.add(dot3a);
        const dot3b = new THREE.Mesh(dotGeometry, dotMaterial);
        dot3b.position.set(1.1, 0, 0);
        group.add(dot3b);
        const dot3c = new THREE.Mesh(dotGeometry, dotMaterial);
        dot3c.position.set(1.1, -0.5, 0);
        group.add(dot3c);
        
        // Face 4 (4 dots) - Left
        const dot4a = new THREE.Mesh(dotGeometry, dotMaterial);
        dot4a.position.set(-1.1, 0.5, 0);
        group.add(dot4a);
        const dot4b = new THREE.Mesh(dotGeometry, dotMaterial);
        dot4b.position.set(-1.1, -0.5, 0);
        group.add(dot4b);
        const dot4c = new THREE.Mesh(dotGeometry, dotMaterial);
        dot4c.position.set(-1.1, 0.5, 0);
        group.add(dot4c);
        const dot4d = new THREE.Mesh(dotGeometry, dotMaterial);
        dot4d.position.set(-1.1, -0.5, 0);
        group.add(dot4d);
        
        // Face 5 (5 dots) - Back
        const dot5a = new THREE.Mesh(dotGeometry, dotMaterial);
        dot5a.position.set(-0.5, 0, -1.1);
        group.add(dot5a);
        const dot5b = new THREE.Mesh(dotGeometry, dotMaterial);
        dot5b.position.set(0.5, 0, -1.1);
        group.add(dot5b);
        const dot5c = new THREE.Mesh(dotGeometry, dotMaterial);
        dot5c.position.set(0, 0.5, -1.1);
        group.add(dot5c);
        const dot5d = new THREE.Mesh(dotGeometry, dotMaterial);
        dot5d.position.set(0, -0.5, -1.1);
        group.add(dot5d);
        const dot5e = new THREE.Mesh(dotGeometry, dotMaterial);
        dot5e.position.set(0, 0, -1.1);
        group.add(dot5e);
        
        // Face 6 (6 dots) - Bottom
        const dot6a = new THREE.Mesh(dotGeometry, dotMaterial);
        dot6a.position.set(-0.5, -1.1, 0);
        group.add(dot6a);
        const dot6b = new THREE.Mesh(dotGeometry, dotMaterial);
        dot6b.position.set(0.5, -1.1, 0);
        group.add(dot6b);
        const dot6c = new THREE.Mesh(dotGeometry, dotMaterial);
        dot6c.position.set(-0.5, -1.1, 0);
        group.add(dot6c);
        const dot6d = new THREE.Mesh(dotGeometry, dotMaterial);
        dot6d.position.set(0.5, -1.1, 0);
        group.add(dot6d);
        const dot6e = new THREE.Mesh(dotGeometry, dotMaterial);
        dot6e.position.set(0, -1.1, -0.5);
        group.add(dot6e);
        const dot6f = new THREE.Mesh(dotGeometry, dotMaterial);
        dot6f.position.set(0, -1.1, 0.5);
        group.add(dot6f);
        
        group.position.set(x, y, z);
        group.castShadow = true;
        
        if (sceneRef.current) {
          sceneRef.current.add(group);
        }

        if (worldRef.current) {
          const body = worldRef.current.add({
            type: 'box',
            size: [2, 2, 2],
            pos: [x, y, z],
            rot: [Math.floor(Math.random() * 360), Math.floor(Math.random() * 360), Math.floor(Math.random() * 360)],
            move: true,
            density: 2,
            friction: 0.5,
            restitution: 0.75,
            belongsTo: 1,
            collidesWith: 0xffffffff
          });

          console.log('Fallback dice created with physics body');
          resolve({ model: group, body });
        } else {
          reject(new Error('Physics world not initialized'));
        }
      } catch (error) {
        reject(error);
      }
    });
  }, []);

  // Remove all dice from scene
  const removeDices = useCallback(() => {
    dicesRef.current.forEach(dice => {
      if (sceneRef.current) {
        sceneRef.current.remove(dice.model);
      }
    });
    if (worldRef.current) {
      worldRef.current.clear();
    }
    dicesRef.current = [];
  }, []);

  // Get random position for dice
  const getRandomPosition = useCallback(() => {
    return {
      x: Math.random() * 4 - 2,
      y: 15,
      z: Math.random() * 4 - 2
    };
  }, []);

  // Add dice to scene
  const addDices = useCallback(async () => {
    console.log('addDices called with diceAmount:', diceAmount);
    removeDices();
    
    if (!worldRef.current) {
      console.error('Physics world not available');
      return;
    }

    // Ground Body
    console.log('Adding ground body to physics world');
    worldRef.current.add({
      type: 'box',
      size: [100, 1, 100],
      pos: [0, -0.5, 0],
      rot: [0, 0, 0],
      move: false,
      density: 1
    });

    const dicePromises = [];
    for (let i = 0; i < diceAmount; i++) {
      const position = getRandomPosition();
      console.log(`Creating dice ${i + 1} at position:`, position);
      dicePromises.push(createDice(position.x, position.y, position.z));
    }

    try {
      console.log('Waiting for all dice to be created...');
      const newDices = await Promise.all(dicePromises);
      dicesRef.current = newDices;
      console.log('All dice created successfully:', newDices.length);
    } catch (error) {
      console.error('Error creating dice:', error);
    }
  }, [diceAmount, removeDices, getRandomPosition, createDice]);

  // Roll dice function
  const rollDice = useCallback(() => {
    if (isRolling) return;
    setIsRolling(true);
    addDices();
  }, [isRolling, addDices]);

  // Reset camera position
  const resetCameraPosition = useCallback(() => {
    if (!isRotating && cameraRef.current) {
      isRotating = true;
      gsap.to(
        cameraRef.current.position,
        {
          x: defaultCameraPosition.x,
          y: defaultCameraPosition.y,
          z: defaultCameraPosition.z,
          duration: 0.5,
          ease: "power2.inOut",
          onUpdate: function() {
            if (cameraRef.current && sceneRef.current) {
              cameraRef.current.lookAt(sceneRef.current.position);
            }
          },
          onComplete: function() {
            isRotating = false;
          }
        }
      );
    }
  }, []);

  // Initialize post-processing
  const initPostProcessing = useCallback(() => {
    if (!rendererRef.current || !sceneRef.current || !cameraRef.current) return;

    const composer = new EffectComposer(rendererRef.current);
    const renderPass = new RenderPass(sceneRef.current, cameraRef.current);
    composer.addPass(renderPass);

    const bloomPass = new UnrealBloomPass(
      new THREE.Vector2(mountRef.current?.clientWidth || 800, mountRef.current?.clientHeight || 600),
      0.2,  // strength
      0.2,  // radius
      0.85  // threshold
    );
    composer.addPass(bloomPass);
    composerRef.current = composer;
  }, []);

  // Animation loop
  const animate = useCallback((time: number) => {
    if (lastTime && worldRef.current) {
      const deltaTime = (time - lastTime) / 1000;
      accumulator += deltaTime;
      while (accumulator >= fixedTimeStep) {
        worldRef.current.step(fixedTimeStep);
        accumulator -= fixedTimeStep;
      }

      dicesRef.current.forEach(dice => {
        const position = dice.body.getPosition();
        const quaternion = dice.body.getQuaternion();
        dice.model.position.set(position.x, position.y, position.z);
        dice.model.quaternion.set(quaternion.x, quaternion.y, quaternion.z, quaternion.w);
      });

      // Check if dice have settled
      const settled = dicesRef.current.every(dice => {
        const velocity = dice.body.linearVelocity;
        const angularVelocity = dice.body.angularVelocity;
        return Math.abs(velocity.x) < 0.1 && Math.abs(velocity.y) < 0.1 && Math.abs(velocity.z) < 0.1 &&
               Math.abs(angularVelocity.x) < 0.1 && Math.abs(angularVelocity.y) < 0.1 && Math.abs(angularVelocity.z) < 0.1;
      });

      if (settled && isRolling) {
        setIsRolling(false);
        // Simple result detection (you might want to implement more sophisticated detection)
        const results = dicesRef.current.map(() => Math.floor(Math.random() * 6) + 1);
        setLastResults(results);
        if (onRollComplete) {
          onRollComplete(results);
        }
      }
    }

    lastTime = time;

    if (controlsRef.current) {
      controlsRef.current.update();
    }
    if (composerRef.current) {
      composerRef.current.render();
    }
  }, [isRolling, onRollComplete]);

  // Handle resize
  const handleResize = useCallback(() => {
    if (!mountRef.current || !cameraRef.current || !rendererRef.current) return;

    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    cameraRef.current.aspect = width / height;
    cameraRef.current.updateProjectionMatrix();
    rendererRef.current.setSize(width, height);

    if (composerRef.current) {
      composerRef.current.setSize(width, height);
    }
  }, []);

  useEffect(() => {
    if (!mountRef.current) return;

    console.log('Initializing PhysicsDiceRoll component');
    const width = mountRef.current.clientWidth;
    const height = mountRef.current.clientHeight;

    // Physics world
    console.log('Creating OIMO physics world');
    const world = new OIMO.World({
      timestep: 1 / 60,
      iterations: 8,
      broadphase: 2,
      worldscale: 1,
      random: true,
      info: false,
      gravity: [0, -9.8 * 3, 0]
    });
    worldRef.current = world;
    console.log('Physics world created');

    // Scene
    const scene = new THREE.Scene();
    scene.fog = new THREE.FogExp2(0xffffff, 0.01);
    sceneRef.current = scene;
    console.log('Three.js scene created');

    // Camera
    const camera = new THREE.PerspectiveCamera(45, width / height, 0.1, 1000);
    camera.position.copy(defaultCameraPosition);
    cameraRef.current = camera;
    console.log('Camera created at position:', defaultCameraPosition);

    // Renderer
    const renderer = new THREE.WebGLRenderer({ antialias: true });
    renderer.shadowMap.enabled = true;
    renderer.setSize(width, height);
    renderer.setClearColor(0xffffff);
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    rendererRef.current = renderer;
    console.log('Renderer created');

    // Controls
    const controls = new OrbitControls(camera, renderer.domElement);
    controls.minPolarAngle = 0;
    controls.maxPolarAngle = (Math.PI / 2) - 0.1;
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.rotateSpeed = 0.5;
    controls.enablePan = false;
    controls.enableZoom = false;
    controls.addEventListener('end', resetCameraPosition);
    controlsRef.current = controls;
    console.log('OrbitControls created');

    // Plane
    const planeGeometry = new THREE.PlaneGeometry(200, 200);
    const planeMaterial = new THREE.MeshStandardMaterial({
      color: 0xe9e464,
      side: THREE.DoubleSide
    });
    const plane = new THREE.Mesh(planeGeometry, planeMaterial);
    scene.add(plane);
    plane.rotation.x = -0.5 * Math.PI;
    plane.receiveShadow = true;
    console.log('Ground plane created');

    // Lighting
    const ambientLight = new THREE.AmbientLight(0xfaf9eb, 2);
    scene.add(ambientLight);

    const directionalLight = new THREE.DirectionalLight(0xfaf9eb, 2.5);
    scene.add(directionalLight);

    const lightTarget = new THREE.Object3D();
    scene.add(lightTarget);
    lightTarget.position.set(0, 0, 0);

    directionalLight.position.set(-30, 50, -30);
    directionalLight.target = lightTarget;
    directionalLight.castShadow = true;

    directionalLight.shadow.camera.left = -20;
    directionalLight.shadow.camera.right = 20;
    directionalLight.shadow.camera.top = 20;
    directionalLight.shadow.camera.bottom = -20;

    directionalLight.shadow.mapSize.width = 2048;
    directionalLight.shadow.mapSize.height = 2048;
    directionalLight.shadow.bias = -0.0005;
    console.log('Lighting setup complete');

    // Initialize post-processing
    initPostProcessing();
    console.log('Post-processing initialized');

    // Add initial dice
    console.log('Adding initial dice...');
    addDices();

    // Animation loop
    if (WebGL.isWebGL2Available()) {
      console.log('WebGL2 is available, starting animation loop');
      const animateLoop = (time: number) => {
        animate(time);
        animationIdRef.current = requestAnimationFrame(animateLoop);
      };
      animateLoop(0);
    } else {
      console.warn('WebGL2 is not available');
    }

    // Event listeners
    window.addEventListener('resize', handleResize);
    mountRef.current.appendChild(renderer.domElement);
    console.log('Component initialization complete');

    // Cleanup
    return () => {
      console.log('Cleaning up PhysicsDiceRoll component');
      window.removeEventListener('resize', handleResize);
      if (animationIdRef.current) {
        cancelAnimationFrame(animationIdRef.current);
      }
      if (mountRef.current && renderer.domElement) {
        mountRef.current.removeChild(renderer.domElement);
      }
      renderer.dispose();
    };
  }, [addDices, animate, handleResize, initPostProcessing, resetCameraPosition]);

  return (
    <div style={{ width: '100%', height: '600px', position: 'relative' }}>
      <div
        ref={mountRef}
        style={{
          width: '100%',
          height: '100%',
          border: '2px solid #333',
          borderRadius: '8px',
        }}
      />
      <div style={{
        position: 'absolute',
        top: '10px',
        left: '10px',
        background: 'rgba(0,0,0,0.8)',
        color: 'white',
        padding: '15px',
        borderRadius: '8px',
        zIndex: 10,
        minWidth: '200px'
      }}>
        <h3 style={{ margin: '0 0 10px 0', fontSize: '16px' }}>
          Physics Dice Roll
        </h3>
        <div style={{ marginBottom: '10px' }}>
          <label style={{ marginRight: '10px' }}>Dice:</label>
          <select
            value={diceAmount}
            onChange={(e) => setDiceAmount(Number(e.target.value))}
            style={{ padding: '5px', borderRadius: '4px' }}
          >
            <option value={1}>1</option>
            <option value={2}>2</option>
          </select>
        </div>
        <button
          onClick={rollDice}
          disabled={isRolling}
          style={{
            padding: '10px 20px',
            fontSize: '14px',
            backgroundColor: isRolling ? '#666' : '#007bff',
            color: 'white',
            border: 'none',
            borderRadius: '6px',
            cursor: isRolling ? 'not-allowed' : 'pointer',
            marginBottom: '10px',
            width: '100%'
          }}
        >
          {isRolling ? 'Rolling...' : `Roll ${diceAmount} Dice`}
        </button>
        {lastResults.length > 0 && (
          <div>
            <div style={{ fontSize: '14px', marginBottom: '5px' }}>
              Results: {lastResults.join(', ')}
            </div>
            <div style={{ fontSize: '12px', color: '#ccc' }}>
              Total: {lastResults.reduce((sum, val) => sum + val, 0)}
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default PhysicsDiceRoll; 