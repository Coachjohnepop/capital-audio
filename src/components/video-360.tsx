"use client";

import { useEffect, useRef } from "react";

/**
 * WebGL viewer for equirectangular (360°) video. Renders the given <video>
 * element onto a full-canvas quad, ray-casting each pixel into the sphere.
 * Drag to look around, scroll to zoom. No three.js — one shader is enough.
 */

const VERT = `
attribute vec2 aPos;
varying vec2 vUv;
void main() {
  vUv = aPos;
  gl_Position = vec4(aPos, 0.0, 1.0);
}
`;

const FRAG = `
precision mediump float;
varying vec2 vUv;
uniform sampler2D uTex;
uniform float uYaw;
uniform float uPitch;
uniform float uFov;
uniform float uAspect;
const float PI = 3.14159265358979;

void main() {
  // Ray for this pixel in camera space
  float halfH = tan(uFov * 0.5);
  vec3 ray = normalize(vec3(vUv.x * halfH * uAspect, vUv.y * halfH, -1.0));

  // Rotate by pitch (x-axis) then yaw (y-axis)
  float cp = cos(uPitch), sp = sin(uPitch);
  ray = vec3(ray.x, ray.y * cp - ray.z * sp, ray.y * sp + ray.z * cp);
  float cy = cos(uYaw), sy = sin(uYaw);
  ray = vec3(ray.x * cy + ray.z * sy, ray.y, -ray.x * sy + ray.z * cy);

  // Direction -> equirectangular UV
  float lon = atan(ray.x, -ray.z);
  float lat = asin(clamp(ray.y, -1.0, 1.0));
  vec2 uv = vec2(lon / (2.0 * PI) + 0.5, 0.5 - lat / PI);
  gl_FragColor = texture2D(uTex, uv);
}
`;

export function Video360({
  video,
  className,
}: {
  video: HTMLVideoElement | null;
  className?: string;
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const view = useRef({ yaw: 0, pitch: 0, fov: (75 * Math.PI) / 180 });
  const drag = useRef<{ x: number; y: number } | null>(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || !video) return;

    const gl = canvas.getContext("webgl");
    if (!gl) return;

    const compile = (type: number, src: string) => {
      const s = gl.createShader(type)!;
      gl.shaderSource(s, src);
      gl.compileShader(s);
      return s;
    };
    const prog = gl.createProgram()!;
    gl.attachShader(prog, compile(gl.VERTEX_SHADER, VERT));
    gl.attachShader(prog, compile(gl.FRAGMENT_SHADER, FRAG));
    gl.linkProgram(prog);
    gl.useProgram(prog);

    const buf = gl.createBuffer();
    gl.bindBuffer(gl.ARRAY_BUFFER, buf);
    gl.bufferData(
      gl.ARRAY_BUFFER,
      new Float32Array([-1, -1, 1, -1, -1, 1, 1, 1]),
      gl.STATIC_DRAW
    );
    const aPos = gl.getAttribLocation(prog, "aPos");
    gl.enableVertexAttribArray(aPos);
    gl.vertexAttribPointer(aPos, 2, gl.FLOAT, false, 0, 0);

    const tex = gl.createTexture();
    gl.bindTexture(gl.TEXTURE_2D, tex);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_S, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_WRAP_T, gl.CLAMP_TO_EDGE);
    gl.texParameteri(gl.TEXTURE_2D, gl.TEXTURE_MIN_FILTER, gl.LINEAR);

    const uYaw = gl.getUniformLocation(prog, "uYaw");
    const uPitch = gl.getUniformLocation(prog, "uPitch");
    const uFov = gl.getUniformLocation(prog, "uFov");
    const uAspect = gl.getUniformLocation(prog, "uAspect");

    let raf = 0;
    const render = () => {
      raf = requestAnimationFrame(render);
      const w = canvas.clientWidth,
        h = canvas.clientHeight;
      if (canvas.width !== w || canvas.height !== h) {
        canvas.width = w;
        canvas.height = h;
        gl.viewport(0, 0, w, h);
      }
      if (video.readyState >= 2) {
        gl.texImage2D(gl.TEXTURE_2D, 0, gl.RGB, gl.RGB, gl.UNSIGNED_BYTE, video);
      }
      gl.uniform1f(uYaw, view.current.yaw);
      gl.uniform1f(uPitch, view.current.pitch);
      gl.uniform1f(uFov, view.current.fov);
      gl.uniform1f(uAspect, h > 0 ? w / h : 1);
      gl.drawArrays(gl.TRIANGLE_STRIP, 0, 4);
    };
    render();
    return () => cancelAnimationFrame(raf);
  }, [video]);

  return (
    <canvas
      ref={canvasRef}
      className={className}
      style={{ touchAction: "none", cursor: "grab" }}
      onPointerDown={(e) => {
        drag.current = { x: e.clientX, y: e.clientY };
        (e.target as HTMLElement).setPointerCapture(e.pointerId);
      }}
      onPointerMove={(e) => {
        if (!drag.current) return;
        const dx = e.clientX - drag.current.x;
        const dy = e.clientY - drag.current.y;
        drag.current = { x: e.clientX, y: e.clientY };
        const v = view.current;
        v.yaw -= dx * 0.005;
        v.pitch = Math.max(-1.5, Math.min(1.5, v.pitch + dy * 0.005));
      }}
      onPointerUp={() => (drag.current = null)}
      onWheel={(e) => {
        const v = view.current;
        v.fov = Math.max(0.5, Math.min(2.4, v.fov + e.deltaY * 0.002));
      }}
    />
  );
}
