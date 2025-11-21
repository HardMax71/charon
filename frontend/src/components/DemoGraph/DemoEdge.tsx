import { useMemo } from 'react';
import { QuadraticBezierLine } from '@react-three/drei';
import { Vector3, Euler, Quaternion } from 'three';

interface DemoEdgeProps {
    start: [number, number, number];
    end: [number, number, number];
}

export const DemoEdge = ({ start, end }: DemoEdgeProps) => {
    // 1. Calculate data
    const edgeData = useMemo(() => {
        const startVec = new Vector3(...start);
        const endVec = new Vector3(...end);

        // Gentle Arc
        const midPoint = new Vector3()
            .addVectors(startVec, endVec)
            .multiplyScalar(0.5)
            .add(new Vector3(0, startVec.distanceTo(endVec) * 0.15, 0));

        // Arrow logic
        const direction = new Vector3().subVectors(endVec, midPoint).normalize();
        const arrowPosition = new Vector3().copy(endVec).sub(direction.multiplyScalar(0.6)); // Adjusted for smaller scale
        const arrowRotation = new Euler().setFromQuaternion(new Quaternion().setFromUnitVectors(new Vector3(0, 1, 0), direction));

        return {
            start: startVec,
            end: endVec,
            midPoint,
            arrowPosition,
            arrowRotation,
            edgeColor: '#64748b',
            edgeOpacity: 0.4,
            lineWidth: 1.5
        };
    }, [start, end]);

    const { start: s, end: e, midPoint, arrowPosition, arrowRotation, edgeColor, edgeOpacity, lineWidth } = edgeData;

    return (
        <group>
            {/* Visual Line */}
            <QuadraticBezierLine
                start={s}
                end={e}
                mid={midPoint}
                color={edgeColor}
                lineWidth={lineWidth}
                transparent
                opacity={edgeOpacity}
            />

            {/* Arrow Head */}
            <mesh position={arrowPosition} rotation={arrowRotation}>
                <coneGeometry args={[0.1, 0.3, 8]} />
                <meshBasicMaterial color={edgeColor} transparent opacity={edgeOpacity} />
            </mesh>
        </group>
    );
};
