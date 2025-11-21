import { useMemo, useRef } from 'react';
import { Outlines } from '@react-three/drei';
import { Mesh } from 'three';

interface DemoNodeProps {
    position: [number, number, number];
    color: string;
    scale?: number;
}

export const DemoNode = ({ position, color, scale = 1 }: DemoNodeProps) => {
    const meshRef = useRef<Mesh>(null);

    // Visual Logic (Simplified from Node.tsx)
    const { displayColor, opacity, roughness, metalness } = useMemo(() => {
        return {
            displayColor: color,
            opacity: 1.0,
            roughness: 0.2,
            metalness: 0.1
        };
    }, [color]);

    return (
        <mesh
            ref={meshRef}
            position={position}
            scale={scale}
        >
            {/* Geometry matching the real Node.tsx */}
            <sphereGeometry args={[0.4, 32, 32]} />

            <meshStandardMaterial
                color={displayColor}
                roughness={roughness}
                metalness={metalness}
                emissive={displayColor}
                emissiveIntensity={0.2}
            />

            {/* Signature Black Outline */}
            <Outlines
                thickness={0.05}
                color="#000000"
                transparent
                opacity={0.3}
            />

            {/* Subtle Glow Halo */}
            <mesh scale={1.2}>
                <sphereGeometry args={[0.4, 32, 32]} />
                <meshBasicMaterial color={displayColor} transparent opacity={0.1} depthWrite={false} />
            </mesh>
        </mesh>
    );
};
