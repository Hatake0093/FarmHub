#!/usr/bin/env python3
"""Carga masiva de texturas de bloques en FarmHub desde una carpeta.

Empareja cada imagen con un bloque del catálogo usando las mismas reglas que la
pantalla "Bloques" del frontend:

    stone.png            -> minecraft:stone, lados
    grass_block_top.png  -> minecraft:grass_block, arriba
    oak_log_top.png      -> minecraft:oak_log, arriba
    furnace_side.png     -> minecraft:furnace, lados

y además:

* Recorta el primer fotograma de las texturas animadas (tiras verticales como
  magma.png o sea_lantern.png). Sin recortar, el servidor las aceptaría pero se
  verían estiradas, o las rechazaría si miden más de 256 px (water_still, kelp).
* Rellena bloques derivados con la textura de su material: escaleras, losas,
  muros, vallas, botones, placas de presión y carteles (oak_stairs -> oak_planks,
  stone_brick_wall -> stone_bricks…), más algunos casos sueltos (snow_block -> snow).

Cada archivo se sube con su propio try/except: si uno falla se anota y se sigue
con el siguiente. Al final se muestra un resumen y se guarda un informe CSV.

Uso (con el backend levantado):

    pip install requests pillow
    python scripts/importar_texturas.py block --dry-run     # solo muestra qué haría
    python scripts/importar_texturas.py block               # sube lo que falta
    python scripts/importar_texturas.py block --sobrescribir

Pillow es opcional: sin él no se recortan las animadas (se omiten y se avisa).
"""

from __future__ import annotations

import argparse
import csv
import io
import struct
import sys
import time
from dataclasses import dataclass
from pathlib import Path

try:
    import requests
except ImportError:  # pragma: no cover - mensaje para el usuario
    sys.exit("Falta la librería requests. Instálala con: pip install requests")

try:
    from PIL import Image
except ImportError:
    Image = None  # type: ignore[assignment]

# Límites del backend (BlocksController): 256 KB y 256 × 256 px.
MAX_BYTES = 256 * 1024
MAX_SIDE = 256
FACES = ("side", "top", "bottom")
FACE_SUFFIXES = (("_top", "top"), ("_bottom", "bottom"), ("_side", "side"))
EXTENSIONS = {".png", ".jpg", ".jpeg", ".webp"}

# Bloques del catálogo cuya textura tiene otro nombre en la carpeta de Minecraft.
# Para cada cara, la lista de archivos candidatos (sin extensión), en orden de preferencia.
EXPLICIT_ALIASES: dict[str, dict[str, list[str]]] = {
    "snow_block": {"side": ["snow"]},
    "magma_block": {"side": ["magma"]},
    "moss_carpet": {"side": ["moss_block"]},
    "smooth_quartz": {"side": ["quartz_block_bottom"]},
    "smooth_sandstone": {"side": ["sandstone_top"]},
    "smooth_red_sandstone": {"side": ["red_sandstone_top"]},
    "oak_wood": {"side": ["oak_log"]},
    "water": {"side": ["water_still"]},
    "lava": {"side": ["lava_still"]},
    "bamboo": {"side": ["bamboo_stalk"]},
    "chain": {"side": ["iron_chain", "chain"]},
    "redstone_wire": {"side": ["redstone_dust_dot"]},
    "piston_head": {"side": ["piston_top"]},
    "sticky_piston": {"side": ["piston_side"], "top": ["piston_top_sticky"], "bottom": ["piston_bottom"]},
    "dispenser": {"side": ["dispenser_front"], "top": ["furnace_top"], "bottom": ["furnace_top"]},
    "dropper": {"side": ["dropper_front"], "top": ["furnace_top"], "bottom": ["furnace_top"]},
    "sign": {"side": ["oak_planks"]},
    "wall_sign": {"side": ["oak_planks"]},
}

# Sufijos de bloques que en el juego usan la textura del material base.
DERIVED_SUFFIXES = (
    "_stairs", "_slab", "_wall", "_fence_gate", "_fence",
    "_button", "_pressure_plate", "_wall_sign", "_sign",
)


@dataclass
class Upload:
    block_id: str      # "minecraft:stone"
    face: str          # side | top | bottom
    path: Path
    origin: str        # "nombre" (regla del frontend) o "alias"


class SkipFile(Exception):
    """El archivo no se puede subir tal cual (formato, tamaño…)."""


def short_name(block_id: str) -> str:
    return block_id.removeprefix("minecraft:")


# ---------------------------------------------------------------- emparejado

def match_by_name(files: dict[str, Path], block_ids: set[str]) -> tuple[list[Upload], list[Path]]:
    """Las mismas reglas que frontend/src/lib/textureImport.ts."""
    matched: list[Upload] = []
    unmatched: list[Path] = []
    for name, path in sorted(files.items()):
        exact = f"minecraft:{name}"
        if exact in block_ids:
            matched.append(Upload(exact, "side", path, "nombre"))
            continue
        for suffix, face in FACE_SUFFIXES:
            if name.endswith(suffix):
                block_id = f"minecraft:{name[: -len(suffix)]}"
                if block_id in block_ids:
                    matched.append(Upload(block_id, face, path, "nombre"))
                    break
        else:
            unmatched.append(path)
    return matched, unmatched


def base_candidates(base: str) -> list[str]:
    """oak -> oak_planks; stone_brick -> stone_bricks; brick -> bricks; purpur -> purpur_block."""
    return [f"{base}_planks", base, f"{base}s", f"{base}_block"]


def alias_uploads(block_ids: set[str], files: dict[str, Path], covered: set[tuple[str, str]]) -> list[Upload]:
    """Texturas para bloques que no tienen archivo con su nombre."""
    uploads: list[Upload] = []
    for block_id in sorted(block_ids):
        name = short_name(block_id)
        if any((block_id, f) in covered for f in FACES):
            continue  # ya tiene alguna cara por nombre: no se mezcla con alias

        faces: dict[str, list[str]] = dict(EXPLICIT_ALIASES.get(name, {}))
        if not faces:
            for suffix in DERIVED_SUFFIXES:
                if name.endswith(suffix):
                    base = name[: -len(suffix)]
                    for candidate in base_candidates(base):
                        if candidate in files or f"{candidate}_side" in files:
                            side = candidate if candidate in files else f"{candidate}_side"
                            faces = {"side": [side], "top": [f"{candidate}_top"], "bottom": [f"{candidate}_bottom"]}
                            break
                    break

        for face, options in faces.items():
            found = next((files[o] for o in options if o in files), None)
            if found is not None:
                uploads.append(Upload(block_id, face, found, "alias"))
    return uploads


# ---------------------------------------------------------------- imágenes

def png_size(data: bytes) -> tuple[int, int] | None:
    if len(data) >= 24 and data[:8] == b"\x89PNG\r\n\x1a\n":
        return struct.unpack(">II", data[16:24])
    return None


def mime_of(data: bytes) -> str:
    if data[:8] == b"\x89PNG\r\n\x1a\n":
        return "image/png"
    if data[:3] == b"\xff\xd8\xff":
        return "image/jpeg"
    if data[:4] == b"RIFF" and data[8:12] == b"WEBP":
        return "image/webp"
    raise SkipFile("formato no admitido (usa PNG, JPEG o WebP)")


def prepare_image(path: Path) -> tuple[bytes, str, str]:
    """Devuelve (bytes, mime, nota). Recorta el primer fotograma si es una tira animada."""
    data = path.read_bytes()
    mime = mime_of(data)
    note = ""
    size = png_size(data)
    if size is not None:
        width, height = size
        if height > width and height % width == 0:
            if Image is None:
                raise SkipFile(f"animada ({width}×{height}); instala Pillow para recortar el primer fotograma")
            with Image.open(io.BytesIO(data)) as img:
                frame = img.crop((0, 0, width, width))
                out = io.BytesIO()
                frame.save(out, format="PNG")
            data = out.getvalue()
            note = f"recortada de {width}×{height} a {width}×{width}"
            width = height = width
        if width > MAX_SIDE or height > MAX_SIDE:
            raise SkipFile(f"mide {width}×{height}; el máximo es {MAX_SIDE}×{MAX_SIDE}")
    if len(data) > MAX_BYTES:
        raise SkipFile(f"pesa {len(data) // 1024} KB; el máximo es {MAX_BYTES // 1024} KB")
    return data, mime, note


# ---------------------------------------------------------------- API

def problem_text(response: requests.Response) -> str:
    """Saca el mensaje de un ProblemDetails / ValidationProblem de ASP.NET."""
    try:
        body = response.json()
    except ValueError:
        return response.text[:200] or response.reason
    if isinstance(body, dict):
        errors = body.get("errors")
        if isinstance(errors, dict):
            messages = [m for values in errors.values() for m in (values if isinstance(values, list) else [values])]
            if messages:
                return "; ".join(map(str, messages))
        return str(body.get("detail") or body.get("title") or body)
    return str(body)


def fetch_blocks(session: requests.Session, api: str) -> dict[str, set[str]]:
    response = session.get(f"{api}/blocks", timeout=30)
    response.raise_for_status()
    return {b["id"]: set(b.get("textureFaces") or []) for b in response.json()}


def upload(session: requests.Session, api: str, item: Upload, data: bytes, mime: str, retries: int) -> None:
    url = f"{api}/blocks/{short_name(item.block_id)}/texture/{item.face}"
    for attempt in range(retries + 1):
        try:
            response = session.put(url, files={"file": (item.path.name, data, mime)}, timeout=30)
        except (requests.ConnectionError, requests.Timeout):
            if attempt == retries:
                raise
            time.sleep(2 ** attempt)
            continue
        if response.status_code >= 500 and attempt < retries:
            time.sleep(2 ** attempt)
            continue
        if not response.ok:
            raise RuntimeError(f"HTTP {response.status_code}: {problem_text(response)}")
        return


# ---------------------------------------------------------------- main

def main() -> int:
    parser = argparse.ArgumentParser(description="Sube a FarmHub las texturas de una carpeta, emparejadas por nombre.")
    parser.add_argument("carpeta", type=Path, help="Carpeta con las imágenes, p. ej. block")
    parser.add_argument("--api", default="http://localhost:5167/api", help="URL base de la API (por defecto %(default)s)")
    parser.add_argument("--dry-run", action="store_true", help="No sube nada: solo muestra qué haría")
    parser.add_argument("--sobrescribir", action="store_true", help="Reemplaza también las caras que ya tienen textura")
    parser.add_argument("--sin-alias", action="store_true", help="Solo nombre exacto, como el frontend")
    parser.add_argument("--reintentos", type=int, default=2, help="Reintentos ante errores de red o 5xx (por defecto %(default)s)")
    parser.add_argument("--informe", type=Path, default=Path("informe_texturas.csv"), help="CSV con el resultado de cada archivo")
    parser.add_argument("--insecure", action="store_true", help="No verifica el certificado HTTPS (solo para localhost de desarrollo)")
    args = parser.parse_args()

    if not args.carpeta.is_dir():
        print(f"No existe la carpeta {args.carpeta}", file=sys.stderr)
        return 2

    api = args.api.rstrip("/")
    session = requests.Session()
    session.verify = not args.insecure

    try:
        catalog = fetch_blocks(session, api)
    except requests.RequestException as exc:
        print(f"No se pudo leer el catálogo en {api}/blocks: {exc}\n¿Está levantado el backend?", file=sys.stderr)
        return 2

    # Nombre en minúsculas sin extensión -> ruta. Los .mcmeta y demás se ignoran.
    files = {p.stem.lower(): p for p in sorted(args.carpeta.iterdir())
             if p.is_file() and p.suffix.lower() in EXTENSIONS}
    block_ids = set(catalog)

    plan, unmatched = match_by_name(files, block_ids)
    if not args.sin_alias:
        covered = {(u.block_id, u.face) for u in plan}
        plan += alias_uploads(block_ids, files, covered)

    print(f"Catálogo: {len(block_ids)} bloques · carpeta: {len(files)} imágenes")
    print(f"Coinciden: {len(plan)} archivos ({sum(u.origin == 'alias' for u in plan)} por alias) · "
          f"sin bloque: {len(unmatched)}")

    rows: list[dict[str, str]] = []
    ok = skipped = failed = existing = 0

    for index, item in enumerate(plan, 1):
        label = f"[{index}/{len(plan)}] {item.path.name} -> {short_name(item.block_id)} ({item.face})"
        row = {"archivo": item.path.name, "bloque": item.block_id, "cara": item.face, "origen": item.origin}

        if item.face in catalog.get(item.block_id, set()) and not args.sobrescribir:
            existing += 1
            rows.append({**row, "resultado": "ya tenía", "detalle": ""})
            continue

        try:
            data, mime, note = prepare_image(item.path)
            if args.dry_run:
                print(f"{label}  (simulado) {note}")
                rows.append({**row, "resultado": "simulado", "detalle": note})
                ok += 1
                continue
            upload(session, api, item, data, mime, args.reintentos)
            print(f"{label}  OK {note}")
            rows.append({**row, "resultado": "subida", "detalle": note})
            ok += 1
        except SkipFile as exc:
            print(f"{label}  OMITIDA: {exc}")
            rows.append({**row, "resultado": "omitida", "detalle": str(exc)})
            skipped += 1
        except KeyboardInterrupt:
            print("\nInterrumpido por el usuario.")
            break
        except Exception as exc:  # noqa: BLE001 - un fallo no debe parar la carga
            print(f"{label}  ERROR: {exc}")
            rows.append({**row, "resultado": "error", "detalle": str(exc)})
            failed += 1

    for path in unmatched:
        rows.append({"archivo": path.name, "bloque": "", "cara": "", "origen": "",
                     "resultado": "sin bloque", "detalle": ""})

    missing = sorted(short_name(b) for b in block_ids
                     if not catalog[b] and not any(u.block_id == b for u in plan))

    try:
        with args.informe.open("w", newline="", encoding="utf-8") as fh:
            writer = csv.DictWriter(fh, fieldnames=["archivo", "bloque", "cara", "origen", "resultado", "detalle"])
            writer.writeheader()
            writer.writerows(rows)
        report = f"Informe: {args.informe}"
    except OSError as exc:
        report = f"No se pudo guardar el informe: {exc}"

    verb = "Se subirían" if args.dry_run else "Subidas"
    print(f"\n{verb}: {ok} · ya tenían: {existing} · omitidas: {skipped} · errores: {failed}")
    if missing:
        print(f"Bloques del catálogo que siguen sin textura ({len(missing)}): {', '.join(missing)}")
    print(report)
    return 1 if failed else 0


if __name__ == "__main__":
    sys.exit(main())
