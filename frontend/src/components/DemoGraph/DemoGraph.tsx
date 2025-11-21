import { useRef, useMemo } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { OrbitControls, Environment, Float } from '@react-three/drei';
import * as THREE from 'three';
import { DemoNode } from './DemoNode';
import { DemoEdge } from './DemoEdge';

const RotatingGroup = () => {
    const groupRef = useRef<THREE.Group>(null);

    // Generate a realistic "App" structure
    const { nodes, connections } = useMemo(() => {
        // Colors
        const cCore = "#0f172a"; // Navy
        const cFeat = "#0d9488"; // Teal
        const cUtil = "#64748b"; // Slate
        const cExt = "#f59e0b";  // Amber

        const nodes = [
            // Core Layer
            { pos: [0, 0, 0], color: cCore, scale: 1.8 },      // 0: Main App
            { pos: [0, 2, 0], color: cCore, scale: 1.4 },      // 1: Config

            // Feature A (User)
            { pos: [2.5, 0.5, 1], color: cFeat, scale: 1.2 },  // 2: User Service
            { pos: [3.5, 1.5, 1.5], color: cFeat, scale: 1.0 },// 3: User Model
            { pos: [3.0, -0.5, 2], color: cFeat, scale: 1.0 }, // 4: Auth Utils

            // Feature B (Data)
            { pos: [-2.5, 0.5, 1], color: cFeat, scale: 1.2 }, // 5: Data Service
            { pos: [-3.5, 1.5, 1.5], color: cFeat, scale: 1.0 },// 6: Data Model

            // Utils Layer
            { pos: [0, -2.5, -1], color: cUtil, scale: 1.0 },  // 7: Logger
            { pos: [1.5, -3, -0.5], color: cUtil, scale: 1.0 },// 8: Helpers
            { pos: [-1.5, -3, -0.5], color: cUtil, scale: 1.0 },// 9: Constants

            // External/Adapters
            { pos: [0, 3.5, -2], color: cExt, scale: 1.1 },    // 10: API Client
        ] as const;

        const connections = [
            // Core dependencies
            [0, 1], [0, 2], [0, 5], [0, 7],

            // Feature A internals
            [2, 3], [2, 4], [4, 1],

            // Feature B internals
            [5, 6], [5, 7],

            // Cross-cutting
            [2, 7], [5, 9], [1, 9],

            // External
            [10, 1], [2, 10], [5, 10]
        ];

        return { nodes, connections };
    }, []);

    useFrame((_, delta) => {
        if (groupRef.current) {
            groupRef.current.rotation.y += delta * 0.05; // Very slow rotation
        }
    });

    return (
        <group ref={groupRef}>
            <Float speed={2} rotationIntensity={0.1} floatIntensity={0.2}>
                {nodes.map((node, i) => (
                    <DemoNode key={i} position={node.pos as [number, number, number]} color={node.color} scale={node.scale} />
                ))}
                {connections.map(([startIdx, endIdx], i) => (
                    <DemoEdge
                        key={i}
                        start={nodes[startIdx].pos as [number, number, number]}
                        end={nodes[endIdx].pos as [number, number, number]}
                    />
                ))}
            </Float>
        </group>
    );
};

export const DemoGraph = () => {
    return (
        <div className="w-full h-full absolute inset-0">
            {/* Grid Background matching main app */}
            <div className="absolute inset-0 opacity-30" style={{ backgroundImage: 'radial-gradient(#0d9488 1px, transparent 1px)', backgroundSize: '20px 20px' }} />

            <Canvas camera={{ position: [0, 4, 12], fov: 45 }} shadows dpr={[1, 2]}>
                {/* Laboratory Lighting Setup */}
                <ambientLight intensity={0.8} color="#ffffff" />
                <directionalLight position={[10, 10, 5]} intensity={1.5} castShadow />
                <pointLight position={[-10, -10, -5]} intensity={0.8} color="#0d9488" />

                {/* Soft City Reflection for Matte finish */}
                <Environment preset="city" />

                <RotatingGroup />

                <OrbitControls
                    enableZoom={false}
                    enablePan={false}
                    autoRotate
                    autoRotateSpeed={0.5}
                    maxPolarAngle={Math.PI / 1.8}
                />
            </Canvas>

            {/* Overlay Badge */}
            <div className="absolute bottom-4 right-4 bg-white/90 backdrop-blur border border-slate-200 px-3 py-1.5 rounded text-[10px] font-mono uppercase tracking-widest text-slate-500 shadow-sm flex items-center gap-2">
                <div className="w-2 h-2 bg-teal-500 rounded-full animate-pulse" />
                Live Simulation
            </div>
        </div>
    );
};
