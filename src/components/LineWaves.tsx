"use client";

import { Renderer, Program, Mesh, Triangle } from "ogl";
import { useEffect, useRef } from "react";
import "./LineWaves.css";

function hexToVec3(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  return [
    parseInt(h.slice(0, 2), 16) / 255,
    parseInt(h.slice(2, 4), 16) / 255,
    parseInt(h.slice(4, 6), 16) / 255,
  ];
}

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;
varying vec2 vUv;
void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform float uSpeed;
uniform float uInnerLines;
uniform float uOuterLines;
uniform float uWarpIntensity;
uniform float uRotation;
uniform float uEdgeFadeWidth;
uniform float uColorCycleSpeed;
uniform float uBrightness;
uniform vec3 uColor1;
uniform vec3 uColor2;
uniform vec3 uColor3;
uniform vec2 uMouse;
uniform float uMouseInfluence;

varying vec2 vUv;

#define PI 3.14159265359

mat2 rotate2D(float angle) {
  float c = cos(angle);
  float s = sin(angle);
  return mat2(c, -s, s, c);
}

void main() {
  vec2 uv = vUv;
  vec2 centerUv = uv - 0.5;
  centerUv.x *= uResolution.x / uResolution.y;

  // Apply rotation
  centerUv = rotate2D(uRotation * PI / 180.0) * centerUv;

  // Warp intensity and waves
  float dist = length(centerUv);
  
  // Calculate mouse influence
  float mouseDist = length(centerUv - uMouse);
  float mouseEffect = smoothstep(uMouseInfluence, 0.0, mouseDist);
  
  float warp = sin(dist * uWarpIntensity - uTime * uSpeed) * 0.5 + 0.5;
  warp += mouseEffect * 0.2;

  // Multi-line wave pattern
  float innerWave = sin(dist * uInnerLines - uTime * uSpeed + warp) * 0.5 + 0.5;
  float outerWave = sin(dist * uOuterLines + uTime * uSpeed - warp) * 0.5 + 0.5;

  float pattern = mix(innerWave, outerWave, dist);
  
  // Edge fading
  float edgeFade = smoothstep(1.0, 1.0 - uEdgeFadeWidth, dist);
  pattern *= edgeFade;

  // Color Cycling
  float colorCycle = uTime * uColorCycleSpeed * 0.1;
  vec3 baseColor = mix(uColor1, uColor2, sin(colorCycle) * 0.5 + 0.5);
  baseColor = mix(baseColor, uColor3, cos(colorCycle) * 0.5 + 0.5);

  vec3 finalColor = baseColor * pattern * uBrightness;

  gl_FragColor = vec4(finalColor, 1.0);
}
`;

interface LineWavesProps {
  speed?: number;
  innerLineCount?: number;
  outerLineCount?: number;
  warpIntensity?: number;
  rotation?: number;
  edgeFadeWidth?: number;
  colorCycleSpeed?: number;
  brightness?: number;
  color1?: string;
  color2?: string;
  color3?: string;
  enableMouseInteraction?: boolean;
  mouseInfluence?: number;
}

export default function LineWaves({
  speed = 0.3,
  innerLineCount = 32,
  outerLineCount = 36,
  warpIntensity = 1.0,
  rotation = -45.0,
  edgeFadeWidth = 0.0,
  colorCycleSpeed = 1.0,
  brightness = 0.2,
  color1 = "#ffffff",
  color2 = "#ffffff",
  color3 = "#ffffff",
  enableMouseInteraction = true,
  mouseInfluence = 2.0,
}: LineWavesProps) {
  const containerRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const container = containerRef.current;
    if (!container) return;

    // Create Renderer
    const renderer = new Renderer({ alpha: true, premultipliedAlpha: false });
    const gl = renderer.gl;
    container.appendChild(gl.canvas);

    // Create program
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: { value: [0, 0, 0] },
        uSpeed: { value: speed },
        uInnerLines: { value: innerLineCount },
        uOuterLines: { value: outerLineCount },
        uWarpIntensity: { value: warpIntensity },
        uRotation: { value: rotation },
        uEdgeFadeWidth: { value: edgeFadeWidth },
        uColorCycleSpeed: { value: colorCycleSpeed },
        uBrightness: { value: brightness },
        uColor1: { value: hexToVec3(color1) },
        uColor2: { value: hexToVec3(color2) },
        uColor3: { value: hexToVec3(color3) },
        uMouse: { value: [0, 0] },
        uMouseInfluence: { value: mouseInfluence },
      },
    });

    const geometry = new Triangle(gl);
    const mesh = new Mesh(gl, { geometry, program });

    // Handle mouse movement
    const mouse: [number, number] = [0, 0];
    const handleMouseMove = (e: MouseEvent) => {
      if (!enableMouseInteraction) return;
      const rect = gl.canvas.getBoundingClientRect();
      const x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      const y = -(((e.clientY - rect.top) / rect.height) * 2 - 1);
      mouse[0] = x * (rect.width / rect.height);
      mouse[1] = y;
    };

    window.addEventListener("mousemove", handleMouseMove);

    // Handle resize
    const handleResize = () => {
      const width = container.clientWidth;
      const height = container.clientHeight;
      renderer.setSize(width, height);
      program.uniforms.uResolution.value = [width, height, 0];
    };
    window.addEventListener("resize", handleResize);
    handleResize();

    let animationFrameId: number;
    let time = 0;
    const update = (t: number) => {
      animationFrameId = requestAnimationFrame(update);
      time = t * 0.001;
      program.uniforms.uTime.value = time;
      program.uniforms.uMouse.value = mouse;
      renderer.render({ scene: mesh });
    };
    animationFrameId = requestAnimationFrame(update);

    return () => {
      window.removeEventListener("mousemove", handleMouseMove);
      window.removeEventListener("resize", handleResize);
      cancelAnimationFrame(animationFrameId);
      if (gl.canvas.parentNode) {
        gl.canvas.parentNode.removeChild(gl.canvas);
      }
    };
  }, [
    speed,
    innerLineCount,
    outerLineCount,
    warpIntensity,
    rotation,
    edgeFadeWidth,
    colorCycleSpeed,
    brightness,
    color1,
    color2,
    color3,
    enableMouseInteraction,
    mouseInfluence,
  ]);

  return <div ref={containerRef} className="line-waves-container" />;
}
