import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Sphere, Line, Float } from '@react-three/drei';
import * as THREE from 'three';
import { InputForm } from '@/components/InputForm/InputForm';
import {
  Network,
  AlertCircle,
  GitMerge,
  Workflow,
  Terminal,
  Cpu,
  Share2
} from 'lucide-react';

// --- 3D PREVIEW COMPONENTS --- //

const ConnectionLine = ({ start, end, color }: { start: [number, number, number], end: [number, number, number], color: string }) => {
  return (
    <Line
      points={[start, end]}
      color={color}
      lineWidth={1}
      transparent
      opacity={0.3}
    />
  );
};

const DataNode = ({ position, color, scale = 1 }: { position: [number, number, number], color: string, scale?: number }) => {
  return (
    <Float speed={2} rotationIntensity={0.5} floatIntensity={0.5}>
      <Sphere args={[0.3 * scale, 32, 32]} position={position}>
        <meshStandardMaterial color={color} emissive={color} emissiveIntensity={0.5} roughness={0.2} />
      </Sphere>
      {/* Glow halo */}
      <mesh position={position} scale={[1.5 * scale, 1.5 * scale, 1.5 * scale]}>
        <sphereGeometry args={[0.3, 16, 16]} />
        <meshBasicMaterial color={color} transparent opacity={0.1} depthWrite={false} />
      </mesh>
    </Float>
  );
};

const RotatingGraph = () => {
  const groupRef = useRef<THREE.Group>(null);

  // Generate a random static graph structure
  const { nodes, connections } = useMemo(() => {
    const nodes = [
      { pos: [0, 0, 0], color: "#0f172a", scale: 2 }, // Core (Abyss)
      { pos: [2, 1, 1], color: "#0d9488", scale: 1 }, // Teal
      { pos: [-2, -1, 1], color: "#d97706", scale: 1 }, // Amber
      { pos: [1, -2, -1], color: "#be123c", scale: 1 }, // Rose
      { pos: [-1, 2, -1], color: "#6366f1", scale: 1 }, // Indigo
      { pos: [0, 3, 0], color: "#0d9488", scale: 0.8 },
      { pos: [3, 0, -2], color: "#334155", scale: 0.8 },
    ] as const;

    const connections = [
      [0, 1], [0, 2], [0, 3], [0, 4], // Star topology
      [1, 5], [2, 3], [4, 2], [6, 0]  // Cross connections
    ];

    return { nodes, connections };
  }, []);

  // Fixed: Replaced 'state' with '_' to avoid unused variable error
  useFrame((_, delta) => {
    if (groupRef.current) {
      groupRef.current.rotation.y += delta * 0.15;
    }
  });

  return (
    <group ref={groupRef}>
      {nodes.map((node, i) => (
        <DataNode key={i} position={node.pos as [number, number, number]} color={node.color} scale={node.scale} />
      ))}
      {connections.map(([startIdx, endIdx], i) => (
        <ConnectionLine
          key={i}
          start={nodes[startIdx].pos as [number, number, number]}
          end={nodes[endIdx].pos as [number, number, number]}
          color="#94a3b8"
        />
      ))}
    </group>
  );
};

const PreviewScene = () => {
  return (
    <div className="w-full h-full absolute inset-0 bg-slate-50">
      <div className="absolute inset-0 opacity-40" style={{ backgroundImage: 'radial-gradient(#cbd5e1 1px, transparent 1px)', backgroundSize: '20px 20px' }} />
      <Canvas camera={{ position: [0, 2, 8], fov: 45 }}>
        <ambientLight intensity={0.8} />
        <pointLight position={[10, 10, 10]} intensity={1} />
        <pointLight position={[-10, -10, -10]} intensity={0.5} color="#0d9488" />
        <RotatingGraph />
        <OrbitControls enableZoom={false} enablePan={false} autoRotate autoRotateSpeed={1} />
      </Canvas>

      <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest text-slate-500 shadow-sm flex items-center gap-2">
        <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
        Live R3F Simulation
      </div>
    </div>
  );
};

// --- MAIN PAGE COMPONENT --- //

export const HomePage = () => {
  return (
    <div className="flex-1 w-full h-full overflow-y-auto bg-white text-slate-900 font-sans selection:bg-teal-100 selection:text-teal-900">

      {/* --- GRID BACKGROUND --- */}
      <div className="fixed inset-0 z-0 pointer-events-none opacity-30"
           style={{
             backgroundImage: 'radial-gradient(#94a3b8 1.5px, transparent 1.5px)',
             backgroundSize: '40px 40px'
           }}
      />

      <div className="relative z-10 flex flex-col min-h-screen border-x border-slate-200 max-w-[1400px] mx-auto shadow-2xl shadow-slate-200/50 bg-white/90 backdrop-blur-sm">

        {/* --- HERO SECTION --- */}
        <header className="grid grid-cols-1 lg:grid-cols-12 border-b border-slate-200">

          {/* Left Block: Branding & Title */}
          <div className="lg:col-span-7 p-8 md:p-16 border-b lg:border-b-0 lg:border-r border-slate-200 flex flex-col justify-between min-h-[600px] relative overflow-hidden group">
            <span className="absolute top-6 right-6 font-mono text-9xl font-bold text-slate-100 select-none -z-10 transition-colors duration-500">01</span>

            <div>
              <div className="inline-flex items-center gap-2 px-3 py-1 border border-slate-900 rounded-full text-xs font-mono font-bold uppercase tracking-widest mb-8 bg-white">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                System Online
              </div>

              <h1 className="text-6xl md:text-8xl font-bold tracking-tighter leading-[0.9] mb-8 text-slate-900">
                CODE<br />
                VISUAL<br />
                <span className="text-transparent bg-clip-text bg-gradient-to-r from-teal-600 to-teal-800">AUTOPSY.</span>
              </h1>

              <p className="text-lg md:text-xl text-slate-600 max-w-md font-medium leading-relaxed">
                Stop guessing. Charon generates a 3D topology of your Python architecture, exposing circular dependencies and coupling at the source.
              </p>
            </div>

            {/* Bottom Metric Strip */}
            <div className="mt-12 flex items-center gap-8 font-mono text-xs text-slate-500 uppercase tracking-wider border-t border-slate-100 pt-8">
              <div>
                <span className="block text-slate-900 font-bold text-lg">AST</span>
                Parser
              </div>
              <div>
                <span className="block text-slate-900 font-bold text-lg">NX</span>
                Graph Logic
              </div>
              <div>
                <span className="block text-slate-900 font-bold text-lg">R3F</span>
                Render Engine
              </div>
            </div>
          </div>

          {/* Right Block: The Input Console */}
          <div className="lg:col-span-5 bg-slate-50 p-8 md:p-16 flex flex-col justify-center relative border-b lg:border-b-0">
            <div className="absolute inset-0 bg-[linear-gradient(transparent_50%,rgba(0,0,0,0.02)_50%)] bg-[size:100%_4px] pointer-events-none" />

            <div className="relative z-10">
              <div className="flex items-center justify-between mb-6 text-slate-500 font-mono text-xs uppercase tracking-wider">
                <div className="flex items-center gap-2">
                  <Terminal className="w-4 h-4" />
                  <span>Target Acquisition</span>
                </div>
                <span className="text-teal-600">Ready to scan</span>
              </div>

              <div className="bg-white p-3 rounded-xl border border-slate-200 shadow-sm">
                <InputForm />
              </div>

              <div className="mt-8 flex gap-6 text-xs font-mono text-slate-400">
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-green-500 rounded-full" />
                  Secure Connection
                </span>
                <span className="flex items-center gap-1.5">
                  <div className="w-1.5 h-1.5 bg-blue-500 rounded-full" />
                  Github API v3
                </span>
              </div>
            </div>
          </div>
        </header>

        {/* --- FEATURE GRID (Technical Lab) --- */}
        <section className="bg-white relative z-10 border-b border-slate-200">
          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4">

            <TechCell
              index="01"
              icon={<Network className="text-indigo-600" />}
              label="Topology"
              title="Force-Directed Graph"
              desc="Physics-based rendering reveals the gravitational pull of your core modules."
              borderColor="border-indigo-200"
            />

            <TechCell
              index="02"
              icon={<AlertCircle className="text-rose-600" />}
              label="Diagnostics"
              title="Cycle Detection"
              desc="Instantaneously identify recursive import chains that break runtime logic."
              borderColor="border-rose-200"
            />

            <TechCell
              index="03"
              icon={<GitMerge className="text-amber-600" />}
              label="Analysis"
              title="Coupling Metrics"
              desc="Calculate Instability (I) and Abstractness (A) per package automatically."
              borderColor="border-amber-200"
            />

            <TechCell
              index="04"
              icon={<Workflow className="text-teal-600" />}
              label="Structure"
              title="Auto-Clustering"
              desc="Community detection algorithms suggest natural microservice boundaries."
              borderColor="border-teal-200"
            />
          </div>
        </section>

        {/* --- DEEP DIVE SECTION --- */}
        <section className="grid grid-cols-1 lg:grid-cols-12 min-h-[500px]">

          {/* Visual Area: R3F Simulation */}
          <div className="lg:col-span-8 bg-slate-100 relative border-b lg:border-b-0 border-slate-200 min-h-[400px] lg:min-h-auto">
             <PreviewScene />
          </div>

          {/* Text Content Area */}
          <div className="lg:col-span-4 p-12 flex flex-col justify-center bg-white border-l border-slate-200">
            <div className="w-12 h-1.5 bg-teal-600 mb-8" />
            <h2 className="text-4xl font-bold mb-6 tracking-tight text-slate-900">
              Surgical<br />Refactoring.
            </h2>
            <p className="text-slate-600 mb-8 leading-relaxed font-medium">
              Charon isn't just a visualizer; it's a decision engine.
              By mapping the afferent and efferent coupling of every file,
              you can perform architectural surgery with confidence.
            </p>

            <ul className="space-y-5 font-mono text-sm text-slate-700">
              <li className="flex items-center gap-3 group cursor-pointer">
                <div className="p-2 bg-slate-100 rounded-md border border-slate-200 group-hover:border-teal-500 group-hover:text-teal-700 transition-all">
                   <Cpu className="w-4 h-4" />
                </div>
                <span className="font-bold">Identify "God Objects"</span>
              </li>
              <li className="flex items-center gap-3 group cursor-pointer">
                <div className="p-2 bg-slate-100 rounded-md border border-slate-200 group-hover:border-rose-500 group-hover:text-rose-700 transition-all">
                   <Share2 className="w-4 h-4" />
                </div>
                <span className="font-bold">Visualize Blast Radius</span>
              </li>
              <li className="flex items-center gap-3 group cursor-pointer">
                <div className="p-2 bg-slate-100 rounded-md border border-slate-200 group-hover:border-amber-500 group-hover:text-amber-700 transition-all">
                   <Terminal className="w-4 h-4" />
                </div>
                <span className="font-bold">Export Architecture as JSON</span>
              </li>
            </ul>
          </div>
        </section>
      </div>
    </div>
  );
};

/* --- SUB-COMPONENTS --- */

interface TechCellProps {
  index: string;
  icon: any;
  label: string;
  title: string;
  desc: string;
  borderColor: string;
}

const TechCell = ({ index, icon, label, title, desc, borderColor }: TechCellProps) => (
  <div className={`
    p-8 border-b border-slate-200 lg:border-b-0 lg:border-r last:border-r-0 
    group hover:bg-slate-50 transition-all duration-300 border-t-4 border-t-transparent hover:${borderColor}
  `}>
    <div className="flex items-start justify-between mb-6">
      {/* Darkened Index for readability */}
      <span className="font-mono text-3xl font-light text-slate-300 group-hover:text-slate-400 transition-colors">
        {index}
      </span>
      <div className="p-2 bg-white rounded-lg shadow-sm border border-slate-100 group-hover:scale-110 transition-transform duration-300">
        {React.cloneElement(icon, { size: 20 })}
      </div>
    </div>

    <span className="inline-block font-mono text-[10px] uppercase tracking-widest text-slate-500 mb-2 border border-slate-200 px-2 py-0.5 rounded bg-white">
      {label}
    </span>
    <h3 className="text-lg font-bold mb-3 text-slate-900 group-hover:text-teal-700 transition-colors">
      {title}
    </h3>
    <p className="text-sm text-slate-600 leading-relaxed font-medium">
      {desc}
    </p>
  </div>
);