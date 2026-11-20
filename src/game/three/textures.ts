import * as THREE from 'three';
import { PlanetConfig } from '../types';

// Deterministic 2D hash & value noise for procedural textures
function hash2(x: number, y: number, seed: number): number {
  const n = Math.sin(x * 127.1 + y * 311.7 + seed * 74.7) * 43758.5453123;
  return n - Math.floor(n);
}

function noise2(x: number, y: number, seed: number): number {
  const xi = Math.floor(x);
  const yi = Math.floor(y);
  const xf = x - xi;
  const yf = y - yi;
  const u = xf * xf * (3 - 2 * xf);
  const v = yf * yf * (3 - 2 * yf);
  const a = hash2(xi, yi, seed);
  const b = hash2(xi + 1, yi, seed);
  const c = hash2(xi, yi + 1, seed);
  const d = hash2(xi + 1, yi + 1, seed);
  return a + (b - a) * u + (c - a) * v + (a - b - c + d) * u * v;
}

function fbm(x: number, y: number, seed: number, octaves = 5): number {
  let value = 0;
  let amp = 0.5;
  let freq = 1;
  for (let i = 0; i < octaves; i++) {
    value += amp * noise2(x * freq, y * freq, seed + i * 19);
    freq *= 2.02;
    amp *= 0.5;
  }
  return value;
}

function hexToRgb(hex: string): [number, number, number] {
  const clean = hex.replace('#', '');
  const num = parseInt(clean, 16);
  return [(num >> 16) & 255, (num >> 8) & 255, num & 255];
}

function mixRgb(
  a: [number, number, number],
  b: [number, number, number],
  t: number,
): [number, number, number] {
  const c = Math.max(0, Math.min(1, t));
  return [
    Math.round(a[0] + (b[0] - a[0]) * c),
    Math.round(a[1] + (b[1] - a[1]) * c),
    Math.round(a[2] + (b[2] - a[2]) * c),
  ];
}

export interface PlanetTextureSet {
  map: THREE.CanvasTexture;
  bumpMap: THREE.CanvasTexture;
  emissiveMap?: THREE.CanvasTexture;
  cloudMap: THREE.CanvasTexture;
}

export function createPlanetTextures(
  planet: PlanetConfig,
  maxAnisotropy: number,
): PlanetTextureSet {
  const width = 512;
  const height = 256;

  const albedoCanvas = document.createElement('canvas');
  albedoCanvas.width = width;
  albedoCanvas.height = height;
  const aCtx = albedoCanvas.getContext('2d')!;
  const aImg = aCtx.createImageData(width, height);

  const bumpCanvas = document.createElement('canvas');
  bumpCanvas.width = width;
  bumpCanvas.height = height;
  const bCtx = bumpCanvas.getContext('2d')!;
  const bImg = bCtx.createImageData(width, height);

  const needEmissive = planet.biome === 'volcanic' || planet.biome === 'ancient' || planet.biome === 'ocean';
  const emissiveCanvas = document.createElement('canvas');
  emissiveCanvas.width = width;
  emissiveCanvas.height = height;
  const eCtx = emissiveCanvas.getContext('2d')!;
  const eImg = eCtx.createImageData(width, height);

  const c1 = hexToRgb(planet.primaryColor);
  const c2 = hexToRgb(planet.secondaryColor);
  const c3 = hexToRgb(planet.accentColor);
  const seed = planet.id.split('').reduce((acc, ch) => acc + ch.charCodeAt(0), 17);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    const lat = Math.abs(v - 0.5) * 2; // 0 equator, 1 poles
    for (let x = 0; x < width; x++) {
      const u = x / width;
      // Seamless horizontal wrapping via cylindrical projection sampling
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 2.4 + 4.0;
      const nz = Math.sin(angle) * 2.4 + 4.0;
      const ny = v * 4.8;

      const base = fbm(nx + ny * 0.35, nz + ny * 0.65, seed, 5);
      const ridge = 1 - Math.abs(fbm(nx * 2.1, nz * 2.1 + ny, seed + 51, 4) * 2 - 1);

      let rgb: [number, number, number] = [0, 0, 0];
      let bumpVal = Math.floor(base * 255);
      let emRgb: [number, number, number] = [0, 0, 0];

      if (planet.biome === 'ocean') {
        const landMask = Math.max(0, (base - 0.56) * 3.8);
        const deepOcean: [number, number, number] = [4, 38, 86];
        const shallowOcean: [number, number, number] = [14, 145, 206];
        const coralLand: [number, number, number] = [28, 185, 138];
        rgb = mixRgb(deepOcean, shallowOcean, Math.min(1, base * 1.6));
        if (landMask > 0.05) {
          rgb = mixRgb(rgb, coralLand, Math.min(1, landMask));
          emRgb = [8, 95, 85];
        }
        if (lat > 0.85) {
          rgb = mixRgb(rgb, [215, 240, 255], (lat - 0.85) * 6.5);
        }
        bumpVal = landMask > 0.05 ? Math.min(255, 130 + Math.floor(landMask * 120)) : 80;
      } else if (planet.biome === 'volcanic') {
        const crust = mixRgb([28, 18, 16], [78, 38, 22], base);
        const lavaFactor = Math.max(0, (ridge - 0.72) * 3.8);
        rgb = mixRgb(crust, [255, 110, 24], lavaFactor);
        if (lavaFactor > 0.15) {
          emRgb = mixRgb([160, 35, 0], [255, 165, 50], lavaFactor);
        }
        bumpVal = Math.floor((1 - lavaFactor * 0.5) * ridge * 255);
      } else if (planet.biome === 'forest') {
        const sea = [12, 74, 88] as [number, number, number];
        const canopy = mixRgb(c1, c2, base);
        const bloom = mixRgb(canopy, c3, Math.max(0, (ridge - 0.65) * 2.5));
        rgb = base < 0.36 ? mixRgb(sea, canopy, base / 0.36) : bloom;
        bumpVal = base < 0.36 ? 70 : Math.floor(110 + base * 140);
      } else if (planet.biome === 'ice') {
        const iceDark: [number, number, number] = [32, 62, 102];
        const iceBright: [number, number, number] = [210, 238, 252];
        rgb = mixRgb(iceDark, iceBright, Math.min(1, base * 1.25));
        if (ridge > 0.78) {
          rgb = mixRgb(rgb, [90, 225, 250], (ridge - 0.78) * 3.2);
        }
        bumpVal = Math.floor(ridge * 220);
      } else if (planet.biome === 'desert') {
        const band = Math.sin(v * 26 + base * 6) * 0.5 + 0.5;
        rgb = mixRgb(c1, c2, base * 0.7 + band * 0.3);
        if (ridge > 0.75) {
          rgb = mixRgb(rgb, c3, (ridge - 0.75) * 2.2);
        }
        bumpVal = Math.floor((base * 0.6 + ridge * 0.4) * 255);
      } else {
        // Ancient Vexis
        const obsidian = mixRgb([12, 10, 28], [38, 24, 72], base);
        const grid =
          Math.abs(Math.sin(nx * 6.5)) < 0.045 || Math.abs(Math.sin(ny * 6.5)) < 0.045
            ? 1
            : 0;
        const energy = Math.max(grid * 0.7, Math.max(0, (ridge - 0.77) * 4.2));
        rgb = mixRgb(obsidian, c3, energy);
        if (energy > 0.2) {
          emRgb = mixRgb([90, 30, 180], [220, 120, 255], energy);
        }
        bumpVal = Math.floor((base * 0.5 + energy * 0.5) * 255);
      }

      const idx = (y * width + x) * 4;
      aImg.data[idx] = rgb[0];
      aImg.data[idx + 1] = rgb[1];
      aImg.data[idx + 2] = rgb[2];
      aImg.data[idx + 3] = 255;

      bImg.data[idx] = bumpVal;
      bImg.data[idx + 1] = bumpVal;
      bImg.data[idx + 2] = bumpVal;
      bImg.data[idx + 3] = 255;

      eImg.data[idx] = emRgb[0];
      eImg.data[idx + 1] = emRgb[1];
      eImg.data[idx + 2] = emRgb[2];
      eImg.data[idx + 3] = 255;
    }
  }

  aCtx.putImageData(aImg, 0, 0);
  bCtx.putImageData(bImg, 0, 0);
  eCtx.putImageData(eImg, 0, 0);

  // Cloud layer canvas
  const cloudCanvas = document.createElement('canvas');
  cloudCanvas.width = width;
  cloudCanvas.height = height;
  const cCtx = cloudCanvas.getContext('2d')!;
  const cImg = cCtx.createImageData(width, height);
  const cloudRgb = hexToRgb(planet.atmosphereColor);

  for (let y = 0; y < height; y++) {
    const v = y / height;
    for (let x = 0; x < width; x++) {
      const u = x / width;
      const angle = u * Math.PI * 2;
      const nx = Math.cos(angle) * 3.0 + 9.0;
      const nz = Math.sin(angle) * 3.0 + 9.0;
      const cNoise = fbm(nx + v * 1.4, nz + v * 3.2, seed + 109, 4);
      const alpha = Math.max(0, Math.min(255, Math.floor((cNoise - 0.48) * 480)));
      const idx = (y * width + x) * 4;
      cImg.data[idx] = Math.min(255, Math.round(cloudRgb[0] * 0.35 + 220 * 0.65));
      cImg.data[idx + 1] = Math.min(255, Math.round(cloudRgb[1] * 0.35 + 230 * 0.65));
      cImg.data[idx + 2] = Math.min(255, Math.round(cloudRgb[2] * 0.35 + 245 * 0.65));
      cImg.data[idx + 3] = alpha;
    }
  }
  cCtx.putImageData(cImg, 0, 0);

  const map = new THREE.CanvasTexture(albedoCanvas);
  map.colorSpace = THREE.SRGBColorSpace;
  map.anisotropy = maxAnisotropy;
  map.wrapS = THREE.RepeatWrapping;

  const bumpMap = new THREE.CanvasTexture(bumpCanvas);
  bumpMap.wrapS = THREE.RepeatWrapping;

  const cloudMap = new THREE.CanvasTexture(cloudCanvas);
  cloudMap.colorSpace = THREE.SRGBColorSpace;
  cloudMap.wrapS = THREE.RepeatWrapping;

  let emissiveMap: THREE.CanvasTexture | undefined;
  if (needEmissive) {
    emissiveMap = new THREE.CanvasTexture(emissiveCanvas);
    emissiveMap.colorSpace = THREE.SRGBColorSpace;
    emissiveMap.wrapS = THREE.RepeatWrapping;
  }

  return { map, bumpMap, emissiveMap, cloudMap };
}

export function createRingTexture(hexColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 32;
  const ctx = canvas.getContext('2d')!;
  const [r, g, b] = hexToRgb(hexColor);

  for (let x = 0; x < 512; x++) {
    const t = x / 512;
    const edgeFade = Math.sin(t * Math.PI);
    const band = Math.sin(t * 48) * 0.3 + Math.cos(t * 117) * 0.2 + 0.5;
    const alpha = Math.max(0, Math.min(1, edgeFade * band * 0.85));
    ctx.fillStyle = `rgba(${r}, ${g}, ${b}, ${alpha.toFixed(3)})`;
    ctx.fillRect(x, 0, 1, 32);
  }
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createGlowSpriteTexture(innerColor: string, outerColor: string): THREE.CanvasTexture {
  const canvas = document.createElement('canvas');
  canvas.width = 128;
  canvas.height = 128;
  const ctx = canvas.getContext('2d')!;
  const grad = ctx.createRadialGradient(64, 64, 2, 64, 64, 64);
  grad.addColorStop(0, innerColor);
  grad.addColorStop(0.35, outerColor);
  grad.addColorStop(1, 'rgba(0,0,0,0)');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  return tex;
}

export function createTerrainDetailTexture(primary: string, secondary: string): THREE.CanvasTexture {
  const size = 256;
  const canvas = document.createElement('canvas');
  canvas.width = size;
  canvas.height = size;
  const ctx = canvas.getContext('2d')!;
  const img = ctx.createImageData(size, size);
  const c1 = hexToRgb(primary);
  const c2 = hexToRgb(secondary);

  for (let y = 0; y < size; y++) {
    for (let x = 0; x < size; x++) {
      const n = fbm((x / size) * 8, (y / size) * 8, 42, 4);
      const rgb = mixRgb(c1, c2, n);
      const idx = (y * size + x) * 4;
      img.data[idx] = rgb[0];
      img.data[idx + 1] = rgb[1];
      img.data[idx + 2] = rgb[2];
      img.data[idx + 3] = 255;
    }
  }
  ctx.putImageData(img, 0, 0);
  const tex = new THREE.CanvasTexture(canvas);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.wrapS = THREE.RepeatWrapping;
  tex.wrapT = THREE.RepeatWrapping;
  tex.repeat.set(16, 16);
  return tex;
}
