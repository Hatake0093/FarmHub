import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { VoxelGrid } from "../lib/isometric";
import { buildMesh, type MeshData } from "../lib/mesh3d";
import { buildAtlas } from "../lib/atlas";
import { createRenderer, type Renderer } from "../lib/gl";
import { lookAt, multiply, perspective, scale, translate, type Mat4, type Vec3 } from "../lib/mat4";
import { getTexture, requestTexture } from "../lib/textures";
import { hasTextureId } from "../lib/blockColors";

interface Props {
  grid: VoxelGrid;
  /** Si es false, la vista usa solo colores: es más rápida porque no construye el atlas. */
  useTextures: boolean;
}

const DEFAULT_VIEW = { yaw: 0.7, pitch: 0.5, dist: 2.6 };
const WIDTH = 880;
const HEIGHT = 520;

/** Vista 3D con WebGL: arrastrar gira, la rueda acerca y aleja, y las caras se ordenan con el buffer de profundidad. */
export function Voxel3DView({ grid, useTextures }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const meshRef = useRef<MeshData | null>(null);
  const hasAtlasRef = useRef(false);
  const useTexRef = useRef(useTextures);
  const orbit = useRef({ ...DEFAULT_VIEW });
  const dragRef = useRef<{ x: number; y: number } | null>(null);
  const [version, setVersion] = useState(0);
  const [unsupported, setUnsupported] = useState(false);

  useTexRef.current = useTextures;

  // Pide las texturas de los bloques de la rejilla; cuando llegan, se reconstruye el atlas.
  useEffect(() => {
    if (!useTextures) return;
    for (const id of new Set(grid.palette)) {
      if (hasTextureId(id)) requestTexture(id, () => setVersion((v) => v + 1));
    }
  }, [grid, useTextures]);

  const atlas = useMemo(() => {
    // version cambia cuando llega una textura nueva, y así se reconstruye el atlas.
    void version;
    if (!useTextures) return null;
    return buildAtlas([...new Set(grid.palette)].filter((id) => hasTextureId(id) && getTexture(id) !== undefined));
  }, [grid, useTextures, version]);

  const mesh = useMemo(() => buildMesh(grid, atlas?.tiles ?? null), [grid, atlas]);

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const m = meshRef.current;
    if (!renderer || !canvas || !m) return;
    const o = orbit.current;
    const eye: Vec3 = [
      o.dist * Math.cos(o.pitch) * Math.sin(o.yaw),
      o.dist * Math.sin(o.pitch),
      o.dist * Math.cos(o.pitch) * Math.cos(o.yaw),
    ];
    const view = lookAt(eye, [0, 0, 0], [0, 1, 0]);
    const model: Mat4 = multiply(scale(1 / m.radius), translate(-m.center[0], -m.center[1], -m.center[2]));
    const proj = perspective(Math.PI / 4, canvas.width / canvas.height, 0.01, 100);
    renderer.draw(multiply(proj, multiply(view, model)), [0.4, 1, 0.6], useTexRef.current && hasAtlasRef.current);
  }, []);

  // Crea el renderizador una vez.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const renderer = createRenderer(canvas);
    if (!renderer) {
      setUnsupported(true);
      return;
    }
    rendererRef.current = renderer;
    return () => {
      renderer.dispose();
      rendererRef.current = null;
    };
  }, []);

  // Sube la malla y el atlas cuando cambian, y dibuja.
  useEffect(() => {
    const renderer = rendererRef.current;
    meshRef.current = mesh;
    hasAtlasRef.current = atlas !== null;
    if (!renderer) return;
    renderer.setMesh(mesh);
    renderer.setAtlas(atlas?.canvas ?? null);
    draw();
  }, [mesh, atlas, draw]);

  // Arrastrar para girar y rueda para acercar. La rueda necesita un listener no pasivo para poder cancelarse.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const onDown = (e: PointerEvent) => {
      dragRef.current = { x: e.clientX, y: e.clientY };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const o = orbit.current;
      o.yaw -= (e.clientX - drag.x) * 0.01;
      o.pitch = Math.max(-1.5, Math.min(1.5, o.pitch + (e.clientY - drag.y) * 0.01));
      dragRef.current = { x: e.clientX, y: e.clientY };
      draw();
    };
    const onUp = () => {
      dragRef.current = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const o = orbit.current;
      o.dist = Math.max(0.6, Math.min(10, o.dist * Math.exp(e.deltaY * 0.001)));
      draw();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [draw]);

  function reset() {
    orbit.current = { ...DEFAULT_VIEW };
    draw();
  }

  if (unsupported) {
    return <p className="error">Este navegador no admite WebGL 2, así que la vista 3D no está disponible.</p>;
  }

  return (
    <div className="voxel3d">
      <div className="rotate-bar">
        <button type="button" className="button" onClick={reset}>Reiniciar vista</button>
        <span className="muted small">Arrastra para girar · rueda para acercar y alejar · {useTextures ? "con texturas" : "solo colores"}</span>
      </div>
      <canvas ref={canvasRef} className="voxel3d-canvas" width={WIDTH} height={HEIGHT} aria-label="Vista 3D" />
    </div>
  );
}
