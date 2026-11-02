/** ThreeSurface — three.js workbench (plan: specialized-surfaces.md #3).
 *
 * Renders agent-pushed primitive scenes with orbit controls. The scene
 * spec is validated/normalized by parseSceneSpec (shared contract with
 * the MCP `open3dSurface` tool). WebGL is unavailable in tests/jsdom →
 * renders an honest fallback instead of crashing.
 */

import { useEffect, useRef, useState } from "react";

import type * as THREE_NS from "three";
import { parseSceneSpec, type SceneSpec } from "../../../lib/three-scene";
import type { SurfaceConfig } from "../../../types";

export interface ThreeSurfaceProps {
  config: SurfaceConfig;
}

import "./index.css";

export function ThreeSurface({ config }: ThreeSurfaceProps) {
  const mountRef = useRef<HTMLDivElement>(null);
  const [fallback, setFallback] = useState<string | null>(null);

  const payload = (config.payload ?? {}) as Record<string, unknown>;

  let spec: SceneSpec | null = null;
  let specError: string | null = null;
  try {
    spec = parseSceneSpec(payload);
  } catch (e) {
    specError = (e as Error).message;
  }

  useEffect(() => {
    if (!spec) return;
    const mount = mountRef.current;
    if (!mount) return;

    let cancelled = false;
    let renderer: import("three").WebGLRenderer | null = null;
    let ro: ResizeObserver | undefined;

    (async () => {
      try {
        const THREE = await import("three");
        const { OrbitControls } = await import("three/addons/controls/OrbitControls.js");

        const scene = new THREE.Scene();
        scene.background = new THREE.Color(spec!.background);

        const camera = new THREE.PerspectiveCamera(
          50,
          Math.max(1, mount.clientWidth) / Math.max(1, mount.clientHeight),
          0.1,
          500,
        );
        const camPos = spec!.camera ?? { x: 6, y: 5, z: 8 };
        camera.position.set(camPos.x, camPos.y, camPos.z);
        camera.lookAt(0, 0, 0);

        renderer = new THREE.WebGLRenderer({ antialias: true });
        renderer.setSize(mount.clientWidth || 640, mount.clientHeight || 420);
        renderer.setPixelRatio(Math.min(2, window.devicePixelRatio || 1));
        mount.innerHTML = "";
        mount.appendChild(renderer.domElement);

        // Follow container resizes (sidebar drag, window resize, dock toggle) —
        // otherwise the canvas keeps its initial size like a stuck browser pane.
        ro = new ResizeObserver(() => {
          if (!renderer || cancelled) return;
          const w = mount.clientWidth || 640;
          const h = mount.clientHeight || 420;
          renderer.setSize(w, h);
          camera.aspect = Math.max(1, w) / Math.max(1, h);
          camera.updateProjectionMatrix();
        });
        ro.observe(mount);

        scene.add(new THREE.AmbientLight(0xffffff, 0.55));
        const key = new THREE.DirectionalLight(0xffffff, 1.1);
        key.position.set(5, 10, 6);
        scene.add(key);

        const controls = new OrbitControls(camera, renderer.domElement);
        controls.enableDamping = true;

        for (const p of spec!.primitives) {
          let geo: THREE_NS.BufferGeometry;
          switch (p.type) {
            case "sphere":
              geo = new THREE.SphereGeometry(p.size / 2, 32, 24);
              break;
            case "cylinder":
              geo = new THREE.CylinderGeometry(p.size / 2, p.size / 2, p.size, 32);
              break;
            case "torus":
              geo = new THREE.TorusGeometry(p.size / 2, p.size / 6, 24, 64);
              break;
            case "plane":
              geo = new THREE.PlaneGeometry(p.size, p.size);
              break;
            default:
              geo = new THREE.BoxGeometry(p.size, p.size, p.size);
          }
          const mat = new THREE.MeshStandardMaterial({
            color: new THREE.Color(p.color),
            metalness: 0.15,
            roughness: 0.5,
            side: p.type === "plane" ? THREE.DoubleSide : THREE.FrontSide,
          });
          const mesh = new THREE.Mesh(geo, mat);
          mesh.position.set(...p.position);
          if (p.rotation) mesh.rotation.set(...p.rotation);
          scene.add(mesh);
        }

        const grid = new THREE.GridHelper(20, 20, 0x444a55, 0x2a2f3a);
        scene.add(grid);

        let raf = 0;
        const loop = () => {
          if (cancelled) return;
          controls.update();
          renderer?.render(scene, camera);
          raf = requestAnimationFrame(loop);
        };
        loop();
        setFallback(null);
      } catch (e) {
        // jsdom / no WebGL / import failure — honest fallback, no crash.
        setFallback(
          `3D preview unavailable here (${(e as Error).message.slice(0, 80)}). ` +
            `${spec!.primitives.length} primitive(s) in scene.`,
        );
      }
    })();

    return () => {
      cancelled = true;
      ro?.disconnect();
      renderer?.dispose();
    };
    // Rebuild scene whenever the agent pushes new payload.
  }, [JSON.stringify(payload)]);

  if (specError) {
    return (
      <div className="ha-3d-surface" data-testid="three-surface">
        <div className="ha-3d-error" role="alert">
          Invalid scene: {specError}
        </div>
      </div>
    );
  }

  return (
    <div className="ha-3d-surface" data-testid="three-surface">
      <div ref={mountRef} className="ha-3d-canvas" />
      {fallback && <div className="ha-3d-fallback">{fallback}</div>}
      <div className="ha-3d-hint">drag: orbit · scroll: zoom · right-drag: pan</div>
    </div>
  );
}

export default ThreeSurface;
