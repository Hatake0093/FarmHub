import type { MeshData } from "./mesh3d";
import { FLOATS_PER_VERTEX } from "./mesh3d";

const VERTEX_SHADER = `#version 300 es
in vec3 aPos;
in vec3 aNormal;
in vec3 aColor;
in vec2 aUv;
in float aTex;
uniform mat4 uMvp;
uniform vec3 uLight;
out vec3 vColor;
out vec2 vUv;
out float vTex;
out float vLight;
void main() {
  gl_Position = uMvp * vec4(aPos, 1.0);
  vColor = aColor;
  vUv = aUv;
  vTex = aTex;
  vLight = 0.4 + 0.6 * max(dot(aNormal, normalize(uLight)), 0.0);
}`;

const FRAGMENT_SHADER = `#version 300 es
precision mediump float;
in vec3 vColor;
in vec2 vUv;
in float vTex;
in float vLight;
uniform sampler2D uAtlas;
uniform float uUseTex;
out vec4 outColor;
void main() {
  vec3 base = vColor;
  if (uUseTex > 0.5 && vTex > 0.5) {
    base = texture(uAtlas, vUv).rgb;
  }
  outColor = vec4(base * vLight, 1.0);
}`;

function compile(gl: WebGL2RenderingContext, type: number, source: string): WebGLShader {
  const shader = gl.createShader(type);
  if (!shader) throw new Error("No se pudo crear el shader.");
  gl.shaderSource(shader, source);
  gl.compileShader(shader);
  if (!gl.getShaderParameter(shader, gl.COMPILE_STATUS)) {
    throw new Error(gl.getShaderInfoLog(shader) ?? "Error compilando el shader.");
  }
  return shader;
}

/** Renderizador WebGL 2 mínimo: una malla, un atlas opcional y una cámara en una matriz. */
export class Renderer {
  private readonly canvas: HTMLCanvasElement;
  private readonly gl: WebGL2RenderingContext;
  private readonly program: WebGLProgram;
  private readonly vbo: WebGLBuffer;
  private readonly ibo: WebGLBuffer;
  private readonly atlas: WebGLTexture;
  private indexCount = 0;
  private hasAtlas = false;

  constructor(canvas: HTMLCanvasElement) {
    this.canvas = canvas;
    const gl = canvas.getContext("webgl2", { antialias: true });
    if (!gl) throw new Error("WebGL 2 no está disponible.");
    this.gl = gl;

    const program = gl.createProgram();
    if (!program) throw new Error("No se pudo crear el programa.");
    gl.attachShader(program, compile(gl, gl.VERTEX_SHADER, VERTEX_SHADER));
    gl.attachShader(program, compile(gl, gl.FRAGMENT_SHADER, FRAGMENT_SHADER));
    gl.linkProgram(program);
    if (!gl.getProgramParameter(program, gl.LINK_STATUS)) {
      throw new Error(gl.getProgramInfoLog(program) ?? "Error enlazando el programa.");
    }
    this.program = program;

    const vbo = gl.createBuffer();
    const ibo = gl.createBuffer();
    const atlas = gl.createTexture();
    if (!vbo || !ibo || !atlas) throw new Error("No se pudieron crear los buffers.");
    this.vbo = vbo;
    this.ibo = ibo;
    this.atlas = atlas;
    gl.bindTexture(gl.TEXTURE_2D, atlas);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MAG_FILTER, gl.NEAREST);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
  }

  setMesh(mesh: MeshData): void {
    const gl = this.gl;
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bufferData(gl.ARRAY_BUFFER, mesh.vertices, gl.STATIC_DRAW);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    gl.bufferData(gl.ELEMENT_ARRAY_BUFFER, mesh.indices, gl.STATIC_DRAW);
    this.indexCount = mesh.indices.length;
  }

  setAtlas(canvas: HTMLCanvasElement | null): void {
    const gl = this.gl;
    this.hasAtlas = canvas !== null;
    if (!canvas) return;
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGBA, gl.RGBA, gl.UNSIGNED_BYTE, canvas);
  }

  draw(mvp: Float32Array, light: [number, number, number], useTex: boolean): void {
    const gl = this.gl;
    gl.viewport(0, 0, this.canvas.width, this.canvas.height);
    gl.clearColor(0.11, 0.12, 0.1, 1);
    gl.clear(gl.COLOR_BUFFER_BIT | gl.DEPTH_BUFFER_BIT);
    gl.enable(gl.DEPTH_TEST);
    if (this.indexCount === 0) return;

    gl.useProgram(this.program);
    gl.bindBuffer(gl.ARRAY_BUFFER, this.vbo);
    gl.bindBuffer(gl.ELEMENT_ARRAY_BUFFER, this.ibo);
    const stride = FLOATS_PER_VERTEX * 4;
    const attrib = (name: string, size: number, offsetFloats: number) => {
      const loc = gl.getAttribLocation(this.program, name);
      if (loc < 0) return;
      gl.enableVertexAttribArray(loc);
      gl.vertexAttribPointer(loc, size, gl.FLOAT, false, stride, offsetFloats * 4);
    };
    attrib("aPos", 3, 0);
    attrib("aNormal", 3, 3);
    attrib("aColor", 3, 6);
    attrib("aUv", 2, 9);
    attrib("aTex", 1, 11);

    gl.uniformMatrix4fv(gl.getUniformLocation(this.program, "uMvp"), false, mvp);
    gl.uniform3fv(gl.getUniformLocation(this.program, "uLight"), light);
    gl.uniform1f(gl.getUniformLocation(this.program, "uUseTex"), useTex && this.hasAtlas ? 1 : 0);
    gl.activeTexture(gl.TEXTURE0);
    gl.bindTexture(gl.TEXTURE_2D, this.atlas);
    gl.uniform1i(gl.getUniformLocation(this.program, "uAtlas"), 0);

    gl.drawElements(gl.TRIANGLES, this.indexCount, gl.UNSIGNED_INT, 0);
  }

  dispose(): void {
    const gl = this.gl;
    gl.deleteBuffer(this.vbo);
    gl.deleteBuffer(this.ibo);
    gl.deleteTexture(this.atlas);
    gl.deleteProgram(this.program);
  }
}

/** Crea el renderizador, o devuelve null si el navegador no tiene WebGL 2. */
export function createRenderer(canvas: HTMLCanvasElement): Renderer | null {
  try {
    return new Renderer(canvas);
  } catch {
    return null;
  }
}
