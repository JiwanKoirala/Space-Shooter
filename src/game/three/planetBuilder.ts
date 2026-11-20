import * as THREE from 'three';
import { PlanetConfig } from '../types';
import { createPlanetTextures, createRingTexture } from './textures';

export interface PlanetMeshBundle {
  config: PlanetConfig;
  group: THREE.Group;
  surfaceMesh: THREE.Mesh;
  cloudMesh: THREE.Mesh;
  beaconRing: THREE.Mesh;
}

function createAtmosphereMaterial(hexColor: string): THREE.ShaderMaterial {
  return new THREE.ShaderMaterial({
    uniforms: {
      glowColor: { value: new THREE.Color(hexColor) },
    },
    vertexShader: `
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vNormal = normalize(normalMatrix * normal);
        vec4 mvPos = modelViewMatrix * vec4(position, 1.0);
        vViewPosition = -mvPos.xyz;
        gl_Position = projectionMatrix * mvPos;
      }
    `,
    fragmentShader: `
      uniform vec3 glowColor;
      varying vec3 vNormal;
      varying vec3 vViewPosition;
      void main() {
        vec3 viewDir = normalize(vViewPosition);
        float rim = pow(0.68 - dot(vNormal, viewDir), 3.2);
        rim = clamp(rim, 0.0, 1.0);
        gl_FragColor = vec4(glowColor, rim * 0.85);
      }
    `,
    side: THREE.BackSide,
    blending: THREE.AdditiveBlending,
    transparent: true,
    depthWrite: false,
  });
}

export function buildPlanet3D(config: PlanetConfig, maxAnisotropy: number): PlanetMeshBundle {
  const group = new THREE.Group();
  group.position.set(...config.position);

  const textures = createPlanetTextures(config, maxAnisotropy);

  // Surface sphere
  const surfaceGeo = new THREE.SphereGeometry(config.radius, 64, 48);
  const surfaceMat = new THREE.MeshStandardMaterial({
    map: textures.map,
    bumpMap: textures.bumpMap,
    bumpScale: config.biome === 'volcanic' || config.biome === 'ancient' ? 1.2 : 0.65,
    roughness: config.biome === 'ocean' ? 0.32 : config.biome === 'ice' ? 0.25 : 0.78,
    metalness: config.biome === 'ancient' ? 0.35 : 0.08,
    emissive: textures.emissiveMap ? new THREE.Color(0xffffff) : new THREE.Color(0x000000),
    emissiveMap: textures.emissiveMap ?? null,
    emissiveIntensity: config.biome === 'volcanic' ? 1.35 : config.biome === 'ancient' ? 1.1 : 0.45,
  });
  const surfaceMesh = new THREE.Mesh(surfaceGeo, surfaceMat);
  surfaceMesh.receiveShadow = true;
  group.add(surfaceMesh);

  // Cloud sphere
  const cloudGeo = new THREE.SphereGeometry(config.radius * 1.028, 48, 36);
  const cloudMat = new THREE.MeshStandardMaterial({
    map: textures.cloudMap,
    transparent: true,
    opacity: config.biome === 'ancient' ? 0.35 : 0.65,
    depthWrite: false,
    roughness: 0.9,
  });
  const cloudMesh = new THREE.Mesh(cloudGeo, cloudMat);
  group.add(cloudMesh);

  // Fresnel Atmospheric Limb Halo
  const atmoGeo = new THREE.SphereGeometry(config.radius * 1.15, 48, 36);
  const atmoMat = createAtmosphereMaterial(config.atmosphereColor);
  const atmoMesh = new THREE.Mesh(atmoGeo, atmoMat);
  group.add(atmoMesh);

  // Optional planetary rings
  if (config.hasRings) {
    const ringGeo = new THREE.RingGeometry(config.radius * 1.38, config.radius * 2.25, 72);
    // Remap RingGeometry UVs radially so 1D ring texture maps cleanly
    const pos = ringGeo.attributes.position;
    const uv = ringGeo.attributes.uv;
    const v3 = new THREE.Vector3();
    for (let i = 0; i < pos.count; i++) {
      v3.fromBufferAttribute(pos, i);
      const dist = v3.length();
      const norm = (dist - config.radius * 1.38) / (config.radius * 0.87);
      uv.setXY(i, norm, 0.5);
    }
    const ringMat = new THREE.MeshBasicMaterial({
      map: createRingTexture(config.ringColor ?? config.atmosphereColor),
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.72,
      depthWrite: false,
    });
    const ringMesh = new THREE.Mesh(ringGeo, ringMat);
    ringMesh.rotation.x = Math.PI / 2.35;
    ringMesh.rotation.y = 0.25;
    group.add(ringMesh);
  }

  // Orbital Landing Beacon Ring
  const beaconGeo = new THREE.TorusGeometry(config.radius * 1.48, 0.28, 8, 64);
  const beaconMat = new THREE.MeshBasicMaterial({
    color: config.atmosphereColor,
    transparent: true,
    opacity: 0.28,
  });
  const beaconRing = new THREE.Mesh(beaconGeo, beaconMat);
  beaconRing.rotation.x = Math.PI / 2;
  group.add(beaconRing);

  return {
    config,
    group,
    surfaceMesh,
    cloudMesh,
    beaconRing,
  };
}
