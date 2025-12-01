import { memo, useEffect, useRef } from 'react';
import { useThree } from '@react-three/fiber';
import { OrbitControls, PerspectiveCamera, Environment } from '@react-three/drei';
import type { OrbitControls as OrbitControlsImpl } from 'three-stdlib';
import { Vector3 } from 'three';
import { useGraphContext, useGraphSelection } from '../context/GraphContext';

/**
 * Camera focus component - handles focusing on specific nodes
 */
const CameraFocus = memo(() => {
  const { modifiers, graph, nodePositionsRef } = useGraphContext();
  const { camera, controls } = useThree();
  const lastFocusedIdRef = useRef<string | null>(null);

  useEffect(() => {
    const focusNodeId = modifiers.focusNodeId;

    if (focusNodeId && focusNodeId !== lastFocusedIdRef.current && graph && controls) {
      const pos = nodePositionsRef.current.get(focusNodeId);

      if (pos) {
        const target = pos.clone();
        const offset = new Vector3(40, 40, 40);

        const orbitControls = controls as OrbitControlsImpl;
        if (orbitControls.target) {
          orbitControls.target.copy(target);
          camera.position.copy(target).add(offset);
          orbitControls.update();

          // Reset to center after delay
          setTimeout(() => {
            if (orbitControls.target) {
              orbitControls.target.set(0, 0, 0);
              orbitControls.update();
            }
          }, 1500);
        }

        lastFocusedIdRef.current = focusNodeId;
      }
    } else if (!focusNodeId) {
      lastFocusedIdRef.current = null;
    }
  }, [modifiers.focusNodeId, graph, camera, controls, nodePositionsRef]);

  return null;
});

CameraFocus.displayName = 'CameraFocus';

/**
 * Ground plane for click-to-deselect
 */
const GroundPlane = memo(() => {
  const { selectNode } = useGraphSelection();

  return (
    <mesh
      position={[0, -500, 0]}
      rotation={[-Math.PI / 2, 0, 0]}
      onClick={(e) => {
        e.stopPropagation();
        selectNode(null);
      }}
    >
      <planeGeometry args={[10000, 10000]} />
      <meshBasicMaterial visible={false} />
    </mesh>
  );
});

GroundPlane.displayName = 'GroundPlane';

interface SceneSetupProps {
  /** Whether orbit controls are disabled (e.g., during node drag) */
  controlsDisabled?: boolean;
}

/**
 * Scene setup component - camera, lights, environment, controls
 */
export const SceneSetup = memo(({ controlsDisabled = false }: SceneSetupProps) => {
  return (
    <>
      {/* Background */}
      <color attach="background" args={['#dfe9e8']} />

      {/* Camera */}
      <PerspectiveCamera
        makeDefault
        position={[80, 60, 80]}
        near={0.1}
        far={10000}
      />

      {/* Orbit Controls */}
      <OrbitControls
        makeDefault
        enabled={!controlsDisabled}
        enableDamping
        dampingFactor={0.05}
        maxPolarAngle={Math.PI / 1.8}
      />

      {/* Camera Focus Handler */}
      <CameraFocus />

      {/* Lighting - Matte/Ceramic look */}
      <ambientLight intensity={0.7} color="#ffffff" />
      <directionalLight
        position={[50, 80, 30]}
        intensity={1.2}
        castShadow
        shadow-mapSize={[1024, 1024]}
      />
      <pointLight position={[-20, 20, -20]} intensity={0.5} color="#0d9488" />

      {/* Environment for reflections */}
      <Environment preset="city" />

      {/* Ground plane for deselection */}
      <GroundPlane />
    </>
  );
});

SceneSetup.displayName = 'SceneSetup';
