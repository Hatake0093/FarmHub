import { useCallback, useEffect, useMemo, useRef, useState, type ReactNode } from "react";
import type { VoxelGrid } from "../lib/isometric";
import { buildMeshes, type MeshData } from "../lib/mesh3d";
import { buildAtlas } from "../lib/atlas";
import { baseBlock } from "../lib/blockShapes";
import { createRenderer, type Renderer } from "../lib/gl";
import { lookAt, multiply, perspective, scale, translate, type Mat4, type Vec3 } from "../lib/mat4";
import { requestTexture } from "../lib/textures";
import { hasTextureId, textureKey } from "../lib/blockColors";
import { TEXTURE_FACES } from "../lib/blockFaces";

interface Props {
  grid: VoxelGrid;
  /** Si es false, la vista usa solo colores: es más rápida porque no construye el atlas. */
  useTextures: boolean;
  /** Controles extra para la barra de la vista (por ejemplo, Anterior y Siguiente). Siguen visibles en pantalla completa. */
  toolbar?: ReactNode;
}

/** Distancia que encuadra la esfera del modelo (radio 1) con un margen, para un campo de visión de 45°. */
const FIT_DIST = 1.25 / Math.sin(Math.PI / 8);
const DEFAULT_VIEW = { yaw: 0.7, pitch: 0.5, dist: FIT_DIST };
/** Centro de la vista en unidades normalizadas. Mover el centro es desplazar la vista. */
type Target = [number, number, number];
const WIDTH = 880;
const HEIGHT = 520;
/** Límite de píxeles del lienzo por lado, para no saturar GPUs modestas en pantallas grandes. */
const MAX_PIXELS = 4096;

/** Vista 3D con WebGL: arrastrar gira, la rueda acerca y aleja, y las caras se ordenan con el buffer de profundidad. */
export function Voxel3DView({ grid, useTextures, toolbar }: Props) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const meshRef = useRef<MeshData | null>(null);
  const hasAtlasRef = useRef(false);
  const useTexRef = useRef(useTextures);
  const orbit = useRef<{ yaw: number; pitch: number; dist: number; target: Target }>({ ...DEFAULT_VIEW, target: [0, 0, 0] });
  const dragRef = useRef<{ x: number; y: number; pan: boolean } | null>(null);
  const fitKeyRef = useRef<string | null>(null);
  const [version, setVersion] = useState(0);
  const [unsupported, setUnsupported] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const [fullscreen, setFullscreen] = useState(false);

  useTexRef.current = useTextures;

  // Pide las texturas de los bloques de la rejilla; cuando llegan, se reconstruye el atlas.
  useEffect(() => {
    if (!useTextures) return;
    for (const id of new Set(grid.palette.map(baseBlock))) {
      for (const face of TEXTURE_FACES) {
        if (hasTextureId(id, face)) requestTexture(id, face, () => setVersion((v) => v + 1));
      }
    }
  }, [grid, useTextures]);

  const atlas = useMemo(() => {
    // version cambia cuando llega una textura nueva, y así se reconstruye el atlas.
    void version;
    if (!useTextures) return null;
    const keys: string[] = [];
    for (const id of new Set(grid.palette.map(baseBlock))) {
      for (const face of TEXTURE_FACES) {
        if (hasTextureId(id, face)) keys.push(textureKey(id, face));
      }
    }
    return buildAtlas(keys);
  }, [grid, useTextures, version]);

  const meshes = useMemo(() => buildMeshes(grid, atlas?.tiles ?? null), [grid, atlas]);
  const mesh = meshes.solid;

  const draw = useCallback(() => {
    const renderer = rendererRef.current;
    const canvas = canvasRef.current;
    const m = meshRef.current;
    if (!renderer || !canvas || !m) return;
    const o = orbit.current;
    const t = o.target;
    const eye: Vec3 = [
      t[0] + o.dist * Math.cos(o.pitch) * Math.sin(o.yaw),
      t[1] + o.dist * Math.sin(o.pitch),
      t[2] + o.dist * Math.cos(o.pitch) * Math.cos(o.yaw),
    ];
    const view = lookAt(eye, t, [0, 1, 0]);
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

  // Sube la malla y el atlas cuando cambian, y dibuja. Al cambiar las dimensiones, se encuadra la estructura.
  useEffect(() => {
    const renderer = rendererRef.current;
    meshRef.current = mesh;
    hasAtlasRef.current = atlas !== null;
    const fitKey = `${grid.width}x${grid.height}x${grid.depth}`;
    if (fitKeyRef.current !== fitKey) {
      fitKeyRef.current = fitKey;
      orbit.current = { ...DEFAULT_VIEW, target: [0, 0, 0] };
    }
    if (!renderer) return;
    renderer.setMesh(mesh);
    renderer.setGlassMesh(meshes.glass);
    renderer.setAtlas(atlas?.canvas ?? null);
    draw();
  }, [mesh, meshes, atlas, grid, draw]);

  // Arrastrar para girar y rueda para acercar. La rueda necesita un listener no pasivo para poder cancelarse.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    // Botón derecho, o Mayús + botón izquierdo: desplazar el centro. Botón izquierdo: girar.
    const onDown = (e: PointerEvent) => {
      dragRef.current = { x: e.clientX, y: e.clientY, pan: e.button === 2 || e.shiftKey };
      canvas.setPointerCapture(e.pointerId);
    };
    const onMove = (e: PointerEvent) => {
      const drag = dragRef.current;
      if (!drag) return;
      const o = orbit.current;
      const dx = e.clientX - drag.x;
      const dy = e.clientY - drag.y;
      if (drag.pan) {
        // Ejes de la pantalla en el plano horizontal (derecha) y vertical (arriba).
        const k = o.dist * 0.0015;
        const right: Target = [Math.cos(o.yaw), 0, -Math.sin(o.yaw)];
        for (let i = 0; i < 3; i++) {
          o.target[i] += -right[i] * dx * k;
        }
        o.target[1] += dy * k;
      } else {
        o.yaw -= dx * 0.01;
        o.pitch = Math.max(-1.5, Math.min(1.5, o.pitch + dy * 0.01));
      }
      dragRef.current = { x: e.clientX, y: e.clientY, pan: drag.pan };
      draw();
    };
    const onContext = (e: Event) => e.preventDefault();
    const onUp = () => {
      dragRef.current = null;
    };
    const onWheel = (e: WheelEvent) => {
      e.preventDefault();
      const o = orbit.current;
      o.dist = Math.max(0.08, Math.min(10, o.dist * Math.exp(e.deltaY * 0.001)));
      draw();
    };
    canvas.addEventListener("pointerdown", onDown);
    canvas.addEventListener("pointermove", onMove);
    canvas.addEventListener("pointerup", onUp);
    canvas.addEventListener("pointercancel", onUp);
    canvas.addEventListener("contextmenu", onContext);
    canvas.addEventListener("wheel", onWheel, { passive: false });
    return () => {
      canvas.removeEventListener("pointerdown", onDown);
      canvas.removeEventListener("pointermove", onMove);
      canvas.removeEventListener("pointerup", onUp);
      canvas.removeEventListener("pointercancel", onUp);
      canvas.removeEventListener("contextmenu", onContext);
      canvas.removeEventListener("wheel", onWheel);
    };
  }, [draw]);

  function reset() {
    orbit.current = { ...DEFAULT_VIEW, target: [0, 0, 0] };
    draw();
  }

  // Pantalla completa: el lienzo ocupa la pantalla y se redibuja con su nuevo tamaño.
  useEffect(() => {
    const onChange = () => setFullscreen(document.fullscreenElement === wrapperRef.current);
    document.addEventListener("fullscreenchange", onChange);
    return () => document.removeEventListener("fullscreenchange", onChange);
  }, []);

  // El lienzo se dibuja al tamaño con el que se ve, multiplicado por la densidad de la pantalla: así no se ve borroso.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const size = () => {
      const rect = canvas.getBoundingClientRect();
      if (rect.width < 1 || rect.height < 1) return;
      const dpr = Math.min(window.devicePixelRatio || 1, 2);
      const width = Math.min(MAX_PIXELS, Math.round(rect.width * dpr));
      const height = Math.min(MAX_PIXELS, Math.round(rect.height * dpr));
      if (canvas.width !== width || canvas.height !== height) {
        canvas.width = width;
        canvas.height = height;
      }
      draw();
    };
    size();
    if (typeof ResizeObserver === "undefined") {
      window.addEventListener("resize", size);
      return () => window.removeEventListener("resize", size);
    }
    const observer = new ResizeObserver(size);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fullscreen, draw]);

  function toggleFullscreen() {
    const wrapper = wrapperRef.current;
    if (!wrapper) return;
    if (document.fullscreenElement === wrapper) {
      void document.exitFullscreen();
    } else {
      void wrapper.requestFullscreen().catch(() => setError("El navegador no permitió la pantalla completa."));
    }
  }

  const [error, setError] = useState<string | null>(null);

  if (unsupported) {
    return <p className="alert" role="alert">Este navegador no admite WebGL 2, así que la vista 3D no está disponible.</p>;
  }

  return (
    <div className={`voxel3d${fullscreen ? " voxel3d-fullscreen" : ""}`} ref={wrapperRef}>
      <div className="rotate-bar">
        <button type="button" className="button" onClick={reset}>Reiniciar vista</button>
        <button type="button" className="button" onClick={toggleFullscreen}>{fullscreen ? "Salir de pantalla completa (Esc)" : "Pantalla completa"}</button>
        {toolbar}
        {error && <span className="field-error" role="alert">{error}</span>}
        <span className="muted small voxel3d-help">Arrastra para girar · botón derecho (o Mayús + arrastrar) para desplazar · rueda para acercar y alejar · {useTextures ? "con texturas" : "solo colores"}</span>
      </div>
      <canvas ref={canvasRef} className="voxel3d-canvas" width={WIDTH} height={HEIGHT} aria-label="Vista 3D" />
    </div>
  );
}
