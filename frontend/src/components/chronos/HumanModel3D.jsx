import React, { useRef, useMemo, Suspense, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, useGLTF, Sphere, Float, Html } from '@react-three/drei';
import * as THREE from 'three';

// 1. The Holographic Material
const hologramMaterial = new THREE.MeshStandardMaterial({
  color: '#00ffa3', // Neon mint green
  wireframe: true,
  transparent: true,
  opacity: 0.15,
});

// 2. The Model Loader Component
const HologramBody = ({ modelPos, modelRot, modelScale }) => {
  // Load the new patient GLB file from the public folder
  const { scene } = useGLTF('/patient.glb');

  // Apply the holographic wireframe to every mesh in the loaded model
  useMemo(() => {
    scene.traverse((child) => {
      if (child.isMesh) {
        child.material = hologramMaterial;
      }
    });
  }, [scene]);

  // Rotate to lie flat and face upwards (can be tweaked via calibrator)
  const rotation = modelRot;
  const position = modelPos;

  return <primitive object={scene} scale={modelScale} position={position} rotation={rotation} />;
};

// 3. The Dynamic Risk Node (The glowing red organ)
const RiskNode = ({ highlightOrgan, riskLevel, calibPos }) => {
  const nodeRef = useRef();

  // Pulse animation for the glowing node
  useFrame(({ clock }) => {
    if (nodeRef.current) {
      const scale = 1 + Math.sin(clock.getElapsedTime() * 4) * 0.2;
      nodeRef.current.scale.set(scale, scale, scale);
    }
  });

  // Map risk types to specific XYZ coordinates inside the horizontal 3D model
  // *IMPORTANT: You will need to tweak these X, Y, Z numbers!*
  // With horizontal models, Z or Y typically runs head-to-toe, and the other runs up/down off the bed.
  const getCoordinates = (organ) => {
    switch (organ) {
      case 'heart':
      case 'Septic Shock':
      case 'Post-CABG Recovery':
        return [-1.35, 1.05, -1.15]; // Left Chest (Heart) - Calibrated

      case 'lungs':
      case 'Pneumonia / ARDS':
        return [0, 0.5, 0.4]; // Center Chest (Lungs) - Tweak me!

      case 'kidneys':
      case 'Acute Kidney Injury':
        return [0, 0.1, -0.4]; // Lower back (Kidneys) - Tweak me!

      case 'stomach':
      case 'GI Bleed':
        return [0, 0.2, 0.8]; // Abdomen - Tweak me!

      case 'Trauma - MVC':
        return [0, 1.2, 0]; // Head - Tweak me!

      default:
        return [0, 999, 0]; // Hide it if no risk
    }
  };

  const position = calibPos || getCoordinates(highlightOrgan);

  // Decide color based on risk level (defaulting to critical red for demo setup if no explicit risk level)
  const baseColor = riskLevel > 0.7 || !riskLevel ? '#e11d48' : (riskLevel > 0.4 ? '#fbbf24' : '#64d2ff');

  if (!highlightOrgan) return null;

  return (
    <Sphere ref={nodeRef} args={[0.08, 16, 16]} position={position}>
      <meshBasicMaterial color={baseColor} wireframe={true} />
    </Sphere>
  );
};

// 4. The 3D Scanning Ring
const ScanningRing = ({ modelPos, isRotating }) => {
  const ringRef = useRef();

  // Animate the ring back and forth
  useFrame(({ clock }) => {
    if (ringRef.current && modelPos && isRotating) {
      // Oscillate along the X-axis around the model's locked center
      // 1.8 multiplier stretches the travel distance to cover the whole body
      const offsetX = modelPos[0] + Math.sin(clock.getElapsedTime() * 1.5) * 1.8;
      ringRef.current.position.set(offsetX, modelPos[1], modelPos[2]);
    }
  });

  return (
    <mesh ref={ringRef} rotation={[0, Math.PI / 2, 0]}>
      {/* Torus args: [radius, tube, radialSegments, tubularSegments] - Radius increased to 1.4 to fit the body! */}
      <torusGeometry args={[1.4, 0.02, 16, 100]} />
      <meshStandardMaterial
        color="#00ffa3"
        emissive="#00ffa3"
        emissiveIntensity={2}
        transparent
        opacity={0.8}
      />
    </mesh>
  );
};

// 4.5 The Calibration Row Helper (Supports Hover & Scroll)
const CalibRow = ({ label, value, setter, step = 0.05, labelWidth = "w-4" }) => {
  const handleWheel = (e) => {
    // Prevent zooming the page
    e.target.blur();
    // Calculate new scrub value
    const delta = e.deltaY < 0 ? step : -step;
    setter(prev => Number((prev + delta).toFixed(3)));
  };

  return (
    <div className="flex justify-between items-center mb-1">
      <span className={`text-slate-300 ${labelWidth}`}>{label}:</span>
      <button onClick={() => setter(prev => Number((prev - step).toFixed(3)))} className="bg-slate-700 w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center">-</button>
      <input 
        type="number" 
        step={step} 
        value={value} 
        onChange={(e) => setter(Number(e.target.value))} 
        onWheel={handleWheel}
        className="bg-slate-900 text-white w-20 text-center border-none focus:ring-1 focus:ring-emerald-500 rounded text-xs py-1 cursor-ns-resize" 
      />
      <button onClick={() => setter(prev => Number((prev + step).toFixed(3)))} className="bg-slate-700 w-6 h-6 rounded hover:bg-slate-600 flex items-center justify-center">+</button>
    </div>
  );
};

// 5. The Main Canvas Component
export default function HumanModel3D({ highlightOrgan, riskLevel }) {
  const [isCalibrating, setIsCalibrating] = useState(false);
  const [activeTab, setActiveTab] = useState('node'); // 'node', 'pos', 'rot'
  const [isRotating, setIsRotating] = useState(true);

  // Risk Node Calibration
  const [calibX, setCalibX] = useState(0);
  const [calibY, setCalibY] = useState(0);
  const [calibZ, setCalibZ] = useState(0);
  const [lockedNodePos, setLockedNodePos] = useState(null);

  // Model Position Calibration (Locked to user's screenshot values!)
  const [modelX, setModelX] = useState(-0.2);
  const [modelY, setModelY] = useState(0);
  const [modelZ, setModelZ] = useState(0);

  // Model Rotation Calibration (Head up, lying flat)
  const [rotX, setRotX] = useState(-3.14);
  const [rotY, setRotY] = useState(0);
  const [rotZ, setRotZ] = useState(3.14);

  // Model Scale Calibration
  const [scaleVal, setScaleVal] = useState(0.06);

  // Use highlightOrgan prop or default to 'Septic Shock' for testing the node mapping
  const activeRisk = highlightOrgan || 'Septic Shock';

  const currentModelPos = [modelX, modelY, modelZ];
  const currentModelRot = [rotX, rotY, rotZ];

  return (
    <div className="w-full h-full relative rounded-xl overflow-hidden bg-gradient-to-b from-transparent to-slate-900/50">

      {/* 3D Canvas */}
      <Canvas camera={{ position: [0, 2, 6], fov: 45 }} gl={{ antialias: true, alpha: true }}>
        {/* Subtle lighting to make the wireframe pop */}
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00ffa3" />

        <Float speed={1.5} rotationIntensity={0.05} floatIntensity={0.1}>
          {/* Render the downloaded human model */}
          <Suspense fallback={<LoadingFallback />}>
            <HologramBody
              modelPos={currentModelPos}
              modelRot={currentModelRot}
              modelScale={scaleVal}
            />
            {/* <RiskNode highlightOrgan={activeRisk} riskLevel={riskLevel} calibPos={isCalibrating && activeTab === 'node' ? [calibX, calibY, calibZ] : lockedNodePos} /> */}
          </Suspense>
        </Float>

        {/* Restricted OrbitControls for a clinical, top-down isometric view */}
        <OrbitControls
          enableZoom={true} /* Temporarily set to TRUE to debug! */
          enablePan={true}  /* Temporarily set to TRUE to debug! */
          autoRotate={isRotating}
          autoRotateSpeed={0.5}
          maxPolarAngle={Math.PI / 2.2} // Stops the camera from going completely flat/underneath
          minPolarAngle={0}             // Allows directly top-down view
        />
      </Canvas>

      {/* High-Tech Overlay Elements */}
      <div className="absolute top-4 left-4 text-[10px] font-mono text-slate-400 uppercase tracking-widest bg-black/40 px-2 py-1 rounded backdrop-blur-sm border border-white/5 z-20">
        Active Scan // Full Body Telemetry
      </div>

      {/* Calibration UI */}
      <div className="absolute bottom-4 right-4 z-30 flex gap-2">
        <button
          onClick={() => setIsRotating(!isRotating)}
          className="px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
        >
          {isRotating ? 'Stop Rotation' : 'Spin Model'}
        </button>
        {/* DEV TOOLS: Uncomment the button below before the pitch to recalibrate the 3D Model and Organ Nodes */}
        <button
          onClick={() => setIsCalibrating(!isCalibrating)}
          className="px-3 py-1 rounded-full bg-slate-900/60 backdrop-blur-md border border-white/10 text-slate-400 text-[10px] uppercase tracking-widest hover:text-white transition-colors"
        >
          {isCalibrating ? 'Cancel Calibration' : 'Calibrate 3D'}
        </button>
      </div>

      {isCalibrating && (
        <div
          onPointerDown={(e) => e.stopPropagation()}
          onPointerMove={(e) => e.stopPropagation()}
          onWheel={(e) => e.stopPropagation()}
          className="absolute top-1/2 right-4 -translate-y-1/2 z-30 bg-black/80 p-4 rounded-xl border border-emerald-500/30 backdrop-blur-md flex flex-col gap-3 font-mono text-xs w-64 shadow-2xl"
        >
          <div className="text-emerald-400 font-bold mb-1 border-b border-emerald-400/30 pb-2">3D Calibrator Hub</div>

          <div className="flex gap-1 mb-2">
            <button onClick={() => setActiveTab('node')} className={`flex-1 py-1 rounded ${activeTab === 'node' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Node</button>
            <button onClick={() => setActiveTab('pos')} className={`flex-1 py-1 rounded ${activeTab === 'pos' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Pos</button>
            <button onClick={() => setActiveTab('rot')} className={`flex-1 py-1 rounded ${activeTab === 'rot' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Rot</button>
            <button onClick={() => setActiveTab('scale')} className={`flex-1 py-1 rounded ${activeTab === 'scale' ? 'bg-emerald-500 text-black' : 'bg-slate-800 text-slate-400'}`}>Scale</button>
          </div>

          <div className="text-[10px] text-slate-400 mb-2 italic">You can hover & scroll or type in the boxes:</div>

          {activeTab === 'node' && (
            <>
              <CalibRow label="X" value={calibX} setter={setCalibX} step={0.05} />
              <CalibRow label="Y" value={calibY} setter={setCalibY} step={0.05} />
              <CalibRow label="Z" value={calibZ} setter={setCalibZ} step={0.05} />
            </>
          )}

          {activeTab === 'pos' && (
            <>
              <CalibRow label="X" value={modelX} setter={setModelX} step={0.1} />
              <CalibRow label="Y" value={modelY} setter={setModelY} step={0.1} />
              <CalibRow label="Z" value={modelZ} setter={setModelZ} step={0.1} />
            </>
          )}

          {activeTab === 'rot' && (
            <>
              <CalibRow label="X" value={rotX} setter={setRotX} step={0.05} />
              <CalibRow label="Y" value={rotY} setter={setRotY} step={0.05} />
              <CalibRow label="Z" value={rotZ} setter={setRotZ} step={0.05} />
            </>
          )}

          {activeTab === 'scale' && (
            <CalibRow label="Scale" value={scaleVal} setter={setScaleVal} step={0.005} labelWidth="w-10" />
          )}

          <button onClick={() => {
            console.log(`\n✅ CALIBRATION LOCKED! Paste this into HumanModel3D.jsx if you want it permanent:`);
            console.log(`👉 MODEL POSITION: const [modelX, setModelX] = useState(${modelX});`);
            console.log(`👉 MODEL ROTATION: const [rotX, setRotX] = useState(${rotX});`);
            console.log(`👉 MODEL SCALE: const [scaleVal, setScaleVal] = useState(${scaleVal});`);
            console.log(`👉 RISK NODE (activeRisk: "${activeRisk}"): use return [${calibX}, ${calibY}, ${calibZ}]; in getCoordinates() mapping.\n`);

            setLockedNodePos([calibX, calibY, calibZ]);
            setIsCalibrating(false);
          }} className="mt-2 w-full bg-emerald-500/20 text-emerald-300 py-2 rounded font-bold hover:bg-emerald-500/40 transition-colors border border-emerald-500/30">
            Log & Lock View
          </button>
        </div>
      )}

    </div>
  );
}

function LoadingFallback() {
  return (
    <mesh>
      <sphereGeometry args={[0.1, 16, 16]} />
      <meshBasicMaterial color="#00ffa3" wireframe={true} />
    </mesh>
  );
}
